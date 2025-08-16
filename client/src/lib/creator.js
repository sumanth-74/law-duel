export function getCharacterData() {
  try {
    const data = localStorage.getItem('characterData');
    return data ? JSON.parse(data) : { bases: [], palettes: {}, props: [], archetypes: [] };
  } catch (error) {
    console.error('Error loading character data:', error);
    return { bases: [], palettes: {}, props: [], archetypes: [] };
  }
}

// Premium character portraits - each professionally crafted and unique
// Base fallback portraits for generic types
import wizardPortrait from '@assets/generated_images/Photorealistic_wizard_portrait_e5565b85.png';
import alienPortrait from '@assets/generated_images/Photorealistic_alien_scholar_portrait_3e37dc62.png';
import golemPortrait from '@assets/generated_images/Photorealistic_stone_golem_portrait_8c705a4a.png';
import necromancerPortrait from '@assets/generated_images/Photorealistic_necromancer_portrait_7186375f.png';
import elementalPortrait from '@assets/generated_images/Photorealistic_fire_elemental_portrait_dbddd022.png';
import sorcererPortrait from '@assets/generated_images/Photorealistic_dark_sorcerer_portrait_8eaaf1ab.png';

// Special character - Atticus the Purple Wizard Cat
import atticusPortrait from '@assets/generated_images/atticus_purple_wizard_cat.svg';

// Corporate characters
import dueDiligenceDragonPortrait from '@assets/generated_images/due_diligence_dragon_cd8c2457.png';
import covenantGolemPortrait from '@assets/generated_images/covenant_golem_lawyer_efb72961.png';
import prospectusPaladinPortrait from '@assets/generated_images/prospectus_paladin_angel_42222e5d.png';
import disclosureDjinnPortrait from '@assets/generated_images/disclosure_djinn_lawyer_137f6cee.png';
import antitrustAutomatonPortrait from '@assets/generated_images/antitrust_automaton_lawyer_3bfbdaae.png';
import fiduciarySeraphPortrait from '@assets/generated_images/fiduciary_seraph_lawyer_f46d9c65.png';
import takeoverTitanPortrait from '@assets/generated_images/takeover_titan_lawyer_cdc6929a.png';
import complianceChimeraPortrait from '@assets/generated_images/compliance_chimera_lawyer_8ea79779.png';

// White Collar Criminal specialists
import insiderTradingHawkPortrait from '@assets/generated_images/insider_trading_hawk_5d10c62f.png';
import subpoenaPhoenixPortrait from '@assets/generated_images/subpoena_phoenix_lawyer_aa447872.png';
import obstructionMinotaurPortrait from '@assets/generated_images/obstruction_minotaur_lawyer_3835e0e5.png';
import wiretapWraithPortrait from '@assets/generated_images/wiretap_wraith_lawyer_99e679fa.png';
import forensicBasiliskPortrait from '@assets/generated_images/forensic_basilisk_lawyer_d6b67d26.png';
import ricoRevenantPortrait from '@assets/generated_images/rico_revenant_lawyer_520cb5ab.png';
import whistleblowerWyvernPortrait from '@assets/generated_images/whistleblower_wyvern_lawyer_8dbd162a.png';
import fraudulentSchemeSpecterPortrait from '@assets/generated_images/fraudulent_scheme_specter_3464e696.png';

// Constitutional scholars
import strictScrutinySphinxPortrait from '@assets/generated_images/strict_scrutiny_sphinx_8d7f129c.png';
import viewpointViperPortrait from '@assets/generated_images/viewpoint_viper_lawyer_54ee03ca.png';
import incorporationOraclePortrait from '@assets/generated_images/incorporation_oracle_lawyer_e25d711f.png';
import nondelegationNagaPortrait from '@assets/generated_images/nondelegation_naga_lawyer_c7b4c43f.png';
import takingsTitanPortrait from '@assets/generated_images/takings_titan_lawyer_02a08667.png';
import priorRestraintSorcererPortrait from '@assets/generated_images/prior_restraint_sorcerer_07016049.png';
import equalProtectionPaladinPortrait from '@assets/generated_images/equal_protection_paladin_4ff6523d.png';
import dormantCommerceGargoylePortrait from '@assets/generated_images/dormant_commerce_gargoyle_05bd6c5e.png';

// Public defenders
import gideonCrowPortrait from '@assets/generated_images/gideon_crow_lawyer_45b27d6b.png';
import mirandaHawkPortrait from '@assets/generated_images/miranda_hawk_lawyer_a601bff6.png';
import suppressionWraithPortrait from '@assets/generated_images/suppression_wraith_lawyer_d176d969.png';
import probableCauseKrakenPortrait from '@assets/generated_images/probable_cause_kraken_4bc0708f.png';
import speedyTrialSpritePortrait from '@assets/generated_images/speedy_trial_sprite_84c295c2.png';
import reasonableDoubtRevenantPortrait from '@assets/generated_images/reasonable_doubt_revenant_bac9f508.png';
import bradyBansheePortrait from '@assets/generated_images/banshee_lawyer_portrait_c0258cbe.png';
import ineffectiveAssistanceShadePortrait from '@assets/generated_images/ineffective_assistance_shade_c0b0501e.png';

/**
 * @param {string} base - The character base type
 * @param {string|null} archetypeId - The specific archetype ID
 * @returns {string} - Image URL for the character
 */
export function getCharacterImage(base = "humanoid", archetypeId = null) {
  // Special characters first
  if (archetypeId === 'atticus' || base === 'atticus') {
    return atticusPortrait;
  }
  
  // Premium character mappings - each with professionally crafted unique portrait
  const specificArchetypes = {
    // Atticus the Purple Wizard Cat
    'atticus': atticusPortrait,
    
    // Corporate characters - 8 unique business professionals
    'due-diligence-dragon': dueDiligenceDragonPortrait,
    'covenant-golem': covenantGolemPortrait,
    'prospectus-paladin': prospectusPaladinPortrait,
    'disclosure-djinn': disclosureDjinnPortrait,
    'antitrust-automaton': antitrustAutomatonPortrait,
    'fiduciary-seraph': fiduciarySeraphPortrait,
    'takeover-titan': takeoverTitanPortrait,
    'compliance-chimera': complianceChimeraPortrait,
    
    // White Collar Criminal specialists - 8 unique investigators/prosecutors
    'insider-trading-hawk': insiderTradingHawkPortrait,
    'subpoena-phoenix': subpoenaPhoenixPortrait,
    'obstruction-minotaur': obstructionMinotaurPortrait,
    'wiretap-wraith': wiretapWraithPortrait,
    'forensic-basilisk': forensicBasiliskPortrait,
    'rico-revenant': ricoRevenantPortrait,
    'whistleblower-wyvern': whistleblowerWyvernPortrait,
    'fraudulent-scheme-specter': fraudulentSchemeSpecterPortrait,
    
    // Constitutional scholars - 8 unique academic experts
    'strict-scrutiny-sphinx': strictScrutinySphinxPortrait,
    'viewpoint-viper': viewpointViperPortrait,
    'incorporation-oracle': incorporationOraclePortrait,
    'nondelegation-naga': nondelegationNagaPortrait,
    'takings-titan': takingsTitanPortrait,
    'prior-restraint-sorcerer': priorRestraintSorcererPortrait,
    'equal-protection-paladin': equalProtectionPaladinPortrait,
    'dormant-commerce-gargoyle': dormantCommerceGargoylePortrait,
    
    // Public defenders - 8 unique justice advocates
    'gideon-crow': gideonCrowPortrait,
    'miranda-hawk': mirandaHawkPortrait,
    'suppression-wraith': suppressionWraithPortrait,
    'probable-cause-kraken': probableCauseKrakenPortrait,
    'speedy-trial-sprite': speedyTrialSpritePortrait,
    'reasonable-doubt-revenant': reasonableDoubtRevenantPortrait,
    'brady-banshee': bradyBansheePortrait,
    'ineffective-assistance-shade': ineffectiveAssistanceShadePortrait
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

/**
 * @param {Object} avatarData - Avatar configuration object
 * @param {string} avatarData.base - The character base type
 * @param {string} avatarData.palette - Color palette for the avatar
 * @param {Array} avatarData.props - Array of props/accessories
 * @param {string|null} avatarData.archetypeId - The specific archetype ID
 * @param {number} scale - Scale factor for the avatar
 * @returns {string} - SVG string for the avatar
 */
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