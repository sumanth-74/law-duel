import OpenAI from "openai";
import { SUBJECTS, normalizeSubject, pickTopic, subjectIntegrityCheck, classifySubjectHeuristic } from './subjects.js';

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

// Subject integrity wrapper with up to 3 retries if heuristic detects cross-subject bleed
export async function generateWithIntegrity({ subject: rawSubject }) {
  const subject = normalizeSubject(rawSubject) || Object.keys(SUBJECTS)[Math.floor(Math.random() * 7)];
  
  for (let i = 0; i < 3; i++) {
    const draft = await generateMBEItem({ subject });
    const integrityError = subjectIntegrityCheck(draft, subject);
    
    if (!integrityError) {
      console.log(`✅ Subject integrity verified: ${draft.subject} question generated successfully`);
      return draft;
    } else {
      console.log(`⚠️ Subject integrity check failed (attempt ${i + 1}): ${integrityError}`);
      if (i === 2) throw new Error(`Subject integrity check failed after 3 attempts: ${integrityError}`);
    }
  }
}

export async function generateMBEItem({ subject: rawSubject, topic, subtopic, rule }) {
  // Normalize subject and enforce integrity
  const subject = normalizeSubject(rawSubject) || Object.keys(SUBJECTS)[Math.floor(Math.random() * 7)];
  const finalTopic = topic || pickTopic(subject);
  
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
Create a PROFESSIONAL BAR EXAM QUALITY question for **${subject}** that matches actual MBE standards.

CRITICAL MBE STANDARDS YOU MUST FOLLOW:
1. **Fact Pattern (150-200 words)**: Write a detailed, realistic scenario with:
   - Named parties (Alice, Bob, Corp X, State Y)
   - Specific dates, amounts, locations
   - Multiple legal issues embedded naturally
   - Procedural posture if relevant
   - Facts that test subtle distinctions in the law
   
2. **Question Stem**: Ask for the "most likely" outcome, "best argument", or "court's ruling"
   - Never use "which is correct" or simple recall questions
   - Focus on application and analysis, not memorization

3. **Answer Choices**: Each option must be:
   - Complete sentences starting with different structures
   - 15-30 words long
   - Legally plausible but distinguishable
   - Testing different legal theories or exceptions
   - NO obvious throwaway answers

4. **Quality Distractors**: Wrong answers should be wrong because:
   - They apply the wrong legal standard
   - They misapply the correct rule to these facts  
   - They reference an inapplicable exception
   - They confuse majority/minority rules
   NOT because they're factually absurd

5. **${subject}-SPECIFIC FOCUS on ${finalTopic}**:
${subject === 'Civil Procedure' ? `
   - Test federal rules: FRCP, jurisdiction (SMJ, PJ), venue, Erie doctrine
   - Include procedural posture: motion to dismiss, summary judgment, discovery disputes
   - Reference specific rules: 12(b)(6), Rule 56, 28 USC 1331/1332` : ''}
${subject === 'Constitutional Law' ? `
   - Test constitutional provisions and landmark cases
   - Include state action, standing, scrutiny levels
   - Reference specific tests: Lemon test, Central Hudson, Matthews v. Eldridge` : ''}
${subject === 'Contracts' ? `
   - Test formation, performance, breach, remedies under common law and UCC Article 2
   - Include consideration, conditions, warranties, damages
   - Apply majority rules unless testing minority positions` : ''}
${subject === 'Criminal Law' || subject === 'Criminal Procedure' ? `
   - Test mens rea, actus reus, defenses, constitutional protections
   - Include specific crimes: homicide variations, theft crimes, inchoate offenses
   - Apply Fourth, Fifth, Sixth Amendment standards` : ''}
${subject === 'Evidence' ? `
   - Test FRE rules: relevance (401-403), character (404-405), hearsay (801-807)
   - Include authentication, best evidence, privileges
   - Apply Crawford doctrine for confrontation clause` : ''}
${subject === 'Property' ? `
   - Test estates, future interests, concurrent ownership, landlord-tenant
   - Include recording acts, easements, covenants, takings
   - Apply RAP, marketable title, warranty deeds` : ''}
${subject === 'Torts' ? `
   - Test negligence elements, intentional torts, strict liability, defenses
   - Include duty, breach, causation, damages, comparative fault
   - Apply Restatement rules and special duties` : ''}

6. **Randomly place correct answer** at position A, B, C, or D (use Math.random())

${randomStyle} involving ${finalTopic}${subtopicText}${ruleText}.

Output ONLY this JSON structure:
{
  "factPattern": "Detailed fact pattern here with named parties, specific facts, and embedded legal issues...",
  "options": [
    "Complete sentence option A starting with unique structure...",
    "Complete sentence option B with different opening words...", 
    "Complete sentence option C using varied phrasing...",
    "Complete sentence option D with distinct language..."
  ],
  "correctAnswer": "A" or "B" or "C" or "D" (randomly distributed),
  "explanation": "The correct answer is [X] because [state the controlling rule]. Here, [apply rule to facts]. The other options are incorrect because [explain why each distractor fails].",
  "rationales": [
    "Option A is [correct/incorrect] because [specific legal reasoning]...",
    "Option B is [correct/incorrect] because [specific legal reasoning]...",
    "Option C is [correct/incorrect] because [specific legal reasoning]...", 
    "Option D is [correct/incorrect] because [specific legal reasoning]..."
  ]
}`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "You are a bar exam expert who writes questions for the NCBE. Create questions that match actual MBE standards with complex fact patterns, nuanced legal distinctions, and high-quality distractors. Every question must test application of law to facts, not mere recall. Output only valid JSON."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      response_format: { 
        type: "json_object"
      },
      temperature: 0.8,  // Slightly higher for more creative fact patterns
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