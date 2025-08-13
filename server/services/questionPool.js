// Question Pool Service - Pre-generates questions for instant serving
import { generateWithIntegrity } from './mbeGenerator.js';
import { normalizeSubject, SUBJECTS } from './subjects.js';

class QuestionPool {
  constructor() {
    this.pools = new Map(); // subject -> difficulty -> [questions]
    this.generating = new Set(); // Track what's being generated to avoid duplicates
    this.MIN_POOL_SIZE = 2; // Minimum questions per difficulty level
    this.TARGET_POOL_SIZE = 5; // Target pool size - reduced for efficiency
    
    // Initialize pools for all subjects and difficulties
    this.initializePools();
    
    // Start background generation
    this.startBackgroundGeneration();
  }
  
  initializePools() {
    const subjects = Object.keys(SUBJECTS);
    for (const subject of subjects) {
      this.pools.set(subject, new Map());
      for (let difficulty = 1; difficulty <= 4; difficulty++) {
        this.pools.get(subject).set(difficulty, []);
      }
    }
  }
  
  async startBackgroundGeneration() {
    console.log('🚀 Starting question pool background generation...');
    
    // Initial aggressive fill
    await this.fillAllPools();
    
    // Then check every 30 seconds
    setInterval(() => {
      this.fillAllPools();
    }, 30000);
  }
  
  async fillAllPools() {
    const subjects = Object.keys(SUBJECTS);
    const tasks = [];
    
    // Process subjects in batches to avoid overload
    for (const subject of subjects) {
      // Only generate for difficulty 1 and 2 initially (most common)
      for (let difficulty = 1; difficulty <= 2; difficulty++) {
        const pool = this.pools.get(subject).get(difficulty);
        const needed = this.TARGET_POOL_SIZE - pool.length;
        
        if (needed > 0) {
          // Add a small delay between subjects to avoid rate limits
          await new Promise(resolve => setTimeout(resolve, 100));
          
          // Generate in background without blocking
          tasks.push(
            this.generateQuestionsForPool(subject, difficulty, Math.min(needed, 3))
              .catch(err => {
                console.error(`Failed to generate for ${subject} D${difficulty}:`, err);
              })
          );
          
          // Limit concurrent generation to avoid overwhelming the API
          if (tasks.length >= 3) {
            await Promise.race(tasks);
          }
        }
      }
    }
    
    // Generate higher difficulties on demand later
    setTimeout(() => {
      this.fillHigherDifficulties();
    }, 30000); // After 30 seconds
  }
  
  async fillHigherDifficulties() {
    const subjects = Object.keys(SUBJECTS);
    
    for (const subject of subjects) {
      for (let difficulty = 3; difficulty <= 4; difficulty++) {
        const pool = this.pools.get(subject).get(difficulty);
        const needed = Math.min(2, this.TARGET_POOL_SIZE - pool.length);
        
        if (needed > 0) {
          await new Promise(resolve => setTimeout(resolve, 2000));
          this.generateQuestionsForPool(subject, difficulty, needed).catch(err => {
            console.error(`Failed to generate higher difficulty:`, err);
          });
        }
      }
    }
  }
  
  async generateQuestionsForPool(subject, difficulty, count) {
    const key = `${subject}-${difficulty}`;
    
    // Avoid duplicate generation
    if (this.generating.has(key)) {
      return;
    }
    
    this.generating.add(key);
    console.log(`📝 Generating ${count} questions for ${subject} D${difficulty}...`);
    
    try {
      const questions = [];
      
      // Generate sequentially with small delays to avoid rate limits
      for (let i = 0; i < count; i++) {
        if (i > 0) {
          await new Promise(resolve => setTimeout(resolve, 500)); // Small delay between requests
        }
        
        const question = await this.generateSingleQuestion(subject, difficulty);
        if (question && this.validateQuestion(question)) {
          questions.push(question);
        }
      }
      
      const pool = this.pools.get(subject).get(difficulty);
      pool.push(...questions);
      
      console.log(`✅ Added ${questions.length} questions to ${subject} D${difficulty} pool (total: ${pool.length})`);
    } catch (error) {
      console.error(`Pool generation failed for ${subject} D${difficulty}:`, error);
    } finally {
      this.generating.delete(key);
    }
  }
  
  async generateSingleQuestion(subject, difficulty) {
    try {
      const normalizedSubject = normalizeSubject(subject);
      
      // Map difficulty 1-4 to OpenAI's 1-10 scale
      const openAIDifficulty = Math.min(difficulty * 2.5, 10);
      
      const mbeItem = await generateWithIntegrity({ 
        subject: normalizedSubject,
        difficulty: openAIDifficulty
      });
      
      if (!mbeItem) return null;
      
      return {
        qid: `pool_${Date.now()}_${Math.random().toString(36).substr(2, 8)}`,
        subject: normalizedSubject,
        stem: mbeItem.stem,
        choices: mbeItem.choices,
        correctIndex: mbeItem.correctIndex,
        explanation: mbeItem.explanation,
        difficulty: difficulty
      };
    } catch (error) {
      console.error(`Failed to generate question for ${subject}:`, error.message);
      return null;
    }
  }
  
  validateQuestion(question) {
    return !!(
      question &&
      question.stem &&
      question.choices &&
      Array.isArray(question.choices) &&
      question.choices.length === 4 &&
      typeof question.correctIndex === 'number' &&
      question.correctIndex >= 0 &&
      question.correctIndex < 4
    );
  }
  
  // Get a question from the pool (instant, no generation)
  async getQuestion(subject, difficulty = 1, excludeIds = []) {
    const normalizedSubject = normalizeSubject(subject);
    const pool = this.pools.get(normalizedSubject)?.get(difficulty) || [];
    
    // Filter out excluded questions
    const available = pool.filter(q => !excludeIds.includes(q.qid));
    
    if (available.length === 0) {
      console.log(`⚠️ Pool empty for ${normalizedSubject} D${difficulty}, generating emergency question...`);
      // Emergency generation if pool is empty
      const question = await this.generateSingleQuestion(normalizedSubject, difficulty);
      if (question && this.validateQuestion(question)) {
        return question;
      }
      throw new Error(`Cannot generate question for ${normalizedSubject} difficulty ${difficulty}`);
    }
    
    // Take a random question from the pool
    const index = Math.floor(Math.random() * available.length);
    const question = available[index];
    
    // Remove from pool
    const poolIndex = pool.indexOf(question);
    if (poolIndex > -1) {
      pool.splice(poolIndex, 1);
    }
    
    console.log(`🎯 Served instant question from pool: ${normalizedSubject} D${difficulty} (${pool.length} remaining)`);
    
    // Trigger background refill if pool is getting low
    if (pool.length < this.MIN_POOL_SIZE) {
      const needed = this.TARGET_POOL_SIZE - pool.length;
      this.generateQuestionsForPool(normalizedSubject, difficulty, needed).catch(err => {
        console.error(`Background generation failed:`, err);
      });
    }
    
    return question;
  }
  
  // Get pool status for monitoring
  getPoolStatus() {
    const status = {};
    for (const [subject, difficulties] of this.pools) {
      status[subject] = {};
      for (const [difficulty, pool] of difficulties) {
        status[subject][`D${difficulty}`] = pool.length;
      }
    }
    return status;
  }
}

// Singleton instance
let poolInstance = null;

export function getQuestionPool() {
  if (!poolInstance) {
    poolInstance = new QuestionPool();
  }
  return poolInstance;
}

export async function getPooledQuestion(subject, difficulty, excludeIds = []) {
  const pool = getQuestionPool();
  return pool.getQuestion(subject, difficulty, excludeIds);
}

export function getPoolStatus() {
  const pool = getQuestionPool();
  return pool.getPoolStatus();
}

// Initialize on import
getQuestionPool();