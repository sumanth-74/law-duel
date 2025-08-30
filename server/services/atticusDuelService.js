import { storage } from '../storage.js';
import fs from 'fs/promises';

class AtticusDuelService {
  constructor() {
    this.activeDuels = new Map();
    this.duelHistory = new Map();
    this.dataFile = './data/atticus-duels.json';
    this.initializeData();
  }
  
  async initializeData() {
    await this.ensureDataFile();
    await this.loadFromFile();
  }

  // Start an Atticus duel when user runs out of lives
  async startAtticusDuel(userId, challengeId) {
    const user = await storage.getUser(userId);
    if (!user) {
      throw new Error('User not found');
    }

    // Check if user is already in a duel
    if (this.activeDuels.has(userId)) {
      throw new Error('User is already in an Atticus duel');
    }

    // Check if user has a cooldown from previous loss
    const lastDuel = this.duelHistory.get(userId);
    if (lastDuel && lastDuel.result === 'loss' && !lastDuel.revived) {
      const hoursSinceLoss = (Date.now() - new Date(lastDuel.timestamp).getTime()) / (1000 * 60 * 60);
      if (hoursSinceLoss < 3) {
        // TEMPORARILY DISABLED FOR TESTING - Remove this comment when done testing
        console.log('⚠️ Cooldown check temporarily disabled for testing');
        // const hoursRemaining = Math.ceil(3 - hoursSinceLoss);
        // throw new Error(`You must wait ${hoursRemaining} hour${hoursRemaining > 1 ? 's' : ''} before challenging Atticus again`);
      }
    }

    // Create the duel
    const duelId = `atticus_${userId}_${Date.now()}`;
    const duel = {
      id: duelId,
      userId,
      challengeId,
      startedAt: new Date(),
      status: 'active',
      round: 1,
      playerScore: 0,
      atticusScore: 0,
      questions: [],
      currentQuestion: null
    };

    this.activeDuels.set(userId, duel);

    // Generate first question
    const question = await this.generateAtticusQuestion();
    duel.currentQuestion = question;
    duel.questions.push(question);
    
    // Save to file for persistence
    await this.saveToFile();

    return {
      duel,
      question
    };
  }

  // Generate a challenging question for Atticus duel
  async generateAtticusQuestion() {
    // Import the question generation service
    const { generateFreshQuestion } = await import('./robustGenerator.js');
    
    // Use a random subject for variety
    const subjects = ['Civil Procedure', 'Constitutional Law', 'Contracts', 'Criminal Law', 'Evidence', 'Property', 'Torts'];
    const subject = subjects[Math.floor(Math.random() * subjects.length)];
    
    // Generate a unique question ID to ensure variety
    const question = await generateFreshQuestion(subject);
    
    // Add timestamp to ensure uniqueness
    const uniqueId = `${question.qid}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    return {
      id: uniqueId,
      stem: question.stem,
      choices: question.choices,
      correctAnswer: question.correctIndex,
      explanation: question.explanationLong || question.explanation,
      subject,
      difficulty: 'expert' // Atticus uses expert-level questions
    };
  }

  // Submit answer to Atticus duel
  async submitAtticusAnswer(userId, answer, timeToAnswer) {
    const duel = this.activeDuels.get(userId);
    if (!duel || duel.status !== 'active') {
      throw new Error('No active Atticus duel found');
    }

    const currentQuestion = duel.currentQuestion;
    if (!currentQuestion) {
      throw new Error('No current question in duel');
    }

    const isCorrect = answer === currentQuestion.correctAnswer;
    
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
      
      duel.playerScore += points;
    }

    // Move to next round or end duel
    duel.round += 1;
    console.log(`🔍 Debug: Round ${duel.round}, Player Score: ${duel.playerScore}`);
    
    if (duel.round > 5) { // 5 questions total
      console.log('🔍 Debug: Duel ended, calling endAtticusDuel');
      // End the duel and return the result directly
      const duelResult = await this.endAtticusDuel(userId);
      return {
        isCorrect,
        correctAnswer: currentQuestion.correctAnswer,
        explanation: currentQuestion.explanation,
        points,
        round: duel.round,
        duelEnded: true,
        playerScore: duel.playerScore,
        playerWon: duelResult.result === 'win',
        message: duelResult.message,
        atticusScore: duelResult.atticusScore,
        nextQuestion: null // No next question when duel ends
      };
    } else {
      // Generate next question
      console.log('🔍 Debug: Generating next question for round', duel.round);
      const nextQuestion = await this.generateAtticusQuestion();
      console.log('🔍 Debug: New question generated:', nextQuestion.id, nextQuestion.stem.substring(0, 50) + '...');
      duel.currentQuestion = nextQuestion;
      duel.questions.push(nextQuestion);
      console.log('🔍 Debug: Duel updated with new question, total questions:', duel.questions.length);
    }

    const response = {
      isCorrect,
      correctAnswer: currentQuestion.correctAnswer,
      explanation: currentQuestion.explanation,
      points,
      round: duel.round,
      duelEnded: false,
      playerScore: duel.playerScore, // Add current player score
      nextQuestion: duel.currentQuestion // Add next question for next round
    };
    
    console.log('🔍 Debug: API Response:', {
      round: response.round,
      duelEnded: response.duelEnded,
      playerScore: response.playerScore,
      hasNextQuestion: !!response.nextQuestion,
      nextQuestionId: response.nextQuestion?.id
    });
    
    return response;
  }

  // End the Atticus duel and determine winner
  async endAtticusDuel(userId) {
    const duel = this.activeDuels.get(userId);
    if (!duel) {
      throw new Error('No active Atticus duel found');
    }

    // Calculate Atticus's score (AI opponent)
    // Atticus wins ~2/3 of the time by design, but not if player gets all questions right
    let atticusScore;
    if (duel.playerScore >= 250) { // If player gets most questions right
      atticusScore = Math.floor(Math.random() * 100) + 150; // Lower score: 150-250
    } else {
      atticusScore = Math.floor(Math.random() * 200) + 200; // Higher score: 200-400
    }
    
    duel.atticusScore = atticusScore;
    duel.status = 'completed';

    const playerWon = duel.playerScore > atticusScore;
    
    // Record duel result
    this.duelHistory.set(userId, {
      result: playerWon ? 'win' : 'loss',
      timestamp: new Date(),
      playerScore: duel.playerScore,
      atticusScore: atticusScore,
      revived: false
    });

    // Remove from active duels
    this.activeDuels.delete(userId);
    
    // Save to file for persistence
    await this.saveToFile();

    if (playerWon) {
      // Player wins - restore lives in solo challenge
      const { soloChallengeService } = await import('./soloChallengeService.js');
      await soloChallengeService.restoreLives(userId);
      
      return {
        result: 'win',
        message: 'Victory! Your lives have been restored.',
        playerScore: duel.playerScore,
        atticusScore: atticusScore,
        livesRestored: 3
      };
    } else {
      // Player loses - they can revive for $1 or wait 3 hours
      return {
        result: 'loss',
        message: 'Defeat! You can revive for $1 or wait 3 hours.',
        playerScore: duel.playerScore,
        atticusScore: atticusScore,
        canRevive: true,
        cooldownHours: 3
      };
    }
  }

  // Revive after losing to Atticus (requires Stripe payment)
  async reviveFromDefeat(userId, paymentIntentId) {
    // In a real implementation, this would verify the Stripe payment
    // For now, we'll simulate a successful payment
    
    const lastDuel = this.duelHistory.get(userId);
    if (!lastDuel || lastDuel.result !== 'loss') {
      throw new Error('No recent defeat to revive from');
    }

    if (lastDuel.revived) {
      throw new Error('Already revived from this defeat');
    }

    // Mark as revived
    lastDuel.revived = true;
    lastDuel.revivedAt = new Date();
    lastDuel.paymentIntentId = paymentIntentId;

    // Restore lives
    const { soloChallengeService } = await import('./soloChallengeService.js');
    await soloChallengeService.restoreLives(userId);
    
    // Save to file for persistence
    await this.saveToFile();

    return {
      success: true,
      message: 'Revived! Your lives have been restored.',
      livesRestored: 3
    };
  }

  // Get current duel status
  getDuelStatus(userId) {
    const activeDuel = this.activeDuels.get(userId);
    const lastDuel = this.duelHistory.get(userId);
    
    if (activeDuel) {
      return {
        inDuel: true,
        duel: activeDuel
      };
    }
    
    if (lastDuel && lastDuel.result === 'loss' && !lastDuel.revived) {
      const timeSinceLoss = Date.now() - new Date(lastDuel.timestamp).getTime();
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
        
        return {
          inDuel: false,
          canChallenge: false,
          cooldownHours: hoursRemaining,
          cooldownMinutes: minutesRemaining,
          message: `You must wait ${hoursRemaining} hour${hoursRemaining > 1 ? 's' : ''} and ${minutesRemaining} minute${minutesRemaining > 1 ? 's' : ''} before lives are restored`
        };
      } else {
        // Cooldown finished - auto-restore lives
        this.autoRestoreLives(userId);
        return {
          inDuel: false,
          canChallenge: true,
          message: 'Lives automatically restored! You can play again.'
        };
      }
    }
    
    return {
      inDuel: false,
      canChallenge: true
    };
  }
  
  // Auto-restore lives after 3 hours
  async autoRestoreLives(userId) {
    try {
      const { soloChallengeService } = await import('./soloChallengeService.js');
      await soloChallengeService.restoreLives(userId);
      
      // Mark as revived to prevent duplicate restores
      const lastDuel = this.duelHistory.get(userId);
      if (lastDuel) {
        lastDuel.revived = true;
        lastDuel.autoRestoredAt = new Date();
      }
      
      // Save to file for persistence
      await this.saveToFile();
      
      console.log(`🔄 Auto-restored lives for user ${userId} after 3-hour cooldown`);
    } catch (error) {
      console.error('Failed to auto-restore lives:', error);
    }
  }

  // Get duel history for a user
  getUserDuelHistory(userId) {
    const history = this.duelHistory.get(userId);
    return history ? [history] : [];
  }

  // TEMPORARY: Clear duel history for testing
  clearDuelHistory(userId) {
    this.duelHistory.delete(userId);
    this.saveToFile(); // Save changes to file
    console.log(`🧹 Cleared duel history for user ${userId}`);
  }
  
  // File storage methods for persistence
  async ensureDataFile() {
    try {
      await fs.access(this.dataFile);
    } catch (error) {
      // File doesn't exist, create it with empty data
      await this.saveToFile();
    }
  }
  
  async saveToFile() {
    try {
      const data = {
        activeDuels: Array.from(this.activeDuels.entries()),
        duelHistory: Array.from(this.duelHistory.entries()),
        lastUpdated: new Date().toISOString()
      };
      
      await fs.writeFile(this.dataFile, JSON.stringify(data, null, 2));
      console.log(`💾 Atticus duel data saved to ${this.dataFile}`);
    } catch (error) {
      console.error('Failed to save Atticus duel data:', error);
    }
  }
  
  async loadFromFile() {
    try {
      const data = await fs.readFile(this.dataFile, 'utf8');
      const parsed = JSON.parse(data);
      
      // Restore active duels and history from file
      this.activeDuels = new Map(parsed.activeDuels || []);
      this.duelHistory = new Map(parsed.duelHistory || []);
      
      console.log(`📂 Loaded Atticus duel data: ${this.activeDuels.size} active duels, ${this.duelHistory.size} history entries`);
    } catch (error) {
      console.error('Failed to load Atticus duel data:', error);
      // If loading fails, start with empty data
      this.activeDuels = new Map();
      this.duelHistory = new Map();
    }
  }
}

export const atticusDuelService = new AtticusDuelService();

// Initialize the service when imported
atticusDuelService.initializeData().catch(error => {
  console.error('Failed to initialize Atticus duel service:', error);
});
