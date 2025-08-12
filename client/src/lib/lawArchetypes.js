// Enhanced law-themed archetypes with legal accessories and props
export const LAW_ARCHETYPES = {
  bases: ["humanoid", "beast", "arcane", "celestial", "construct", "undead", "elemental", "alien"],
  
  palettes: {
    "judicial_gold": "#d4af37",
    "lawyer_navy": "#1e3a8a", 
    "constitutional_purple": "#8b5cf6",
    "verdict_red": "#ef4444",
    "evidence_green": "#10b981",
    "statute_silver": "#64748b",
    "brief_blue": "#3b82f6",
    "precedent_bronze": "#8b4513"
  },
  
  // All props are law-themed
  props: [
    "gavel", "scales", "codex", "briefcase", "law_diploma", 
    "legal_pad", "quill", "constitution", "law_library", "courthouse_steps"
  ],
  
  categories: {
    corporate: {
      name: "Corporate",
      description: "Master of mergers, acquisitions, and shareholder disputes",
      icon: "briefcase"
    },
    whitecollarcriminal: {
      name: "White Collar Criminal", 
      description: "Defending executives and prosecuting financial crimes",
      icon: "gavel"
    },
    constitutional: {
      name: "Constitutional Scholar",
      description: "Protector of rights and interpreter of founding principles",
      icon: "scales"
    },
    publicdefender: {
      name: "Public Defenders",
      description: "Champion of the underrepresented and guardian of justice",
      icon: "codex"
    }
  },
  
  // Law-themed character archetypes
  archetypes: [
    // Corporate Law Category
    {
      id: "corporate_counsel",
      label: "Corporate Counsel",
      base: "humanoid",
      palette: "lawyer_navy",
      props: ["briefcase", "legal_pad", "law_diploma"],
      category: "corporate"
    },
    {
      id: "merger_maven",
      label: "M&A Maven", 
      base: "construct",
      palette: "statute_silver",
      props: ["briefcase", "codex", "scales"],
      category: "corporate"
    },
    {
      id: "securities_serpent",
      label: "Securities Serpent",
      base: "beast", 
      palette: "evidence_green",
      props: ["scales", "legal_pad", "briefcase"],
      category: "corporate"
    },
    
    // White Collar Criminal Category
    {
      id: "trial_hawk",
      label: "Trial Hawk",
      base: "beast",
      palette: "verdict_red", 
      props: ["gavel", "scales", "codex"],
      category: "whitecollarcriminal"
    },
    {
      id: "prosecutor_phoenix",
      label: "Fraud Falcon",
      base: "elemental",
      palette: "judicial_gold",
      props: ["gavel", "law_diploma", "scales"],
      category: "whitecollarcriminal"
    },
    {
      id: "defense_dragon", 
      label: "Executive Eagle",
      base: "arcane",
      palette: "constitutional_purple",
      props: ["codex", "briefcase", "scales"],
      category: "whitecollarcriminal"
    },
    
    // Constitutional Law Category
    {
      id: "constitutional_scholar",
      label: "Constitutional Scholar",
      base: "celestial",
      palette: "constitutional_purple",
      props: ["codex", "scales", "law_diploma"], 
      category: "constitutional"
    },
    {
      id: "rights_guardian",
      label: "Rights Guardian",
      base: "celestial",
      palette: "judicial_gold",
      props: ["scales", "constitution", "gavel"],
      category: "constitutional"
    },
    {
      id: "liberty_lioness",
      label: "Liberty Lioness", 
      base: "beast",
      palette: "brief_blue",
      props: ["scales", "codex", "law_diploma"],
      category: "constitutional"
    },
    
    // Public Defenders Category  
    {
      id: "jurisprudence_owl",
      label: "Justice Owl",
      base: "beast",
      palette: "precedent_bronze",
      props: ["codex", "quill", "law_library"],
      category: "publicdefender"
    },
    {
      id: "law_professor",
      label: "People's Champion", 
      base: "humanoid",
      palette: "constitutional_purple",
      props: ["codex", "law_diploma", "legal_pad"],
      category: "publicdefender"
    },
    {
      id: "research_wraith",
      label: "Court Crusader",
      base: "undead", 
      palette: "statute_silver",
      props: ["codex", "quill", "law_library"],
      category: "publicdefender"
    }
  ]
};

// Function to load law-themed archetype data
export function loadLawArchetypes() {
  return Promise.resolve(LAW_ARCHETYPES);
}

// Enhanced prop definitions with more legal accessories
export function getLawPropSVG(propName) {
  const lawProps = {
    constitution: `
      <g transform="translate(5,10)">
        <rect x="0" y="0" width="20" height="25" rx="2" fill="#f8f8ff" stroke="#1e40af" stroke-width="1"/>
        <text x="10" y="8" text-anchor="middle" font-size="3" fill="#1e40af" font-weight="bold">WE THE</text>
        <text x="10" y="12" text-anchor="middle" font-size="3" fill="#1e40af" font-weight="bold">PEOPLE</text>
        <path d="M3,15 L17,15 M3,18 L15,18 M3,21 L16,21" stroke="#333" stroke-width="0.3"/>
      </g>
    `,
    law_library: `
      <g transform="translate(5,75)">
        <rect x="0" y="0" width="6" height="20" rx="1" fill="#8b4513"/>
        <rect x="8" y="0" width="6" height="20" rx="1" fill="#a0522d"/>  
        <rect x="16" y="0" width="6" height="20" rx="1" fill="#654321"/>
        <text x="11" y="-2" text-anchor="middle" font-size="2.5" fill="#8b4513">LAW</text>
        <text x="11" y="24" text-anchor="middle" font-size="2" fill="#666">LIBRARY</text>
      </g>
    `,
    courthouse_steps: `
      <g transform="translate(0,85)">
        <rect x="10" y="0" width="100" height="8" fill="#e5e7eb"/>
        <rect x="15" y="-4" width="90" height="4" fill="#d1d5db"/>
        <rect x="20" y="-8" width="80" height="4" fill="#9ca3af"/>
        <text x="60" y="12" text-anchor="middle" font-size="3" fill="#374151">COURTHOUSE</text>
      </g>
    `
  };
  
  return lawProps[propName] || '';
}