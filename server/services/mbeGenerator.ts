import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const MBE_SCHEMA = {
  name: "MBEItem",
  schema: {
    type: "object",
    properties: {
      subject: { type: "string" },
      topic: { type: "string" },
      subtopic: { type: "string" },
      stem: { type: "string" },
      choices: { 
        type: "array", 
        items: { type: "string" }, 
        minItems: 4, 
        maxItems: 4 
      },
      correctIndex: { 
        type: "integer", 
        minimum: 0, 
        maximum: 3 
      },
      optionRationales: { 
        type: "array",
        items: { type: "string" },
        minItems: 4,
        maxItems: 4
      },
      explanationLong: { type: "string" },
      ruleRefs: { 
        type: "array", 
        items: { type: "string" } 
      },
      difficultySeed: { 
        type: "string", 
        enum: ["easy", "medium", "hard"] 
      },
      timeLimitSec: { type: "integer" },
      tags: { 
        type: "array", 
        items: { type: "string" } 
      },
      license: { type: "string" },
      status: { type: "string" }
    },
    required: ["subject", "topic", "subtopic", "stem", "choices", "correctIndex", "optionRationales",
               "explanationLong", "ruleRefs", "difficultySeed", "timeLimitSec", "tags", "license", "status"],
    additionalProperties: false
  },
  strict: false
};

export interface MBEGenerationRequest {
  subject: string;
  topic: string;
  subtopic?: string;
  rule?: string;
}

export interface MBEItem {
  subject: string;
  topic: string;
  subtopic?: string;
  stem: string;
  choices: string[];
  correctIndex: number;
  optionRationales: string[];
  explanationLong: string;
  ruleRefs: string[];
  difficultySeed: "easy" | "medium" | "hard";
  timeLimitSec: number;
  tags: string[];
  license: string;
  status: string;
}

export async function generateMBEItem({ subject, topic, subtopic, rule }: MBEGenerationRequest): Promise<MBEItem> {
  const ruleText = rule ? ` focusing on ${rule}` : '';
  const subtopicText = subtopic ? `/${subtopic}` : '';
  
  const prompt = `
Write an original MBE-style multiple-choice question for ${subject} on ${topic}${subtopicText}${ruleText}.
Single best answer, exactly 4 options (A–D). 120–180 word fact pattern.
Test: ${rule || topic} under national law (FRE/FRCP/UCC Art. 2/federal constitutional law as relevant).
Include rationales for each option (why each is right/wrong) in optionRationales array and a 3–6 sentence explanation. 
No "all/none of the above."
Make this INCREDIBLY DIFFICULT - upper 10% difficulty for bar exam takers.
CRITICAL: Randomly distribute correct answers across options A, B, C, and D. Do NOT always make A correct.
For this question, randomly choose whether A, B, C, or D should be the correct answer.
Mark the correct option with "isCorrect": true in the options array.
Set difficultySeed = "hard", timeLimitSec = 90, license = "educational", status = "active".
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

    const rawResponse = JSON.parse(jsonText);
    console.log('OpenAI Response structure:', Object.keys(rawResponse));
    
    // Extract the actual question data - it might be nested under "question"
    const questionData = rawResponse.question || rawResponse;
    
    // Find the correct answer from OpenAI's response
    let correctIndex = 0;
    if (questionData.options) {
      // Look for isCorrect flag or "Correct" in rationale
      const correctOption = questionData.options.findIndex((opt: any) => {
        if (opt.isCorrect === true) return true;
        if (opt.optionRationales?.[0]?.toLowerCase?.()?.includes('correct')) return true;
        return false;
      });
      if (correctOption !== -1) {
        correctIndex = correctOption;
      }
    }
    
    // Extract choices and rationales
    const choices = questionData.options ? questionData.options.map((opt: any) => opt.text) : questionData.choices || [];
    const rationales = questionData.options ? 
      questionData.options.map((opt: any) => opt.rationale || opt.optionRationales?.[0] || "") : 
      questionData.optionRationales || [];

    // Shuffle answers to randomize correct answer position
    console.log('Before shuffle - correctIndex:', correctIndex, 'choices:', choices.map((c, i) => `${i}: ${c.substring(0, 20)}...`));
    const shuffledData = shuffleAnswers(choices, rationales, correctIndex);
    console.log('After shuffle - correctIndex:', shuffledData.correctIndex);
    
    // Transform the OpenAI response to our expected format
    const item = {
      subject: subject,
      topic: topic,
      subtopic: subtopic || "",
      stem: questionData.factPattern || questionData.stem || "",
      choices: shuffledData.choices,
      correctIndex: shuffledData.correctIndex,
      optionRationales: shuffledData.rationales,
      explanationLong: questionData.explanation || questionData.explanationLong || "",
      ruleRefs: questionData.ruleRefs || [],
      difficultySeed: rawResponse.difficultySeed || "hard",
      timeLimitSec: rawResponse.timeLimitSec || 90,
      tags: questionData.tags || [],
      license: rawResponse.license || "educational",
      status: rawResponse.status || "active"
    };
    
    console.log('Transformed item:', { stem: !!item.stem, choicesCount: item.choices.length });
    
    // Basic validation
    if (!item.stem || !item.choices || item.choices.length !== 4) {
      console.log('Validation failed:', { stem: !!item.stem, choicesCount: item.choices.length });
      throw new Error('Invalid MBE item structure');
    }

    return item;
    
  } catch (error: any) {
    console.error('Failed to generate MBE item:', error);
    
    // Handle specific OpenAI errors
    if (error.status === 429 || error.message?.includes('quota')) {
      throw new Error('QUOTA_EXCEEDED');
    }
    
    if (error.status === 401) {
      throw new Error('INVALID_API_KEY');
    }
    
    // Handle JSON parsing errors specifically
    if (error instanceof SyntaxError) {
      console.error('JSON parsing failed for OpenAI response');
      throw new Error('Invalid JSON response from OpenAI');
    }
    
    throw error; // Re-throw the original error for better debugging
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

// Function to shuffle answer choices and update correct index
function shuffleAnswers(choices: string[], rationales: string[], correctIndex: number) {
  // Create array of items with their original indices
  const items = choices.map((choice, index) => ({
    choice,
    rationale: rationales[index] || "",
    originalIndex: index,
    isCorrect: index === correctIndex
  }));
  
  // Fisher-Yates shuffle the items array
  for (let i = items.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [items[i], items[j]] = [items[j], items[i]];
  }
  
  // Extract shuffled data and find new correct index
  const shuffledChoices = items.map(item => item.choice);
  const shuffledRationales = items.map(item => item.rationale);
  const newCorrectIndex = items.findIndex(item => item.isCorrect);
  
  console.log('Shuffle debug:', {
    originalCorrect: correctIndex,
    newCorrect: newCorrectIndex,
    shuffleMap: items.map((item, newIdx) => `${item.originalIndex}->${newIdx}`)
  });
  
  return {
    choices: shuffledChoices,
    rationales: shuffledRationales,
    correctIndex: newCorrectIndex
  };
}

export function getDailyTopic(dayOfYear: number): MBEGenerationRequest {
  return DAILY_TOPICS[dayOfYear % DAILY_TOPICS.length];
}