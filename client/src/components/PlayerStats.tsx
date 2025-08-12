import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AvatarRenderer } from './AvatarRenderer';
import { Trophy, Target, TrendingUp, BookOpen, User as UserIcon, Award, Star, Zap } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import type { User, PlayerSubjectStats, MBESubject, MASTERY_NUMERALS } from '@shared/schema';

interface PlayerStatsProps {
  userId: string;
  isOwnProfile?: boolean;
}

interface StatsResponse {
  user: User;
  subjectStats: PlayerSubjectStats[];
  overallAccuracy: number;
  rankTier: string;
  levelProgress: {
    currentLevel: number;
    currentLevelXp: number;
    xpToNext: number;
    title: string;
  };
  rankProgress: {
    currentTier: string;
    progress: number;
    maxProgress: number;
    nextTier: string | null;
  };
}

export function PlayerStats({ userId, isOwnProfile = false }: PlayerStatsProps) {
  const [selectedSubject, setSelectedSubject] = useState<MBESubject | null>(null);

  const { data: stats, isLoading } = useQuery<StatsResponse>({
    queryKey: [isOwnProfile ? '/api/stats/me' : `/api/stats/user/${userId}`],
    enabled: !!userId,
  });

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="flex items-center justify-center py-12">
          <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <Card className="bg-black/40 border-red-500/30">
          <CardContent className="p-8 text-center">
            <UserIcon className="w-12 h-12 mx-auto mb-4 text-red-400" />
            <h3 className="text-xl font-bold text-red-300 mb-2">Player Not Found</h3>
            <p className="text-red-400">This player's stats are not available.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { user, subjectStats, overallAccuracy, rankTier, levelProgress, rankProgress } = stats;

  // Recent form calculation (last 10 attempts)
  const recentAttempts = user.recentAttempts?.slice(-10) || [];
  const recentAccuracy = recentAttempts.length > 0 
    ? (recentAttempts.filter(a => a.correct).length / recentAttempts.length) * 100 
    : 0;

  // Subject detail view
  if (selectedSubject) {
    const subjectData = subjectStats.find(s => s.subject === selectedSubject);
    if (!subjectData) return null;

    const subjectAccuracy = subjectData.questionsAnswered > 0 
      ? (subjectData.correctAnswers / subjectData.questionsAnswered) * 100 
      : 0;

    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="mb-6">
          <Button 
            onClick={() => setSelectedSubject(null)}
            variant="outline"
            className="border-purple-500/50 text-purple-300 hover:bg-purple-500/20"
          >
            ← Back to All Stats
          </Button>
        </div>

        <Card className="bg-black/40 border-purple-500/20">
          <CardHeader>
            <CardTitle className="font-cinzel text-2xl text-purple-200 flex items-center gap-3">
              <BookOpen className="w-6 h-6" />
              {selectedSubject}
              {subjectData.isProvisional && (
                <Badge variant="outline" className="border-amber-400/50 text-amber-300">
                  Provisional
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Subject Stats Overview */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-200">
                  {Math.round(subjectAccuracy)}%
                </div>
                <div className="text-sm text-purple-400">Accuracy</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-200">
                  {subjectData.questionsAnswered}
                </div>
                <div className="text-sm text-purple-400">Questions</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-200">
                  {subjectData.currentStreak}
                </div>
                <div className="text-sm text-purple-400">Current Streak</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-bold text-purple-200">
                  {subjectData.masteryLevel > 0 ? 
                    `Mastery ${['', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'][subjectData.masteryLevel]}` : 
                    'No Mastery'
                  }
                </div>
                <div className="text-sm text-purple-400">Mastery</div>
              </div>
            </div>

            {/* Recent Performance */}
            <div>
              <h4 className="font-semibold text-purple-200 mb-3">Recent Performance</h4>
              <div className="flex gap-1">
                {(subjectData.recentAttempts || []).slice(-20).map((attempt, i) => (
                  <div
                    key={i}
                    className={`w-4 h-6 rounded-sm ${
                      attempt.correct ? 'bg-green-500' : 'bg-red-500'
                    }`}
                    title={`${attempt.correct ? 'Correct' : 'Incorrect'} - ${new Date(attempt.timestamp).toLocaleDateString()}`}
                  />
                ))}
                {Array.from({ length: Math.max(0, 20 - (subjectData.recentAttempts?.length || 0)) }).map((_, i) => (
                  <div key={`empty-${i}`} className="w-4 h-6 rounded-sm bg-gray-600" />
                ))}
              </div>
            </div>

            {isOwnProfile && (
              <div className="pt-4">
                <Button className="bg-purple-600 hover:bg-purple-700 text-white">
                  Practice {selectedSubject}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* Header */}
      <Card className="bg-black/40 border-purple-500/20 mb-6">
        <CardContent className="p-6">
          <div className="flex items-center gap-6">
            <AvatarRenderer
              avatarData={user.avatarData as any}
              level={user.level}
              size={80}
            />
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h1 className="font-cinzel text-2xl font-bold text-purple-200">
                  {user.displayName}
                </h1>
                <Badge variant="outline" className="border-purple-400/50 text-purple-300">
                  @{user.username}
                </Badge>
                {user.lawSchool && (
                  <Badge variant="outline" className="border-amber-400/50 text-amber-300">
                    {user.lawSchool.includes('Law School') ? 
                      user.lawSchool.split(' Law School')[0] : 
                      user.lawSchool.split(' ')[0]
                    }
                  </Badge>
                )}
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                <div>
                  <div className="text-xl font-bold text-purple-200">
                    {user.isRanked ? user.overallElo : "Unranked"}
                  </div>
                  <div className="text-sm text-purple-400">
                    {user.isRanked ? "ELO Rating" : `Placements ${user.placementMatches}/5`}
                  </div>
                </div>
                <div>
                  <div className="text-xl font-bold text-purple-200">
                    {user.isRanked ? rankTier : "Unranked"}
                  </div>
                  <div className="text-sm text-purple-400">Rank Tier</div>
                </div>
                <div>
                  <div className="text-xl font-bold text-purple-200">{Math.round(overallAccuracy)}%</div>
                  <div className="text-sm text-purple-400">Overall Accuracy</div>
                </div>
                <div>
                  <div className="text-xl font-bold text-purple-200">
                    Level {levelProgress.currentLevel}
                  </div>
                  <div className="text-sm text-purple-400">{levelProgress.title}</div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Level Progress */}
      {isOwnProfile && (
        <Card className="bg-black/40 border-purple-500/20 mb-6">
          <CardHeader>
            <CardTitle className="font-cinzel text-xl text-purple-200 flex items-center gap-2">
              <Star className="w-5 h-5" />
              Experience Progress
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-sm text-purple-300 mb-2">
                  <span>{levelProgress.title}</span>
                  <span>{levelProgress.currentLevelXp}/{levelProgress.xpToNext} XP</span>
                </div>
                <Progress 
                  value={(levelProgress.currentLevelXp / levelProgress.xpToNext) * 100} 
                  className="h-3 bg-slate-700"
                />
              </div>
              
              {user.isRanked && (
                <div>
                  <div className="flex justify-between text-sm text-purple-300 mb-2">
                    <span>{rankProgress.currentTier}</span>
                    <span>{rankProgress.nextTier ? `→ ${rankProgress.nextTier}` : 'Max Rank'}</span>
                  </div>
                  {rankProgress.nextTier && (
                    <Progress 
                      value={(rankProgress.progress / rankProgress.maxProgress) * 100} 
                      className="h-3 bg-slate-700"
                    />
                  )}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Form */}
      <Card className="bg-black/40 border-purple-500/20 mb-6">
        <CardHeader>
          <CardTitle className="font-cinzel text-xl text-purple-200 flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            Recent Form ({recentAttempts.length}/10)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <div className="flex gap-1">
              {recentAttempts.map((attempt, i) => (
                <div
                  key={i}
                  className={`w-6 h-8 rounded-sm ${
                    attempt.correct ? 'bg-green-500' : 'bg-red-500'
                  }`}
                  title={`${attempt.subject} - ${attempt.correct ? 'Correct' : 'Incorrect'}`}
                />
              ))}
              {Array.from({ length: Math.max(0, 10 - recentAttempts.length) }).map((_, i) => (
                <div key={`empty-${i}`} className="w-6 h-8 rounded-sm bg-gray-600" />
              ))}
            </div>
            <div className="text-sm text-purple-300">
              {Math.round(recentAccuracy)}% in last {recentAttempts.length} questions
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Subject Performance Grid */}
      <Card className="bg-black/40 border-purple-500/20">
        <CardHeader>
          <CardTitle className="font-cinzel text-xl text-purple-200 flex items-center gap-2">
            <Target className="w-5 h-5" />
            Subject Performance
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {subjectStats.map((subject) => {
              const accuracy = subject.questionsAnswered > 0 
                ? (subject.correctAnswers / subject.questionsAnswered) * 100 
                : 0;

              return (
                <Card 
                  key={subject.subject}
                  className="bg-slate-800/50 border-purple-500/20 cursor-pointer hover:border-purple-400/40 transition-colors"
                  onClick={() => setSelectedSubject(subject.subject as MBESubject)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="font-semibold text-purple-200 text-sm leading-tight">
                        {subject.subject}
                      </h3>
                      {subject.isProvisional && (
                        <Badge variant="outline" className="border-amber-400/50 text-amber-300 text-xs">
                          Provisional
                        </Badge>
                      )}
                    </div>
                    
                    <div className="space-y-2">
                      <div className="text-lg font-bold text-purple-200">
                        {subject.questionsAnswered > 0 ? `${Math.round(accuracy)}%` : '—'}
                        <span className="text-sm font-normal text-purple-400 ml-2">
                          · {subject.questionsAnswered} Qs
                        </span>
                      </div>
                      
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-purple-400">Streak: {subject.currentStreak}</span>
                        <Badge variant="outline" className="border-yellow-400/50 text-yellow-300 text-xs">
                          {subject.masteryLevel > 0 ? 
                            `Mastery ${['', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'][subject.masteryLevel]}` : 
                            'No Mastery'
                          }
                        </Badge>
                      </div>

                      {/* Mini recent performance bar */}
                      <div className="flex gap-0.5">
                        {(subject.recentAttempts || []).slice(-10).map((attempt, i) => (
                          <div
                            key={i}
                            className={`w-2 h-3 rounded-sm ${
                              attempt.correct ? 'bg-green-500' : 'bg-red-500'
                            }`}
                          />
                        ))}
                        {Array.from({ length: Math.max(0, 10 - (subject.recentAttempts?.length || 0)) }).map((_, i) => (
                          <div key={`empty-${i}`} className="w-2 h-3 rounded-sm bg-gray-600" />
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}