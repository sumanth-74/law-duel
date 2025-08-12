import { randomUUID } from 'node:crypto';

const NAMES = [
  "CaseCutter","RuleRunner","VoirDireViper","MotionFalcon","DictaDagger",
  "StareDraco","PrimaFacie","ResIpsa","VerdictVandal","EquityShade",
  "OriginalistOwl","RealistRaven","TextualistTiger","PragmatistPanther",
  "FederalistFox","LiberalistLynx","ConservativeCougar","ProgressivePuma"
];

const ARCHETYPES = [
  { base: "humanoid", palette: "#5865f2", props: ["gavel","codex","briefcase"] },
  { base: "beast", palette: "#ef4444", props: ["scales","legal_pad","codex"] },
  { base: "arcane", palette: "#8b5cf6", props: ["codex","law_diploma","scales"] },
  { base: "celestial", palette: "#d4b057", props: ["scales","gavel","law_diploma"] },
  { base: "construct", palette: "#64748b", props: ["briefcase","scales","codex"] },
  { base: "undead", palette: "#111827", props: ["codex","gavel","legal_pad"] },
  { base: "elemental", palette: "#10b981", props: ["scales","briefcase","law_diploma"] },
  { base: "alien", palette: "#14b8a6", props: ["codex","legal_pad","gavel"] }
];

function bandFor(points = 0) {
  if (points < 400) return { acc: 0.52, t: [6, 10] };
  if (points < 900) return { acc: 0.62, t: [5, 9] };
  if (points < 1500) return { acc: 0.70, t: [4, 8] };
  return { acc: 0.78, t: [3, 7] };
}

function pickName() { 
  return NAMES[Math.floor(Math.random() * NAMES.length)] + Math.floor(100 + Math.random() * 900); 
}

function pick(arr) { 
  return arr[Math.floor(Math.random() * arr.length)]; 
}

function triangular(min, max, mode) {
  const u = Math.random();
  const c = (mode - min) / (max - min);
  return u < c 
    ? min + Math.sqrt(u * (max - min) * (mode - min)) 
    : max - Math.sqrt((1 - u) * (max - min) * (max - mode));
}

export function makeStealthBot({ subject, targetLevel = 1, targetPoints = 0 }) {
  const band = bandFor(targetPoints);
  const username = pickName();
  const archetype = pick(ARCHETYPES);
  const level = Math.max(1, Math.round(targetLevel + (Math.random() * 2 - 1)));
  const points = Math.max(0, targetPoints + Math.round((Math.random() * 100 - 50)));

  const id = `sb_${randomUUID().slice(0, 8)}`;

  function decide(round, correctIndex) {
    const willBeCorrect = Math.random() < band.acc + (Math.random() * 0.06 - 0.03);
    const [a, b] = band.t;
    const mode = (a + b) / 2 + (Math.random() * 0.8 - 0.4);
    const ansMs = Math.round(triangular(a * 1000, b * 1000, mode * 1000));
    const idx = willBeCorrect ? correctIndex : pick([0, 1, 2, 3].filter(i => i !== correctIndex));
    
    return { 
      idx, 
      ansMs: Math.max(1200, ansMs) 
    };
  }

  return {
    id,
    username,
    level,
    points,
    avatarData: {
      base: archetype.base,
      palette: archetype.palette,
      props: archetype.props
    },
    decide,
    isBot: true // Internal flag, never sent to client
  };
}
