import fs from 'fs/promises';
import { storage } from '../storage.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function loadCachedQuestionsToDatabase() {
  try {
    // Load the cached questions
    const cacheFile = path.join(__dirname, '../../data/question-cache.json');
    const data = await fs.readFile(cacheFile, 'utf-8');
    const cachedQuestions = JSON.parse(data);
    
    let totalLoaded = 0;
    
    // Process each subject
    for (const [subject, questions] of Object.entries(cachedQuestions)) {
      console.log(`Loading ${questions.length} questions for ${subject}...`);
      
      for (const question of questions) {
        try {
          // Check if question already exists (by stem to avoid duplicates)
          const existing = await storage.getQuestionsBySubject(subject, 1000);
          const isDuplicate = existing.some(q => q.stem === question.stem);
          
          if (!isDuplicate) {
            // Format question for database
            const dbQuestion = {
              subject: question.subject || subject,
              stem: question.stem,
              choices: question.choices,
              correctIndex: question.correctIndex,
              explanation: question.explanation,
              difficulty: question.difficulty || 'medium',
              topic: question.topic || null,
              subtopic: question.subtopic || null,
              source: 'cached'
            };
            
            await storage.createQuestion(dbQuestion);
            totalLoaded++;
          }
        } catch (err) {
          console.error(`Failed to load question: ${err.message}`);
        }
      }
    }
    
    console.log(`✅ Successfully loaded ${totalLoaded} questions into database!`);
    return totalLoaded;
  } catch (error) {
    console.error('Failed to load cached questions:', error);
    return 0;
  }
}

export { loadCachedQuestionsToDatabase };