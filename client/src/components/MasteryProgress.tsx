import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Trophy, TrendingUp, Clock, Target, Star } from 'lucide-react';
import { MASTERY_LEVELS, DIFFICULTY_LEVELS, VICTORY_REQUIREMENTS, MBE_SUBJECTS } from '@shared/schema';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';

interface SubjectStats {
  subject: string;
  correctAnswers: number;
  questionsAnswered: number;
  currentDifficultyLevel: number;
  highestDifficultyReached: number;
  masteryPoints: number;
  hoursPlayed: number;
}

interface MasteryData {
  overallStats: {
    totalCorrectAnswers: number;
    totalQuestionsAnswered: number;
    totalHoursPlayed: number;
    subjectsMastered: number;
    hasAchievedVictory: boolean;
    victoryDate?: string;
  };
  subjectStats: SubjectStats[];
}

export function MasteryProgress() {
  const { data: masteryData, isLoading } = useQuery<MasteryData>({
    queryKey: ['/api/mastery/progress'],
  });

  if (isLoading) {
    return (
      <div className="animate-pulse">
        <div className="h-48 bg-purple-500/10 rounded-lg"></div>
      </div>
    );
  }

  if (!masteryData) return null;

  const getMasteryLevel = (correctAnswers: number) => {
    for (const [key, level] of Object.entries(MASTERY_LEVELS).reverse()) {
      if (correctAnswers >= level.requiredCorrect) {
        return level;
      }
    }
    return MASTERY_LEVELS.NOVICE;
  };

  const getDifficultyLevel = (correctAnswers: number) => {
    for (const [key, level] of Object.entries(DIFFICULTY_LEVELS).reverse()) {
      if (correctAnswers >= level.minCorrect) {
        return level;
      }
    }
    return DIFFICULTY_LEVELS.INTRO;
  };

  const progressToVictory = masteryData.overallStats.totalCorrectAnswers / VICTORY_REQUIREMENTS.totalQuestionsRequired * 100;
  const estimatedHoursRemaining = Math.max(0, VICTORY_REQUIREMENTS.estimatedHours - masteryData.overallStats.totalHoursPlayed);

  return (
    <div className="space-y-6">
      {/* Victory Status */}
      {masteryData.overallStats.hasAchievedVictory ? (
        <Card className="bg-gradient-to-r from-yellow-600/20 to-purple-600/20 border-yellow-500/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-yellow-400">
              <Trophy className="w-6 h-6" />
              SUPREME ADVOCATE - GAME COMPLETED!
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-yellow-200">
              You have achieved mastery in all legal subjects! Completed on {new Date(masteryData.overallStats.victoryDate!).toLocaleDateString()}
            </p>
            <div className="mt-4 grid grid-cols-3 gap-4">
              <div>
                <p className="text-sm text-purple-400">Total Questions</p>
                <p className="text-2xl font-bold">{masteryData.overallStats.totalQuestionsAnswered.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-sm text-purple-400">Accuracy</p>
                <p className="text-2xl font-bold">
                  {((masteryData.overallStats.totalCorrectAnswers / masteryData.overallStats.totalQuestionsAnswered) * 100).toFixed(1)}%
                </p>
              </div>
              <div>
                <p className="text-sm text-purple-400">Hours Played</p>
                <p className="text-2xl font-bold">{masteryData.overallStats.totalHoursPlayed.toFixed(0)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="bg-black/40 border-purple-500/20">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Target className="w-5 h-5" />
                Path to Victory
              </span>
              <Badge variant="outline" className="text-purple-300">
                {progressToVictory.toFixed(1)}% Complete
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Progress value={progressToVictory} className="h-3 mb-4" />
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Subjects Mastered</p>
                <p className="text-xl font-bold">{masteryData.overallStats.subjectsMastered}/{VICTORY_REQUIREMENTS.subjectsRequired}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Total Correct</p>
                <p className="text-xl font-bold">{masteryData.overallStats.totalCorrectAnswers.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Hours Played</p>
                <p className="text-xl font-bold">{masteryData.overallStats.totalHoursPlayed.toFixed(0)}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Est. Hours Left</p>
                <p className="text-xl font-bold">{estimatedHoursRemaining.toFixed(0)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Subject Mastery Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {MBE_SUBJECTS.map(subject => {
          const stats = masteryData.subjectStats.find(s => s.subject === subject) || {
            subject,
            correctAnswers: 0,
            questionsAnswered: 0,
            currentDifficultyLevel: 1,
            highestDifficultyReached: 1,
            masteryPoints: 0,
            hoursPlayed: 0,
          };
          
          const masteryLevel = getMasteryLevel(stats.correctAnswers);
          const difficultyLevel = getDifficultyLevel(stats.correctAnswers);
          const progressPercent = (stats.correctAnswers / MASTERY_LEVELS.SUPREME.requiredCorrect) * 100;
          const isSupreme = stats.correctAnswers >= MASTERY_LEVELS.SUPREME.requiredCorrect;

          return (
            <Card key={subject} className={`${isSupreme ? 'bg-gradient-to-br from-purple-600/20 to-yellow-600/20 border-yellow-500/30' : 'bg-black/40 border-purple-500/20'}`}>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center justify-between">
                  <span className="font-cinzel">{subject}</span>
                  {isSupreme && <Star className="w-4 h-4 text-yellow-400" />}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <Badge variant={isSupreme ? "default" : "outline"} className={isSupreme ? "bg-yellow-600/30 text-yellow-200" : ""}>
                    {masteryLevel.title}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    Diff. {stats.currentDifficultyLevel}/10
                  </span>
                </div>

                <Progress value={Math.min(100, progressPercent)} className="h-2" />
                
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <p className="text-muted-foreground">Correct</p>
                    <p className="font-bold">{stats.correctAnswers.toLocaleString()}/{MASTERY_LEVELS.SUPREME.requiredCorrect.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Accuracy</p>
                    <p className="font-bold">
                      {stats.questionsAnswered > 0 
                        ? ((stats.correctAnswers / stats.questionsAnswered) * 100).toFixed(1) + '%'
                        : 'N/A'}
                    </p>
                  </div>
                </div>

                {!isSupreme && (
                  <div className="pt-2 border-t border-purple-500/20">
                    <p className="text-xs text-purple-400">
                      Next: {getMasteryLevel(stats.correctAnswers + 1).title} at {
                        Object.values(MASTERY_LEVELS).find(l => l.requiredCorrect > stats.correctAnswers)?.requiredCorrect.toLocaleString()
                      } correct
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Victory Requirements Info */}
      {!masteryData.overallStats.hasAchievedVictory && (
        <Card className="bg-black/30 border-purple-500/10">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <Trophy className="w-5 h-5 text-purple-400 mt-0.5" />
              <div className="space-y-2 text-sm">
                <p className="text-purple-300 font-medium">How to Win Law Duel</p>
                <ul className="space-y-1 text-muted-foreground">
                  <li>• Achieve Supreme Advocate level (15,000+ correct) in all 7 MBE subjects</li>
                  <li>• Answer questions at increasing difficulty levels (1-10)</li>
                  <li>• Estimated completion time: ~1,000 hours of dedicated play</li>
                  <li>• Track your progress above and focus on your weakest subjects</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}