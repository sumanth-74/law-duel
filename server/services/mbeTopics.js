// Comprehensive MBE Topics and Subtopics Structure
export const MBE_TOPICS = {
  'Civ Pro': {
    name: 'Civil Procedure',
    subtopics: {
      'jurisdiction': {
        name: 'Jurisdiction',
        areas: [
          'Subject matter jurisdiction',
          'Federal question jurisdiction',
          'Diversity jurisdiction',
          'Supplemental jurisdiction'
        ]
      },
      'personal_jurisdiction': {
        name: 'Personal Jurisdiction',
        areas: [
          'Minimum contacts',
          'Specific vs. general jurisdiction',
          'Long-arm statutes'
        ]
      },
      'venue': {
        name: 'Venue and Forum Non Conveniens',
        areas: [
          'Proper venue rules',
          'Forum non conveniens',
          'Transfer of venue'
        ]
      },
      'service': {
        name: 'Service of Process and Notice',
        areas: [
          'Service requirements',
          'Notice requirements',
          'Waiver of service'
        ]
      },
      'pleadings': {
        name: 'Pleadings',
        areas: [
          'Complaint requirements',
          'Answer requirements',
          'Amendments',
          'Rule 11 sanctions'
        ]
      },
      'joinder': {
        name: 'Joinder',
        areas: [
          'Parties and claims',
          'Intervention',
          'Interpleader',
          'Class actions'
        ]
      },
      'discovery': {
        name: 'Discovery',
        areas: [
          'Scope of discovery',
          'Privileges',
          'Work product',
          'Discovery sanctions'
        ]
      },
      'summary_judgment': {
        name: 'Summary Judgment and JMOL',
        areas: [
          'Summary judgment standards',
          'Judgment as a matter of law',
          'Renewed JMOL'
        ]
      },
      'trial': {
        name: 'Trial Process',
        areas: [
          'Jury selection',
          'Evidence presentation',
          'Verdicts'
        ]
      },
      'appeals': {
        name: 'Appeals',
        areas: [
          'Final judgment rule',
          'Interlocutory appeals',
          'Standards of review'
        ]
      },
      'preclusion': {
        name: 'Res Judicata and Collateral Estoppel',
        areas: [
          'Claim preclusion (res judicata)',
          'Issue preclusion (collateral estoppel)'
        ]
      },
      'erie': {
        name: 'Erie Doctrine',
        areas: [
          'State vs. federal law',
          'Substantive vs. procedural'
        ]
      }
    }
  },
  'Con Law': {
    name: 'Constitutional Law',
    subtopics: {
      'judicial_review': {
        name: 'Judicial Review and Justiciability',
        areas: [
          'Standing',
          'Ripeness',
          'Mootness',
          'Political question doctrine',
          'Adequate and independent state grounds'
        ]
      },
      'separation_powers': {
        name: 'Separation of Powers',
        areas: [
          'Congressional powers',
          'Executive powers',
          'Judicial powers',
          'Checks and balances'
        ]
      },
      'federalism': {
        name: 'Federalism',
        areas: [
          'Commerce Clause',
          'Dormant Commerce Clause',
          'Preemption',
          'Privileges and Immunities'
        ]
      },
      'individual_rights': {
        name: 'Individual Rights',
        areas: [
          'State action doctrine',
          'Incorporation doctrine'
        ]
      },
      'due_process': {
        name: 'Due Process',
        areas: [
          'Procedural due process',
          'Substantive due process',
          'Economic liberties',
          'Fundamental rights'
        ]
      },
      'equal_protection': {
        name: 'Equal Protection',
        areas: [
          'Rational basis review',
          'Intermediate scrutiny',
          'Strict scrutiny',
          'Suspect classifications'
        ]
      },
      'first_amendment_speech': {
        name: 'First Amendment - Speech',
        areas: [
          'Content-based vs. content-neutral',
          'Public forums',
          'Commercial speech',
          'Symbolic speech'
        ]
      },
      'first_amendment_religion': {
        name: 'First Amendment - Religion',
        areas: [
          'Establishment Clause',
          'Free Exercise Clause',
          'Religious Freedom Restoration Act'
        ]
      },
      'takings': {
        name: 'Takings Clause',
        areas: [
          'Public use requirement',
          'Regulatory takings',
          'Exactions'
        ]
      },
      'contracts_clause': {
        name: 'Contracts Clause',
        areas: [
          'Impairment of contracts',
          'Public vs. private contracts'
        ]
      }
    }
  },
  'Contracts': {
    name: 'Contracts',
    subtopics: {
      'formation': {
        name: 'Formation',
        areas: [
          'Offer and acceptance',
          'Consideration',
          'Mailbox rule',
          'Mirror image rule'
        ]
      },
      'defenses': {
        name: 'Defenses to Formation',
        areas: [
          'Capacity',
          'Mistake',
          'Fraud and misrepresentation',
          'Duress and undue influence',
          'Unconscionability'
        ]
      },
      'statute_frauds': {
        name: 'Statute of Frauds',
        areas: [
          'Contracts within the statute',
          'Satisfaction methods',
          'Part performance exception'
        ]
      },
      'parol_evidence': {
        name: 'Parol Evidence Rule',
        areas: [
          'Integration',
          'Exceptions to the rule'
        ]
      },
      'conditions': {
        name: 'Conditions and Performance',
        areas: [
          'Express conditions',
          'Implied conditions',
          'Constructive conditions',
          'Excuse of conditions'
        ]
      },
      'breach': {
        name: 'Breach',
        areas: [
          'Material vs. minor breach',
          'Anticipatory repudiation',
          'Adequate assurance'
        ]
      },
      'remedies': {
        name: 'Remedies',
        areas: [
          'Expectation damages',
          'Reliance damages',
          'Restitution',
          'Specific performance',
          'Liquidated damages'
        ]
      },
      'third_party': {
        name: 'Third-Party Rights',
        areas: [
          'Third-party beneficiaries',
          'Assignment of rights',
          'Delegation of duties'
        ]
      },
      'ucc': {
        name: 'UCC Article 2 (Sales)',
        areas: [
          'Merchant rules',
          'Battle of the forms',
          'Perfect tender rule',
          'Warranties',
          'Risk of loss'
        ]
      }
    }
  },
  'Crim': {
    name: 'Criminal Law/Procedure',
    subtopics: {
      'homicide': {
        name: 'Homicide',
        areas: [
          'Common law murder',
          'First-degree murder',
          'Felony murder',
          'Voluntary manslaughter',
          'Involuntary manslaughter'
        ]
      },
      'crimes_against_person': {
        name: 'Crimes Against the Person',
        areas: [
          'Assault and battery',
          'Kidnapping',
          'Rape and sexual assault'
        ]
      },
      'crimes_against_property': {
        name: 'Crimes Against Property',
        areas: [
          'Larceny',
          'Embezzlement',
          'False pretenses',
          'Robbery',
          'Burglary',
          'Arson'
        ]
      },
      'inchoate': {
        name: 'Inchoate Crimes',
        areas: [
          'Attempt',
          'Solicitation',
          'Conspiracy'
        ]
      },
      'accomplice': {
        name: 'Accomplice Liability',
        areas: [
          'Principals and accessories',
          'Scope of liability'
        ]
      },
      'defenses': {
        name: 'Defenses',
        areas: [
          'Self-defense',
          'Defense of others',
          'Defense of property',
          'Insanity',
          'Intoxication',
          'Duress',
          'Necessity',
          'Mistake'
        ]
      },
      'fourth_amendment': {
        name: 'Fourth Amendment',
        areas: [
          'Search and seizure',
          'Warrant requirements',
          'Exceptions to warrant requirement',
          'Exclusionary rule'
        ]
      },
      'fifth_amendment': {
        name: 'Fifth Amendment',
        areas: [
          'Miranda rights',
          'Self-incrimination',
          'Double jeopardy'
        ]
      },
      'sixth_amendment': {
        name: 'Sixth Amendment',
        areas: [
          'Right to counsel',
          'Right to speedy trial',
          'Right to jury trial',
          'Confrontation clause'
        ]
      },
      'pretrial_proceedings': {
        name: 'Pretrial Proceedings',
        areas: [
          'Arrest and detention',
          'Initial appearance',
          'Preliminary hearing',
          'Grand jury',
          'Bail'
        ]
      },
      'guilty_pleas': {
        name: 'Guilty Pleas and Plea Bargaining',
        areas: [
          'Voluntariness',
          'Plea negotiations',
          'Withdrawal of pleas'
        ]
      }
    }
  },
  'Evidence': {
    name: 'Evidence',
    subtopics: {
      'relevance': {
        name: 'Relevance',
        areas: [
          'Logical relevance',
          'Legal relevance',
          'Rule 403 balancing test',
          'Limited admissibility'
        ]
      },
      'character': {
        name: 'Character Evidence',
        areas: [
          'Character evidence in civil cases',
          'Character evidence in criminal cases',
          'Methods of proving character',
          'Habit and routine practice'
        ]
      },
      'impeachment': {
        name: 'Impeachment',
        areas: [
          'Prior inconsistent statements',
          'Bias and interest',
          'Prior convictions',
          'Character for truthfulness',
          'Rehabilitation'
        ]
      },
      'hearsay': {
        name: 'Hearsay',
        areas: [
          'Definition of hearsay',
          'Non-hearsay statements',
          'Present sense impression',
          'Excited utterance',
          'Business records',
          'Dying declarations',
          'Statements against interest',
          'Former testimony'
        ]
      },
      'confrontation': {
        name: 'Confrontation Clause',
        areas: [
          'Crawford doctrine',
          'Testimonial vs. non-testimonial'
        ]
      },
      'opinion': {
        name: 'Opinion Testimony',
        areas: [
          'Lay opinion',
          'Expert testimony',
          'Daubert standard',
          'Basis of expert opinion'
        ]
      },
      'privileges': {
        name: 'Privileges',
        areas: [
          'Attorney-client privilege',
          'Spousal privileges',
          'Doctor-patient privilege',
          'Waiver of privilege'
        ]
      },
      'authentication': {
        name: 'Authentication and Best Evidence',
        areas: [
          'Authentication requirements',
          'Best evidence rule',
          'Secondary evidence',
          'Summaries'
        ]
      },
      'judicial_notice': {
        name: 'Judicial Notice',
        areas: [
          'Facts subject to judicial notice',
          'Effect of judicial notice'
        ]
      }
    }
  },
  'Property': {
    name: 'Real Property',
    subtopics: {
      'estates': {
        name: 'Present Estates and Future Interests',
        areas: [
          'Fee simple absolute',
          'Fee simple determinable',
          'Fee simple subject to condition subsequent',
          'Life estates',
          'Remainders',
          'Executory interests',
          'Rule Against Perpetuities'
        ]
      },
      'concurrent': {
        name: 'Concurrent Estates',
        areas: [
          'Joint tenancy',
          'Tenancy in common',
          'Tenancy by the entirety',
          'Rights and duties of co-tenants'
        ]
      },
      'landlord_tenant': {
        name: 'Landlord-Tenant Law',
        areas: [
          'Types of tenancies',
          'Landlord duties',
          'Tenant duties',
          'Assignment vs. sublease',
          'Eviction'
        ]
      },
      'easements': {
        name: 'Easements',
        areas: [
          'Creation of easements',
          'Scope of easements',
          'Termination of easements',
          'Licenses',
          'Profits'
        ]
      },
      'covenants': {
        name: 'Real Covenants and Equitable Servitudes',
        areas: [
          'Creation requirements',
          'Running with the land',
          'Enforcement',
          'Termination'
        ]
      },
      'sales': {
        name: 'Real Estate Sales',
        areas: [
          'Contract of sale',
          'Marketable title',
          'Equitable conversion',
          'Closing'
        ]
      },
      'deeds': {
        name: 'Deeds',
        areas: [
          'Types of deeds',
          'Delivery requirements',
          'Title covenants',
          'Merger doctrine'
        ]
      },
      'mortgages': {
        name: 'Mortgages',
        areas: [
          'Creation',
          'Rights and duties',
          'Foreclosure',
          'Redemption'
        ]
      },
      'recording': {
        name: 'Recording Acts',
        areas: [
          'Notice statutes',
          'Race statutes',
          'Race-notice statutes',
          'Chain of title'
        ]
      },
      'adverse_possession': {
        name: 'Adverse Possession',
        areas: [
          'Elements',
          'Tacking',
          'Disability provisions'
        ]
      },
      'zoning': {
        name: 'Zoning',
        areas: [
          'Non-conforming uses',
          'Variances',
          'Special use permits'
        ]
      }
    }
  },
  'Torts': {
    name: 'Torts',
    subtopics: {
      'intentional_person': {
        name: 'Intentional Torts to Person',
        areas: [
          'Battery',
          'Assault',
          'False imprisonment',
          'Intentional infliction of emotional distress'
        ]
      },
      'intentional_property': {
        name: 'Intentional Torts to Property',
        areas: [
          'Trespass to land',
          'Trespass to chattels',
          'Conversion'
        ]
      },
      'defenses_intentional': {
        name: 'Defenses to Intentional Torts',
        areas: [
          'Consent',
          'Self-defense',
          'Defense of others',
          'Defense of property',
          'Necessity'
        ]
      },
      'negligence': {
        name: 'Negligence',
        areas: [
          'Duty',
          'Breach',
          'Actual causation',
          'Proximate causation',
          'Damages'
        ]
      },
      'special_duties': {
        name: 'Special Duty Rules',
        areas: [
          'Premises liability',
          'Negligent infliction of emotional distress',
          'Professional malpractice',
          'Negligence per se',
          'Res ipsa loquitur'
        ]
      },
      'defenses_negligence': {
        name: 'Defenses to Negligence',
        areas: [
          'Contributory negligence',
          'Comparative negligence',
          'Assumption of risk',
          'Immunities'
        ]
      },
      'strict_liability': {
        name: 'Strict Liability',
        areas: [
          'Abnormally dangerous activities',
          'Wild animals',
          'Domestic animals'
        ]
      },
      'products_liability': {
        name: 'Products Liability',
        areas: [
          'Manufacturing defects',
          'Design defects',
          'Warning defects',
          'Defenses'
        ]
      },
      'vicarious_liability': {
        name: 'Vicarious Liability',
        areas: [
          'Respondeat superior',
          'Independent contractors',
          'Joint ventures'
        ]
      },
      'nuisance': {
        name: 'Nuisance',
        areas: [
          'Private nuisance',
          'Public nuisance',
          'Remedies'
        ]
      },
      'defamation': {
        name: 'Defamation',
        areas: [
          'Libel vs. slander',
          'Constitutional limitations',
          'Privileges'
        ]
      },
      'privacy': {
        name: 'Privacy Torts',
        areas: [
          'Intrusion',
          'Appropriation',
          'Public disclosure of private facts',
          'False light'
        ]
      },
      'economic_torts': {
        name: 'Economic Torts',
        areas: [
          'Misrepresentation',
          'Interference with contract',
          'Interference with prospective advantage'
        ]
      }
    }
  }
};

// Helper function to get all subtopics for a main subject
export function getSubtopicsForSubject(subject) {
  return MBE_TOPICS[subject]?.subtopics || {};
}

// Helper function to get a random subtopic for question generation
export function getRandomSubtopic(subject) {
  const subtopics = getSubtopicsForSubject(subject);
  const subtopicKeys = Object.keys(subtopics);
  if (subtopicKeys.length === 0) return null;
  
  const randomKey = subtopicKeys[Math.floor(Math.random() * subtopicKeys.length)];
  return {
    key: randomKey,
    ...subtopics[randomKey]
  };
}

// Helper to identify subtopic from question content
export function identifySubtopic(subject, questionText, explanation) {
  const subtopics = getSubtopicsForSubject(subject);
  const content = `${questionText} ${explanation}`.toLowerCase();
  
  // Score each subtopic and area based on keyword matches
  let bestMatch = null;
  let bestArea = null;
  let highestScore = 0;
  
  for (const [key, subtopic] of Object.entries(subtopics)) {
    let subtopicScore = 0;
    let bestAreaScore = 0;
    let bestAreaMatch = null;
    
    // Check subtopic name
    if (content.includes(subtopic.name.toLowerCase())) {
      subtopicScore += 3;
    }
    
    // Check each area within the subtopic
    for (const area of subtopic.areas) {
      let areaScore = 0;
      const areaLower = area.toLowerCase();
      
      // Check if area name appears in content
      if (content.includes(areaLower)) {
        areaScore += 5; // Strong match for exact area name
      }
      
      // Check keywords within the area name
      const keywords = areaLower.split(/[,()]/).map(k => k.trim()).filter(k => k.length > 2);
      for (const keyword of keywords) {
        if (content.includes(keyword)) {
          areaScore += 2;
        }
      }
      
      if (areaScore > bestAreaScore) {
        bestAreaScore = areaScore;
        bestAreaMatch = area;
      }
    }
    
    const totalScore = subtopicScore + bestAreaScore;
    if (totalScore > highestScore) {
      highestScore = totalScore;
      bestMatch = key;
      bestArea = bestAreaMatch;
    }
  }
  
  // If no strong match, return a default based on common patterns
  if (!bestMatch || highestScore < 3) {
    const defaultSubtopic = getDefaultSubtopic(subject, content);
    // For default, return just the subtopic without area
    return defaultSubtopic;
  }
  
  // Return in format "subtopic/area" if area was identified, otherwise just subtopic
  if (bestArea) {
    // Normalize area name to a key (e.g., "Offer and acceptance" -> "offer")
    const areaKey = bestArea.toLowerCase()
      .replace(/\s+and\s+/g, '/')
      .replace(/\s+/g, '_')
      .replace(/[^a-z0-9_/]/g, '')
      .split('/')[0]; // Take first part if multiple
    return `${bestMatch}/${areaKey}`;
  }
  
  return bestMatch;
}

// Default subtopic detection based on common patterns
function getDefaultSubtopic(subject, content) {
  const defaults = {
    'Civ Pro': 'jurisdiction',
    'Con Law': 'individual_rights',
    'Contracts': 'formation',
    'Crim': 'other_crimes',
    'Evidence': 'hearsay',
    'Property': 'ownership',
    'Torts': 'negligence'
  };
  
  return defaults[subject] || Object.keys(getSubtopicsForSubject(subject))[0];
}

export default MBE_TOPICS;