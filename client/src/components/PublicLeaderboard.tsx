import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AvatarRenderer } from './AvatarRenderer';
import { Trophy, Target, Users, Crown } from 'lucide-react';
import type { User, PlayerSubjectStats, MBESubject } from '@shared/schema';

interface LeaderboardEntry {
  user: Omit<User, 'password' | 'email'>;
  rank: number;
  overallAccuracy: number;
  rankTier: string;
}

interface SubjectLeaderboardEntry {
  user: Omit<User, 'password' | 'email'>;
  subjectStats: PlayerSubjectStats;
  rank: number;
  accuracy: number;
}

const MBE_SUBJECTS = [
  "Civil Procedure",
  "Constitutional Law", 
  "Contracts",
  "Criminal Law/Procedure",
  "Evidence",
  "Real Property",
  "Torts"
];

export function PublicLeaderboard() {
  const [selectedSubject, setSelectedSubject] = useState<string>('overall');

  const { data: overallLeaderboard, isLoading: isLoadingOverall } = useQuery<LeaderboardEntry[]>({
    queryKey: ['/api/stats/leaderboard'],
    enabled: selectedSubject === 'overall',
  });

  const { data: subjectLeaderboard, isLoading: isLoadingSubject } = useQuery<SubjectLeaderboardEntry[]>({
    queryKey: ['/api/stats/leaderboard', selectedSubject],
    enabled: selectedSubject !== 'overall',
  });

  const isLoading = selectedSubject === 'overall' ? isLoadingOverall : isLoadingSubject;

  const handlePlayerClick = (userId: string) => {
    window.location.href = `/stats/${userId}`;
  };

  return (
    <Card className="bg-black/40 border-purple-500/20">
      <CardHeader>
        <CardTitle className="font-cinzel text-xl text-purple-200 flex items-center gap-2">
          <Trophy className="w-5 h-5" />
          Public Leaderboard
        </CardTitle>
        <div className="flex gap-2">
          <Select value={selectedSubject} onValueChange={setSelectedSubject}>
            <SelectTrigger className="w-48 bg-slate-800 border-purple-500/30">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-slate-800 border-purple-500/30">
              <SelectItem value="overall">Overall Rankings</SelectItem>
              {MBE_SUBJECTS.map(subject => (
                <SelectItem key={subject} value={subject}>{subject}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center py-8">
            <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : selectedSubject === 'overall' ? (
          <div className="space-y-2">
            {overallLeaderboard?.map((entry, index) => (
              <div
                key={entry.user.id}
                className="flex items-center gap-4 p-3 rounded-lg bg-slate-800/50 hover:bg-slate-700/50 cursor-pointer transition-colors"
                onClick={() => handlePlayerClick(entry.user.id)}
                data-testid={`leaderboard-entry-${entry.user.username}`}
              >
                <div className="flex items-center gap-3 flex-1">
                  <div className="text-center min-w-[2rem]">
                    {index < 3 ? (
                      <Crown className={`w-5 h-5 ${
                        index === 0 ? 'text-yellow-400' : 
                        index === 1 ? 'text-gray-300' : 
                        'text-amber-600'
                      }`} />
                    ) : (
                      <span className="text-sm text-slate-400">#{entry.rank}</span>
                    )}
                  </div>
                  
                  <AvatarRenderer
                    avatarData={entry.user.avatarData as any}
                    level={entry.user.level}
                    size={40}
                  />
                  
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold text-purple-200">{entry.user.displayName}</span>
                      <Badge variant="outline" className="border-purple-400/50 text-purple-300 text-xs">
                        @{entry.user.username}
                      </Badge>
                      {entry.user.lawSchool && (
                        <Badge variant="outline" className="border-amber-400/50 text-amber-300 text-xs">
                          {entry.user.lawSchool.includes('Law School') ? 
                            entry.user.lawSchool.split(' Law School')[0] : 
                            entry.user.lawSchool.split(' ')[0]
                          }
                        </Badge>
                      )}
                    </div>
                    <div className="text-sm text-slate-400">
                      Level {entry.user.level} • {entry.user.points} Points • {entry.rankTier}
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <div className="text-lg font-bold text-purple-200">{entry.user.overallElo}</div>
                    <div className="text-sm text-slate-400">{entry.overallAccuracy}% Accuracy</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-2">
            {subjectLeaderboard?.map((entry, index) => (
              <div
                key={entry.user.id}
                className="flex items-center gap-4 p-3 rounded-lg bg-slate-800/50 hover:bg-slate-700/50 cursor-pointer transition-colors"
                onClick={() => handlePlayerClick(entry.user.id)}
                data-testid={`subject-leaderboard-entry-${entry.user.username}`}
              >
                <div className="flex items-center gap-3 flex-1">
                  <div className="text-center min-w-[2rem]">
                    {index < 3 ? (
                      <Crown className={`w-5 h-5 ${
                        index === 0 ? 'text-yellow-400' : 
                        index === 1 ? 'text-gray-300' : 
                        'text-amber-600'
                      }`} />
                    ) : (
                      <span className="text-sm text-slate-400">#{entry.rank}</span>
                    )}
                  </div>
                  
                  <AvatarRenderer
                    avatarData={entry.user.avatarData as any}
                    level={entry.user.level}
                    size={40}
                  />
                  
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold text-purple-200">{entry.user.displayName}</span>
                      <Badge variant="outline" className="border-purple-400/50 text-purple-300 text-xs">
                        @{entry.user.username}
                      </Badge>
                      {entry.user.lawSchool && (
                        <Badge variant="outline" className="border-amber-400/50 text-amber-300 text-xs">
                          {entry.user.lawSchool.includes('Law School') ? 
                            entry.user.lawSchool.split(' Law School')[0] : 
                            entry.user.lawSchool.split(' ')[0]
                          }
                        </Badge>
                      )}
                    </div>
                    <div className="text-sm text-slate-400">
                      {entry.subjectStats.questionsAnswered} Questions • Streak: {entry.subjectStats.currentStreak}
                      {entry.subjectStats.isProvisional && (
                        <Badge variant="outline" className="border-amber-400/50 text-amber-300 text-xs ml-2">
                          Provisional
                        </Badge>
                      )}
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <div className="text-lg font-bold text-purple-200">{entry.subjectStats.subjectRating}</div>
                    <div className="text-sm text-slate-400">{entry.accuracy}% Accuracy</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
        
        {selectedSubject === 'overall' && overallLeaderboard?.length === 0 && (
          <div className="text-center py-8">
            <Users className="w-12 h-12 mx-auto mb-4 text-slate-500" />
            <p className="text-slate-400">No players ranked yet</p>
          </div>
        )}
        
        {selectedSubject !== 'overall' && subjectLeaderboard?.length === 0 && (
          <div className="text-center py-8">
            <Target className="w-12 h-12 mx-auto mb-4 text-slate-500" />
            <p className="text-slate-400">No players have attempted {selectedSubject} yet</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}