// Question Pre-generation Cache Service
// Pre-generates and caches questions to eliminate wait times

import { generateFreshQuestion } from './robustGenerator.js';
import { SUBJECTS } from './subjects.js';
import fs from 'fs/promises';
import path from 'path';

class QuestionCacheService {
  constructor() {
    this.cache = new Map(); // subject -> array of pre-generated questions
    this.cacheSize = 10; // Keep 10 questions per subject ready
    this.cacheFile = path.join(process.cwd(), 'data', 'question-cache.json');
    this.isGenerating = new Set(); // Track which subjects are currently generating
    this.init();
  }

  async init() {
    await this.loadCache();
    // Start pre-generating questions for all subjects
    this.startBackgroundGeneration();
    console.log('📚 Question cache service initialized');
  }

  async loadCache() {
    try {
      const data = await fs.readFile(this.cacheFile, 'utf-8');
      const parsed = JSON.parse(data);
      
      // Convert arrays back to Map
      for (const [subject, questions] of Object.entries(parsed)) {
        this.cache.set(subject, questions);
      }
      
      console.log(`✅ Loaded ${this.getTotalCacheSize()} cached questions`);
    } catch (error) {
      // No cache file yet, start fresh
      console.log('🔄 Starting with empty question cache');
      Object.keys(SUBJECTS).forEach(subject => {
        this.cache.set(subject, []);
      });
    }
  }

  async saveCache() {
    try {
      // Convert Map to object for JSON serialization
      const cacheObj = {};
      for (const [subject, questions] of this.cache.entries()) {
        cacheObj[subject] = questions;
      }
      
      await fs.writeFile(this.cacheFile, JSON.stringify(cacheObj, null, 2));
    } catch (error) {
      console.error('Failed to save question cache:', error);
    }
  }

  getTotalCacheSize() {
    let total = 0;
    for (const questions of this.cache.values()) {
      total += questions.length;
    }
    return total;
  }

  // Get a question from cache or generate if empty
  async getQuestion(subject, forceNew = false, questionType = 'bar-exam') {
    // If forcing new, generate directly without using cache
    if (forceNew) {
      console.log(`🔥 Force generating new question for ${subject} (${questionType})`);
      const question = await this.generateQuestionWithRetry(subject, questionType);
      // Don't add forced questions to cache to maintain freshness
      return question;
    }

    // Use different cache keys for different question types
    const cacheKey = `${subject}_${questionType}`;
    
    // Initialize cache for subject/type if needed
    if (!this.cache.has(cacheKey)) {
      this.cache.set(cacheKey, []);
    }

    const cachedQuestions = this.cache.get(cacheKey);
    
    // If we have cached questions, use one
    if (cachedQuestions.length > 0) {
      const question = cachedQuestions.shift();
      console.log(`⚡ Using cached question for ${subject} (${questionType}) - ${cachedQuestions.length} remaining`);
      
      // Trigger background refill if getting low
      if (cachedQuestions.length < 3) {
        this.refillCache(subject, questionType);
      }
      
      await this.saveCache();
      return question;
    }

    // No cached questions, generate one immediately
    console.log(`⏰ Cache empty for ${subject} (${questionType}), generating question...`);
    const question = await this.generateQuestionWithRetry(subject, questionType);
    
    // Start refilling cache in background
    this.refillCache(subject, questionType);
    
    return question;
  }

  // Generate a question with retry logic and better explanations
  async generateQuestionWithRetry(subject, questionType = 'bar-exam', maxRetries = 3) {
    for (let i = 0; i < maxRetries; i++) {
      try {
        const question = await generateFreshQuestion(subject, questionType);
        
        // Ensure explanations are complete and accurate
        if (!question.explanation || question.explanation.length < 50) {
          console.log(`⚠️ Generated question has insufficient explanation, retrying...`);
          continue;
        }
        
        // Add timestamp and type for cache management
        question.generatedAt = Date.now();
        question.questionType = questionType;
        
        return question;
      } catch (error) {
        console.error(`Failed to generate question (attempt ${i + 1}):`, error);
        if (i === maxRetries - 1) throw error;
      }
    }
  }

  // Refill cache for a specific subject in the background
  async refillCache(subject, questionType = 'bar-exam') {
    const cacheKey = `${subject}_${questionType}`;
    
    // Prevent duplicate generation tasks
    if (this.isGenerating.has(cacheKey)) {
      return;
    }

    this.isGenerating.add(cacheKey);
    
    setTimeout(async () => {
      try {
        const cachedQuestions = this.cache.get(cacheKey) || [];
        const needed = this.cacheSize - cachedQuestions.length;
        
        if (needed > 0) {
          console.log(`🔄 Refilling cache for ${subject} (${questionType}) - generating ${needed} questions...`);
          
          // Generate questions in parallel for speed
          const promises = [];
          for (let i = 0; i < Math.min(needed, 3); i++) { // Max 3 parallel to avoid rate limits
            promises.push(this.generateQuestionWithRetry(subject, questionType));
          }
          
          const newQuestions = await Promise.all(promises);
          cachedQuestions.push(...newQuestions);
          this.cache.set(cacheKey, cachedQuestions);
          
          await this.saveCache();
          console.log(`✅ Cache refilled for ${subject} (${questionType}) - now has ${cachedQuestions.length} questions`);
        }
      } catch (error) {
        console.error(`Failed to refill cache for ${subject} (${questionType}):`, error);
      } finally {
        this.isGenerating.delete(cacheKey);
      }
    }, 100); // Small delay to avoid blocking
  }

  // Background generation to keep cache full
  startBackgroundGeneration() {
    // Initial fill for all subjects
    Object.keys(SUBJECTS).forEach(subject => {
      const cachedQuestions = this.cache.get(subject) || [];
      if (cachedQuestions.length < this.cacheSize) {
        this.refillCache(subject);
      }
    });

    // Periodic check every 5 minutes
    setInterval(() => {
      console.log(`📊 Cache status: ${this.getTotalCacheSize()} total questions cached`);
      
      Object.keys(SUBJECTS).forEach(subject => {
        const cachedQuestions = this.cache.get(subject) || [];
        if (cachedQuestions.length < this.cacheSize / 2) {
          this.refillCache(subject);
        }
      });
    }, 5 * 60 * 1000);
  }

  // Clear old questions periodically (questions older than 24 hours)
  async clearOldQuestions() {
    const oneDayAgo = Date.now() - (24 * 60 * 60 * 1000);
    let removed = 0;

    for (const [subject, questions] of this.cache.entries()) {
      const fresh = questions.filter(q => {
        if (!q.generatedAt || q.generatedAt < oneDayAgo) {
          removed++;
          return false;
        }
        return true;
      });
      this.cache.set(subject, fresh);
    }

    if (removed > 0) {
      console.log(`🧹 Cleared ${removed} old questions from cache`);
      await this.saveCache();
    }
  }
}

// Export singleton instance
const questionCache = new QuestionCacheService();
export default questionCache;