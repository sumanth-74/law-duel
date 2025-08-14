import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { generateFreshQuestion } from './robustGenerator.js';
import { SUBJECTS, getSubtopicsForSubject } from '../taxonomy.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const POOL_FILE = path.join(__dirname, '../../data/question-pool.json');
const SEEN_FILE = path.join(__dirname, '../../data/seen-questions.json');
const RESERVATIONS_FILE = path.join(__dirname, '../../data/question-reservations.json');

// Target pool sizes per difficulty band - matching UWorld standards
const POOL_TARGETS = {
  'low': 150,    // Difficulty 1-3
  'medium': 200,  // Difficulty 4-6
  'high': 150     // Difficulty 7-10
};

class QuestionPoolManager {
  constructor() {
    this.pool = [];
    this.seenQuestions = {};
    this.reservations = {};
    this.generating = false;
    this.quotaExhausted = false;
    this.dailyCalls = 0;
    this.lastResetTime = Date.now();
  }

  async initialize() {
    await this.loadPool();
    await this.loadSeenQuestions();
    await this.loadReservations();
    
    // Start background generation
    this.startBackgroundGeneration();
    
    console.log(`📊 Question pool initialized with ${this.pool.length} questions`);
  }

  async loadPool() {
    try {
      const data = await fs.readFile(POOL_FILE, 'utf-8');
      this.pool = JSON.parse(data);
    } catch (error) {
      this.pool = [];
      await this.savePool();
    }
  }

  async savePool() {
    await fs.writeFile(POOL_FILE, JSON.stringify(this.pool, null, 2));
  }

  async loadSeenQuestions() {
    try {
      const data = await fs.readFile(SEEN_FILE, 'utf-8');
      this.seenQuestions = JSON.parse(data);
    } catch (error) {
      this.seenQuestions = {};
      await this.saveSeenQuestions();
    }
  }

  async saveSeenQuestions() {
    await fs.writeFile(SEEN_FILE, JSON.stringify(this.seenQuestions, null, 2));
  }

  async loadReservations() {
    try {
      const data = await fs.readFile(RESERVATIONS_FILE, 'utf-8');
      this.reservations = JSON.parse(data);
    } catch (error) {
      this.reservations = {};
      await this.saveReservations();
    }
  }

  async saveReservations() {
    await fs.writeFile(RESERVATIONS_FILE, JSON.stringify(this.reservations, null, 2));
  }

  getChecksum(question) {
    const content = `${question.stem}${JSON.stringify(question.choices)}${question.correctIndex}`;
    return crypto.createHash('sha256').update(content).digest('hex');
  }

  getDifficultyBand(difficulty) {
    if (difficulty <= 3) return 'low';
    if (difficulty <= 6) return 'medium';
    return 'high';
  }

  async checkPoolHealth() {
    const stats = {};
    
    // Get all valid subjects from taxonomy
    const subjects = Object.keys(SUBJECTS);
    
    for (const subject of subjects) {
      stats[subject] = {
        low: 0,
        medium: 0,
        high: 0
      };
    }

    // Count questions by subject and difficulty band
    for (const question of this.pool) {
      if (stats[question.subject]) {
        const band = this.getDifficultyBand(question.difficulty || 5);
        stats[question.subject][band]++;
      }
    }

    // Find buckets that need topping up
    const needsGeneration = [];
    
    for (const subject of subjects) {
      for (const band of ['low', 'medium', 'high']) {
        const current = stats[subject][band];
        const target = POOL_TARGETS[band];
        
        if (current < target * 0.7) { // Below 70% of target
          needsGeneration.push({
            subject,
            band,
            current,
            target,
            needed: target - current
          });
        }
      }
    }

    return { stats, needsGeneration };
  }

  async generateBatch(subject, difficultyBand, count = 20) {
    // Never skip generation - user has their own API key
    this.quotaExhausted = false;

    const difficultyRanges = {
      'low': [1, 3],
      'medium': [4, 6],
      'high': [7, 9]
    };

    const [minDiff, maxDiff] = difficultyRanges[difficultyBand];
    const subtopics = getSubtopicsForSubject(subject) || [];
    
    console.log(`🔄 Generating ${count} ${subject} questions (difficulty ${minDiff}-${maxDiff})`);

    let generated = 0;
    const batchSize = 5; // Generate 5 at a time to avoid overwhelming
    
    for (let i = 0; i < count; i += batchSize) {
      const remaining = Math.min(batchSize, count - i);
      
      for (let j = 0; j < remaining; j++) {
        try {
          // Pick a random subtopic if available
          const subtopic = subtopics.length > 0 
            ? subtopics[Math.floor(Math.random() * subtopics.length)]
            : null;
          
          // Generate difficulty within band
          const difficulty = minDiff + Math.floor(Math.random() * (maxDiff - minDiff + 1));
          
          const topicConfig = {
            subject,
            topic: subtopic?.topic || subject,
            subtopic: subtopic?.subtopic,
            difficulty
          };

          const item = await generateFreshQuestion(subject, difficulty);
          
          if (item && item.stem && item.choices && item.choices.length === 4) {
            const question = {
              id: `pool_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
              subject: item.subject || subject,
              topic: item.topic || topicConfig.topic,
              subtopic: item.subtopic || topicConfig.subtopic,
              difficulty,
              stem: item.stem,
              choices: item.choices,
              correctIndex: item.correctIndex,
              explanation: item.explanation,
              checksum: this.getChecksum(item),
              createdAt: Date.now(),
              usedCount: 0
            };

            // Check for duplicates
            const isDuplicate = this.pool.some(q => q.checksum === question.checksum);
            
            if (!isDuplicate) {
              this.pool.push(question);
              generated++;
            }
          }
          
          this.dailyCalls++;
          
          // Pause between requests to avoid rate limiting
          await new Promise(resolve => setTimeout(resolve, 500));
          
        } catch (error) {
          if (error.message === 'QUOTA_EXCEEDED') {
            this.quotaExhausted = true;
            console.log('📛 OpenAI quota exceeded, pausing generation');
            break;
          }
          console.error(`Failed to generate question: ${error.message}`);
        }
      }
      
      if (this.quotaExhausted) break;
    }

    if (generated > 0) {
      await this.savePool();
      console.log(`✅ Generated ${generated} new ${subject} questions`);
    }

    return generated;
  }

  async startBackgroundGeneration() {
    if (this.generating) return;
    
    this.generating = true;
    
    // Run every 2 minutes
    setInterval(async () => {
      // Reset quota tracking at midnight UTC
      const now = new Date();
      if (now.getUTCHours() === 0 && now.getUTCMinutes() < 2) {
        this.quotaExhausted = false;
        this.dailyCalls = 0;
        this.lastResetTime = Date.now();
        console.log('🔄 Daily quota reset, resuming generation');
      }

      // Never pause generation - user has their own API key
      // Remove artificial quota limits

      const { needsGeneration } = await this.checkPoolHealth();
      
      if (needsGeneration.length > 0 && !this.quotaExhausted) {
        // Prioritize the most depleted bucket
        const priority = needsGeneration.sort((a, b) => 
          (a.current / a.target) - (b.current / b.target)
        )[0];
        
        console.log(`📊 Pool health check: ${priority.subject}/${priority.band} at ${priority.current}/${priority.target}`);
        
        await this.generateBatch(priority.subject, priority.band, Math.min(20, priority.needed));
      }
    }, 2 * 60 * 1000); // Every 2 minutes
    
    // Do an initial check
    const { needsGeneration } = await this.checkPoolHealth();
    if (needsGeneration.length > 0 && !this.quotaExhausted) {
      const priority = needsGeneration[0];
      await this.generateBatch(priority.subject, priority.band, Math.min(10, priority.needed));
    }
  }

  async reserveQuestions(userId, duelId, subject, count = 5, weaknessTargets = null) {
    const reserved = [];
    const userSeen = this.seenQuestions[userId] || [];
    const now = Date.now();
    const thirtyDaysAgo = now - (30 * 24 * 60 * 60 * 1000);
    const fourteenDaysAgo = now - (14 * 24 * 60 * 60 * 1000);
    const sevenDaysAgo = now - (7 * 24 * 60 * 60 * 1000);

    // Filter pool by subject
    let availableQuestions = this.pool.filter(q => 
      q.subject === subject || subject === 'Mixed Questions'
    );

    // Try different freshness windows
    let freshQuestions = availableQuestions.filter(q => {
      const seenEntry = userSeen.find(s => s.questionId === q.id);
      return !seenEntry || seenEntry.seenAt < thirtyDaysAgo;
    });

    if (freshQuestions.length < count) {
      // Relax to 14 days
      freshQuestions = availableQuestions.filter(q => {
        const seenEntry = userSeen.find(s => s.questionId === q.id);
        return !seenEntry || seenEntry.seenAt < fourteenDaysAgo;
      });
    }

    if (freshQuestions.length < count) {
      // Relax to 7 days
      freshQuestions = availableQuestions.filter(q => {
        const seenEntry = userSeen.find(s => s.questionId === q.id);
        return !seenEntry || seenEntry.seenAt < sevenDaysAgo;
      });
    }

    if (freshQuestions.length < count) {
      // Use any available questions
      freshQuestions = availableQuestions;
    }

    // Apply weakness targeting if provided
    if (weaknessTargets && weaknessTargets.length > 0) {
      const weaknessQuestions = [];
      const regularQuestions = [];

      for (const question of freshQuestions) {
        const isWeakness = weaknessTargets.some(target => 
          question.subtopic === target.subtopic || 
          question.topic === target.topic
        );
        
        if (isWeakness) {
          weaknessQuestions.push(question);
        } else {
          regularQuestions.push(question);
        }
      }

      // Take at least 3 weakness questions if available
      const weaknessCount = Math.min(3, weaknessQuestions.length);
      reserved.push(...this.selectRandom(weaknessQuestions, weaknessCount));
      
      // Fill the rest with regular questions
      const regularCount = count - reserved.length;
      reserved.push(...this.selectRandom(regularQuestions, regularCount));
    } else {
      // No weakness targeting, just select randomly
      reserved.push(...this.selectRandom(freshQuestions, count));
    }

    // Fill with any questions if we don't have enough
    if (reserved.length < count) {
      const remaining = count - reserved.length;
      const fallbackQuestions = availableQuestions.filter(q => 
        !reserved.find(r => r.id === q.id)
      );
      reserved.push(...this.selectRandom(fallbackQuestions, remaining));
    }

    // Store reservation
    this.reservations[duelId] = {
      questionIds: reserved.map(q => q.id),
      reservedAt: now
    };
    await this.saveReservations();

    return reserved;
  }

  selectRandom(array, count) {
    const shuffled = [...array].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, count);
  }

  async markQuestionsSeen(userId, questionIds) {
    if (!this.seenQuestions[userId]) {
      this.seenQuestions[userId] = [];
    }

    const now = Date.now();
    
    for (const questionId of questionIds) {
      // Update or add seen entry
      const existingIndex = this.seenQuestions[userId].findIndex(s => s.questionId === questionId);
      
      if (existingIndex >= 0) {
        this.seenQuestions[userId][existingIndex].seenAt = now;
      } else {
        this.seenQuestions[userId].push({
          questionId,
          seenAt: now
        });
      }

      // Increment used count
      const question = this.pool.find(q => q.id === questionId);
      if (question) {
        question.usedCount++;
      }
    }

    await this.saveSeenQuestions();
    await this.savePool();
  }

  getPoolStats() {
    const stats = {
      total: this.pool.length,
      bySubject: {},
      byDifficulty: {},
      quotaStatus: {
        exhausted: this.quotaExhausted,
        dailyCalls: this.dailyCalls,
        resetTime: this.getQuotaResetTime()
      }
    };

    for (const question of this.pool) {
      // By subject
      if (!stats.bySubject[question.subject]) {
        stats.bySubject[question.subject] = 0;
      }
      stats.bySubject[question.subject]++;

      // By difficulty band
      const band = this.getDifficultyBand(question.difficulty || 5);
      if (!stats.byDifficulty[band]) {
        stats.byDifficulty[band] = 0;
      }
      stats.byDifficulty[band]++;
    }

    return stats;
  }

  getQuotaResetTime() {
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
    tomorrow.setUTCHours(0, 0, 0, 0);
    return tomorrow.toISOString();
  }

  async pruneOldQuestions(daysToKeep = 60) {
    const cutoffTime = Date.now() - (daysToKeep * 24 * 60 * 60 * 1000);
    
    const before = this.pool.length;
    this.pool = this.pool.filter(q => q.createdAt > cutoffTime);
    const after = this.pool.length;
    
    if (before !== after) {
      await this.savePool();
      console.log(`🗑️ Pruned ${before - after} old questions`);
    }
  }
}

// Singleton instance
let poolManager = null;

export async function getPoolManager() {
  if (!poolManager) {
    poolManager = new QuestionPoolManager();
    await poolManager.initialize();
  }
  return poolManager;
}

export default QuestionPoolManager;