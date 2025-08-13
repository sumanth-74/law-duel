// Canonical taxonomy - FULL DETAILED structure with all nested subtopics
export const SUBJECTS = {
  'Civil Procedure': {
    'Jurisdiction': ['Subject Matter Jurisdiction', 'Federal Question', 'Diversity', 'Supplemental'],
    'Personal Jurisdiction': ['Minimum Contacts', 'Specific Jurisdiction', 'General Jurisdiction', 'Long-Arm Statutes'],
    'Venue': ['Proper Venue', 'Transfer', 'Forum Non Conveniens'],
    'Service of Process': ['Methods', 'Waiver', 'Constitutional Requirements'],
    'Pleadings': ['Complaint', 'Answer', 'Amendments', 'Rule 11'],
    'Joinder': ['Permissive', 'Compulsory', 'Intervention', 'Interpleader', 'Class Actions'],
    'Discovery': ['Scope', 'Privileges', 'Work Product', 'Depositions', 'Interrogatories'],
    'Summary Judgment': ['Standard', 'Burden', 'Evidence'],
    'Trial Process': ['Jury Selection', 'Evidence Presentation', 'Motions'],
    'Appeals': ['Final Judgment Rule', 'Interlocutory Appeals', 'Standards of Review'],
    'Res Judicata': ['Claim Preclusion', 'Issue Preclusion', 'Parties Bound'],
    'Erie Doctrine': ['Substance vs Procedure', 'Choice of Law', 'Federal Common Law']
  },
  'Constitutional Law': {
    'Judicial Review': ['Case or Controversy', 'Standing', 'Ripeness', 'Mootness'],
    'Separation of Powers': ['Executive Powers', 'Legislative Powers', 'Judicial Powers'],
    'Federalism': ['Commerce Clause', 'Dormant Commerce', 'Preemption', 'Tenth Amendment'],
    'Individual Rights': ['State Action', 'Incorporation', 'Levels of Scrutiny'],
    'Due Process': ['Procedural', 'Substantive', 'Fundamental Rights'],
    'Equal Protection': ['Classifications', 'Strict Scrutiny', 'Intermediate', 'Rational Basis'],
    'First Amendment - Speech': ['Content-Based', 'Time/Place/Manner', 'Commercial', 'Symbolic'],
    'First Amendment - Religion': ['Establishment Clause', 'Free Exercise', 'Lemon Test'],
    'Takings': ['Public Use', 'Just Compensation', 'Regulatory Takings'],
    'Contracts Clause': ['Impairment', 'Public vs Private']
  },
  'Contracts': {
    'Formation': ['Offer', 'Acceptance', 'Consideration', 'Mutual Assent'],
    'Defenses': ['Capacity', 'Duress', 'Undue Influence', 'Mistake', 'Misrepresentation'],
    'Statute of Frauds': ['Covered Contracts', 'Writing Requirements', 'Exceptions'],
    'Parol Evidence': ['Integration', 'Exceptions', 'Interpretation'],
    'Conditions': ['Express', 'Implied', 'Precedent', 'Subsequent', 'Concurrent'],
    'Breach': ['Material', 'Minor', 'Anticipatory', 'Adequate Assurance'],
    'Remedies': ['Damages', 'Specific Performance', 'Restitution', 'Liquidated Damages'],
    'Third Parties': ['Assignment', 'Delegation', 'Third-Party Beneficiaries'],
    'UCC Article 2': ['Goods', 'Merchants', 'Battle of Forms', 'Warranties', 'Perfect Tender']
  },
  'Criminal Law/Procedure': {
    'Homicide': ['Murder', 'Voluntary Manslaughter', 'Involuntary Manslaughter', 'Felony Murder'],
    'Crimes Against Person': ['Battery', 'Assault', 'Kidnapping', 'Rape'],
    'Crimes Against Property': ['Larceny', 'Embezzlement', 'False Pretenses', 'Robbery', 'Burglary'],
    'Inchoate Crimes': ['Attempt', 'Conspiracy', 'Solicitation'],
    'Accomplice Liability': ['Principal', 'Accessory', 'Withdrawal'],
    'Defenses': ['Self-Defense', 'Insanity', 'Intoxication', 'Mistake', 'Necessity'],
    'Fourth Amendment': ['Search', 'Seizure', 'Warrant Requirements', 'Exceptions'],
    'Fifth Amendment': ['Miranda', 'Double Jeopardy', 'Self-Incrimination'],
    'Sixth Amendment': ['Right to Counsel', 'Confrontation', 'Jury Trial', 'Speedy Trial'],
    'Pretrial': ['Bail', 'Grand Jury', 'Preliminary Hearing'],
    'Guilty Pleas': ['Voluntariness', 'Plea Bargaining', 'Withdrawal']
  },
  'Evidence': {
    'Relevance': ['Probative Value', 'Unfair Prejudice', 'Limited Admissibility'],
    'Character Evidence': ['Civil Cases', 'Criminal Cases', 'Methods of Proof', 'MIMIC'],
    'Impeachment': ['Prior Inconsistent Statements', 'Bias', 'Capacity', 'Prior Convictions'],
    'Hearsay': ['Definition', 'Non-Hearsay', 'Exemptions', 'Exceptions'],
    'Confrontation Clause': ['Testimonial', 'Crawford', 'Forfeiture'],
    'Opinion Testimony': ['Lay Witnesses', 'Expert Witnesses', 'Daubert', 'Bases'],
    'Privileges': ['Attorney-Client', 'Spousal', 'Doctor-Patient', 'Psychotherapist'],
    'Authentication': ['Documents', 'Real Evidence', 'Chain of Custody'],
    'Best Evidence Rule': ['Original Writing', 'Duplicates', 'Exceptions']
  },
  'Real Property': {
    'Estates': ['Fee Simple', 'Life Estate', 'Fee Tail', 'Defeasible Fees'],
    'Concurrent Ownership': ['Joint Tenancy', 'Tenancy in Common', 'Tenancy by Entirety'],
    'Landlord-Tenant': ['Leasehold Estates', 'Duties', 'Eviction', 'Assignment/Sublease'],
    'Easements': ['Creation', 'Scope', 'Termination', 'Profits', 'Licenses'],
    'Covenants': ['Real Covenants', 'Equitable Servitudes', 'Running with Land'],
    'Sales': ['Marketable Title', 'Equitable Conversion', 'Risk of Loss'],
    'Deeds': ['Types', 'Delivery', 'Warranties', 'Merger'],
    'Mortgages': ['Creation', 'Foreclosure', 'Redemption', 'Transfers'],
    'Recording Acts': ['Notice', 'Race', 'Race-Notice', 'Chain of Title'],
    'Adverse Possession': ['Elements', 'Tacking', 'Disabilities'],
    'Zoning': ['Nonconforming Use', 'Variances', 'Special Permits']
  },
  'Torts': {
    'Intentional Torts - Person': ['Battery', 'Assault', 'False Imprisonment', 'IIED'],
    'Intentional Torts - Property': ['Trespass to Land', 'Trespass to Chattels', 'Conversion'],
    'Defenses to Intentional Torts': ['Consent', 'Self-Defense', 'Defense of Others/Property'],
    'Negligence - Duty': ['General Duty', 'Special Relationships', 'Premises Liability'],
    'Negligence - Breach': ['Reasonable Person', 'Custom', 'Res Ipsa Loquitur'],
    'Negligence - Causation': ['Factual', 'Proximate', 'Intervening Causes'],
    'Negligence - Damages': ['Personal Injury', 'Property Damage', 'Economic Loss'],
    'Negligence - Defenses': ['Contributory', 'Comparative', 'Assumption of Risk'],
    'Strict Liability': ['Animals', 'Abnormally Dangerous', 'Defenses'],
    'Products Liability': ['Manufacturing', 'Design', 'Warning', 'Defenses'],
    'Vicarious Liability': ['Respondeat Superior', 'Independent Contractors', 'Joint Enterprise'],
    'Nuisance': ['Public', 'Private', 'Remedies'],
    'Defamation': ['Libel', 'Slander', 'Privileges', 'Public Figures'],
    'Privacy': ['Intrusion', 'Disclosure', 'False Light', 'Appropriation'],
    'Economic Torts': ['Fraud', 'Interference with Contract', 'Interference with Prospective Advantage']
  }
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

// Get all subtopics for a subject (flattened list)
export function getSubtopicsForSubject(subject) {
  const subjectData = SUBJECTS[subject];
  if (!subjectData) return [];
  
  const allSubtopics = [];
  for (const [subtopic, areas] of Object.entries(subjectData)) {
    // Add the main subtopic
    allSubtopics.push(subtopic);
    // Add all specific areas as "Subtopic/Area" format
    if (Array.isArray(areas)) {
      areas.forEach(area => {
        allSubtopics.push(`${subtopic}/${area}`);
      });
    }
  }
  return allSubtopics;
}

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
  
  // Try to match against canonical subtopics and areas
  for (const [subject, subtopicData] of Object.entries(SUBJECTS)) {
    for (const [subtopic, areas] of Object.entries(subtopicData)) {
      // Check main subtopic
      if (subtopic.toLowerCase() === cleaned) {
        return subtopic;
      }
      // Check specific areas
      if (Array.isArray(areas)) {
        for (const area of areas) {
          if (area.toLowerCase() === cleaned) {
            return `${subtopic}/${area}`;
          }
        }
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
  
  // Check each subject and its subtopics
  for (const [subject, subtopicData] of Object.entries(SUBJECTS)) {
    for (const [mainSubtopic, areas] of Object.entries(subtopicData)) {
      // Check if it matches the main subtopic
      if (mainSubtopic === normalized) {
        return subject;
      }
      // Check if it matches a specific area (e.g., "Jurisdiction/Federal Question")
      if (normalized.startsWith(mainSubtopic + '/')) {
        return subject;
      }
      // Check all areas
      if (Array.isArray(areas)) {
        for (const area of areas) {
          if (`${mainSubtopic}/${area}` === normalized) {
            return subject;
          }
        }
      }
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