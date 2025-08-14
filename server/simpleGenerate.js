#!/usr/bin/env node
// SIMPLE DIRECT GENERATION - No complex logic, just make questions

import OpenAI from 'openai';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const openai = new OpenAI({ 
  apiKey: process.env.OPENAI_API_KEY 
});

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

async function generateOne(subject) {
  const difficulty = Math.floor(Math.random() * 9) + 1;
  
  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{
        role: 'user',
        content: `Generate a bar exam question for ${subject}. Return JSON:
{
  "stem": "fact pattern with question",
  "choices": ["A", "B", "C", "D"],
  "correctIndex": 0,
  "explanation": "explanation"
}`
      }],
      response_format: { type: "json_object" },
      max_tokens: 800
    });
    
    const q = JSON.parse(response.choices[0].message.content);
    
    return {
      id: `q_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      subject,
      difficulty,
      stem: q.stem,
      choices: q.choices,
      correctIndex: q.correctIndex || 0,
      explanation: q.explanation || '',
      createdAt: Date.now()
    };
  } catch (e) {
    return null;
  }
}

async function run() {
  console.log('GENERATING 1200 QUESTIONS...\n');
  
  let pool = [];
  try {
    pool = JSON.parse(fs.readFileSync(POOL_FILE, 'utf-8'));
  } catch (e) {}
  
  console.log(`Starting with ${pool.length} questions\n`);
  
  const TARGET = 1200;
  const needed = TARGET - pool.length;
  
  if (needed <= 0) {
    console.log('Already have 1200+ questions!');
    return;
  }
  
  console.log(`Need to generate ${needed} more questions\n`);
  
  let generated = 0;
  
  while (generated < needed) {
    // Pick random subject
    const subject = SUBJECTS[Math.floor(Math.random() * SUBJECTS.length)];
    
    const q = await generateOne(subject);
    
    if (q && q.stem && q.choices) {
      pool.push(q);
      generated++;
      
      if (generated % 10 === 0) {
        console.log(`Generated ${generated}/${needed} - Total: ${pool.length}`);
        fs.writeFileSync(POOL_FILE, JSON.stringify(pool, null, 2));
      }
    }
    
    // Small delay
    await new Promise(r => setTimeout(r, 100));
  }
  
  fs.writeFileSync(POOL_FILE, JSON.stringify(pool, null, 2));
  
  console.log(`\n✅ DONE! Total questions: ${pool.length}`);
  
  if (pool.length >= 1200) {
    console.log('🏆 YOU NOW HAVE 1200+ QUESTIONS LIKE UWORLD!');
  }
}

run().catch(console.error);