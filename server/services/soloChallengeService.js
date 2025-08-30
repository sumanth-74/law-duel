import fs from 'fs/promises';
import path from 'path';
import { initializeQuestionCoordinator } from './qcoordinator.js';
import { progressService } from '../progress.js';

const CHALLENGES_FILE = path.join(process.cwd(), 'data', 'solo-challenges.json');

class SoloChallengeService {
  constructor() {
    this.activeChallenges = new Map();
    this.initializeStorage();
  }

  async initializeStorage() {
    try {
      await fs.mkdir(path.dirname(CHALLENGES_FILE), { recursive: true });
      
      try {
        const data = await fs.readFile(CHALLENGES_FILE, 'utf8');
        const challenges = JSON.parse(data);
        challenges.forEach(challenge => {
          this.activeChallenges.set(challenge.id, challenge);
        });
        console.log(`Loaded ${challenges.length} active solo challenges`);
      } catch {
        // File doesn't exist, start fresh
        await this.saveToFile();
      }
    } catch (error) {
      console.error('Failed to initialize solo challenge storage:', error);
    }
  }

  async saveToFile() {
    try {
      const challenges = Array.from(this.activeChallenges.values());
      await fs.writeFile(CHALLENGES_FILE, JSON.stringify(challenges, null, 2));
    } catch (error) {
      console.error('Failed to save solo challenges:', error);
    }
  }

  // Start a new solo challenge
  async startChallenge(userId, subject, questionType = 'bar-exam') {
    // Check if user has exhausted their lives and is in cooldown
    const existingChallenge = this.getTodaysChallenge(userId);
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
    
    const challenge = {
      id: challengeId,
      userId,
      subject,
      questionType, // Store the question type in the challenge
      livesRemaining: 3, // 3 lives total
      round: 1,
      score: 0,
      difficulty: 1,
      startedAt: new Date().toISOString(),
      isDailyComplete: false,
      lostAllLivesAt: null,
      currentQuestionId: firstQuestion.id
    };

    this.activeChallenges.set(challengeId, challenge);
    await this.saveToFile();

    return {
      challenge,
      question: firstQuestion
    };
  }

  // Get challenge status for today
  getTodaysChallenge(userId) {
    const today = new Date().toDateString();
    for (const challenge of this.activeChallenges.values()) {
      const challengeDate = new Date(challenge.startedAt).toDateString();
      if (challenge.userId === userId && challengeDate === today) {
        return challenge;
      }
    }
    return null;
  }

  // Generate a question based on difficulty level
  async generateQuestion(subject, difficulty, questionType = 'bar-exam') {
    try {
      // Use the question cache for instant questions
      const questionCache = (await import('./questionCache.js')).default;
      const question = await questionCache.getQuestion(subject, false, questionType); // Pass questionType to cache
      
      // Ensure we have a proper explanation
      const explanation = question.explanationLong || question.explanation || 
        `The correct answer is ${String.fromCharCode(65 + question.correctIndex)}. This question tests fundamental ${subject} principles.`;
      
      const generatedQuestion = {
        id: question.qid || question.id || `solo_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        stem: question.stem,
        choices: question.choices,
        correctAnswer: question.correctIndex,
        explanation: explanation,
        subject,
        difficulty,
        questionType,
        round: difficulty // Essentially the same for solo challenges
      };
      
      // Store the question for later retrieval (CRITICAL FIX)
      this.storeQuestion(generatedQuestion);
      
      return generatedQuestion;
    } catch (error) {
      console.error('Failed to generate solo challenge question:', error);
      // Fallback to basic question if generation fails
      throw new Error('No questions available for solo challenge');
    }
  }

  // Store questions for later retrieval (NEW METHOD)
  storeQuestion(question) {
    if (!this.storedQuestions) {
      this.storedQuestions = new Map();
    }
    this.storedQuestions.set(question.id, question);
    
    // Clean up old questions (keep only last 1000)
    if (this.storedQuestions.size > 1000) {
      const keys = Array.from(this.storedQuestions.keys());
      for (let i = 0; i < keys.length - 1000; i++) {
        this.storedQuestions.delete(keys[i]);
      }
    }
  }

  // Build prompts that increase in difficulty
  buildDifficultyPrompt(subject, difficulty) {
    const basePrompt = `Generate a challenging ${subject} question`;
    
    const difficultyModifiers = {
      1: "at introductory level with clear fact patterns",
      2: "at intermediate level with moderate complexity", 
      3: "at advanced level with detailed analysis required",
      4: "at expert level with multiple legal principles",
      5: "at bar exam level with sophisticated reasoning",
      6: "at appellate level with complex fact patterns",
      7: "at Supreme Court level with constitutional implications",
      8: "at law review level with cutting-edge legal theory"
    };

    const modifier = difficultyModifiers[Math.min(difficulty, 8)] || difficultyModifiers[8];
    return `${basePrompt} ${modifier}. Include nuanced answer choices that require careful legal reasoning.`;
  }

  // Submit an answer to a challenge
  async submitAnswer(challengeId, questionId, userAnswer, timeToAnswer = null) {
    // Import subtopic tracking
    const { subtopicProgressService } = await import('./subtopicProgressService.js');
    const challenge = this.activeChallenges.get(challengeId);
    if (!challenge) {
      throw new Error('Challenge not found');
    }

    // CRITICAL FIX: Use the original question that was presented to the user
    // instead of generating a new random question for validation
    let question;
    
    if (questionId) {
      // Try to get the specific question that was presented to the user
      try {
        question = await this.getQuestionById(questionId);
      } catch (error) {
        console.error(`Failed to retrieve question ${questionId}:`, error);
        throw new Error('Question not found - cannot validate answer');
      }
    } else {
      // No questionId provided, this is an error
      throw new Error('Question ID is required to validate answer');
    }
    
    const isCorrect = userAnswer === question.correctAnswer;
    
    let livesLost = 0;
    let pointsEarned = 0;
    let speedBonus = 0;
    let newDifficulty = challenge.difficulty;

    if (isCorrect) {
      // Calculate base points based on difficulty
      const basePoints = challenge.difficulty * 10 + 5;
      
      // Calculate speed bonus (scaled by difficulty - harder questions give more bonus)
      if (timeToAnswer !== null) {
        const difficultyMultiplier = 1 + (challenge.difficulty * 0.1); // 1.1x at diff 1, 2.0x at diff 10
        
        if (timeToAnswer <= 5) {
          speedBonus = Math.floor(basePoints * 0.5 * difficultyMultiplier); // 50% bonus for ≤5s
        } else if (timeToAnswer <= 10) {
          speedBonus = Math.floor(basePoints * 0.3 * difficultyMultiplier); // 30% bonus for ≤10s
        } else if (timeToAnswer <= 15) {
          speedBonus = Math.floor(basePoints * 0.15 * difficultyMultiplier); // 15% bonus for ≤15s
        } else if (timeToAnswer <= 20) {
          speedBonus = Math.floor(basePoints * 0.05 * difficultyMultiplier); // 5% bonus for ≤20s
        }
      }
      
      pointsEarned = basePoints + speedBonus;
      newDifficulty = Math.min(challenge.difficulty + 1, 10); // Cap at difficulty 10
    } else {
      // Wrong answer: lose a life
      livesLost = 1;
      challenge.livesRemaining = Math.max(0, challenge.livesRemaining - 1);
      
      // If no lives left, trigger Atticus duel automatically
      if (challenge.livesRemaining === 0) {
        // Trigger Atticus duel automatically
        try {
          const { atticusDuelService } = await import('./atticusDuelService.js');
          const atticusDuel = await atticusDuelService.startAtticusDuel(challenge.userId, challengeId);
          
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
    }

    // Update challenge
    challenge.score += pointsEarned;
    challenge.round += 1;
    challenge.difficulty = newDifficulty;

    await this.saveToFile();

    // Track subtopic progress
    try {
      const subtopicResult = await progressService.recordAttempt({
        userId: challenge.userId,
        duelId: `solo_${challengeId}`,
        questionId: question.id || `solo_${Date.now()}`,
        subject: challenge.subject,
        subtopic: question.subtopic || challenge.subject,
        difficulty: challenge.difficulty,
        correct: isCorrect,
        msToAnswer: 0, // Not tracked for solo mode
        ts: Date.now()
      });
      
      if (subtopicResult && subtopicResult.subtopic) {
        console.log(`📊 Subtopic progress updated: ${subtopicResult.subject}/${subtopicResult.subtopic} - Proficiency: ${(subtopicResult.newProficiency || 0).toFixed(1)}%`);
      }
    } catch (error) {
      console.error('Error tracking subtopic progress:', error);
    }

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

  // Get next question for continuing challenge
  async getNextQuestion(challengeId) {
    const challenge = this.activeChallenges.get(challengeId);
    if (!challenge) {
      throw new Error('Challenge not found');
    }

    if (challenge.livesRemaining === 0) {
      throw new Error('No lives remaining');
    }

    const nextQuestion = await this.generateQuestion(challenge.subject, challenge.difficulty, challenge.questionType || 'bar-exam');
    challenge.currentQuestionId = nextQuestion.id;
    
    await this.saveToFile();
    
    return nextQuestion;
  }

  // Remove payment functionality - lives are now free but limited

  // Helper to get question by ID (FIXED VERSION)
  async getQuestionById(questionId) {
    // First try to get from stored questions
    if (this.storedQuestions && this.storedQuestions.has(questionId)) {
      return this.storedQuestions.get(questionId);
    }
    
    // Fallback: try to find in active challenges
    const challenge = Array.from(this.activeChallenges.values())
      .find(c => c.currentQuestionId === questionId);
    
    if (challenge) {
      // If we can't find the stored question, this is a fallback
      // but it's not ideal since it might generate a different question
      console.warn(`Question ${questionId} not found in storage, using fallback generation`);
      const question = await this.generateQuestion(challenge.subject, challenge.difficulty, challenge.questionType || 'bar-exam');
      return {
        id: questionId,
        correctAnswer: question.correctAnswer,
        explanation: question.explanation
      };
    }
    
    throw new Error('Question not found');
  }

  // Restore lives after defeating Atticus
  async restoreLives(userId) {
    const todaysChallenge = this.getTodaysChallenge(userId);
    
    if (todaysChallenge) {
      // Restore all 3 lives
      todaysChallenge.livesRemaining = 3;
      todaysChallenge.isDailyComplete = false;
      delete todaysChallenge.lostAllLivesAt;
      
      await this.saveToFile();
      return true;
    }
    
    return false;
  }

  // Get challenge status
  getChallengeStatus(userId) {
    const todaysChallenge = this.getTodaysChallenge(userId);
    
    if (!todaysChallenge) {
      return { canPlay: true };
    }
    
    // If they have lives remaining, they can play
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

  // Helper to get difficulty name
  getDifficultyName(level) {
    if (level <= 3) return 'easy';
    if (level <= 7) return 'medium';
    return 'hard';
  }
}

export const soloChallengeService = new SoloChallengeService();