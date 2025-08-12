import OpenAI from "openai";
import { storage } from "../storage.js";

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
const openai = new OpenAI({ 
  apiKey: process.env.OPENAI_API_KEY || process.env.OPENAI_KEY || "default_key"
});

const SUBJECTS = [
  "Evidence", "Contracts", "Torts", "Property", 
  "Civil Procedure", "Constitutional Law", "Criminal Law/Procedure"
];

const questionCache = new Map();
const CACHE_TTL = 10 * 60 * 1000; // 10 minutes

export async function initializeQuestionCoordinator() {
  console.log("Question coordinator initialized");
}

export async function getQuestion(subject, excludeIds = []) {
  try {
    // Try to get from storage first
    const storedQuestion = await storage.getRandomQuestion(subject, excludeIds);
    if (storedQuestion) {
      await storage.incrementQuestionUsage(storedQuestion.id);
      return formatQuestion(storedQuestion);
    }

    // Generate new question via OpenAI
    const newQuestion = await generateQuestion(subject);
    if (newQuestion) {
      const stored = await storage.createQuestion(newQuestion);
      return formatQuestion(stored);
    }

    // Fallback question
    return getFallbackQuestion(subject);
  } catch (error) {
    console.error('Error getting question:', error);
    return getFallbackQuestion(subject);
  }
}

async function generateQuestion(subject) {
  const cacheKey = `${subject}_${Date.now()}`;
  
  if (questionCache.has(cacheKey)) {
    return questionCache.get(cacheKey);
  }

  try {
    const prompt = `Generate a law school question for ${subject}. 
Requirements:
- Stem must be 80-120 characters
- 4 multiple choice options (A, B, C, D)
- Exactly one correct answer
- Brief explanation for the correct answer
- Appropriate difficulty for bar exam preparation

Respond with valid JSON in this exact format:
{
  "stem": "question text here...",
  "choices": ["A option", "B option", "C option", "D option"],
  "correctIndex": 0,
  "explanation": "explanation text"
}`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "You are a law professor creating high-quality bar exam questions. Always respond with valid JSON."
        },
        {
          role: "user", 
          content: prompt
        }
      ],
      response_format: { type: "json_object" },
      max_tokens: 800
    });

    const result = JSON.parse(response.choices[0].message.content);
    
    // Validate the result
    if (!validateQuestion(result)) {
      throw new Error("Generated question failed validation");
    }

    const question = {
      subject,
      stem: result.stem,
      choices: result.choices,
      correctIndex: result.correctIndex,
      explanation: result.explanation,
      difficulty: "medium"
    };

    // Cache for a short time
    questionCache.set(cacheKey, question);
    setTimeout(() => questionCache.delete(cacheKey), CACHE_TTL);

    return question;
  } catch (error) {
    console.error('OpenAI question generation failed:', error);
    return null;
  }
}

function validateQuestion(question) {
  if (!question.stem || typeof question.stem !== 'string') return false;
  if (question.stem.length < 80 || question.stem.length > 120) return false;
  if (!Array.isArray(question.choices) || question.choices.length !== 4) return false;
  if (typeof question.correctIndex !== 'number' || question.correctIndex < 0 || question.correctIndex > 3) return false;
  if (!question.explanation || typeof question.explanation !== 'string') return false;
  
  return true;
}

function formatQuestion(storedQuestion) {
  return {
    qid: storedQuestion.id,
    stem: storedQuestion.stem,
    choices: storedQuestion.choices,
    correctIndex: storedQuestion.correctIndex,
    explanation: storedQuestion.explanation,
    timeLimit: 20000, // 20 seconds
    deadlineTs: Date.now() + 20000
  };
}

function getFallbackQuestion(subject) {
  const fallbacks = {
    "Evidence": {
      stem: "Under Federal Rule of Evidence 403, evidence may be excluded if its probative value is substantially outweighed by what?",
      choices: [
        "Any prejudicial effect",
        "The danger of unfair prejudice", 
        "Confusion of the issues",
        "Misleading the jury"
      ],
      correctIndex: 1,
      explanation: "FRE 403 allows exclusion when probative value is substantially outweighed by the danger of unfair prejudice."
    },
    "Contracts": {
      stem: "What is required for a valid offer under common law contract formation?",
      choices: [
        "Present intent to contract",
        "Definite and certain terms",
        "Communication to offeree", 
        "All of the above"
      ],
      correctIndex: 3,
      explanation: "A valid offer requires present intent, definite terms, and communication to the offeree."
    },
    "Torts": {
      stem: "What are the elements required to establish a negligence claim?",
      choices: [
        "Duty, breach, causation, damages",
        "Intent, act, harm",
        "Duty, intent, damages",
        "Breach, harm, intent"
      ],
      correctIndex: 0,
      explanation: "Negligence requires duty, breach of duty, causation, and damages."
    },
    "Constitutional Law": {
      stem: "Under the Commerce Clause, Congress may regulate activities that have what effect on interstate commerce?",
      choices: [
        "Any effect whatsoever",
        "A substantial effect",
        "A direct effect only",
        "No effect required"
      ],
      correctIndex: 1,
      explanation: "Congress may regulate activities that substantially affect interstate commerce."
    }
  };

  const fallback = fallbacks[subject] || fallbacks["Evidence"];
  console.log(`Using fallback question for ${subject}:`, fallback.stem);
  
  return {
    qid: `fallback_${subject}_${Date.now()}`,
    stem: fallback.stem,
    choices: fallback.choices,
    correctIndex: fallback.correctIndex,
    explanation: fallback.explanation,
    timeLimit: 20000,
    deadlineTs: Date.now() + 20000
  };
}

export async function generateHint(questionStem, choices) {
  try {
    const prompt = `For this law question, provide a helpful hint without revealing the answer or specific letters/choices:

Question: ${questionStem}

Provide a hint that guides thinking about the legal principle involved, without giving away the answer.`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "You are Atticus the Cat, a wise legal guide. Provide helpful hints without revealing answers."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      max_tokens: 150
    });

    return response.choices[0].message.content;
  } catch (error) {
    console.error('Hint generation failed:', error);
    return "Consider the balancing test and fundamental legal principles at play here.";
  }
}
