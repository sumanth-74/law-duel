import crypto from "crypto";

// Subjects and their allowed topics for validation
const SUBJECTS = {
  "Civil Procedure": ["SMJ", "PJ", "Venue", "Erie", "Joinder", "Discovery", "Preclusion", "Rule 56"],
  "Constitutional Law": ["Speech", "Equal Protection", "Due Process", "Commerce Clause", "State Action", "Standing", "Takings"],
  "Contracts": ["Offer/Acceptance", "Consideration", "Defenses", "Parol Evidence", "UCC Formation", "Risk of Loss", "Warranties"],
  "Criminal Law": ["Homicide", "Accomplice", "Felony Murder", "Fourth Amendment", "Fifth/Miranda", "Sixth/Confrontation"],
  "Evidence": ["Relevance 401/403", "Character 404/405", "Impeachment", "Hearsay 801–807", "Privileges", "Authentication", "Experts"],
  "Property": ["Estates", "Future Interests", "RAP", "Recording Acts", "Adverse Possession", "Easements", "Landlord–Tenant", "Mortgages"],
  "Torts": ["Negligence", "Strict Liability", "Products Liability", "Defamation", "Privacy", "Vicarious Liability"]
};

// In-memory deduplication
const FINGERPRINTS = new Set();
const seen = s => FINGERPRINTS.has(s);
const remember = s => FINGERPRINTS.add(s);
const fp = text => crypto.createHash("sha1").update(String(text).toLowerCase().replace(/\s+/g," ")).digest("hex");

function randomTopic(subject) {
  const list = SUBJECTS[subject] || ["General"];
  return list[Math.floor(Math.random() * list.length)];
}

function ruleHint(subject, topic) {
  const hints = {
    "Evidence:Hearsay 801–807": "FRE 801(d)(1)(C): prior identification is non-hearsay",
    "Contracts:UCC Formation": "UCC §2-207: battle of the forms mirror image rule",
    "Property:Recording Acts": "Race-notice: BFP without notice who records first",
    "Criminal Law:Fifth/Miranda": "Unwarned but voluntary statements usable for impeachment",
    "Civil Procedure:Rule 56": "Summary judgment: no genuine dispute of material fact",
    "Torts:Products Liability": "Manufacturing defect vs. design defect (risk-utility)"
  };
  return hints[`${subject}:${topic}`] || `${topic} — test the controlling rule`;
}

async function callOpenAIWithRetry({ prompt, temperature = 0.7, maxTries = 4 }) {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("Missing OPENAI_API_KEY");
  }

  let lastErr;
  for (let i = 0; i < maxTries; i++) {
    try {
      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          temperature,
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

      if (!response.ok) {
        const errorText = await response.text().catch(() => "(no body)");
        const err = new Error(`OpenAI ${response.status}: ${errorText}`);
        err.status = response.status;
        throw err;
      }

      const data = await response.json();
      const json = JSON.parse(data.choices[0].message.content);
      return json;
    } catch (e) {
      lastErr = e;
      const status = e.status || 0;
      console.error("[GEN_ERR]", status, e.message);
      
      // Backoff only for 429/5xx; fail fast on 401/403/schema errors
      if (status === 429 || status >= 500) {
        await new Promise(resolve => setTimeout(resolve, 500 * Math.pow(2, i) + Math.floor(Math.random() * 100)));
        continue;
      }
      throw e;
    }
  }
  throw lastErr || new Error("OpenAI generation failed");
}

export async function generateFreshQuestion(subject) {
  const topic = randomTopic(subject);
  const rule = ruleHint(subject, topic);
  
  // Add nonce for freshness and reduce repeats
  const nonce = crypto.randomBytes(6).toString("hex");
  const prompt = `Generate a fresh MBE-style legal question for ${subject}.
Subject: ${subject}. Topic: ${topic}. Rule to test: ${rule}.
- Single best answer with exactly 4 options (A–D)
- Fact pattern: 120-180 words  
- Professional bar exam quality
- Include clear explanation for correct answer
- No "all/none of the above"
- Freshness token: ${nonce} (do not mention this token)`;

  // Try up to 4 times to get a fresh, non-duplicate question
  let item, hash;
  for (let i = 0; i < 4; i++) {
    item = await callOpenAIWithRetry({ prompt, temperature: 0.65 });
    
    // Validate basic structure
    if (!item.stem || !item.choices || item.choices.length !== 4) {
      console.log("Invalid item structure, retrying...");
      continue;
    }
    
    // Check for duplicates
    hash = fp(item.stem);
    if (!seen(hash)) {
      remember(hash);
      break;
    }
    console.log("Duplicate question detected, retrying...");
  }
  
  if (!item) {
    throw new Error("Could not generate fresh question after 4 attempts");
  }
  
  // Add required fields for the duel system
  item.qid = `fresh_openai_${Date.now()}_${nonce}`;
  item.subject = subject;
  item.topic = topic;
  item.timeLimit = 20000;
  item.deadlineTs = Date.now() + 20000;
  
  console.log(`✅ Generated fresh OpenAI question: ${item.qid} for ${subject}`);
  return item;
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