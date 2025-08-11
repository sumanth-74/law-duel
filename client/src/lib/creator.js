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
  
  // Create a stylized portrait-style avatar using modern illustration techniques
  const avatarStyle = `
    <style>
      .character-portrait { 
        filter: drop-shadow(0 8px 16px rgba(0,0,0,0.4)) drop-shadow(0 4px 8px rgba(0,0,0,0.2));
      }
      .face { 
        fill: #f4c2a1; 
        stroke: #d49464; 
        stroke-width: 1.5;
      }
      .hair { 
        fill: #8b4513; 
        stroke: #654321; 
        stroke-width: 1;
      }
      .eyes { 
        fill: #2d5aa0; 
      }
      .robes { 
        fill: ${palette}; 
        stroke: rgba(0,0,0,0.3); 
        stroke-width: 2; 
        opacity: 0.9;
      }
      .accent { 
        fill: #ffd700; 
        stroke: #b8860b; 
        stroke-width: 1;
      }
      .shadow { 
        fill: rgba(0,0,0,0.15); 
      }
    </style>
  `;
  
  // Clean, professional character designs
  const characterDesigns = {
    humanoid: `
      <g class="character-portrait">
        <!-- Background shadow -->
        <ellipse cx="60" cy="85" rx="35" ry="12" class="shadow"/>
        
        <!-- Character silhouette -->
        <path d="M35,45 Q60,35 85,45 L90,95 Q60,110 30,95 Z" class="robes"/>
        
        <!-- Head and face -->
        <ellipse cx="60" cy="28" rx="20" ry="22" class="face"/>
        
        <!-- Hair -->
        <path d="M40,20 Q60,5 80,20 Q75,30 60,25 Q45,30 40,20" class="hair"/>
        
        <!-- Eyes -->
        <ellipse cx="52" cy="25" rx="4" ry="3" fill="white"/>
        <ellipse cx="68" cy="25" rx="4" ry="3" fill="white"/>
        <circle cx="52" cy="25" r="2" class="eyes"/>
        <circle cx="68" cy="25" r="2" class="eyes"/>
        <circle cx="53" cy="24" r="0.8" fill="white" opacity="0.8"/>
        <circle cx="69" cy="24" r="0.8" fill="white" opacity="0.8"/>
        
        <!-- Facial features -->
        <path d="M48,21 Q52,20 56,21" class="hair" stroke-width="1.5"/>
        <path d="M64,21 Q68,20 72,21" class="hair" stroke-width="1.5"/>
        <path d="M59,29 L61,29 L60,32 Z" fill="#d49464"/>
        <path d="M56,35 Q60,37 64,35" stroke="#d49464" stroke-width="1.2" fill="none"/>
        
        <!-- Robe details -->
        <path d="M45,60 Q60,55 75,60" class="accent" stroke-width="3" fill="none"/>
        <circle cx="60" cy="70" r="4" class="accent"/>
      </g>
    `,
    beast: `
      <g class="character-portrait">
        <ellipse cx="60" cy="85" rx="35" ry="12" class="shadow"/>
        <path d="M30,50 Q60,40 90,50 L95,95 Q60,110 25,95 Z" class="robes"/>
        <ellipse cx="60" cy="28" rx="22" ry="18" fill="#cd853f" stroke="#8b4513" stroke-width="2"/>
        <path d="M38,18 Q60,8 82,18 Q80,28 70,25 Q60,22 50,25 Q40,28 38,18" fill="#8b4513"/>
        <ellipse cx="50" cy="24" rx="5" ry="4" fill="#ffd700"/>
        <ellipse cx="70" cy="24" rx="5" ry="4" fill="#ffd700"/>
        <circle cx="50" cy="24" r="2" fill="#000"/>
        <circle cx="70" cy="24" r="2" fill="#000"/>
        <ellipse cx="60" cy="32" rx="6" ry="4" fill="#cd853f"/>
        <circle cx="60" cy="30" r="1" fill="#000"/>
        <path d="M56,35 L58,38 L60,35 L62,38 L64,35" stroke="#fff" stroke-width="1.5" fill="none"/>
        <path d="M45,65 Q60,60 75,65" class="accent" stroke-width="2" fill="none"/>
      </g>
    `,
    construct: `
      <g class="character-portrait">
        <ellipse cx="60" cy="85" rx="35" ry="12" class="shadow"/>
        <path d="M30,45 Q60,40 90,45 L95,95 Q60,110 25,95 Z" fill="#708090" stroke="#2f4f4f" stroke-width="3"/>
        <path d="M40,15 L80,15 L82,40 L80,42 L40,42 L38,40 Z" fill="#708090" stroke="#2f4f4f" stroke-width="2"/>
        <rect x="48" y="22" width="8" height="10" rx="2" fill="#00bfff" stroke="#0080ff" stroke-width="1"/>
        <rect x="64" y="22" width="8" height="10" rx="2" fill="#00bfff" stroke="#0080ff" stroke-width="1"/>
        <circle cx="52" cy="27" r="1.5" fill="#fff" opacity="0.9"/>
        <circle cx="68" cy="27" r="1.5" fill="#fff" opacity="0.9"/>
        <rect x="54" y="34" width="12" height="4" rx="1" fill="#2f4f4f"/>
        <circle cx="60" cy="70" r="6" fill="#00bfff" opacity="0.8"/>
        <circle cx="60" cy="70" r="3" fill="#fff" opacity="0.6"/>
      </g>
    `,
    undead: `
      <g class="character-portrait">
        <ellipse cx="60" cy="85" rx="35" ry="12" class="shadow"/>
        <path d="M35,45 Q60,35 85,45 L90,95 Q60,110 30,95 Z" fill="#2e2e2e" stroke="#4b0082" stroke-width="2"/>
        <ellipse cx="60" cy="28" rx="18" ry="20" fill="#e6e6fa" stroke="#9370db" stroke-width="1.5"/>
        <path d="M42,20 Q60,10 78,20 Q75,28 60,25 Q45,28 42,20" fill="#2e2e2e"/>
        <ellipse cx="52" cy="25" rx="4" ry="3" fill="#ff0000"/>
        <ellipse cx="68" cy="25" rx="4" ry="3" fill="#ff0000"/>
        <circle cx="52" cy="25" r="2" fill="#000"/>
        <circle cx="68" cy="25" r="2" fill="#000"/>
        <circle cx="53" cy="24" r="0.8" fill="#fff" opacity="0.8"/>
        <circle cx="69" cy="24" r="0.8" fill="#fff" opacity="0.8"/>
        <path d="M56,35 Q60,37 64,35" stroke="#9370db" stroke-width="1.2" fill="none"/>
        <circle cx="60" cy="70" r="4" fill="#8a2be2" opacity="0.8"/>
        <circle cx="45" cy="75" r="2" fill="#8a2be2" opacity="0.6"/>
        <circle cx="75" cy="80" r="2" fill="#8a2be2" opacity="0.6"/>
      </g>
    `,
    elemental: `
      <g class="character-portrait">
        <ellipse cx="60" cy="85" rx="35" ry="12" class="shadow"/>
        <path d="M30,45 Q60,35 90,45 L95,95 Q60,110 25,95 Z" class="robes"/>
        <ellipse cx="60" cy="28" rx="20" ry="20" fill="#ff6347" stroke="#ff4500" stroke-width="2"/>
        <path d="M40,15 Q50,3 60,8 Q70,3 80,15 Q75,25 60,22 Q45,25 40,15" fill="#ff4500"/>
        <path d="M45,12 Q55,5 65,12" fill="#ffa500"/>
        <ellipse cx="52" cy="25" rx="4" ry="3" fill="#ffff00"/>
        <ellipse cx="68" cy="25" rx="4" ry="3" fill="#ffff00"/>
        <circle cx="52" cy="25" r="1.5" fill="#fff"/>
        <circle cx="68" cy="25" r="1.5" fill="#fff"/>
        <path d="M56,32 Q60,35 64,32" fill="#ff4500"/>
        <path d="M45,65 Q60,60 75,65" stroke="#ff4500" stroke-width="3" fill="none"/>
        <circle cx="45" cy="75" r="3" fill="#ff4500" opacity="0.8"/>
        <circle cx="75" cy="80" r="3" fill="#ffa500" opacity="0.8"/>
      </g>
    `,
    celestial: `
      <g class="character-portrait">
        <ellipse cx="60" cy="85" rx="35" ry="12" class="shadow"/>
        <ellipse cx="60" cy="10" rx="25" ry="6" fill="none" stroke="#ffd700" stroke-width="3" opacity="0.9"/>
        <path d="M35,45 Q60,35 85,45 L90,95 Q60,110 30,95 Z" fill="#f0f8ff" stroke="#ffd700" stroke-width="2"/>
        <ellipse cx="60" cy="28" rx="18" ry="20" class="face"/>
        <path d="M42,18 Q60,8 78,18 Q75,28 60,25 Q45,28 42,18" class="accent"/>
        <ellipse cx="52" cy="25" rx="4" ry="3" fill="white"/>
        <ellipse cx="68" cy="25" rx="4" ry="3" fill="white"/>
        <circle cx="52" cy="25" r="1.5" fill="#87ceeb"/>
        <circle cx="68" cy="25" r="1.5" fill="#87ceeb"/>
        <circle cx="53" cy="24" r="0.8" fill="white" opacity="0.8"/>
        <circle cx="69" cy="24" r="0.8" fill="white" opacity="0.8"/>
        <path d="M56,35 Q60,37 64,35" stroke="#ffd700" stroke-width="1.2" fill="none"/>
        <path d="M45,65 Q60,60 75,65" class="accent" stroke-width="3" fill="none"/>
        <circle cx="60" cy="75" r="4" class="accent"/>
        <circle cx="45" cy="10" r="2" class="accent" opacity="0.8"/>
        <circle cx="75" cy="10" r="2" class="accent" opacity="0.8"/>
      </g>
    `,
    alien: `
      <g class="character-portrait">
        <ellipse cx="60" cy="85" rx="35" ry="12" class="shadow"/>
        <path d="M25,50 Q60,40 95,50 L100,95 Q60,110 20,95 Z" class="robes"/>
        <ellipse cx="60" cy="32" rx="25" ry="24" fill="#e6f3e6" stroke="#008080" stroke-width="2"/>
        <path d="M35,22 Q60,8 85,22" stroke="#006666" stroke-width="2" fill="none"/>
        <ellipse cx="48" cy="28" rx="10" ry="12" fill="#00ffff" stroke="#008080" stroke-width="2"/>
        <ellipse cx="72" cy="28" rx="10" ry="12" fill="#00ffff" stroke="#008080" stroke-width="2"/>
        <ellipse cx="48" cy="28" rx="6" ry="8" fill="#000"/>
        <ellipse cx="72" cy="28" rx="6" ry="8" fill="#000"/>
        <circle cx="48" cy="26" r="2" fill="#fff" opacity="0.9"/>
        <circle cx="72" cy="26" r="2" fill="#fff" opacity="0.9"/>
        <ellipse cx="60" cy="42" rx="4" ry="2" fill="#006666"/>
        <path d="M45,70 Q60,65 75,70" stroke="#00ffff" stroke-width="2" fill="none"/>
        <circle cx="45" cy="80" r="2" fill="#00ffff" opacity="0.6"/>
        <circle cx="75" cy="85" r="2" fill="#00ffff" opacity="0.6"/>
      </g>
    `,
    arcane: `
      <g class="character-portrait">
        <ellipse cx="60" cy="85" rx="35" ry="12" class="shadow"/>
        <path d="M30,45 Q60,35 90,45 L95,95 Q60,110 25,95 Z" fill="#191970" stroke="#8a2be2" stroke-width="2"/>
        <ellipse cx="60" cy="28" rx="20" ry="22" class="face"/>
        <path d="M40,18 Q60,8 80,18 Q75,28 60,25 Q45,28 40,18" fill="#2e2e2e"/>
        <ellipse cx="52" cy="25" rx="4" ry="3" fill="#8a2be2"/>
        <ellipse cx="68" cy="25" rx="4" ry="3" fill="#8a2be2"/>
        <circle cx="52" cy="25" r="2" fill="#000"/>
        <circle cx="68" cy="25" r="2" fill="#000"/>
        <circle cx="53" cy="24" r="0.8" fill="#fff" opacity="0.8"/>
        <circle cx="69" cy="24" r="0.8" fill="#fff" opacity="0.8"/>
        <path d="M48,21 Q60,19 72,21" stroke="#8a2be2" stroke-width="1" fill="none"/>
        <path d="M56,35 Q60,37 64,35" stroke="#8a2be2" stroke-width="1.2" fill="none"/>
        <path d="M45,65 Q60,60 75,65" stroke="#8a2be2" stroke-width="2" fill="none"/>
        <circle cx="60" cy="75" r="4" fill="#8a2be2" opacity="0.8"/>
        <circle cx="40" cy="80" r="2" fill="#8a2be2" opacity="0.7"/>
        <circle cx="80" cy="85" r="2" fill="#8a2be2" opacity="0.7"/>
      </g>
    `
  }[base] || characterDesigns.humanoid;

  // Clean, modern magical props
  const propMap = {
    gavel: `
      <g transform="translate(75,70)">
        <rect x="15" y="2" width="4" height="18" rx="2" class="hair"/>
        <ellipse cx="12" cy="8" rx="8" ry="5" class="accent"/>
        <circle cx="12" cy="8" r="2" fill="#fff" opacity="0.8"/>
      </g>
    `,
    scales: `
      <g>
        <rect x="58" y="55" width="4" height="20" rx="2" class="accent"/>
        <rect x="35" y="67" width="50" height="2" rx="1" class="accent"/>
        <circle cx="40" cy="75" r="6" fill="none" stroke="#b8860b" stroke-width="2"/>
        <circle cx="80" cy="75" r="6" fill="none" stroke="#b8860b" stroke-width="2"/>
        <path d="M40,62 L40,75 M80,62 L80,75" stroke="#666" stroke-width="1.5"/>
      </g>
    `,
    codex: `
      <g transform="translate(10,75)">
        <rect x="0" y="0" width="24" height="18" rx="2" class="hair"/>
        <rect x="2" y="2" width="20" height="14" fill="#a0522d"/>
        <path d="M4,5 L20,5 M4,8 L18,8 M4,11 L19,11 M4,14 L17,14" stroke="#daa520" stroke-width="0.8"/>
        <circle cx="12" cy="9" r="2.5" fill="none" stroke="#ffd700" stroke-width="1"/>
      </g>
    `,
    quill: `
      <g transform="translate(15,70)">
        <path d="M0,8 Q8,2 16,8 Q12,12 8,16 Q4,12 0,8" fill="#f5f5dc" stroke="#daa520" stroke-width="1"/>
        <path d="M16,8 L22,12" class="hair" stroke-width="2"/>
        <ellipse cx="20" cy="11" rx="2" ry="1.5" fill="#4b0082"/>
        <circle cx="8" cy="6" r="0.5" class="accent"/>
      </g>
    `,
    runes: `
      <g>
        <circle cx="60" cy="90" r="10" stroke="#8b5cf6" stroke-width="2" fill="none"/>
        <text x="60" y="95" text-anchor="middle" fill="#9370db" font-size="12" font-family="serif">ᚠᛞ</text>
        <circle cx="45" cy="85" r="1.5" fill="#8b5cf6" opacity="0.7"/>
        <circle cx="75" cy="95" r="1.5" fill="#8b5cf6" opacity="0.7"/>
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
    ${avatarStyle}
    <rect x="0" y="0" width="120" height="120" rx="20" fill="linear-gradient(135deg, ${palette}22, ${palette}11)" stroke="rgba(255,255,255,0.1)" stroke-width="1"/>
    ${characterDesigns[base] || characterDesigns.humanoid}
    ${extras}
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
