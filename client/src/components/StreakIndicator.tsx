import { useQuery } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Flame, TrendingUp, Trophy, Star } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

interface StreakInfo {
  currentStreak: number;
  bestStreak: number;
  nextMilestone: number | null;
  milestoneProgress: number;
}

export function StreakIndicator() {
  const { data: streakInfo, isLoading } = useQuery<StreakInfo>({
    queryKey: ['/api/daily-streak'],
    refetchInterval: 60000, // Refresh every minute
  });

  if (isLoading || !streakInfo) {
    return null;
  }

  const getMilestoneIcon = (streak: number) => {
    if (streak >= 100) return '💎';
    if (streak >= 50) return '👑';
    if (streak >= 30) return '🏆';
    if (streak >= 14) return '⭐';
    if (streak >= 7) return '🔥';
    if (streak >= 3) return '✨';
    return null;
  };

  const getStreakColor = (streak: number) => {
    if (streak >= 30) return 'from-yellow-500 to-orange-500';
    if (streak >= 14) return 'from-orange-500 to-red-500';
    if (streak >= 7) return 'from-purple-500 to-pink-500';
    if (streak >= 3) return 'from-blue-500 to-purple-500';
    return 'from-slate-500 to-slate-600';
  };

  const getStreakMessage = (streak: number) => {
    if (streak >= 100) return 'Legendary Scholar!';
    if (streak >= 50) return 'Unstoppable Force!';
    if (streak >= 30) return 'Law Master!';
    if (streak >= 14) return 'On Fire!';
    if (streak >= 7) return 'Building Momentum!';
    if (streak >= 3) return 'Getting Started!';
    if (streak === 0) return 'Start Your Streak!';
    return 'Keep Going!';
  };

  return (
    <Card className="bg-gradient-to-r from-purple-900/20 to-pink-900/20 border-purple-500/30 shadow-xl">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          {/* Streak Display */}
          <div className="flex items-center gap-4">
            <Tooltip>
              <TooltipTrigger asChild>
                <div className={`flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r ${getStreakColor(streakInfo.currentStreak)} text-white font-bold`}>
                  <Flame className="w-5 h-5 animate-pulse" />
                  <span className="text-2xl">{streakInfo.currentStreak}</span>
                  <span className="text-sm">Day{streakInfo.currentStreak !== 1 ? 's' : ''}</span>
                  {getMilestoneIcon(streakInfo.currentStreak) && (
                    <span className="text-xl ml-1">{getMilestoneIcon(streakInfo.currentStreak)}</span>
                  )}
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <div className="text-center">
                  <p className="font-semibold">{getStreakMessage(streakInfo.currentStreak)}</p>
                  <p className="text-sm text-slate-300 mt-1">Complete Daily Casefile to continue</p>
                </div>
              </TooltipContent>
            </Tooltip>

            {/* Best Streak */}
            {streakInfo.bestStreak > 0 && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-center gap-1 text-purple-300">
                    <Trophy className="w-4 h-4" />
                    <span className="text-sm font-medium">Best: {streakInfo.bestStreak}</span>
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Your all-time best streak</p>
                </TooltipContent>
              </Tooltip>
            )}

            {/* Next Milestone */}
            {streakInfo.nextMilestone && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-green-400" />
                    <div className="flex flex-col">
                      <span className="text-xs text-purple-400">Next Milestone</span>
                      <div className="flex items-center gap-2">
                        <div className="w-24 h-2 bg-slate-700 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-gradient-to-r from-green-500 to-emerald-500 transition-all duration-500"
                            style={{ width: `${streakInfo.milestoneProgress}%` }}
                          />
                        </div>
                        <span className="text-xs text-purple-300 font-medium">
                          {streakInfo.nextMilestone} days
                        </span>
                      </div>
                    </div>
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Keep going! {streakInfo.nextMilestone - streakInfo.currentStreak} more days to milestone</p>
                </TooltipContent>
              </Tooltip>
            )}
          </div>

          {/* Motivational Badge */}
          <Badge 
            variant="outline" 
            className="border-purple-400/50 text-purple-200 bg-purple-900/30"
          >
            <Star className="w-3 h-3 mr-1" />
            {getStreakMessage(streakInfo.currentStreak)}
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
}