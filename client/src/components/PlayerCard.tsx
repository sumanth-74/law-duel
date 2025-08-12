import { AvatarRenderer } from './AvatarRenderer';
import type { User } from '@shared/schema';

interface PlayerCardProps {
  player: User;
  rank?: number;
  showStats?: boolean;
  className?: string;
}

export function PlayerCard({ player, rank, showStats = true, className = "" }: PlayerCardProps) {
  const winRate = player.totalWins + player.totalLosses > 0 
    ? Math.round((player.totalWins / (player.totalWins + player.totalLosses)) * 100)
    : 0;

  const isTopThree = rank && rank <= 3;

  return (
    <div className={`flex items-center space-x-4 p-3 rounded-xl transition-colors hover:bg-white/5 ${
      isTopThree 
        ? rank === 1 
          ? 'bg-mystic-gold/10 border border-mystic-gold/30'
          : 'bg-white/5'
        : 'hover:bg-white/5'
    } ${className}`}>
      {rank && (
        <div className={`w-8 h-8 rounded-lg font-bold flex items-center justify-center text-sm ${
          rank === 1 ? 'bg-mystic-gold text-dark-bg' :
          rank === 2 ? 'bg-gray-300 text-dark-bg' :
          rank === 3 ? 'bg-orange-400 text-dark-bg' :
          'text-muted'
        }`}>
          {rank}
        </div>
      )}
      
      <AvatarRenderer
        avatarData={player.avatarData}
        level={player.level}
        size={40}
        className="flex-shrink-0"
      />
      
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <p className="font-semibold truncate">{player.displayName}</p>
          {player.lawSchool && (
            <span className="text-xs px-2 py-0.5 bg-purple-900/30 text-purple-300 rounded-full truncate max-w-32" 
                  title={player.lawSchool}
                  data-testid="law-school-badge">
              {player.lawSchool}
            </span>
          )}
        </div>
        {showStats && (
          <p className="text-xs text-muted">
            Level {player.level} • {winRate}% WR • {player.totalWins}W {player.totalLosses}L
          </p>
        )}
      </div>
      
      <div className="text-right flex-shrink-0">
        <p className={`font-bold ${rank === 1 ? 'text-mystic-gold' : ''}`}>
          {player.points.toLocaleString()}
        </p>
        <p className="text-xs text-muted">
          points
        </p>
      </div>
    </div>
  );
}