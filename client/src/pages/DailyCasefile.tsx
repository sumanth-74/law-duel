import { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { CalendarDays, Clock, Trophy, Target, Flame, Star, Home } from 'lucide-react';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { StreakIndicator } from '@/components/StreakIndicator';

interface DailyQuestion {
  id: string;
  subject: string;
  topic?: string;
  stem: string;
  choices: string[];
  correctIndex?: number;
  explanationLong?: string;
}

interface DailyAttempt {
  isCorrect: boolean;
  choiceIndex: number;
  xpAwarded: number;
  streakAfter: number;
}

interface DailyQuestionData {
  question: DailyQuestion | null;
  hasAttempted: boolean;
  attempt?: DailyAttempt;
  timeToReset: number;
}

interface SubmitResult {
  correct: boolean;
  xpDelta: number;
  masteryDelta: number;
  newLevel?: number;
  newTitle?: string;
  newStreak: number;
  explanationLong: string;
  correctChoice: string;
  levelUp: boolean;
  masteryUp: boolean;
  streakMilestone?: { level: number; bonus: number };
}

export default function DailyCasefile() {
  const [, setLocation] = useLocation();
  const [selectedChoice, setSelectedChoice] = useState<number | null>(null);
  const [timeLeft, setTimeLeft] = useState(90); // 90 second timer
  const [isTimerActive, setIsTimerActive] = useState(false);
  const [showResult, setShowResult] = useState(false);

  // Get today's daily question
  const { data: dailyData, isLoading } = useQuery<DailyQuestionData>({
    queryKey: ['/api/daily-question'],
    refetchInterval: 60000, // Refresh every minute to update countdown
  });

  // Get streak info
  const { data: streakInfo } = useQuery<{
    currentStreak: number;
    bestStreak: number;
    nextMilestone: number | null;
    milestoneProgress: number;
  }>({
    queryKey: ['/api/daily-streak'],
  });

  // Submit answer mutation
  const submitMutation = useMutation({
    mutationFn: async ({ questionId, choiceIndex }: { questionId: string; choiceIndex: number }) => {
      const response = await fetch('/api/daily-answer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ questionId, choiceIndex }),
      });
      if (!response.ok) throw new Error('Failed to submit answer');
      return response.json() as Promise<SubmitResult>;
    },
    onSuccess: () => {
      setShowResult(true);
      setIsTimerActive(false);
      queryClient.invalidateQueries({ queryKey: ['/api/daily-question'] });
      queryClient.invalidateQueries({ queryKey: ['/api/daily-streak'] });
    },
  });

  // Timer effect
  useEffect(() => {
    if (!isTimerActive || timeLeft <= 0) return;

    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          setIsTimerActive(false);
          if (selectedChoice !== null && dailyData?.question) {
            handleSubmit();
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isTimerActive, timeLeft, selectedChoice, dailyData?.question]);

  // Start timer when question loads and not attempted
  useEffect(() => {
    if (dailyData?.question && !dailyData.hasAttempted && !showResult) {
      setIsTimerActive(true);
      setTimeLeft(90);
    }
  }, [dailyData?.question, dailyData?.hasAttempted, showResult]);

  const handleSubmit = () => {
    if (selectedChoice === null || !dailyData?.question) return;
    
    submitMutation.mutate({
      questionId: dailyData.question.id,
      choiceIndex: selectedChoice,
    });
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatTimeToReset = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="animate-pulse space-y-6">
          <Card className="bg-black/40 border-purple-500/20">
            <CardContent className="p-6">
              <div className="h-8 bg-purple-500/20 rounded mb-4"></div>
              <div className="h-4 bg-purple-500/10 rounded mb-2"></div>
              <div className="h-4 bg-purple-500/10 rounded w-3/4"></div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Show completed state
  if (dailyData?.hasAttempted && dailyData.attempt) {
    const attempt = dailyData.attempt;
    const question = dailyData.question!;
    
    return (
      <div className="max-w-4xl mx-auto p-6">
        {/* Header */}
        <Card className="bg-black/40 border-purple-500/20 mb-6">
          <CardHeader>
            <CardTitle className="font-cinzel text-2xl text-purple-200 flex items-center gap-3">
              <CalendarDays className="w-6 h-6" />
              Daily Casefile Completed
              <Badge variant="outline" className="border-green-400/50 text-green-300">
                {attempt.isCorrect ? '✓ Correct' : '✗ Incorrect'}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-200">
                  +{attempt.xpAwarded} XP
                </div>
                <div className="text-sm text-purple-400">Experience Earned</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-200 flex items-center justify-center gap-1">
                  {attempt.streakAfter > 0 && <span className="text-orange-400">🔥</span>}
                  {attempt.streakAfter}
                  {attempt.streakAfter >= 7 && <span className="text-yellow-400">⭐</span>}
                </div>
                <div className="text-sm text-purple-400">Daily Streak</div>
                {attempt.streakAfter >= 3 && (
                  <div className="text-xs text-orange-400 mt-1">
                    {attempt.streakAfter >= 100 ? "Legendary!" : 
                     attempt.streakAfter >= 50 ? "Unstoppable!" :
                     attempt.streakAfter >= 30 ? "Amazing!" :
                     attempt.streakAfter >= 14 ? "Incredible!" :
                     attempt.streakAfter >= 7 ? "On fire!" : "Building momentum!"}
                  </div>
                )}
              </div>
              <div className="text-center">
                <div className="text-xl font-bold text-purple-200">
                  {dailyData.timeToReset ? formatTimeToReset(dailyData.timeToReset) : '--:--:--'}
                </div>
                <div className="text-sm text-purple-400">Next Question In</div>
                <div className="text-xs text-purple-500 mt-1">
                  Resets daily at midnight UTC ({new Date().toLocaleTimeString('en-US', { timeZone: 'UTC', hour: '2-digit', minute: '2-digit' })} UTC now)
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Question Review */}
        <Card className="bg-black/40 border-purple-500/20 mb-6">
          <CardHeader>
            <CardTitle className="font-cinzel text-xl text-purple-200">
              {question.subject} {question.topic && `• ${question.topic}`}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="prose prose-invert max-w-none mb-6">
              <div className="text-purple-100 whitespace-pre-wrap">{question.stem}</div>
            </div>
            
            <div className="space-y-3">
              {question.choices.map((choice, index) => {
                const isUserChoice = index === attempt.choiceIndex;
                const isCorrect = index === question.correctIndex;
                
                return (
                  <div
                    key={index}
                    className={`p-4 rounded-lg border ${
                      isCorrect 
                        ? 'bg-green-500/20 border-green-400/50 text-green-100'
                        : isUserChoice 
                        ? 'bg-red-500/20 border-red-400/50 text-red-100'
                        : 'bg-slate-800/50 border-slate-600/50 text-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-sm">
                        {String.fromCharCode(65 + index)}.
                      </span>
                      <span>{choice.replace(/^[A-D]\.\s*/, '')}</span>
                      {isCorrect && <Badge variant="outline" className="border-green-400/50 text-green-300 ml-auto">Correct</Badge>}
                      {isUserChoice && !isCorrect && <Badge variant="outline" className="border-red-400/50 text-red-300 ml-auto">Your Answer</Badge>}
                    </div>
                  </div>
                );
              })}
            </div>

            {question.explanationLong && (
              <div className="mt-6 p-4 bg-slate-800/50 border border-slate-600/50 rounded-lg">
                <h4 className="font-semibold text-purple-200 mb-2">Explanation</h4>
                <div className="text-slate-300 whitespace-pre-wrap">
                  {question.explanationLong}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Streak Info */}
        {streakInfo && (
          <Card className="bg-black/40 border-purple-500/20">
            <CardHeader>
              <CardTitle className="font-cinzel text-xl text-purple-200 flex items-center gap-2">
                <Flame className="w-5 h-5" />
                Daily Streak Progress
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <div className="flex justify-between text-sm text-purple-300 mb-2">
                    <span>Current Streak</span>
                    <span>{streakInfo.currentStreak} days</span>
                  </div>
                  <div className="flex justify-between text-sm text-purple-300 mb-2">
                    <span>Best Streak</span>
                    <span>{streakInfo.bestStreak} days</span>
                  </div>
                </div>
                {streakInfo.nextMilestone && (
                  <div>
                    <div className="flex justify-between text-sm text-purple-300 mb-2">
                      <span>Next Milestone</span>
                      <span>{streakInfo.nextMilestone} days</span>
                    </div>
                    <Progress 
                      value={streakInfo.milestoneProgress} 
                      className="h-3 bg-slate-700"
                    />
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Streak Milestone Achievement */}
        {submitMutation.data?.streakMilestone && (
          <Card className="bg-gradient-to-r from-yellow-900/40 to-orange-900/40 border-yellow-500/50 mb-6">
            <CardContent className="p-6 text-center">
              <div className="text-2xl font-bold text-yellow-200 mb-2">
                🏆 Streak Milestone Achieved! 🏆
              </div>
              <div className="text-lg text-yellow-300">
                {submitMutation.data.streakMilestone.level} Days in a Row!
              </div>
              <div className="text-xl font-bold text-yellow-100 mt-2">
                +{submitMutation.data.streakMilestone.bonus} Bonus XP
              </div>
            </CardContent>
          </Card>
        )}

        {/* Back to Home Button */}
        <div className="text-center mt-8">
          <Button
            onClick={() => setLocation('/')}
            className="bg-purple-600 hover:bg-purple-700 text-white px-8 py-3 text-lg"
            data-testid="back-to-home"
          >
            <Home className="w-5 h-5 mr-2" />
            Back to Home
          </Button>
        </div>
      </div>
    );
  }

  // Show question if available and not attempted
  if (dailyData?.question && !dailyData.hasAttempted) {
    const question = dailyData.question;
    
    return (
      <div className="max-w-4xl mx-auto p-6">
        {/* Daily Streak Indicator at top */}
        <div className="mb-6">
          <StreakIndicator />
        </div>
        
        {/* Header with Timer */}
        <Card className="bg-black/40 border-purple-500/20 mb-6">
          <CardHeader>
            <CardTitle className="font-cinzel text-2xl text-purple-200 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <CalendarDays className="w-6 h-6" />
                Daily Casefile
                <Badge variant="outline" className="border-red-400/50 text-red-300">
                  HARD
                </Badge>
              </div>
              <div className="flex items-center gap-2 text-xl">
                <Clock className="w-5 h-5" />
                <span className={timeLeft <= 10 ? 'text-red-400 animate-pulse' : 'text-purple-200'}>
                  {formatTime(timeLeft)}
                </span>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <Badge variant="outline" className="border-purple-400/50 text-purple-300">
                  {question.subject}
                </Badge>
                {question.topic && (
                  <Badge variant="outline" className="border-slate-400/50 text-slate-300 ml-2">
                    {question.topic}
                  </Badge>
                )}
              </div>
              <div className="text-right">
                <div className="text-sm text-purple-400">Enhanced Rewards</div>
                <div className="text-lg font-bold text-purple-200">+150 XP • 2× Mastery</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Question */}
        <Card className="bg-black/40 border-purple-500/20 mb-6">
          <CardContent className="p-6">
            <div className="prose prose-invert max-w-none mb-6">
              <div className="text-purple-100 whitespace-pre-wrap">{question.stem}</div>
            </div>
            
            <div className="space-y-3">
              {question.choices.map((choice, index) => (
                <button
                  key={index}
                  onClick={() => setSelectedChoice(index)}
                  className={`w-full p-4 text-left rounded-lg border transition-colors ${
                    selectedChoice === index
                      ? 'bg-purple-600/30 border-purple-400 text-purple-100'
                      : 'bg-slate-800/50 border-slate-600/50 text-slate-300 hover:bg-slate-700/50'
                  }`}
                  data-testid={`choice-${index}`}
                >
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-sm font-bold">
                      {String.fromCharCode(65 + index)}.
                    </span>
                    <span>{choice.replace(/^[A-D]\.\s*/, '')}</span>
                  </div>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Submit Button */}
        <div className="text-center">
          <Button
            onClick={handleSubmit}
            disabled={selectedChoice === null || submitMutation.isPending || timeLeft <= 0}
            className="bg-purple-600 hover:bg-purple-700 text-white px-8 py-3 text-lg"
            data-testid="submit-answer"
          >
            {submitMutation.isPending ? 'Submitting...' : 'Submit Answer'}
          </Button>
          {selectedChoice !== null && (
            <div className="mt-2 text-sm text-purple-400">
              Selected: {String.fromCharCode(65 + selectedChoice)}
            </div>
          )}
        </div>
      </div>
    );
  }

  // No question available
  return (
    <div className="max-w-4xl mx-auto p-6">
      <Card className="bg-black/40 border-purple-500/20">
        <CardContent className="p-6 text-center">
          <CalendarDays className="w-12 h-12 mx-auto mb-4 text-purple-400" />
          <h2 className="font-cinzel text-xl text-purple-200 mb-2">
            Daily Casefile
          </h2>
          <p className="text-purple-400 mb-4">
            Loading today's challenge...
          </p>
          {dailyData?.timeToReset && (
            <div className="text-sm text-slate-400">
              <div>Next question available in: {formatTimeToReset(dailyData.timeToReset)}</div>
              <div className="text-xs text-slate-500 mt-1">
                Resets daily at midnight UTC ({new Date().toLocaleTimeString('en-US', { timeZone: 'UTC', hour: '2-digit', minute: '2-digit' })} UTC now)
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}