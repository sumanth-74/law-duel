#!/usr/bin/env node
// TURBO MODE - Generate 1200+ questions FAST

import { generateFreshQuestion } from './services/robustGenerator.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const POOL_FILE = path.join(__dirname, '../data/question-pool.json');

// All MBE subjects
const SUBJECTS = [
  'Torts',
  'Contracts', 
  'Criminal Law',
  'Civil Procedure',
  'Constitutional Law',
  'Evidence',
  'Real Property'
];

async function turboGenerate() {
  console.log('⚡ TURBO GENERATION MODE - 1200+ QUESTIONS NOW!');
  console.log('=' .repeat(60));
  
  // Load existing pool
  let pool = [];
  try {
    const data = fs.readFileSync(POOL_FILE, 'utf-8');
    pool = JSON.parse(data);
    console.log(`📊 Starting with ${pool.length} existing questions\n`);
  } catch (error) {
    console.log('📊 Starting fresh\n');
  }
  
  const QUESTIONS_PER_SUBJECT = 175; // 175 * 7 = 1225 total
  let totalGenerated = 0;
  let startTime = Date.now();
  
  // Generate for each subject in parallel batches
  for (const subject of SUBJECTS) {
    const existing = pool.filter(q => q.subject === subject).length;
    const needed = Math.max(0, QUESTIONS_PER_SUBJECT - existing);
    
    if (needed === 0) {
      console.log(`✅ ${subject}: Already has ${existing}+ questions`);
      continue;
    }
    
    console.log(`\n🚀 ${subject}: Generating ${needed} questions...`);
    
    let generated = 0;
    const PARALLEL_BATCH = 10; // Generate 10 at once!
    
    while (generated < needed) {
      const batchPromises = [];
      const batchSize = Math.min(PARALLEL_BATCH, needed - generated);
      
      // Create batch of parallel requests
      for (let i = 0; i < batchSize; i++) {
        // Mix of difficulties for variety
        const difficulty = 1 + Math.floor(Math.random() * 9);
        
        batchPromises.push(
          generateFreshQuestion(subject, difficulty)
            .then(q => {
              if (q && q.stem && q.choices && q.choices.length === 4) {
                const question = {
                  id: `turbo_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                  subject: q.subject || subject,
                  topic: q.topic || subject,
                  subtopic: q.subtopic,
                  difficulty,
                  stem: q.stem,
                  choices: q.choices,
                  correctIndex: q.correctIndex,
                  explanation: q.explanation || q.explanationShort,
                  explanationLong: q.explanationLong || q.explanation,
                  checksum: Buffer.from(q.stem.substring(0, 100)).toString('base64').substring(0, 16),
                  createdAt: Date.now(),
                  usedCount: 0
                };
                
                // Quick duplicate check
                const isDupe = pool.some(p => 
                  p.stem && p.stem.substring(0, 50) === question.stem.substring(0, 50)
                );
                
                if (!isDupe) {
                  pool.push(question);
                  return true;
                }
                return false;
              }
              return false;
            })
            .catch(err => {
              console.log(`\n  ⚠️ Generation error: ${err.message?.substring(0, 50)}`);
              return false;
            })
        );
      }
      
      // Wait for batch completion
      const results = await Promise.all(batchPromises);
      const successCount = results.filter(r => r === true).length;
      generated += successCount;
      
      // Visual progress
      process.stdout.write(`  Generated: ${generated}/${needed} `);
      process.stdout.write('█'.repeat(Math.floor((generated/needed) * 20)));
      process.stdout.write('░'.repeat(20 - Math.floor((generated/needed) * 20)));
      process.stdout.write(`\r`);
      
      // Save every 20 questions
      if (generated % 20 === 0) {
        fs.writeFileSync(POOL_FILE, JSON.stringify(pool, null, 2));
      }
      
      // Small pause between batches to avoid rate limits
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    totalGenerated += generated;
    console.log(`\n  ✅ ${subject}: ${generated} new questions added!`);
    
    // Save after each subject
    fs.writeFileSync(POOL_FILE, JSON.stringify(pool, null, 2));
  }
  
  // Final save
  fs.writeFileSync(POOL_FILE, JSON.stringify(pool, null, 2));
  
  const elapsedMinutes = ((Date.now() - startTime) / 60000).toFixed(1);
  
  console.log('\n' + '=' .repeat(60));
  console.log(`🎉 TURBO GENERATION COMPLETE in ${elapsedMinutes} minutes!`);
  console.log(`📊 Total pool size: ${pool.length} questions`);
  console.log(`✨ Generated ${totalGenerated} new questions`);
  
  // Show final distribution
  const dist = {};
  for (const q of pool) {
    dist[q.subject] = (dist[q.subject] || 0) + 1;
  }
  
  console.log('\n📈 Final Distribution (Target: 175 per subject):');
  for (const [subj, count] of Object.entries(dist).sort()) {
    const pct = ((count / pool.length) * 100).toFixed(1);
    const bar = '█'.repeat(Math.floor(count / 10));
    console.log(`  ${subj.padEnd(20)}: ${count.toString().padStart(3)} (${pct}%) ${bar}`);
  }
  
  if (pool.length >= 1200) {
    console.log('\n🏆 CONGRATULATIONS! You now have a UWorld-level question bank!');
  }
  
  return pool.length;
}

// RUN IT NOW!
console.log('⚡ TURBO MODE ACTIVATED - Generating 1200+ questions...\n');
turboGenerate()
  .then(count => {
    console.log(`\n✅ SUCCESS! Your question bank now has ${count} high-quality questions!`);
    if (count >= 1200) {
      console.log('🎯 You now rival UWorld Legal with 1200+ bar exam questions!');
    }
    process.exit(0);
  })
  .catch(error => {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  });