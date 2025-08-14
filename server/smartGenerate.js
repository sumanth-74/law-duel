#!/usr/bin/env node
// SMART GENERATION - Works within rate limits to reach 1200 questions

import OpenAI from 'openai';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const openai = new OpenAI({ 
  apiKey: process.env.OPENAI_API_KEY,
  timeout: 30000,
  maxRetries: 2
});

const POOL_FILE = path.join(__dirname, '../data/question-pool.json');
const PROGRESS_FILE = path.join(__dirname, '../data/generation-progress.json');

const SUBJECTS = [
  'Torts',
  'Contracts', 
  'Criminal Law',
  'Civil Procedure',
  'Constitutional Law',
  'Evidence',
  'Real Property'
];

// Load or initialize progress tracking
function loadProgress() {
  try {
    return JSON.parse(fs.readFileSync(PROGRESS_FILE, 'utf-8'));
  } catch {
    return {
      lastRun: null,
      totalGenerated: 0,
      requestsToday: 0,
      lastResetDate: new Date().toDateString()
    };
  }
}

function saveProgress(progress) {
  fs.writeFileSync(PROGRESS_FILE, JSON.stringify(progress, null, 2));
}

async function generateBatch(subject, count = 5) {
  const prompt = `Generate ${count} different high-quality MBE-style bar exam questions for ${subject}.

Each question must:
- Have a detailed, realistic fact pattern (2-3 paragraphs)
- Test core legal principles and rules
- Include 4 plausible answer choices
- Have varying difficulties

Return a JSON array with exactly ${count} questions:
[
  {
    "stem": "Complete fact pattern ending with: Which of the following is most likely?",
    "choices": ["Choice A text", "Choice B text", "Choice C text", "Choice D text"],
    "correctIndex": 0,
    "explanation": "Brief explanation referencing the legal rule",
    "difficulty": 5
  }
]

Make each question unique and test different aspects of ${subject} law.`;

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { 
          role: 'system', 
          content: 'You are an expert bar exam question writer. Generate diverse, high-quality MBE questions.' 
        },
        { role: 'user', content: prompt }
      ],
      response_format: { type: "json_object" },
      temperature: 0.95,
      max_tokens: 3500
    });

    const content = response.choices[0].message.content;
    const data = JSON.parse(content);
    
    // Handle both array and object responses
    let questions = Array.isArray(data) ? data : (data.questions || []);
    
    return questions.map(q => ({
      id: `smart_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
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
    if (error.status === 429) {
      console.log('⚠️ Rate limit hit - will resume tomorrow');
      return [];
    }
    console.log(`Error generating batch: ${error.message}`);
    return [];
  }
}

async function smartGenerate() {
  console.log('🧠 SMART GENERATION - Building to 1200 questions efficiently');
  console.log('=' .repeat(60));
  
  // Load pool and progress
  let pool = [];
  try {
    pool = JSON.parse(fs.readFileSync(POOL_FILE, 'utf-8'));
  } catch {
    pool = [];
  }
  
  let progress = loadProgress();
  
  // Check if we need to reset daily counter
  const today = new Date().toDateString();
  if (progress.lastResetDate !== today) {
    progress.requestsToday = 0;
    progress.lastResetDate = today;
    console.log('📅 New day - request counter reset');
  }
  
  console.log(`📊 Current status:`);
  console.log(`   Pool: ${pool.length} questions`);
  console.log(`   Requests today: ${progress.requestsToday}/10000`);
  console.log(`   Total generated all-time: ${progress.totalGenerated}`);
  
  const TARGET = 1200;
  const needed = TARGET - pool.length;
  
  if (needed <= 0) {
    console.log('✅ Already have 1200+ questions!');
    return;
  }
  
  console.log(`🎯 Need ${needed} more questions to reach 1200\n`);
  
  // Calculate optimal batch size based on available requests
  const remainingRequests = 10000 - progress.requestsToday;
  const batchSize = 5; // Generate 5 questions per API call
  const maxBatches = Math.min(Math.floor(remainingRequests / 2), Math.ceil(needed / batchSize));
  
  if (maxBatches <= 0) {
    console.log('❌ Rate limit exhausted for today. Run again tomorrow!');
    return;
  }
  
  console.log(`📈 Strategy: ${maxBatches} batches × ${batchSize} questions = up to ${maxBatches * batchSize} new questions\n`);
  
  let totalGenerated = 0;
  const startTime = Date.now();
  
  // Generate batches with smart subject rotation
  for (let batch = 0; batch < maxBatches; batch++) {
    const subject = SUBJECTS[batch % SUBJECTS.length];
    
    console.log(`[Batch ${batch + 1}/${maxBatches}] Generating ${batchSize} ${subject} questions...`);
    
    const newQuestions = await generateBatch(subject, batchSize);
    
    if (newQuestions.length === 0) {
      console.log('⚠️ Generation stopped (likely rate limit)');
      break;
    }
    
    // Filter duplicates
    const unique = newQuestions.filter(newQ => {
      const isDupe = pool.some(existing => 
        existing.stem && newQ.stem && 
        existing.stem.substring(0, 100) === newQ.stem.substring(0, 100)
      );
      return !isDupe;
    });
    
    pool.push(...unique);
    totalGenerated += unique.length;
    progress.requestsToday += 1;
    progress.totalGenerated += unique.length;
    
    // Save after each batch
    fs.writeFileSync(POOL_FILE, JSON.stringify(pool, null, 2));
    saveProgress(progress);
    
    console.log(`  ✓ Added ${unique.length} unique questions (Pool: ${pool.length}/${TARGET})`);
    
    // Check if we've reached target
    if (pool.length >= TARGET) {
      console.log('\n🎯 TARGET REACHED!');
      break;
    }
    
    // Small delay between batches
    await new Promise(r => setTimeout(r, 1000));
  }
  
  const elapsed = ((Date.now() - startTime) / 60000).toFixed(1);
  
  // Final stats
  console.log('\n' + '=' .repeat(60));
  console.log(`📊 Generation Summary:`);
  console.log(`   Time: ${elapsed} minutes`);
  console.log(`   Generated: ${totalGenerated} new questions`);
  console.log(`   Total pool: ${pool.length} questions`);
  console.log(`   Requests used: ${progress.requestsToday}/10000`);
  
  // Distribution
  const dist = {};
  pool.forEach(q => dist[q.subject] = (dist[q.subject] || 0) + 1);
  
  console.log('\n📈 Distribution by Subject:');
  Object.entries(dist).sort().forEach(([s, c]) => {
    const pct = ((c / pool.length) * 100).toFixed(1);
    const bar = '█'.repeat(Math.floor(c / 10));
    console.log(`   ${s.padEnd(20)} ${c.toString().padStart(3)} (${pct.padStart(5)}%) ${bar}`);
  });
  
  if (pool.length >= 1200) {
    console.log('\n' + '🏆'.repeat(20));
    console.log('🎉 SUCCESS! 1200+ QUESTIONS ACHIEVED!');
    console.log('✨ Law Duel now rivals UWorld Legal!');
    console.log('💪 You have a premier bar exam tool!');
    console.log('🏆'.repeat(20));
  } else {
    const remainingDays = Math.ceil((TARGET - pool.length) / (maxBatches * batchSize));
    console.log(`\n📅 At this rate, you'll reach 1200 in ${remainingDays} days`);
    console.log('💡 Run this script daily to continue building your pool!');
  }
}

// Check API key
if (!process.env.OPENAI_API_KEY) {
  console.error('❌ ERROR: OPENAI_API_KEY not found!');
  process.exit(1);
}

// RUN!
console.log('🚀 Starting smart generation...\n');
smartGenerate()
  .then(() => {
    console.log('\n✅ Smart generation complete!');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n❌ Error:', error);
    process.exit(1);
  });