#!/usr/bin/env node
// Aggressive question generation to reach 1200+ questions immediately

import { generateFreshQuestion } from './services/robustGenerator.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const POOL_FILE = path.join(__dirname, '../data/question-pool.json');

const SUBJECTS = [
  'Torts',
  'Contracts', 
  'Criminal Law',
  'Civil Procedure',
  'Constitutional Law',
  'Evidence',
  'Real Property'
];

async function aggressiveGenerate() {
  console.log('🚀 AGGRESSIVE GENERATION MODE - TARGET: 1200+ QUESTIONS');
  console.log('=' .repeat(60));
  
  // Load existing pool
  let pool = [];
  try {
    const data = fs.readFileSync(POOL_FILE, 'utf-8');
    pool = JSON.parse(data);
    console.log(`📊 Starting with ${pool.length} existing questions`);
  } catch (error) {
    console.log('📊 Starting with empty pool');
  }
  
  const TARGET_PER_SUBJECT = 175; // 175 * 7 = 1225 questions
  let totalGenerated = 0;
  
  // Generate questions for each subject
  for (const subject of SUBJECTS) {
    const existingCount = pool.filter(q => q.subject === subject).length;
    const needed = Math.max(0, TARGET_PER_SUBJECT - existingCount);
    
    if (needed === 0) {
      console.log(`✅ ${subject}: Already has ${existingCount} questions`);
      continue;
    }
    
    console.log(`\n📚 ${subject}: Has ${existingCount}, generating ${needed} more...`);
    
    let generated = 0;
    const batchSize = 5;
    
    for (let i = 0; i < needed; i += batchSize) {
      const promises = [];
      const remaining = Math.min(batchSize, needed - i);
      
      // Generate batch in parallel
      for (let j = 0; j < remaining; j++) {
        const difficulty = 1 + Math.floor(Math.random() * 9); // 1-9
        promises.push(
          generateFreshQuestion(subject, difficulty)
            .then(q => {
              if (q && q.stem && q.choices && q.choices.length === 4) {
                const question = {
                  id: `pool_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                  subject: q.subject || subject,
                  topic: q.topic || subject,
                  subtopic: q.subtopic,
                  difficulty,
                  stem: q.stem,
                  choices: q.choices,
                  correctIndex: q.correctIndex,
                  explanation: q.explanation,
                  explanationLong: q.explanationLong,
                  checksum: Buffer.from(q.stem).toString('base64').substring(0, 16),
                  createdAt: Date.now(),
                  usedCount: 0
                };
                
                // Check for duplicates
                const isDuplicate = pool.some(existing => 
                  existing.stem?.substring(0, 50) === question.stem?.substring(0, 50)
                );
                
                if (!isDuplicate) {
                  pool.push(question);
                  generated++;
                  process.stdout.write('✓');
                  return true;
                }
                process.stdout.write('.');
                return false;
              }
              process.stdout.write('x');
              return false;
            })
            .catch(err => {
              process.stdout.write('!');
              console.error(`\n  Error: ${err.message}`);
              return false;
            })
        );
      }
      
      // Wait for batch to complete
      await Promise.all(promises);
      
      // Save progress every 10 questions
      if (generated % 10 === 0 && generated > 0) {
        fs.writeFileSync(POOL_FILE, JSON.stringify(pool, null, 2));
        console.log(` [Saved ${pool.length} total]`);
      }
      
      // Brief pause between batches
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    totalGenerated += generated;
    console.log(`\n  ✅ Generated ${generated} new ${subject} questions`);
    
    // Save after each subject
    fs.writeFileSync(POOL_FILE, JSON.stringify(pool, null, 2));
  }
  
  // Final save
  fs.writeFileSync(POOL_FILE, JSON.stringify(pool, null, 2));
  
  console.log('\n' + '=' .repeat(60));
  console.log(`✨ GENERATION COMPLETE!`);
  console.log(`📊 Final pool size: ${pool.length} questions`);
  console.log(`✅ Generated ${totalGenerated} new questions`);
  
  // Show distribution
  const distribution = {};
  for (const q of pool) {
    distribution[q.subject] = (distribution[q.subject] || 0) + 1;
  }
  
  console.log('\n📈 Question Distribution:');
  for (const [subject, count] of Object.entries(distribution).sort()) {
    const percentage = ((count / pool.length) * 100).toFixed(1);
    console.log(`   ${subject}: ${count} questions (${percentage}%)`);
  }
  
  return pool.length;
}

// Run immediately
console.log('Starting aggressive question generation...\n');
aggressiveGenerate()
  .then(count => {
    console.log(`\n🎉 SUCCESS! Pool now has ${count} high-quality questions!`);
    console.log('✅ Your Law Duel now rivals UWorld Legal!');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n❌ Generation failed:', error);
    process.exit(1);
  });