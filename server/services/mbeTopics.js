// Comprehensive MBE Topics and Subtopics Structure
export const MBE_TOPICS = {
  'Civ Pro': {
    name: 'Civil Procedure',
    subtopics: {
      'jurisdiction': {
        name: 'Jurisdiction',
        areas: [
          'Subject-matter jurisdiction (federal question, diversity, supplemental)',
          'Personal jurisdiction (traditional bases, long-arm statutes, minimum contacts)',
          'Removal & remand'
        ]
      },
      'venue': {
        name: 'Venue and Transfer',
        areas: [
          'Proper venue rules',
          'Forum non conveniens'
        ]
      },
      'pleadings': {
        name: 'Pleadings',
        areas: [
          'Complaint requirements',
          'Rule 12 motions',
          'Answer and amendments'
        ]
      },
      'joinder': {
        name: 'Joinder',
        areas: [
          'Joinder of claims and parties',
          'Impleader, intervention, interpleader',
          'Class actions'
        ]
      },
      'pretrial': {
        name: 'Pretrial Procedures',
        areas: [
          'Discovery scope, devices, sanctions'
        ]
      },
      'motions': {
        name: 'Motions',
        areas: [
          'Summary judgment',
          'Judgment as a matter of law (JMOL) & renewed JMOL',
          'Default judgment'
        ]
      },
      'trial': {
        name: 'Trial and Post-Trial',
        areas: [
          'Jury trial right',
          'Verdicts, relief, post-trial motions'
        ]
      },
      'appellate': {
        name: 'Appellate Review',
        areas: [
          'Final judgment rule, interlocutory appeals',
          'Standards of review'
        ]
      },
      'preclusion': {
        name: 'Preclusion',
        areas: [
          'Claim preclusion (res judicata)',
          'Issue preclusion (collateral estoppel)'
        ]
      }
    }
  },
  'Con Law': {
    name: 'Constitutional Law',
    subtopics: {
      'judicial_review': {
        name: 'Judicial Review',
        areas: [
          'Justiciability (standing, ripeness, mootness, political question)'
        ]
      },
      'separation_powers': {
        name: 'Separation of Powers',
        areas: [
          'Congressional, executive, judicial powers',
          'Checks and balances'
        ]
      },
      'federalism': {
        name: 'Federalism',
        areas: [
          'Preemption',
          'Dormant commerce clause',
          'Privileges and immunities',
          '10th Amendment limits (anti-commandeering)'
        ]
      },
      'individual_rights': {
        name: 'Individual Rights',
        areas: [
          'State action requirement',
          'Due Process (procedural & substantive)',
          'Equal Protection',
          'Takings Clause',
          'Contract Clause'
        ]
      },
      'first_amendment': {
        name: 'First Amendment',
        areas: [
          'Freedom of speech, press, association',
          'Religion (Establishment Clause, Free Exercise Clause)'
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
          'Offer, acceptance, consideration',
          'Defenses (capacity, mistake, fraud, duress, unconscionability)'
        ]
      },
      'statute_frauds': {
        name: 'Statute of Frauds',
        areas: [
          'Covered contracts, exceptions'
        ]
      },
      'interpretation': {
        name: 'Interpretation and Parol Evidence Rule',
        areas: []
      },
      'performance': {
        name: 'Performance',
        areas: [
          'Conditions (express, implied, constructive)',
          'Substantial performance'
        ]
      },
      'breach': {
        name: 'Breach',
        areas: [
          'Material vs. minor breach',
          'Anticipatory repudiation'
        ]
      },
      'remedies': {
        name: 'Remedies',
        areas: [
          'Expectation, reliance, restitution',
          'Specific performance',
          'UCC remedies'
        ]
      },
      'third_party': {
        name: 'Third-Party Issues',
        areas: [
          'Third-party beneficiaries',
          'Assignment and delegation'
        ]
      },
      'ucc_article2': {
        name: 'UCC Article 2',
        areas: [
          'Formation, firm offers, modification',
          'Risk of loss',
          'Warranties',
          'Seller\'s and buyer\'s remedies'
        ]
      }
    }
  },
  'Crim': {
    name: 'Criminal Law & Procedure',
    subtopics: {
      'homicide': {
        name: 'Homicide',
        areas: [
          'Murder (degrees, felony murder)',
          'Manslaughter (voluntary, involuntary)'
        ]
      },
      'other_crimes': {
        name: 'Other Crimes',
        areas: [
          'Theft (larceny, embezzlement, false pretenses, robbery)',
          'Burglary, arson',
          'Assault, battery, kidnapping, rape',
          'Inchoate offenses (attempt, solicitation, conspiracy)'
        ]
      },
      'defenses': {
        name: 'Defenses',
        areas: [
          'Self-defense, defense of others, property',
          'Insanity, intoxication, duress, necessity',
          'Mistake of fact/law'
        ]
      },
      'fourth_amendment': {
        name: 'Fourth Amendment',
        areas: [
          'Search and seizure, warrants, exceptions',
          'Exclusionary rule, fruit of the poisonous tree'
        ]
      },
      'fifth_amendment': {
        name: 'Fifth Amendment',
        areas: [
          'Miranda rights',
          'Double jeopardy'
        ]
      },
      'sixth_amendment': {
        name: 'Sixth Amendment',
        areas: [
          'Right to counsel, confrontation'
        ]
      },
      'pretrial_crim': {
        name: 'Pretrial',
        areas: [
          'Identification procedures',
          'Bail, preliminary hearings'
        ]
      },
      'trial_crim': {
        name: 'Trial',
        areas: [
          'Jury rights',
          'Plea bargaining'
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
          'Logical and legal relevance',
          'Rule 403 balancing'
        ]
      },
      'character': {
        name: 'Character Evidence',
        areas: [
          'Civil vs. criminal',
          'Methods of proving character'
        ]
      },
      'impeachment': {
        name: 'Impeachment',
        areas: [
          'Prior inconsistent statements',
          'Bias, prior convictions'
        ]
      },
      'hearsay': {
        name: 'Hearsay',
        areas: [
          'Definition, exclusions (801(d))',
          'Exceptions (803, 804, 807)'
        ]
      },
      'privileges': {
        name: 'Privileges',
        areas: [
          'Attorney-client, spousal, doctor-patient'
        ]
      },
      'authentication': {
        name: 'Authentication & Best Evidence Rule',
        areas: []
      },
      'judicial_notice': {
        name: 'Judicial Notice',
        areas: []
      },
      'opinion': {
        name: 'Opinion Testimony',
        areas: [
          'Lay vs. expert'
        ]
      }
    }
  },
  'Property': {
    name: 'Real Property',
    subtopics: {
      'ownership': {
        name: 'Ownership',
        areas: [
          'Present estates',
          'Future interests (remainders, executory interests)',
          'Rule Against Perpetuities'
        ]
      },
      'concurrent': {
        name: 'Concurrent Estates',
        areas: [
          'Joint tenancy, tenancy in common, tenancy by the entirety'
        ]
      },
      'landlord_tenant': {
        name: 'Landlord-Tenant Law',
        areas: [
          'Lease types, tenant and landlord duties',
          'Assignment, sublease'
        ]
      },
      'easements': {
        name: 'Easements, Covenants, Servitudes',
        areas: []
      },
      'real_estate_contracts': {
        name: 'Real Estate Contracts',
        areas: [
          'Statute of Frauds, marketable title',
          'Equitable conversion'
        ]
      },
      'deeds': {
        name: 'Deeds',
        areas: [
          'Types, delivery, covenants of title'
        ]
      },
      'mortgages': {
        name: 'Mortgages',
        areas: [
          'Lien theory vs. title theory',
          'Foreclosure'
        ]
      },
      'recording': {
        name: 'Recording',
        areas: [
          'Notice, race, race-notice statutes'
        ]
      },
      'adverse_possession': {
        name: 'Adverse Possession',
        areas: []
      }
    }
  },
  'Torts': {
    name: 'Torts',
    subtopics: {
      'intentional': {
        name: 'Intentional Torts',
        areas: [
          'Battery, assault, false imprisonment, IIED',
          'Trespass to land/chattels, conversion'
        ]
      },
      'defenses_torts': {
        name: 'Defenses',
        areas: [
          'Consent, self-defense, necessity'
        ]
      },
      'negligence': {
        name: 'Negligence',
        areas: [
          'Duty, breach, causation, damages',
          'Special duties (landowners, professionals)',
          'Negligence per se',
          'Res ipsa loquitur'
        ]
      },
      'strict_liability': {
        name: 'Strict Liability',
        areas: [
          'Abnormally dangerous activities',
          'Animals'
        ]
      },
      'products_liability': {
        name: 'Products Liability',
        areas: [
          'Negligence, strict liability, warranty'
        ]
      },
      'defamation_privacy': {
        name: 'Defamation & Privacy Torts',
        areas: []
      },
      'miscellaneous': {
        name: 'Miscellaneous',
        areas: [
          'Vicarious liability',
          'Joint and several liability'
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
  
  // Score each subtopic based on keyword matches
  let bestMatch = null;
  let highestScore = 0;
  
  for (const [key, subtopic] of Object.entries(subtopics)) {
    let score = 0;
    
    // Check subtopic name
    if (content.includes(subtopic.name.toLowerCase())) {
      score += 3;
    }
    
    // Check areas
    for (const area of subtopic.areas) {
      const keywords = area.toLowerCase().split(/[,()]/);
      for (const keyword of keywords) {
        if (keyword.trim() && content.includes(keyword.trim())) {
          score += 2;
        }
      }
    }
    
    if (score > highestScore) {
      highestScore = score;
      bestMatch = key;
    }
  }
  
  // If no strong match, return a default based on common patterns
  if (!bestMatch || highestScore < 3) {
    return getDefaultSubtopic(subject, content);
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