// Canonical taxonomy - single source of truth for all subjects and subtopics
export const SUBJECTS = {
  'Evidence': ['Hearsay', 'Impeachment', 'Relevance', 'Privileges', 'Authentication'],
  'Contracts': ['Formation', 'Parol Evidence', 'SOF', 'Conditions', 'Remedies'],
  'Torts': ['Negligence', 'Strict Liability', 'Products', 'Defamation', 'Privacy'],
  'Civil Procedure': ['PJ', 'SMJ', 'Erie', 'Venue/Transfer', 'Preclusion'],
  'Constitutional Law': ['Speech', 'Equal Protection', 'Due Process', 'Takings', 'Religion'],
  'Real Property': ['Estates', 'Future Interests', 'Recording', 'Mortgages', 'Landlord/Tenant'],
  'Criminal Law/Procedure': ['Homicide', 'Inchoate/Accomplice', 'Fourth Amendment', 'Exclusionary', 'Fifth Amendment']
};

// Alias mapping for common variations
const ALIASES = {
  // Subject aliases
  'civ pro': 'Civil Procedure',
  'civpro': 'Civil Procedure',
  'con law': 'Constitutional Law',
  'conlaw': 'Constitutional Law',
  'crim': 'Criminal Law/Procedure',
  'criminal': 'Criminal Law/Procedure',
  'criminal law': 'Criminal Law/Procedure',
  'property': 'Real Property',
  
  // Subtopic aliases
  'hearsay exceptions': 'Hearsay',
  'statement against interest': 'Hearsay',
  'excited utterance': 'Hearsay',
  'parol evidence rule': 'Parol Evidence',
  'statute of frauds': 'SOF',
  'personal jurisdiction': 'PJ',
  'subject matter jurisdiction': 'SMJ',
  'erie doctrine': 'Erie',
  'venue': 'Venue/Transfer',
  'transfer': 'Venue/Transfer',
  'res judicata': 'Preclusion',
  'collateral estoppel': 'Preclusion',
  'first amendment': 'Speech',
  'free speech': 'Speech',
  'religion clause': 'Religion',
  'establishment clause': 'Religion',
  'free exercise': 'Religion',
  'products liability': 'Products',
  'future interest': 'Future Interests',
  'recording acts': 'Recording',
  'recording statutes': 'Recording',
  'accomplice liability': 'Inchoate/Accomplice',
  'inchoate crimes': 'Inchoate/Accomplice',
  'search and seizure': 'Fourth Amendment',
  'miranda': 'Fifth Amendment',
  'self-incrimination': 'Fifth Amendment',
  'exclusionary rule': 'Exclusionary'
};

// Normalize a label (subject or subtopic) to canonical form
export function normalizeLabel(label) {
  if (!label) return 'Unmapped';
  
  // Clean the input
  const cleaned = label
    .toLowerCase()
    .trim()
    .replace(/[^\w\s\/\-]/g, '') // Remove punctuation except / and -
    .replace(/\s+/g, ' '); // Normalize whitespace
  
  // Check aliases first
  if (ALIASES[cleaned]) {
    return ALIASES[cleaned];
  }
  
  // Try to match against canonical subjects
  for (const subject of Object.keys(SUBJECTS)) {
    if (subject.toLowerCase() === cleaned) {
      return subject;
    }
  }
  
  // Try to match against canonical subtopics
  for (const [subject, subtopics] of Object.entries(SUBJECTS)) {
    for (const subtopic of subtopics) {
      if (subtopic.toLowerCase() === cleaned) {
        return subtopic;
      }
    }
  }
  
  // If no match found, log warning and return unmapped
  console.warn(`⚠️ Unmapped label: "${label}" (normalized: "${cleaned}")`);
  return 'Unmapped';
}

// Get all subtopics for a subject
export function getSubtopics(subject) {
  const normalized = normalizeLabel(subject);
  return SUBJECTS[normalized] || [];
}

// Validate if a subject/subtopic pair is valid
export function isValidPair(subject, subtopic) {
  const normalizedSubject = normalizeLabel(subject);
  const normalizedSubtopic = normalizeLabel(subtopic);
  
  if (!SUBJECTS[normalizedSubject]) {
    return false;
  }
  
  return SUBJECTS[normalizedSubject].includes(normalizedSubtopic);
}

// Get canonical subject name for a subtopic
export function getSubjectForSubtopic(subtopic) {
  const normalized = normalizeLabel(subtopic);
  
  for (const [subject, subtopics] of Object.entries(SUBJECTS)) {
    if (subtopics.includes(normalized)) {
      return subject;
    }
  }
  
  return null;
}

// Initialize empty progress for all subjects/subtopics
export function initializeEmptyProgress() {
  const progress = {};
  
  for (const [subject, subtopics] of Object.entries(SUBJECTS)) {
    progress[subject] = {
      overall: {
        attempts: 0,
        correct: 0,
        mastery: 0,
        lastSeenAt: null
      },
      subtopics: {}
    };
    
    for (const subtopic of subtopics) {
      progress[subject].subtopics[subtopic] = {
        attempts: 0,
        correct: 0,
        mastery: 0,
        lastSeenAt: null
      };
    }
  }
  
  return progress;
}