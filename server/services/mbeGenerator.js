import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const MBE_SCHEMA = {
  name: "MBEItem",
  schema: {
    type: "object",
    properties: {
      id: { type: "string" },
      subject: { type: "string" },
      topic: { type: "string" },
      subtopic: { type: "string" },
      stem: { type: "string" },
      choices: { type: "array", items: { type: "string" }, minItems: 4, maxItems: 4 },
      correctIndex: { type: "integer", minimum: 0, maximum: 3 },
      optionRationales: { 
        type: "object",
        properties: {
          "0": { type: "string" },
          "1": { type: "string" },
          "2": { type: "string" },
          "3": { type: "string" }
        },
        required: ["0", "1", "2", "3"],
        additionalProperties: false
      },
      explanationLong: { type: "string" },
      ruleRefs: { type: "array", items: { type: "string" } },
      difficultySeed: { type: "string", enum: ["easy", "medium", "hard"] },
      timeLimitSec: { type: "integer" },
      tags: { type: "array", items: { type: "string" } },
      license: { type: "string" },
      status: { type: "string" },
      authorNote: { type: "string" }
    },
    required: ["subject", "topic", "stem", "choices", "correctIndex", "optionRationales",
               "explanationLong", "ruleRefs", "difficultySeed", "license", "status"],
    additionalProperties: false
  },
  strict: true
};

export async function generateMBEItem({ subject, topic, subtopic, rule }) {
  const ruleText = rule ? ` focusing on ${rule}` : '';
  const subtopicText = subtopic ? `/${subtopic}` : '';
  
  const prompt = `
Write an original MBE-style multiple-choice question for ${subject} on ${topic}${subtopicText}${ruleText}.
Single best answer, exactly 4 options (A–D). 120–180 word fact pattern.
Test: ${rule || topic} under national law (FRE/FRCP/UCC Art. 2/federal constitutional law as relevant).
Include rationales for each option (why each is right/wrong) and a 3–6 sentence explanation. 
No "all/none of the above."
Make this INCREDIBLY DIFFICULT - upper 10% difficulty for bar exam takers.
Set id = unique string, difficultySeed = "hard", timeLimitSec = 90, license = "educational", status = "active", authorNote = "Generated for Law Duel competitive play".
Output ONLY JSON matching our schema.`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "You are an expert legal educator creating high-quality MBE questions. Generate professional, challenging questions with detailed explanations. Output only valid JSON."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      response_format: { 
        type: "json_object"
      },
      temperature: 0.7,
    });

    const jsonText = response.choices[0].message.content;
    if (!jsonText) {
      throw new Error('No response content from OpenAI');
    }

    const item = JSON.parse(jsonText);
    
    // Validate that we got all required fields
    if (!item.subject || !item.stem || !item.choices || item.choices.length !== 4) {
      throw new Error('Invalid MBE item structure');
    }

    return item;
    
  } catch (error) {
    console.error('Failed to generate MBE item:', error);
    
    // Handle specific OpenAI errors
    if (error.status === 429 || error.message.includes('quota')) {
      throw new Error('QUOTA_EXCEEDED');
    }
    
    if (error.status === 401) {
      throw new Error('INVALID_API_KEY');
    }
    
    throw new Error('Failed to generate MBE question');
  }
}

// Predefined daily topics for rotation
export const DAILY_TOPICS = [
  { subject: "Evidence", topic: "Hearsay", subtopic: "801(d)(1)(C)", rule: "prior identification non-hearsay" },
  { subject: "Constitutional Law", topic: "Due Process", subtopic: "Procedural", rule: "Mathews v. Eldridge balancing test" },
  { subject: "Contracts", topic: "Statute of Frauds", subtopic: "Performance", rule: "part performance doctrine" },
  { subject: "Torts", topic: "Negligence", subtopic: "Duty", rule: "special relationship liability" },
  { subject: "Criminal Law", topic: "Fourth Amendment", subtopic: "Searches", rule: "reasonable expectation of privacy" },
  { subject: "Property", topic: "Estates", subtopic: "Rule Against Perpetuities", rule: "measuring lives analysis" },
  { subject: "Civil Procedure", topic: "Personal Jurisdiction", subtopic: "Specific", rule: "purposeful availment standard" }
];

export function getDailyTopic(dayOfYear) {
  return DAILY_TOPICS[dayOfYear % DAILY_TOPICS.length];
}