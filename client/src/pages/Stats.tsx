import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { MasteryProgress } from '@/components/MasteryProgress';
import SubtopicProgress from '@/components/SubtopicProgress';
import { useAuth } from '@/hooks/useAuth';
import { ArrowLeft, Trophy, TrendingUp, BarChart3, Clock, BookOpen } from 'lucide-react';
import { Link } from 'wouter';
import LawDuelLogo from '@/components/LawDuelLogo';

export default function Stats() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('mastery');

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-violet-900 flex items-center justify-center">
        <Card className="bg-black/40 border-purple-500/20">
          <CardContent className="p-6">
            <p className="text-purple-300">Please log in to view your stats</p>
            <Link href="/">
              <Button className="mt-4">Return Home</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-violet-900">
      <div className="container mx-auto p-6 max-w-7xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Link href="/home">
              <Button variant="ghost" size="sm" className="text-purple-300 hover:text-purple-200">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Game
              </Button>
            </Link>
            <LawDuelLogo className="h-8" />
          </div>
          <div className="text-right">
            <p className="text-purple-300 font-cinzel text-lg">{user.displayName || user.username}</p>
            <p className="text-purple-400 text-sm">Level {user.level} • {user.points} Points</p>
          </div>
        </div>

        {/* Main Content */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid grid-cols-5 w-full max-w-5xl mx-auto bg-black/40 p-1">
            <TabsTrigger value="mastery" className="flex items-center justify-center gap-2 text-xs sm:text-sm px-2 py-3 data-[state=active]:bg-purple-600/30">
              <Trophy className="w-4 h-4 flex-shrink-0" />
              <span>Mastery</span>
            </TabsTrigger>
            <TabsTrigger value="subtopics" className="flex items-center justify-center gap-2 text-xs sm:text-sm px-2 py-3 data-[state=active]:bg-purple-600/30">
              <BookOpen className="w-4 h-4 flex-shrink-0" />
              <span>Subtopics</span>
            </TabsTrigger>
            <TabsTrigger value="performance" className="flex items-center justify-center gap-2 text-xs sm:text-sm px-2 py-3 data-[state=active]:bg-purple-600/30">
              <TrendingUp className="w-4 h-4 flex-shrink-0" />
              <span>Performance</span>
            </TabsTrigger>
            <TabsTrigger value="history" className="flex items-center justify-center gap-2 text-xs sm:text-sm px-2 py-3 data-[state=active]:bg-purple-600/30">
              <Clock className="w-4 h-4 flex-shrink-0" />
              <span>History</span>
            </TabsTrigger>
            <TabsTrigger value="analytics" className="flex items-center justify-center gap-2 text-xs sm:text-sm px-2 py-3 data-[state=active]:bg-purple-600/30">
              <BarChart3 className="w-4 h-4 flex-shrink-0" />
              <span>Analytics</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="mastery" className="space-y-6">
            <MasteryProgress />
          </TabsContent>

          <TabsContent value="subtopics" className="space-y-6">
            <SubtopicProgress />
          </TabsContent>

          <TabsContent value="performance" className="space-y-6">
            <Card className="bg-black/40 border-purple-500/20">
              <CardHeader>
                <CardTitle>Performance Metrics</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Overall Accuracy</p>
                    <p className="text-2xl font-bold text-purple-300">
                      {user.totalQuestionsAnswered > 0 
                        ? ((user.totalCorrectAnswers / user.totalQuestionsAnswered) * 100).toFixed(1) + '%'
                        : 'N/A'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Win Rate</p>
                    <p className="text-2xl font-bold text-purple-300">
                      {(user.totalWins + user.totalLosses) > 0
                        ? ((user.totalWins / (user.totalWins + user.totalLosses)) * 100).toFixed(1) + '%'
                        : 'N/A'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Current Streak</p>
                    <p className="text-2xl font-bold text-purple-300">{user.currentOverallStreak}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Daily Streak</p>
                    <p className="text-2xl font-bold text-purple-300">🔥 {user.dailyStreak}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-black/40 border-purple-500/20">
              <CardHeader>
                <CardTitle>Recent Performance</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {user.recentAttempts?.slice(0, 10).map((attempt: any, i: number) => (
                    <div key={i} className="flex items-center justify-between p-2 rounded bg-purple-500/5">
                      <div className="flex items-center gap-3">
                        <span className={`text-2xl ${attempt.correct ? '✅' : '❌'}`} />
                        <div>
                          <p className="text-sm font-medium">{attempt.subject}</p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(attempt.timestamp).toLocaleString()}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="history" className="space-y-6">
            <Card className="bg-black/40 border-purple-500/20">
              <CardHeader>
                <CardTitle>Game History</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">Match history coming soon...</p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="analytics" className="space-y-6">
            <Card className="bg-black/40 border-purple-500/20">
              <CardHeader>
                <CardTitle>Advanced Analytics</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h3 className="font-medium mb-3">Time Analysis</h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Total Hours Played</span>
                        <span className="font-medium">{user.totalHoursPlayed?.toFixed(1) || '0'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Avg. Session Length</span>
                        <span className="font-medium">Coming soon</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Most Active Time</span>
                        <span className="font-medium">Coming soon</span>
                      </div>
                    </div>
                  </div>
                  <div>
                    <h3 className="font-medium mb-3">Progress Metrics</h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Subjects Mastered</span>
                        <span className="font-medium">{user.subjectsMastered || 0}/7</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Average Daily XP</span>
                        <span className="font-medium">{user.dailyXpEarned || 0}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Total XP Earned</span>
                        <span className="font-medium">{user.totalXp?.toLocaleString() || 0}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}