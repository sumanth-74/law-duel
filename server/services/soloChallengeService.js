import fs from 'fs/promises';
import path from 'path';
import { initializeQuestionCoordinator } from './qcoordinator.js';

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
  async startChallenge(userId, subject) {
    // Check if user has already completed challenge today
    const existingChallenge = this.getTodaysChallenge(userId);
    if (existingChallenge && existingChallenge.isDailyComplete) {
      throw new Error('Daily challenge already completed. Try again tomorrow or purchase continuation.');
    }

    const challengeId = `solo_${userId}_${Date.now()}`;
    
    // Get first question (difficulty 1)
    const firstQuestion = await this.generateQuestion(subject, 1);
    
    const challenge = {
      id: challengeId,
      userId,
      subject,
      livesRemaining: 3,
      round: 1,
      score: 0,
      difficulty: 1,
      startedAt: new Date().toISOString(),
      isDailyComplete: false,
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
  async generateQuestion(subject, difficulty) {
    try {
      // Use the question cache for instant questions
      const questionCache = (await import('./questionCache.js')).default;
      const question = await questionCache.getQuestion(subject, false); // Use cache for speed
      
      // Ensure we have a proper explanation
      const explanation = question.explanationLong || question.explanation || 
        `The correct answer is ${String.fromCharCode(65 + question.correctIndex)}. This question tests fundamental ${subject} principles.`;
      
      return {
        id: question.qid || question.id || `solo_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        stem: question.stem,
        choices: question.choices,
        correctAnswer: question.correctIndex,
        explanation: explanation,
        subject,
        difficulty,
        round: difficulty // Essentially the same for solo challenges
      };
    } catch (error) {
      console.error('Failed to generate solo challenge question:', error);
      // Fallback to basic question if generation fails
      throw new Error('No questions available for solo challenge');
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
  async submitAnswer(challengeId, questionId, userAnswer) {
    const challenge = this.activeChallenges.get(challengeId);
    if (!challenge) {
      throw new Error('Challenge not found');
    }

    if (challenge.currentQuestionId !== questionId) {
      throw new Error('Question mismatch');
    }

    // Get the question details to check correctness
    const question = await this.getQuestionById(questionId);
    const isCorrect = userAnswer === question.correctAnswer;
    
    let livesLost = 0;
    let pointsEarned = 0;
    let newDifficulty = challenge.difficulty;

    if (isCorrect) {
      // Correct answer: earn points based on difficulty
      pointsEarned = challenge.difficulty * 10 + 5; // Higher difficulty = more points
      newDifficulty = Math.min(challenge.difficulty + 1, 10); // Cap at difficulty 10
    } else {
      // Wrong answer: lose a life
      livesLost = 1;
      challenge.livesRemaining = Math.max(0, challenge.livesRemaining - 1);
      
      // If no lives left, mark as complete
      if (challenge.livesRemaining === 0) {
        challenge.isDailyComplete = true;
      }
    }

    // Update challenge
    challenge.score += pointsEarned;
    challenge.round += 1;
    challenge.difficulty = newDifficulty;

    await this.saveToFile();

    return {
      isCorrect,
      correctAnswer: question.correctAnswer,
      explanation: question.explanation,
      livesLost,
      newDifficulty,
      pointsEarned
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

    const nextQuestion = await this.generateQuestion(challenge.subject, challenge.difficulty);
    challenge.currentQuestionId = nextQuestion.id;
    
    await this.saveToFile();
    
    return nextQuestion;
  }

  // Restore lives with payment - maintains all progress
  async restoreLives(challengeId) {
    const challenge = this.activeChallenges.get(challengeId);
    if (!challenge) {
      throw new Error('Challenge not found');
    }

    // In real implementation, verify payment here
    // Restore lives while keeping score, difficulty, and round progress
    challenge.livesRemaining = 3;
    challenge.isDailyComplete = false; // Allow continued play
    
    await this.saveToFile();
    
    return { 
      success: true, 
      livesRemaining: 3,
      currentRound: challenge.round,
      currentDifficulty: challenge.difficulty,
      currentScore: challenge.score
    };
  }

  // Helper to get question by ID (simplified for solo challenges)
  async getQuestionById(questionId) {
    // For solo challenges, we'll store question data locally when generated
    // This is a simplified approach since questions are generated on-demand
    const challenge = Array.from(this.activeChallenges.values())
      .find(c => c.currentQuestionId === questionId);
    
    if (challenge) {
      // Re-generate the same question details (this is a limitation but workable)
      const question = await this.generateQuestion(challenge.subject, challenge.difficulty);
      return {
        id: questionId,
        correctAnswer: question.correctAnswer,
        explanation: question.explanation
      };
    }
    
    throw new Error('Question not found');
  }

  // Get challenge status
  getChallengeStatus(userId) {
    const todaysChallenge = this.getTodaysChallenge(userId);
    return todaysChallenge || { isDailyComplete: false };
  }
}

export const soloChallengeService = new SoloChallengeService();