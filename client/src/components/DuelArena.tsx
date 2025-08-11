import { useState, useEffect, useRef } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AvatarRenderer } from './AvatarRenderer';
import type { User, QuestionData, DuelResultData, DuelFinishedData } from '@shared/schema';

interface DuelArenaProps {
  user: User;
  opponent: User;
  isVisible: boolean;
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
}

export function DuelArena({ user, opponent, isVisible, onDuelEnd }: DuelArenaProps) {
  const [duelState, setDuelState] = useState<DuelState>({
    round: 0,
    scores: [0, 0],
    timeLeft: 20,
    showResult: false,
    isFinished: false,
    waitingForOpponent: false,
    hintsUsed: 0,
    showHint: false
  });

  const timerRef = useRef<NodeJS.Timeout>();
  const wsRef = useRef<WebSocket>();

  useEffect(() => {
    if (!isVisible) return;

    // Initialize WebSocket connection
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

    return () => {
      ws.close();
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [isVisible]);

  const handleWebSocketMessage = (message: any) => {
    const { type, payload } = message;

    switch (type) {
      case 'duel:start':
        setDuelState(prev => ({
          ...prev,
          roomCode: payload.roomCode,
          subject: payload.subject,
          round: 0,
          scores: [0, 0],
          isFinished: false
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

      default:
        console.log('Unknown message type:', type);
    }
  };

  const handleNewQuestion = (questionData: QuestionData) => {
    setDuelState(prev => ({
      ...prev,
      currentQuestion: questionData,
      round: questionData.round,
      timeLeft: 20,
      selectedAnswer: undefined,
      showResult: false,
      waitingForOpponent: false,
      showHint: false
    }));

    startTimer(questionData.deadlineTs);
    announceForScreenReader(`Round ${questionData.round}. New question presented.`);
  };

  const handleQuestionResult = (resultData: DuelResultData) => {
    setDuelState(prev => ({
      ...prev,
      showResult: true,
      lastResult: resultData,
      scores: [resultData.scores.player1, resultData.scores.player2],
      waitingForOpponent: false
    }));

    const isCorrect = prev.selectedAnswer === resultData.correctIndex;
    announceForScreenReader(
      isCorrect 
        ? `Correct! You gained 10 XP. Current score: ${resultData.scores.player1} to ${resultData.scores.player2}.`
        : `Incorrect. The correct answer was ${String.fromCharCode(65 + resultData.correctIndex)}. Current score: ${resultData.scores.player1} to ${resultData.scores.player2}.`
    );
  };

  const handleDuelFinished = (finishedData: DuelFinishedData) => {
    setDuelState(prev => ({
      ...prev,
      isFinished: true,
      finalResult: finishedData
    }));

    const won = finishedData.winnerId === user.id;
    announceForScreenReader(
      won 
        ? `Duel complete! You won and gained ${finishedData.pointChanges.player1} points and ${finishedData.xpGained.player1} XP.`
        : `Duel complete! You lost ${Math.abs(finishedData.pointChanges.player1)} points but gained ${finishedData.xpGained.player1} XP.`
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
        // Auto-submit or handle timeout
        if (duelState.selectedAnswer === undefined) {
          handleAnswerSelect(-1); // No answer
        }
      }
    }, 1000);
  };

  const handleAnswerSelect = (answerIndex: number) => {
    if (duelState.selectedAnswer !== undefined || duelState.timeLeft === 0) return;

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
          ms: (20 - duelState.timeLeft) * 1000
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
      <CardContent className="p-6">
        {/* Opponent Info */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-4">
            <AvatarRenderer
              avatarData={opponent.avatarData}
              level={opponent.level}
              size={56}
            />
            <div>
              <h3 className="font-semibold">{opponent.displayName}</h3>
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
              <h3 className="font-semibold">{user.displayName}</h3>
              <p className="text-sm text-muted">Level {user.level} • {user.points} Points</p>
            </div>
            <AvatarRenderer
              avatarData={user.avatarData}
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
        
        {/* Question */}
        {duelState.currentQuestion && (
          <div className="question-reveal mb-8">
            <div className="bg-panel-2 border border-white/10 rounded-xl p-6">
              <div className="flex items-start justify-between mb-4">
                <h4 className="font-semibold text-lg" data-testid="question-header">
                  {duelState.subject} • Round {duelState.round}/7
                </h4>
                <div className="flex items-center space-x-2">
                  <button 
                    className="text-muted hover:text-mystic-gold transition-colors disabled:opacity-50"
                    onClick={handleHintRequest}
                    disabled={duelState.hintsUsed >= 3 || duelState.selectedAnswer !== undefined}
                    title={`Ask Atticus for a hint (${3 - duelState.hintsUsed} remaining)`}
                    data-testid="button-hint"
                  >
                    <i className="fas fa-cat"></i>
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
        {duelState.currentQuestion && !duelState.showResult && (
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
              <p className="text-sm text-muted">{duelState.lastResult.explanation}</p>
              {duelState.selectedAnswer === duelState.lastResult.correctIndex && (
                <p className="text-success font-semibold">+10 XP</p>
              )}
            </div>
          </div>
        )}

        {/* Atticus Hint */}
        {duelState.showHint && duelState.hintText && (
          <div className="bg-mystic-gold/10 border border-mystic-gold/30 rounded-xl p-4 mb-6" data-testid="hint-display">
            <div className="flex items-start space-x-3">
              <div className="w-8 h-8 bg-mystic-gold rounded-lg flex items-center justify-center flex-shrink-0">
                <i className="fas fa-cat text-dark-bg text-sm"></i>
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
          <div className="text-center">
            <div className="bg-panel-2 border border-white/10 rounded-xl p-6 mb-6">
              <h3 className="font-cinzel text-2xl font-bold mb-4">
                {duelState.finalResult.winnerId === user.id ? 'Victory!' : 'Defeat'}
              </h3>
              <div className="space-y-2">
                <p>Final Score: {duelState.finalResult.finalScores.player1} - {duelState.finalResult.finalScores.player2}</p>
                <p>Points: {duelState.finalResult.pointChanges.player1 > 0 ? '+' : ''}{duelState.finalResult.pointChanges.player1}</p>
                <p>XP Gained: +{duelState.finalResult.xpGained.player1}</p>
              </div>
            </div>
            <Button onClick={onDuelEnd} className="btn-primary py-3 px-8" data-testid="button-return-dashboard">
              Return to Dashboard
            </Button>
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
