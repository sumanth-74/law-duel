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
  const gradientId = "a_" + Math.random().toString(36).slice(2);
  
  const core = {
    humanoid: "M60,10 a30,30 0 1,0 1,0 Z M35,60 h50 v50 h-50 Z",
    beast: "M60,14 a24,24 0 1,0 1,0 Z M28,58 h64 v54 h-64 Z", 
    construct: "M30,20 h60 v40 h-60 Z M38,64 h44 v46 h-44 Z",
    undead: "M60,12 a26,26 0 1,0 1,0 Z M30,60 h60 v52 h-60 Z",
    elemental: "M60,16 a22,22 0 1,0 1,0 Z M26,56 h68 v58 h-68 Z",
    celestial: "M60,12 a28,28 0 1,0 1,0 Z M32,58 h56 v54 h-56 Z",
    alien: "M60,8 A30,24 0 1,0 60,56 A30,24 0 1,0 60,8 Z M34,60 h52 v52 h-52 Z",
    arcane: "M60,14 a28,28 0 1,0 1,0 Z M28,58 h64 v54 h-64 Z"
  }[base] || "M60,10 a30,30 0 1,0 1,0 Z M35,60 h50 v50 h-50 Z";
  
  const propMap = {
    gavel: "<rect x='78' y='70' width='20' height='6' rx='3' fill='#d4b057'/><rect x='94' y='66' width='6' height='14' rx='2' fill='#8a6a1d'/>",
    scales: "<circle cx='40' cy='74' r='6' stroke='#d4b057' fill='none'/><circle cx='80' cy='74' r='6' stroke='#d4b057' fill='none'/>",
    codex: "<rect x='18' y='80' width='20' height='14' rx='2' fill='#2b2f3a' stroke='#cbd5e1'/>",
    quill: "<path d='M18,70 q10,-16 22,-4' stroke='#cbd5e1' fill='none'/>",
    runes: "<text x='60' y='96' text-anchor='middle' fill='#8b5cf6' font-size='10'>ᚠᛞᛊ</text>",
    circuit: "<path d='M44,68 h32 v20 h-32 Z' stroke='#14b8a6' fill='none'/>",
    chains: "<path d='M30,70 q10,10 20,0 q10,-10 20,0' stroke='#94a3b8' fill='none'/>",
    flame: "<path d='M60,102 q-8,-10 0,-20 q10,8 8,18 q-2,10 -8,12' fill='#ef4444'/>",
    halo: "<ellipse cx='60' cy='8' rx='22' ry='6' fill='none' stroke='#facc15'/>",
    tentacle: "<path d='M92,106 q12,-18 -4,-28' stroke='#94a3b8' fill='none'/>",
    horns: "<path d='M42,14 q-10,-10 0,-18' stroke='#cbd5e1'/> <path d='M78,14 q10,-10 0,-18' stroke='#cbd5e1'/>",
    wings: "<path d='M14,84 q18,-18 26,0' stroke='#cbd5e1'/> <path d='M106,84 q-18,-18 -26,0' stroke='#cbd5e1'/>",
    cloak: "<path d='M30,60 q30,40 60,0 v46 h-60 Z' fill='rgba(0,0,0,.35)'/>"
  };
  
  const extras = props.map(k => propMap[k] || "").join("");
  
  return `
  <svg width="${size}" height="${size}" viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <radialGradient id="${gradientId}" cx="50%" cy="35%">
        <stop offset="0%" stop-color="${palette}" stop-opacity="0.95"/>
        <stop offset="100%" stop-color="${palette}" stop-opacity="0.25"/>
      </radialGradient>
    </defs>
    <rect x="0" y="0" width="120" height="120" rx="20" fill="url(#${gradientId})"/>
    <path d="${core}" fill="rgba(255,255,255,.12)" stroke="rgba(255,255,255,.25)"/>
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
