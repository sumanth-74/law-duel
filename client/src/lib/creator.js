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
  const skinGradientId = "skin_" + Math.random().toString(36).slice(2);
  const robeGradientId = "robe_" + Math.random().toString(36).slice(2);
  
  // Realistic fantasy character bases like Harry Potter
  const core = {
    humanoid: `
      <!-- Realistic Human Wizard -->
      <!-- Face structure -->
      <ellipse cx="60" cy="22" rx="16" ry="18" fill="url(#${skinGradientId})" stroke="rgba(139,69,19,0.4)" stroke-width="0.5"/>
      <!-- Hair -->
      <path d="M44,15 Q50,8 60,10 Q70,8 76,15 Q75,20 70,18 Q60,16 50,18 Q45,20 44,15" fill="#654321" stroke="#4a2c17" stroke-width="0.5"/>
      <!-- Eyes with depth -->
      <ellipse cx="54" cy="19" rx="3" ry="2" fill="#ffffff" stroke="rgba(0,0,0,0.3)" stroke-width="0.3"/>
      <ellipse cx="66" cy="19" rx="3" ry="2" fill="#ffffff" stroke="rgba(0,0,0,0.3)" stroke-width="0.3"/>
      <circle cx="54" cy="19" r="1.5" fill="#4a5568"/>
      <circle cx="66" cy="19" r="1.5" fill="#4a5568"/>
      <circle cx="54.5" cy="18.5" r="0.5" fill="#ffffff"/>
      <circle cx="66.5" cy="18.5" r="0.5" fill="#ffffff"/>
      <!-- Eyebrows -->
      <path d="M50,16 Q54,15 57,16" stroke="#4a2c17" stroke-width="1" fill="none"/>
      <path d="M63,16 Q66,15 70,16" stroke="#4a2c17" stroke-width="1" fill="none"/>
      <!-- Nose -->
      <path d="M60,21 L60,25 M58,25 L62,25" stroke="rgba(139,69,19,0.6)" stroke-width="0.8" fill="none"/>
      <!-- Mouth -->
      <path d="M57,28 Q60,30 63,28" stroke="rgba(139,69,19,0.7)" stroke-width="1" fill="none"/>
      <!-- Wizard robes -->
      <path d="M44,40 Q60,35 76,40 L80,85 Q70,95 60,95 Q50,95 40,85 Z" fill="url(#${robeGradientId})" stroke="rgba(0,0,0,0.3)" stroke-width="1"/>
      <!-- Robe details -->
      <path d="M50,45 Q60,42 70,45" stroke="rgba(255,255,255,0.3)" stroke-width="1" fill="none"/>
      <circle cx="60" cy="50" r="2" fill="rgba(212,175,55,0.8)" stroke="rgba(138,106,29,0.8)" stroke-width="0.5"/>
    `,
    beast: `
      <!-- Werewolf/Animagus Beast -->
      <!-- Lupine head structure -->
      <ellipse cx="60" cy="25" rx="20" ry="16" fill="url(#${skinGradientId})" stroke="rgba(101,67,33,0.6)" stroke-width="1"/>
      <!-- Fur texture -->
      <path d="M40,18 Q45,12 50,16 Q55,10 60,14 Q65,10 70,16 Q75,12 80,18" stroke="#8b4513" stroke-width="1.5" fill="none"/>
      <path d="M42,22 Q47,16 52,20 Q57,14 62,18 Q67,14 72,20 Q77,16 78,22" stroke="#a0522d" stroke-width="1" fill="none"/>
      <!-- Fierce yellow wolf eyes -->
      <ellipse cx="52" cy="22" rx="4" ry="3" fill="#ffd700" stroke="rgba(0,0,0,0.5)" stroke-width="0.5"/>
      <ellipse cx="68" cy="22" rx="4" ry="3" fill="#ffd700" stroke="rgba(0,0,0,0.5)" stroke-width="0.5"/>
      <ellipse cx="52" cy="22" rx="2" ry="2" fill="#000000"/>
      <ellipse cx="68" cy="22" rx="2" ry="2" fill="#000000"/>
      <!-- Snout -->
      <ellipse cx="60" cy="30" rx="8" ry="6" fill="url(#${skinGradientId})" stroke="rgba(101,67,33,0.4)" stroke-width="0.5"/>
      <circle cx="60" cy="28" r="1.5" fill="#000000"/>
      <!-- Sharp teeth -->
      <path d="M55,32 L57,35 L59,32 L61,35 L63,32 L65,35" stroke="#ffffff" stroke-width="1.5" fill="none"/>
      <!-- Beast body in torn robes -->
      <path d="M35,45 Q60,38 85,45 L88,90 Q75,100 60,98 Q45,100 32,90 Z" fill="url(#${robeGradientId})" stroke="rgba(101,67,33,0.6)" stroke-width="1"/>
      <!-- Claw marks on robes -->
      <path d="M40,55 L70,65 M45,70 L75,80 M38,85 L68,95" stroke="rgba(139,69,19,0.4)" stroke-width="2"/>
    `,
    construct: `
      <!-- Ancient Magical Golem -->
      <!-- Stone head with carved features -->
      <path d="M42,12 L78,12 L80,35 L78,38 L42,38 L40,35 Z" fill="#708090" stroke="#2f4f4f" stroke-width="2"/>
      <!-- Carved facial features -->
      <path d="M45,15 L75,15 L73,32 L47,32 Z" fill="#778899" stroke="#2f4f4f" stroke-width="1"/>
      <!-- Glowing magical runes for eyes -->
      <rect x="50" y="20" width="6" height="8" rx="2" fill="#00bfff" stroke="#0080ff" stroke-width="1"/>
      <rect x="64" y="20" width="6" height="8" rx="2" fill="#00bfff" stroke="#0080ff" stroke-width="1"/>
      <circle cx="53" cy="24" r="1" fill="#ffffff" opacity="0.9"/>
      <circle cx="67" cy="24" r="1" fill="#ffffff" opacity="0.9"/>
      <!-- Carved mouth -->
      <path d="M55,30 L65,30 L63,33 L57,33 Z" fill="#2f4f4f" stroke="#1c3333" stroke-width="1"/>
      <!-- Massive stone body -->
      <path d="M35,40 L85,40 L88,95 L82,100 L38,100 L32,95 Z" fill="#708090" stroke="#2f4f4f" stroke-width="2"/>
      <!-- Stone block details -->
      <path d="M40,50 L80,50 M40,70 L80,70 M50,40 L50,100 M70,40 L70,100" stroke="#556b70" stroke-width="1"/>
      <!-- Magical core -->
      <circle cx="60" cy="65" r="8" fill="#00bfff" stroke="#0080ff" stroke-width="2" opacity="0.7"/>
      <circle cx="60" cy="65" r="4" fill="#ffffff" opacity="0.5"/>
      <!-- Energy lines -->
      <path d="M52,65 L40,55 M68,65 L80,55 M52,65 L40,75 M68,65 L80,75" stroke="#00bfff" stroke-width="2" opacity="0.6"/>
    `,
    undead: `
      <!-- Death Eater / Necromancer -->
      <!-- Pale, gaunt skull-like face -->
      <ellipse cx="60" cy="25" rx="17" ry="20" fill="#e6e6fa" stroke="rgba(75,0,130,0.6)" stroke-width="1"/>
      <!-- Sunken cheeks -->
      <path d="M45,28 Q50,32 55,28" fill="rgba(139,69,19,0.3)" stroke="rgba(75,0,130,0.4)" stroke-width="0.5"/>
      <path d="M65,28 Q70,32 75,28" fill="rgba(139,69,19,0.3)" stroke="rgba(75,0,130,0.4)" stroke-width="0.5"/>
      <!-- Glowing red eyes of the damned -->
      <ellipse cx="53" cy="20" rx="3.5" ry="4" fill="#000000" stroke="rgba(139,0,0,0.8)" stroke-width="1"/>
      <ellipse cx="67" cy="20" rx="3.5" ry="4" fill="#000000" stroke="rgba(139,0,0,0.8)" stroke-width="1"/>
      <circle cx="53" cy="20" r="2" fill="#ff0000"/>
      <circle cx="67" cy="20" r="2" fill="#ff0000"/>
      <circle cx="53.5" cy="19" r="0.5" fill="#ffffff"/>
      <circle cx="67.5" cy="19" r="0.5" fill="#ffffff"/>
      <!-- Skeletal nose -->
      <path d="M58,23 L62,23 L60,27 Z" fill="rgba(139,69,19,0.4)" stroke="rgba(75,0,130,0.6)" stroke-width="0.5"/>
      <!-- Thin, cruel mouth -->
      <path d="M56,30 Q60,32 64,30" stroke="rgba(75,0,130,0.8)" stroke-width="1.5" fill="none"/>
      <!-- Dark necromancer robes -->
      <path d="M38,45 Q60,40 82,45 L85,95 Q75,105 60,105 Q45,105 35,95 Z" fill="#2e2e2e" stroke="rgba(75,0,130,0.8)" stroke-width="1"/>
      <!-- Death magic aura -->
      <path d="M40,50 Q45,45 50,50 Q55,45 60,50 Q65,45 70,50 Q75,45 80,50" stroke="#8a2be2" stroke-width="1.5" fill="none" opacity="0.8"/>
      <circle cx="45" cy="70" r="2" fill="#8a2be2" opacity="0.6"/>
      <circle cx="75" cy="75" r="2" fill="#8a2be2" opacity="0.6"/>
    `,
    elemental: `
      <!-- Phoenix Fire Elemental -->
      <!-- Flame-wreathed head -->
      <ellipse cx="60" cy="25" rx="18" ry="18" fill="url(#${skinGradientId})" stroke="rgba(255,69,0,0.8)" stroke-width="2"/>
      <!-- Fire hair flowing upward -->
      <path d="M42,15 Q45,5 50,8 Q55,2 60,6 Q65,2 70,8 Q75,5 78,15" fill="#ff4500" stroke="#ff6347" stroke-width="1"/>
      <path d="M44,12 Q48,3 52,7 Q58,1 62,5 Q68,1 72,7 Q76,3 76,12" fill="#ffa500" stroke="#ff8c00" stroke-width="0.5"/>
      <!-- Blazing eyes -->
      <ellipse cx="53" cy="22" rx="4" ry="3" fill="#ffff00" stroke="rgba(255,0,0,0.8)" stroke-width="1"/>
      <ellipse cx="67" cy="22" rx="4" ry="3" fill="#ffff00" stroke="rgba(255,0,0,0.8)" stroke-width="1"/>
      <circle cx="53" cy="22" r="1.5" fill="#ffffff"/>
      <circle cx="67" cy="22" r="1.5" fill="#ffffff"/>
      <!-- Fire emanating from mouth -->
      <path d="M57,28 Q60,32 63,28 Q60,35 57,32" fill="#ff4500" stroke="#ff0000" stroke-width="1"/>
      <!-- Elemental body wreathed in flames -->
      <path d="M35,45 Q60,40 85,45 L88,90 Q75,100 60,95 Q45,100 32,90 Z" fill="url(#${robeGradientId})" stroke="rgba(255,69,0,0.8)" stroke-width="1"/>
      <!-- Flame patterns -->
      <path d="M40,55 Q45,50 50,55 Q55,50 60,55 Q65,50 70,55 Q75,50 80,55" stroke="#ff4500" stroke-width="2" fill="none"/>
      <path d="M42,75 Q48,70 54,75 Q60,70 66,75 Q72,70 78,75" stroke="#ffa500" stroke-width="1.5" fill="none"/>
      <!-- Fire orbs -->
      <circle cx="45" cy="65" r="3" fill="#ff4500" opacity="0.8"/>
      <circle cx="75" cy="70" r="3" fill="#ff4500" opacity="0.8"/>
    `,
    celestial: `
      <!-- Divine Angel/Patronus -->
      <!-- Radiant divine face -->
      <ellipse cx="60" cy="24" rx="16" ry="18" fill="url(#${skinGradientId})" stroke="rgba(255,215,0,0.9)" stroke-width="2"/>
      <!-- Golden hair with divine light -->
      <path d="M44,12 Q50,5 60,8 Q70,5 76,12 Q78,18 75,20 Q60,15 45,20 Q42,18 44,12" fill="#ffd700" stroke="#ffb347" stroke-width="1"/>
      <!-- Divine radiance lines -->
      <path d="M35,15 L45,20 M85,15 L75,20 M60,2 L60,12 M48,8 L52,18 M72,8 L68,18" stroke="#ffd700" stroke-width="2" opacity="0.7"/>
      <!-- Pure white glowing eyes -->
      <ellipse cx="53" cy="21" rx="3" ry="2.5" fill="#ffffff" stroke="rgba(255,215,0,0.8)" stroke-width="1"/>
      <ellipse cx="67" cy="21" rx="3" ry="2.5" fill="#ffffff" stroke="rgba(255,215,0,0.8)" stroke-width="1"/>
      <circle cx="53" cy="21" r="1" fill="#87ceeb"/>
      <circle cx="67" cy="21" r="1" fill="#87ceeb"/>
      <!-- Serene expression -->
      <path d="M57,28 Q60,30 63,28" stroke="rgba(255,215,0,0.8)" stroke-width="1.5" fill="none"/>
      <!-- Divine robes -->
      <path d="M40,45 Q60,40 80,45 L85,95 Q70,105 60,100 Q50,105 35,95 Z" fill="#f0f8ff" stroke="rgba(255,215,0,0.8)" stroke-width="1"/>
      <!-- Golden trim and patterns -->
      <path d="M45,50 Q60,45 75,50" stroke="#ffd700" stroke-width="3" fill="none"/>
      <path d="M42,70 Q60,65 78,70" stroke="#ffd700" stroke-width="2" fill="none"/>
      <!-- Halo -->
      <ellipse cx="60" cy="8" rx="20" ry="5" fill="none" stroke="#ffd700" stroke-width="3" opacity="0.9"/>
      <circle cx="45" cy="8" r="1.5" fill="#ffd700" opacity="0.8"/>
      <circle cx="75" cy="8" r="1.5" fill="#ffd700" opacity="0.8"/>
    `,
    alien: `
      <!-- Otherworldly Eldritch Scholar -->
      <!-- Elongated alien skull -->
      <ellipse cx="60" cy="28" rx="22" ry="22" fill="#e6f3e6" stroke="rgba(0,128,128,0.6)" stroke-width="1"/>
      <!-- Large alien brain ridges -->
      <path d="M38,20 Q50,10 62,15 Q70,10 82,20" stroke="rgba(0,100,100,0.8)" stroke-width="2" fill="none"/>
      <path d="M42,25 Q55,18 68,25" stroke="rgba(0,100,100,0.6)" stroke-width="1.5" fill="none"/>
      <!-- Large, hypnotic alien eyes -->
      <ellipse cx="50" cy="25" rx="8" ry="10" fill="#000000" stroke="rgba(0,255,255,0.8)" stroke-width="2"/>
      <ellipse cx="70" cy="25" rx="8" ry="10" fill="#000000" stroke="rgba(0,255,255,0.8)" stroke-width="2"/>
      <ellipse cx="50" cy="25" rx="5" ry="7" fill="#00ffff"/>
      <ellipse cx="70" cy="25" rx="5" ry="7" fill="#00ffff"/>
      <circle cx="50" cy="23" r="2" fill="#ffffff" opacity="0.9"/>
      <circle cx="70" cy="23" r="2" fill="#ffffff" opacity="0.9"/>
      <!-- Small mouth -->
      <ellipse cx="60" cy="38" rx="3" ry="2" fill="rgba(0,100,100,0.4)" stroke="rgba(0,128,128,0.6)" stroke-width="0.5"/>
      <!-- Scholar robes with alien patterns -->
      <path d="M32,50 Q60,45 88,50 L90,95 Q75,105 60,105 Q45,105 30,95 Z" fill="url(#${robeGradientId})" stroke="rgba(0,128,128,0.8)" stroke-width="1"/>
      <!-- Alien script/runes -->
      <path d="M40,65 Q45,60 50,65 M70,65 Q75,60 80,65" stroke="#00ffff" stroke-width="1.5" fill="none"/>
      <circle cx="42" cy="75" r="2" fill="#00ffff" opacity="0.6"/>
      <circle cx="78" cy="80" r="2" fill="#00ffff" opacity="0.6"/>
      <!-- Tentacle-like appendages -->
      <path d="M35,85 Q25,90 30,95" stroke="rgba(0,128,128,0.7)" stroke-width="3" fill="none"/>
      <path d="M85,85 Q95,90 90,95" stroke="rgba(0,128,128,0.7)" stroke-width="3" fill="none"/>
    `,
    arcane: `
      <!-- Dark Arts Sorcerer -->
      <!-- Mysterious hooded face -->
      <ellipse cx="60" cy="25" rx="18" ry="19" fill="url(#${skinGradientId})" stroke="rgba(128,0,128,0.8)" stroke-width="1"/>
      <!-- Dark hair with mystical energy -->
      <path d="M42,12 Q50,6 60,8 Q70,6 78,12 Q80,18 75,22 Q60,18 45,22 Q40,18 42,12" fill="#2e2e2e" stroke="#4b0082" stroke-width="1"/>
      <!-- Glowing purple arcane eyes -->
      <ellipse cx="53" cy="22" rx="3.5" ry="3" fill="#000000" stroke="rgba(138,43,226,0.8)" stroke-width="1"/>
      <ellipse cx="67" cy="22" rx="3.5" ry="3" fill="#000000" stroke="rgba(138,43,226,0.8)" stroke-width="1"/>
      <circle cx="53" cy="22" r="2" fill="#8a2be2"/>
      <circle cx="67" cy="22" r="2" fill="#8a2be2"/>
      <circle cx="53.5" cy="21" r="0.5" fill="#ffffff"/>
      <circle cx="67.5" cy="21" r="0.5" fill="#ffffff"/>
      <!-- Mystical markings on face -->
      <path d="M48,18 Q53,16 58,18" stroke="#8a2be2" stroke-width="1" fill="none" opacity="0.7"/>
      <path d="M62,18 Q67,16 72,18" stroke="#8a2be2" stroke-width="1" fill="none" opacity="0.7"/>
      <!-- Arcane mouth with spell incantations -->
      <path d="M57,30 Q60,32 63,30" stroke="rgba(128,0,128,0.8)" stroke-width="1.5" fill="none"/>
      <!-- Dark sorcerer robes -->
      <path d="M35,45 Q60,40 85,45 L88,95 Q70,105 60,105 Q50,105 32,95 Z" fill="#191970" stroke="rgba(128,0,128,0.8)" stroke-width="1"/>
      <!-- Arcane symbols embroidered -->
      <path d="M45,55 Q50,50 55,55 Q60,50 65,55 Q70,50 75,55" stroke="#8a2be2" stroke-width="2" fill="none"/>
      <circle cx="60" cy="65" r="4" fill="#8a2be2" opacity="0.8" stroke="#4b0082" stroke-width="1"/>
      <path d="M56,61 L64,61 L64,69 L56,69 Z" stroke="#9370db" stroke-width="1" fill="none"/>
      <!-- Floating mystical orbs -->
      <circle cx="40" cy="75" r="2.5" fill="#8a2be2" opacity="0.7"/>
      <circle cx="80" cy="80" r="2.5" fill="#8a2be2" opacity="0.7"/>
      <!-- Dark energy wisps -->
      <path d="M38,85 Q42,80 46,85" stroke="#4b0082" stroke-width="2" fill="none" opacity="0.8"/>
      <path d="M74,85 Q78,80 82,85" stroke="#4b0082" stroke-width="2" fill="none" opacity="0.8"/>
    `
  }[base] || core.humanoid;

  // Detailed Harry Potter-style magical props
  const propMap = {
    gavel: `
      <!-- Enchanted Judge's Gavel -->
      <g transform="translate(72,60)">
        <!-- Wooden handle with carved grip -->
        <rect x="18" y="0" width="6" height="24" rx="2" fill="#8b4513" stroke="#654321" stroke-width="0.5"/>
        <path d="M18,8 L24,8 M18,12 L24,12 M18,16 L24,16" stroke="#a0522d" stroke-width="0.3"/>
        <!-- Heavy bronze gavel head -->
        <ellipse cx="12" cy="10" rx="12" ry="6" fill="#cd7f32" stroke="#8b6914" stroke-width="1"/>
        <ellipse cx="12" cy="10" rx="8" ry="4" fill="#daa520" stroke="#b8860b" stroke-width="0.5"/>
        <!-- Magical runes etched into metal -->
        <path d="M6,8 L10,12 L6,16 M14,8 L18,12 L14,16" stroke="#2f4f4f" stroke-width="1" fill="none"/>
        <!-- Glowing enchantment -->
        <circle cx="12" cy="10" r="2" fill="#ffd700" opacity="0.6"/>
      </g>
    `,
    scales: `
      <!-- Scales of Justice (Magical) -->
      <g>
        <!-- Central pillar -->
        <rect x="58" y="55" width="4" height="25" rx="1" fill="#b8860b" stroke="#8b6914" stroke-width="1"/>
        <!-- Balance beam -->
        <rect x="30" y="67" width="60" height="3" rx="1" fill="#daa520" stroke="#b8860b" stroke-width="1"/>
        <!-- Left scale pan -->
        <ellipse cx="35" cy="73" rx="10" ry="4" fill="#cd7f32" stroke="#8b6914" stroke-width="1"/>
        <path d="M25,77 Q35,80 45,77" stroke="#8b6914" stroke-width="1" fill="none"/>
        <!-- Right scale pan -->
        <ellipse cx="85" cy="73" rx="10" ry="4" fill="#cd7f32" stroke="#8b6914" stroke-width="1"/>
        <path d="M75,77 Q85,80 95,77" stroke="#8b6914" stroke-width="1" fill="none"/>
        <!-- Suspension chains -->
        <path d="M35,62 L35,73 M85,62 L85,73" stroke="#696969" stroke-width="1.5"/>
        <path d="M35,62 L42,68 M85,62 L78,68" stroke="#696969" stroke-width="1"/>
        <!-- Magical glow -->
        <circle cx="60" cy="68" r="3" fill="#ffd700" opacity="0.5"/>
      </g>
    `,
    codex: `
      <!-- Ancient Spellbook/Legal Tome -->
      <g transform="translate(8,70)">
        <!-- Leather cover with aged texture -->
        <rect x="0" y="0" width="30" height="22" rx="2" fill="#8b4513" stroke="#654321" stroke-width="1"/>
        <rect x="1" y="1" width="28" height="20" rx="1" fill="#a0522d" stroke="#8b4513" stroke-width="0.5"/>
        <!-- Binding with metal clasps -->
        <rect x="28" y="6" width="4" height="3" rx="1" fill="#cd7f32" stroke="#8b6914" stroke-width="0.5"/>
        <rect x="28" y="13" width="4" height="3" rx="1" fill="#cd7f32" stroke="#8b6914" stroke-width="0.5"/>
        <!-- Embossed title and decorations -->
        <rect x="4" y="3" width="20" height="2" rx="0.5" fill="#daa520" opacity="0.8"/>
        <rect x="6" y="7" width="16" height="1" rx="0.3" fill="#daa520" opacity="0.6"/>
        <rect x="5" y="10" width="18" height="1" rx="0.3" fill="#daa520" opacity="0.6"/>
        <rect x="7" y="13" width="14" height="1" rx="0.3" fill="#daa520" opacity="0.6"/>
        <rect x="4" y="16" width="20" height="2" rx="0.5" fill="#daa520" opacity="0.8"/>
        <!-- Magical sigil on cover -->
        <circle cx="15" cy="11" r="3" stroke="#ffd700" stroke-width="1" fill="none" opacity="0.8"/>
        <path d="M12,11 L18,11 M15,8 L15,14" stroke="#ffd700" stroke-width="1" opacity="0.8"/>
      </g>
    `,
    quill: `
      <!-- Enchanted Phoenix Feather Quill -->
      <g transform="translate(12,60)">
        <!-- Ornate quill shaft -->
        <path d="M20,12 L28,18" stroke="#8b4513" stroke-width="2"/>
        <!-- Detailed feather with magical shimmer -->
        <path d="M0,8 Q6,2 15,6 Q20,10 15,14 Q8,18 2,14 Q0,12 0,8" fill="#f5f5dc" stroke="#daa520" stroke-width="1"/>
        <path d="M2,10 Q8,6 14,10" stroke="#ffd700" stroke-width="0.5" opacity="0.8"/>
        <path d="M3,12 Q9,8 13,12" stroke="#ffd700" stroke-width="0.3" opacity="0.6"/>
        <!-- Individual barbs -->
        <path d="M4,8 L6,10 M8,7 L10,9 M12,8 L14,10" stroke="#e6e6fa" stroke-width="0.5"/>
        <!-- Magical ink reservoir -->
        <ellipse cx="22" cy="15" rx="3" ry="2" fill="#4b0082" stroke="#2e2e2e" stroke-width="0.5"/>
        <!-- Golden nib -->
        <path d="M18,12 L22,15 L20,16 L16,13 Z" fill="#ffd700" stroke="#daa520" stroke-width="0.3"/>
        <!-- Magical sparkles -->
        <circle cx="8" cy="6" r="0.5" fill="#ffd700" opacity="0.8"/>
        <circle cx="12" cy="16" r="0.5" fill="#ffd700" opacity="0.8"/>
      </g>
    `,
    runes: `
      <!-- Ancient Nordic Runes (Magical Law) -->
      <g>
        <!-- Runic circle -->
        <circle cx="60" cy="90" r="12" stroke="#8b5cf6" stroke-width="2" fill="none" opacity="0.8"/>
        <!-- Elder Futhark runes -->
        <text x="60" y="95" text-anchor="middle" fill="#9370db" font-size="16" font-family="serif" font-weight="bold">ᚠᛞᛊ</text>
        <!-- Smaller supporting runes -->
        <text x="45" y="88" text-anchor="middle" fill="#8b5cf6" font-size="8" font-family="serif">ᚱ</text>
        <text x="75" y="88" text-anchor="middle" fill="#8b5cf6" font-size="8" font-family="serif">ᛏ</text>
        <text x="45" y="98" text-anchor="middle" fill="#8b5cf6" font-size="8" font-family="serif">ᚾ</text>
        <text x="75" y="98" text-anchor="middle" fill="#8b5cf6" font-size="8" font-family="serif">ᛗ</text>
        <!-- Connecting energy lines -->
        <path d="M48,90 L72,90 M60,78 L60,102" stroke="#8b5cf6" stroke-width="1" fill="none" opacity="0.6"/>
        <!-- Glowing power sources -->
        <circle cx="40" cy="85" r="2" fill="#8b5cf6" opacity="0.7"/>
        <circle cx="80" cy="95" r="2" fill="#8b5cf6" opacity="0.7"/>
        <circle cx="60" cy="75" r="1.5" fill="#9370db" opacity="0.9"/>
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
      <radialGradient id="${skinGradientId}" cx="40%" cy="30%">
        <stop offset="0%" stop-color="#f4c2a1" stop-opacity="1"/>
        <stop offset="60%" stop-color="#e8a882" stop-opacity="1"/>
        <stop offset="100%" stop-color="#d49464" stop-opacity="1"/>
      </radialGradient>
      <linearGradient id="${robeGradientId}" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stop-color="${palette}" stop-opacity="0.9"/>
        <stop offset="50%" stop-color="${palette}" stop-opacity="0.7"/>
        <stop offset="100%" stop-color="${palette}" stop-opacity="0.5"/>
      </linearGradient>
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
