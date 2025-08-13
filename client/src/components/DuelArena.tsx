import { useState, useEffect, useRef } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AvatarRenderer } from './AvatarRenderer';
import { AtticusCat } from './AtticusCat';
import { FeedbackChip, MatchSummaryChips } from './FeedbackChip';
import type { User, QuestionData, DuelResultData, DuelFinishedData } from '@shared/schema';

interface DuelArenaProps {
  user: User;
  opponent: User;
  isVisible: boolean;
  websocket?: WebSocket; // Accept the persistent WebSocket from QuickMatch
  onDuelEnd: () => void;
}

interface DuelState {
  roomCode?: string;
  subject?: string;
  round: number;
  scores: [number, number]; // [user, opponent]
  currentQuestion?: QuestionData;
  timeLeft: number;
  selectedAnswer?: number;
  showResult: boolean;
  lastResult?: DuelResultData;
  isFinished: boolean;
  finalResult?: DuelFinishedData;
  waitingForOpponent: boolean;
  hintsUsed: number;
  hintText?: string;
  showHint: boolean;
  showTrainingBanner: boolean;
  generatingQuestion: boolean; // Add loading state for OpenAI generation
  showFeedbackChip: boolean; // For instant feedback display
  feedbackData?: {
    correct: boolean;
    xpGained: number;
    subject?: string;
    subtopic?: string;
    masteryChange?: number;
  };
}

export function DuelArena({ user, opponent, isVisible, websocket, onDuelEnd }: DuelArenaProps) {
  const [duelState, setDuelState] = useState<DuelState>({
    round: 0,
    scores: [0, 0],
    timeLeft: 20,
    showResult: false,
    isFinished: false,
    waitingForOpponent: false,
    hintsUsed: 0,
    showHint: false,
    showTrainingBanner: false,
    generatingQuestion: true // Start with loading state for initial question
  });

  const timerRef = useRef<NodeJS.Timeout>();
  const wsRef = useRef<WebSocket>();

  useEffect(() => {
    if (!isVisible) return;

    // Use the existing WebSocket connection from QuickMatch instead of creating a new one
    if (websocket) {
      console.log('Using persistent WebSocket connection for duel');
      wsRef.current = websocket;
      
      // Set up message handler for the existing connection
      websocket.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          handleWebSocketMessage(message);
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error);
        }
      };
    } else {
      // Fallback: create new connection if none provided
      console.log('No WebSocket provided - creating new connection');
      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      const wsUrl = `${protocol}//${window.location.host}/ws`;
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('Connected to duel server');
      };

      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          handleWebSocketMessage(message);
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error);
        }
      };

      ws.onclose = () => {
        console.log('Disconnected from duel server');
      };
    }

    return () => {
      // Only close the WebSocket if we created it (fallback case)
      if (!websocket && wsRef.current) {
        wsRef.current.close();
      }
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [isVisible, websocket]);

  const handleWebSocketMessage = (message: any) => {
    const { type, payload } = message;

    switch (type) {
      case 'duel:start':
        console.log('Duel started with payload:', payload);
        setDuelState(prev => ({
          ...prev,
          roomCode: payload.roomCode,
          subject: payload.subject || 'Mixed Questions',
          round: 0,
          scores: [0, 0],
          isFinished: false,
          generatingQuestion: true // Show loading while waiting for first question
        }));
        break;

      case 'duel:question':
        handleNewQuestion(payload);
        break;

      case 'duel:result':
        handleQuestionResult(payload);
        break;

      case 'duel:finished':
        handleDuelFinished(payload);
        break;

      case 'duel:botAnswer':
        // Handle bot answer for visual feedback
        break;

      case 'leaderboard:update':
        // Ignore leaderboard updates in duel view
        break;

      default:
        console.log('Unknown message type:', type);
    }
  };

  const handleNewQuestion = (questionData: QuestionData) => {
    console.log('Received question data:', questionData);
    
    // Get time limit in seconds (handle both timeLimitSec and timeLimit fields)
    const timeLimitSeconds = (questionData as any).timeLimitSec || Math.floor((questionData.timeLimit || 60000) / 1000);
    
    // Clear any stale state and force fresh question display
    setDuelState(prev => ({
      ...prev,
      currentQuestion: {
        ...questionData,
        // Ensure we have normalized choices as strings
        choices: Array.isArray(questionData.choices) 
          ? questionData.choices.map(choice => String(choice).trim())
          : []
      },
      round: questionData.round,
      timeLeft: timeLimitSeconds, // Use calculated time limit
      selectedAnswer: undefined,
      showResult: false,
      waitingForOpponent: false,
      showHint: false,
      showTrainingBanner: false,
      generatingQuestion: false, // Clear loading state when question arrives
      questionStartTime: Date.now() // Track when question started for accurate timing
    }));

    // Use deadlineTs if available, otherwise calculate based on time limit
    const deadline = questionData.deadlineTs || (Date.now() + timeLimitSeconds * 1000);
    startTimer(deadline);
    announceForScreenReader(`Round ${questionData.round}. New question presented.`);
  };

  const handleQuestionResult = (resultData: any) => {
    const isCorrect = duelState.selectedAnswer === resultData.correctIndex;
    
    // Use progress data from server if available, otherwise use defaults
    const progressData = resultData.progressResult || {};
    const xpGained = progressData.xpGained || (isCorrect ? 12 : 3);
    const masteryChange = progressData.masteryDelta || (isCorrect ? 0.5 : -0.25);
    
    // Extract subject and subtopic from server response or question
    const subject = progressData.subject || resultData.subject || duelState.currentQuestion?.subject || 'Law';
    const subtopic = progressData.subtopic || resultData.subtopic || 'General';
    
    setDuelState(prev => ({
      ...prev,
      showResult: true,
      lastResult: resultData,
      scores: resultData.scores || [0, 0],
      waitingForOpponent: false,
      showFeedbackChip: true,
      feedbackData: {
        correct: isCorrect,
        xpGained,
        subject,
        subtopic,
        masteryChange
      }
    }));

    announceForScreenReader(
      isCorrect 
        ? `Correct! You gained ${xpGained} XP. ${subject}/${subtopic} mastery ${masteryChange > 0 ? 'increased' : 'decreased'} by ${Math.abs(masteryChange)}%. Current score: ${resultData.scores[0]} to ${resultData.scores[1]}.`
        : `Incorrect. The correct answer was ${String.fromCharCode(65 + resultData.correctIndex)}. Current score: ${resultData.scores[0]} to ${resultData.scores[1]}.`
    );
    
    // Hide feedback chip after delay
    setTimeout(() => {
      setDuelState(prev => ({ ...prev, showFeedbackChip: false }));
    }, 3500); // Match the chip display duration
  };

  const handleDuelFinished = async (finishedData: any) => {
    setDuelState(prev => ({
      ...prev,
      isFinished: true,
      finalResult: finishedData
    }));

    const won = finishedData.winnerId === user.id;
    const pointsChange = finishedData.pointChanges.player1;
    const xpGained = finishedData.xpGained.player1;
    
    // Update user stats on server with competitive point system
    try {
      await fetch(`/api/users/${user.id}/stats`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ won, xpGained, pointsChange })
      });
    } catch (error) {
      console.error("Failed to update user stats:", error);
    }
    
    announceForScreenReader(
      won 
        ? `Duel complete! You won and gained ${pointsChange} points and ${xpGained} XP. Level up when you reach the next 100-point milestone!`
        : `Duel complete! You lost ${Math.abs(pointsChange)} points but gained ${xpGained} XP. Keep fighting to earn your points back!`
    );
  };

  const startTimer = (deadlineTs: number) => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }

    timerRef.current = setInterval(() => {
      const remaining = Math.max(0, Math.floor((deadlineTs - Date.now()) / 1000));
      setDuelState(prev => ({ ...prev, timeLeft: remaining }));

      if (remaining === 0) {
        clearInterval(timerRef.current!);
        // Auto-submit if no answer selected
        setDuelState(prev => {
          if (prev.selectedAnswer === undefined) {
            // Auto-submit no answer
            if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
              wsRef.current.send(JSON.stringify({
                type: 'duel:answer',
                payload: {
                  answerIndex: -1,
                  responseTimeMs: 60000
                }
              }));
            }
            return { ...prev, selectedAnswer: -1, waitingForOpponent: true };
          }
          return prev;
        });
      }
    }, 1000);
  };

  const handleAnswerSelect = (answerIndex: number) => {
    if (duelState.selectedAnswer !== undefined || duelState.timeLeft === 0) return;

    // Calculate actual response time from when question started
    const responseTimeMs = Date.now() - ((duelState as any).questionStartTime || Date.now());

    setDuelState(prev => ({
      ...prev,
      selectedAnswer: answerIndex,
      waitingForOpponent: true
    }));

    // Send answer to server
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'duel:answer',
        payload: {
          qid: duelState.currentQuestion?.qid,
          idx: answerIndex,
          ms: Math.min(responseTimeMs, 60000) // Cap at 60 seconds
        }
      }));
    }

    announceForScreenReader(`Answer ${String.fromCharCode(65 + answerIndex)} selected. Waiting for opponent.`);
  };

  const handleHintRequest = () => {
    if (duelState.hintsUsed >= 3 || !duelState.currentQuestion) return;

    setDuelState(prev => ({ ...prev, hintsUsed: prev.hintsUsed + 1 }));

    // Request hint from server
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'duel:hint',
        payload: {
          matchId: duelState.roomCode
        }
      }));
    }

    // Show sample hint for now
    setDuelState(prev => ({
      ...prev,
      hintText: "Consider the balancing test for prejudicial evidence and whether the probative value is substantially outweighed by unfair prejudice.",
      showHint: true
    }));

    announceForScreenReader("Atticus provides a hint to guide your thinking.");
  };

  const announceForScreenReader = (message: string) => {
    const announcer = document.createElement('div');
    announcer.setAttribute('aria-live', 'polite');
    announcer.setAttribute('aria-atomic', 'true');
    announcer.className = 'sr-only';
    announcer.textContent = message;
    document.body.appendChild(announcer);
    setTimeout(() => announcer.remove(), 3000);
  };

  const timerProgress = duelState.timeLeft > 0 ? (duelState.timeLeft / 20) * 283 : 283;

  if (!isVisible) return null;

  return (
    <Card className="panel" data-testid="duel-arena">
      {/* Instant Feedback Chip */}
      {/* Feedback Chip for instant progress display */}
      <FeedbackChip
        show={duelState.showFeedbackChip}
        correct={duelState.feedbackData?.correct || false}
        xpGained={duelState.feedbackData?.xpGained || 0}
        subject={duelState.feedbackData?.subject}
        subtopic={duelState.feedbackData?.subtopic}
        masteryChange={duelState.feedbackData?.masteryChange}
      />
      
      <CardContent className="p-6">
        {/* Opponent Info */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-4">
            <AvatarRenderer
              avatarData={opponent.avatarData as any}
              level={opponent.level}
              size={56}
            />
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-semibold">{opponent.displayName}</h3>
                {opponent.lawSchool && (
                  <Badge variant="outline" className="text-xs border-purple-400/50 text-purple-300 bg-purple-900/20">
                    {opponent.lawSchool.includes('Law School') ? 
                      opponent.lawSchool.split(' Law School')[0] : 
                      opponent.lawSchool.split(' ')[0]
                    }
                  </Badge>
                )}
              </div>
              <p className="text-sm text-muted">Level {opponent.level} • {opponent.points} Points</p>
            </div>
          </div>
          
          {/* Score Display */}
          <div className="flex items-center space-x-6">
            <div className="text-center">
              <div className="w-8 h-8 bg-arcane rounded-full flex items-center justify-center font-bold" data-testid="score-user">
                {duelState.scores[0]}
              </div>
              <p className="text-xs text-muted mt-1">You</p>
            </div>
            <div className="text-2xl font-cinzel font-bold text-muted">VS</div>
            <div className="text-center">
              <div className="w-8 h-8 bg-danger rounded-full flex items-center justify-center font-bold" data-testid="score-opponent">
                {duelState.scores[1]}
              </div>
              <p className="text-xs text-muted mt-1">Opponent</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            <div className="text-right">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-semibold">{user.displayName}</h3>
                {user.lawSchool && (
                  <Badge variant="outline" className="text-xs border-purple-400/50 text-purple-300 bg-purple-900/20">
                    {user.lawSchool.includes('Law School') ? 
                      user.lawSchool.split(' Law School')[0] : 
                      user.lawSchool.split(' ')[0]
                    }
                  </Badge>
                )}
              </div>
              <p className="text-sm text-muted">Level {user.level} • {user.points} Points</p>
            </div>
            <AvatarRenderer
              avatarData={user.avatarData as any}
              level={user.level}
              size={56}
            />
          </div>
        </div>
        
        {/* Timer */}
        <div className="flex justify-center mb-6">
          <div className="relative">
            <svg className="w-20 h-20 transform -rotate-90">
              <circle cx="40" cy="40" r="36" stroke="rgba(255,255,255,0.1)" strokeWidth="4" fill="none"/>
              <circle 
                cx="40" cy="40" r="36" 
                stroke="#5865f2" strokeWidth="4" fill="none" 
                className="timer-ring transition-all duration-100" 
                style={{ 
                  strokeDasharray: 283,
                  strokeDashoffset: timerProgress
                }}
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-2xl font-bold" data-testid="timer-display">{duelState.timeLeft}</span>
            </div>
          </div>
        </div>
        
        {/* Training Banner */}
        {duelState.showTrainingBanner && (
          <div className="bg-mystic-gold/10 border border-mystic-gold/30 rounded-lg p-3 mb-4">
            <p className="text-sm text-mystic-gold text-center">
              Using training questions while Atticus refills the vault.
            </p>
          </div>
        )}
        
        {/* Loading State - Generating Question */}
        {duelState.generatingQuestion && !duelState.currentQuestion && (
          <div className="flex flex-col items-center justify-center py-16 mb-8">
            <div className="relative mb-6">
              <div className="w-16 h-16 border-4 border-arcane/20 border-t-arcane rounded-full animate-spin"></div>
              <div className="absolute inset-0 flex items-center justify-center">
                <i className="fas fa-magic text-arcane text-xl"></i>
              </div>
            </div>
            <div className="text-center space-y-2">
              <h3 className="text-xl font-semibold text-arcane">Generating Question</h3>
              <p className="text-muted text-sm">Atticus is crafting a fresh {duelState.subject} question...</p>
            </div>
          </div>
        )}

        {/* Question */}
        {duelState.currentQuestion && !duelState.generatingQuestion && (
          <div className="question-reveal mb-8">
            <div className="bg-panel-2 border border-white/10 rounded-xl p-6">
              <div className="flex items-start justify-between mb-4">
                <h4 className="font-semibold text-lg" data-testid="question-header">
                  {(duelState.currentQuestion as any)?.subject || duelState.subject} • Round {duelState.round}/10
                </h4>
                <div className="flex items-center space-x-2">
                  <button 
                    className="text-muted hover:text-mystic-gold transition-colors disabled:opacity-50"
                    onClick={handleHintRequest}
                    disabled={duelState.hintsUsed >= 3 || duelState.selectedAnswer !== undefined}
                    title={`Ask Atticus for a hint (${3 - duelState.hintsUsed} remaining)`}
                    data-testid="button-hint"
                  >
                    <AtticusCat size="xs" className="inline-block" />
                  </button>
                  <span className="text-xs text-muted">Hints: {duelState.hintsUsed}/3</span>
                </div>
              </div>
              <p className="text-ink leading-relaxed mb-6" data-testid="question-stem">
                {duelState.currentQuestion.stem}
              </p>
            </div>
          </div>
        )}
        
        {/* Answer Choices */}
        {duelState.currentQuestion && !duelState.showResult && !duelState.generatingQuestion && (
          <div className="grid grid-cols-1 gap-3 mb-6">
            {duelState.currentQuestion.choices.map((choice, index) => (
              <Button
                key={index}
                onClick={() => handleAnswerSelect(index)}
                disabled={duelState.selectedAnswer !== undefined}
                className={`text-left p-4 rounded-xl border border-white/10 hover:border-arcane hover:bg-arcane/5 transition-all min-h-[44px] flex items-center bg-transparent ${
                  duelState.selectedAnswer === index ? 'border-arcane bg-arcane/10' : ''
                }`}
                data-testid={`answer-choice-${index}`}
              >
                <span className="w-8 h-8 bg-arcane/20 text-arcane rounded-lg font-bold mr-4 flex items-center justify-center text-sm">
                  {String.fromCharCode(65 + index)}
                </span>
                <span>{choice}</span>
              </Button>
            ))}
          </div>
        )}

        {/* Result Display */}
        {duelState.showResult && duelState.lastResult && (
          <div className="bg-panel-2 border border-white/10 rounded-xl p-6 mb-6">
            <h4 className="font-semibold text-lg mb-4">Round Result</h4>
            <div className="space-y-2">
              <p className="text-sm">
                Correct Answer: <span className="font-bold text-success">
                  {String.fromCharCode(65 + duelState.lastResult.correctIndex)}
                </span>
              </p>
              
              {/* Atticus Says Explanation */}
              <div className="bg-mystic-gold/10 border border-mystic-gold/30 rounded-xl p-4 mt-4">
                <div className="flex items-start space-x-3">
                  <div className="w-10 h-10 bg-mystic-gold rounded-lg flex items-center justify-center flex-shrink-0">
                    <AtticusCat size="md" className="opacity-90" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-mystic-gold mb-1">Atticus Says:</p>
                    <p className="text-sm text-gray-200">{duelState.lastResult.explanation}</p>
                  </div>
                </div>
              </div>
              
              {duelState.selectedAnswer === duelState.lastResult.correctIndex && (
                <p className="text-success font-semibold mt-2">+10 XP</p>
              )}
            </div>
          </div>
        )}

        {/* Atticus Hint */}
        {duelState.showHint && duelState.hintText && (
          <div className="bg-mystic-gold/10 border border-mystic-gold/30 rounded-xl p-4 mb-6" data-testid="hint-display">
            <div className="flex items-start space-x-3">
              <div className="w-8 h-8 bg-mystic-gold rounded-lg flex items-center justify-center flex-shrink-0">
                <AtticusCat size="sm" className="opacity-90" />
              </div>
              <div>
                <p className="text-sm font-medium text-mystic-gold mb-1">Atticus whispers:</p>
                <p className="text-sm">{duelState.hintText}</p>
              </div>
            </div>
          </div>
        )}

        {/* Duel Finished */}
        {duelState.isFinished && duelState.finalResult && (
          <div className="text-center space-y-6">
            <div className="text-4xl font-cinzel font-bold text-arcane">
              {duelState.finalResult.winnerId === user.id ? "VICTORY!" : "DEFEAT"}
            </div>
            
            <div className="grid grid-cols-3 gap-4">
              <div className="p-4 bg-arcane/10 rounded-lg">
                <h4 className="font-bold text-arcane">Final Score</h4>
                <p className="text-2xl font-cinzel">
                  {duelState.finalResult.finalScores.player1} - {duelState.finalResult.finalScores.player2}
                </p>
              </div>
              
              <div className="p-4 bg-success/10 rounded-lg">
                <h4 className="font-bold text-success">XP Gained</h4>
                <p className="text-xl text-success">+{duelState.finalResult.xpGained.player1}</p>
              </div>
              
              <div className={`p-4 rounded-lg ${duelState.finalResult.pointChanges.player1 >= 0 ? "bg-success/10" : "bg-danger/10"}`}>
                <h4 className={`font-bold ${duelState.finalResult.pointChanges.player1 >= 0 ? "text-success" : "text-danger"}`}>
                  Points {duelState.finalResult.pointChanges.player1 >= 0 ? "Gained" : "Lost"}
                </h4>
                <p className={`text-xl ${duelState.finalResult.pointChanges.player1 >= 0 ? "text-success" : "text-danger"}`}>
                  {duelState.finalResult.pointChanges.player1 >= 0 ? "+" : ""}{duelState.finalResult.pointChanges.player1}
                </p>
              </div>
            </div>
            
            {(duelState.finalResult as any).competitiveDetails && (
              <div className="p-4 bg-muted/50 rounded-lg text-sm space-y-2">
                <h4 className="font-bold">Competitive Breakdown:</h4>
                <div className="flex justify-between">
                  <span>Correct Answers ({(duelState.finalResult as any).competitiveDetails.correctAnswers}/10):</span>
                  <span className="text-success">+{(duelState.finalResult as any).competitiveDetails.basePoints} pts</span>
                </div>
                {(duelState.finalResult as any).competitiveDetails.winBonus > 0 && (
                  <div className="flex justify-between">
                    <span>Victory Bonus:</span>
                    <span className="text-success">+{(duelState.finalResult as any).competitiveDetails.winBonus} pts</span>
                  </div>
                )}
                {(duelState.finalResult as any).competitiveDetails.lossePenalty < 0 && (
                  <div className="flex justify-between">
                    <span>Defeat Penalty:</span>
                    <span className="text-danger">{(duelState.finalResult as any).competitiveDetails.lossePenalty} pts</span>
                  </div>
                )}
                <div className="border-t pt-2 flex justify-between font-bold">
                  <span>Total Change:</span>
                  <span className={duelState.finalResult.pointChanges.player1 >= 0 ? "text-success" : "text-danger"}>
                    {duelState.finalResult.pointChanges.player1 >= 0 ? "+" : ""}{duelState.finalResult.pointChanges.player1} pts
                  </span>
                </div>
                <p className="text-xs text-muted mt-2">
                  Level up every 100 points! Keep dueling to climb the ranks.
                </p>
              </div>
            )}
            
            {/* Add Elo and Mastery Summary */}
            <MatchSummaryChips
              totalXP={duelState.finalResult.xpGained.player1}
              masteryChanges={[]} // Will be populated when integrated with subtopic tracking
              eloChange={duelState.finalResult.pointChanges.player1} // Using points as Elo
            />
            
            <div className="flex gap-4 justify-center">
              <Button onClick={onDuelEnd} data-testid="button-home">
                Return Home
              </Button>
              <Button variant="outline" onClick={() => window.location.reload()} data-testid="button-rematch">
                Rematch
              </Button>
            </div>
          </div>
        )}
        
        {/* Status Bar */}
        {!duelState.isFinished && (
          <div className="flex items-center justify-between text-sm text-muted">
            <span data-testid="status-text">
              {duelState.waitingForOpponent ? 'Waiting for opponent...' : 
               duelState.showResult ? 'Round complete' : 
               'Choose your answer'}
            </span>
            <span>Subject: {duelState.subject}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Keyboard shortcuts for accessibility
export function setupDuelKeyboardShortcuts(handleAnswerSelect: (index: number) => void) {
  const handleKeydown = (e: KeyboardEvent) => {
    if (e.key >= '1' && e.key <= '4') {
      const choiceIndex = parseInt(e.key) - 1;
      handleAnswerSelect(choiceIndex);
    }
  };

  document.addEventListener('keydown', handleKeydown);
  return () => document.removeEventListener('keydown', handleKeydown);
}
