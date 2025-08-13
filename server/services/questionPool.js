// Question Pool Service - Pre-generates questions for instant serving
import { generateWithIntegrity } from './mbeGenerator.js';
import { normalizeSubject, SUBJECTS } from './subjects.js';

class QuestionPool {
  constructor() {
    this.pools = new Map(); // subject -> difficulty -> [questions]
    this.generating = new Set(); // Track what's being generated to avoid duplicates
    this.MIN_POOL_SIZE = 15; // Much larger pool for instant serving
    this.TARGET_POOL_SIZE = 25; // Keep 25 questions ready at all times
    this.fallbackQuestions = new Map(); // Fallback cache for instant serving
    
    // Initialize pools for all subjects and difficulties
    this.initializePools();
    
    // Start background generation with aggressive pre-filling
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
    
    // Immediately generate critical questions for common difficulties
    this.generateCriticalQuestions();
    
    // Initial aggressive fill - don't wait
    this.fillAllPools();
    
    // Then check every 5 seconds for ultra-fast refills
    setInterval(() => {
      this.fillAllPools();
    }, 5000);
  }
  
  async generateCriticalQuestions() {
    // Pre-generate questions for the most common subjects and difficulties
    const criticalSubjects = ['Torts', 'Con Law', 'Crim', 'Contracts', 'Evidence', 'Property', 'Civ Pro'];
    const criticalDifficulties = [1, 2, 3]; // Generate for more difficulties
    
    console.log('⚡ Pre-generating critical questions for instant serving...');
    
    const tasks = [];
    for (const subject of criticalSubjects) {
      for (const difficulty of criticalDifficulties) {
        // Generate 10 questions immediately for each critical combination
        tasks.push(
          this.generateQuestionsForPool(subject, difficulty, 10)
            .catch(err => console.error(`Critical generation failed for ${subject} D${difficulty}:`, err))
        );
      }
    }
    
    // Wait for critical questions to be ready
    await Promise.all(tasks);
    console.log('✅ Critical questions ready for instant serving');
  }
  
  async fillAllPools() {
    const subjects = Object.keys(SUBJECTS);
    const tasks = [];
    
    // Process subjects in batches to avoid overload
    for (const subject of subjects) {
      // Generate for all difficulties 1-4 to ensure coverage
      for (let difficulty = 1; difficulty <= 4; difficulty++) {
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
  
  // Fisher-Yates shuffle for answer randomization
  shuffleAnswers(question) {
    // Create a deep copy to avoid modifying the original
    const shuffled = {
      ...question,
      choices: [...question.choices]
    };
    
    // Create array of indices [0, 1, 2, 3]
    const indices = [0, 1, 2, 3];
    
    // Fisher-Yates shuffle the indices
    for (let i = indices.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [indices[i], indices[j]] = [indices[j], indices[i]];
    }
    
    // Reorder choices based on shuffled indices
    const newChoices = indices.map(i => question.choices[i]);
    
    // Find new position of correct answer
    const newCorrectIndex = indices.indexOf(question.correctIndex);
    
    shuffled.choices = newChoices;
    shuffled.correctIndex = newCorrectIndex;
    
    console.log(`🎲 Shuffled answers: correct answer moved from position ${question.correctIndex} to position ${newCorrectIndex}`);
    
    return shuffled;
  }

  // Get a question from the pool (instant, no generation)
  async getQuestion(subject, difficulty = 1, excludeIds = []) {
    const normalizedSubject = normalizeSubject(subject);
    const pool = this.pools.get(normalizedSubject)?.get(difficulty) || [];
    
    // Filter out excluded questions
    const available = pool.filter(q => !excludeIds.includes(q.qid));
    
    if (available.length === 0) {
      console.log(`⚠️ Pool empty for ${normalizedSubject} D${difficulty}, using fallback...`);
      
      // Try fallback cache first (instant)
      const fallback = await this.getFallbackQuestion(normalizedSubject, difficulty, excludeIds);
      if (fallback) {
        console.log(`✅ Using fallback question for instant serving`);
        return this.shuffleAnswers(fallback);
      }
      
      // Last resort: emergency generation (slow)
      console.log(`🔥 Emergency generation for ${normalizedSubject} D${difficulty}...`);
      const question = await this.generateSingleQuestion(normalizedSubject, difficulty);
      if (question && this.validateQuestion(question)) {
        // Cache for future use
        this.addToFallbackCache(normalizedSubject, difficulty, question);
        return this.shuffleAnswers(question);
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
    
    // Shuffle answers before returning
    return this.shuffleAnswers(question);
  }
  
  // Add to fallback cache
  addToFallbackCache(subject, difficulty, question) {
    const key = `${subject}-${difficulty}`;
    if (!this.fallbackQuestions.has(key)) {
      this.fallbackQuestions.set(key, []);
    }
    const cache = this.fallbackQuestions.get(key);
    // Keep max 10 fallback questions per subject/difficulty
    if (cache.length < 10) {
      cache.push(question);
    }
  }
  
  // Get fallback question from cache
  async getFallbackQuestion(subject, difficulty, excludeIds = []) {
    const key = `${subject}-${difficulty}`;
    const cache = this.fallbackQuestions.get(key) || [];
    
    // Try cached questions from storage as additional fallback
    try {
      const { storage } = await import('../storage.js');
      const storedQuestion = await storage.getRandomQuestion(subject, excludeIds);
      if (storedQuestion) {
        return {
          qid: `fallback_${storedQuestion.id}`,
          subject: storedQuestion.subject,
          stem: storedQuestion.stem,
          choices: storedQuestion.choices,
          correctIndex: storedQuestion.correctIndex,
          explanation: storedQuestion.explanation,
          difficulty: difficulty
        };
      }
    } catch (error) {
      console.error('Fallback storage fetch failed:', error);
    }
    
    // Use cached questions
    const available = cache.filter(q => !excludeIds.includes(q.qid));
    if (available.length > 0) {
      return available[Math.floor(Math.random() * available.length)];
    }
    
    return null;
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