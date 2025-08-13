import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ChevronRight, BookOpen, Target, TrendingUp, AlertCircle } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';

interface SubtopicData {
  name: string;
  questionsAttempted: number;
  questionsCorrect: number;
  proficiencyScore: number;
  masteryLevel: string;
  percentCorrect: number;
  lastPracticed: string | null;
}

interface SubjectProgress {
  name: string;
  overall: {
    questionsAttempted: number;
    questionsCorrect: number;
    proficiencyScore: number;
  };
  subtopics: SubtopicData[];
}

interface StudyRecommendation {
  subject: string;
  subtopic: string;
  proficiencyScore: number;
  percentCorrect: number;
  priority: 'High' | 'Medium' | 'Low';
}

export default function SubtopicProgress() {
  const [selectedSubject, setSelectedSubject] = useState<string>('Civ Pro');
  
  // Fetch subtopic progress data
  const { data: progressData, isLoading: progressLoading } = useQuery({
    queryKey: ['/api/stats/subtopics'],
    queryFn: () => apiRequest('GET', '/api/stats/subtopics')
  });

  // Fetch study recommendations
  const { data: recommendations, isLoading: recsLoading } = useQuery({
    queryKey: ['/api/stats/recommendations'],
    queryFn: () => apiRequest('GET', '/api/stats/recommendations')
  });

  const subjects = ['Civ Pro', 'Con Law', 'Contracts', 'Crim', 'Evidence', 'Property', 'Torts'];

  const getMasteryColor = (level: string) => {
    switch(level) {
      case 'Master': return 'text-purple-400 bg-purple-900/30 border-purple-500/50';
      case 'Expert': return 'text-blue-400 bg-blue-900/30 border-blue-500/50';
      case 'Advanced': return 'text-green-400 bg-green-900/30 border-green-500/50';
      case 'Proficient': return 'text-yellow-400 bg-yellow-900/30 border-yellow-500/50';
      case 'Competent': return 'text-orange-400 bg-orange-900/30 border-orange-500/50';
      default: return 'text-gray-400 bg-gray-900/30 border-gray-500/50';
    }
  };

  const getProficiencyColor = (score: number) => {
    if (score >= 80) return 'bg-purple-500';
    if (score >= 60) return 'bg-blue-500';
    if (score >= 40) return 'bg-green-500';
    if (score >= 20) return 'bg-yellow-500';
    return 'bg-orange-500';
  };

  if (progressLoading || recsLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500"></div>
      </div>
    );
  }

  const currentSubjectData = progressData?.[selectedSubject] as SubjectProgress;

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="bg-panel border-white/10">
        <CardHeader>
          <CardTitle className="text-2xl font-cinzel text-arcane flex items-center gap-3">
            <BookOpen className="w-6 h-6 text-purple-400" />
            MBE Subtopic Mastery
          </CardTitle>
          <p className="text-muted text-sm mt-2">
            Track your progress across all MBE topics and subtopics. Progress is earned through consistent practice.
          </p>
        </CardHeader>
      </Card>

      {/* Study Recommendations */}
      {recommendations && recommendations.length > 0 && (
        <Card className="bg-gradient-to-br from-orange-900/20 to-red-900/20 border-orange-500/30">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2 text-orange-300">
              <AlertCircle className="w-5 h-5" />
              Focus Areas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {recommendations.slice(0, 3).map((rec: StudyRecommendation, idx: number) => (
                <div key={idx} className="flex items-center justify-between bg-black/30 p-3 rounded-lg">
                  <div className="flex-1">
                    <div className="font-medium text-sm">{rec.subject}</div>
                    <div className="text-xs text-muted">{rec.subtopic}</div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge className={rec.priority === 'High' 
                      ? 'bg-red-600/30 text-red-200 border-red-500/50' 
                      : 'bg-yellow-600/30 text-yellow-200 border-yellow-500/50'}>
                      {rec.priority} Priority
                    </Badge>
                    <div className="text-right">
                      <div className="text-xs text-muted">Proficiency</div>
                      <div className="text-sm font-bold">{rec.proficiencyScore.toFixed(1)}%</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Subject Tabs */}
      <Tabs value={selectedSubject} onValueChange={setSelectedSubject}>
        <TabsList className="grid grid-cols-7 bg-panel-2 border border-white/10">
          {subjects.map(subject => (
            <TabsTrigger key={subject} value={subject} className="text-xs">
              {subject}
            </TabsTrigger>
          ))}
        </TabsList>

        {subjects.map(subject => {
          const subjectData = progressData?.[subject] as SubjectProgress;
          if (!subjectData) return null;

          return (
            <TabsContent key={subject} value={subject} className="space-y-4">
              {/* Overall Subject Progress */}
              <Card className="bg-panel-2 border-white/10">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">{subjectData.name} Overall</CardTitle>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <div className="text-xs text-muted">Questions</div>
                        <div className="text-sm font-bold">
                          {subjectData.overall.questionsCorrect}/{subjectData.overall.questionsAttempted}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-xs text-muted">Accuracy</div>
                        <div className="text-sm font-bold">
                          {subjectData.overall.questionsAttempted > 0 
                            ? Math.round((subjectData.overall.questionsCorrect / subjectData.overall.questionsAttempted) * 100)
                            : 0}%
                        </div>
                      </div>
                    </div>
                  </div>
                  <Progress 
                    value={subjectData.overall.proficiencyScore} 
                    className="h-2 mt-3"
                  />
                </CardHeader>
              </Card>

              {/* Subtopics Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {subjectData.subtopics.map((subtopic, idx) => (
                  <Card key={idx} className="bg-panel border-white/10 hover:border-purple-500/30 transition-all">
                    <CardContent className="p-4">
                      <div className="space-y-3">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h4 className="font-semibold text-sm">{subtopic.name}</h4>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge className={getMasteryColor(subtopic.masteryLevel)}>
                                {subtopic.masteryLevel}
                              </Badge>
                              {subtopic.questionsAttempted > 0 && (
                                <span className="text-xs text-muted">
                                  {subtopic.percentCorrect}% correct
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-2xl font-bold text-purple-300">
                              {subtopic.proficiencyScore.toFixed(0)}
                            </div>
                            <div className="text-xs text-muted">Proficiency</div>
                          </div>
                        </div>

                        <Progress 
                          value={subtopic.proficiencyScore} 
                          className={`h-2 ${getProficiencyColor(subtopic.proficiencyScore)}`}
                        />

                        <div className="flex items-center justify-between text-xs">
                          <span className="text-muted">
                            {subtopic.questionsAttempted} attempts
                          </span>
                          {subtopic.lastPracticed && (
                            <span className="text-muted">
                              Last: {new Date(subtopic.lastPracticed).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Empty State */}
              {subjectData.subtopics.length === 0 && (
                <Card className="bg-panel-2 border-white/10">
                  <CardContent className="text-center py-8">
                    <Target className="w-12 h-12 mx-auto text-gray-500 mb-3" />
                    <p className="text-muted">No practice data yet for {subjectData.name}</p>
                    <p className="text-sm text-gray-500 mt-2">
                      Start practicing to track your subtopic mastery
                    </p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          );
        })}
      </Tabs>

      {/* Progress Legend */}
      <Card className="bg-panel-2 border-white/10">
        <CardContent className="p-4">
          <h4 className="text-sm font-semibold mb-3">Understanding Your Progress</h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
            <div>
              <div className="text-muted mb-1">Beginner (0-10)</div>
              <div className="h-2 bg-gray-600 rounded"></div>
            </div>
            <div>
              <div className="text-muted mb-1">Competent (40-55)</div>
              <div className="h-2 bg-green-500 rounded"></div>
            </div>
            <div>
              <div className="text-muted mb-1">Proficient (55-70)</div>
              <div className="h-2 bg-blue-500 rounded"></div>
            </div>
            <div>
              <div className="text-muted mb-1">Expert (85+)</div>
              <div className="h-2 bg-purple-500 rounded"></div>
            </div>
          </div>
          <p className="text-xs text-muted mt-3">
            Progress increases slowly through consistent correct answers. Higher difficulty questions provide more progress.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}