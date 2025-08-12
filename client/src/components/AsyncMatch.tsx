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
  status: 'active' | 'over';
  winnerId: string | null;
}

export default function AsyncMatch({ matchId, isOpen, onClose }: AsyncMatchProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [answering, setAnswering] = useState(false);
  const [showResignDialog, setShowResignDialog] = useState(false);

  const { data: match, isLoading, refetch } = useQuery<AsyncMatchData>({
    queryKey: ['/api/async/match', matchId],
    enabled: isOpen && !!matchId,
    refetchInterval: 10000 // Refresh every 10s
  });

  const answerMutation = useMutation({
    mutationFn: async ({ answerIndex, responseTime }: { answerIndex: number; responseTime: number }) => {
      return apiRequest(`/api/async/answer`, {
        method: 'POST',
        body: {
          matchId,
          answerIndex,
          responseTime
        }
      });
    },
    onSuccess: () => {
      toast({
        title: "Answer Submitted",
        description: "Waiting for opponent to answer...",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/async/match', matchId] });
      queryClient.invalidateQueries({ queryKey: ['/api/async/inbox'] });
      setSelectedAnswer(null);
      setAnswering(false);
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
      return apiRequest(`/api/async/resign`, {
        method: 'POST',
        body: { matchId }
      });
    },
    onSuccess: () => {
      toast({
        title: "Match Resigned",
        description: "You have forfeited this match.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/async/inbox'] });
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

  const currentTurn = match.turns[match.turns.length - 1];
  const opponent = match.players.find(p => p.id !== match.players[0].id); // Simplified - assumes first player is current user
  const isYourTurn = currentTurn && !currentTurn.answers[match.players[0].id] && !currentTurn.revealed;
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
    if (match.status === 'over') {
      const won = match.winnerId === match.players[0].id;
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
    
    return (
      <Badge className="bg-blue-600/70 text-white border-0">
        <Clock className="w-3 h-3 mr-1" />
        Waiting for @{opponent?.username}
      </Badge>
    );
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
        <Card className="w-full max-w-3xl bg-gradient-to-br from-slate-900 to-slate-800 border-purple-500/30 shadow-2xl max-h-[90vh] overflow-auto">
          <CardHeader>
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
                {getMatchStatusBadge()}
              </div>
            </div>

            <div className="space-y-4">
              {/* Match Header */}
              <div className="text-center">
                <CardTitle className="text-2xl font-cinzel text-purple-300 mb-2">
                  {match.subject}
                </CardTitle>
                <div className="text-slate-400">
                  vs @{opponent?.username} • Round {match.round} of {match.turns.length > 0 ? 7 : '?'}
                </div>
              </div>

              {/* Score Progress */}
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-300">Match Progress</span>
                  <span className="text-purple-300">{getScoreDisplay()}</span>
                </div>
                <Progress 
                  value={(Math.max(...Object.values(match.scores)) / 4) * 100} 
                  className="h-3"
                />
              </div>

              {/* Time Left */}
              {match.status === 'active' && timeLeft > 0 && (
                <div className="text-center">
                  <div className="text-lg font-semibold text-yellow-400">
                    <Clock className="w-5 h-5 inline mr-2" />
                    {formatTimeLeft(timeLeft)}
                  </div>
                </div>
              )}
            </div>
          </CardHeader>

          <CardContent className="space-y-6">
            {/* Current Question */}
            {currentTurn && (
              <Card className="bg-slate-800/50 border-slate-600/30">
                <CardContent className="p-6">
                  {/* Question Stem */}
                  <div className="mb-6">
                    <div className="flex items-center mb-3">
                      <div className="w-8 h-8 rounded-full bg-purple-600 flex items-center justify-center mr-3">
                        <Target className="w-4 h-4 text-white" />
                      </div>
                      <div className="text-lg font-semibold text-slate-200">
                        Question {match.round}
                      </div>
                    </div>
                    <div className="text-slate-300 leading-relaxed">
                      {currentTurn.stem}
                    </div>
                  </div>

                  {/* Answer Choices */}
                  {!currentTurn.revealed ? (
                    <div className="space-y-3">
                      {currentTurn.choices.map((choice: string, index: number) => (
                        <Button
                          key={index}
                          onClick={() => !isYourTurn ? null : setSelectedAnswer(index)}
                          disabled={!isYourTurn || answering}
                          className={`w-full text-left p-4 h-auto border transition-all ${
                            selectedAnswer === index
                              ? 'bg-purple-600 border-purple-500 text-white'
                              : 'bg-slate-700/50 border-slate-600/50 text-slate-300 hover:border-purple-400/50'
                          } ${!isYourTurn ? 'opacity-50 cursor-not-allowed' : ''}`}
                          data-testid={`answer-choice-${index}`}
                        >
                          <div className="flex items-center">
                            <span className="w-6 h-6 rounded border border-current flex items-center justify-center mr-3 text-sm font-semibold">
                              {String.fromCharCode(65 + index)}
                            </span>
                            <span>{choice}</span>
                          </div>
                        </Button>
                      ))}

                      {/* Submit Button */}
                      {isYourTurn && (
                        <Button
                          onClick={handleSubmitAnswer}
                          disabled={selectedAnswer === null || answering}
                          className="w-full mt-4 bg-green-600 hover:bg-green-700 text-white"
                          data-testid="button-submit-answer"
                        >
                          {answering ? (
                            <>
                              <Clock className="w-4 h-4 mr-2 animate-spin" />
                              Submitting...
                            </>
                          ) : (
                            <>
                              <CheckCircle className="w-4 h-4 mr-2" />
                              Submit Answer
                            </>
                          )}
                        </Button>
                      )}
                    </div>
                  ) : (
                    /* Show Results */
                    <div className="space-y-4">
                      {currentTurn.choices.map((choice: string, index: number) => {
                        const isCorrect = index === currentTurn.correctIndex;
                        const wasSelected = Object.values(currentTurn.answers).some((answer: any) => answer.idx === index);
                        
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
                            <div className="flex items-center">
                              <span className="w-6 h-6 rounded border flex items-center justify-center mr-3 text-sm font-semibold">
                                {String.fromCharCode(65 + index)}
                              </span>
                              <span className="flex-1">{choice}</span>
                              {isCorrect && (
                                <CheckCircle className="w-5 h-5 text-green-400" />
                              )}
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

            {/* Actions */}
            {match.status === 'active' && (
              <div className="flex justify-between items-center pt-4 border-t border-slate-700">
                <Button
                  onClick={() => setShowResignDialog(true)}
                  variant="outline"
                  className="border-red-500/50 text-red-300 hover:bg-red-500/10"
                  data-testid="button-resign-match"
                >
                  <Flag className="w-4 h-4 mr-2" />
                  Resign Match
                </Button>

                <div className="text-sm text-slate-400">
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