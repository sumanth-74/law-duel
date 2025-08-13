import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { TrendingUp, TrendingDown, Star } from 'lucide-react';

interface FeedbackChipProps {
  show: boolean;
  correct: boolean;
  xpGained: number;
  subject?: string;
  subtopic?: string;
  masteryChange?: number;
  streakBonus?: number;
}

export function FeedbackChip({
  show,
  correct,
  xpGained,
  subject,
  subtopic,
  masteryChange = 0,
  streakBonus = 0
}: FeedbackChipProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (show) {
      setVisible(true);
      const timer = setTimeout(() => setVisible(false), 3500);
      return () => clearTimeout(timer);
    }
  }, [show]);

  const totalXP = xpGained + streakBonus;
  const masterySign = masteryChange >= 0 ? '+' : '';
  
  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: -20, scale: 0.8 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -10, scale: 0.9 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
          className="fixed top-24 left-1/2 transform -translate-x-1/2 z-50"
        >
          <div className={`
            px-6 py-3 rounded-full backdrop-blur-md shadow-2xl
            ${correct 
              ? 'bg-gradient-to-r from-green-600/90 to-emerald-600/90 border border-green-400/50' 
              : 'bg-gradient-to-r from-red-600/90 to-rose-600/90 border border-red-400/50'
            }
          `}>
            <div className="flex items-center space-x-3">
              {/* XP Section */}
              <div className="flex items-center space-x-1">
                <Star className="w-4 h-4 text-yellow-300" />
                <span className="font-bold text-white">
                  +{totalXP} XP
                </span>
                {streakBonus > 0 && (
                  <span className="text-xs text-yellow-200">
                    (+{streakBonus} streak)
                  </span>
                )}
              </div>

              {/* Subject/Subtopic */}
              {subject && subtopic && (
                <>
                  <span className="text-white/60">·</span>
                  <span className="text-sm text-white/90">
                    {subject}/{subtopic}
                  </span>
                </>
              )}

              {/* Mastery Change */}
              {masteryChange !== 0 && (
                <>
                  <span className="text-white/60">·</span>
                  <div className="flex items-center space-x-1">
                    <span className="text-sm text-white/90">Mastery</span>
                    {masteryChange > 0 ? (
                      <TrendingUp className="w-4 h-4 text-green-300" />
                    ) : (
                      <TrendingDown className="w-4 h-4 text-red-300" />
                    )}
                    <span className="font-semibold text-white">
                      {masterySign}{masteryChange.toFixed(1)}%
                    </span>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Correct/Incorrect Badge */}
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.1, type: "spring", stiffness: 200 }}
            className="absolute -top-2 -right-2"
          >
            <div className={`
              w-16 h-16 rounded-full flex items-center justify-center
              ${correct 
                ? 'bg-green-500 shadow-green-500/50' 
                : 'bg-red-500 shadow-red-500/50'
              }
              shadow-lg
            `}>
              <span className="text-white font-bold text-lg">
                {correct ? '✓' : '✗'}
              </span>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// Simplified version for end-of-match summary
export function MatchSummaryChips({ 
  totalXP, 
  masteryChanges, 
  eloChange 
}: {
  totalXP: number;
  masteryChanges: Array<{ subject: string; subtopic: string; change: number }>;
  eloChange?: number;
}) {
  return (
    <div className="space-y-3">
      {/* Total XP */}
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.1 }}
        className="flex items-center justify-center space-x-2 bg-purple-900/30 border border-purple-500/30 rounded-lg px-4 py-2"
      >
        <Star className="w-5 h-5 text-yellow-400" />
        <span className="text-lg font-bold text-white">+{totalXP} XP Total</span>
      </motion.div>

      {/* Top 3 Mastery Changes */}
      {masteryChanges.length > 0 && (
        <div className="space-y-2">
          <div className="text-sm text-gray-400 text-center">Mastery Changes</div>
          {masteryChanges.slice(0, 3).map((change, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 + idx * 0.1 }}
              className="flex items-center justify-between bg-black/30 rounded-lg px-3 py-2"
            >
              <span className="text-sm text-gray-300">
                {change.subject}/{change.subtopic}
              </span>
              <div className="flex items-center space-x-1">
                {change.change > 0 ? (
                  <TrendingUp className="w-4 h-4 text-green-400" />
                ) : (
                  <TrendingDown className="w-4 h-4 text-red-400" />
                )}
                <span className={`font-semibold ${
                  change.change > 0 ? 'text-green-400' : 'text-red-400'
                }`}>
                  {change.change > 0 ? '+' : ''}{change.change.toFixed(1)}%
                </span>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Elo Change (for PvP) */}
      {eloChange !== undefined && eloChange !== 0 && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.5 }}
          className="flex items-center justify-center space-x-2 bg-gradient-to-r from-amber-900/30 to-orange-900/30 border border-amber-500/30 rounded-lg px-4 py-2"
        >
          <span className="text-lg font-bold text-amber-200">
            Rating {eloChange > 0 ? '+' : ''}{eloChange}
          </span>
        </motion.div>
      )}
    </div>
  );
}