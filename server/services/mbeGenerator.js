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
  
  // Add variety in question styles and difficulty
  const questionStyles = [
    "Create a complex fact pattern with multiple parties and legal issues",
    "Design a scenario with competing legal theories and close analysis required",
    "Present a case with procedural complications and substantive law intersections",
    "Construct a multi-jurisdictional problem testing nuanced legal distinctions"
  ];
  
  const randomStyle = questionStyles[Math.floor(Math.random() * questionStyles.length)];
  
  const prompt = `
${randomStyle} for ${subject} law, specifically testing ${topic}${subtopicText}${ruleText}.

Write an original MBE-style multiple-choice question with exactly 4 options (A–D). 
Vary the question format - use different fact patterns, party types, and legal scenarios.
120–180 word fact pattern testing ${rule || topic} under national law.
Include detailed rationales for each option and comprehensive explanation.
No "all/none of the above."
Make this challenging but fair - solid bar exam difficulty.
CRITICAL: Randomly distribute the correct answer across A, B, C, and D options.

Output ONLY JSON in this exact format:
{
  "factPattern": "Your fact pattern here...",
  "options": ["Option A text", "Option B text", "Option C text", "Option D text"],
  "correctAnswer": "A" or "B" or "C" or "D",
  "explanation": "Detailed explanation here",
  "rationales": ["Why A is right/wrong", "Why B is right/wrong", "Why C is right/wrong", "Why D is right/wrong"]
}`;

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

    const rawResponse = JSON.parse(jsonText);
    
    // Extract the actual question data - it might be nested under "question" or at root level
    const item = rawResponse.question || rawResponse;
    
    console.log('OpenAI response structure:', Object.keys(rawResponse));
    console.log('Extracted item structure:', Object.keys(item));
    
    // Debug the options structure
    console.log('Raw options from OpenAI:', JSON.stringify(item.options, null, 2));
    
    // Map OpenAI response fields to our expected format  
    let choices = [];
    
    if (item.options) {
      if (Array.isArray(item.options)) {
        // Handle array of strings or objects
        choices = item.options.map(opt => {
          if (typeof opt === 'string') return opt;
          if (opt && opt.text) return opt.text;
          if (opt && opt.option) return opt.option;
          return String(opt);
        });
      } else if (typeof item.options === 'object') {
        // Handle object with A, B, C, D keys
        const keys = ['A', 'B', 'C', 'D'];
        choices = keys.map(key => item.options[key] || '').filter(choice => choice.length > 0);
        
        // If not A,B,C,D structure, try numbered keys
        if (choices.length === 0) {
          choices = ['0', '1', '2', '3'].map(key => item.options[key] || '').filter(choice => choice.length > 0);
        }
      }
    } else if (item.choices && Array.isArray(item.choices)) {
      choices = item.choices;
    }
    
    console.log(`Extracted ${choices.length} choices:`, choices);

    const mappedItem = {
      stem: item.stem || item.factPattern || item.question || "Legal question generated by OpenAI",
      choices: choices,
      correctIndex: typeof item.correctIndex === 'number' ? item.correctIndex : 
                    (item.correctAnswer ? ['A', 'B', 'C', 'D'].indexOf(item.correctAnswer) : 0),
      explanation: item.explanation || item.rationales || (Array.isArray(item.rationales) ? item.rationales.join(' ') : "Legal analysis provided."),
      subject: subject,
      id: `openai_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    };
    
    // Ensure explanation is never undefined
    if (!mappedItem.explanation || mappedItem.explanation === 'undefined') {
      mappedItem.explanation = "Legal analysis provided by AI generation.";
    }

    // Validate that we got all required fields
    if (!mappedItem.stem || !mappedItem.choices || mappedItem.choices.length !== 4) {
      console.log('❌ MBE validation failed:', { 
        hasStem: !!mappedItem.stem, 
        hasChoices: !!mappedItem.choices,
        choicesCount: mappedItem.choices?.length,
        originalKeys: Object.keys(item),
        stemPreview: mappedItem.stem?.substring(0, 50)
      });
      throw new Error('Invalid MBE item structure');
    }

    console.log('✅ MBE validation passed - returning valid OpenAI question');
    console.log(`✅ Question ID will be: ${mappedItem.id}`);
    return mappedItem;
    
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