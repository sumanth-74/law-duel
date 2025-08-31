import { storage } from '../storage.js';
import { initializeQuestionCoordinator } from './qcoordinator.js';
import { progressService } from '../progress.js';
import { db } from '../db.js';
import { questionCache } from '../../shared/schema.js';
import { eq } from 'drizzle-orm';

class SoloChallengeService {
  constructor() {
    // No need for activeChallenges Map - using database directly
    console.log('Solo Challenge Service initialized with database storage');
  }

  // Start a new solo challenge
  async startChallenge(userId, subject, questionType = 'bar-exam') {
    // Check if user has exhausted their lives and is in cooldown
    const existingChallenge = await this.getTodaysChallenge(userId);
    
    if (existingChallenge && existingChallenge.livesRemaining === 0) {
      // Check if 3 hours have passed since they lost all lives (changed from 24 hours)
      const lostAllLivesAt = new Date(existingChallenge.lostAllLivesAt || existingChallenge.startedAt);
      const hoursSince = (Date.now() - lostAllLivesAt.getTime()) / (1000 * 60 * 60);
      
      if (hoursSince < 3) { // Changed from 24 to 3 hours
        const hoursRemaining = Math.ceil(3 - hoursSince);
        throw new Error(`All lives lost! Come back in ${hoursRemaining} hour${hoursRemaining > 1 ? 's' : ''} or challenge Atticus to restore them!`);
      }
    }

    const challengeId = `solo_${userId}_${Date.now()}`;
    
    // Get first question (difficulty 1)
    const firstQuestion = await this.generateQuestion(subject, 1, questionType);
    
    const challengeData = {
      id: challengeId,
      userId,
      subject,
      questionType, // Store the question type in the challenge
      livesRemaining: 3, // 3 lives total
      round: 1,
      score: 0,
      difficulty: 1,
      startedAt: new Date(),
      isDailyComplete: false,
      lostAllLivesAt: null,
      currentQuestionId: firstQuestion.qid || firstQuestion.id
    };

    const challenge = await storage.createSoloChallenge(challengeData);

    // Question is already stored by generateQuestion method

    return {
      challenge,
      question: firstQuestion
    };
  }

  // Get challenge status for today
  async getTodaysChallenge(userId) {
    const userChallenges = await storage.getUserSoloChallenges(userId);
    const today = new Date().toDateString();
    
    for (const challenge of userChallenges) {
      const challengeDate = new Date(challenge.startedAt).toDateString();
      if (challengeDate === today) {
        return challenge;
      }
    }
    return null;
  }

  // Submit an answer for a challenge
  async submitAnswer(challengeId, answerIndex, timeToAnswer = 0) {
    const challenge = await storage.getSoloChallenge(challengeId);
    if (!challenge) {
      throw new Error('Challenge not found');
    }

    // Get the stored question for validation
    const question = await this.getStoredQuestion(challenge.currentQuestionId);
    
    if (!question) {
      throw new Error('Question not found for validation');
    }

    // Use correctIndex (from OpenAI) instead of correctAnswer
    const isCorrect = answerIndex === (question.correctIndex || question.correctAnswer);
    let livesLost = 0;
    let pointsEarned = 0;
    let speedBonus = 0;

    if (isCorrect) {
      // Calculate points based on difficulty and time
      const basePoints = challenge.difficulty * 5; // 5, 10, 15, 20, 25...
      
      // Speed bonus for answering quickly
      if (timeToAnswer <= 5) {
        speedBonus = Math.floor(basePoints * 0.5); // +50% bonus
      } else if (timeToAnswer <= 10) {
        speedBonus = Math.floor(basePoints * 0.3); // +30% bonus
      } else if (timeToAnswer <= 15) {
        speedBonus = Math.floor(basePoints * 0.15); // +15% bonus
      }
      
      pointsEarned = basePoints + speedBonus;
      
      // Update user's total points
      try {
        const user = await storage.getUser(challenge.userId);
        if (user) {
          await storage.updateUser(challenge.userId, {
            points: user.points + pointsEarned
          });
        }
      } catch (error) {
        console.error('Failed to update user points:', error);
      }
    } else {
      // Wrong answer - lose a life
      livesLost = 1;
    }

    const newLivesRemaining = Math.max(0, challenge.livesRemaining - livesLost);
    const newScore = challenge.score + pointsEarned;
    const newRound = challenge.round + 1;

    // Determine new difficulty (increase every 5 correct answers in a row or every 3 rounds)
    let newDifficulty = challenge.difficulty;
    if (isCorrect && (newRound % 3 === 0)) {
      newDifficulty = Math.min(10, challenge.difficulty + 1); // Cap at difficulty 10
    }

    // Update challenge in database
    const updates = {
      livesRemaining: newLivesRemaining,
      score: newScore,
      round: newRound,
      difficulty: newDifficulty
    };

    // Check if all lives are lost
    if (newLivesRemaining === 0) {
      // Trigger Atticus duel automatically
      try {
        const { atticusDuelService } = await import('./atticusDuelService.js');
        const atticusDuel = await atticusDuelService.startAtticusDuel(challenge.userId, challengeId);
        
        // Update challenge to mark lives lost
        await storage.updateSoloChallenge(challengeId, {
          ...updates,
          lostAllLivesAt: new Date()
        });
        
        return {
          isCorrect: false,
          correctAnswer: question.correctAnswer,
          explanation: question.explanation,
          livesLost: 1,
          newDifficulty: challenge.difficulty,
          pointsEarned: 0,
          speedBonus: 0,
          atticusDuelRequired: true,
          atticusDuel: atticusDuel
        };
      } catch (error) {
        console.error('Failed to start Atticus duel:', error);
        // If Atticus duel fails, we need to handle this gracefully
        await storage.updateSoloChallenge(challengeId, {
          ...updates,
          lostAllLivesAt: new Date()
        });
        
        return {
          isCorrect: false,
          correctAnswer: question.correctAnswer,
          explanation: question.explanation,
          livesLost: 1,
          newDifficulty: challenge.difficulty,
          pointsEarned: 0,
          speedBonus: 0,
          message: 'No lives remaining. Atticus duel failed to start.'
        };
      }
    }

    // Update challenge in database
    await storage.updateSoloChallenge(challengeId, updates);

    return {
      isCorrect,
      correctAnswer: question.correctAnswer,
      explanation: question.explanation,
      livesLost,
      newDifficulty,
      pointsEarned,
      speedBonus
    };
  }

  // Get the next question for a challenge
  async getNextQuestion(challengeId) {
    const challenge = await storage.getSoloChallenge(challengeId);
    if (!challenge) {
      throw new Error('Challenge not found');
    }

    const nextQuestion = await this.generateQuestion(
      challenge.subject, 
      challenge.difficulty, 
      challenge.questionType
    );

    // Question is already stored by generateQuestion method

    // Update challenge with new question ID
    await storage.updateSoloChallenge(challengeId, {
      currentQuestionId: nextQuestion.qid || nextQuestion.id
    });

    return nextQuestion;
  }

  // Restore lives for a user (called by Atticus duel service on victory)
  async restoreLives(userId) {
    const challenge = await this.getTodaysChallenge(userId);
    if (challenge) {
      await storage.updateSoloChallenge(challenge.id, {
        livesRemaining: 3,
        lostAllLivesAt: null
      });
      console.log(`✅ Restored 3 lives for user ${userId}`);
      return true;
    }
    return false;
  }

  // Get challenge status for API response
  async getChallengeStatus(userId) {
    const todaysChallenge = await this.getTodaysChallenge(userId);
    
    if (!todaysChallenge) {
      return { canPlay: true };
    }
    
    if (todaysChallenge.livesRemaining > 0) {
      return { 
        canPlay: true,
        livesRemaining: todaysChallenge.livesRemaining,
        currentRound: todaysChallenge.round
      };
    }
    
    // No lives left - they need to play Atticus or wait for auto-restore
    return { 
      canPlay: false,
      message: 'No lives remaining. Play Atticus to restore them or wait for auto-restore.'
    };
  }

  // Get all challenges for a user (for progress tracking)
  async getUserChallenges(userId, limit = 50) {
    return await storage.getUserSoloChallenges(userId);
  }

  // Get challenge by ID
  async getChallenge(challengeId) {
    return await storage.getSoloChallenge(challengeId);
  }

  // Generate a question for the given subject and difficulty
  async generateQuestion(subject, difficulty, questionType = 'bar-exam') {
    try {
      // Use fast question pools for instant serving
      await initializeQuestionCoordinator();
      const { getPooledQuestion } = await import('./questionPool.js');
      
      // Try to get from pool first (instant)
      let question = await getPooledQuestion(subject, difficulty, []);
      
      if (!question) {
        // Fallback to fresh generation only if pool is empty
        const { generateFreshQuestion } = await import('./robustGenerator.js');
        question = await generateFreshQuestion(subject, difficulty, questionType);
      }

      // Store the question for later validation
      await this.storeQuestion(question.qid || question.id, question);
      
      return question;
    } catch (error) {
      console.error('Failed to generate question:', error);
      // Use simple fallback as last resort
      const fallback = {
        qid: `fallback_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        subject: subject,
        topic: 'General',
        stem: 'This is a sample legal question for testing purposes.',
        choices: ['Option A', 'Option B', 'Option C', 'Option D'],
        correctIndex: 0,
        explanation: 'This is a fallback question used when question generation fails.',
        difficulty: difficulty,
        timeLimit: 60000,
        timeLimitSec: 60,
        deadlineTs: Date.now() + 60000
      };
      await this.storeQuestion(fallback.qid, fallback);
      return fallback;
    }
  }

  // Store a question for later retrieval/validation
  async storeQuestion(questionId, questionData) {
    try {
      console.log(`🔄 Storing question ${questionId}`);
      
      // Ensure subject is a string
      const subjectStr = typeof questionData.subject === 'string' 
        ? questionData.subject 
        : questionData.subject?.subject || 'Mixed Questions';
      
      // Check if question already exists to avoid duplicate key error
      const existing = await this.getStoredQuestionDirect(questionId);
      if (existing) {
        console.log(`✅ Question ${questionId} already cached, skipping storage`);
        return;
      }
      
      // Store in database as question cache
      await storage.cacheQuestion({
        id: questionId,
        subject: subjectStr,
        difficulty: questionData.difficulty || 1,
        questionData: questionData,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) // Expire in 24 hours
      });
      
      console.log(`✅ Question ${questionId} stored successfully in cache`);
    } catch (error) {
      if (error.code === '23505') {
        // Duplicate key error - question already exists, ignore
        console.log(`✅ Question ${questionId} already exists in cache`);
      } else {
        console.error('❌ Failed to store question:', error);
      }
    }
  }

  // Fast direct lookup by ID (for checking existence)
  async getStoredQuestionDirect(questionId) {
    try {
      // Try a direct database query if storage supports it
      const result = await db.select()
        .from(questionCache)
        .where(eq(questionCache.id, questionId))
        .limit(1);
      
      return result.length > 0 ? result[0] : null;
    } catch (error) {
      return null;
    }
  }

  // Get stored question by ID for validation (optimized)
  async getStoredQuestion(questionId) {
    try {
      console.log(`🔍 Looking for question: ${questionId}`);
      
      // First try direct lookup
      const direct = await this.getStoredQuestionDirect(questionId);
      if (direct) {
        console.log(`✅ Found cached question ${questionId} directly`);
        return direct.questionData;
      }
      
      console.error(`❌ Question ${questionId} not found in cache`);
      return null;
    } catch (error) {
      console.error('Failed to get stored question:', error);
      return null;
    }
  }

  // Clean up old challenges (optional - for maintenance)
  async cleanupOldChallenges() {
    try {
      // Delete challenges older than 7 days
      const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      console.log('Cleanup functionality would go here');
      // TODO: Implement cleanup query when needed
    } catch (error) {
      console.error('Failed to cleanup old challenges:', error);
    }
  }
}

export const soloChallengeService = new SoloChallengeService();