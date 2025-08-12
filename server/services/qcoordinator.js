import { generateMBEItem, getDailyTopic } from './mbeGenerator.js';
import { storage } from "../storage.js";

const SUBJECTS = [
  "Evidence", "Contracts", "Torts", "Property", 
  "Civil Procedure", "Constitutional Law", "Criminal Law/Procedure"
];

const questionCache = new Map();
const CACHE_TTL = 10 * 60 * 1000; // 10 minutes

export async function initializeQuestionCoordinator() {
  console.log("Question coordinator initialized");
}

export async function getQuestion(subject, excludeIds = [], forceNew = false) {
  try {
    // For competitive duels, always generate fresh questions from OpenAI
    if (forceNew) {
      console.log(`🔥 Generating FRESH OpenAI question for duel in ${subject}`);
      try {
        // Always generate a completely fresh question for duels - no cache
        const newQuestion = await generateFreshQuestion(subject);
        if (newQuestion) {
          console.log(`✅ Fresh OpenAI question generated: "${newQuestion.stem.substring(0, 50)}..."`);
          // Store the generated question for future reference but don't rely on storage
          try {
            await storage.createQuestion(newQuestion);
          } catch (storageError) {
            console.log('Storage failed but continuing with fresh question');
          }
          return formatQuestion(newQuestion);
        }
      } catch (openaiError) {
        console.error(`❌ OpenAI generation failed for duel ${subject}:`, openaiError);
        // Fall back to stored question only if OpenAI fails
      }
    }

    // Try to get from storage for non-competitive scenarios
    const storedQuestion = await storage.getRandomQuestion(subject, excludeIds);
    if (storedQuestion) {
      await storage.incrementQuestionUsage(storedQuestion.id);
      return formatQuestion(storedQuestion);
    }

    // Generate new question via OpenAI if no stored questions
    try {
      const newQuestion = await generateQuestion(subject);
      if (newQuestion) {
        const stored = await storage.createQuestion(newQuestion);
        return formatQuestion(stored);
      }
    } catch (openaiError) {
      console.log(`OpenAI generation failed for ${subject}, using fallback question`);
    }

    // Use fallback question as last resort
    console.log(`Using fallback question for ${subject}`);
    return getFallbackQuestion(subject);
  } catch (error) {
    console.error('Error getting question:', error);
    return getFallbackQuestion(subject);
  }
}

// Generate fresh question for duels (no cache)
async function generateFreshQuestion(subject) {
  try {
    console.log(`🚀 Calling OpenAI API for fresh ${subject} question...`);
    
    // Create topic configuration for the subject
    const topicConfig = {
      subject,
      topic: getTopicForSubject(subject),
      subtopic: undefined,
      rule: undefined
    };

    // Generate using structured MBE generator with fresh OpenAI call
    const mbeItem = await generateMBEItem(topicConfig);
    
    const question = {
      id: `duel_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      subject: mbeItem.subject,
      stem: mbeItem.stem,
      choices: mbeItem.choices,
      correctIndex: mbeItem.correctIndex,
      explanation: mbeItem.explanationLong,
      difficulty: mbeItem.difficultySeed
    };

    // Validate the result
    if (!validateQuestion(question)) {
      throw new Error("Generated question failed validation");
    }

    console.log(`✅ Fresh question validated: correctIndex=${question.correctIndex}, stem length=${question.stem.length}`);
    return question;
  } catch (error) {
    console.error('❌ Fresh MBE question generation failed:', error);
    throw error; // Re-throw to let caller handle
  }
}

async function generateQuestion(subject) {
  const cacheKey = `${subject}_${Date.now()}`;
  
  if (questionCache.has(cacheKey)) {
    return questionCache.get(cacheKey);
  }

  try {
    // Create topic configuration for the subject
    const topicConfig = {
      subject,
      topic: getTopicForSubject(subject),
      subtopic: undefined,
      rule: undefined
    };

    // Generate using structured MBE generator
    const mbeItem = await generateMBEItem(topicConfig);
    
    const question = {
      id: `generated_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      subject: mbeItem.subject,
      stem: mbeItem.stem,
      choices: mbeItem.choices,
      correctIndex: mbeItem.correctIndex,
      explanation: mbeItem.explanationLong,
      difficulty: mbeItem.difficultySeed
    };

    // Validate the result
    if (!validateQuestion(question)) {
      throw new Error("Generated question failed validation");
    }

    // Cache for a short time
    questionCache.set(cacheKey, question);
    setTimeout(() => questionCache.delete(cacheKey), CACHE_TTL);

    return question;
  } catch (error) {
    console.error('MBE question generation failed:', error);
    return null;
  }
}

// Helper function to get appropriate topics for each subject
function getTopicForSubject(subject) {
  const topicMap = {
    "Evidence": "Hearsay",
    "Contracts": "Formation",
    "Torts": "Negligence", 
    "Property": "Estates",
    "Civil Procedure": "Jurisdiction",
    "Constitutional Law": "Due Process",
    "Criminal Law/Procedure": "Fourth Amendment"
  };
  return topicMap[subject] || "General Principles";
}

function validateQuestion(question) {
  if (!question.stem || typeof question.stem !== 'string') {
    console.log('❌ Validation failed: Invalid stem', typeof question.stem);
    return false;
  }
  if (question.stem.length < 50) {
    console.log('❌ Validation failed: Stem too short', question.stem.length);
    return false;
  }
  if (!Array.isArray(question.choices) || question.choices.length !== 4) {
    console.log('❌ Validation failed: Invalid choices', question.choices?.length);
    return false;
  }
  if (typeof question.correctIndex !== 'number' || question.correctIndex < 0 || question.correctIndex > 3) {
    console.log('❌ Validation failed: Invalid correctIndex', question.correctIndex);
    return false;
  }
  if (!question.explanation || typeof question.explanation !== 'string') {
    console.log('❌ Validation failed: Invalid explanation', typeof question.explanation);
    return false;
  }
  
  console.log('✅ Question validation passed');
  return true;
}

function formatQuestion(question) {
  return {
    qid: question.id,
    stem: question.stem,
    choices: question.choices,
    correctIndex: question.correctIndex,
    explanation: question.explanation,
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
