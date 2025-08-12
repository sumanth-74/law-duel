import crypto from "crypto";

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
Write an original **MBE-style** multiple-choice question.
Subject: ${subject}. Topic: ${topic}. Rule to test: ${rule}.
- Single best answer with exactly 4 options (A–D).
- Fact pattern length: 120–180 words.
- National (majority) law only (FRE/FRCP/UCC Art.2/federal con law as relevant).
- Include clear explanation with the controlling rule.
- No "all/none of the above". 
- Return JSON: {"subject":"${subject}","stem":"...","choices":["A","B","C","D"],"correctIndex":0,"explanation":"..."}
Freshness token: ${nonce} (do not mention it).`;
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
      
      // Basic validation
      if (!item.stem || !item.choices || item.choices.length !== 4 || typeof item.correctIndex !== 'number') {
        err = "Invalid structure";
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
      timeLimit: 60000, // 60 seconds for duels
      deadlineTs: Date.now() + 60000
    };
    
    console.log(`✅ Generated fresh OpenAI question: ${qid} for ${canonicalSubject}`);
    console.log(`📝 Question preview: "${item.stem.substring(0, 60)}..."`);
    return formattedQuestion;
    
  } catch (error) {
    console.error(`❌ Fresh question generation failed for ${subject}:`, error.message);
    throw error;
  }
}

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