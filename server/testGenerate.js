import OpenAI from 'openai';
import fs from 'fs';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

async function test() {
  console.log('Testing question generation...');
  
  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [{
      role: 'user',
      content: 'Generate a Torts bar exam question. Return JSON with: stem, choices (array of 4), correctIndex, explanation'
    }],
    response_format: { type: "json_object" },
    max_tokens: 500
  });
  
  const q = JSON.parse(response.choices[0].message.content);
  console.log('Generated question:', q.stem?.substring(0, 100) + '...');
  console.log('Has', q.choices?.length, 'choices');
  
  // Load pool
  let pool = [];
  try {
    pool = JSON.parse(fs.readFileSync('./data/question-pool.json'));
  } catch (e) {}
  
  console.log('Current pool size:', pool.length);
  
  // Add question
  pool.push({
    id: `test_${Date.now()}`,
    subject: 'Torts',
    stem: q.stem,
    choices: q.choices,
    correctIndex: q.correctIndex || 0,
    explanation: q.explanation,
    difficulty: 5,
    createdAt: Date.now()
  });
  
  fs.writeFileSync('./data/question-pool.json', JSON.stringify(pool, null, 2));
  console.log('Saved! New pool size:', pool.length);
}

test().catch(console.error);