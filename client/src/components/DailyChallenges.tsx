import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { 
  Trophy, Target, Calendar, Star, Zap, Shield, 
  Gift, CheckCircle2, Lock, Clock, Flame, Award,
  TrendingUp, Users, BookOpen, Sparkles, Crown, Gem
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { apiRequest } from '@/lib/queryClient';
import { useAuth } from '@/hooks/useAuth';
import { AvatarRenderer } from '@/components/AvatarRenderer';

interface Challenge {
  id: string;
  name: string;
  description: string;
  xp: number;
  points: number;
  icon: string;
  type: string;
  completed: boolean;
  progress: number;
  requirement: number;
  claimed?: boolean;
}

interface RewardSummary {
  totalXpEarned: number;
  totalPointsEarned: number;
  badges: string[];
  dailyProgress: string;
  nextMilestone?: {
    days: number;
    xp: number;
    points: number;
    badge: string;
    title: string;
  };
  dailyChallenges: Challenge[];
}

interface WeeklyChallenge {
  id: string;
  name: string;
  description: string;
  xp: number;
  points: number;
  icon: string;
  progress: number;
  requirement: number;
  completed: boolean;
}

export function DailyChallenges({ onClose }: { onClose: () => void }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [selectedTab, setSelectedTab] = useState('daily');
  const [hoveredChallenge, setHoveredChallenge] = useState<string | null>(null);
  const [claimedChallenges, setClaimedChallenges] = useState<Set<string>>(new Set());

  // Fetch daily challenges
  const { data: challenges, isLoading: loadingChallenges } = useQuery<{ challenges: Challenge[] }>({
    queryKey: ['/api/daily-challenges'],
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Fetch reward summary
  const { data: rewardSummary, isLoading: loadingSummary } = useQuery<RewardSummary>({
    queryKey: ['/api/rewards/summary'],
  });

  // Fetch weekly challenges
  const { data: weeklyChallenges, isLoading: loadingWeekly } = useQuery<{ challenges: WeeklyChallenge[] }>({
    queryKey: ['/api/weekly-challenges'],
  });

  // Claim reward mutation
  const claimReward = useMutation({
    mutationFn: async (challengeId: string) => {
      return await apiRequest(`/api/daily-challenges/claim/${challengeId}`, 'POST');
    },
    onSuccess: (data, challengeId) => {
      if (data.success) {
        toast({
          title: "Reward Claimed!",
          description: `+${data.rewards.xp} XP and +${data.rewards.points} points earned!`,
          variant: "default",
        });
        // Refresh challenges and user data
        queryClient.invalidateQueries({ queryKey: ['/api/daily-challenges'] });
        queryClient.invalidateQueries({ queryKey: ['/api/rewards/summary'] });
        queryClient.invalidateQueries({ queryKey: ['/api/auth/me'] });
      } else {
        toast({
          title: "Failed to claim reward",
          description: data.error || "Please try again",
          variant: "destructive",
        });
      }
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to claim reward. Please try again.",
        variant: "destructive",
      });
    },
  });

  const getIconComponent = (iconStr: string) => {
    switch (iconStr) {
      case '📅': return <Calendar className="w-5 h-5" />;
      case '🏆': return <Trophy className="w-5 h-5" />;
      case '🎯': return <Target className="w-5 h-5" />;
      case '💯': return <Star className="w-5 h-5" />;
      case '📚': return <BookOpen className="w-5 h-5" />;
      case '⚡': return <Zap className="w-5 h-5" />;
      case '📋': return <Calendar className="w-5 h-5" />;
      case '🔄': return <TrendingUp className="w-5 h-5" />;
      case '👥': return <Users className="w-5 h-5" />;
      default: return <Star className="w-5 h-5" />;
    }
  };

  const isLoading = loadingChallenges || loadingSummary || loadingWeekly;

  // Animated particles effect
  useEffect(() => {
    const interval = setInterval(() => {
      // Trigger sparkle animations periodically
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      {/* Animated background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-purple-950 via-indigo-950 to-black opacity-95">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-purple-600/20 via-transparent to-transparent" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,_var(--tw-gradient-stops))] from-pink-600/20 via-transparent to-transparent" />
      </div>
      
      <motion.div
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 300, damping: 25 }}
        className="relative w-full max-w-5xl max-h-[90vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Main Card with glowing border effect */}
        <div className="relative rounded-xl bg-gradient-to-br from-purple-900/90 via-purple-800/90 to-indigo-900/90 backdrop-blur-xl border border-purple-400/30 shadow-[0_0_50px_rgba(168,85,247,0.3)]">
          {/* Animated top border */}
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-purple-400 to-transparent animate-pulse" />
          
          <CardHeader className="relative overflow-hidden bg-gradient-to-r from-purple-800/50 via-pink-800/50 to-purple-800/50 backdrop-blur-sm pb-6">
            {/* Animated sparkles in header */}
            <div className="absolute inset-0">
              <Sparkles className="absolute top-3 left-10 w-4 h-4 text-yellow-400/40 animate-pulse" />
              <Sparkles className="absolute top-5 right-20 w-3 h-3 text-pink-400/40 animate-pulse delay-200" />
              <Sparkles className="absolute bottom-2 left-1/3 w-3 h-3 text-purple-300/40 animate-pulse delay-500" />
            </div>
            
            <div className="flex items-center justify-between relative z-10">
              <div className="flex items-center gap-4">
                {/* User Avatar with glow effect */}
                {user?.avatarData && (
                  <div className="relative">
                    <div className="absolute inset-0 bg-purple-500/50 rounded-full blur-xl animate-pulse" />
                    <div className="relative w-16 h-16 rounded-full overflow-hidden border-2 border-purple-400/50 bg-purple-900/50">
                      <AvatarRenderer 
                        avatarData={user.avatarData} 
                        size={64}
                      />
                    </div>
                  </div>
                )}
                
                <div>
                  <CardTitle className="text-3xl text-white font-cinzel flex items-center gap-3">
                    <Trophy className="w-8 h-8 text-yellow-400 animate-bounce" />
                    <span className="bg-gradient-to-r from-yellow-200 via-yellow-400 to-orange-400 bg-clip-text text-transparent">
                      Daily Challenges
                    </span>
                  </CardTitle>
                  <CardDescription className="text-purple-200 mt-1 flex items-center gap-2">
                    <Gem className="w-4 h-4 text-purple-300" />
                    Complete epic challenges to earn legendary rewards!
                  </CardDescription>
                </div>
              </div>
              
              <Button
                variant="ghost"
                size="icon"
                onClick={onClose}
                className="text-purple-200 hover:text-white hover:bg-purple-700/50 transition-all"
              >
                ✕
              </Button>
            </div>
            
            {/* Epic Reward Summary Bar with animations */}
            {rewardSummary && (
              <motion.div 
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-6 relative"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-purple-600/20 via-pink-600/20 to-purple-600/20 rounded-xl blur-xl" />
                <div className="relative bg-gradient-to-r from-purple-900/50 via-purple-800/50 to-indigo-900/50 backdrop-blur-sm rounded-xl p-4 border border-purple-400/20">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-8">
                      {/* XP Counter with glow */}
                      <motion.div 
                        className="flex items-center gap-3"
                        whileHover={{ scale: 1.05 }}
                      >
                        <div className="relative">
                          <Zap className="w-6 h-6 text-yellow-400" />
                          <div className="absolute inset-0 blur-md bg-yellow-400/50" />
                        </div>
                        <div>
                          <p className="text-xs text-yellow-200/70">Total XP</p>
                          <p className="text-xl font-bold text-yellow-300">{rewardSummary.totalXpEarned.toLocaleString()}</p>
                        </div>
                      </motion.div>

                      {/* Points Counter with glow */}
                      <motion.div 
                        className="flex items-center gap-3"
                        whileHover={{ scale: 1.05 }}
                      >
                        <div className="relative">
                          <Star className="w-6 h-6 text-blue-400" />
                          <div className="absolute inset-0 blur-md bg-blue-400/50" />
                        </div>
                        <div>
                          <p className="text-xs text-blue-200/70">Points</p>
                          <p className="text-xl font-bold text-blue-300">{rewardSummary.totalPointsEarned.toLocaleString()}</p>
                        </div>
                      </motion.div>

                      {/* Progress Ring */}
                      <motion.div 
                        className="flex items-center gap-3"
                        whileHover={{ scale: 1.05 }}
                      >
                        <div className="relative">
                          <Shield className="w-6 h-6 text-green-400" />
                          <div className="absolute inset-0 blur-md bg-green-400/50" />
                        </div>
                        <div>
                          <p className="text-xs text-green-200/70">Today's Progress</p>
                          <p className="text-xl font-bold text-green-300">{rewardSummary.dailyProgress}</p>
                        </div>
                      </motion.div>
                    </div>
                    
                    {/* Achievement Badges */}
                    {rewardSummary.badges.length > 0 && (
                      <div className="flex items-center gap-2">
                        {rewardSummary.badges.slice(-3).map((badge, i) => (
                          <motion.div
                            key={i}
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ delay: i * 0.1 }}
                            className="text-2xl"
                          >
                            {badge.split(' ')[0]}
                          </motion.div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            )}
          </CardHeader>

          <CardContent className="p-6">
            <Tabs value={selectedTab} onValueChange={setSelectedTab}>
              <TabsList className="grid grid-cols-3 w-full bg-gradient-to-r from-purple-900/70 via-indigo-900/70 to-purple-900/70 backdrop-blur-sm border border-purple-500/20 p-1 rounded-xl">
                <TabsTrigger 
                  value="daily" 
                  className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-600 data-[state=active]:to-pink-600 data-[state=active]:text-white data-[state=active]:shadow-lg transition-all duration-300 rounded-lg font-semibold"
                >
                  <Trophy className="w-4 h-4 mr-2" />
                  Daily Quests
                </TabsTrigger>
                <TabsTrigger 
                  value="weekly" 
                  className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-600 data-[state=active]:to-pink-600 data-[state=active]:text-white data-[state=active]:shadow-lg transition-all duration-300 rounded-lg font-semibold"
                >
                  <Calendar className="w-4 h-4 mr-2" />
                  Weekly Epic
                </TabsTrigger>
                <TabsTrigger 
                  value="milestones" 
                  className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-600 data-[state=active]:to-pink-600 data-[state=active]:text-white data-[state=active]:shadow-lg transition-all duration-300 rounded-lg font-semibold"
                >
                  <Crown className="w-4 h-4 mr-2" />
                  Milestones
                </TabsTrigger>
              </TabsList>

            <TabsContent value="daily" className="mt-6">
              <ScrollArea className="h-[420px] pr-4">
                {isLoading ? (
                  <div className="flex flex-col items-center justify-center py-16">
                    <div className="relative">
                      <div className="w-16 h-16 border-4 border-purple-600/30 rounded-full" />
                      <div className="absolute top-0 w-16 h-16 border-4 border-purple-400 rounded-full animate-spin border-t-transparent" />
                    </div>
                    <p className="mt-4 text-purple-300 animate-pulse">Loading epic quests...</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {challenges?.challenges.map((challenge, index) => (
                      <motion.div
                        key={challenge.id}
                        initial={{ opacity: 0, x: -50 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.1 }}
                        onHoverStart={() => setHoveredChallenge(challenge.id)}
                        onHoverEnd={() => setHoveredChallenge(null)}
                        className="relative group"
                      >
                        {/* Glow effect on hover */}
                        <div className={`absolute inset-0 rounded-xl bg-gradient-to-r ${
                          challenge.completed 
                            ? 'from-green-600/20 to-emerald-600/20' 
                            : 'from-purple-600/20 to-pink-600/20'
                        } opacity-0 group-hover:opacity-100 blur-xl transition-opacity duration-300`} />
                        
                        {/* Main challenge card */}
                        <div className={`relative rounded-xl border backdrop-blur-sm transition-all duration-300 ${
                          challenge.completed 
                            ? 'bg-gradient-to-r from-green-900/40 to-emerald-900/40 border-green-500/30' 
                            : hoveredChallenge === challenge.id
                            ? 'bg-gradient-to-r from-purple-900/60 to-indigo-900/60 border-purple-400/50 transform scale-[1.02]'
                            : 'bg-gradient-to-r from-purple-950/40 to-indigo-950/40 border-purple-500/20'
                        }`}>
                          <div className="p-5">
                            <div className="flex items-start justify-between">
                              <div className="flex items-start gap-4">
                                {/* Icon with animated background */}
                                <div className="relative">
                                  <div className={`absolute inset-0 rounded-xl blur-md ${
                                    challenge.completed ? 'bg-green-500/40' : 'bg-purple-600/40'
                                  } ${hoveredChallenge === challenge.id ? 'animate-pulse' : ''}`} />
                                  <div className={`relative p-3 rounded-xl ${
                                    challenge.completed 
                                      ? 'bg-gradient-to-br from-green-600 to-emerald-600' 
                                      : 'bg-gradient-to-br from-purple-600 to-pink-600'
                                  }`}>
                                    {getIconComponent(challenge.icon)}
                                  </div>
                                </div>
                                
                                <div className="flex-1">
                                  <h4 className="text-lg font-bold text-white flex items-center gap-2 mb-1">
                                    {challenge.name}
                                    {challenge.completed && (
                                      <motion.div
                                        initial={{ scale: 0, rotate: -180 }}
                                        animate={{ scale: 1, rotate: 0 }}
                                        transition={{ type: "spring", stiffness: 200 }}
                                      >
                                        <CheckCircle2 className="w-5 h-5 text-green-400" />
                                      </motion.div>
                                    )}
                                  </h4>
                                  <p className="text-purple-200/80 text-sm">{challenge.description}</p>
                                  
                                  {/* Enhanced Progress Bar */}
                                  <div className="mt-4">
                                    <div className="flex items-center justify-between text-xs mb-2">
                                      <span className="text-purple-300/70">Quest Progress</span>
                                      <span className="text-purple-200 font-semibold">
                                        {challenge.progress}/{challenge.requirement}
                                      </span>
                                    </div>
                                    <div className="relative h-3 bg-purple-950/50 rounded-full overflow-hidden border border-purple-500/20">
                                      <motion.div
                                        className="absolute inset-y-0 left-0 bg-gradient-to-r from-purple-500 via-pink-500 to-purple-500 rounded-full"
                                        initial={{ width: 0 }}
                                        animate={{ width: `${(challenge.progress / challenge.requirement) * 100}%` }}
                                        transition={{ duration: 0.5, ease: "easeOut" }}
                                      >
                                        <div className="absolute inset-0 bg-white/20 animate-pulse" />
                                      </motion.div>
                                    </div>
                                  </div>
                                  
                                  {/* Enhanced Rewards Display */}
                                  <div className="flex items-center gap-3 mt-4">
                                    <motion.div
                                      whileHover={{ scale: 1.1 }}
                                      className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-yellow-600/20 to-orange-600/20 border border-yellow-500/30"
                                    >
                                      <span className="text-yellow-300 font-bold flex items-center gap-1">
                                        <Zap className="w-3 h-3" />
                                        +{challenge.xp} XP
                                      </span>
                                    </motion.div>
                                    <motion.div
                                      whileHover={{ scale: 1.1 }}
                                      className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-blue-600/20 to-cyan-600/20 border border-blue-500/30"
                                    >
                                      <span className="text-blue-300 font-bold flex items-center gap-1">
                                        <Star className="w-3 h-3" />
                                        +{challenge.points}
                                      </span>
                                    </motion.div>
                                  </div>
                                </div>
                              </div>
                              
                              {/* Enhanced Claim Button */}
                              <div className="ml-4">
                                {challenge.completed && !challenge.claimed && (
                                  <motion.div
                                    initial={{ scale: 0 }}
                                    animate={{ scale: 1 }}
                                    transition={{ type: "spring", stiffness: 200 }}
                                  >
                                    <Button
                                      size="sm"
                                      onClick={() => {
                                        claimReward.mutate(challenge.id);
                                        setClaimedChallenges(prev => new Set([...prev, challenge.id]));
                                      }}
                                      disabled={claimReward.isPending || claimedChallenges.has(challenge.id)}
                                      className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 shadow-lg shadow-green-600/30 transform transition-all hover:scale-105"
                                    >
                                      <Gift className="w-4 h-4 mr-1.5 animate-bounce" />
                                      Claim
                                    </Button>
                                  </motion.div>
                                )}
                                {(challenge.claimed || claimedChallenges.has(challenge.id)) && (
                                  <motion.div
                                    initial={{ scale: 0, rotate: -90 }}
                                    animate={{ scale: 1, rotate: 0 }}
                                    transition={{ type: "spring", stiffness: 200 }}
                                    className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-green-600/20 to-emerald-600/20 border border-green-500/30"
                                  >
                                    <span className="text-green-400 font-semibold flex items-center gap-1">
                                      <CheckCircle2 className="w-4 h-4" />
                                      Claimed!
                                    </span>
                                  </motion.div>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </TabsContent>

            <TabsContent value="weekly" className="mt-4">
              <ScrollArea className="h-[400px] pr-4">
                <div className="space-y-3">
                  {weeklyChallenges?.challenges.map((challenge) => (
                    <div
                      key={challenge.id}
                      className="bg-purple-950/50 rounded-lg p-4 border border-purple-500/30"
                    >
                      <div className="flex items-start gap-3">
                        <div className="p-2 rounded-lg bg-purple-700/30">
                          <Calendar className="w-5 h-5 text-purple-300" />
                        </div>
                        <div className="flex-1">
                          <h4 className="text-white font-semibold">{challenge.name}</h4>
                          <p className="text-purple-300 text-sm mt-1">{challenge.description}</p>
                          
                          <div className="mt-3">
                            <div className="flex items-center justify-between text-xs text-purple-300 mb-1">
                              <span>Weekly Progress</span>
                              <span>{challenge.progress}/{challenge.requirement}</span>
                            </div>
                            <Progress 
                              value={(challenge.progress / challenge.requirement) * 100} 
                              className="h-2 bg-purple-900"
                            />
                          </div>
                          
                          <div className="flex items-center gap-4 mt-3">
                            <Badge variant="outline" className="border-yellow-500/50 text-yellow-400">
                              +{challenge.xp} XP
                            </Badge>
                            <Badge variant="outline" className="border-blue-500/50 text-blue-400">
                              +{challenge.points} Points
                            </Badge>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </TabsContent>

            <TabsContent value="milestones" className="mt-4">
              <ScrollArea className="h-[400px] pr-4">
                <div className="space-y-4">
                  {/* Next Milestone */}
                  {rewardSummary?.nextMilestone && (
                    <div className="bg-gradient-to-r from-yellow-900/30 to-orange-900/30 rounded-lg p-4 border border-yellow-500/50">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="text-yellow-400 font-bold flex items-center gap-2">
                            <Flame className="w-5 h-5" />
                            Next Milestone: {rewardSummary.nextMilestone.days} Days
                          </h4>
                          <p className="text-yellow-200 text-sm mt-1">{rewardSummary.nextMilestone.title}</p>
                          <div className="flex items-center gap-3 mt-3">
                            <Badge className="bg-yellow-500/20 text-yellow-400">
                              +{rewardSummary.nextMilestone.xp} XP
                            </Badge>
                            <Badge className="bg-orange-500/20 text-orange-400">
                              +{rewardSummary.nextMilestone.points} Points
                            </Badge>
                            <span className="text-2xl">{rewardSummary.nextMilestone.badge.split(' ')[0]}</span>
                          </div>
                        </div>
                        <div className="text-3xl font-bold text-yellow-400">
                          {rewardSummary.nextMilestone.days}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Milestone List */}
                  <div className="space-y-3">
                    {[
                      { days: 3, xp: 150, points: 50, badge: '🔥 Spark', title: 'Dedicated Student', unlocked: false },
                      { days: 7, xp: 300, points: 100, badge: '⭐ Rising Star', title: 'Week Warrior', unlocked: false },
                      { days: 14, xp: 500, points: 200, badge: '💫 Shooting Star', title: 'Fortnight Fighter', unlocked: false },
                      { days: 30, xp: 1000, points: 500, badge: '🏆 Champion', title: 'Monthly Master', unlocked: false },
                      { days: 50, xp: 1500, points: 750, badge: '👑 Royal Scholar', title: 'Consistent Champion', unlocked: false },
                      { days: 100, xp: 3000, points: 1500, badge: '💎 Diamond Mind', title: 'Century Scholar', unlocked: false },
                    ].map((milestone) => (
                      <div
                        key={milestone.days}
                        className={`bg-purple-950/50 rounded-lg p-3 border ${
                          milestone.unlocked ? 'border-green-500/50' : 'border-purple-500/30'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <span className="text-2xl">{milestone.badge.split(' ')[0]}</span>
                            <div>
                              <h5 className="text-white font-semibold">{milestone.title}</h5>
                              <p className="text-purple-300 text-sm">{milestone.days} day streak</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="border-yellow-500/50 text-yellow-400 text-xs">
                              {milestone.xp} XP
                            </Badge>
                            <Badge variant="outline" className="border-blue-500/50 text-blue-400 text-xs">
                              {milestone.points} pts
                            </Badge>
                            {milestone.unlocked ? (
                              <CheckCircle2 className="w-5 h-5 text-green-400" />
                            ) : (
                              <Lock className="w-5 h-5 text-gray-500" />
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </ScrollArea>
            </TabsContent>
          </Tabs>
          </CardContent>
        </div>
      </motion.div>
    </motion.div>
  );
}