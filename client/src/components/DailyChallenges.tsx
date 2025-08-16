import React, { useState } from 'react';
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
  TrendingUp, Users, BookOpen
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { apiRequest } from '@/lib/queryClient';

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
  const [selectedTab, setSelectedTab] = useState('daily');

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

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <Card 
        className="w-full max-w-4xl max-h-[90vh] bg-gradient-to-br from-purple-900/95 via-purple-800/95 to-purple-900/95 border-purple-500 shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <CardHeader className="bg-gradient-to-r from-purple-800 to-pink-800 pb-4">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-2xl text-white font-cinzel flex items-center gap-2">
                <Trophy className="w-7 h-7 text-yellow-400" />
                Daily Challenges & Rewards
              </CardTitle>
              <CardDescription className="text-purple-200 mt-1">
                Complete challenges to earn XP, points, and exclusive rewards!
              </CardDescription>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="text-white hover:bg-white/20"
            >
              ✕
            </Button>
          </div>
          
          {/* Reward Summary Bar */}
          {rewardSummary && (
            <div className="mt-4 flex items-center justify-between bg-black/30 rounded-lg p-3">
              <div className="flex items-center gap-6">
                <div className="flex items-center gap-2">
                  <Zap className="w-5 h-5 text-yellow-400" />
                  <span className="text-white font-bold">{rewardSummary.totalXpEarned} XP</span>
                </div>
                <div className="flex items-center gap-2">
                  <Star className="w-5 h-5 text-blue-400" />
                  <span className="text-white font-bold">{rewardSummary.totalPointsEarned} Points</span>
                </div>
                <div className="flex items-center gap-2">
                  <Shield className="w-5 h-5 text-green-400" />
                  <span className="text-white">Progress: {rewardSummary.dailyProgress}</span>
                </div>
              </div>
              {rewardSummary.badges.length > 0 && (
                <div className="flex items-center gap-1">
                  {rewardSummary.badges.slice(-3).map((badge, i) => (
                    <span key={i} className="text-xl">{badge.split(' ')[0]}</span>
                  ))}
                </div>
              )}
            </div>
          )}
        </CardHeader>

        <CardContent className="p-6">
          <Tabs value={selectedTab} onValueChange={setSelectedTab}>
            <TabsList className="grid grid-cols-3 w-full bg-purple-900/50">
              <TabsTrigger value="daily" className="data-[state=active]:bg-purple-600">
                Daily Challenges
              </TabsTrigger>
              <TabsTrigger value="weekly" className="data-[state=active]:bg-purple-600">
                Weekly Goals
              </TabsTrigger>
              <TabsTrigger value="milestones" className="data-[state=active]:bg-purple-600">
                Streak Milestones
              </TabsTrigger>
            </TabsList>

            <TabsContent value="daily" className="mt-4">
              <ScrollArea className="h-[400px] pr-4">
                {isLoading ? (
                  <div className="text-center text-purple-300 py-8">Loading challenges...</div>
                ) : (
                  <div className="space-y-3">
                    {challenges?.challenges.map((challenge) => (
                      <motion.div
                        key={challenge.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className={`bg-purple-950/50 rounded-lg p-4 border ${
                          challenge.completed ? 'border-green-500/50' : 'border-purple-500/30'
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex items-start gap-3">
                            <div className={`p-2 rounded-lg ${
                              challenge.completed ? 'bg-green-500/20' : 'bg-purple-700/30'
                            }`}>
                              {getIconComponent(challenge.icon)}
                            </div>
                            <div className="flex-1">
                              <h4 className="text-white font-semibold flex items-center gap-2">
                                {challenge.name}
                                {challenge.completed && (
                                  <CheckCircle2 className="w-4 h-4 text-green-400" />
                                )}
                              </h4>
                              <p className="text-purple-300 text-sm mt-1">{challenge.description}</p>
                              
                              {/* Progress Bar */}
                              <div className="mt-3">
                                <div className="flex items-center justify-between text-xs text-purple-300 mb-1">
                                  <span>Progress</span>
                                  <span>{challenge.progress}/{challenge.requirement}</span>
                                </div>
                                <Progress 
                                  value={(challenge.progress / challenge.requirement) * 100} 
                                  className="h-2 bg-purple-900"
                                />
                              </div>
                              
                              {/* Rewards */}
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
                          
                          {/* Claim Button */}
                          {challenge.completed && !challenge.claimed && (
                            <Button
                              size="sm"
                              onClick={() => claimReward.mutate(challenge.id)}
                              disabled={claimReward.isPending}
                              className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
                            >
                              <Gift className="w-4 h-4 mr-1" />
                              Claim
                            </Button>
                          )}
                          {challenge.claimed && (
                            <Badge className="bg-green-600/20 text-green-400 border-green-500/50">
                              Claimed
                            </Badge>
                          )}
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
      </Card>
    </motion.div>
  );
}