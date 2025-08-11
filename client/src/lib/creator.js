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
  const hairGradientId = "hair_" + Math.random().toString(36).slice(2);
  const eyeGradientId = "eye_" + Math.random().toString(36).slice(2);
  const robeGradientId = "robe_" + Math.random().toString(36).slice(2);
  const lightId = "light_" + Math.random().toString(36).slice(2);
  
  // Photorealistic character portraits with detailed facial anatomy
  const characterDesigns = {
    humanoid: `
      <!-- Photorealistic Human Wizard Portrait -->
      <g filter="url(#${shadowId})">
        <!-- Head structure with realistic proportions -->
        <ellipse cx="60" cy="28" rx="19" ry="23" fill="url(#${skinGradientId})" stroke="rgba(139,69,19,0.3)" stroke-width="0.8"/>
        
        <!-- Facial bone structure and contouring -->
        <path d="M44,32 Q48,36 52,32" fill="rgba(139,69,19,0.15)" opacity="0.6"/>
        <path d="M68,32 Q72,36 76,32" fill="rgba(139,69,19,0.15)" opacity="0.6"/>
        <path d="M56,20 Q60,18 64,20" fill="rgba(255,255,255,0.1)" opacity="0.8"/>
        
        <!-- Realistic hair with individual strands and texture -->
        <path d="M41,20 Q45,8 50,12 Q55,6 60,10 Q65,6 70,12 Q75,8 79,20 Q77,28 72,25 Q67,22 60,24 Q53,22 48,25 Q43,28 41,20" fill="url(#${hairGradientId})" stroke="rgba(101,67,33,0.4)" stroke-width="0.6"/>
        <!-- Hair texture details -->
        <path d="M44,16 Q49,10 54,16 Q59,10 64,16 Q69,10 74,16" stroke="rgba(101,67,33,0.6)" stroke-width="0.4" fill="none"/>
        <path d="M46,22 Q51,18 56,22 Q61,18 66,22 Q71,18 76,22" stroke="rgba(101,67,33,0.4)" stroke-width="0.3" fill="none"/>
        
        <!-- Detailed realistic eyes with depth -->
        <ellipse cx="53" cy="24" rx="5" ry="3.5" fill="#ffffff" stroke="rgba(0,0,0,0.2)" stroke-width="0.4"/>
        <ellipse cx="67" cy="24" rx="5" ry="3.5" fill="#ffffff" stroke="rgba(0,0,0,0.2)" stroke-width="0.4"/>
        <!-- Iris with realistic coloring -->
        <circle cx="53" cy="24" r="2.8" fill="url(#${eyeGradientId})"/>
        <circle cx="67" cy="24" r="2.8" fill="url(#${eyeGradientId})"/>
        <!-- Pupils -->
        <circle cx="53" cy="24" r="1.2" fill="#000000"/>
        <circle cx="67" cy="24" r="1.2" fill="#000000"/>
        <!-- Light reflections -->
        <circle cx="54" cy="23" r="0.6" fill="#ffffff" opacity="0.9"/>
        <circle cx="68" cy="23" r="0.6" fill="#ffffff" opacity="0.9"/>
        <!-- Upper eyelids -->
        <path d="M48,22 Q53,21 58,22" stroke="rgba(139,69,19,0.6)" stroke-width="1" fill="none"/>
        <path d="M62,22 Q67,21 72,22" stroke="rgba(139,69,19,0.6)" stroke-width="1" fill="none"/>
        
        <!-- Detailed eyebrows with individual hairs -->
        <path d="M48,20 Q53,19 58,20" stroke="url(#${hairGradientId})" stroke-width="1.5" fill="none"/>
        <path d="M62,20 Q67,19 72,20" stroke="url(#${hairGradientId})" stroke-width="1.5" fill="none"/>
        <path d="M49,19.5 L50,20.5 M51,19 L52,20 M54,19 L55,20 M56,19.5 L57,20.5" stroke="rgba(101,67,33,0.8)" stroke-width="0.3"/>
        <path d="M63,19.5 L64,20.5 M65,19 L66,20 M68,19 L69,20 M70,19.5 L71,20.5" stroke="rgba(101,67,33,0.8)" stroke-width="0.3"/>
        
        <!-- Realistic nose with proper anatomy -->
        <path d="M59,27 Q60,29 61,27 L60,33 Q59.5,34 60,34 Q60.5,34 60,33 Z" fill="rgba(139,69,19,0.2)" stroke="rgba(139,69,19,0.4)" stroke-width="0.5"/>
        <ellipse cx="58.5" cy="33" rx="0.8" ry="1.2" fill="rgba(139,69,19,0.3)"/>
        <ellipse cx="61.5" cy="33" rx="0.8" ry="1.2" fill="rgba(139,69,19,0.3)"/>
        
        <!-- Realistic mouth with lip definition -->
        <path d="M56,37 Q58,39 60,38.5 Q62,39 64,37" stroke="rgba(139,69,19,0.8)" stroke-width="1.2" fill="none"/>
        <path d="M57,37.5 Q60,38.8 63,37.5" fill="rgba(205,92,92,0.6)" stroke="rgba(139,69,19,0.4)" stroke-width="0.3"/>
        
        <!-- Jaw and chin definition -->
        <path d="M45,35 Q50,38 55,36" stroke="rgba(139,69,19,0.2)" stroke-width="0.6" fill="none"/>
        <path d="M65,36 Q70,38 75,35" stroke="rgba(139,69,19,0.2)" stroke-width="0.6" fill="none"/>
        
        <!-- Elaborate wizard robes with realistic fabric folds -->
        <path d="M35,48 Q60,42 85,48 L88,92 Q70,102 60,100 Q50,102 32,92 Z" fill="url(#${robeGradientId})" stroke="rgba(0,0,0,0.4)" stroke-width="1.2"/>
        <!-- Fabric fold details -->
        <path d="M40,55 Q45,52 50,55 Q55,52 60,55 Q65,52 70,55 Q75,52 80,55" stroke="rgba(0,0,0,0.2)" stroke-width="0.8" fill="none"/>
        <path d="M42,70 Q47,67 52,70 Q57,67 62,70 Q67,67 72,70 Q77,67 82,70" stroke="rgba(0,0,0,0.15)" stroke-width="0.6" fill="none"/>
        <path d="M38,85 Q43,82 48,85 Q53,82 58,85 Q63,82 68,85 Q73,82 78,85" stroke="rgba(0,0,0,0.1)" stroke-width="0.5" fill="none"/>
        
        <!-- Ornate magical embellishments -->
        <circle cx="60" cy="62" r="4" fill="#daa520" stroke="#b8860b" stroke-width="1"/>
        <path d="M56,58 L64,58 L64,66 L56,66 Z" stroke="#ffd700" stroke-width="0.8" fill="none"/>
        <circle cx="60" cy="62" r="1.5" fill="#ffd700"/>
      </g>
    `,
    beast: `
      <!-- Photorealistic Werewolf Animagus -->
      <g filter="url(#${shadowId})">
        <!-- Lupine head with realistic fur texture -->
        <ellipse cx="60" cy="30" rx="22" ry="20" fill="#cd853f" stroke="rgba(139,69,19,0.6)" stroke-width="1.2"/>
        
        <!-- Individual fur strands and texture -->
        <path d="M38,22 Q42,18 46,22 Q50,18 54,22 Q58,18 62,22 Q66,18 70,22 Q74,18 78,22 Q82,18 82,22" stroke="#8b4513" stroke-width="0.8" fill="none"/>
        <path d="M40,26 Q44,22 48,26 Q52,22 56,26 Q60,22 64,26 Q68,22 72,26 Q76,22 80,26" stroke="#a0522d" stroke-width="0.6" fill="none"/>
        <path d="M42,30 Q46,26 50,30 Q54,26 58,30 Q62,26 66,30 Q70,26 74,30 Q78,26 82,30" stroke="#654321" stroke-width="0.4" fill="none"/>
        
        <!-- Fierce predatory eyes with realistic depth -->
        <ellipse cx="52" cy="26" rx="6" ry="4" fill="#000000" stroke="rgba(255,215,0,0.8)" stroke-width="1"/>
        <ellipse cx="68" cy="26" rx="6" ry="4" fill="#000000" stroke="rgba(255,215,0,0.8)" stroke-width="1"/>
        <ellipse cx="52" cy="26" rx="4" ry="3" fill="#ffd700"/>
        <ellipse cx="68" cy="26" rx="4" ry="3" fill="#ffd700"/>
        <ellipse cx="52" cy="26" rx="2" ry="1.5" fill="#000000"/>
        <ellipse cx="68" cy="26" rx="2" ry="1.5" fill="#000000"/>
        <circle cx="53" cy="25" r="0.5" fill="#ffffff" opacity="0.9"/>
        <circle cx="69" cy="25" r="0.5" fill="#ffffff" opacity="0.9"/>
        
        <!-- Extended snout with realistic proportions -->
        <ellipse cx="60" cy="34" rx="10" ry="8" fill="#cd853f" stroke="rgba(139,69,19,0.4)" stroke-width="0.8"/>
        <ellipse cx="60" cy="32" rx="2" ry="1.5" fill="#000000"/>
        <ellipse cx="58" cy="35" rx="1" ry="0.5" fill="#000000"/>
        <ellipse cx="62" cy="35" rx="1" ry="0.5" fill="#000000"/>
        
        <!-- Sharp canine teeth -->
        <path d="M54,38 L56,42 L58,38 L60,42 L62,38 L64,42 L66,38" stroke="#ffffff" stroke-width="1.8" fill="none"/>
        <path d="M55,39 L57,43 L59,39 L61,43 L63,39 L65,43" stroke="#f5f5f5" stroke-width="1.2" fill="none"/>
        
        <!-- Torn and weathered robes -->
        <path d="M32,50 Q60,44 88,50 L92,94 Q70,104 60,102 Q50,104 28,94 Z" fill="url(#${robeGradientId})" stroke="rgba(101,67,33,0.8)" stroke-width="1.5"/>
        <!-- Realistic fabric tears and battle damage -->
        <path d="M38,58 L42,62 L46,58 L50,62 L54,58" stroke="rgba(139,69,19,0.6)" stroke-width="1.5" fill="none"/>
        <path d="M66,58 L70,62 L74,58 L78,62 L82,58" stroke="rgba(139,69,19,0.6)" stroke-width="1.5" fill="none"/>
        <path d="M36,78 L40,82 L44,78 L48,82 L52,78" stroke="rgba(139,69,19,0.4)" stroke-width="1.2" fill="none"/>
        <path d="M68,78 L72,82 L76,78 L80,82 L84,78" stroke="rgba(139,69,19,0.4)" stroke-width="1.2" fill="none"/>
      </g>
    `,
    construct: `
      <!-- Photorealistic Stone Golem Construct -->
      <g filter="url(#${shadowId})">
        <!-- Carved stone head with realistic weathering -->
        <path d="M38,18 L82,18 L84,42 L82,45 L38,45 L36,42 Z" fill="#708090" stroke="#2f4f4f" stroke-width="2"/>
        <!-- Stone texture and weathering details -->
        <path d="M40,20 L80,20 L78,43 L42,43 Z" fill="#778899" stroke="#556b2f" stroke-width="0.8"/>
        <path d="M44,22 L76,22 M44,26 L76,26 M44,30 L76,30 M44,34 L76,34 M44,38 L76,38" stroke="#696969" stroke-width="0.5"/>
        <path d="M48,20 L48,43 M56,20 L56,43 M64,20 L64,43 M72,20 L72,43" stroke="#696969" stroke-width="0.4"/>
        
        <!-- Glowing magical rune eyes with depth -->
        <rect x="46" y="24" width="10" height="12" rx="3" fill="#000a1a" stroke="#003366" stroke-width="1.5"/>
        <rect x="64" y="24" width="10" height="12" rx="3" fill="#000a1a" stroke="#003366" stroke-width="1.5"/>
        <rect x="48" y="26" width="6" height="8" rx="2" fill="#00bfff" stroke="#0080ff" stroke-width="1"/>
        <rect x="66" y="26" width="6" height="8" rx="2" fill="#00bfff" stroke="#0080ff" stroke-width="1"/>
        <circle cx="51" cy="30" r="2" fill="#87ceeb" opacity="0.9"/>
        <circle cx="69" cy="30" r="2" fill="#87ceeb" opacity="0.9"/>
        <circle cx="52" cy="29" r="1" fill="#ffffff"/>
        <circle cx="70" cy="29" r="1" fill="#ffffff"/>
        
        <!-- Carved mouth with stone detail -->
        <rect x="52" y="38" width="16" height="5" rx="2" fill="#2f4f4f" stroke="#1a1a1a" stroke-width="1"/>
        <path d="M54,40 L66,40 M54,42 L66,42" stroke="#404040" stroke-width="0.5"/>
        
        <!-- Massive stone body with realistic masonry -->
        <path d="M30,48 Q60,42 90,48 L94,96 Q70,106 60,104 Q50,106 26,96 Z" fill="#708090" stroke="#2f4f4f" stroke-width="2.5"/>
        <!-- Stone block construction details -->
        <path d="M32,54 L88,54 M32,66 L88,66 M32,78 L88,78 M32,90 L88,90" stroke="#556b2f" stroke-width="1"/>
        <path d="M42,48 L42,96 M54,48 L54,96 M66,48 L66,96 M78,48 L78,96" stroke="#556b2f" stroke-width="0.8"/>
        
        <!-- Magical core with realistic glow effects -->
        <circle cx="60" cy="72" r="10" fill="#001a33" stroke="#003366" stroke-width="2"/>
        <circle cx="60" cy="72" r="7" fill="#00bfff" opacity="0.8"/>
        <circle cx="60" cy="72" r="4" fill="#87ceeb" opacity="0.9"/>
        <circle cx="60" cy="72" r="2" fill="#ffffff"/>
        
        <!-- Energy conduits -->
        <path d="M50,72 L32,58 M70,72 L88,58 M50,72 L32,86 M70,72 L88,86" stroke="#00bfff" stroke-width="2.5" opacity="0.7"/>
        <path d="M52,72 L36,62 M68,72 L84,62 M52,72 L36,82 M68,72 L84,82" stroke="#87ceeb" stroke-width="1.5" opacity="0.5"/>
      </g>
    `,
    undead: `
      <!-- Photorealistic Death Eater Necromancer -->
      <g filter="url(#${shadowId})">
        <!-- Gaunt, skull-like face with realistic bone structure -->
        <ellipse cx="60" cy="30" rx="17" ry="22" fill="#e6e6fa" stroke="rgba(75,0,130,0.8)" stroke-width="1.2"/>
        
        <!-- Sunken cheek contours -->
        <path d="M43,32 Q47,36 51,32" fill="rgba(139,69,19,0.25)" opacity="0.8"/>
        <path d="M69,32 Q73,36 77,32" fill="rgba(139,69,19,0.25)" opacity="0.8"/>
        <path d="M45,28 Q50,30 55,28" fill="rgba(105,105,105,0.3)" opacity="0.6"/>
        <path d="M65,28 Q70,30 75,28" fill="rgba(105,105,105,0.3)" opacity="0.6"/>
        
        <!-- Lank, greasy hair -->
        <path d="M43,18 Q48,8 53,14 Q58,6 60,12 Q62,6 67,14 Q72,8 77,18 Q79,26 74,28 Q67,24 60,26 Q53,24 46,28 Q41,26 43,18" fill="#2e2e2e" stroke="#1a1a1a" stroke-width="0.8"/>
        <path d="M45,20 Q50,12 55,20 Q60,12 65,20 Q70,12 75,20" stroke="#404040" stroke-width="0.5" fill="none"/>
        
        <!-- Glowing red eyes of malevolence -->
        <ellipse cx="52" cy="26" rx="4.5" ry="5" fill="#000000" stroke="rgba(139,0,0,1)" stroke-width="1.5"/>
        <ellipse cx="68" cy="26" rx="4.5" ry="5" fill="#000000" stroke="rgba(139,0,0,1)" stroke-width="1.5"/>
        <ellipse cx="52" cy="26" rx="3" ry="3.5" fill="#8b0000"/>
        <ellipse cx="68" cy="26" rx="3" ry="3.5" fill="#8b0000"/>
        <circle cx="52" cy="26" r="2" fill="#ff0000"/>
        <circle cx="68" cy="26" r="2" fill="#ff0000"/>
        <circle cx="52.5" cy="25" r="0.8" fill="#ffffff" opacity="0.9"/>
        <circle cx="68.5" cy="25" r="0.8" fill="#ffffff" opacity="0.9"/>
        
        <!-- Skeletal nose cavity -->
        <path d="M58,30 L62,30 L60,36 Z" fill="rgba(139,69,19,0.5)" stroke="rgba(75,0,130,0.8)" stroke-width="0.8"/>
        <ellipse cx="59" cy="35" rx="1" ry="1.5" fill="rgba(105,105,105,0.6)"/>
        <ellipse cx="61" cy="35" rx="1" ry="1.5" fill="rgba(105,105,105,0.6)"/>
        
        <!-- Thin, cruel mouth -->
        <path d="M55,40 Q60,42 65,40" stroke="rgba(75,0,130,1)" stroke-width="1.8" fill="none"/>
        <path d="M56,40.5 Q60,41.8 64,40.5" fill="rgba(139,0,139,0.4)" stroke="rgba(75,0,130,0.6)" stroke-width="0.4"/>
        
        <!-- Dark necromancer robes with realistic fabric flow -->
        <path d="M32,50 Q60,44 88,50 L92,96 Q70,106 60,104 Q50,106 28,96 Z" fill="#2e2e2e" stroke="rgba(75,0,130,1)" stroke-width="1.8"/>
        <!-- Death magic aura and embroidered symbols -->
        <path d="M36,58 Q41,54 46,58 Q51,54 56,58 Q61,54 66,58 Q71,54 76,58 Q81,54 86,58" stroke="#8a2be2" stroke-width="2" fill="none" opacity="0.9"/>
        <path d="M38,76 Q43,72 48,76 Q53,72 58,76 Q63,72 68,76 Q73,72 78,76 Q83,72 88,76" stroke="#9370db" stroke-width="1.5" fill="none" opacity="0.7"/>
        
        <!-- Floating necromantic orbs -->
        <circle cx="42" cy="82" r="3" fill="#8a2be2" opacity="0.8"/>
        <circle cx="78" cy="88" r="3" fill="#9370db" opacity="0.8"/>
        <circle cx="42" cy="82" r="1.5" fill="#ffffff" opacity="0.6"/>
        <circle cx="78" cy="88" r="1.5" fill="#ffffff" opacity="0.6"/>
      </g>
    `,
    elemental: `
      <!-- Photorealistic Phoenix Fire Elemental -->
      <g filter="url(#${shadowId})">
        <!-- Flame-wreathed head with realistic fire effects -->
        <ellipse cx="60" cy="30" rx="20" ry="22" fill="#ff6347" stroke="rgba(255,69,0,1)" stroke-width="1.8"/>
        
        <!-- Realistic flowing fire hair -->
        <path d="M40,18 Q42,6 47,10 Q52,2 57,8 Q60,1 63,8 Q68,2 73,10 Q78,6 80,18 Q82,28 77,30 Q70,26 60,28 Q50,26 43,30 Q38,28 40,18" fill="#ff4500" stroke="#ff6347" stroke-width="1"/>
        <path d="M42,14 Q45,4 50,12 Q55,3 60,9 Q65,3 70,12 Q75,4 78,14" fill="#ffa500" stroke="#ff8c00" stroke-width="0.8"/>
        <path d="M44,16 Q47,8 52,14 Q57,7 62,13 Q67,7 72,14 Q75,8 78,16" fill="#ffff00" stroke="#ffd700" stroke-width="0.6"/>
        <!-- Individual flame tongues -->
        <path d="M46,12 Q48,8 50,12 M54,10 Q56,6 58,10 M62,10 Q64,6 66,10 M70,12 Q72,8 74,12" stroke="#ffffff" stroke-width="0.4" opacity="0.8"/>
        
        <!-- Blazing eyes with intense inner fire -->
        <ellipse cx="52" cy="26" rx="5" ry="4" fill="#000000" stroke="rgba(255,0,0,1)" stroke-width="1.5"/>
        <ellipse cx="68" cy="26" rx="5" ry="4" fill="#000000" stroke="rgba(255,0,0,1)" stroke-width="1.5"/>
        <ellipse cx="52" cy="26" rx="3.5" ry="3" fill="#8b0000"/>
        <ellipse cx="68" cy="26" rx="3.5" ry="3" fill="#8b0000"/>
        <circle cx="52" cy="26" r="2.5" fill="#ff4500"/>
        <circle cx="68" cy="26" r="2.5" fill="#ff4500"/>
        <circle cx="52" cy="26" r="1.5" fill="#ffff00"/>
        <circle cx="68" cy="26" r="1.5" fill="#ffff00"/>
        <circle cx="52.5" cy="25" r="0.8" fill="#ffffff"/>
        <circle cx="68.5" cy="25" r="0.8" fill="#ffffff"/>
        
        <!-- Fire emanating from mouth -->
        <path d="M56,34 Q58,38 60,36 Q62,38 64,34 Q60,40 56,36" fill="#ff4500" stroke="#ff0000" stroke-width="1.2"/>
        <path d="M57,35 Q60,37 63,35" fill="#ffa500" stroke="#ff8c00" stroke-width="0.8"/>
        
        <!-- Elemental body wreathed in flames -->
        <path d="M30,50 Q60,44 90,50 L94,96 Q70,106 60,104 Q50,106 26,96 Z" fill="url(#${robeGradientId})" stroke="rgba(255,69,0,1)" stroke-width="1.8"/>
        <!-- Realistic flame patterns dancing on robes -->
        <path d="M34,58 Q37,54 40,58 Q43,54 46,58 Q49,54 52,58 Q55,54 58,58 Q61,54 64,58 Q67,54 70,58 Q73,54 76,58 Q79,54 82,58 Q85,54 88,58" stroke="#ff4500" stroke-width="2.5" fill="none"/>
        <path d="M36,76 Q39,72 42,76 Q45,72 48,76 Q51,72 54,76 Q57,72 60,76 Q63,72 66,76 Q69,72 72,76 Q75,72 78,76 Q81,72 84,76 Q87,72 90,76" stroke="#ffa500" stroke-width="2" fill="none"/>
        
        <!-- Floating fire orbs -->
        <circle cx="42" cy="82" r="4" fill="#ff4500" opacity="0.9"/>
        <circle cx="78" cy="88" r="4" fill="#ffa500" opacity="0.9"/>
        <circle cx="42" cy="82" r="2" fill="#ffffff" opacity="0.7"/>
        <circle cx="78" cy="88" r="2" fill="#ffffff" opacity="0.7"/>
      </g>
    `,
    celestial: `
      <!-- Photorealistic Divine Angel/Patronus -->
      <g filter="url(#${shadowId})">
        <!-- Divine halo with realistic glow -->
        <ellipse cx="60" cy="12" rx="28" ry="8" fill="none" stroke="#ffd700" stroke-width="4" opacity="0.95"/>
        <ellipse cx="60" cy="12" rx="24" ry="6" fill="none" stroke="#ffffff" stroke-width="2" opacity="0.7"/>
        <circle cx="42" cy="12" r="2.5" fill="#ffd700" opacity="0.9"/>
        <circle cx="78" cy="12" r="2.5" fill="#ffd700" opacity="0.9"/>
        <circle cx="60" cy="10" r="1.8" fill="#ffffff"/>
        
        <!-- Radiant divine face -->
        <ellipse cx="60" cy="30" rx="18" ry="22" fill="url(#${skinGradientId})" stroke="rgba(255,215,0,1)" stroke-width="1.5"/>
        <!-- Divine light emanating from face -->
        <path d="M56,22 Q60,20 64,22" fill="rgba(255,255,255,0.3)" opacity="0.8"/>
        <path d="M54,26 Q60,24 66,26" fill="rgba(255,255,255,0.2)" opacity="0.6"/>
        
        <!-- Golden hair with divine radiance -->
        <path d="M42,20 Q47,8 52,14 Q57,6 60,12 Q63,6 68,14 Q73,8 78,20 Q80,28 75,30 Q68,26 60,28 Q52,26 45,30 Q40,28 42,20" fill="#ffd700" stroke="#ffb347" stroke-width="1.2"/>
        <!-- Hair highlights and divine shimmer -->
        <path d="M44,18 Q49,10 54,18 Q59,10 64,18 Q69,10 74,18" stroke="#ffffff" stroke-width="0.8" opacity="0.8"/>
        <path d="M46,22 Q51,16 56,22 Q61,16 66,22 Q71,16 76,22" stroke="#ffe135" stroke-width="0.6" opacity="0.6"/>
        
        <!-- Pure white glowing eyes -->
        <ellipse cx="52" cy="26" rx="4.5" ry="4" fill="#ffffff" stroke="rgba(255,215,0,1)" stroke-width="1.2"/>
        <ellipse cx="68" cy="26" rx="4.5" ry="4" fill="#ffffff" stroke="rgba(255,215,0,1)" stroke-width="1.2"/>
        <circle cx="52" cy="26" r="2.5" fill="#87ceeb"/>
        <circle cx="68" cy="26" r="2.5" fill="#87ceeb"/>
        <circle cx="52" cy="26" r="1.2" fill="#4682b4"/>
        <circle cx="68" cy="26" r="1.2" fill="#4682b4"/>
        <circle cx="52.8" cy="25.2" r="0.8" fill="#ffffff"/>
        <circle cx="68.8" cy="25.2" r="0.8" fill="#ffffff"/>
        
        <!-- Serene, benevolent expression -->
        <path d="M56,36 Q60,38 64,36" stroke="rgba(255,215,0,1)" stroke-width="1.5" fill="none"/>
        <path d="M57,36.5 Q60,37.8 63,36.5" fill="rgba(205,92,92,0.4)" stroke="rgba(255,215,0,0.6)" stroke-width="0.4"/>
        
        <!-- Divine robes with celestial patterns -->
        <path d="M32,50 Q60,44 88,50 L92,96 Q70,106 60,104 Q50,106 28,96 Z" fill="#f0f8ff" stroke="rgba(255,215,0,1)" stroke-width="1.8"/>
        <!-- Golden trim and divine embroidery -->
        <path d="M36,58 Q41,54 46,58 Q51,54 56,58 Q61,54 66,58 Q71,54 76,58 Q81,54 86,58" stroke="#ffd700" stroke-width="3" fill="none"/>
        <path d="M38,76 Q43,72 48,76 Q53,72 58,76 Q63,72 68,76 Q73,72 78,76 Q83,72 88,76" stroke="#ffe135" stroke-width="2.5" fill="none"/>
        <circle cx="60" cy="82" r="5" fill="#ffd700" opacity="0.9"/>
        <circle cx="60" cy="82" r="3" fill="#ffffff" opacity="0.7"/>
        
        <!-- Divine light rays -->
        <path d="M30,22 L42,28 M90,22 L78,28 M60,5 L60,18 M40,14 L48,24 M80,14 L72,24" stroke="#ffd700" stroke-width="2.5" opacity="0.8"/>
        <path d="M32,24 L44,30 M88,24 L76,30 M42,16 L50,26 M78,16 L70,26" stroke="#ffffff" stroke-width="1.5" opacity="0.6"/>
      </g>
    `,
    alien: `
      <!-- Photorealistic Otherworldly Eldritch Scholar -->
      <g filter="url(#${shadowId})">
        <!-- Elongated alien cranium with realistic anatomy -->
        <ellipse cx="60" cy="34" rx="26" ry="26" fill="#e6f3e6" stroke="rgba(0,128,128,0.8)" stroke-width="1.5"/>
        <!-- Alien brain ridges and cranial features -->
        <path d="M34,24 Q40,14 46,20 Q52,12 58,18 Q62,12 66,18 Q72,12 78,20 Q84,14 90,24" stroke="rgba(0,100,100,1)" stroke-width="2.5" fill="none"/>
        <path d="M36,28 Q42,20 48,28 Q54,20 60,28 Q66,20 72,28 Q78,20 84,28" stroke="rgba(0,100,100,0.8)" stroke-width="2" fill="none"/>
        <path d="M38,32 Q44,26 50,32 Q56,26 62,32 Q68,26 74,32 Q80,26 86,32" stroke="rgba(0,100,100,0.6)" stroke-width="1.5" fill="none"/>
        
        <!-- Large, hypnotic alien eyes with realistic depth -->
        <ellipse cx="46" cy="32" rx="12" ry="14" fill="#000000" stroke="rgba(0,255,255,1)" stroke-width="2.5"/>
        <ellipse cx="74" cy="32" rx="12" ry="14" fill="#000000" stroke="rgba(0,255,255,1)" stroke-width="2.5"/>
        <!-- Alien iris structure -->
        <ellipse cx="46" cy="32" rx="8" ry="10" fill="#008b8b"/>
        <ellipse cx="74" cy="32" rx="8" ry="10" fill="#008b8b"/>
        <ellipse cx="46" cy="32" rx="6" ry="8" fill="#00ffff"/>
        <ellipse cx="74" cy="32" rx="6" ry="8" fill="#00ffff"/>
        <ellipse cx="46" cy="32" rx="4" ry="6" fill="#000000"/>
        <ellipse cx="74" cy="32" rx="4" ry="6" fill="#000000"/>
        <!-- Alien pupils and reflections -->
        <ellipse cx="46" cy="30" rx="2" ry="3" fill="#ffffff" opacity="0.9"/>
        <ellipse cx="74" cy="30" rx="2" ry="3" fill="#ffffff" opacity="0.9"/>
        <circle cx="47" cy="29" r="1" fill="#87ceeb" opacity="0.8"/>
        <circle cx="75" cy="29" r="1" fill="#87ceeb" opacity="0.8"/>
        
        <!-- Small, slit-like mouth -->
        <ellipse cx="60" cy="46" rx="5" ry="2.5" fill="rgba(0,100,100,0.6)" stroke="rgba(0,128,128,1)" stroke-width="1"/>
        <path d="M57,46 L63,46" stroke="rgba(0,150,150,0.8)" stroke-width="0.8"/>
        
        <!-- Scholar robes with alien script patterns -->
        <path d="M26,54 Q60,48 94,54 L98,98 Q70,108 60,106 Q50,108 22,98 Z" fill="url(#${robeGradientId})" stroke="rgba(0,128,128,1)" stroke-width="1.8"/>
        <!-- Alien script and technological patterns -->
        <path d="M30,62 Q35,58 40,62 Q45,58 50,62 Q55,58 60,62 Q65,58 70,62 Q75,58 80,62 Q85,58 90,62" stroke="#00ffff" stroke-width="2.5" fill="none"/>
        <path d="M32,80 Q37,76 42,80 Q47,76 52,80 Q57,76 62,80 Q67,76 72,80 Q77,76 82,80 Q87,76 92,80" stroke="#20b2aa" stroke-width="2" fill="none"/>
        
        <!-- Floating alien technology -->
        <circle cx="38" cy="86" r="3.5" fill="#00ffff" opacity="0.8"/>
        <circle cx="82" cy="92" r="3.5" fill="#20b2aa" opacity="0.8"/>
        <circle cx="38" cy="86" r="1.8" fill="#ffffff" opacity="0.7"/>
        <circle cx="82" cy="92" r="1.8" fill="#ffffff" opacity="0.7"/>
        
        <!-- Tentacle-like appendages -->
        <path d="M28,88 Q18,94 24,100 Q30,94 26,88" stroke="rgba(0,128,128,0.9)" stroke-width="4" fill="none"/>
        <path d="M92,88 Q102,94 96,100 Q90,94 94,88" stroke="rgba(0,128,128,0.9)" stroke-width="4" fill="none"/>
      </g>
    `,
    arcane: `
      <!-- Photorealistic Dark Arts Sorcerer -->
      <g filter="url(#${shadowId})">
        <!-- Mysterious, shadowed face -->
        <ellipse cx="60" cy="30" rx="19" ry="22" fill="url(#${skinGradientId})" stroke="rgba(128,0,128,1)" stroke-width="1.5"/>
        
        <!-- Dark hair with mystical energy -->
        <path d="M41,20 Q46,8 51,14 Q56,6 60,12 Q64,6 69,14 Q74,8 79,20 Q81,28 76,30 Q69,26 60,28 Q51,26 44,30 Q39,28 41,20" fill="#2e2e2e" stroke="#4b0082" stroke-width="1.2"/>
        <!-- Mystical energy in hair -->
        <path d="M43,18 Q48,10 53,18 Q58,10 63,18 Q68,10 73,18" stroke="#8a2be2" stroke-width="1" fill="none" opacity="0.8"/>
        <path d="M45,22 Q50,16 55,22 Q60,16 65,22 Q70,16 75,22" stroke="#9370db" stroke-width="0.8" fill="none" opacity="0.6"/>
        
        <!-- Glowing purple arcane eyes -->
        <ellipse cx="52" cy="26" rx="4.5" ry="4" fill="#000000" stroke="rgba(138,43,226,1)" stroke-width="1.5"/>
        <ellipse cx="68" cy="26" rx="4.5" ry="4" fill="#000000" stroke="rgba(138,43,226,1)" stroke-width="1.5"/>
        <ellipse cx="52" cy="26" rx="3" ry="3" fill="#4b0082"/>
        <ellipse cx="68" cy="26" rx="3" ry="3" fill="#4b0082"/>
        <circle cx="52" cy="26" r="2" fill="#8a2be2"/>
        <circle cx="68" cy="26" r="2" fill="#8a2be2"/>
        <circle cx="52.5" cy="25" r="0.8" fill="#ffffff" opacity="0.9"/>
        <circle cx="68.5" cy="25" r="0.8" fill="#ffffff" opacity="0.9"/>
        
        <!-- Mystical markings on face -->
        <path d="M46,22 Q52,20 58,22" stroke="#8a2be2" stroke-width="1.2" fill="none" opacity="0.8"/>
        <path d="M62,22 Q68,20 74,22" stroke="#8a2be2" stroke-width="1.2" fill="none" opacity="0.8"/>
        <path d="M48,28 Q52,26 56,28" stroke="#9370db" stroke-width="0.8" fill="none" opacity="0.6"/>
        <path d="M64,28 Q68,26 72,28" stroke="#9370db" stroke-width="0.8" fill="none" opacity="0.6"/>
        
        <!-- Arcane mouth with spell incantations -->
        <path d="M56,36 Q60,38 64,36" stroke="rgba(128,0,128,1)" stroke-width="1.8" fill="none"/>
        <path d="M57,36.5 Q60,37.8 63,36.5" fill="rgba(139,0,139,0.4)" stroke="rgba(128,0,128,0.6)" stroke-width="0.4"/>
        
        <!-- Dark sorcerer robes with arcane patterns -->
        <path d="M30,50 Q60,44 90,50 L94,96 Q70,106 60,104 Q50,106 26,96 Z" fill="#191970" stroke="rgba(128,0,128,1)" stroke-width="1.8"/>
        <!-- Arcane symbols embroidered with glowing thread -->
        <path d="M34,58 Q39,54 44,58 Q49,54 54,58 Q59,54 64,58 Q69,54 74,58 Q79,54 84,58 Q89,54 94,58" stroke="#8a2be2" stroke-width="2.5" fill="none"/>
        <path d="M36,76 Q41,72 46,76 Q51,72 56,76 Q61,72 66,76 Q71,72 76,76 Q81,72 86,76 Q91,72 96,76" stroke="#9370db" stroke-width="2" fill="none"/>
        
        <!-- Central arcane sigil -->
        <circle cx="60" cy="82" r="5" fill="#8a2be2" opacity="0.9" stroke="#4b0082" stroke-width="1.5"/>
        <path d="M55,77 L65,77 L65,87 L55,87 Z" stroke="#9370db" stroke-width="1.2" fill="none"/>
        <path d="M57,79 L63,85 M63,79 L57,85" stroke="#dda0dd" stroke-width="1" fill="none"/>
        
        <!-- Floating mystical orbs -->
        <circle cx="36" cy="84" r="3.5" fill="#8a2be2" opacity="0.8"/>
        <circle cx="84" cy="90" r="3.5" fill="#9370db" opacity="0.8"/>
        <circle cx="36" cy="84" r="1.8" fill="#ffffff" opacity="0.6"/>
        <circle cx="84" cy="90" r="1.8" fill="#ffffff" opacity="0.6"/>
        
        <!-- Dark energy wisps -->
        <path d="M32,88 Q26,84 30,92 Q34,88 32,88" stroke="#4b0082" stroke-width="2.5" fill="none" opacity="0.9"/>
        <path d="M88,94 Q94,90 90,98 Q86,94 88,94" stroke="#4b0082" stroke-width="2.5" fill="none" opacity="0.9"/>
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
    <defs>
      <!-- Professional lighting and shadow effects -->
      <filter id="${shadowId}">
        <feGaussianBlur in="SourceAlpha" stdDeviation="3"/>
        <feOffset dx="2" dy="4" result="offset"/>
        <feComponentTransfer>
          <feFuncA type="linear" slope="0.4"/>
        </feComponentTransfer>
        <feMerge>
          <feMergeNode/>
          <feMergeNode in="SourceGraphic"/>
        </feMerge>
      </filter>
      
      <!-- Realistic skin gradient with subsurface scattering -->
      <radialGradient id="${skinGradientId}" cx="45%" cy="30%">
        <stop offset="0%" stop-color="#f4c2a1" stop-opacity="1"/>
        <stop offset="30%" stop-color="#e8a882" stop-opacity="1"/>
        <stop offset="70%" stop-color="#d49464" stop-opacity="1"/>
        <stop offset="100%" stop-color="#c17d47" stop-opacity="1"/>
      </radialGradient>
      
      <!-- Realistic hair with highlights and depth -->
      <linearGradient id="${hairGradientId}" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#8b4513"/>
        <stop offset="25%" stop-color="#a0522d"/>
        <stop offset="50%" stop-color="#654321"/>
        <stop offset="75%" stop-color="#8b4513"/>
        <stop offset="100%" stop-color="#4a2c17"/>
      </linearGradient>
      
      <!-- Realistic eye coloring -->
      <radialGradient id="${eyeGradientId}" cx="50%" cy="50%">
        <stop offset="0%" stop-color="#4682b4"/>
        <stop offset="40%" stop-color="#2d5aa0"/>
        <stop offset="80%" stop-color="#1e3d72"/>
        <stop offset="100%" stop-color="#0f1f36"/>
      </radialGradient>
      
      <!-- Fabric texture for robes -->
      <linearGradient id="${robeGradientId}" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stop-color="${palette}" stop-opacity="1"/>
        <stop offset="30%" stop-color="${palette}" stop-opacity="0.9"/>
        <stop offset="70%" stop-color="${palette}" stop-opacity="0.7"/>
        <stop offset="100%" stop-color="${palette}" stop-opacity="0.5"/>
      </linearGradient>
      
      <!-- Ambient lighting -->
      <filter id="${lightId}">
        <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
        <feMerge>
          <feMergeNode in="coloredBlur"/>
          <feMergeNode in="SourceGraphic"/>
        </feMerge>
      </filter>
      
      <!-- Background gradient -->
      <linearGradient id="${gradientId}" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="${palette}" stop-opacity="0.15"/>
        <stop offset="50%" stop-color="${palette}" stop-opacity="0.08"/>
        <stop offset="100%" stop-color="${palette}" stop-opacity="0.03"/>
      </linearGradient>
    </defs>
    
    <!-- Background with subtle texture -->
    <rect x="0" y="0" width="120" height="120" rx="16" fill="url(#${gradientId})" stroke="rgba(255,255,255,0.1)" stroke-width="1"/>
    
    <!-- Character portrait -->
    ${characterDesigns[base] || characterDesigns.humanoid}
    
    <!-- Props overlay -->
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
