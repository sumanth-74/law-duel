import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { CheckCircle, Target, Star, Calendar, Trophy } from 'lucide-react';

interface Quest {
  id: string;
  title: string;
  description: string;
  progress: number;
  target: number;
  completed: boolean;
  xpReward: number;
}

interface DailyQuestsProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function DailyQuests({ isOpen, onClose }: DailyQuestsProps) {
  const [quests, setQuests] = useState<Quest[]>([]);
  const [allCompleted, setAllCompleted] = useState(false);

  // Load daily quests from localStorage
  useEffect(() => {
    if (isOpen) {
      loadDailyQuests();
    }
  }, [isOpen]);

  const loadDailyQuests = () => {
    const today = new Date().toISOString().split('T')[0];
    const savedQuests = localStorage.getItem(`dailyQuests_${today}`);
    
    if (savedQuests) {
      const questData = JSON.parse(savedQuests);
      setQuests(questData.quests);
      setAllCompleted(questData.allCompleted || false);
    } else {
      // Generate new daily quests
      const newQuests = generateDailyQuests();
      setQuests(newQuests);
      saveDailyQuests(newQuests, false);
    }
  };

  const generateDailyQuests = (): Quest[] => {
    const questPool = [
      {
        id: 'win_evidence_duels',
        title: 'Evidence Expert',
        description: 'Win 2 Evidence duels',
        target: 2,
        xpReward: 15
      },
      {
        id: 'win_contracts_duels', 
        title: 'Contract Crusher',
        description: 'Win 2 Contracts duels',
        target: 2,
        xpReward: 15
      },
      {
        id: 'answer_questions',
        title: 'Question Master',
        description: 'Answer 20 questions',
        target: 20,
        xpReward: 10
      },
      {
        id: 'win_fast_duel',
        title: 'Speed Demon',
        description: 'Win a duel in under 50 seconds',
        target: 1,
        xpReward: 20
      },
      {
        id: 'win_streak',
        title: 'Hot Streak',
        description: 'Win 3 duels in a row',
        target: 3,
        xpReward: 25
      },
      {
        id: 'perfect_score',
        title: 'Perfectionist',
        description: 'Score 10/10 in a duel',
        target: 10,
        xpReward: 30
      },
      {
        id: 'constitutional_law',
        title: 'Constitutional Scholar',
        description: 'Win 2 Constitutional Law duels',
        target: 2,
        xpReward: 15
      },
      {
        id: 'torts_master',
        title: 'Tort Titan',
        description: 'Win 2 Torts duels',
        target: 2,
        xpReward: 15
      }
    ];

    // Select 3 random quests
    const shuffled = [...questPool].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, 3).map(quest => ({
      ...quest,
      progress: 0,
      completed: false
    }));
  };

  const saveDailyQuests = (questData: Quest[], completed: boolean) => {
    const today = new Date().toISOString().split('T')[0];
    localStorage.setItem(`dailyQuests_${today}`, JSON.stringify({
      quests: questData,
      allCompleted: completed,
      date: today
    }));
  };

  const updateQuestProgress = (questId: string, increment: number = 1) => {
    setQuests(prevQuests => {
      const updatedQuests = prevQuests.map(quest => {
        if (quest.id === questId) {
          const newProgress = Math.min(quest.progress + increment, quest.target);
          return {
            ...quest,
            progress: newProgress,
            completed: newProgress >= quest.target
          };
        }
        return quest;
      });

      const allDone = updatedQuests.every(quest => quest.completed);
      if (allDone && !allCompleted) {
        setAllCompleted(true);
        // Award completion bonus
        const totalXP = updatedQuests.reduce((sum, quest) => sum + quest.xpReward, 0);
        console.log(`All daily quests completed! Earned ${totalXP + 40} XP total.`);
      }

      saveDailyQuests(updatedQuests, allDone);
      return updatedQuests;
    });
  };

  const getCompletionPercentage = () => {
    const completedQuests = quests.filter(quest => quest.completed).length;
    return (completedQuests / quests.length) * 100;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <Card className="w-full max-w-lg bg-gradient-to-br from-slate-900 to-slate-800 border-purple-500/30 shadow-2xl max-h-[80vh] overflow-auto">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center text-purple-300 font-cinzel">
              <Calendar className="w-5 h-5 mr-2" />
              Daily Challenges
            </CardTitle>
            <Button
              onClick={onClose}
              variant="ghost" 
              size="sm"
              className="text-slate-400 hover:text-slate-300"
              data-testid="button-close-quests"
            >
              ×
            </Button>
          </div>
          
          {/* Overall Progress */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-slate-300">Daily Progress</span>
              <span className="text-purple-300">
                {quests.filter(q => q.completed).length} / {quests.length} Complete
              </span>
            </div>
            <Progress value={getCompletionPercentage()} className="h-2" />
          </div>

          {allCompleted && (
            <div className="bg-gradient-to-r from-purple-600/20 to-pink-600/20 border border-purple-500/30 rounded-lg p-3">
              <div className="flex items-center text-yellow-400 font-semibold mb-1">
                <Trophy className="w-4 h-4 mr-2" />
                All Challenges Complete!
              </div>
              <div className="text-sm text-slate-300">
                Earned +40 bonus XP and cosmetic badge shard!
              </div>
            </div>
          )}
        </CardHeader>

        <CardContent className="space-y-4">
          {quests.map((quest, index) => (
            <Card 
              key={quest.id} 
              className={`border transition-all duration-300 ${
                quest.completed 
                  ? 'bg-green-900/20 border-green-500/30' 
                  : 'bg-slate-800/30 border-slate-600/30'
              }`}
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <div className="flex items-center mb-1">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center mr-3 ${
                        quest.completed ? 'bg-green-600' : 'bg-purple-600'
                      }`}>
                        {quest.completed ? (
                          <CheckCircle className="w-4 h-4 text-white" />
                        ) : (
                          <Target className="w-4 h-4 text-white" />
                        )}
                      </div>
                      <div>
                        <div className="font-semibold text-slate-200">{quest.title}</div>
                        <div className="text-sm text-slate-400">{quest.description}</div>
                      </div>
                    </div>
                  </div>
                  
                  <Badge className="bg-purple-600/20 text-purple-300 border-purple-500/30">
                    <Star className="w-3 h-3 mr-1" />
                    +{quest.xpReward} XP
                  </Badge>
                </div>

                {/* Progress Bar */}
                <div className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400">Progress</span>
                    <span className="text-slate-300">
                      {quest.progress} / {quest.target}
                    </span>
                  </div>
                  <Progress 
                    value={(quest.progress / quest.target) * 100} 
                    className="h-2"
                  />
                </div>
              </CardContent>
            </Card>
          ))}

          <div className="text-center text-sm text-slate-400 mt-6">
            Quests reset daily at midnight. Complete all 3 for bonus rewards!
          </div>
        </CardContent>
      </Card>
    </div>
  );
}