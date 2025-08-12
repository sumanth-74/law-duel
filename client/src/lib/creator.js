export function getCharacterData() {
  try {
    const data = localStorage.getItem('characterData');
    return data ? JSON.parse(data) : { bases: [], palettes: {}, props: [], archetypes: [] };
  } catch (error) {
    console.error('Error loading character data:', error);
    return { bases: [], palettes: {}, props: [], archetypes: [] };
  }
}

// Import photorealistic character portraits
import wizardPortrait from '@assets/generated_images/Photorealistic_wizard_portrait_e5565b85.png';
import werewolfPortrait from '@assets/generated_images/Photorealistic_werewolf_portrait_fc511a15.png';
import golemPortrait from '@assets/generated_images/Photorealistic_stone_golem_portrait_8c705a4a.png';
import necromancerPortrait from '@assets/generated_images/Photorealistic_necromancer_portrait_7186375f.png';
import elementalPortrait from '@assets/generated_images/Photorealistic_fire_elemental_portrait_dbddd022.png';
import angelPortrait from '@assets/generated_images/Photorealistic_divine_angel_portrait_94c3a62d.png';
import alienPortrait from '@assets/generated_images/Photorealistic_alien_scholar_portrait_3e37dc62.png';
import sorcererPortrait from '@assets/generated_images/Photorealistic_dark_sorcerer_portrait_8eaaf1ab.png';
// Specific archetype portraits
import sphinxPortrait from '@assets/generated_images/Photorealistic_sphinx_portrait_7d9c1f15.png';
import hawkPortrait from '@assets/generated_images/Photorealistic_hawk_portrait_5834a384.png';
import dragonPortrait from '@assets/generated_images/Photorealistic_dragon_portrait_05f5ff29.png';
import serpentPortrait from '@assets/generated_images/Photorealistic_serpent_portrait_a322fcab.png';
import crowPortrait from '@assets/generated_images/crow_lawyer_portrait_962cc1e7.png';
import minotaurPortrait from '@assets/generated_images/minotaur_lawyer_portrait_b796d7ac.png';
import phoenixPortrait from '@assets/generated_images/phoenix_lawyer_portrait_7a2834bd.png';

export function getCharacterImage(base = "humanoid", archetypeId = null) {
  // Specific archetype mappings for better visual accuracy - no duplicates
  const specificArchetypes = {
    // Corporate characters - 8 unique portraits
    'due-diligence-dragon': dragonPortrait,
    'covenant-golem': golemPortrait,
    'prospectus-paladin': angelPortrait,
    'disclosure-djinn': elementalPortrait,
    'antitrust-automaton': wizardPortrait,
    'fiduciary-seraph': sphinxPortrait,
    'takeover-titan': sorcererPortrait,
    'compliance-chimera': werewolfPortrait,
    
    // White Collar Criminal characters - 8 unique portraits
    'insider-trading-hawk': hawkPortrait,
    'subpoena-phoenix': phoenixPortrait,
    'obstruction-minotaur': minotaurPortrait,
    'wiretap-wraith': necromancerPortrait,
    'forensic-basilisk': serpentPortrait,
    'rico-revenant': alienPortrait,
    'whistleblower-wyvern': crowPortrait,
    'fraudulent-scheme-specter': golemPortrait,
    
    // Constitutional Scholar characters - 8 unique portraits
    'strict-scrutiny-sphinx': sphinxPortrait,
    'viewpoint-viper': serpentPortrait,
    'incorporation-oracle': angelPortrait,
    'nondelegation-naga': dragonPortrait,
    'takings-titan': elementalPortrait,
    'prior-restraint-sorcerer': sorcererPortrait,
    'equal-protection-paladin': wizardPortrait,
    'dormant-commerce-gargoyle': werewolfPortrait,
    
    // Public Defender characters - 8 unique portraits
    'gideon-crow': crowPortrait,
    'miranda-crow': hawkPortrait,
    'suppression-wraith': necromancerPortrait,
    'probable-cause-kraken': alienPortrait,
    'speedy-trial-sprite': elementalPortrait,
    'reasonable-doubt-revenant': phoenixPortrait,
    'brady-banshee': minotaurPortrait,
    'ineffective-assistance-shade': golemPortrait
  };
  
  // Debug logging to see what's being passed
  // console.log('getCharacterImage called with:', { base, archetypeId });
  // console.log('Available specific archetypes:', Object.keys(specificArchetypes));
  
  // If specific archetype mapping exists, use it
  if (archetypeId && specificArchetypes[archetypeId]) {
    // console.log('Using specific archetype image for:', archetypeId);
    return specificArchetypes[archetypeId];
  }
  
  // Otherwise use base type mapping (divine angel no longer used for celestial base)
  const imageMap = {
    humanoid: wizardPortrait,
    beast: alienPortrait, // Default beast creatures get alien look for variety
    construct: golemPortrait,
    undead: necromancerPortrait,
    elemental: elementalPortrait,
    celestial: wizardPortrait, // Use wizard instead of angel since angel is now the logo
    alien: alienPortrait,
    arcane: sorcererPortrait
  };
  
  return imageMap[base] || wizardPortrait;
}

export function renderAvatarSVG({ base = "humanoid", palette = "#5865f2", props = [], archetypeId = null }, scale = 1) {
  const size = 120 * scale;
  const characterImage = getCharacterImage(base, archetypeId);
  
  return `
    <svg width="${size}" height="${size}" viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="bgGrad${Date.now()}" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="${palette}" stop-opacity="0.1"/>
          <stop offset="100%" stop-color="${palette}" stop-opacity="0.05"/>
        </linearGradient>
        <clipPath id="portraitClip${Date.now()}">
          <rect x="8" y="8" width="104" height="104" rx="12"/>
        </clipPath>
      </defs>
      
      <!-- Background with palette-colored border -->
      <rect x="2" y="2" width="116" height="116" rx="16" fill="url(#bgGrad${Date.now()})" stroke="${palette}" stroke-width="2"/>
      
      <!-- Photorealistic character portrait -->
      <image href="${characterImage}" x="8" y="8" width="104" height="104" clip-path="url(#portraitClip${Date.now()})" />
      
      <!-- Props overlay -->
      ${props.map(prop => getPropSVG(prop)).join('')}
    </svg>
  `;
}

function getPropSVG(propName) {
  const propMap = {
    gavel: `
      <g transform="translate(75,70)">
        <rect x="15" y="2" width="4" height="18" rx="2" fill="#8b4513"/>
        <ellipse cx="12" cy="8" rx="8" ry="5" fill="#daa520"/>
        <circle cx="12" cy="8" r="2" fill="#fff" opacity="0.8"/>
        <text x="12" y="25" text-anchor="middle" font-size="4" fill="#666">LAW</text>
      </g>
    `,
    scales: `
      <g>
        <rect x="58" y="55" width="4" height="20" rx="2" fill="#daa520"/>
        <rect x="35" y="67" width="50" height="2" rx="1" fill="#daa520"/>
        <circle cx="40" cy="75" r="6" fill="none" stroke="#b8860b" stroke-width="2"/>
        <circle cx="80" cy="75" r="6" fill="none" stroke="#b8860b" stroke-width="2"/>
        <path d="M40,62 L40,75 M80,62 L80,75" stroke="#666" stroke-width="1.5"/>
        <text x="60" y="52" text-anchor="middle" font-size="3" fill="#daa520">JUSTICE</text>
      </g>
    `,
    codex: `
      <g transform="translate(10,75)">
        <rect x="0" y="0" width="24" height="18" rx="2" fill="#8b4513"/>
        <rect x="2" y="2" width="20" height="14" fill="#a0522d"/>
        <path d="M4,5 L20,5 M4,8 L18,8 M4,11 L19,11 M4,14 L17,14" stroke="#daa520" stroke-width="0.8"/>
        <circle cx="12" cy="9" r="2.5" fill="none" stroke="#ffd700" stroke-width="1"/>
        <text x="12" y="-2" text-anchor="middle" font-size="3" fill="#8b4513">LAW BOOKS</text>
      </g>
    `,
    briefcase: `
      <g transform="translate(80,75)">
        <rect x="0" y="0" width="20" height="14" rx="2" fill="#654321"/>
        <rect x="2" y="2" width="16" height="10" fill="#8b4513"/>
        <rect x="8" y="-2" width="4" height="4" rx="1" fill="#daa520"/>
        <circle cx="15" cy="7" r="1" fill="#ffd700"/>
        <text x="10" y="18" text-anchor="middle" font-size="2.5" fill="#654321">LEGAL</text>
      </g>
    `,
    law_diploma: `
      <g transform="translate(85,15)">
        <rect x="0" y="0" width="18" height="12" rx="1" fill="#f8f8ff" stroke="#daa520" stroke-width="1"/>
        <rect x="2" y="2" width="14" height="8" fill="#fff"/>
        <path d="M4,4 L14,4 M4,6 L12,6 M4,8 L13,8" stroke="#333" stroke-width="0.3"/>
        <circle cx="9" cy="6" r="1.5" fill="none" stroke="#daa520" stroke-width="0.5"/>
        <text x="9" y="14" text-anchor="middle" font-size="2" fill="#daa520">J.D.</text>
      </g>
    `,
    legal_pad: `
      <g transform="translate(85,70)">
        <rect x="0" y="0" width="16" height="20" rx="1" fill="#ffff99" stroke="#ddd" stroke-width="0.5"/>
        <path d="M2,3 L14,3 M2,6 L12,6 M2,9 L13,9 M2,12 L11,12" stroke="#333" stroke-width="0.3"/>
        <rect x="0" y="0" width="16" height="3" fill="#ff6b6b"/>
        <text x="8" y="24" text-anchor="middle" font-size="2" fill="#333">NOTES</text>
      </g>
    `,
    quill: `
      <g transform="translate(15,70)"
        <path d="M0,8 Q8,2 16,8 Q12,12 8,16 Q4,12 0,8" fill="#f5f5dc" stroke="#daa520" stroke-width="1"/>
        <path d="M16,8 L22,12" fill="#8b4513" stroke-width="2"/>
        <ellipse cx="20" cy="11" rx="2" ry="1.5" fill="#4b0082"/>
        <circle cx="8" cy="6" r="0.5" fill="#daa520"/>
      </g>
    `,
    orb: `
      <g transform="translate(85,65)">
        <circle cx="0" cy="0" r="8" fill="#4b0082" opacity="0.8" stroke="#8a2be2" stroke-width="2"/>
        <circle cx="0" cy="0" r="5" fill="#9370db" opacity="0.6"/>
        <circle cx="-2" cy="-2" r="2" fill="#dda0dd" opacity="0.8"/>
      </g>
    `,
    wand: `
      <g transform="translate(20,75)">
        <rect x="0" y="10" width="20" height="2" rx="1" fill="#8b4513"/>
        <circle cx="20" cy="11" r="3" fill="#daa520"/>
        <circle cx="20" cy="11" r="1.5" fill="#fff" opacity="0.8"/>
        <path d="M18,8 L22,8 L22,14 L18,14" stroke="#daa520" stroke-width="0.5" fill="none"/>
      </g>
    `,
    crystal: `
      <g transform="translate(15,85)">
        <path d="M5,0 L10,5 L5,15 L0,5 Z" fill="#87ceeb" stroke="#4682b4" stroke-width="1.5"/>
        <path d="M2,7 L8,7" stroke="#b0e0e6" stroke-width="0.8"/>
        <circle cx="5" cy="10" r="1" fill="#ffffff" opacity="0.9"/>
      </g>
    `,
    tome: `
      <g transform="translate(5,80)">
        <rect x="0" y="0" width="15" height="20" rx="2" fill="#8b0000"/>
        <rect x="2" y="2" width="11" height="16" fill="#a0522d"/>
        <path d="M4,6 L11,6 M4,10 L11,10 M4,14 L11,14" stroke="#daa520" stroke-width="0.6"/>
        <circle cx="7.5" cy="10" r="1.5" fill="none" stroke="#ffd700" stroke-width="0.8"/>
      </g>
    `
  };
  
  return propMap[propName] || '';
}

export function saveCharacterData(data) {
  try {
    localStorage.setItem('characterData', JSON.stringify(data));
  } catch (error) {
    console.error('Error saving character data:', error);
  }
}

export async function loadArchetypes() {
  try {
    const response = await fetch('/api/archetypes');
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error loading archetypes:', error);
    return { bases: [], palettes: {}, props: [], archetypes: [] };
  }
}

export function sanitizeUsername(username) {
  if (typeof username !== 'string') return '';
  return username.replace(/[^a-zA-Z0-9\s]/g, '').slice(0, 18);
}

export function validateAvatarData(avatarData) {
  if (!avatarData || typeof avatarData !== 'object') return false;
  const validBases = ['humanoid', 'beast', 'construct', 'undead', 'elemental', 'celestial', 'alien', 'arcane'];
  if (!validBases.includes(avatarData.base)) return false;
  if (typeof avatarData.palette !== 'string') return false;
  if (!Array.isArray(avatarData.props)) return false;
  return true;
}