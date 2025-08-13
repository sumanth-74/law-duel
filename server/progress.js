// Progress tracking service - records all attempts with idempotency
import fs from 'fs';
import path from 'path';
import { normalizeLabel, SUBJECTS, getSubjectForSubtopic, getSubtopicsForSubject } from './taxonomy.js';

const DATA_DIR = path.join(process.cwd(), 'data');
const PROGRESS_FILE = path.join(DATA_DIR, 'progress.json');
const AUDIT_FILE = path.join(DATA_DIR, 'progress-audit.json');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

class ProgressService {
  constructor() {
    this.progress = new Map();
    this.auditLog = [];
    this.attemptCache = new Set(); // For idempotency
    this.loadFromFile();
  }

  loadFromFile() {
    try {
      if (fs.existsSync(PROGRESS_FILE)) {
        const data = JSON.parse(fs.readFileSync(PROGRESS_FILE, 'utf-8'));
        this.progress = new Map(Object.entries(data.progress || {}));
        this.attemptCache = new Set(data.attemptCache || []);
      }
      
      if (fs.existsSync(AUDIT_FILE)) {
        this.auditLog = JSON.parse(fs.readFileSync(AUDIT_FILE, 'utf-8'));
      }
    } catch (error) {
      console.error('Error loading progress data:', error);
      this.progress = new Map();
      this.attemptCache = new Set();
      this.auditLog = [];
    }
  }

  saveToFile() {
    try {
      const progressData = {
        progress: Object.fromEntries(this.progress),
        attemptCache: Array.from(this.attemptCache),
        lastSaved: new Date().toISOString()
      };
      
      fs.writeFileSync(PROGRESS_FILE, JSON.stringify(progressData, null, 2));
      fs.writeFileSync(AUDIT_FILE, JSON.stringify(this.auditLog, null, 2));
    } catch (error) {
      console.error('Error saving progress data:', error);
    }
  }

  // Get or initialize user progress
  getUserProgress(userId) {
    if (!this.progress.has(userId)) {
      this.progress.set(userId, this.initializeUserProgress());
    }
    return this.progress.get(userId);
  }

  // Initialize empty progress for a user
  initializeUserProgress() {
    const progress = {};
    
    // Initialize all subjects with their granular subtopics
    for (const subject of Object.keys(SUBJECTS)) {
      progress[subject] = {
        overall: {
          attempts: 0,
          correct: 0,
          mastery: 0,
          lastSeenAt: null
        },
        subtopics: {}
      };
      
      // Get all subtopics including granular areas (e.g., "Jurisdiction/Federal Question")
      const allSubtopics = getSubtopicsForSubject(subject);
      for (const subtopic of allSubtopics) {
        progress[subject].subtopics[subtopic] = {
          attempts: 0,
          correct: 0,
          mastery: 0,
          lastSeenAt: null
        };
      }
    }
    
    return progress;
  }

  // Main recording function - idempotent by (userId, duelId, questionId)
  async recordAttempt({
    userId,
    duelId,
    questionId,
    subject,
    subtopic,
    difficulty = 1,
    correct,
    msToAnswer,
    ts = Date.now()
  }) {
    // Normalize inputs
    const normalizedSubject = normalizeLabel(subject);
    const normalizedSubtopic = normalizeLabel(subtopic);
    
    // If subject is unmapped but subtopic is valid, find the correct subject
    let finalSubject = normalizedSubject;
    if (normalizedSubject === 'Unmapped' && normalizedSubtopic !== 'Unmapped') {
      const foundSubject = getSubjectForSubtopic(normalizedSubtopic);
      if (foundSubject) {
        finalSubject = foundSubject;
      }
    }
    
    // Check idempotency
    const attemptKey = `${userId}:${duelId}:${questionId}`;
    if (this.attemptCache.has(attemptKey)) {
      console.log(`📝 Attempt already recorded: ${attemptKey}`);
      return null;
    }
    
    // Get user progress
    const userProgress = this.getUserProgress(userId);
    
    // Ensure subject exists
    if (!userProgress[finalSubject]) {
      console.warn(`⚠️ Subject not found in progress: ${finalSubject}`);
      return null;
    }
    
    // Ensure subtopic exists
    if (!userProgress[finalSubject].subtopics[normalizedSubtopic]) {
      console.warn(`⚠️ Subtopic not found: ${finalSubject}/${normalizedSubtopic}`);
      // Add unmapped subtopic dynamically
      userProgress[finalSubject].subtopics[normalizedSubtopic] = {
        attempts: 0,
        correct: 0,
        mastery: 0,
        lastSeenAt: null
      };
    }
    
    // Update counts
    const subtopicData = userProgress[finalSubject].subtopics[normalizedSubtopic];
    const overallData = userProgress[finalSubject].overall;
    
    subtopicData.attempts++;
    overallData.attempts++;
    
    if (correct) {
      subtopicData.correct++;
      overallData.correct++;
    }
    
    // Calculate mastery change using adaptive K-factor
    const K = 6 + Math.min(4, Math.floor(difficulty / 2)); // K ranges from 6 to 10
    const expectedAccuracy = 0.6; // Target 60% accuracy
    const masteryDelta = correct 
      ? K * (1 - expectedAccuracy)  // Positive for correct
      : -K * expectedAccuracy;       // Negative for incorrect
    
    // Update mastery (clamped 0-100)
    const oldMastery = subtopicData.mastery;
    subtopicData.mastery = Math.max(0, Math.min(100, oldMastery + masteryDelta));
    
    // Update overall subject mastery (average of subtopics)
    const subtopicMasteries = Object.values(userProgress[finalSubject].subtopics)
      .map(s => s.mastery);
    overallData.mastery = subtopicMasteries.reduce((a, b) => a + b, 0) / subtopicMasteries.length;
    
    // Update timestamps
    subtopicData.lastSeenAt = ts;
    overallData.lastSeenAt = ts;
    
    // Mark as recorded
    this.attemptCache.add(attemptKey);
    
    // Write to audit log
    const auditEntry = {
      userId,
      duelId,
      questionId,
      subject: finalSubject,
      subtopic: normalizedSubtopic,
      difficulty,
      correct,
      msToAnswer,
      masteryBefore: oldMastery,
      masteryAfter: subtopicData.mastery,
      masteryDelta,
      ts,
      timestamp: new Date(ts).toISOString()
    };
    
    this.auditLog.push(auditEntry);
    
    // Save to file
    this.saveToFile();
    
    // Return the progress result for immediate feedback
    return {
      subject: finalSubject,
      subtopic: normalizedSubtopic,
      xpGained: correct ? 12 : 3,
      masteryDelta: Math.round(masteryDelta * 10) / 10, // Round to 1 decimal
      masteryBefore: Math.round(oldMastery),
      masteryAfter: Math.round(subtopicData.mastery),
      attempts: subtopicData.attempts,
      correct: subtopicData.correct,
      accuracy: Math.round((subtopicData.correct / subtopicData.attempts) * 100)
    };
  }

  // Get all subtopic stats for a user
  getSubtopicStats(userId) {
    const userProgress = this.getUserProgress(userId);
    const stats = [];
    
    for (const [subject, subjectData] of Object.entries(userProgress)) {
      for (const [subtopic, subtopicData] of Object.entries(subjectData.subtopics)) {
        stats.push({
          subject,
          subtopic,
          attempts: subtopicData.attempts,
          correct: subtopicData.correct,
          mastery: Math.round(subtopicData.mastery),
          accuracy: subtopicData.attempts > 0 
            ? Math.round((subtopicData.correct / subtopicData.attempts) * 100)
            : 0,
          lastSeenAt: subtopicData.lastSeenAt
        });
      }
    }
    
    return stats;
  }

  // Get public profile data
  getPublicProfile(userId) {
    const userProgress = this.getUserProgress(userId);
    const subjectBars = [];
    const topSubtopics = [];
    
    // Calculate subject bars
    for (const [subject, subjectData] of Object.entries(userProgress)) {
      subjectBars.push({
        subject,
        mastery: Math.round(subjectData.overall.mastery),
        attempts: subjectData.overall.attempts,
        correct: subjectData.overall.correct,
        accuracy: subjectData.overall.attempts > 0
          ? Math.round((subjectData.overall.correct / subjectData.overall.attempts) * 100)
          : 0
      });
    }
    
    // Get top 5 practiced subtopics
    const allSubtopics = [];
    for (const [subject, subjectData] of Object.entries(userProgress)) {
      for (const [subtopic, subtopicData] of Object.entries(subjectData.subtopics)) {
        if (subtopicData.attempts > 0) {
          allSubtopics.push({
            subject,
            subtopic,
            mastery: Math.round(subtopicData.mastery),
            attempts: subtopicData.attempts,
            lastSeenAt: subtopicData.lastSeenAt
          });
        }
      }
    }
    
    // Sort by attempts and recency
    allSubtopics.sort((a, b) => {
      // First by attempts
      if (b.attempts !== a.attempts) {
        return b.attempts - a.attempts;
      }
      // Then by recency
      return (b.lastSeenAt || 0) - (a.lastSeenAt || 0);
    });
    
    return {
      subjectBars,
      topSubtopics: allSubtopics.slice(0, 5)
    };
  }

  // Get weakest subtopics for targeting
  getWeakestSubtopics(userId, count = 5) {
    const userProgress = this.getUserProgress(userId);
    const subtopics = [];
    
    for (const [subject, subjectData] of Object.entries(userProgress)) {
      for (const [subtopic, subtopicData] of Object.entries(subjectData.subtopics)) {
        // Only consider attempted subtopics or those with low mastery
        if (subtopicData.attempts > 0 || subtopicData.mastery < 50) {
          subtopics.push({
            subject,
            subtopic,
            mastery: subtopicData.mastery,
            attempts: subtopicData.attempts,
            accuracy: subtopicData.attempts > 0
              ? (subtopicData.correct / subtopicData.attempts) * 100
              : 0,
            priority: subtopicData.mastery + (subtopicData.attempts * 0.1) // Prioritize low mastery
          });
        }
      }
    }
    
    // Sort by priority (lowest first)
    subtopics.sort((a, b) => a.priority - b.priority);
    
    return subtopics.slice(0, count);
  }
}

// Export singleton instance
export const progressService = new ProgressService();