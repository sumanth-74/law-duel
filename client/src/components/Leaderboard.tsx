import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PlayerCard } from './PlayerCard';
import { useQuery } from '@tanstack/react-query';
import { Wifi, WifiOff } from 'lucide-react';
import type { User } from '@shared/schema';

interface LeaderboardProps {
  limit?: number;
  realTimeData?: any[];
}

export function Leaderboard({ limit = 20, realTimeData }: LeaderboardProps) {
  const [timeframe, setTimeframe] = useState<'weekly' | 'alltime'>('weekly');

  const { data: players = [], isLoading, error } = useQuery<User[]>({
    queryKey: [`/api/leaderboard?limit=${limit}`], // Proper query string
    refetchInterval: realTimeData ? 60000 : 30000, // Slower refresh when real-time is available
    enabled: !realTimeData || realTimeData.length === 0, // Disable API when real-time data is available
  });

  // Use real-time data if available, otherwise use API data
  const displayPlayers = realTimeData && realTimeData.length > 0 ? realTimeData : players;

  if (error) {
    return (
      <Card className="panel">
        <CardContent className="p-6">
          <div className="flex items-center justify-center mb-6">
            <h3 className="font-cinzel text-2xl font-bold">Leaderboard</h3>
          </div>
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
          <div className="flex items-center gap-3">
            <h3 className="font-cinzel text-2xl font-bold">Leaderboard</h3>
            {realTimeData && realTimeData.length > 0 && (
              <div className="flex items-center gap-1 text-green-400 text-sm">
                <Wifi className="w-4 h-4" />
                <span>Live</span>
              </div>
            )}
          </div>
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
        ) : displayPlayers.length === 0 ? (
          <div className="text-center text-muted py-8" data-testid="leaderboard-empty">
            No players on the leaderboard yet. Be the first to compete!
          </div>
        ) : (
          <div className="space-y-3">
            {displayPlayers.map((player: any, index: number) => (
              <PlayerCard
                key={player.id}
                player={player}
                rank={index + 1}
                showStats={true}
                data-testid={`leaderboard-player-${index + 1}`}
              />
            ))}
          </div>
        )}
        
        {displayPlayers.length >= limit && (
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
