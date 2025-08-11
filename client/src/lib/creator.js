export async function loadArchetypes() {
  try {
    const response = await fetch('/api/archetypes');
    return await response.json();
  } catch (error) {
    console.error('Failed to load archetypes:', error);
    return { bases: [], palettes: {}, props: [], archetypes: [] };
  }
}

export function renderAvatarSVG({ base = "humanoid", palette = "#5865f2", props = [] }, scale = 1) {
  const size = 120 * scale;
  const gradientId = "grad_" + Math.random().toString(36).slice(2);
  const shadowId = "shadow_" + Math.random().toString(36).slice(2);
  
  // Enhanced character bases with detailed artwork
  const core = {
    humanoid: `
      <!-- Humanoid Body -->
      <ellipse cx="60" cy="25" rx="18" ry="22" fill="rgba(255,255,255,0.15)" stroke="rgba(255,255,255,0.3)" stroke-width="1"/>
      <path d="M42,45 Q60,35 78,45 L75,85 Q60,90 45,85 Z" fill="rgba(255,255,255,0.12)" stroke="rgba(255,255,255,0.25)" stroke-width="1"/>
      <circle cx="52" cy="20" r="3" fill="rgba(255,255,255,0.8)"/>
      <circle cx="68" cy="20" r="3" fill="rgba(255,255,255,0.8)"/>
      <path d="M55,28 Q60,32 65,28" stroke="rgba(255,255,255,0.6)" stroke-width="2" fill="none"/>
    `,
    beast: `
      <!-- Beast Form -->
      <ellipse cx="60" cy="30" rx="22" ry="18" fill="rgba(255,255,255,0.15)" stroke="rgba(255,255,255,0.3)" stroke-width="1"/>
      <path d="M35,48 Q60,40 85,48 L82,90 Q60,95 38,90 Z" fill="rgba(255,255,255,0.12)" stroke="rgba(255,255,255,0.25)" stroke-width="1"/>
      <circle cx="50" cy="25" r="4" fill="#ff4444"/>
      <circle cx="70" cy="25" r="4" fill="#ff4444"/>
      <path d="M48,15 Q50,10 52,15" stroke="rgba(255,255,255,0.8)" stroke-width="2"/>
      <path d="M68,15 Q70,10 72,15" stroke="rgba(255,255,255,0.8)" stroke-width="2"/>
      <path d="M55,35 Q60,38 65,35" stroke="rgba(255,255,255,0.6)" stroke-width="2" fill="none"/>
    `,
    construct: `
      <!-- Construct Body -->
      <rect x="38" y="15" width="44" height="25" rx="4" fill="rgba(255,255,255,0.15)" stroke="rgba(255,255,255,0.3)" stroke-width="1"/>
      <rect x="35" y="45" width="50" height="45" rx="6" fill="rgba(255,255,255,0.12)" stroke="rgba(255,255,255,0.25)" stroke-width="1"/>
      <rect x="50" y="20" width="6" height="6" fill="#00ffff"/>
      <rect x="64" y="20" width="6" height="6" fill="#00ffff"/>
      <rect x="45" y="55" width="8" height="8" fill="#00ffff" opacity="0.6"/>
      <rect x="67" y="55" width="8" height="8" fill="#00ffff" opacity="0.6"/>
      <rect x="56" y="70" width="8" height="8" fill="#00ffff" opacity="0.4"/>
    `,
    undead: `
      <!-- Undead Form -->
      <ellipse cx="60" cy="25" rx="20" ry="24" fill="rgba(100,0,100,0.2)" stroke="rgba(200,0,200,0.4)" stroke-width="1"/>
      <path d="M40,50 Q60,42 80,50 L78,88 Q60,92 42,88 Z" fill="rgba(100,0,100,0.15)" stroke="rgba(200,0,200,0.3)" stroke-width="1"/>
      <circle cx="52" cy="18" r="4" fill="#ff0066"/>
      <circle cx="68" cy="18" r="4" fill="#ff0066"/>
      <path d="M50,35 Q60,40 70,35" stroke="rgba(255,0,100,0.8)" stroke-width="2" fill="none"/>
      <path d="M45,25 L50,20 L45,15" stroke="rgba(200,0,200,0.6)" stroke-width="1" fill="none"/>
      <path d="M75,25 L70,20 L75,15" stroke="rgba(200,0,200,0.6)" stroke-width="1" fill="none"/>
    `,
    elemental: `
      <!-- Elemental Form -->
      <ellipse cx="60" cy="28" rx="25" ry="20" fill="rgba(255,150,0,0.3)" stroke="rgba(255,200,0,0.5)" stroke-width="2"/>
      <path d="M30,50 Q60,45 90,50 Q85,90 60,95 Q35,90 30,50 Z" fill="rgba(255,150,0,0.2)" stroke="rgba(255,200,0,0.4)" stroke-width="1"/>
      <circle cx="48" cy="22" r="5" fill="#ffff00"/>
      <circle cx="72" cy="22" r="5" fill="#ffff00"/>
      <path d="M52,40 Q60,45 68,40" stroke="rgba(255,200,0,0.8)" stroke-width="3" fill="none"/>
      <path d="M35,35 Q40,25 45,35" stroke="rgba(255,150,0,0.6)" stroke-width="2" fill="none"/>
      <path d="M75,35 Q80,25 85,35" stroke="rgba(255,150,0,0.6)" stroke-width="2" fill="none"/>
    `,
    celestial: `
      <!-- Celestial Being -->
      <ellipse cx="60" cy="25" rx="19" ry="23" fill="rgba(255,255,255,0.3)" stroke="rgba(255,255,100,0.8)" stroke-width="2"/>
      <path d="M40,48 Q60,40 80,48 L77,87 Q60,92 43,87 Z" fill="rgba(255,255,255,0.2)" stroke="rgba(255,255,100,0.6)" stroke-width="1"/>
      <circle cx="52" cy="18" r="4" fill="#ffffff"/>
      <circle cx="68" cy="18" r="4" fill="#ffffff"/>
      <path d="M55,30 Q60,34 65,30" stroke="rgba(255,255,255,0.9)" stroke-width="2" fill="none"/>
      <ellipse cx="60" cy="8" rx="15" ry="4" fill="none" stroke="#ffff00" stroke-width="2"/>
    `,
    alien: `
      <!-- Alien Form -->
      <ellipse cx="60" cy="35" rx="28" ry="25" fill="rgba(0,255,150,0.2)" stroke="rgba(0,255,200,0.4)" stroke-width="1"/>
      <path d="M32,60 Q60,55 88,60 L85,95 Q60,100 35,95 Z" fill="rgba(0,255,150,0.15)" stroke="rgba(0,255,200,0.3)" stroke-width="1"/>
      <ellipse cx="45" cy="25" rx="6" ry="8" fill="#00ff88"/>
      <ellipse cx="75" cy="25" rx="6" ry="8" fill="#00ff88"/>
      <path d="M50,45 Q60,50 70,45" stroke="rgba(0,255,200,0.8)" stroke-width="2" fill="none"/>
      <path d="M40,20 Q42,10 44,20" stroke="rgba(0,255,150,0.6)" stroke-width="1" fill="none"/>
      <path d="M76,20 Q78,10 80,20" stroke="rgba(0,255,150,0.6)" stroke-width="1" fill="none"/>
    `,
    arcane: `
      <!-- Arcane Mystic -->
      <ellipse cx="60" cy="26" rx="21" ry="22" fill="rgba(150,0,255,0.3)" stroke="rgba(200,100,255,0.6)" stroke-width="2"/>
      <path d="M38,48 Q60,42 82,48 L79,88 Q60,93 41,88 Z" fill="rgba(150,0,255,0.2)" stroke="rgba(200,100,255,0.4)" stroke-width="1"/>
      <circle cx="52" cy="19" r="4" fill="#aa00ff"/>
      <circle cx="68" cy="19" r="4" fill="#aa00ff"/>
      <path d="M55,32 Q60,36 65,32" stroke="rgba(200,100,255,0.9)" stroke-width="2" fill="none"/>
      <path d="M45,15 L50,8 L55,15" stroke="rgba(150,0,255,0.8)" stroke-width="2" fill="none"/>
      <path d="M65,15 L70,8 L75,15" stroke="rgba(150,0,255,0.8)" stroke-width="2" fill="none"/>
      <circle cx="60" cy="50" r="3" fill="#ff00ff" opacity="0.8"/>
    `
  }[base] || core.humanoid;

  // Enhanced props with detailed artwork
  const propMap = {
    gavel: `
      <g transform="translate(75,65)">
        <rect x="0" y="8" width="25" height="8" rx="4" fill="#d4b057" stroke="#8a6a1d" stroke-width="1"/>
        <rect x="20" y="2" width="8" height="20" rx="3" fill="#8a6a1d" stroke="#654a15" stroke-width="1"/>
        <ellipse cx="12" cy="12" rx="8" ry="3" fill="#f4d477"/>
      </g>
    `,
    scales: `
      <g>
        <circle cx="35" cy="70" r="8" stroke="#d4b057" stroke-width="2" fill="none"/>
        <circle cx="85" cy="70" r="8" stroke="#d4b057" stroke-width="2" fill="none"/>
        <path d="M35,62 L35,78 M85,62 L85,78" stroke="#d4b057" stroke-width="1"/>
        <path d="M43,70 L77,70" stroke="#d4b057" stroke-width="3"/>
        <circle cx="60" cy="70" r="2" fill="#d4b057"/>
      </g>
    `,
    codex: `
      <g transform="translate(12,75)">
        <rect x="0" y="0" width="25" height="18" rx="3" fill="#2b2f3a" stroke="#cbd5e1" stroke-width="1"/>
        <rect x="2" y="2" width="21" height="14" fill="#1a1d26"/>
        <path d="M4,5 L21,5 M4,8 L18,8 M4,11 L20,11 M4,14 L16,14" stroke="#cbd5e1" stroke-width="0.8"/>
        <rect x="22" y="8" width="4" height="2" fill="#d4b057"/>
      </g>
    `,
    quill: `
      <g transform="translate(15,65)">
        <path d="M0,10 Q8,0 20,8 Q15,12 8,15 Q4,13 0,10" fill="#cbd5e1" stroke="#94a3b8" stroke-width="1"/>
        <path d="M20,8 L25,12" stroke="#654321" stroke-width="2"/>
        <circle cx="22" cy="10" r="1" fill="#d4b057"/>
      </g>
    `,
    runes: `
      <g>
        <text x="60" y="98" text-anchor="middle" fill="#8b5cf6" font-size="14" font-family="serif">ᚠᛞᛊ</text>
        <circle cx="45" cy="95" r="2" fill="#8b5cf6" opacity="0.6"/>
        <circle cx="75" cy="95" r="2" fill="#8b5cf6" opacity="0.6"/>
        <path d="M50,90 Q60,85 70,90" stroke="#8b5cf6" stroke-width="1" fill="none" opacity="0.7"/>
      </g>
    `,
    circuit: `
      <g>
        <rect x="40" y="65" width="40" height="25" rx="3" stroke="#14b8a6" stroke-width="2" fill="none"/>
        <circle cx="45" cy="70" r="2" fill="#14b8a6"/>
        <circle cx="75" cy="70" r="2" fill="#14b8a6"/>
        <circle cx="45" cy="85" r="2" fill="#14b8a6"/>
        <circle cx="75" cy="85" r="2" fill="#14b8a6"/>
        <path d="M47,70 L73,70 M47,85 L73,85 M60,67 L60,88" stroke="#14b8a6" stroke-width="1"/>
      </g>
    `,
    chains: `
      <g>
        <ellipse cx="25" cy="72" rx="4" ry="6" stroke="#94a3b8" stroke-width="2" fill="none"/>
        <ellipse cx="35" cy="78" rx="4" ry="6" stroke="#94a3b8" stroke-width="2" fill="none"/>
        <ellipse cx="45" cy="72" rx="4" ry="6" stroke="#94a3b8" stroke-width="2" fill="none"/>
        <ellipse cx="55" cy="78" rx="4" ry="6" stroke="#94a3b8" stroke-width="2" fill="none"/>
        <ellipse cx="65" cy="72" rx="4" ry="6" stroke="#94a3b8" stroke-width="2" fill="none"/>
        <ellipse cx="75" cy="78" rx="4" ry="6" stroke="#94a3b8" stroke-width="2" fill="none"/>
      </g>
    `,
    flame: `
      <g transform="translate(55,85)">
        <path d="M5,25 Q0,15 3,8 Q8,12 10,5 Q12,15 8,20 Q6,25 5,25" fill="#ff4444"/>
        <path d="M5,22 Q2,15 4,10 Q7,14 8,8 Q9,18 6,20" fill="#ff6666"/>
        <path d="M5,18 Q3,12 4,8 Q6,12 7,6 Q8,15 5,18" fill="#ffaa00"/>
        <circle cx="5" cy="15" r="1" fill="#ffffff" opacity="0.8"/>
      </g>
    `,
    halo: `
      <g>
        <ellipse cx="60" cy="8" rx="25" ry="6" fill="none" stroke="#facc15" stroke-width="3"/>
        <ellipse cx="60" cy="8" rx="25" ry="6" fill="none" stroke="#ffffff" stroke-width="1" opacity="0.8"/>
        <circle cx="40" cy="8" r="2" fill="#facc15" opacity="0.6"/>
        <circle cx="80" cy="8" r="2" fill="#facc15" opacity="0.6"/>
      </g>
    `,
    tentacle: `
      <g transform="translate(85,95)">
        <path d="M0,15 Q8,5 15,10 Q10,15 5,20 Q12,25 20,15 Q15,30 8,25" 
              stroke="#94a3b8" stroke-width="3" fill="none"/>
        <circle cx="8" cy="12" r="2" fill="#94a3b8" opacity="0.7"/>
        <circle cx="12" cy="18" r="1.5" fill="#94a3b8" opacity="0.5"/>
      </g>
    `,
    horns: `
      <g>
        <path d="M42,15 Q38,8 35,2 Q40,5 42,15" fill="#cbd5e1" stroke="#94a3b8" stroke-width="1"/>
        <path d="M78,15 Q82,8 85,2 Q80,5 78,15" fill="#cbd5e1" stroke="#94a3b8" stroke-width="1"/>
        <ellipse cx="40" cy="12" rx="2" ry="4" fill="#e2e8f0"/>
        <ellipse cx="80" cy="12" rx="2" ry="4" fill="#e2e8f0"/>
      </g>
    `,
    wings: `
      <g>
        <path d="M10,80 Q25,65 35,75 Q30,85 20,90 Q15,85 10,80" 
              fill="rgba(203,213,225,0.8)" stroke="#cbd5e1" stroke-width="1"/>
        <path d="M110,80 Q95,65 85,75 Q90,85 100,90 Q105,85 110,80" 
              fill="rgba(203,213,225,0.8)" stroke="#cbd5e1" stroke-width="1"/>
        <path d="M15,75 Q20,70 25,75" stroke="#94a3b8" stroke-width="1" fill="none"/>
        <path d="M105,75 Q100,70 95,75" stroke="#94a3b8" stroke-width="1" fill="none"/>
      </g>
    `,
    cloak: `
      <g>
        <path d="M25,55 Q60,45 95,55 Q90,75 85,95 Q60,100 35,95 Q30,75 25,55" 
              fill="rgba(0,0,0,0.6)" stroke="rgba(100,0,100,0.4)" stroke-width="1"/>
        <path d="M30,60 Q60,50 90,60" stroke="rgba(100,0,100,0.6)" stroke-width="1" fill="none"/>
        <circle cx="35" cy="58" r="2" fill="rgba(150,0,150,0.8)"/>
        <circle cx="85" cy="58" r="2" fill="rgba(150,0,150,0.8)"/>
      </g>
    `
  };
  
  const extras = props.map(k => propMap[k] || "").join("");
  
  return `
  <svg width="${size}" height="${size}" viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <radialGradient id="${gradientId}" cx="50%" cy="30%">
        <stop offset="0%" stop-color="${palette}" stop-opacity="0.9"/>
        <stop offset="70%" stop-color="${palette}" stop-opacity="0.4"/>
        <stop offset="100%" stop-color="${palette}" stop-opacity="0.1"/>
      </radialGradient>
      <filter id="${shadowId}">
        <feDropShadow dx="0" dy="4" stdDeviation="6" flood-color="rgba(0,0,0,0.4)"/>
      </filter>
    </defs>
    <rect x="0" y="0" width="120" height="120" rx="16" fill="url(#${gradientId})" stroke="rgba(255,255,255,0.1)" stroke-width="1"/>
    <g filter="url(#${shadowId})">
      ${core}
      ${extras}
    </g>
  </svg>`;
}

export function sanitizeUsername(username) {
  if (!username) return '';
  
  // Basic sanitization
  const cleaned = username
    .trim()
    .replace(/[^a-zA-Z0-9\s\-]/g, '')
    .slice(0, 18);
    
  // Check reserved words
  const reserved = ['admin', 'system', 'atticus', 'bot', 'moderator'];
  const lowerCleaned = cleaned.toLowerCase();
  
  if (reserved.some(word => lowerCleaned.includes(word))) {
    return '';
  }
  
  return cleaned;
}

export function validateAvatarData(data) {
  if (!data || typeof data !== 'object') return false;
  if (!data.base || typeof data.base !== 'string') return false;
  if (!data.palette || typeof data.palette !== 'string') return false;
  if (!Array.isArray(data.props)) return false;
  
  return true;
}
