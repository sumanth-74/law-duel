import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { 
  Clock, 
  Trophy, 
  AlertCircle,
  CheckCircle,
  Play,
  ArrowLeft,
  Target,
  Flag
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { useStreak } from '@/contexts/StreakContext';
import { useAuth } from '@/hooks/useAuth';

interface AsyncMatchProps {
  matchId: string;
  isOpen: boolean;
  onClose: () => void;
}

interface Turn {
  qid: string;
  stem: string;
  choices: string[];
  deadlineTs: number;
  answers: Record<string, { idx: number; ms: number }>;
  revealed: boolean;
  correctIndex?: number;
  explanation?: string;
}

interface AsyncMatchData {
  id: string;
  subject: string;
  players: Array<{ id: string; username: string }>;
  scores: Record<string, number>;
  round: number;
  turns: Turn[];
  status: 'active' | 'over' | 'finished';
  winnerId: string | null;
  bestOf: number;
}

export default function AsyncMatch({ matchId, isOpen, onClose }: AsyncMatchProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { incrementStreak, resetStreak } = useStreak();
  const { user } = useAuth();
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [answering, setAnswering] = useState(false);
  const [showResignDialog, setShowResignDialog] = useState(false);
  const [showPreviousResults, setShowPreviousResults] = useState(false);

  const { data: match, isLoading, refetch } = useQuery<AsyncMatchData>({
    queryKey: ['/api/async/match', matchId],
    enabled: isOpen && !!matchId,
    refetchInterval: 5000 // Poll every 5 seconds for better responsiveness
  });

  // Define variables that will be used in useEffects
  const currentTurn = match?.turns?.[match.turns.length - 1];
  const previousTurn = match?.turns && match.turns.length > 1 ? match.turns[match.turns.length - 2] : null;
  
  // Clear selected answer when turn changes
  useEffect(() => {
    if (match) {
      console.log(`🔄 Frontend: Round=${match.round}, Turns=${match.turns.length}, Status=${match.status}`);
      setSelectedAnswer(null);
    }
  }, [match?.turns.length, match?.round]);

  // Show previous results when a new turn starts
  useEffect(() => {
    if (previousTurn && previousTurn.revealed && match?.turns && match.turns.length > 1) {
      setShowPreviousResults(true);
      // Hide previous results after 3 seconds
      const timer = setTimeout(() => {
        setShowPreviousResults(false);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [previousTurn, match?.turns?.length]);
  
  // Track streak when turn is revealed
  useEffect(() => {
    if (!match) return;
    
    if (!currentTurn || !currentTurn.revealed) return;
    
    // Check if user has answered this turn
    const userId = user?.id;
    if (!userId) return;
    const userAnswer = currentTurn.answers[userId];
    if (!userAnswer) return;
    
    // Check if user got it correct
    const isCorrect = userAnswer.idx === currentTurn.correctIndex;
    
    // Track streak (only once per turn)
    const turnKey = `streak_tracked_${match.id}_${match.turns.length}`;
    if (!localStorage.getItem(turnKey)) {
      if (isCorrect) {
        incrementStreak();
      } else {
        resetStreak();
      }
      localStorage.setItem(turnKey, 'true');
    }
  }, [match, incrementStreak, resetStreak, user?.id]);

  const answerMutation = useMutation({
    mutationFn: async ({ answerIndex, responseTime }: { answerIndex: number; responseTime: number }) => {
      return apiRequest('POST', `/api/async/answer`, {
          matchId,
          answerIndex,
          responseTime
      });
    },
    onSuccess: () => {
      toast({
        title: "Answer Submitted",
        description: "Waiting for opponent to answer...",
      });
      // Clear selected answer immediately
      setSelectedAnswer(null);
      setAnswering(false);
      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['/api/async/match', matchId] });
      queryClient.invalidateQueries({ queryKey: ['/api/async/inbox'] });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to Submit",
        description: error.message,
        variant: "destructive"
      });
      setAnswering(false);
    }
  });

  const resignMutation = useMutation({
    mutationFn: async () => {
      return apiRequest('POST', `/api/async/resign`, { matchId });
    },
    onSuccess: () => {
      toast({
        title: "Match Resigned",
        description: "You have forfeited this match.",
      });
      // Invalidate all async match related queries
      queryClient.invalidateQueries({ queryKey: ['/api/async/inbox'] });
      queryClient.invalidateQueries({ queryKey: ['/api/async/match', matchId] });
      queryClient.removeQueries({ queryKey: ['/api/async/match', matchId] });
      setShowResignDialog(false);
      onClose();
    },
    onError: (error: any) => {
      toast({
        title: "Resign Failed",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  if (!isOpen) return null;

  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
        <Card className="w-full max-w-2xl bg-gradient-to-br from-slate-900 to-slate-800 border-purple-500/30">
          <CardContent className="p-8 text-center">
            <Clock className="w-12 h-12 mx-auto mb-4 text-purple-400 animate-spin" />
            <p className="text-slate-300">Loading match...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!match) {
    return (
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
        <Card className="w-full max-w-md bg-gradient-to-br from-slate-900 to-slate-800 border-red-500/30">
          <CardContent className="p-6 text-center">
            <AlertCircle className="w-12 h-12 mx-auto mb-4 text-red-400" />
            <p className="text-slate-300 mb-4">Match not found</p>
            <Button onClick={onClose} variant="outline">Close</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const currentUserId = user?.id;
  const opponent = match.players.find(p => p.id !== currentUserId);
  
  // Check if it's the current user's turn
  const hasCurrentUserAnswered = currentUserId && currentTurn?.answers[currentUserId];
  const hasOpponentAnswered = opponent && currentTurn?.answers[opponent.id];
  const bothPlayersAnswered = hasCurrentUserAnswered && hasOpponentAnswered;
  
  // Count total answers to ensure both players see reveal when both have answered
  const totalAnswers = currentTurn ? Object.keys(currentTurn.answers || {}).length : 0;
  const allPlayersAnswered = totalAnswers >= 2;
  
  // Debug logging
  console.log(`🔍 Frontend Debug:`, {
    matchStatus: match.status,
    turnsLength: match.turns.length,
    currentTurnRevealed: currentTurn?.revealed,
    currentTurnAnswers: currentTurn ? Object.keys(currentTurn.answers || {}) : [],
    currentUserId,
    opponentId: opponent?.id,
    hasCurrentUserAnswered,
    hasOpponentAnswered,
    bothPlayersAnswered,
    totalAnswers,
    allPlayersAnswered,
    willShowReveal: currentTurn?.revealed || allPlayersAnswered
  });
  
  const isYourTurn = currentTurn && currentUserId && !hasCurrentUserAnswered && !currentTurn.revealed;
  const timeLeft = currentTurn ? Math.max(0, currentTurn.deadlineTs - Date.now()) : 0;

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

  const handleSubmitAnswer = () => {
    if (selectedAnswer === null || answering) return;
    
    setAnswering(true);
    const responseTime = Math.random() * 15000 + 5000; // Simulate thinking time
    answerMutation.mutate({ answerIndex: selectedAnswer, responseTime });
  };

  const getScoreDisplay = () => {
    if (!match) return '0-0';
    const scores = Object.values(match.scores);
    return `${scores[0] || 0}-${scores[1] || 0}`;
  };

  const getMatchStatusBadge = () => {
    if (!match) return null;
    if (match.status === 'finished' || match.status === 'over') {
      const won = match.winnerId === currentUserId;
      return (
        <Badge className={`border-0 text-white ${won ? 'bg-green-600' : 'bg-red-600'}`}>
          <Trophy className="w-3 h-3 mr-1" />
          {won ? 'Victory' : 'Defeat'}
        </Badge>
      );
    }
    
    if (isYourTurn) {
      return (
        <Badge className="bg-green-600 text-white border-0 animate-pulse">
          <Play className="w-3 h-3 mr-1" />
          Your Turn
        </Badge>
      );
    }
    
    if (allPlayersAnswered && currentTurn?.revealed) {
      return (
        <Badge className="bg-yellow-600/70 text-white border-0">
          <Clock className="w-3 h-3 mr-1" />
          Results Revealed
        </Badge>
      );
    }
    
    if (allPlayersAnswered && !currentTurn?.revealed) {
      return (
        <Badge className="bg-orange-600/70 text-white border-0 animate-pulse">
          <Clock className="w-3 h-3 mr-1" />
          Processing Results...
        </Badge>
      );
    }
    
    if (hasCurrentUserAnswered && !hasOpponentAnswered) {
      return (
        <Badge className="bg-blue-600/70 text-white border-0">
          <Clock className="w-3 h-3 mr-1" />
          Waiting for {opponent?.username}
        </Badge>
      );
    }
    
    return (
      <Badge className="bg-blue-600/70 text-white border-0">
        <Clock className="w-3 h-3 mr-1" />
        Waiting for {opponent?.username}
      </Badge>
    );
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-1 z-50">
        <Card className="w-full max-w-7xl h-[98vh] bg-gradient-to-br from-slate-900/95 to-slate-800/95 border-purple-500/30 shadow-2xl backdrop-blur-sm overflow-y-auto">
          <CardHeader className="p-4">
            <div className="flex items-center justify-between mb-4">
              <Button
                onClick={onClose}
                variant="ghost"
                size="sm"
                className="text-slate-400 hover:text-slate-300"
                data-testid="button-back-to-inbox"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Inbox
              </Button>
              
              <div className="flex items-center space-x-2">
                <Button
                  onClick={() => refetch()}
                  variant="outline"
                  size="sm"
                  className="text-xs"
                >
                  🔄 Refresh
                </Button>
                {getMatchStatusBadge()}
              </div>
            </div>

            {/* Debug Panel */}


            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {/* Match Header */}
              <div className="lg:col-span-2 text-center bg-gradient-to-r from-purple-900/20 to-blue-900/20 rounded-xl p-4 border border-purple-500/20">
                <CardTitle className="text-2xl font-cinzel text-purple-200 mb-2">
                  {match.subject}
                </CardTitle>
                <div className="text-slate-300 text-base">
                  vs <span className="font-semibold text-purple-300">@{opponent?.username}</span> • Round {match.round} of {match.turns.length > 0 ? 7 : '?'}
                </div>
              </div>

              {/* Score and Time */}
              <div className="space-y-3">
              {/* Score Progress */}
                <div className="bg-slate-800/40 rounded-xl p-3 border border-slate-700/50">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-slate-200 font-medium">Score</span>
                    <span className="text-xl font-bold text-purple-300">{getScoreDisplay()}</span>
                </div>
                <Progress 
                  value={(Math.max(...Object.values(match.scores)) / 4) * 100} 
                    className="h-2 bg-slate-700/50"
                />
                  <div className="text-xs text-slate-400 mt-1 text-center">
                    First to 4 wins
                  </div>
              </div>

              {/* Time Left */}
              {match.status === 'active' && timeLeft > 0 && (
                  <div className="text-center bg-yellow-900/20 border border-yellow-500/30 rounded-xl p-3">
                    <div className="text-sm font-bold text-yellow-300 flex items-center justify-center">
                      <Clock className="w-4 h-4 mr-2 animate-pulse" />
                    {formatTimeLeft(timeLeft)}
                  </div>
                </div>
              )}
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-4 space-y-6">
            {/* Previous Turn Results - Show briefly when a new turn starts */}
            {showPreviousResults && previousTurn && previousTurn.revealed && match.status !== 'finished' && (
              <Card className="bg-slate-800/50 border-slate-600/30 mb-6">
                <CardContent className="p-6">
                  <div className="mb-4">
                    <div className="flex items-center mb-3">
                      <div className="w-8 h-8 rounded-full bg-green-600 flex items-center justify-center mr-3">
                        <CheckCircle className="w-4 h-4 text-white" />
                      </div>
                      <div className="text-lg font-semibold text-slate-200">
                        Question {match.turns.length - 1} Results
                        <span className="ml-2 text-sm text-yellow-400 animate-pulse">(Showing for 3 seconds...)</span>
                      </div>
                    </div>
                    <div className="text-slate-300 leading-relaxed break-words overflow-wrap-anywhere">
                      {previousTurn.stem}
                    </div>
                  </div>

                  {/* Show Previous Turn Results */}
                  <div className="space-y-4">
                    {/* Player Answers Summary */}
                    <div className="bg-slate-800/50 border border-slate-600/30 rounded-lg p-4">
                      <div className="text-sm font-semibold text-slate-300 mb-3">Player Answers:</div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {match.players.map((player) => {
                          const playerAnswer = previousTurn.answers[player.id];
                          const answerText = playerAnswer ? previousTurn.choices[playerAnswer.idx] : 'No answer';
                          const isCurrentUser = player.id === user?.id;
                          
                          return (
                            <div
                              key={player.id}
                              className={`p-3 rounded border ${
                                isCurrentUser
                                  ? 'bg-blue-900/20 border-blue-500/30'
                                  : 'bg-purple-900/20 border-purple-500/30'
                              }`}
                            >
                              <div className="flex items-center justify-between">
                                <span className={`text-sm font-medium ${
                                  isCurrentUser ? 'text-blue-300' : 'text-purple-300'
                                }`}>
                                  {player.username}
                                </span>
                                <span className="text-xs text-slate-400">
                                  {playerAnswer ? `Option ${String.fromCharCode(65 + playerAnswer.idx)}` : 'No answer'}
                                </span>
                              </div>
                              {playerAnswer && (
                                <div className="text-xs text-slate-400 mt-1 truncate">
                                  {answerText}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Answer Choices with Results */}
                    {previousTurn.choices.map((choice: string, index: number) => {
                      const isCorrect = index === previousTurn.correctIndex;
                      const wasSelected = Object.values(previousTurn.answers).some((answer: any) => answer.idx === index);
                      
                      // Find which players selected this answer
                      const playersWhoSelected = Object.entries(previousTurn.answers)
                        .filter(([_, answer]: [string, any]) => answer.idx === index)
                        .map(([playerId, _]) => {
                          const player = match.players.find(p => p.id === playerId);
                          return player?.username || 'Unknown';
                        });
                      
                      return (
                        <div
                          key={index}
                          className={`p-4 rounded-lg border ${
                            isCorrect
                              ? 'bg-green-900/30 border-green-500/50'
                              : wasSelected
                              ? 'bg-red-900/30 border-red-500/50'
                              : 'bg-slate-800/30 border-slate-600/30'
                          }`}
                        >
                          <div className="flex items-start gap-3 w-full">
                            <div className="flex-shrink-0">
                              <span className="w-6 h-6 rounded border flex items-center justify-center text-sm font-semibold">
                                {String.fromCharCode(65 + index)}
                              </span>
                            </div>
                            <div className="flex-1 min-w-0 text-left">
                              <div className="break-words overflow-wrap-anywhere text-sm leading-relaxed whitespace-normal">{choice}</div>
                            </div>
                            <div className="flex items-center space-x-2">
                              {wasSelected && playersWhoSelected.length > 0 && (
                                <div className="flex items-center space-x-1">
                                  <span className="text-xs text-slate-400">Selected by:</span>
                                  {playersWhoSelected.map((username, idx) => (
                                    <span
                                      key={idx}
                                      className={`text-xs px-2 py-1 rounded ${
                                        username === user?.username
                                          ? 'bg-blue-600/20 text-blue-300 border border-blue-500/30'
                                          : 'bg-purple-600/20 text-purple-300 border border-purple-500/30'
                                      }`}
                                    >
                                      {username}
                                    </span>
                                  ))}
                                </div>
                              )}
                              {isCorrect && (
                                <CheckCircle className="w-5 h-5 text-green-400" />
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}

                    {/* Explanation */}
                    {previousTurn.explanation && (
                      <div className="mt-4 p-4 bg-blue-900/20 border border-blue-500/30 rounded-lg">
                        <div className="font-semibold text-blue-300 mb-2">Explanation:</div>
                        <div className="text-slate-300 text-sm">{previousTurn.explanation}</div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Current Question - Only show if match is not finished and not showing previous results */}
            {currentTurn && match.status !== 'finished' && !showPreviousResults && (
              <Card className="bg-gradient-to-br from-slate-800/60 to-slate-900/60 border-purple-500/20 shadow-xl">
                <CardContent className="p-6">
                  {/* Question Stem */}
                  <div className="mb-6">
                    <div className="flex items-center mb-4">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-600 to-purple-700 flex items-center justify-center mr-3 shadow-lg">
                        <Target className="w-5 h-5 text-white" />
                      </div>
                      <div className="flex-1">
                        <div className="text-lg font-bold text-slate-100 mb-1">
                          Question {match.turns.length}
                        </div>
                        <div className="text-sm text-purple-300">
                          Choose the best answer
                      </div>
                      </div>
                    </div>
                    <div className="bg-slate-900/40 border border-slate-700/50 rounded-xl p-4 shadow-inner">
                      <div className="text-slate-200 leading-relaxed text-base font-medium break-words overflow-wrap-anywhere">
                      {currentTurn.stem}
                      </div>
                    </div>
                  </div>

                  {/* Answer Choices */}
                  {!currentTurn.revealed && !allPlayersAnswered ? (
                    <div className="space-y-3">
                      {currentTurn.choices.map((choice: string, index: number) => (
                        <Button
                          key={index}
                          onClick={() => !isYourTurn ? null : setSelectedAnswer(index)}
                          disabled={!isYourTurn || answering}
                          className={`w-full p-4 h-auto border-2 transition-all duration-200 transform hover:scale-[1.01] ${
                            selectedAnswer === index
                              ? 'bg-gradient-to-r from-purple-600 to-purple-700 border-purple-400 text-white shadow-lg shadow-purple-500/25'
                              : 'bg-slate-800/60 border-slate-600/60 text-slate-200 hover:border-purple-500/60 hover:bg-slate-700/60'
                          } ${!isYourTurn ? 'opacity-50 cursor-not-allowed hover:scale-100' : ''}`}
                          data-testid={`answer-choice-${index}`}
                        >
                          <div className="flex items-start gap-3 w-full">
                            <div className="flex-shrink-0">
                              <span className={`w-6 h-6 rounded border flex items-center justify-center text-sm font-semibold ${
                                selectedAnswer === index
                                  ? 'bg-white/20 border-white/30 text-white'
                                  : 'bg-slate-700/50 border-slate-500/50 text-slate-300'
                              }`}>
                                {String.fromCharCode(65 + index)}
                              </span>
                            </div>
                            <div className="flex-1 min-w-0 text-left">
                              <div className="break-words overflow-wrap-anywhere text-sm leading-relaxed whitespace-normal">{choice}</div>
                            </div>
                          </div>
                        </Button>
                      ))}

                      {/* Submit Button */}
                      {isYourTurn && (
                        <div className="mt-6 pt-4 border-t border-slate-700/50">
                        <Button
                          onClick={handleSubmitAnswer}
                          disabled={selectedAnswer === null || answering}
                            className="w-full py-3 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white font-semibold text-base shadow-lg shadow-green-500/25 transition-all duration-200 transform hover:scale-[1.01] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                          data-testid="button-submit-answer"
                        >
                          {answering ? (
                            <>
                              <Clock className="w-4 h-4 mr-2 animate-spin" />
                                Submitting Answer...
                            </>
                          ) : (
                            <>
                              <CheckCircle className="w-4 h-4 mr-2" />
                              Submit Answer
                            </>
                          )}
                        </Button>
                        </div>
                      )}
                    </div>
                  ) : (
                    /* Show Results */
                    <div className="space-y-4">
                      {/* Player Answers Summary */}
                      <div className="bg-slate-800/50 border border-slate-600/30 rounded-lg p-4">
                        <div className="text-sm font-semibold text-slate-300 mb-3">Player Answers:</div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {match.players.map((player) => {
                            const playerAnswer = currentTurn.answers[player.id];
                            const answerText = playerAnswer ? currentTurn.choices[playerAnswer.idx] : 'No answer';
                            const isCurrentUser = player.id === user?.id;
                            
                            return (
                              <div
                                key={player.id}
                                className={`p-3 rounded border ${
                                  isCurrentUser
                                    ? 'bg-blue-900/20 border-blue-500/30'
                                    : 'bg-purple-900/20 border-purple-500/30'
                                }`}
                              >
                                <div className="flex items-center justify-between">
                                  <span className={`text-sm font-medium ${
                                    isCurrentUser ? 'text-blue-300' : 'text-purple-300'
                                  }`}>
                                    {player.username}
                                  </span>
                                  <span className="text-xs text-slate-400">
                                    {playerAnswer ? `Option ${String.fromCharCode(65 + playerAnswer.idx)}` : 'No answer'}
                                  </span>
                                </div>
                                {playerAnswer && (
                                  <div className="text-xs text-slate-400 mt-1 truncate">
                                    {answerText}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                      {currentTurn.choices.map((choice: string, index: number) => {
                        const isCorrect = index === currentTurn.correctIndex;
                        const wasSelected = Object.values(currentTurn.answers).some((answer: any) => answer.idx === index);
                        
                        // Find which players selected this answer
                        const playersWhoSelected = Object.entries(currentTurn.answers)
                          .filter(([_, answer]: [string, any]) => answer.idx === index)
                          .map(([playerId, _]) => {
                            const player = match.players.find(p => p.id === playerId);
                            return player?.username || 'Unknown';
                          });
                        
                        return (
                          <div
                            key={index}
                            className={`p-4 rounded-lg border ${
                              isCorrect
                                ? 'bg-green-900/30 border-green-500/50'
                                : wasSelected
                                ? 'bg-red-900/30 border-red-500/50'
                                : 'bg-slate-800/30 border-slate-600/30'
                            }`}
                          >
                            <div className="flex items-start gap-3">
                              <div className="flex-shrink-0">
                                <span className="w-6 h-6 rounded border flex items-center justify-center text-sm font-semibold">
                                  {String.fromCharCode(65 + index)}
                                </span>
                              </div>
                            <div className="flex-1 min-w-0">
                              <span className="break-words overflow-wrap-anywhere text-sm leading-relaxed block">{choice}</span>
                            </div>
                              <div className="flex items-center space-x-2">
                                {wasSelected && playersWhoSelected.length > 0 && (
                                  <div className="flex items-center space-x-1">
                                    <span className="text-xs text-slate-400">Selected by:</span>
                                    {playersWhoSelected.map((username, idx) => (
                                      <span
                                        key={idx}
                                        className={`text-xs px-2 py-1 rounded ${
                                          username === user?.username
                                            ? 'bg-blue-600/20 text-blue-300 border border-blue-500/30'
                                            : 'bg-purple-600/20 text-purple-300 border border-purple-500/30'
                                        }`}
                                      >
                                        {username}
                                      </span>
                                    ))}
                                  </div>
                                )}
                              {isCorrect && (
                                <CheckCircle className="w-5 h-5 text-green-400" />
                              )}
                              </div>
                            </div>
                          </div>
                        );
                      })}

                      {/* Explanation */}
                      {currentTurn.explanation && (
                        <div className="mt-4 p-4 bg-blue-900/20 border border-blue-500/30 rounded-lg">
                          <div className="font-semibold text-blue-300 mb-2">Explanation:</div>
                          <div className="text-slate-300 text-sm">{currentTurn.explanation}</div>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Match Results */}
            {(match.status === 'finished' || match.status === 'over') && (
              <Card className="bg-gradient-to-br from-purple-900/20 to-blue-900/20 border-purple-500/30">
                <CardContent className="p-6 text-center">
                  <div className="mb-4">
                    <Trophy className="w-16 h-16 mx-auto mb-4 text-yellow-400" />
                    <h3 className="text-2xl font-bold text-slate-200 mb-2">
                      {match.winnerId === null ? '🤝 Tie!' : 
                       match.winnerId === currentUserId ? '🎉 Victory!' : '😔 Defeat'}
                    </h3>
                    <p className="text-slate-400 mb-4">
                      {match.winnerId 
                        ? `Winner: ${match.players.find(p => p.id === match.winnerId)?.username || 'Unknown'}`
                        : 'Match ended in a tie'
                      }
                    </p>
                    <div className="text-3xl font-bold text-purple-300 mb-2">
                      Final Score: {getScoreDisplay()}
                    </div>
                    <div className="text-slate-400 text-sm">
                      Completed {match.turns.length} rounds
                    </div>
                  </div>
                  
                  <div className="flex gap-3 justify-center">
                    <Button
                      onClick={onClose}
                      className="bg-purple-600 hover:bg-purple-700 text-white"
                    >
                      Back to Inbox
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Actions */}
            {match.status === 'active' && (
              <div className="flex justify-between items-center pt-6 border-t border-slate-700/50">
                <Button
                  onClick={() => setShowResignDialog(true)}
                  variant="outline"
                  className="border-red-500/60 text-red-300 hover:bg-red-500/10 hover:border-red-400/60 px-6 py-2 transition-all duration-200"
                  data-testid="button-resign-match"
                >
                  <Flag className="w-4 h-4 mr-2" />
                  Resign Match
                </Button>

                <div className="text-sm text-slate-400 bg-slate-800/40 px-4 py-2 rounded-lg border border-slate-700/50">
                  <Clock className="w-4 h-4 inline mr-2" />
                  Turn deadline: 24 hours
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Resign Confirmation Dialog */}
      <Dialog open={showResignDialog} onOpenChange={setShowResignDialog}>
        <DialogContent className="bg-slate-900 border-red-500/30">
          <DialogHeader>
            <DialogTitle className="text-red-400">Resign Match?</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-slate-300">
              Are you sure you want to resign this match? This will count as a loss and your opponent will be declared the winner.
            </p>
            <div className="flex gap-3">
              <Button
                onClick={() => resignMutation.mutate()}
                disabled={resignMutation.isPending}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                {resignMutation.isPending ? 'Resigning...' : 'Yes, Resign'}
              </Button>
              <Button
                onClick={() => setShowResignDialog(false)}
                variant="outline"
              >
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}