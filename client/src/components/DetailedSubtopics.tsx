import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { ChevronDown, ChevronRight, TrendingUp, TrendingDown, Minus, BookOpen } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';

interface SubtopicData {
  subject: string;
  subtopic: string;
  area?: string;
  mastery: number;
  attempts: number;
  correct: number;
  accuracy: number;
  lastSeenAt: string | null;
}

export function DetailedSubtopics() {
  const [expandedSubjects, setExpandedSubjects] = useState<Set<string>>(new Set());
  const [expandedSubtopics, setExpandedSubtopics] = useState<Set<string>>(new Set());

  const { data: subtopicStats = [], isLoading } = useQuery<SubtopicData[]>({
    queryKey: ['/api/stats/subtopics'],
  });

  // Organize data into hierarchy
  const hierarchy = React.useMemo(() => {
    const result: Record<string, Record<string, SubtopicData[]>> = {};
    
    subtopicStats.forEach(stat => {
      if (!result[stat.subject]) {
        result[stat.subject] = {};
      }
      
      // Parse subtopic to see if it contains an area (e.g., "Jurisdiction/Federal Question")
      const parts = stat.subtopic.split('/');
      const mainSubtopic = parts[0];
      const area = parts[1];
      
      if (!result[stat.subject][mainSubtopic]) {
        result[stat.subject][mainSubtopic] = [];
      }
      
      result[stat.subject][mainSubtopic].push({
        ...stat,
        area: area || null
      });
    });
    
    return result;
  }, [subtopicStats]);

  const toggleSubject = (subject: string) => {
    const newExpanded = new Set(expandedSubjects);
    if (newExpanded.has(subject)) {
      newExpanded.delete(subject);
    } else {
      newExpanded.add(subject);
    }
    setExpandedSubjects(newExpanded);
  };

  const toggleSubtopic = (key: string) => {
    const newExpanded = new Set(expandedSubtopics);
    if (newExpanded.has(key)) {
      newExpanded.delete(key);
    } else {
      newExpanded.add(key);
    }
    setExpandedSubtopics(newExpanded);
  };

  const getMasteryColor = (mastery: number) => {
    if (mastery >= 80) return 'text-green-400';
    if (mastery >= 60) return 'text-blue-400';
    if (mastery >= 40) return 'text-yellow-400';
    if (mastery >= 20) return 'text-orange-400';
    return 'text-red-400';
  };

  const getMasteryIcon = (mastery: number, prevMastery?: number) => {
    if (prevMastery !== undefined) {
      if (mastery > prevMastery) return <TrendingUp className="w-4 h-4 text-green-400" />;
      if (mastery < prevMastery) return <TrendingDown className="w-4 h-4 text-red-400" />;
    }
    return <Minus className="w-4 h-4 text-gray-400" />;
  };

  if (isLoading) {
    return (
      <Card className="bg-black/40 border-purple-500/20">
        <CardContent className="p-6">
          <p className="text-muted-foreground">Loading detailed subtopics...</p>
        </CardContent>
      </Card>
    );
  }

  const MBE_SUBJECTS = [
    'Civil Procedure',
    'Constitutional Law',
    'Contracts',
    'Criminal Law/Procedure',
    'Evidence',
    'Real Property',
    'Torts'
  ];

  return (
    <Card className="bg-black/40 border-purple-500/20">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BookOpen className="w-5 h-5" />
          Detailed Subtopic Mastery
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Track your progress across all MBE subjects, subtopics, and specific areas
        </p>
      </CardHeader>
      <CardContent className="space-y-2">
        {MBE_SUBJECTS.map(subject => {
          const subjectData = hierarchy[subject] || {};
          const isExpanded = expandedSubjects.has(subject);
          
          // Calculate overall subject mastery
          const allStats = Object.values(subjectData).flat();
          const subjectMastery = allStats.length > 0
            ? allStats.reduce((sum, s) => sum + s.mastery, 0) / allStats.length
            : 0;
          const totalAttempts = allStats.reduce((sum, s) => sum + s.attempts, 0);
          const totalCorrect = allStats.reduce((sum, s) => sum + s.correct, 0);
          
          return (
            <div key={subject} className="border border-purple-500/10 rounded-lg overflow-hidden">
              {/* Subject Header */}
              <button
                onClick={() => toggleSubject(subject)}
                className="w-full p-4 flex items-center justify-between hover:bg-purple-500/5 transition-colors"
              >
                <div className="flex items-center gap-3">
                  {isExpanded ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
                  <span className="font-medium text-lg">{subject}</span>
                  <span className="text-sm text-muted-foreground">
                    ({Object.keys(subjectData).length} subtopics)
                  </span>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <div className={`text-sm font-medium ${getMasteryColor(subjectMastery)}`}>
                      {Math.round(subjectMastery)}% Mastery
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {totalCorrect}/{totalAttempts} correct
                    </div>
                  </div>
                  <Progress value={subjectMastery} className="w-24 h-2" />
                </div>
              </button>
              
              {/* Subtopics */}
              {isExpanded && (
                <div className="border-t border-purple-500/10">
                  {Object.entries(subjectData).map(([subtopic, areas]) => {
                    const subtopicKey = `${subject}-${subtopic}`;
                    const isSubtopicExpanded = expandedSubtopics.has(subtopicKey);
                    const hasMultipleAreas = areas.length > 1;
                    
                    // Calculate subtopic aggregate if multiple areas
                    const subtopicMastery = areas.reduce((sum, a) => sum + a.mastery, 0) / areas.length;
                    const subtopicAttempts = areas.reduce((sum, a) => sum + a.attempts, 0);
                    const subtopicCorrect = areas.reduce((sum, a) => sum + a.correct, 0);
                    
                    return (
                      <div key={subtopic} className="border-b border-purple-500/5 last:border-0">
                        {/* Subtopic Header */}
                        <button
                          onClick={() => hasMultipleAreas && toggleSubtopic(subtopicKey)}
                          className={`w-full px-6 py-3 flex items-center justify-between hover:bg-purple-500/5 transition-colors ${
                            !hasMultipleAreas ? 'cursor-default' : ''
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            {hasMultipleAreas ? (
                              isSubtopicExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />
                            ) : (
                              <div className="w-4" />
                            )}
                            <span className="font-medium">{subtopic}</span>
                            {hasMultipleAreas && (
                              <span className="text-xs text-muted-foreground">
                                ({areas.length} areas)
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="text-right">
                              <div className={`text-sm font-medium ${getMasteryColor(subtopicMastery)}`}>
                                {Math.round(subtopicMastery)}%
                              </div>
                              {subtopicAttempts > 0 && (
                                <div className="text-xs text-muted-foreground">
                                  {subtopicCorrect}/{subtopicAttempts}
                                </div>
                              )}
                            </div>
                            <Progress value={subtopicMastery} className="w-20 h-1.5" />
                          </div>
                        </button>
                        
                        {/* Specific Areas */}
                        {hasMultipleAreas && isSubtopicExpanded && (
                          <div className="bg-black/20 px-8 py-2 space-y-2">
                            {areas.map((area, idx) => (
                              <div key={idx} className="flex items-center justify-between py-1">
                                <span className="text-sm text-purple-300">
                                  {area.area || 'General'}
                                </span>
                                <div className="flex items-center gap-3">
                                  <div className="text-right">
                                    <div className={`text-xs font-medium ${getMasteryColor(area.mastery)}`}>
                                      {Math.round(area.mastery)}%
                                    </div>
                                    {area.attempts > 0 && (
                                      <div className="text-xs text-muted-foreground">
                                        {area.correct}/{area.attempts}
                                      </div>
                                    )}
                                  </div>
                                  <Progress value={area.mastery} className="w-16 h-1" />
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
        
        {/* Summary Stats */}
        <div className="mt-6 p-4 bg-purple-500/10 rounded-lg">
          <h3 className="font-medium mb-2">Quick Stats</h3>
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">Total Subtopics</p>
              <p className="text-xl font-bold text-purple-300">{subtopicStats.length}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Mastered (80%+)</p>
              <p className="text-xl font-bold text-green-400">
                {subtopicStats.filter(s => s.mastery >= 80).length}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">Need Work (&lt;40%)</p>
              <p className="text-xl font-bold text-orange-400">
                {subtopicStats.filter(s => s.mastery < 40).length}
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}