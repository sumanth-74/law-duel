import { generateMBEItem, getDailyTopic, generateWithIntegrity } from './mbeGenerator.js';
import { normalizeSubject, SUBJECTS } from './subjects.js';
import { storage } from "../storage.js";

const questionCache = new Map();
const CACHE_TTL = 10 * 60 * 1000; // 10 minutes

export async function initializeQuestionCoordinator() {
  console.log("Question coordinator initialized");
}

export async function getQuestion(subject, excludeIds = [], forceNew = false) {
  try {
    console.log(`🎯 getQuestion called: subject=${subject}, forceNew=${forceNew}, excludeIds=${excludeIds.length}`);
    
    // For competitive duels, ALWAYS generate fresh questions from OpenAI - bypass all caching
    if (forceNew) {
      console.log(`🔥 FORCE NEW = TRUE - Generating COMPLETELY FRESH OpenAI question for duel in ${subject}`);
      try {
        const { generateFreshQuestion } = await import('./robustGenerator.js');
        const freshQuestion = await generateFreshQuestion(subject);
        if (freshQuestion && validateQuestion(freshQuestion)) {
          console.log(`✅ Fresh OpenAI question validated: "${freshQuestion.stem.substring(0, 50)}..."`);
          console.log(`✅ Fresh question correctIndex: ${freshQuestion.correctIndex}, choices: ${freshQuestion.choices.length}`);
          const formatted = formatQuestion(freshQuestion);
          console.log(`✅ SUCCESSFULLY returning fresh OpenAI question with QID: ${formatted.qid}`);
          return formatted;
        } else {
          console.log(`❌ Fresh question failed validation - falling back`);
          return getFallbackQuestion(subject);
        }
      } catch (openaiError) {
        console.error(`❌ OpenAI generation failed for duel ${subject}:`, openaiError.message);
        console.log('🔄 Using random fallback question for variety');
        return getFallbackQuestion(subject);
      }
    }

    // SKIP storage lookup when forceNew is true - this was the bug!
    // Only try storage for non-competitive scenarios
    if (!forceNew) {
      const storedQuestion = await storage.getRandomQuestion(subject, excludeIds);
      if (storedQuestion) {
        await storage.incrementQuestionUsage(storedQuestion.id);
        return formatQuestion(storedQuestion);
      }
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

// Generate completely fresh question for duels (no cache, no storage)
async function generateFreshQuestion(subject) {
  try {
    // Normalize subject and enforce integrity
    const normalizedSubject = normalizeSubject(subject);
    if (!normalizedSubject) {
      throw new Error(`Unknown subject: ${subject}`);
    }
    
    const randomTopic = getTopicForSubject(normalizedSubject);
    console.log(`🚀 Calling OpenAI API for fresh ${normalizedSubject} question on ${randomTopic}...`);
    
    console.log(`🎯 Generating fresh question: ${normalizedSubject} - ${randomTopic}`);
    
    // Use integrity-protected generation with up to 3 retries for cross-subject bleed
    const mbeItem = await generateWithIntegrity({ subject: normalizedSubject });
    console.log(`🔍 MBE Item generated:`, {
      hasStem: !!mbeItem.stem,
      hasChoices: !!mbeItem.choices,
      choicesLength: mbeItem.choices?.length,
      hasCorrectIndex: typeof mbeItem.correctIndex === 'number',
      hasExplanation: !!mbeItem.explanation
    });
    
    const question = {
      id: `fresh_openai_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      subject: normalizedSubject, // Use normalized subject
      stem: mbeItem.stem,
      choices: mbeItem.choices,
      correctIndex: mbeItem.correctIndex,
      explanation: mbeItem.explanation,
      difficulty: mbeItem.difficultySeed || 'hard'
    };
    
    console.log(`🎯 Constructed question:`, {
      id: question.id,
      hasStem: !!question.stem,
      stemLength: question.stem?.length,
      choicesCount: question.choices?.length,
      correctIndex: question.correctIndex
    });

    console.log(`🔍 Pre-validation check: stem="${question.stem?.substring(0, 30)}...", choices=${question.choices?.length}, correctIndex=${question.correctIndex}`);

    if (!validateQuestion(question)) {
      throw new Error("Generated question failed validation");
    }

    console.log(`✅ Fresh OpenAI question validated successfully`);
    console.log(`📝 Question preview: "${question.stem.substring(0, 60)}..."`);
    return question;
  } catch (error) {
    console.error('❌ Fresh MBE question generation failed:', error.message);
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

// Helper function to get randomized topics using canonical subjects system
function getTopicForSubject(subject) {
  // Map legacy subject names to canonical ones for backward compatibility
  const legacyMapping = {
    "Civil Procedure": "Civ Pro",
    "Constitutional Law": "Con Law", 
    "Criminal Law/Procedure": "Crim"
  };
  
  const canonicalSubject = legacyMapping[subject] || subject;
  const topics = SUBJECTS[canonicalSubject];
  
  if (!topics || topics.length === 0) {
    console.log(`⚠️ No topics found for subject: ${subject} (canonical: ${canonicalSubject})`);
    return "General Principles";
  }
  
  // Randomly select a topic to ensure variety
  const randomTopic = topics[Math.floor(Math.random() * topics.length)];
  console.log(`🎲 Selected random topic for ${canonicalSubject}: ${randomTopic}`);
  return randomTopic;
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
  
  // More lenient explanation validation - allow any string or provide default
  if (!question.explanation || typeof question.explanation !== 'string' || question.explanation === 'undefined') {
    console.log('⚠️ Setting default explanation (original was undefined or invalid)');
    question.explanation = "Legal analysis and reasoning provided.";
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
    timeLimit: 60000, // 60 seconds
    deadlineTs: Date.now() + 60000
  };
}

function getFallbackQuestion(subject) {
  // Multiple fallback questions per subject to add variety
  const fallbackPools = {
    "Evidence": [
      {
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
      {
        stem: "A witness's prior consistent statement is admissible under FRE 801(d)(1)(B) to rehabilitate the witness's credibility when the witness has been charged with what?",
        choices: [
          "Bias or improper influence",
          "Recent fabrication or improper motive",
          "Poor character for truthfulness",
          "Lack of personal knowledge"
        ],
        correctIndex: 1,
        explanation: "Prior consistent statements are admissible to rebut charges of recent fabrication or improper influence or motive."
      }
    ],
    "Contracts": [
      {
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
      {
        stem: "Under the UCC, a contract for the sale of goods priced at $500 or more must satisfy the Statute of Frauds. Which writing satisfies this requirement?",
        choices: [
          "Any writing signed by the party to be charged",
          "A writing indicating a contract and signed by the party to be charged",
          "A detailed writing with all essential terms",
          "A writing that specifies quantity and is signed by the party to be charged"
        ],
        correctIndex: 3,
        explanation: "UCC § 2-201 requires a writing indicating a contract for sale, specifying quantity, and signed by the party to be charged."
      }
    ],
    "Torts": [
      {
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
      {
        stem: "In a products liability case based on strict liability, which element is NOT required to be proven?",
        choices: [
          "The product was defective",
          "The defect caused plaintiff's injury",
          "The defendant was negligent",
          "The product was unreasonably dangerous"
        ],
        correctIndex: 2,
        explanation: "Strict products liability does not require proof of negligence - only that the product was defective and unreasonably dangerous."
      }
    ],
    "Property": [
      {
        stem: "A fee simple determinable automatically ends when what occurs?",
        choices: [
          "The grantor exercises right of entry",
          "The stated condition is violated",
          "The grantee transfers the property",
          "A court declares forfeiture"
        ],
        correctIndex: 1,
        explanation: "A fee simple determinable ends automatically when the stated condition occurs, reverting to the grantor."
      }
    ],
    "Civil Procedure": [
      {
        stem: "For a federal court to have specific personal jurisdiction over a non-resident defendant, what is required?",
        choices: [
          "Defendant must have systematic contacts with the forum state",
          "The claim must arise from defendant's forum-related activities",
          "Defendant must be personally served in the forum state",
          "Defendant must have minimum contacts of any kind"
        ],
        correctIndex: 1,
        explanation: "Specific personal jurisdiction requires the claim to arise from or relate to the defendant's activities in the forum state."
      }
    ],
    "Constitutional Law": [
      {
        stem: "Under the Commerce Clause, Congress may regulate activities that have what effect on interstate commerce?",
        choices: [
          "Any effect whatsoever",
          "A substantial effect",
          "A direct effect only",
          "No effect required"
        ],
        correctIndex: 1,
        explanation: "Congress may regulate activities that substantially affect interstate commerce."
      },
      {
        stem: "The Equal Protection Clause applies to which government actions?",
        choices: [
          "Federal government actions only",
          "State government actions only",
          "Both federal and state actions",
          "Local government actions only"
        ],
        correctIndex: 2,
        explanation: "Equal protection applies to all government actions - federal (via 5th Amendment due process) and state/local (via 14th Amendment)."
      }
    ],
    "Criminal Law/Procedure": [
      {
        stem: "The Fourth Amendment's warrant requirement applies to searches where the defendant had what?",
        choices: [
          "A property interest in the place searched",
          "A reasonable expectation of privacy",
          "Personal ownership of items seized",
          "Physical presence during the search"
        ],
        correctIndex: 1,
        explanation: "The Fourth Amendment protects reasonable expectations of privacy, not just property interests."
      }
    ]
  };

  const fallbackPool = fallbackPools[subject] || fallbackPools["Evidence"];
  // Randomly select from available fallbacks to add variety
  const fallback = fallbackPool[Math.floor(Math.random() * fallbackPool.length)];
  console.log(`🎲 Using random fallback question for ${subject}: ${fallback.stem.substring(0, 50)}...`);
  
  return {
    qid: `fallback_${subject}_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
    stem: fallback.stem,
    choices: fallback.choices,
    correctIndex: fallback.correctIndex,
    explanation: fallback.explanation,
    timeLimit: 60000,
    deadlineTs: Date.now() + 60000
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
