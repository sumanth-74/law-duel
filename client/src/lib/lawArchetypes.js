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
  
  // Law-themed character archetypes - comprehensive legal system
  archetypes: [
    // Corporate Law Category
    {
      id: "due-diligence-dragon",
      label: "Due-Diligence Dragon",
      base: "arcane",
      palette: "lawyer_navy",
      props: ["briefcase", "legal_pad", "law_diploma"],
      category: "corporate"
    },
    {
      id: "covenant-golem",
      label: "Covenant Golem", 
      base: "construct",
      palette: "statute_silver",
      props: ["briefcase", "codex", "scales"],
      category: "corporate"
    },
    {
      id: "prospectus-paladin",
      label: "Prospectus Paladin",
      base: "celestial", 
      palette: "evidence_green",
      props: ["scales", "legal_pad", "briefcase"],
      category: "corporate"
    },
    {
      id: "disclosure-djinn",
      label: "Disclosure Djinn",
      base: "elemental",
      palette: "judicial_gold",
      props: ["briefcase", "codex", "gavel"],
      category: "corporate"
    },
    {
      id: "antitrust-automaton",
      label: "Antitrust Automaton",
      base: "construct",
      palette: "verdict_red",
      props: ["scales", "legal_pad", "law_diploma"],
      category: "corporate"
    },
    {
      id: "fiduciary-seraph",
      label: "Fiduciary Seraph",
      base: "celestial",
      palette: "constitutional_purple",
      props: ["scales", "constitution", "briefcase"],
      category: "corporate"
    },
    {
      id: "takeover-titan",
      label: "Takeover Titan",
      base: "construct",
      palette: "precedent_bronze",
      props: ["briefcase", "gavel", "codex"],
      category: "corporate"
    },
    {
      id: "compliance-chimera",
      label: "Compliance Chimera",
      base: "beast",
      palette: "brief_blue",
      props: ["legal_pad", "scales", "law_diploma"],
      category: "corporate"
    },
    
    // White Collar Criminal Category
    {
      id: "insider-trading-hawk",
      label: "Insider-Trading Hawk",
      base: "beast",
      palette: "verdict_red", 
      props: ["gavel", "scales", "codex"],
      category: "whitecollarcriminal"
    },
    {
      id: "subpoena-phoenix",
      label: "Subpoena Phoenix",
      base: "elemental",
      palette: "judicial_gold",
      props: ["gavel", "law_diploma", "scales"],
      category: "whitecollarcriminal"
    },
    {
      id: "obstruction-minotaur", 
      label: "Obstruction Minotaur",
      base: "beast",
      palette: "constitutional_purple",
      props: ["codex", "briefcase", "scales"],
      category: "whitecollarcriminal"
    },
    {
      id: "wiretap-wraith",
      label: "Wiretap Wraith",
      base: "undead",
      palette: "statute_silver",
      props: ["gavel", "codex", "legal_pad"],
      category: "whitecollarcriminal"
    },
    {
      id: "forensic-basilisk",
      label: "Forensic Basilisk",
      base: "beast",
      palette: "evidence_green",
      props: ["scales", "briefcase", "law_diploma"],
      category: "whitecollarcriminal"
    },
    {
      id: "rico-revenant",
      label: "RICO Revenant",
      base: "undead",
      palette: "precedent_bronze",
      props: ["gavel", "scales", "codex"],
      category: "whitecollarcriminal"
    },
    {
      id: "whistleblower-wyvern",
      label: "Whistleblower Wyvern",
      base: "beast",
      palette: "brief_blue",
      props: ["legal_pad", "law_diploma", "scales"],
      category: "whitecollarcriminal"
    },
    {
      id: "fraudulent-scheme-specter",
      label: "Fraudulent-Scheme Specter",
      base: "undead",
      palette: "lawyer_navy",
      props: ["briefcase", "gavel", "codex"],
      category: "whitecollarcriminal"
    },
    
    // Constitutional Scholar Category
    {
      id: "strict-scrutiny-sphinx",
      label: "Strict-Scrutiny Sphinx",
      base: "celestial",
      palette: "constitutional_purple",
      props: ["codex", "scales", "law_diploma"], 
      category: "constitutional"
    },
    {
      id: "viewpoint-viper",
      label: "Viewpoint Viper", 
      base: "beast",
      palette: "brief_blue",
      props: ["scales", "codex", "law_diploma"],
      category: "constitutional"
    },
    {
      id: "incorporation-oracle",
      label: "Incorporation Oracle",
      base: "celestial",
      palette: "judicial_gold",
      props: ["constitution", "scales", "gavel"],
      category: "constitutional"
    },
    {
      id: "nondelegation-naga",
      label: "Nondelegation Naga",
      base: "beast",
      palette: "evidence_green",
      props: ["codex", "constitution", "scales"],
      category: "constitutional"
    },
    {
      id: "takings-titan",
      label: "Takings Titan",
      base: "construct",
      palette: "precedent_bronze",
      props: ["scales", "law_diploma", "gavel"],
      category: "constitutional"
    },
    {
      id: "prior-restraint-sorcerer",
      label: "Prior-Restraint Sorcerer",
      base: "arcane",
      palette: "statute_silver",
      props: ["codex", "constitution", "legal_pad"],
      category: "constitutional"
    },
    {
      id: "equal-protection-paladin",
      label: "Equal-Protection Paladin",
      base: "celestial",
      palette: "verdict_red",
      props: ["scales", "constitution", "gavel"],
      category: "constitutional"
    },
    {
      id: "dormant-commerce-gargoyle",
      label: "Dormant-Commerce Gargoyle",
      base: "construct",
      palette: "lawyer_navy",
      props: ["codex", "scales", "briefcase"],
      category: "constitutional"
    },
    
    // Public Defenders Category  
    {
      id: "gideon-crow",
      label: "Gideon Crow",
      base: "beast",
      palette: "precedent_bronze",
      props: ["codex", "constitution", "law_library"],
      category: "publicdefender"
    },
    {
      id: "miranda-crow",
      label: "Miranda Crow",
      base: "beast",
      palette: "constitutional_purple",
      props: ["constitution", "gavel", "legal_pad"],
      category: "publicdefender"
    },
    {
      id: "suppression-wraith",
      label: "Suppression Wraith",
      base: "undead", 
      palette: "statute_silver",
      props: ["codex", "gavel", "law_library"],
      category: "publicdefender"
    },
    {
      id: "probable-cause-kraken",
      label: "Probable-Cause Kraken", 
      base: "alien",
      palette: "brief_blue",
      props: ["scales", "constitution", "legal_pad"],
      category: "publicdefender"
    },
    {
      id: "speedy-trial-sprite",
      label: "Speedy-Trial Sprite",
      base: "elemental",
      palette: "evidence_green",
      props: ["gavel", "constitution", "scales"],
      category: "publicdefender"
    },
    {
      id: "reasonable-doubt-revenant",
      label: "Reasonable-Doubt Revenant",
      base: "undead",
      palette: "judicial_gold",
      props: ["scales", "codex", "gavel"],
      category: "publicdefender"
    },
    {
      id: "brady-banshee",
      label: "Brady Banshee",
      base: "undead",
      palette: "verdict_red",
      props: ["legal_pad", "constitution", "law_diploma"],
      category: "publicdefender"
    },
    {
      id: "ineffective-assistance-shade",
      label: "Ineffective-Assistance Shade",
      base: "undead",
      palette: "lawyer_navy",
      props: ["codex", "constitution", "gavel"],
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