import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Sparkles, Shield, Trophy, Target, Clock, Star } from 'lucide-react';
import { MatchSummaryChips } from './FeedbackChip';

interface DuelResultsProps {
  winner: boolean;
  playerScore: number;
  opponentScore: number;
  pointsGained: number;
  streakData?: {
    streakWins: number;
    streakBonus: number;
    lossShield?: boolean;
    bestStreak: number;
  };
  tierInfo?: {
    current: { name: string; color: string };
    next?: { name: string };
    pointsToNext: number;
  };
  memoryHook?: string;
  progressChanges?: Array<{
    subject: string;
    subtopic: string;
    change: number;
  }>;
  totalXpGained?: number;
  eloChange?: number;
  onRematch: () => void;
  onNewOpponent: () => void;
  onClose: () => void;
}

export default function DuelResults({
  winner,
  playerScore,
  opponentScore,
  pointsGained,
  streakData,
  tierInfo,
  memoryHook,
  progressChanges,
  totalXpGained,
  eloChange,
  onRematch,
  onNewOpponent,
  onClose
}: DuelResultsProps) {
  const [rematchCountdown, setRematchCountdown] = useState(3);
  const [showCountdown, setShowCountdown] = useState(false);

  // Auto-focus rematch button
  useEffect(() => {
    const rematchButton = document.getElementById('rematch-button');
    if (rematchButton) {
      rematchButton.focus();
    }
  }, []);

  const handleRematch = () => {
    setShowCountdown(true);
    const countdown = setInterval(() => {
      setRematchCountdown(prev => {
        if (prev <= 1) {
          clearInterval(countdown);
          onRematch();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const getResultTitle = () => {
    if (winner) {
      if (streakData?.streakWins && streakData.streakWins >= 3) {
        return "🔥 HOT STREAK VICTORY! 🔥";
      }
      return "🏛️ VICTORY! 🏛️";
    }
    return "⚖️ DEFEAT ⚖️";
  };

  const getStreakBadge = () => {
    if (!streakData) return null;
    
    if (winner && streakData.streakBonus > 0) {
      return (
        <Badge className="bg-gradient-to-r from-orange-500 to-red-500 text-white border-0">
          <Sparkles className="w-3 h-3 mr-1" />
          Hot Streak +{streakData.streakBonus}
        </Badge>
      );
    }
    
    if (!winner && streakData.lossShield) {
      return (
        <Badge className="bg-gradient-to-r from-blue-500 to-cyan-500 text-white border-0">
          <Shield className="w-3 h-3 mr-1" />
          Loss Shield -12
        </Badge>
      );
    }
    
    return null;
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <Card className="w-full max-w-md bg-gradient-to-br from-slate-900 to-slate-800 border-purple-500/30 shadow-2xl">
        <CardHeader className="text-center space-y-4">
          <div className={`text-2xl font-cinzel font-bold ${winner ? 'text-yellow-400' : 'text-red-400'}`}>
            {getResultTitle()}
          </div>
          
          {/* Score Display */}
          <div className="flex justify-center items-center space-x-8">
            <div className="text-center">
              <div className="text-3xl font-bold text-purple-300">{playerScore}</div>
              <div className="text-sm text-slate-400">You</div>
            </div>
            <div className="text-slate-500 text-xl">vs</div>
            <div className="text-center">
              <div className="text-3xl font-bold text-slate-300">{opponentScore}</div>
              <div className="text-sm text-slate-400">Opponent</div>
            </div>
          </div>

          {/* Points and Streak Badges */}
          <div className="flex justify-center items-center space-x-2 flex-wrap">
            <Badge className={`${winner ? 'bg-green-600' : 'bg-red-600'} text-white border-0`}>
              <Trophy className="w-3 h-3 mr-1" />
              {winner ? '+' : ''}{pointsGained} pts
            </Badge>
            {getStreakBadge()}
          </div>

          {/* Current Streak Display */}
          {streakData && streakData.streakWins > 1 && winner && (
            <div className="flex justify-center">
              <Badge className="bg-gradient-to-r from-purple-600 to-pink-600 text-white border-0">
                <Star className="w-3 h-3 mr-1" />
                {streakData.streakWins} Win Streak
              </Badge>
            </div>
          )}
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Tier Progress */}
          {tierInfo && tierInfo.next && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-slate-300">{tierInfo.current.name}</span>
                <span className="text-purple-300">
                  {tierInfo.pointsToNext} pts to {tierInfo.next.name}
                </span>
              </div>
              <Progress 
                value={Math.max(0, 100 - (tierInfo.pointsToNext / 100) * 100)} 
                className="h-2"
              />
            </div>
          )}

          {/* Progress Summary */}
          {(totalXpGained || progressChanges || eloChange !== undefined) && (
            <div className="space-y-2">
              <div className="text-sm font-semibold text-purple-300 text-center mb-2">
                Match Progress Summary
              </div>
              <MatchSummaryChips 
                totalXP={totalXpGained || 0}
                masteryChanges={progressChanges || []}
                eloChange={eloChange}
              />
            </div>
          )}

          {/* Atticus Memory Hook */}
          {memoryHook && (
            <Card className="bg-slate-800/50 border-purple-500/20">
              <CardContent className="pt-4">
                <div className="flex items-start space-x-3">
                  <div className="w-8 h-8 rounded-full bg-purple-600 flex items-center justify-center flex-shrink-0">
                    <Target className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-purple-300 mb-1">
                      Atticus Says:
                    </div>
                    <div className="text-sm text-slate-300 italic">
                      "{memoryHook}"
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Action Buttons */}
          {showCountdown ? (
            <div className="text-center space-y-2">
              <div className="text-lg font-bold text-purple-300">
                Starting Rematch in {rematchCountdown}...
              </div>
              <div className="w-full bg-purple-600/20 rounded-full h-2">
                <div 
                  className="bg-purple-600 h-2 rounded-full transition-all duration-1000"
                  style={{ width: `${((3 - rematchCountdown) / 3) * 100}%` }}
                />
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              <Button
                id="rematch-button"
                onClick={handleRematch}
                className="bg-purple-600 hover:bg-purple-700 text-white font-semibold"
                data-testid="button-rematch"
              >
                <Clock className="w-4 h-4 mr-2" />
                Rematch
              </Button>
              <Button
                onClick={onNewOpponent}
                variant="outline"
                className="border-purple-500/50 text-purple-300 hover:bg-purple-500/10"
                data-testid="button-new-opponent"
              >
                New Opponent
              </Button>
            </div>
          )}

          <Button
            onClick={onClose}
            variant="ghost"
            className="w-full text-slate-400 hover:text-slate-300 mt-4"
            data-testid="button-close-results"
          >
            Close
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}