import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function generateQuestion(subject) {
  const sys = `Return ONLY strict JSON: {"subject":"...","stem":"80–110 words","choices":["A","B","C","D"],"correctIndex":0,"explanation":"..."}`;
  
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
    
    // Add required fields for the duel system
    q.qid = `q_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    q.timeLimit = 20000;
    q.deadlineTs = Date.now() + 20000;
    
    return q;
  } catch (error) {
    console.error('OpenAI generation failed:', error.message);
    throw error;
  }
}