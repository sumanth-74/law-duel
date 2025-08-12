import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// 10-minute cache per subject
const questionCache = new Map();
const CACHE_TTL = 10 * 60 * 1000; // 10 minutes

// Rate limiter: minimum 1200ms between calls
let lastOpenAICall = 0;
const MIN_CALL_INTERVAL = 1200;

export async function generateQuestion(subject) {
  // Check cache first
  const cacheKey = subject;
  const cached = questionCache.get(cacheKey);
  
  if (cached && cached.timestamp + CACHE_TTL > Date.now()) {
    console.log(`Using cached question for ${subject}`);
    const question = cached.questions[Math.floor(Math.random() * cached.questions.length)];
    return {
      ...question,
      qid: `q_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timeLimit: 20000,
      deadlineTs: Date.now() + 20000
    };
  }

  // Rate limiting: ensure 1200ms between calls
  const now = Date.now();
  const timeSinceLastCall = now - lastOpenAICall;
  
  if (timeSinceLastCall < MIN_CALL_INTERVAL) {
    const waitTime = MIN_CALL_INTERVAL - timeSinceLastCall;
    console.log(`Rate limiting: waiting ${waitTime}ms before OpenAI call`);
    await new Promise(resolve => setTimeout(resolve, waitTime));
  }
  
  lastOpenAICall = Date.now();

  const sys = `Return ONLY strict JSON: {"subject":"...","stem":"80–110 words","choices":["A","B","C","D"],"correctIndex":0,"explanation":"..."}`;
  
  try {
    console.log(`Making OpenAI call for ${subject}`);
    
    const r = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.2,
      messages: [
        { role: "system", content: sys },
        { role: "user", content: `Subject: ${subject}` }
      ],
    });
    
    const txt = r.choices[0].message.content || "";
    const s = txt.indexOf("{"), e = txt.lastIndexOf("}");
    const q = JSON.parse(txt.slice(s, e + 1));
    
    // Cache the generated question
    const cacheEntry = questionCache.get(cacheKey) || { questions: [], timestamp: Date.now() };
    cacheEntry.questions.push(q);
    cacheEntry.timestamp = Date.now();
    questionCache.set(cacheKey, cacheEntry);
    
    console.log(`Generated and cached question for ${subject}`);
    
    // Add required fields for the duel system
    q.qid = `q_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    q.timeLimit = 20000;
    q.deadlineTs = Date.now() + 20000;
    
    return q;
  } catch (error) {
    console.error('OpenAI generation failed:', error.message);
    
    // On 429 (quota exceeded), retry once after waiting
    if (error.status === 429) {
      console.log('Quota exceeded, retrying once after 2s delay...');
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      try {
        const r = await openai.chat.completions.create({
          model: "gpt-4o-mini",
          temperature: 0.2,
          messages: [
            { role: "system", content: sys },
            { role: "user", content: `Subject: ${subject}` }
          ],
        });
        
        const txt = r.choices[0].message.content || "";
        const s = txt.indexOf("{"), e = txt.lastIndexOf("}");
        const q = JSON.parse(txt.slice(s, e + 1));
        
        q.qid = `q_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        q.timeLimit = 20000;
        q.deadlineTs = Date.now() + 20000;
        
        return q;
      } catch (retryError) {
        console.log('Retry failed, falling back to training questions');
        throw new Error('QUOTA_EXCEEDED');
      }
    }
    
    throw error;
  }
}