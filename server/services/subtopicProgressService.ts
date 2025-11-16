// Service for tracking granular subtopic progress - Database-backed
import { db } from '../db';
import { subtopicProgress, subtopicAttemptAudit } from '../../shared/schema';
import { MBE_TOPICS, identifySubtopic } from './mbeTopics.js';
import { normalizeSubject } from './subjects.js';
import { eq, and, sql } from 'drizzle-orm';

// Map full subject names to MBE_TOPICS keys
function normalizeSubjectForSubtopics(subject: string): string {
  const normalized = normalizeSubject(subject);
  if (!normalized) return subject;
  
  // Map full names to MBE_TOPICS keys
  const subjectMap: Record<string, string> = {
    'Civil Procedure': 'Civ Pro',
    'Constitutional Law': 'Con Law',
    'Criminal Law/Procedure': 'Crim',
    'Criminal Law': 'Crim',
    'Criminal Procedure': 'Crim',
    'Real Property': 'Property',
    'Property': 'Property',
    'Torts': 'Torts',
    'Contracts': 'Contracts',
    'Evidence': 'Evidence'
  };
  
  // First try direct mapping
  if (subjectMap[normalized]) {
    return subjectMap[normalized];
  }
  
  // Also try mapping the original subject directly
  if (subjectMap[subject]) {
    return subjectMap[subject];
  }
  
  return normalized;
}

class SubtopicProgressService {
  // Check if attempt was already recorded (prevents duplicates)
  async isAttemptRecorded(userId: string, duelId: string | null, questionId: string): Promise<boolean> {
    if (!duelId || !questionId) return false;
    
    const existing = await db
      .select()
      .from(subtopicAttemptAudit)
      .where(
        and(
          eq(subtopicAttemptAudit.userId, userId),
          eq(subtopicAttemptAudit.duelId, duelId),
          eq(subtopicAttemptAudit.questionId, questionId)
        )
      )
      .limit(1);
    
    return existing.length > 0;
  }

  // Record attempt audit (prevents duplicates)
  async recordAttemptAudit(userId: string, duelId: string | null, questionId: string): Promise<void> {
    if (!duelId || !questionId) return;
    
    await db.insert(subtopicAttemptAudit).values({
      userId,
      duelId,
      questionId,
    }).onConflictDoNothing();
  }

  // Get or initialize user's subtopic progress for a specific subject and subtopic
  async getSubtopicProgress(userId: string, subject: string, subtopicKey: string) {
    const existing = await db
      .select()
      .from(subtopicProgress)
      .where(
        and(
          eq(subtopicProgress.userId, userId),
          eq(subtopicProgress.subject, subject),
          eq(subtopicProgress.subtopicKey, subtopicKey)
        )
      )
      .limit(1);

    if (existing.length > 0) {
      return existing[0];
    }

    // Parse subtopicKey which may be in format "subtopic" or "subtopic/area"
    const [mainSubtopicKey, areaKey] = subtopicKey.split('/');
    
    // Initialize new subtopic progress
    const subtopicData = MBE_TOPICS[subject]?.subtopics[mainSubtopicKey];
    if (!subtopicData) {
      console.log(`⚠️ Subtopic not found: ${subject}/${mainSubtopicKey} in MBE_TOPICS`);
      return null;
    }

    // Determine display name: if area is specified, use area name, otherwise use subtopic name
    let displayName = subtopicData.name;
    if (areaKey && subtopicData.areas) {
      // Try to find matching area name
      const areaLower = areaKey.toLowerCase().replace(/_/g, ' ');
      const matchingArea = subtopicData.areas.find((area: string) => 
        area.toLowerCase().replace(/[^a-z0-9]/g, ' ').includes(areaLower) ||
        areaLower.includes(area.toLowerCase().replace(/[^a-z0-9]/g, ' ').split(' ')[0])
      );
      if (matchingArea) {
        displayName = matchingArea;
      } else {
        // Use subtopic name with area key as fallback
        displayName = `${subtopicData.name} - ${areaKey}`;
      }
    }

    const [newProgress] = await db
      .insert(subtopicProgress)
      .values({
        userId,
        subject,
        subtopicKey,
        subtopicName: displayName,
        questionsAttempted: 0,
        questionsCorrect: 0,
        proficiencyScore: 0,
        streakCorrect: 0,
      })
      .returning();

    return newProgress;
  }

  // Record a question attempt with subtopic tracking
  async recordAttempt(
    userId: string,
    subject: string,
    questionText: string,
    explanation: string,
    isCorrect: boolean,
    difficulty: string = 'medium',
    msToAnswer: number | null = null,
    duelId: string | null = null,
    questionId: string | null = null
  ) {
    console.log(`📝 SubtopicProgressService.recordAttempt called:`, {
      userId,
      subject,
      questionTextLength: questionText?.length || 0,
      explanationLength: explanation?.length || 0,
      isCorrect,
      difficulty,
      duelId,
      questionId
    });

    // Prevent duplicate recording
    if (duelId && questionId) {
      const isRecorded = await this.isAttemptRecorded(userId, duelId, questionId);
      if (isRecorded) {
        console.log(`⏭️ Skipping duplicate attempt: ${userId}_${duelId}_${questionId}`);
        return null;
      }
      await this.recordAttemptAudit(userId, duelId, questionId);
    }

    // Normalize subject name to match MBE_TOPICS keys
    const normalizedSubject = normalizeSubjectForSubtopics(subject);
    console.log(`🔄 Subject normalized: ${subject} → ${normalizedSubject}`);
    
    // Identify the subtopic from question content
    console.log(`🔍 Attempting to identify subtopic for ${normalizedSubject}...`);
    console.log(`🔍 Question text preview: ${questionText?.substring(0, 100) || 'N/A'}...`);
    console.log(`🔍 Explanation preview: ${explanation?.substring(0, 100) || 'N/A'}...`);
    
    const subtopicKey = identifySubtopic(normalizedSubject, questionText, explanation);
    if (!subtopicKey) {
      console.log(`⚠️ Could not identify subtopic for subject: ${subject} (normalized: ${normalizedSubject})`);
      console.log(`⚠️ Question text length: ${questionText?.length || 0}, explanation length: ${explanation?.length || 0}`);
      console.log(`⚠️ This means no subtopic progress will be recorded for this question`);
      return null;
    }

    console.log(`✅ Identified subtopic: ${subtopicKey} for subject: ${normalizedSubject}`);

    // Get or create subtopic progress (store original subject name in DB)
    let progress = await this.getSubtopicProgress(userId, normalizedSubject, subtopicKey);
    if (!progress) {
      console.error(`❌ Failed to get or create progress for ${userId}, ${normalizedSubject}, ${subtopicKey}`);
      return null;
    }

    // Calculate proficiency increment
    const difficultyMultiplier = difficulty === 'hard' ? 1.5 : difficulty === 'easy' ? 0.5 : 1;
    const baseIncrement = isCorrect ? 0.5 * difficultyMultiplier : -0.25;
    const newStreakCorrect = isCorrect ? progress.streakCorrect + 1 : 0;
    const streakBonus = Math.min(newStreakCorrect * 0.1, 0.5);
    const increment = isCorrect ? baseIncrement + streakBonus : baseIncrement;
    const newProficiencyScore = Math.max(0, Math.min(100, progress.proficiencyScore + increment));

    // Update subtopic progress
    try {
      await db
        .update(subtopicProgress)
        .set({
          questionsAttempted: progress.questionsAttempted + 1,
          questionsCorrect: progress.questionsCorrect + (isCorrect ? 1 : 0),
          proficiencyScore: newProficiencyScore,
          streakCorrect: newStreakCorrect,
          lastPracticed: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(subtopicProgress.id, progress.id));

      const proficiencyBefore = progress.proficiencyScore;
      const proficiencyAfter = newProficiencyScore;

      console.log(`✅ Subtopic progress updated: ${normalizedSubject}/${subtopicKey} - ${progress.questionsAttempted + 1} attempts, ${progress.questionsCorrect + (isCorrect ? 1 : 0)} correct, proficiency: ${proficiencyBefore} → ${proficiencyAfter}`);

      return {
        subject: normalizedSubject,
        subtopic: subtopicKey,
        xpGained: isCorrect ? Math.floor(12 + (difficulty === 'hard' ? 3 : difficulty === 'easy' ? 1 : 2)) : 2,
        masteryDelta: increment,
        before: proficiencyBefore,
        after: proficiencyAfter,
        newProficiency: newProficiencyScore,
        overallProficiency: 0, // Will be calculated in getDetailedProgress
      };
    } catch (error) {
      console.error(`❌ Error updating subtopic progress in database:`, error);
      console.error(`Error details: userId=${userId}, subject=${normalizedSubject}, subtopic=${subtopicKey}`);
      throw error;
    }
  }

  // Get detailed progress report for a user
  async getDetailedProgress(userId: string) {
    const allProgress = await db
      .select()
      .from(subtopicProgress)
      .where(eq(subtopicProgress.userId, userId));

    const report: Record<string, any> = {};

    // Group by subject
    for (const [subjectKey, subjectData] of Object.entries(MBE_TOPICS)) {
      const subjectProgress = allProgress.filter((p: any) => p.subject === subjectKey);
      
      // Calculate overall subject stats
      const overallQuestionsAttempted = subjectProgress.reduce((sum: number, p: any) => sum + p.questionsAttempted, 0);
      const overallQuestionsCorrect = subjectProgress.reduce((sum: number, p: any) => sum + p.questionsCorrect, 0);
      const overallProficiencyScores = subjectProgress
        .filter((p: any) => p.questionsAttempted > 0)
        .map((p: any) => p.proficiencyScore);
      
      const overallProficiency = overallProficiencyScores.length > 0
        ? overallProficiencyScores.reduce((a: number, b: number) => a + b, 0) / overallProficiencyScores.length
        : 0;

      const lastPracticed = subjectProgress.length > 0
        ? subjectProgress
            .filter((p: any) => p.lastPracticed)
            .sort((a: any, b: any) => (b.lastPracticed?.getTime() || 0) - (a.lastPracticed?.getTime() || 0))[0]?.lastPracticed
        : null;

      report[subjectKey] = {
        name: (subjectData as any).name,
        overall: {
          questionsAttempted: overallQuestionsAttempted,
          questionsCorrect: overallQuestionsCorrect,
          proficiencyScore: overallProficiency,
          lastPracticed: lastPracticed?.toISOString() || null,
        },
        subtopics: subjectProgress
          .sort((a, b) => b.proficiencyScore - a.proficiencyScore)
          .map(progress => ({
            key: progress.subtopicKey,
            name: progress.subtopicName,
            questionsAttempted: progress.questionsAttempted,
            questionsCorrect: progress.questionsCorrect,
            proficiencyScore: progress.proficiencyScore,
            masteryLevel: this.getMasteryLevel(progress.proficiencyScore),
            percentCorrect: progress.questionsAttempted > 0
              ? Math.round((progress.questionsCorrect / progress.questionsAttempted) * 100)
              : 0,
            lastPracticed: progress.lastPracticed?.toISOString() || null,
            streakCorrect: progress.streakCorrect,
          })),
      };
    }

    return report;
  }

  // Get mastery level based on proficiency score
  getMasteryLevel(proficiencyScore: number): string {
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
  async getStudyRecommendations(userId: string) {
    const allProgress = await db
      .select()
      .from(subtopicProgress)
      .where(eq(subtopicProgress.userId, userId));

    const recommendations: Array<{
      subject: string;
      subtopic: string;
      proficiencyScore: number;
      percentCorrect: number;
      priority: 'High' | 'Medium' | 'Low';
    }> = [];

    // Group by subject and find weakest subtopics
    const subjectGroups = new Map<string, typeof allProgress>();
    for (const progress of allProgress) {
      if (!subjectGroups.has(progress.subject)) {
        subjectGroups.set(progress.subject, []);
      }
      subjectGroups.get(progress.subject)!.push(progress);
    }

    for (const [subjectKey, subjectProgressList] of Array.from(subjectGroups.entries())) {
      // Find weakest subtopics that have been attempted (at least 2 attempts)
      const weakSubtopics = subjectProgressList
        .filter((p: any) => p.questionsAttempted > 2)
        .sort((a: any, b: any) => a.proficiencyScore - b.proficiencyScore)
        .slice(0, 2); // Get 2 weakest per subject

      for (const progress of weakSubtopics) {
        if (progress.proficiencyScore < 60) {
          recommendations.push({
            subject: (MBE_TOPICS[subjectKey] as any)?.name || subjectKey,
            subtopic: progress.subtopicName,
            proficiencyScore: progress.proficiencyScore,
            percentCorrect: progress.questionsAttempted > 0
              ? Math.round((progress.questionsCorrect / progress.questionsAttempted) * 100)
              : 0,
            priority: progress.proficiencyScore < 30 ? 'High' : 'Medium',
          });
        }
      }
    }

    return recommendations.sort((a, b) => a.proficiencyScore - b.proficiencyScore);
  }
}

export const subtopicProgressService = new SubtopicProgressService();

