import crypto from "crypto";

// ---- de-dupe inside a duel ----
function fingerprintStem(stem) {
  return crypto.createHash("sha1")
    .update(String(stem).toLowerCase().replace(/\s+/g, " "))
    .digest("hex");
}

// Canonical subjects - these map to your game's subject names
const SUBJECTS = {
  "Civil Procedure": ["SMJ", "PJ", "Venue", "Erie", "Joinder", "Discovery", "Preclusion", "Rule 56"],
  "Constitutional Law": ["Speech", "Equal Protection", "Due Process", "Commerce Clause", "State Action", "Standing", "Takings"],
  "Contracts": ["Offer/Acceptance", "Consideration", "Defenses", "Parol Evidence", "UCC Formation", "Risk of Loss", "Warranties"],
  "Criminal Law": ["Homicide", "Accomplice", "Felony Murder", "Fourth Amendment", "Fifth/Miranda", "Sixth/Confrontation"],
  "Evidence": ["Relevance 401/403", "Character 404/405", "Impeachment", "Hearsay 801–807", "Privileges", "Authentication", "Experts"],
  "Property": ["Estates", "Future Interests", "RAP", "Recording Acts", "Adverse Possession", "Easements", "Landlord–Tenant", "Mortgages"],
  "Torts": ["Negligence", "Strict Liability", "Products Liability", "Defamation", "Privacy", "Vicarious Liability"]
};

// Subject mapping for your game
const SUBJECT_MAP = {
  "Torts": "Torts",
  "Contracts": "Contracts", 
  "Criminal Law": "Criminal Law",
  "Civil Procedure": "Civil Procedure",
  "Constitutional Law": "Constitutional Law",
  "Evidence": "Evidence",
  "Property": "Property"
};

const SUBJECT_ENUM = Object.keys(SUBJECTS);

// Avoid immediate repeats within the same session
const recent = new Set();
const cap = 100;

function memoStem(stem) {
  const key = stem.toLowerCase().replace(/\s+/g, " ").slice(0, 180);
  recent.add(key);
  if (recent.size > cap) recent.delete([...recent][0]);
  return key;
}

function seenStem(stem) {
  const key = stem.toLowerCase().replace(/\s+/g, " ").slice(0, 180);
  return recent.has(key);
}

function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function randomTopic(subject) { return pick(SUBJECTS[subject] || ["General"]); }

function ruleHint(subject, topic) {
  const map = {
    "Evidence:Hearsay 801–807": "FRE 801(d)(1)(C): prior identification is non-hearsay",
    "Contracts:UCC Formation": "UCC §2-207: battle of the forms mirror image rule", 
    "Property:Recording Acts": "Race-notice: BFP without notice who records first",
    "Criminal Law:Fifth/Miranda": "Unwarned but voluntary statements usable for impeachment",
    "Civil Procedure:Rule 56": "Summary judgment: no genuine dispute of material fact",
    "Torts:Products Liability": "Design vs. manufacturing defect (risk-utility test)"
  };
  return map[`${subject}:${topic}`] || `${topic} — test the controlling black-letter rule`;
}

// Build a strong prompt with freshness nonce
function buildPrompt(subject, topic, rule) {
  const nonce = crypto.randomBytes(6).toString("hex");
  return `
Generate an original MBE-style multiple-choice question.

REQUIREMENTS:
- Subject: ${subject}
- Topic: ${topic} 
- Rule to test: ${rule}
- EXACTLY 4 answer choices (no more, no less)
- One correct answer
- Fact pattern: 120-180 words
- Professional legal writing
- No "all/none of the above"

RESPONSE FORMAT (JSON only):
{
  "subject": "${subject}",
  "stem": "Your question text here...",
  "choices": [
    "First answer option",
    "Second answer option", 
    "Third answer option",
    "Fourth answer option"
  ],
  "correctIndex": 0,
  "explanation": "Legal explanation with controlling rule..."
}

CRITICAL: Return exactly 4 choices in the choices array. No additional text outside the JSON.
Freshness token: ${nonce}`;
}

// OpenAI call using the working Responses API
async function callOpenAI(prompt) {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("Missing OPENAI_API_KEY");
  }
  
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      temperature: 0.6,
      messages: [
        { 
          role: "system", 
          content: "Return ONLY valid JSON matching this format: {\"subject\":\"...\",\"stem\":\"...\",\"choices\":[\"A\",\"B\",\"C\",\"D\"],\"correctIndex\":0,\"explanation\":\"...\"}" 
        },
        { role: "user", content: prompt }
      ],
      response_format: { type: "json_object" },
      max_tokens: 1200
    })
  });
  
  if (!res.ok) {
    const errorText = await res.text().catch(() => "(no body)");
    throw new Error(`OpenAI ${res.status}: ${errorText}`);
  }
  
  const data = await res.json();
  return JSON.parse(data.choices[0].message.content);
}

// Normalize and validate choices to prevent junk like "A", "B" or "A) text"
function normalizeChoices(raw) {
  if (!Array.isArray(raw) || raw.length !== 4) throw new Error("Need exactly 4 choices");
  // Strip leading A) / B. / C: etc.
  const cleaned = raw.map((s) => String(s || "").replace(/^\s*[A-D][\)\].:\-]\s*/i, "").trim());
  // Reject single-letter/empty/duplicate choices
  if (cleaned.some((c) => c.length < 6)) throw new Error("Choices too short");
  const set = new Set(cleaned.map((c) => c.toLowerCase()));
  if (set.size < 4) throw new Error("Duplicate/identical choices");
  return cleaned;
}

export async function generateFreshQuestion(subject) {
  try {
    // Map to canonical subject name
    const canonicalSubject = SUBJECT_MAP[subject] || subject;
    const topic = randomTopic(canonicalSubject);
    const rule = ruleHint(canonicalSubject, topic);
    const prompt = buildPrompt(canonicalSubject, topic, rule);

    // Retry up to 3 times for novelty/validity
    let item, err;
    for (let i = 0; i < 3; i++) {
      item = await callOpenAI(prompt);
      item.subject = canonicalSubject;
      item.topic = item.topic || topic;
      
      // Basic validation - check structure and correctIndex range
      if (!item.stem || !item.choices || !Array.isArray(item.choices)) {
        err = "Missing stem or choices";
        continue;
      }
      
      // CRITICAL: Ensure exactly 4 choices (OpenAI sometimes returns 8)
      if (item.choices.length !== 4) {
        console.log(`❌ OpenAI returned ${item.choices.length} choices instead of 4, retrying...`);
        err = `Invalid choice count: ${item.choices.length} (expected 4)`;
        continue;
      }
      
      if (typeof item.correctIndex !== 'number') {
        err = "Invalid correctIndex type";
        continue;
      }
      
      // Validate and normalize choices - reject junk like "A", "B" or duplicate choices
      try {
        item.choices = normalizeChoices(item.choices);
      } catch (e) {
        err = e.message;
        continue;
      }
      
      // Validate correctIndex is in range 0-3
      if (item.correctIndex < 0 || item.correctIndex > 3) {
        err = `Invalid correctIndex: ${item.correctIndex} (must be 0-3)`;
        continue;
      }
      
      // Check word count  
      const words = item.stem.trim().split(/\s+/).length;
      if (words < 110 || words > 220) {
        err = "Stem length invalid";
        continue;
      }
      
      // Check for duplicates
      if (seenStem(item.stem)) {
        err = "Duplicate stem";
        continue;
      }
      
      // Success! 
      memoStem(item.stem);
      break;
    }
    
    if (!item) {
      throw new Error(err || "Could not generate fresh question after 3 attempts");
    }
    
    // Hard enforce 60-second timer and quality controls
    item.timeLimitSec = 60;
    
    // Require a real explanation
    if (!item.explanationLong || item.explanationLong.trim().length < 80) {
      throw new Error("Missing/short explanation"); // triggers a retry
    }
    
    // Require sensible choices
    const joined = item.choices.join(" ").toLowerCase();
    if (joined.includes("all of the above") || joined.includes("none of the above")) {
      throw new Error("Banned phrases in choices"); // retry
    }
    if (typeof item.correctIndex !== "number" || item.correctIndex < 0 || item.correctIndex > 3) {
      throw new Error("Bad correctIndex"); // retry
    }

    // Add required fields for the duel system
    const qid = `fresh_openai_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
    const formattedQuestion = {
      qid,
      subject: canonicalSubject,
      topic: item.topic,
      stem: item.stem,
      choices: item.choices,
      correctIndex: item.correctIndex,
      explanation: item.explanation || "See explanation above.",
      explanationLong: item.explanationLong, // Full explanation required
      timeLimit: 60000, // 60 seconds for duels
      timeLimitSec: 60, // Enforce 60s
      deadlineTs: Date.now() + 60000
    };
    
    console.log(`✅ Generated fresh OpenAI question: ${qid} for ${canonicalSubject}`);
    console.log(`📝 Question preview: "${item.stem.substring(0, 60)}..."`);
    console.log(`🎯 Correct answer: ${item.correctIndex} (${item.choices?.[item.correctIndex]?.substring(0, 30) || 'N/A'}...)`);
    console.log(`🔍 Full question validation: correctIndex=${formattedQuestion.correctIndex}, choices.length=${formattedQuestion.choices?.length}`);
    return formattedQuestion;
    
  } catch (error) {
    console.error(`❌ Fresh question generation failed for ${subject}:`, error.message);
    throw error;
  }
}

export { fingerprintStem };

export async function healthCheck() {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return { ok: false, error: "Missing OPENAI_API_KEY" };
    }
    
    const response = await fetch("https://api.openai.com/v1/models", {
      headers: { 
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}` 
      }
    });
    
    return { 
      ok: response.ok, 
      status: response.status,
      ...(response.ok ? {} : { error: await response.text().catch(() => "Unknown error") })
    };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}