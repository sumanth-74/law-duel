import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Sparkles, Heart, Zap, Clock, Shield } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { AvatarRenderer } from '@/components/AvatarRenderer';

// Atticus taunt pools
const openingTaunts = [
  "You've wandered too far without wisdom, nerd.",
  "Ah, another life squandered in folly.",
  "Your reflexes are as dull as your legal arguments.",
  "Behold — the purple storm of your humiliation.",
  "I've batted better challengers into the litter box."
];

const missTaunts = [
  "Too slow, fledgling.",
  "Were you aiming for me, or just swatting flies?",
  "Missed again — your bar card is in peril.",
  "Pathetic. I've seen interns with quicker paws.",
  "That was adorable. Wrong, but adorable."
];

const hitLines = [
  "Hmph. Beginner's luck.",
  "A scratch? I've had worse in nap time.",
  "Don't get cocky, kitten.",
  "You've got claws… but I have spells.",
  "Impressive. Now try that twice."
];

const victoryLines = [
  "Impossible! My arcane knowledge is supreme!",
  "You... you've bested me? This time.",
  "Begone! Take your lives and leave my sanctum!",
  "I'll remember this humiliation, mortal.",
  "The purple storm will return... stronger."
];

const defeatLines = [
  "As expected. Now scurry away, defeated one.",
  "Your legal career ends here, in purple flames.",
  "I barely lifted a paw. How embarrassing for you.",
  "Return when you've learned true wisdom.",
  "The litter box has more challenge than you."
];

function randomFrom(arr: string[]) {
  return arr[Math.floor(Math.random() * arr.length)];
}

interface AtticusDuelProps {
  onVictory: () => void;
  onDefeat: () => void;
  onExit: () => void;
  onRevive?: () => void; // Optional revive callback for $1 payment
}

export function AtticusDuel({ onVictory, onDefeat, onExit, onRevive }: AtticusDuelProps) {
  const [playerHealth, setPlayerHealth] = useState(100);
  const [atticusHealth, setAtticusHealth] = useState(150); // Increased from 100 to 150
  const [currentMessage, setCurrentMessage] = useState(randomFrom(openingTaunts));
  const [battlePhase, setBattlePhase] = useState<'intro' | 'battle' | 'victory' | 'defeat'>('intro');
  const [currentSpell, setCurrentSpell] = useState<string | null>(null);
  const [timeWindow, setTimeWindow] = useState<{ start: number; end: number } | null>(null);
  const [spellCasting, setSpellCasting] = useState(false);
  const [effectActive, setEffectActive] = useState<'hit' | 'miss' | null>(null);
  const [round, setRound] = useState(0);

  // Spell patterns for the reflex game - reduced damage to make it harder
  const spells = [
    { name: 'Arcane Bolt', key: 'Q', damage: 12, color: 'bg-purple-500' }, // Reduced from 20
    { name: 'Lightning Strike', key: 'W', damage: 15, color: 'bg-blue-500' }, // Reduced from 25
    { name: 'Shadow Blast', key: 'E', damage: 18, color: 'bg-gray-700' }, // Reduced from 30
    { name: 'Mystic Shield', key: 'R', damage: 10, color: 'bg-green-500' }, // Reduced from 15
  ];

  // Start the battle
  const startBattle = useCallback(() => {
    setBattlePhase('battle');
    setCurrentMessage("Cast your spells when the runes align!");
    setTimeout(() => startNewRound(), 2000);
  }, []);

  // Start a new spell round
  const startNewRound = () => {
    if (battlePhase !== 'battle') return;
    
    const spell = spells[Math.floor(Math.random() * spells.length)];
    setCurrentSpell(spell.name);
    setSpellCasting(true);
    
    // Random timing window (0.8-2.5 seconds after spell appears) - shorter delay
    const delay = 800 + Math.random() * 1700;
    const windowStart = Date.now() + delay;
    const windowEnd = windowStart + 500; // 500ms window to cast, reduced from 800ms
    
    setTimeout(() => {
      setTimeWindow({ start: windowStart, end: windowEnd });
      // Auto-fail if no input after window
      setTimeout(() => {
        setTimeWindow(prev => {
          if (prev && Date.now() > prev.end) {
            handleMiss();
            return null;
          }
          return prev;
        });
      }, 1200);
    }, delay);
  };

  // Handle keyboard input
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (battlePhase !== 'battle' || !spellCasting || !timeWindow) return;
      
      const key = e.key.toUpperCase();
      const spell = spells.find(s => s.key === key && s.name === currentSpell);
      
      if (!spell) return; // Wrong key
      
      const now = Date.now();
      if (now >= timeWindow.start && now <= timeWindow.end) {
        handleHit(spell.damage);
      } else {
        handleMiss();
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [battlePhase, spellCasting, timeWindow, currentSpell]);

  // Handle successful hit
  const handleHit = (damage: number) => {
    setSpellCasting(false);
    setTimeWindow(null);
    setEffectActive('hit');
    
    const newAtticusHealth = Math.max(0, atticusHealth - damage);
    setAtticusHealth(newAtticusHealth);
    setCurrentMessage(randomFrom(hitLines));
    
    setTimeout(() => {
      setEffectActive(null);
      if (newAtticusHealth <= 0) {
        handleVictory();
      } else {
        setRound(round + 1);
        setTimeout(() => startNewRound(), 1500);
      }
    }, 1000);
  };

  // Handle miss or wrong timing
  const handleMiss = useCallback(() => {
    if (!spellCasting) return; // Prevent double-calls
    
    setSpellCasting(false);
    setTimeWindow(null);
    setEffectActive('miss');
    
    const damage = 20 + Math.floor(Math.random() * 15); // Increased from 15-25 to 20-35
    const newPlayerHealth = Math.max(0, playerHealth - damage);
    setPlayerHealth(newPlayerHealth);
    setCurrentMessage(randomFrom(missTaunts));
    
    setTimeout(() => {
      setEffectActive(null);
      if (newPlayerHealth <= 0) {
        handleDefeat();
      } else {
        setRound(r => r + 1);
        setTimeout(() => startNewRound(), 1500);
      }
    }, 1000);
  }, [spellCasting, playerHealth]);

  // Handle victory
  const handleVictory = () => {
    setBattlePhase('victory');
    setCurrentMessage(randomFrom(victoryLines));
    setTimeout(() => {
      onVictory();
    }, 3000);
  };

  // Handle defeat
  const handleDefeat = () => {
    setBattlePhase('defeat');
    setCurrentMessage(randomFrom(defeatLines));
    setTimeout(() => {
      onDefeat();
    }, 3000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <AnimatePresence>
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="relative max-w-4xl w-full mx-4"
        >
          <Card className="bg-gradient-to-br from-purple-900/90 via-purple-800/90 to-purple-900/90 border-purple-500 shadow-2xl">
            <CardContent className="p-8">
              {/* Atticus Visual - Purple Wizard Cat */}
              <div className="text-center mb-6">
                <motion.div
                  animate={{
                    scale: effectActive === 'hit' ? [1, 1.1, 1] : 1,
                    rotate: effectActive === 'hit' ? [0, -5, 5, 0] : 0
                  }}
                  className="inline-block"
                >
                  <div className="relative inline-block">
                    {/* Atticus Avatar */}
                    <AvatarRenderer
                      avatarData={{
                        base: 'atticus',
                        palette: '#8B5CF6',
                        props: [],
                        archetypeId: 'atticus'
                      }}
                      size={150}
                      className="mx-auto"
                      animated={true}
                    />
                    <div className="absolute -top-2 -right-2 animate-pulse">
                      <Sparkles className="w-8 h-8 text-purple-400" />
                    </div>
                  </div>
                  <div className="text-purple-300 font-cinzel text-xl mt-2">Atticus the Purple Wizard Cat</div>
                </motion.div>
                
                {/* Atticus Health */}
                <div className="flex items-center justify-center gap-2 mt-4">
                  <Shield className="w-5 h-5 text-purple-400" />
                  <Progress value={(atticusHealth / 150) * 100} className="w-48 h-3 bg-purple-950" />
                  <span className="text-purple-300 text-sm font-mono">{atticusHealth}/150</span>
                </div>
              </div>

              {/* Message Box */}
              <motion.div
                key={currentMessage}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-purple-950/50 rounded-lg p-4 mb-6 border border-purple-400/30"
              >
                <p className="text-purple-100 text-center italic">"{currentMessage}"</p>
              </motion.div>

              {/* Battle Arena */}
              {battlePhase === 'battle' && (
                <div className="bg-black/40 rounded-lg p-6 mb-6 relative overflow-hidden">
                  {/* Spell Indicator */}
                  {spellCasting && currentSpell && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="text-center"
                    >
                      <div className="text-purple-300 mb-2">Cast now:</div>
                      <div className="text-3xl font-bold text-white mb-2">{currentSpell}</div>
                      <div className="flex justify-center gap-4">
                        {spells.map(spell => (
                          <div
                            key={spell.key}
                            className={`px-4 py-2 rounded ${
                              spell.name === currentSpell ? spell.color : 'bg-gray-700'
                            } ${spell.name === currentSpell ? 'animate-pulse' : ''}`}
                          >
                            <span className="text-white font-mono">Press {spell.key}</span>
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  )}

                  {/* Effect Overlays */}
                  {effectActive === 'hit' && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="absolute inset-0 bg-green-500/20 flex items-center justify-center"
                    >
                      <Zap className="w-20 h-20 text-green-400 animate-bounce" />
                    </motion.div>
                  )}
                  
                  {effectActive === 'miss' && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="absolute inset-0 bg-red-500/20 flex items-center justify-center"
                    >
                      <div className="text-6xl animate-pulse">💥</div>
                    </motion.div>
                  )}
                </div>
              )}

              {/* Player Status */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Heart className="w-5 h-5 text-red-400" />
                  <Progress value={playerHealth} className="w-48 h-3 bg-red-950" />
                  <span className="text-red-300 text-sm font-mono">{playerHealth}/100</span>
                </div>
                
                <div className="text-purple-300 text-sm">
                  Round {round + 1}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="mt-6">
                {battlePhase === 'intro' && (
                  <>
                    {/* Clear Stakes Message */}
                    <div className="bg-gradient-to-r from-green-900/40 to-purple-900/40 rounded-lg p-4 mb-4 border border-green-500/30">
                      <div className="text-center">
                        <div className="text-green-400 font-bold mb-1">🎯 THE STAKES 🎯</div>
                        <div className="text-purple-200 text-sm">
                          <div>✅ <span className="text-green-300 font-semibold">WIN:</span> Restore all 3 lives + 100 XP bonus! Continue playing immediately!</div>
                          <div className="mt-1">❌ <span className="text-red-300 font-semibold">LOSE:</span> 24-hour cooldown. Come back tomorrow.</div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex justify-center gap-4">
                      <Button
                        onClick={startBattle}
                        className="bg-purple-600 hover:bg-purple-700 text-white"
                      >
                        <Sparkles className="w-4 h-4 mr-2" />
                        Begin Duel (Win = 3 Lives)
                      </Button>
                      <Button
                        onClick={onExit}
                        variant="outline"
                        className="border-purple-400 text-purple-300 hover:bg-purple-900/50"
                      >
                        Flee in Terror
                      </Button>
                    </div>
                  </>
                )}
                
                {(battlePhase === 'victory' || battlePhase === 'defeat') && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-center"
                  >
                    <div className={`text-2xl font-bold mb-4 ${
                      battlePhase === 'victory' ? 'text-green-400' : 'text-red-400'
                    }`}>
                      {battlePhase === 'victory' ? '✨ VICTORY! ✨' : '💀 DEFEATED 💀'}
                    </div>
                    {battlePhase === 'victory' && (
                      <div className="text-purple-300">+3 Lives Restored!</div>
                    )}
                    {battlePhase === 'defeat' && onRevive && (
                      <div className="mt-4 space-y-3">
                        <div className="text-purple-300 text-sm">
                          3-hour cooldown activated. Come back in 3 hours, or...
                        </div>
                        <Button
                          onClick={onRevive}
                          className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-bold px-6 py-3"
                        >
                          <Heart className="w-4 h-4 mr-2" />
                          Revive Now for $1
                        </Button>
                        <div className="text-purple-400 text-xs">
                          Skip the cooldown and restore your lives instantly!
                        </div>
                      </div>
                    )}
                  </motion.div>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}