#!/usr/bin/env node
// MEGA GENERATION - Guaranteed to generate 1200+ questions

import OpenAI from 'openai';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const openai = new OpenAI({ 
  apiKey: process.env.OPENAI_API_KEY,
  timeout: 30000,
  maxRetries: 3
});

const POOL_FILE = path.join(__dirname, '../data/question-pool.json');

// All 7 MBE subjects
const SUBJECTS = [
  'Torts',
  'Contracts', 
  'Criminal Law',
  'Civil Procedure',
  'Constitutional Law',
  'Evidence',
  'Real Property'
];

async function generateBatchQuestions(subject, count = 10) {
  const prompt = `Generate ${count} different high-quality MBE-style bar exam questions for ${subject}.
Each question should:
- Have a realistic, detailed fact pattern
- Test core legal principles
- Include 4 plausible answer choices
- Have varying difficulty levels (1-10)

Return a JSON array with ${count} questions, each having this structure:
{
  "stem": "Complete fact pattern ending with a question",
  "choices": ["Choice A", "Choice B", "Choice C", "Choice D"],
  "correctIndex": 0,
  "explanation": "Brief explanation",
  "difficulty": 5
}

Make each question unique and test different aspects of ${subject} law.`;

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { 
          role: 'system', 
          content: 'You are an expert bar exam question writer. Generate diverse, high-quality MBE questions that test different legal concepts.' 
        },
        { role: 'user', content: prompt }
      ],
      response_format: { type: "json_object" },
      temperature: 0.95,
      max_tokens: 4000
    });

    const content = response.choices[0].message.content;
    const data = JSON.parse(content);
    
    // Handle both array and object with questions property
    const questions = Array.isArray(data) ? data : (data.questions || []);
    
    return questions.map(q => ({
      id: `mega_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      subject,
      topic: subject,
      difficulty: q.difficulty || Math.floor(Math.random() * 9) + 1,
      stem: q.stem,
      choices: q.choices,
      correctIndex: q.correctIndex || 0,
      explanation: q.explanation || 'See rule application.',
      createdAt: Date.now(),
      usedCount: 0
    })).filter(q => q.stem && q.choices && q.choices.length === 4);
    
  } catch (error) {
    console.log(`  ⚠️ Batch generation error: ${error.message}`);
    return [];
  }
}

async function megaGenerate() {
  console.log('🚀 MEGA GENERATION - TARGET: 1200+ QUESTIONS!');
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
  
  const TARGET = 1225; // 175 per subject
  let totalGenerated = 0;
  const startTime = Date.now();
  
  // Calculate how many we need per subject
  const distribution = {};
  SUBJECTS.forEach(s => {
    const existing = pool.filter(q => q.subject === s).length;
    const target = Math.ceil(TARGET / SUBJECTS.length);
    distribution[s] = {
      existing,
      target,
      needed: Math.max(0, target - existing)
    };
  });
  
  console.log('📋 Generation Plan:');
  Object.entries(distribution).forEach(([subject, info]) => {
    console.log(`  ${subject}: ${info.existing}/${info.target} (need ${info.needed})`);
  });
  console.log('');
  
  // Generate for each subject
  for (const subject of SUBJECTS) {
    const info = distribution[subject];
    if (info.needed === 0) {
      console.log(`✅ ${subject}: Already complete`);
      continue;
    }
    
    console.log(`\n🎯 ${subject}: Generating ${info.needed} questions...`);
    let generated = 0;
    
    // Generate in batches of 10
    while (generated < info.needed) {
      const batchSize = Math.min(10, info.needed - generated);
      console.log(`  Generating batch of ${batchSize}...`);
      
      const newQuestions = await generateBatchQuestions(subject, batchSize);
      
      // Filter out duplicates
      const unique = newQuestions.filter(newQ => {
        const isDupe = pool.some(existing => 
          existing.stem && newQ.stem && 
          existing.stem.substring(0, 50) === newQ.stem.substring(0, 50)
        );
        return !isDupe;
      });
      
      pool.push(...unique);
      generated += unique.length;
      totalGenerated += unique.length;
      
      // Save after each batch
      fs.writeFileSync(POOL_FILE, JSON.stringify(pool, null, 2));
      
      console.log(`  ✓ Added ${unique.length} questions (${generated}/${info.needed} for ${subject}, ${pool.length} total)`);
      
      // Brief pause to avoid rate limits
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    console.log(`✅ ${subject}: Complete! (${distribution[subject].existing + generated} questions)`);
  }
  
  const elapsedMinutes = ((Date.now() - startTime) / 60000).toFixed(1);
  
  console.log('\n' + '=' .repeat(60));
  console.log(`🎉 MEGA GENERATION COMPLETE in ${elapsedMinutes} minutes!`);
  console.log(`📊 Final pool size: ${pool.length} questions`);
  console.log(`✨ Generated ${totalGenerated} new questions`);
  
  // Final distribution
  const final = {};
  pool.forEach(q => final[q.subject] = (final[q.subject] || 0) + 1);
  
  console.log('\n📈 Final Distribution:');
  Object.entries(final).sort().forEach(([s, c]) => {
    const pct = ((c / pool.length) * 100).toFixed(1);
    console.log(`  ${s}: ${c} questions (${pct}%)`);
  });
  
  if (pool.length >= 1200) {
    console.log('\n');
    console.log('🏆'.repeat(20));
    console.log('🎉 SUCCESS! YOU NOW HAVE 1200+ QUESTIONS!');
    console.log('✨ Your Law Duel now RIVALS UWorld Legal!');
    console.log('🏆'.repeat(20));
  }
  
  return pool.length;
}

// Check API key
if (!process.env.OPENAI_API_KEY) {
  console.error('❌ ERROR: OPENAI_API_KEY not found!');
  console.error('Make sure your API key is set in Replit Secrets');
  process.exit(1);
}

// RUN IT!
console.log('🔥 Starting MEGA generation with OpenAI...\n');
megaGenerate()
  .then(count => {
    console.log(`\n✅ COMPLETE! Pool has ${count} questions!`);
    if (count >= 1200) {
      console.log('🎯 YOU DID IT! 1200+ questions achieved!');
    }
    process.exit(0);
  })
  .catch(error => {
    console.error('\n❌ Failed:', error);
    process.exit(1);
  });