import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Trophy, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface WeeklyPlayer {
  rank: number;
  userId: string;
  username: string;
  lawSchool: string;
  weeklyRating: number;
  weeklyRatingChange: number;
  weeklyWins: number;
  weeklyLosses: number;
  weeklyMatches: number;
}

export function WeeklyLadder() {
  const { data: ladder, isLoading } = useQuery<WeeklyPlayer[]>({
    queryKey: ["/api/weekly-ladder"],
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  if (isLoading) {
    return (
      <Card className="bg-gray-900/90 border-purple-900/30">
        <CardHeader>
          <CardTitle className="text-2xl font-cinzel text-purple-300">
            Weekly Ladder - Top 50
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {[...Array(10)].map((_, i) => (
              <Skeleton key={i} className="h-12 w-full bg-purple-900/20" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-gray-900/90 border-purple-900/30">
      <CardHeader>
        <CardTitle className="text-2xl font-cinzel text-purple-300 flex items-center gap-2">
          <Trophy className="w-6 h-6 text-yellow-500" />
          Weekly Ladder - Top 50 Global
        </CardTitle>
        <p className="text-sm text-gray-400 mt-1">
          Rankings reset every Monday at midnight UTC
        </p>
      </CardHeader>
      <CardContent>
        <div className="space-y-1">
          {/* Header row */}
          <div className="grid grid-cols-12 gap-2 px-3 py-2 text-xs font-semibold text-gray-400 uppercase">
            <div className="col-span-1">Rank</div>
            <div className="col-span-4">Player</div>
            <div className="col-span-2">School</div>
            <div className="col-span-2 text-center">Rating</div>
            <div className="col-span-2 text-center">Change</div>
            <div className="col-span-1 text-center">W-L</div>
          </div>

          {/* Player rows */}
          {ladder?.map((player) => (
            <div
              key={player.userId}
              data-testid={`ladder-row-${player.rank}`}
              className={`grid grid-cols-12 gap-2 px-3 py-3 rounded-lg transition-all hover:bg-purple-900/20 ${
                player.rank <= 3
                  ? "bg-gradient-to-r from-purple-900/30 to-transparent"
                  : "bg-gray-800/50"
              }`}
            >
              {/* Rank */}
              <div className="col-span-1 flex items-center">
                {player.rank === 1 && (
                  <span className="text-yellow-500 font-bold">#1</span>
                )}
                {player.rank === 2 && (
                  <span className="text-gray-300 font-bold">#2</span>
                )}
                {player.rank === 3 && (
                  <span className="text-orange-600 font-bold">#3</span>
                )}
                {player.rank > 3 && (
                  <span className="text-gray-400">#{player.rank}</span>
                )}
              </div>

              {/* Username */}
              <div className="col-span-4 flex items-center">
                <span className="text-purple-200 font-medium truncate">
                  {player.username}
                </span>
              </div>

              {/* Law School */}
              <div className="col-span-2 flex items-center">
                <span className="text-gray-400 text-sm truncate">
                  {player.lawSchool || "-"}
                </span>
              </div>

              {/* Rating */}
              <div className="col-span-2 flex items-center justify-center">
                <span className="text-purple-300 font-mono">
                  {player.weeklyRating}
                </span>
              </div>

              {/* Rating Change */}
              <div className="col-span-2 flex items-center justify-center">
                {player.weeklyRatingChange > 0 && (
                  <span className="text-green-400 flex items-center gap-1">
                    <TrendingUp className="w-3 h-3" />
                    +{player.weeklyRatingChange}
                  </span>
                )}
                {player.weeklyRatingChange < 0 && (
                  <span className="text-red-400 flex items-center gap-1">
                    <TrendingDown className="w-3 h-3" />
                    {player.weeklyRatingChange}
                  </span>
                )}
                {player.weeklyRatingChange === 0 && (
                  <span className="text-gray-500 flex items-center gap-1">
                    <Minus className="w-3 h-3" />
                    0
                  </span>
                )}
              </div>

              {/* Win-Loss Record */}
              <div className="col-span-1 flex items-center justify-center">
                <span className="text-gray-400 text-sm">
                  {player.weeklyWins}-{player.weeklyLosses}
                </span>
              </div>
            </div>
          ))}

          {(!ladder || ladder.length === 0) && (
            <div className="text-center py-8 text-gray-500">
              No matches played this week yet. Be the first to climb the ladder!
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}