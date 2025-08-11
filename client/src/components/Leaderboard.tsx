import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AvatarRenderer } from './AvatarRenderer';
import { useQuery } from '@tanstack/react-query';
import type { User } from '@shared/schema';

interface LeaderboardProps {
  limit?: number;
}

export function Leaderboard({ limit = 20 }: LeaderboardProps) {
  const [timeframe, setTimeframe] = useState<'weekly' | 'alltime'>('weekly');

  const { data: players = [], isLoading, error } = useQuery<User[]>({
    queryKey: ['/api/leaderboard', { limit, timeframe }],
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  if (error) {
    return (
      <Card className="panel">
        <CardContent className="p-6">
          <h3 className="font-cinzel text-2xl font-bold mb-6">Leaderboard</h3>
          <div className="text-center text-muted py-8" data-testid="leaderboard-error">
            Failed to load leaderboard. Please try again later.
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="panel">
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="font-cinzel text-2xl font-bold">Leaderboard</h3>
          <div className="flex space-x-2">
            <Button
              size="sm"
              variant={timeframe === 'weekly' ? 'default' : 'outline'}
              onClick={() => setTimeframe('weekly')}
              className={timeframe === 'weekly' ? 'bg-arcane text-white' : ''}
              data-testid="button-weekly-leaderboard"
            >
              Weekly
            </Button>
            <Button
              size="sm"
              variant={timeframe === 'alltime' ? 'default' : 'outline'}
              onClick={() => setTimeframe('alltime')}
              className={timeframe === 'alltime' ? 'bg-arcane text-white' : ''}
              data-testid="button-alltime-leaderboard"
            >
              All Time
            </Button>
          </div>
        </div>
        
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center space-x-4 p-3 bg-white/5 rounded-xl animate-pulse">
                <div className="w-8 h-8 bg-gray-300 rounded-lg"></div>
                <div className="w-10 h-10 bg-gray-300 rounded-lg"></div>
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-300 rounded w-3/4"></div>
                  <div className="h-3 bg-gray-300 rounded w-1/2"></div>
                </div>
                <div className="text-right space-y-2">
                  <div className="h-4 bg-gray-300 rounded w-16"></div>
                  <div className="h-3 bg-gray-300 rounded w-12"></div>
                </div>
              </div>
            ))}
          </div>
        ) : players.length === 0 ? (
          <div className="text-center text-muted py-8" data-testid="leaderboard-empty">
            No players on the leaderboard yet. Be the first to compete!
          </div>
        ) : (
          <div className="space-y-3">
            {players.map((player, index) => {
              const rank = index + 1;
              const isTopThree = rank <= 3;
              const winRate = player.totalWins + player.totalLosses > 0 
                ? Math.round((player.totalWins / (player.totalWins + player.totalLosses)) * 100)
                : 0;

              return (
                <div
                  key={player.id}
                  className={`flex items-center space-x-4 p-3 rounded-xl transition-colors hover:bg-white/5 ${
                    isTopThree 
                      ? rank === 1 
                        ? 'bg-mystic-gold/10 border border-mystic-gold/30'
                        : 'bg-white/5'
                      : 'hover:bg-white/5'
                  }`}
                  data-testid={`leaderboard-player-${rank}`}
                >
                  <div className={`w-8 h-8 rounded-lg font-bold flex items-center justify-center text-sm ${
                    rank === 1 ? 'bg-mystic-gold text-dark-bg' :
                    rank === 2 ? 'bg-gray-300 text-dark-bg' :
                    rank === 3 ? 'bg-orange-400 text-dark-bg' :
                    'text-muted'
                  }`}>
                    {rank}
                  </div>
                  
                  <AvatarRenderer
                    avatarData={player.avatarData}
                    level={player.level}
                    size={40}
                    className="flex-shrink-0"
                  />
                  
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold truncate">{player.displayName}</p>
                    <p className="text-xs text-muted">
                      Level {player.level} • {winRate}% WR • {player.totalWins}W {player.totalLosses}L
                    </p>
                  </div>
                  
                  <div className="text-right flex-shrink-0">
                    <p className={`font-bold ${rank === 1 ? 'text-mystic-gold' : ''}`}>
                      {player.points.toLocaleString()}
                    </p>
                    {/* Mock daily change - in real app, this would come from the API */}
                    <p className={`text-xs ${
                      Math.random() > 0.3 ? 'text-success' : 'text-danger'
                    }`}>
                      {Math.random() > 0.3 ? '+' : ''}{Math.floor(Math.random() * 100 - 30)} today
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
        
        {players.length >= limit && (
          <div className="text-center mt-4">
            <Button variant="outline" size="sm" data-testid="button-view-full-leaderboard">
              View Full Leaderboard
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
