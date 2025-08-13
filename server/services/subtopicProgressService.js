// Service for tracking granular subtopic progress
import fs from 'fs';
import path from 'path';
import { MBE_TOPICS, identifySubtopic } from './mbeTopics.js';

const DATA_FILE = path.join(process.cwd(), 'data', 'subtopic-progress.json');

class SubtopicProgressService {
  constructor() {
    this.progressData = new Map();
    this.attemptAudit = new Set(); // Track attempts to prevent duplicates
    this.auditLog = []; // Detailed audit log for debugging
    this.loadFromFile();
  }

  loadFromFile() {
    try {
      if (fs.existsSync(DATA_FILE)) {
        const data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));
        this.progressData = new Map(Object.entries(data));
      }
    } catch (error) {
      console.error('Error loading subtopic progress:', error);
      this.progressData = new Map();
    }
  }

  async saveToFile() {
    try {
      const data = Object.fromEntries(this.progressData);
      fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
    } catch (error) {
      console.error('Error saving subtopic progress:', error);
    }
  }

  // Get or initialize user's subtopic progress
  getUserProgress(userId) {
    if (!this.progressData.has(userId)) {
      this.progressData.set(userId, this.initializeProgress());
    }
    return this.progressData.get(userId);
  }

  // Initialize progress structure for all subjects and subtopics
  initializeProgress() {
    const progress = {};
    
    for (const [subject, subjectData] of Object.entries(MBE_TOPICS)) {
      progress[subject] = {
        overall: {
          questionsAttempted: 0,
          questionsCorrect: 0,
          proficiencyScore: 0,
          lastPracticed: null
        },
        subtopics: {}
      };
      
      for (const [subtopicKey, subtopicData] of Object.entries(subjectData.subtopics)) {
        progress[subject].subtopics[subtopicKey] = {
          name: subtopicData.name,
          questionsAttempted: 0,
          questionsCorrect: 0,
          proficiencyScore: 0, // 0-100 scale
          lastPracticed: null,
          streakCorrect: 0,
          areas: {} // Track specific areas within subtopics
        };
        
        // Initialize areas tracking
        for (const area of subtopicData.areas || []) {
          progress[subject].subtopics[subtopicKey].areas[area] = {
            questionsAttempted: 0,
            questionsCorrect: 0
          };
        }
      }
    }
    
    return progress;
  }

  // Record a question attempt with subtopic tracking
  async recordAttempt(userId, subject, questionText, explanation, isCorrect, difficulty = 'medium', msToAnswer = null, duelId = null, questionId = null) {
    // Prevent duplicate recording for the same question in the same duel
    if (duelId && questionId) {
      const auditKey = `${userId}_${duelId}_${questionId}`;
      if (this.attemptAudit?.has(auditKey)) {
        console.log(`Skipping duplicate attempt: ${auditKey}`);
        return null;
      }
      this.attemptAudit?.add(auditKey);
    }
    
    const progress = this.getUserProgress(userId);
    const timestamp = new Date().toISOString();
    
    // Identify the subtopic from question content
    const subtopic = identifySubtopic(subject, questionText, explanation);
    
    if (!progress[subject]) {
      progress[subject] = {
        overall: {
          questionsAttempted: 0,
          questionsCorrect: 0,
          proficiencyScore: 0,
          lastPracticed: null
        },
        subtopics: {}
      };
    }
    
    // Update overall subject stats
    progress[subject].overall.questionsAttempted++;
    if (isCorrect) {
      progress[subject].overall.questionsCorrect++;
    }
    progress[subject].overall.lastPracticed = new Date().toISOString();
    
    // Update subtopic stats
    if (subtopic && !progress[subject].subtopics[subtopic]) {
      const subtopicData = MBE_TOPICS[subject]?.subtopics[subtopic];
      if (subtopicData) {
        progress[subject].subtopics[subtopic] = {
          name: subtopicData.name,
          questionsAttempted: 0,
          questionsCorrect: 0,
          proficiencyScore: 0,
          lastPracticed: null,
          streakCorrect: 0,
          areas: {}
        };
      }
    }
    
    if (subtopic && progress[subject].subtopics[subtopic]) {
      const subtopicProgress = progress[subject].subtopics[subtopic];
      subtopicProgress.questionsAttempted++;
      
      if (isCorrect) {
        subtopicProgress.questionsCorrect++;
        subtopicProgress.streakCorrect++;
      } else {
        subtopicProgress.streakCorrect = 0;
      }
      
      subtopicProgress.lastPracticed = new Date().toISOString();
      
      // Calculate proficiency score (hard-won progress)
      // Score increases very slowly and considers difficulty
      const difficultyMultiplier = difficulty === 'hard' ? 1.5 : difficulty === 'easy' ? 0.5 : 1;
      const baseIncrement = isCorrect ? 0.5 * difficultyMultiplier : -0.25; // Slow progress
      
      // Apply streak bonus for consistent performance
      const streakBonus = Math.min(subtopicProgress.streakCorrect * 0.1, 0.5);
      const increment = isCorrect ? baseIncrement + streakBonus : baseIncrement;
      
      subtopicProgress.proficiencyScore = Math.max(0, Math.min(100, 
        subtopicProgress.proficiencyScore + increment
      ));
    }
    
    // Recalculate overall subject proficiency (weighted average of subtopics)
    const subtopicScores = Object.values(progress[subject].subtopics)
      .filter(st => st.questionsAttempted > 0)
      .map(st => st.proficiencyScore);
    
    if (subtopicScores.length > 0) {
      progress[subject].overall.proficiencyScore = 
        subtopicScores.reduce((a, b) => a + b, 0) / subtopicScores.length;
    }
    
    // Record audit entry for debugging
    const auditEntry = {
      userId,
      duelId,
      questionId,
      subject,
      subtopic,
      difficulty,
      correct: isCorrect,
      msToAnswer,
      timestamp,
      proficiencyBefore: subtopic && progress[subject].subtopics[subtopic] 
        ? progress[subject].subtopics[subtopic].proficiencyScore - (isCorrect ? increment : 0)
        : 0,
      proficiencyAfter: subtopic && progress[subject].subtopics[subtopic] 
        ? progress[subject].subtopics[subtopic].proficiencyScore 
        : 0
    };
    
    this.auditLog.push(auditEntry);
    
    // Keep audit log size manageable (last 1000 entries)
    if (this.auditLog.length > 1000) {
      this.auditLog = this.auditLog.slice(-1000);
    }
    
    await this.saveToFile();
    
    return {
      subject,
      subtopic,
      xpGained: isCorrect ? Math.floor(12 + difficulty * 2) : 2, // Base XP + difficulty bonus
      masteryDelta: subtopic && progress[subject].subtopics[subtopic] ? increment : 0,
      before: auditEntry.proficiencyBefore,
      after: auditEntry.proficiencyAfter,
      newProficiency: progress[subject].subtopics[subtopic]?.proficiencyScore || 0,
      overallProficiency: progress[subject].overall.proficiencyScore
    };
  }

  // Get detailed progress report for a user
  getDetailedProgress(userId) {
    const progress = this.getUserProgress(userId);
    const report = {};
    
    for (const [subject, subjectData] of Object.entries(progress)) {
      report[subject] = {
        name: MBE_TOPICS[subject]?.name || subject,
        overall: subjectData.overall,
        subtopics: []
      };
      
      // Sort subtopics by proficiency for display
      const sortedSubtopics = Object.entries(subjectData.subtopics)
        .sort((a, b) => b[1].proficiencyScore - a[1].proficiencyScore);
      
      for (const [key, data] of sortedSubtopics) {
        report[subject].subtopics.push({
          key,
          ...data,
          masteryLevel: this.getMasteryLevel(data.proficiencyScore),
          percentCorrect: data.questionsAttempted > 0 
            ? Math.round((data.questionsCorrect / data.questionsAttempted) * 100)
            : 0
        });
      }
    }
    
    return report;
  }

  // Get mastery level based on proficiency score
  getMasteryLevel(proficiencyScore) {
    if (proficiencyScore < 10) return 'Beginner';
    if (proficiencyScore < 25) return 'Novice';
    if (proficiencyScore < 40) return 'Apprentice';
    if (proficiencyScore < 55) return 'Competent';
    if (proficiencyScore < 70) return 'Proficient';
    if (proficiencyScore < 85) return 'Advanced';
    if (proficiencyScore < 95) return 'Expert';
    return 'Master';
  }

  // Get recommendations for what to study next
  getStudyRecommendations(userId) {
    const progress = this.getUserProgress(userId);
    const recommendations = [];
    
    for (const [subject, subjectData] of Object.entries(progress)) {
      // Find weakest subtopics that have been attempted
      const weakSubtopics = Object.entries(subjectData.subtopics)
        .filter(([_, data]) => data.questionsAttempted > 2) // Only consider attempted topics
        .sort((a, b) => a[1].proficiencyScore - b[1].proficiencyScore)
        .slice(0, 2); // Get 2 weakest per subject
      
      for (const [key, data] of weakSubtopics) {
        if (data.proficiencyScore < 60) { // Focus on topics below proficiency
          recommendations.push({
            subject: MBE_TOPICS[subject]?.name || subject,
            subtopic: data.name,
            proficiencyScore: data.proficiencyScore,
            percentCorrect: data.questionsAttempted > 0
              ? Math.round((data.questionsCorrect / data.questionsAttempted) * 100)
              : 0,
            priority: data.proficiencyScore < 30 ? 'High' : 'Medium'
          });
        }
      }
    }
    
    return recommendations.sort((a, b) => a.proficiencyScore - b.proficiencyScore);
  }
}

export const subtopicProgressService = new SubtopicProgressService();