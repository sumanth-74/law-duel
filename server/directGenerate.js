#!/usr/bin/env node
// DIRECT GENERATION - No complex logic, just generate questions NOW

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

async function generateSingleQuestion(subject, difficulty) {
  try {
    const prompt = `Generate a high-quality MBE-style bar exam question for ${subject}.
Difficulty: ${difficulty}/10
The question should test core legal principles with a realistic fact pattern.

Return JSON with this EXACT structure:
{
  "stem": "The complete fact pattern and question",
  "choices": ["Choice A", "Choice B", "Choice C", "Choice D"],
  "correctIndex": 0,
  "explanation": "Brief explanation of the correct answer",
  "topic": "${subject}",
  "subject": "${subject}"
}`;

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: 'You are an expert bar exam question writer. Generate high-quality MBE questions.' },
        { role: 'user', content: prompt }
      ],
      response_format: { type: "json_object" },
      temperature: 0.9,
      max_tokens: 1000
    });

    const content = response.choices[0].message.content;
    const question = JSON.parse(content);
    
    if (question.stem && question.choices && question.choices.length === 4) {
      return {
        id: `direct_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        subject,
        topic: question.topic || subject,
        difficulty,
        stem: question.stem,
        choices: question.choices,
        correctIndex: question.correctIndex || 0,
        explanation: question.explanation || 'See rule application.',
        createdAt: Date.now(),
        usedCount: 0
      };
    }
    return null;
  } catch (error) {
    console.log(`  Error generating ${subject} question: ${error.message}`);
    return null;
  }
}

async function directGenerate() {
  console.log('🔥 DIRECT GENERATION - CREATING 1200 QUESTIONS NOW!');
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
  
  const QUESTIONS_PER_SUBJECT = 175;
  let totalGenerated = 0;
  
  for (const subject of SUBJECTS) {
    const existing = pool.filter(q => q.subject === subject).length;
    const needed = Math.max(0, QUESTIONS_PER_SUBJECT - existing);
    
    if (needed === 0) {
      console.log(`✅ ${subject}: Already has ${existing} questions`);
      continue;
    }
    
    console.log(`\n🎯 ${subject}: Generating ${needed} questions...`);
    let generated = 0;
    
    // Generate questions one by one with visual progress
    for (let i = 0; i < needed; i++) {
      const difficulty = 1 + Math.floor(Math.random() * 9);
      const question = await generateSingleQuestion(subject, difficulty);
      
      if (question) {
        // Check for duplicates
        const isDupe = pool.some(p => 
          p.stem && question.stem && 
          p.stem.substring(0, 50) === question.stem.substring(0, 50)
        );
        
        if (!isDupe) {
          pool.push(question);
          generated++;
          totalGenerated++;
          
          // Visual progress
          if (generated % 5 === 0) {
            process.stdout.write(`  ${generated}/${needed} `);
            const pct = Math.floor((generated/needed) * 20);
            process.stdout.write('█'.repeat(pct) + '░'.repeat(20-pct));
            process.stdout.write(` (${pool.length} total in pool)\n`);
            
            // Save every 5 questions
            fs.writeFileSync(POOL_FILE, JSON.stringify(pool, null, 2));
          }
        }
      }
      
      // Small delay to avoid rate limits
      await new Promise(resolve => setTimeout(resolve, 200));
    }
    
    console.log(`  ✅ ${subject}: Generated ${generated} questions!`);
    
    // Save after each subject
    fs.writeFileSync(POOL_FILE, JSON.stringify(pool, null, 2));
  }
  
  console.log('\n' + '=' .repeat(60));
  console.log(`🎉 GENERATION COMPLETE!`);
  console.log(`📊 Total pool size: ${pool.length} questions`);
  console.log(`✨ Generated ${totalGenerated} new questions`);
  
  if (pool.length >= 1200) {
    console.log('\n🏆 SUCCESS! You now have 1200+ questions like UWorld Legal!');
  }
  
  return pool.length;
}

// RUN IT NOW!
if (!process.env.OPENAI_API_KEY) {
  console.error('❌ ERROR: OPENAI_API_KEY not found in environment!');
  process.exit(1);
}

console.log('🚀 Starting direct generation with OpenAI API...\n');
directGenerate()
  .then(count => {
    console.log(`\n✅ DONE! Pool has ${count} questions!`);
    process.exit(0);
  })
  .catch(error => {
    console.error('\n❌ Failed:', error);
    process.exit(1);
  });