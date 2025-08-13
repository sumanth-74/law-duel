import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Clock, 
  Trophy, 
  Play, 
  Mail, 
  Calendar, 
  Users,
  CheckCircle,
  AlertCircle,
  ArrowRight
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';

interface AsyncMatch {
  id: string;
  subject: string;
  opponent: string;
  round: number;
  status: 'active' | 'over';
  yourTurn: boolean;
  timeLeft: number;
  scores: Record<string, number>;
  updatedAt: number;
}

interface AsyncInboxProps {
  isOpen: boolean;
  onClose: () => void;
  onPlayMatch: (matchId: string) => void;
}

export default function AsyncInbox({ isOpen, onClose, onPlayMatch }: AsyncInboxProps) {
  const { data, refetch } = useQuery({
    queryKey: ['/api/async/inbox'],
    enabled: isOpen,
    refetchInterval: 30000 // Refresh every 30s when open
  });

  const inbox = data?.matches || [];
  const unreadCount = data?.unreadCount || 0;

  const formatTimeLeft = (ms: number) => {
    if (ms <= 0) return 'Expired';
    
    const hours = Math.floor(ms / (1000 * 60 * 60));
    const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hours > 0) {
      return `${hours}h ${minutes}m left`;
    } else {
      return `${minutes}m left`;
    }
  };

  const getMatchStatusBadge = (match: AsyncMatch) => {
    if (match.status === 'over') {
      return (
        <Badge className="bg-gray-600 text-white border-0">
          <CheckCircle className="w-3 h-3 mr-1" />
          Complete
        </Badge>
      );
    }
    
    if (match.yourTurn) {
      return (
        <Badge className="bg-green-600 text-white border-0 animate-pulse">
          <Play className="w-3 h-3 mr-1" />
          Your Turn
        </Badge>
      );
    }
    
    return (
      <Badge className="bg-blue-600/70 text-white border-0">
        <Clock className="w-3 h-3 mr-1" />
        Waiting
      </Badge>
    );
  };

  const activeMatches = inbox.filter(match => match.status === 'active');
  const completedMatches = inbox.filter(match => match.status === 'over');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <Card className="w-full max-w-2xl bg-gradient-to-br from-slate-900 to-slate-800 border-purple-500/30 shadow-2xl max-h-[80vh] overflow-auto">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center text-purple-300 font-cinzel">
              <Mail className="w-5 h-5 mr-2" />
              Friend Games
              {unreadCount > 0 && (
                <Badge className="ml-2 bg-red-500 text-white border-0 animate-pulse">
                  {unreadCount} waiting
                </Badge>
              )}
            </CardTitle>
            <Button
              onClick={onClose}
              variant="ghost" 
              size="sm"
              className="text-slate-400 hover:text-slate-300"
              data-testid="button-close-inbox"
            >
              ×
            </Button>
          </div>
          
          <div className="flex gap-4 text-sm">
            <div className="flex items-center text-green-400">
              <Play className="w-4 h-4 mr-1" />
              {activeMatches.length} Active
            </div>
            <div className="flex items-center text-slate-400">
              <CheckCircle className="w-4 h-4 mr-1" />
              {completedMatches.length} Completed
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {inbox.length === 0 ? (
            <div className="text-center py-8 text-slate-400">
              <Mail className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg">No friend games yet</p>
              <p className="text-sm mt-2">Type a friend's username on the main screen to start</p>
              <p className="text-xs mt-1 text-purple-400">Games are asynchronous - play at your own pace!</p>
            </div>
          ) : (
            <>
              {/* Active Matches */}
              {activeMatches.length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-lg font-semibold text-slate-300 flex items-center">
                    <Users className="w-4 h-4 mr-2" />
                    Active Matches
                  </h3>
                  
                  {activeMatches.map((match) => (
                    <Card 
                      key={match.id} 
                      className={`border transition-all duration-200 hover:border-purple-400/50 ${
                        match.yourTurn 
                          ? 'bg-green-900/10 border-green-500/30' 
                          : 'bg-slate-800/30 border-slate-600/30'
                      }`}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center space-x-3">
                            <div>
                              <div className="font-semibold text-slate-200">
                                vs @{match.opponent}
                              </div>
                              <div className="text-sm text-slate-400">
                                {match.subject} · Round {match.round}/10
                              </div>
                              <div className="text-xs text-amber-400">
                                {formatTimeLeft(match.timeLeft)}
                              </div>
                            </div>
                          </div>
                          
                          <div className="flex items-center space-x-2">
                            {getMatchStatusBadge(match)}
                          </div>
                        </div>

                        {/* Score Display */}
                        <div className="flex items-center justify-between mb-3">
                          <div className="text-sm text-slate-400">Score Progress</div>
                          <div className="text-sm text-slate-300">
                            Best of 7
                          </div>
                        </div>
                        
                        <div className="flex items-center space-x-2 mb-3">
                          <div className="flex-1">
                            <Progress 
                              value={(Object.values(match.scores).reduce((a, b) => Math.max(a, b), 0) / 4) * 100} 
                              className="h-2"
                            />
                          </div>
                          <div className="text-sm text-slate-300 min-w-[40px]">
                            {Object.values(match.scores).join('-')}
                          </div>
                        </div>

                        {/* Action Button */}
                        <Button
                          onClick={() => onPlayMatch(match.id)}
                          className={`w-full ${
                            match.yourTurn 
                              ? 'bg-green-600 hover:bg-green-700 text-white' 
                              : 'bg-purple-600 hover:bg-purple-700 text-white'
                          }`}
                          data-testid={`button-play-${match.id}`}
                        >
                          {match.yourTurn ? (
                            <>
                              <Play className="w-4 h-4 mr-2" />
                              Play Turn
                            </>
                          ) : (
                            <>
                              <Clock className="w-4 h-4 mr-2" />
                              View Match
                            </>
                          )}
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}

              {/* Completed Matches */}
              {completedMatches.length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-lg font-semibold text-slate-300 flex items-center">
                    <Trophy className="w-4 h-4 mr-2" />
                    Recent Completed
                  </h3>
                  
                  {completedMatches.slice(0, 5).map((match) => (
                    <Card 
                      key={match.id} 
                      className="border bg-slate-800/20 border-slate-700/30"
                    >
                      <CardContent className="p-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="font-medium text-slate-300">
                              {match.subject} vs @{match.opponent}
                            </div>
                            <div className="text-sm text-slate-400">
                              Final: {Object.values(match.scores).join('-')}
                            </div>
                          </div>
                          
                          <div className="flex items-center space-x-2">
                            <Badge className="bg-gray-600 text-white border-0">
                              <CheckCircle className="w-3 h-3 mr-1" />
                              Complete
                            </Badge>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </>
          )}

          <div className="text-center text-sm text-slate-400 pt-4 border-t border-slate-700">
            <p>Take your turn when you're ready • Games expire after 24 hours of inactivity</p>
            <p className="text-xs mt-1">Your friend will be notified when you make a move</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}