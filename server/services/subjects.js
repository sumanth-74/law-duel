// Subject Integrity Guard - Single source of truth for all legal subjects
export const SUBJECTS = {
  "Civ Pro": ["Subject Matter Jurisdiction","Personal Jurisdiction","Erie","Preclusion","Venue","Erie","Joinder/Impleader"],
  "Con Law": ["Speech","Equal Protection","Due Process","Commerce Clause","State Action","Standing","Takings"],
  "Contracts": ["Offer/Acceptance","Consideration","Defenses","Parol Evidence","UCC §2—Formation","UCC §2—Risk of Loss","Warranties/Remedies"],
  "Crim": ["Homicide","Accomplice/Pinkerton","Felony Murder","Fourth Amendment","Fifth/Miranda","Sixth/Confrontation"],
  "Evidence": ["Relevance 401/403","Character 404/405","Impeachment 607/613","Hearsay 801–807","Privileges","Authentication/Best Evidence","Experts 702–705"],
  "Property": ["Estates/Future Interests","RAP","Recording Acts","Adverse Possession","Easements/Covenants","Landlord–Tenant","Mortgages"],
  "Torts": ["Negligence","Strict Liability","Products Liability","Defamation","Privacy/IIED/NIED","Vicarious Liability"]
};

const ALIASES = new Map([
  ["civil procedure","Civ Pro"],["civpro","Civ Pro"],["civil-pro","Civ Pro"],
  ["constitutional law","Con Law"],["conlaw","Con Law"],
  ["criminal law","Crim"],["criminal procedure","Crim"],["crim law","Crim"],["crim pro","Crim"],
  ["real property","Property"],["prop","Property"]
]);

export function normalizeSubject(input) {
  if (!input) return null;
  const s = String(input).trim();
  if (SUBJECTS[s]) return s;
  const lower = s.toLowerCase();
  if (ALIASES.has(lower)) return ALIASES.get(lower);
  // Last resort: case-insensitive exact match
  const key = Object.keys(SUBJECTS).find(k => k.toLowerCase() === lower);
  return key || null;
}

// Quick heuristic classifier to sanity-check the item really belongs to the subject
export function classifySubjectHeuristic(item) {
  const t = `${item.stem} ${item.explanation} ${JSON.stringify(item.choices||[])}`.toLowerCase();
  if (/(fre|rule 401|rule 403|hearsay|801|802|803|impeachment|best evidence)/.test(t)) return "Evidence";
  if (/(ucc|§2-|2-2\d\d|merchant|goods|perfect tender|risk of loss)/.test(t)) return "Contracts";
  if (/(rap\b|recording act|bona fide purchaser|easement|covenant|mortgage)/.test(t)) return "Property";
  if (/(summary judgment|personal jurisdiction|subject matter jurisdiction|erie|diversity|venue|joinder|impleader|rule 11|rule 12)/.test(t)) return "Civ Pro";
  if (/(first amendment|equal protection|due process|commerce clause|state action|takings)/.test(t)) return "Con Law";
  if (/(mens rea|felony murder|accomplice|pinkerton|search|seizure|warrant|miranda|lineup)/.test(t)) return "Crim";
  if (/(negligence|duty|breach|causation|strict liability|defamation|iied|products liability)/.test(t)) return "Torts";
  return null;
}

export function subjectIntegrityCheck(item, requestedSubject) {
  if (!requestedSubject) return null; // nothing to enforce if caller didn't specify
  const want = normalizeSubject(requestedSubject);
  if (!want) return "Unknown subject requested";
  if (item.subject !== want) return `Item subject '${item.subject}' != requested '${want}'`;
  
  // Additional heuristic check
  const heuristicSubject = classifySubjectHeuristic(item);
  if (heuristicSubject && heuristicSubject !== want) {
    return `Content appears to be ${heuristicSubject} but requested ${want}`;
  }
  
  return null;
}

export function pickTopic(subject) {
  const list = SUBJECTS[subject];
  if (!list) return "General";
  return list[Math.floor(Math.random() * list.length)];
}