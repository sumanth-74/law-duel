import { Badge } from '@/components/ui/badge';
import { Sparkles, Shield, Star, Trophy } from 'lucide-react';

interface StreakData {
  streakWins: number;
  bestStreak: number;
  lossShieldActive: boolean;
}

interface TierInfo {
  current: { name: string; color: string };
  next?: { name: string };
  pointsToNext: number;
}

interface HotStreaksDisplayProps {
  streakData?: StreakData;
  tierInfo?: TierInfo;
  points: number;
}

export default function HotStreaksDisplay({ streakData, tierInfo, points }: HotStreaksDisplayProps) {
  if (!streakData) return null;

  const getTierBadge = () => {
    if (!tierInfo) return null;
    
    return (
      <Badge 
        className="border-0 text-white font-semibold"
        style={{ backgroundColor: tierInfo.current.color }}
      >
        <Trophy className="w-3 h-3 mr-1" />
        {tierInfo.current.name}
      </Badge>
    );
  };

  return (
    <div className="flex items-center space-x-2 flex-wrap">
      {/* Current Streak */}
      {streakData.streakWins > 1 && (
        <Badge className="bg-gradient-to-r from-orange-500 to-red-500 text-white border-0">
          <Sparkles className="w-3 h-3 mr-1" />
          {streakData.streakWins} Win Streak
        </Badge>
      )}

      {/* Loss Shield */}
      {streakData.lossShieldActive && (
        <Badge className="bg-gradient-to-r from-blue-500 to-cyan-500 text-white border-0">
          <Shield className="w-3 h-3 mr-1" />
          Shield Ready
        </Badge>
      )}

      {/* Best Streak */}
      {streakData.bestStreak >= 3 && (
        <Badge className="bg-gradient-to-r from-purple-600 to-pink-600 text-white border-0">
          <Star className="w-3 h-3 mr-1" />
          Best: {streakData.bestStreak}
        </Badge>
      )}

      {/* Tier Badge */}
      {getTierBadge()}

      {/* Points to Next Tier */}
      {tierInfo?.next && tierInfo.pointsToNext > 0 && (
        <Badge variant="outline" className="border-purple-500/30 text-purple-300">
          {tierInfo.pointsToNext} pts to {tierInfo.next.name}
        </Badge>
      )}
    </div>
  );
}