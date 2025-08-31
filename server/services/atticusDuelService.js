import { storage } from '../storage.js';
import { db } from '../db.js';
import { questionCache } from '../../shared/schema.js';
import { eq } from 'drizzle-orm';

class AtticusDuelService {
  constructor() {
    console.log('Atticus Duel Service initialized with database storage');
  }

  // Start an Atticus duel when user runs out of lives
  async startAtticusDuel(userId, challengeId) {
    const user = await storage.getUser(userId);
    if (!user) {
      throw new Error('User not found');
    }

    // Check if user is already in a duel
    const activeDuel = await storage.getUserActiveAtticusDuel(userId);
    if (activeDuel) {
      throw new Error('User is already in an Atticus duel');
    }

    // Check if user has a cooldown from previous loss
    const lastDuel = await storage.getUserLastAtticusDuel(userId);
    if (lastDuel && lastDuel.result === 'loss' && !lastDuel.revived) {
      const hoursSinceLoss = (Date.now() - new Date(lastDuel.startedAt).getTime()) / (1000 * 60 * 60);
      if (hoursSinceLoss < 3) {
        // TEMPORARILY DISABLED FOR TESTING - Remove this comment when done testing
        console.log('⚠️ Cooldown check temporarily disabled for testing');
        // const hoursRemaining = Math.ceil(3 - hoursSinceLoss);
        // throw new Error(`You must wait ${hoursRemaining} hour${hoursRemaining > 1 ? 's' : ''} before challenging Atticus again`);
      }
    }

    // Create the duel
    const duelId = `atticus_${userId}_${Date.now()}`;
    const duelData = {
      id: duelId,
      userId,
      challengeId,
      result: null,
      playerScore: 0,
      atticusScore: 0,
      round: 1,
      status: 'active',
      questions: [],
      currentQuestion: null,
      revived: false,
      autoRestoredAt: null,
      startedAt: new Date(),
      completedAt: null
    };

    // Generate first question
    const question = await this.generateAtticusQuestion();
    duelData.currentQuestion = question;
    duelData.questions = [question];

    const duel = await storage.createAtticusDuel(duelData);

    return {
      duel,
      question
    };
  }

  // Generate a challenging question for Atticus duel (USE EXACT SAME APPROACH AS SOLO CHALLENGE)
  async generateAtticusQuestion() {
    // Use same difficulty and approach as solo challenge
    const difficulty = Math.floor(Math.random() * 4) + 1; // Difficulty 1-4 (same as solo)
    const subjects = ['Torts', 'Con Law', 'Crim', 'Contracts'];
    const randomSubject = subjects[Math.floor(Math.random() * subjects.length)];
    
    // EXACT SAME CODE AS SOLO CHALLENGE
    try {
      // Use fast question pools for instant serving
      const { initializeQuestionCoordinator } = await import('./qcoordinator.js');
      await initializeQuestionCoordinator();
      const { getPooledQuestion } = await import('./questionPool.js');
      
      // Try to get from pool first (instant)
      let question = await getPooledQuestion(randomSubject, difficulty, []);
      
      if (!question) {
        // Fallback to fresh generation only if pool is empty
        const { generateFreshQuestion } = await import('./robustGenerator.js');
        question = await generateFreshQuestion(randomSubject, difficulty, 'bar-exam');
      }

      // Store the question for later validation
      await this.storeQuestion(question.qid || question.id, question);
      
      return question;
    } catch (error) {
      console.error('Failed to generate Atticus question:', error);
      // NO FALLBACK - Just re-throw the error like original solo challenge
      throw error;
    }
  }

  // Store a question for later retrieval/validation (COPIED FROM SOLO CHALLENGE)
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

  // Fast direct lookup by ID (for checking existence) (COPIED FROM SOLO CHALLENGE)
  async getStoredQuestionDirect(questionId) {
    try {
      // Try a direct database query if storage supports it
      const result = await db
        .select()
        .from(questionCache)
        .where(eq(questionCache.id, questionId))
        .limit(1);
      
      return result.length > 0 ? result[0].questionData : null;
    } catch (error) {
      console.error('Failed to get stored question directly:', error);
      return null;
    }
  }

  // Get stored question by ID for validation (COPIED FROM SOLO CHALLENGE)
  async getStoredQuestion(questionId) {
    try {
      console.log(`🔍 Looking for question: ${questionId}`);
      
      // First try direct lookup
      const direct = await this.getStoredQuestionDirect(questionId);
      if (direct) {
        console.log(`✅ Found cached question ${questionId} directly`);
        return direct;
      }
      
      return null;
    } catch (error) {
      console.error('Failed to get stored question:', error);
      return null;
    }
  }

  // Submit an answer to the current Atticus duel question
  async submitAtticusAnswer(userId, answer, timeToAnswer = 0) {
    const duel = await storage.getUserActiveAtticusDuel(userId);
    if (!duel || duel.status !== 'active') {
      throw new Error('No active Atticus duel found');
    }

    const currentQuestion = duel.currentQuestion;
    if (!currentQuestion) {
      throw new Error('No current question in duel');
    }

    // Get the stored question for validation (SAME AS SOLO CHALLENGE)
    const question = await this.getStoredQuestion(currentQuestion.qid || currentQuestion.id);
    
    if (!question) {
      throw new Error('Question not found for validation');
    }

    // Use correctIndex from current question (which has been shuffled) 
    const isCorrect = answer === (currentQuestion.correctIndex || currentQuestion.correctAnswer);
    
    // Calculate points (Atticus questions are worth more)
    let points = 0;
    if (isCorrect) {
      const basePoints = 50; // Base points for Atticus questions
      
      // Speed bonus for quick answers
      if (timeToAnswer <= 5) {
        points = Math.floor(basePoints * 1.5); // +50% bonus
      } else if (timeToAnswer <= 10) {
        points = Math.floor(basePoints * 1.3); // +30% bonus
      } else if (timeToAnswer <= 15) {
        points = Math.floor(basePoints * 1.15); // +15% bonus
      } else {
        points = basePoints;
      }
    }

    // Move to next round or end duel
    const newRound = duel.round + 1;
    const newPlayerScore = duel.playerScore + points;
    
    console.log(`🔍 Debug: Round ${newRound}, Player Score: ${newPlayerScore}`);
    
    if (newRound > 5) { // 5 questions total
      console.log('🔍 Debug: Duel ended, calling endAtticusDuel');
      // End the duel and return the result directly
      const duelResult = await this.endAtticusDuel(userId, newPlayerScore);
      return {
        isCorrect,
        correctAnswer: currentQuestion.correctIndex || currentQuestion.correctAnswer,
        explanation: currentQuestion.explanation,
        points,
        round: newRound,
        duelEnded: true,
        playerScore: newPlayerScore,
        playerWon: duelResult.result === 'win',
        message: duelResult.message,
        atticusScore: duelResult.atticusScore,
        nextQuestion: null
      };
    }

    // Generate next question
    const nextQuestion = await this.generateAtticusQuestion();
    
    // Update duel in database
    await storage.updateAtticusDuel(duel.id, {
      round: newRound,
      playerScore: newPlayerScore,
      currentQuestion: nextQuestion,
      questions: [...duel.questions, nextQuestion]
    });

    return {
      isCorrect,
      correctAnswer: currentQuestion.correctIndex || currentQuestion.correctAnswer,
      explanation: currentQuestion.explanation,
      points,
      round: newRound,
      duelEnded: false,
      playerScore: newPlayerScore,
      nextQuestion: nextQuestion
    };
  }

  // End the Atticus duel and determine the winner
  async endAtticusDuel(userId, playerScore = null) {
    const duel = await storage.getUserActiveAtticusDuel(userId);
    if (!duel) {
      throw new Error('No active duel found');
    }

    // Use provided score or get from duel
    const finalPlayerScore = playerScore !== null ? playerScore : duel.playerScore;
    
    // Calculate Atticus's score (make it competitive but winnable)
    // Atticus should win ~2/3 of the time as specified
    const maxPossibleScore = 5 * 75; // 5 questions * max 75 points each
    let atticusScore;
    
    // Make Atticus score dependent on player's score for fairer competition
    if (finalPlayerScore >= maxPossibleScore * 0.8) {
      // Player did very well, Atticus gets high score but player can still win
      atticusScore = Math.floor(maxPossibleScore * 0.75 + Math.random() * maxPossibleScore * 0.2);
    } else if (finalPlayerScore >= maxPossibleScore * 0.6) {
      // Player did well, Atticus gets competitive score
      atticusScore = Math.floor(maxPossibleScore * 0.65 + Math.random() * maxPossibleScore * 0.25);
    } else {
      // Player didn't do as well, Atticus gets moderate score but usually wins
      atticusScore = Math.floor(maxPossibleScore * 0.55 + Math.random() * maxPossibleScore * 0.3);
    }

    const playerWon = finalPlayerScore > atticusScore;
    const result = playerWon ? 'win' : 'loss';
    
    let message;
    if (playerWon) {
      message = 'Congratulations! You defeated Atticus and restored your lives!';
      
      // Restore lives immediately
      try {
        const { soloChallengeService } = await import('./soloChallengeService.js');
        await soloChallengeService.restoreLives(userId);
        console.log(`🎉 Player ${userId} won Atticus duel - lives restored!`);
      } catch (error) {
        console.error('Failed to restore lives after Atticus victory:', error);
      }
    } else {
      message = 'Atticus prevailed this time. Wait 3 hours for life restoration or pay $1 to revive immediately.';
    }

    // Update duel in database
    await storage.updateAtticusDuel(duel.id, {
      status: 'completed',
      result,
      playerScore: finalPlayerScore,
      atticusScore,
      completedAt: new Date()
    });

    console.log(`⚔️ Atticus duel completed: Player ${finalPlayerScore} vs Atticus ${atticusScore} - ${result}`);

    return {
      result,
      playerScore: finalPlayerScore,
      atticusScore,
      message
    };
  }

  // Revive from defeat (payment option)
  async reviveFromDefeat(userId) {
    const lastDuel = await storage.getUserLastAtticusDuel(userId);
    if (!lastDuel || lastDuel.result !== 'loss' || lastDuel.revived) {
      throw new Error('No defeat to revive from or already revived');
    }

    // Mark as revived
    await storage.updateAtticusDuel(lastDuel.id, {
      revived: true
    });

    // Restore lives
    try {
      const { soloChallengeService } = await import('./soloChallengeService.js');
      await soloChallengeService.restoreLives(userId);
      console.log(`💰 Player ${userId} revived from defeat - lives restored!`);
    } catch (error) {
      console.error('Failed to restore lives after revive:', error);
    }

    return { success: true, message: 'Lives restored! You can continue playing.' };
  }

  // Get current duel status
  getDuelStatus(userId) {
    return new Promise(async (resolve) => {
      const activeDuel = await storage.getUserActiveAtticusDuel(userId);
      const lastDuel = await storage.getUserLastAtticusDuel(userId);
      
      if (activeDuel) {
        resolve({
          inDuel: true,
          duel: activeDuel
        });
        return;
      }
      
      if (lastDuel && lastDuel.result === 'loss' && !lastDuel.revived) {
        const timeSinceLoss = Date.now() - new Date(lastDuel.startedAt).getTime();
        const totalCooldownMs = 3 * 60 * 60 * 1000; // 3 hours in milliseconds
        const timeRemainingMs = totalCooldownMs - timeSinceLoss;
        
        if (timeRemainingMs > 0) {
          // Still in cooldown - calculate accurate remaining time
          const hoursRemaining = Math.floor(timeRemainingMs / (1000 * 60 * 60));
          const minutesRemaining = Math.floor((timeRemainingMs % (1000 * 60 * 60)) / (1000 * 60));
          
          console.log(`🔍 Time calculation debug for user ${userId}:`);
          console.log(`  - Time since loss: ${(timeSinceLoss / (1000 * 60 * 60)).toFixed(2)} hours`);
          console.log(`  - Time remaining: ${(timeRemainingMs / (1000 * 60 * 60)).toFixed(2)} hours`);
          console.log(`  - Hours remaining: ${hoursRemaining}, Minutes remaining: ${minutesRemaining}`);
          
          resolve({
            inDuel: false,
            canChallenge: false,
            cooldownHours: hoursRemaining,
            cooldownMinutes: minutesRemaining,
            message: `You must wait ${hoursRemaining} hour${hoursRemaining > 1 ? 's' : ''} and ${minutesRemaining} minute${minutesRemaining > 1 ? 's' : ''} before lives are restored`
          });
          return;
        } else {
          // Cooldown finished - auto-restore lives
          this.autoRestoreLives(userId);
          resolve({
            inDuel: false,
            canChallenge: true,
            message: 'Lives automatically restored! You can play again.'
          });
          return;
        }
      }
      
      resolve({
        inDuel: false,
        canChallenge: true
      });
    });
  }
  
  // Auto-restore lives after 3 hours
  async autoRestoreLives(userId) {
    try {
      const { soloChallengeService } = await import('./soloChallengeService.js');
      await soloChallengeService.restoreLives(userId);
      
      // Mark as revived to prevent duplicate restores
      const lastDuel = await storage.getUserLastAtticusDuel(userId);
      if (lastDuel) {
        await storage.updateAtticusDuel(lastDuel.id, {
          revived: true,
          autoRestoredAt: new Date()
        });
      }
      
      console.log(`🔄 Auto-restored lives for user ${userId} after 3-hour cooldown`);
    } catch (error) {
      console.error('Failed to auto-restore lives:', error);
    }
  }

  // Get duel history for a user
  async getUserDuelHistory(userId, limit = 10) {
    return await storage.getUserAtticusDuels(userId);
  }

  // Clear duel history (for testing)
  async clearDuelHistory(userId) {
    console.log(`🧹 Clearing duel history for user ${userId} (testing only)`);
    // Note: This is for testing only - in production you might want to soft delete
    const userDuels = await storage.getUserAtticusDuels(userId);
    for (const duel of userDuels) {
      // For testing, we'll just mark them as revived to clear cooldowns
      if (duel.result === 'loss') {
        await storage.updateAtticusDuel(duel.id, {
          revived: true,
          autoRestoredAt: new Date()
        });
      }
    }
    return { success: true, message: 'Duel history cleared' };
  }
}

export const atticusDuelService = new AtticusDuelService();