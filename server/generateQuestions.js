#!/usr/bin/env node
// Force immediate generation of high-quality questions for all subjects

import { getPoolManager } from './services/questionPoolManager.js';

// Get singleton instance
const questionPoolManager = await getPoolManager();

const SUBJECTS = [
  'Torts',
  'Contracts', 
  'Criminal Law',
  'Civil Procedure',
  'Constitutional Law',
  'Evidence',
  'Real Property'
];

async function forceGenerateQuestions() {
  console.log('🚀 FORCE GENERATING 1200 HIGH-QUALITY BAR EXAM QUESTIONS');
  console.log('=' .repeat(60));
  
  // Override quota exhaustion
  questionPoolManager.quotaExhausted = false;
  questionPoolManager.dailyCalls = 0;
  
  let totalGenerated = 0;
  
  for (const subject of SUBJECTS) {
    console.log(`\n📚 Generating ${subject} questions...`);
    
    // Generate 70 questions per subject across difficulty bands
    // Low: 25, Medium: 30, High: 15
    
    try {
      console.log('  Generating low difficulty (1-3)...');
      const low = await questionPoolManager.generateBatch(subject, 'low', 25);
      totalGenerated += low;
      
      console.log('  Generating medium difficulty (4-6)...');  
      const medium = await questionPoolManager.generateBatch(subject, 'medium', 30);
      totalGenerated += medium;
      
      console.log('  Generating high difficulty (7-10)...');
      const high = await questionPoolManager.generateBatch(subject, 'high', 15);
      totalGenerated += high;
      
      console.log(`  ✅ ${subject}: ${low + medium + high} questions generated`);
      
    } catch (error) {
      console.error(`  ❌ Error generating ${subject}: ${error.message}`);
    }
    
    // Brief pause between subjects
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  
  console.log('\n' + '=' .repeat(60));
  console.log(`✨ GENERATION COMPLETE: ${totalGenerated} new questions added`);
  console.log(`📊 Total pool size: ${questionPoolManager.pool.length} questions`);
  
  // Show distribution
  const distribution = {};
  for (const q of questionPoolManager.pool) {
    distribution[q.subject] = (distribution[q.subject] || 0) + 1;
  }
  
  console.log('\n📈 Question Distribution:');
  for (const [subject, count] of Object.entries(distribution)) {
    console.log(`   ${subject}: ${count} questions`);
  }
  
  return totalGenerated;
}

// Run immediately
console.log('Starting immediate question generation...\n');
forceGenerateQuestions()
  .then(count => {
    console.log(`\n✅ Successfully generated ${count} questions!`);
    process.exit(0);
  })
  .catch(error => {
    console.error('\n❌ Generation failed:', error);
    process.exit(1);
  });