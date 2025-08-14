#!/usr/bin/env node
// DIRECT GENERATION - No complexity, just generate questions

import OpenAI from 'openai';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Use absolute path from project root
const POOL_FILE = path.join(__dirname, 'data/question-pool.json');

console.log('Pool file location:', POOL_FILE);

const SUBJECTS = [
  'Torts',
  'Contracts', 
  'Criminal Law',
  'Civil Procedure',
  'Constitutional Law',
  'Evidence',
  'Real Property'
];

async function generateOne(subject, difficulty) {
  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{
        role: 'system',
        content: 'You are an expert bar exam question writer.'
      }, {
        role: 'user',
        content: `Generate a high-quality MBE bar exam question for ${subject}. Difficulty: ${difficulty}/10.

Return JSON:
{
  "stem": "Complete fact pattern ending with a question",
  "choices": ["Choice A", "Choice B", "Choice C", "Choice D"],
  "correctIndex": 0,
  "explanation": "Brief explanation"
}`
      }],
      response_format: { type: "json_object" },
      max_tokens: 800,
      temperature: 0.9
    });
    
    const q = JSON.parse(response.choices[0].message.content);
    
    if (!q.stem || !q.choices || q.choices.length !== 4) return null;
    
    return {
      id: `gen_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      subject,
      topic: subject,
      difficulty,
      stem: q.stem,
      choices: q.choices,
      correctIndex: q.correctIndex || 0,
      explanation: q.explanation || 'See rule application.',
      createdAt: Date.now(),
      usedCount: 0
    };
  } catch (e) {
    console.log(`Error generating: ${e.message}`);
    return null;
  }
}

async function generate() {
  console.log('🔥 DIRECT GENERATION TO 1200 QUESTIONS');
  console.log('=' .repeat(60));
  
  // Load pool
  let pool = [];
  try {
    const content = fs.readFileSync(POOL_FILE, 'utf-8');
    pool = JSON.parse(content);
  } catch (e) {
    console.log('Starting fresh pool');
  }
  
  console.log(`📊 Starting with ${pool.length} questions\n`);
  
  const TARGET = 1200;
  const needed = TARGET - pool.length;
  
  if (needed <= 0) {
    console.log('✅ Already have 1200+ questions!');
    return;
  }
  
  console.log(`🎯 Need to generate ${needed} more questions\n`);
  
  let generated = 0;
  const startTime = Date.now();
  
  while (generated < needed) {
    // Rotate through subjects for even distribution
    const subject = SUBJECTS[generated % SUBJECTS.length];
    const difficulty = 1 + Math.floor(Math.random() * 9);
    
    const q = await generateOne(subject, difficulty);
    
    if (q) {
      // Quick dupe check on first 50 chars
      const isDupe = pool.some(p => 
        p.stem && q.stem && 
        p.stem.substring(0, 50) === q.stem.substring(0, 50)
      );
      
      if (!isDupe) {
        pool.push(q);
        generated++;
        
        // Progress every 5 questions
        if (generated % 5 === 0) {
          const total = pool.length;
          const pct = Math.round((total / TARGET) * 100);
          const rate = (generated / ((Date.now() - startTime) / 60000)).toFixed(1);
          
          console.log(`[${new Date().toLocaleTimeString()}] ${total}/${TARGET} (${pct}%) - ${rate} q/min`);
          
          // Save to disk
          fs.writeFileSync(POOL_FILE, JSON.stringify(pool, null, 2));
        }
      }
    }
    
    // Small delay to avoid rate limits
    await new Promise(r => setTimeout(r, 100));
  }
  
  // Final save
  fs.writeFileSync(POOL_FILE, JSON.stringify(pool, null, 2));
  
  const elapsed = ((Date.now() - startTime) / 60000).toFixed(1);
  
  console.log('\n' + '=' .repeat(60));
  console.log(`✅ COMPLETE in ${elapsed} minutes!`);
  console.log(`📊 Total: ${pool.length} questions`);
  console.log(`✨ Generated: ${generated} new`);
  
  // Show distribution
  const dist = {};
  pool.forEach(q => dist[q.subject] = (dist[q.subject] || 0) + 1);
  
  console.log('\n📈 Distribution:');
  Object.entries(dist).sort().forEach(([s, c]) => {
    console.log(`  ${s}: ${c}`);
  });
  
  if (pool.length >= 1200) {
    console.log('\n' + '🏆'.repeat(20));
    console.log('💯 SUCCESS! 1200+ QUESTIONS ACHIEVED!');
    console.log('🎯 Law Duel now rivals UWorld Legal!');
    console.log('🏆'.repeat(20));
  }
}

// Check API key
if (!process.env.OPENAI_API_KEY) {
  console.error('❌ No API key!');
  process.exit(1);
}

// RUN!
generate().catch(console.error);