#!/usr/bin/env node
// MASSIVE GENERATION - Generate 1200 questions RIGHT NOW

import OpenAI from 'openai';
import fs from 'fs';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const SUBJECTS = [
  'Torts',
  'Contracts', 
  'Criminal Law',
  'Civil Procedure',
  'Constitutional Law',
  'Evidence',
  'Real Property'
];

async function generateQuestion(subject) {
  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{
        role: 'user',
        content: `Generate a high-quality MBE bar exam question for ${subject}. Return JSON with:
{
  "stem": "detailed fact pattern ending with a question",
  "choices": ["Choice A", "Choice B", "Choice C", "Choice D"],
  "correctIndex": 0,
  "explanation": "brief explanation of the correct answer"
}`
      }],
      response_format: { type: "json_object" },
      max_tokens: 800,
      temperature: 0.9
    });
    
    const q = JSON.parse(response.choices[0].message.content);
    
    return {
      id: `massive_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      subject,
      topic: subject,
      difficulty: Math.floor(Math.random() * 9) + 1,
      stem: q.stem,
      choices: q.choices,
      correctIndex: q.correctIndex || 0,
      explanation: q.explanation || 'See rule application.',
      createdAt: Date.now(),
      usedCount: 0
    };
  } catch (error) {
    console.log(`Error: ${error.message}`);
    return null;
  }
}

async function generateMassive() {
  console.log('🔥 MASSIVE GENERATION - CREATING 1200 QUESTIONS!');
  console.log('=' .repeat(60));
  
  // Load existing pool - check correct path
  let pool = [];
  const poolPath = './data/question-pool.json';
  
  try {
    pool = JSON.parse(fs.readFileSync(poolPath, 'utf-8'));
    console.log(`📊 Starting with ${pool.length} existing questions\n`);
  } catch (error) {
    console.log('📊 Starting fresh\n');
  }
  
  const TARGET = 1200;
  const needed = Math.max(0, TARGET - pool.length);
  
  if (needed === 0) {
    console.log('✅ Already have 1200+ questions!');
    return pool.length;
  }
  
  console.log(`🎯 Generating ${needed} questions to reach 1200...\n`);
  
  let generated = 0;
  const startTime = Date.now();
  
  // Generate questions rapidly
  while (generated < needed) {
    // Pick subjects in rotation for even distribution
    const subject = SUBJECTS[generated % SUBJECTS.length];
    
    const question = await generateQuestion(subject);
    
    if (question && question.stem && question.choices && question.choices.length === 4) {
      // Quick dupe check
      const isDupe = pool.some(p => 
        p.stem && question.stem && 
        p.stem.substring(0, 50) === question.stem.substring(0, 50)
      );
      
      if (!isDupe) {
        pool.push(question);
        generated++;
        
        // Progress update every 10 questions
        if (generated % 10 === 0) {
          const total = pool.length;
          const pct = Math.round((total / TARGET) * 100);
          console.log(`Progress: ${total}/${TARGET} (${pct}%) - Generated ${generated} new`);
          
          // Save every 10 questions
          fs.writeFileSync(poolPath, JSON.stringify(pool, null, 2));
        }
      }
    }
    
    // Tiny delay to avoid rate limits
    await new Promise(r => setTimeout(r, 50));
  }
  
  // Final save
  fs.writeFileSync(poolPath, JSON.stringify(pool, null, 2));
  
  const elapsed = ((Date.now() - startTime) / 60000).toFixed(1);
  
  console.log('\n' + '=' .repeat(60));
  console.log(`✅ MASSIVE GENERATION COMPLETE in ${elapsed} minutes!`);
  console.log(`📊 Total questions: ${pool.length}`);
  console.log(`✨ Generated ${generated} new questions`);
  
  // Show distribution
  const dist = {};
  pool.forEach(q => dist[q.subject] = (dist[q.subject] || 0) + 1);
  
  console.log('\n📈 Final Distribution:');
  Object.entries(dist).sort().forEach(([s, c]) => {
    console.log(`  ${s}: ${c} questions`);
  });
  
  if (pool.length >= 1200) {
    console.log('\n' + '🏆'.repeat(20));
    console.log('💯 SUCCESS! YOU NOW HAVE 1200+ QUESTIONS!');
    console.log('🎯 Law Duel now rivals UWorld Legal!');
    console.log('🏆'.repeat(20));
  }
  
  return pool.length;
}

// RUN IT!
if (!process.env.OPENAI_API_KEY) {
  console.error('❌ No API key found!');
  process.exit(1);
}

console.log('Starting massive generation...\n');
generateMassive()
  .then(count => {
    console.log(`\n✅ Complete! ${count} questions in pool!`);
    if (count >= 1200) {
      console.log('🎉 YOU DID IT! 1200+ questions achieved!');
    }
    process.exit(0);
  })
  .catch(error => {
    console.error('❌ Failed:', error);
    process.exit(1);
  });