import { useState, useEffect, useRef } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AvatarRenderer } from './AvatarRenderer';
import { AtticusCat } from './AtticusCat';
import { FeedbackChip, MatchSummaryChips } from './FeedbackChip';
import { useStreak } from '@/contexts/StreakContext';
import type { User, QuestionData, DuelResultData, DuelFinishedData } from '@shared/schema';

// Match the server's MATCH_QUESTIONS constant
const MATCH_QUESTIONS = 5;

interface DuelArenaProps {
  user: User;
  opponent: User;
  isVisible: boolean;
  websocket?: WebSocket; // Accept the persistent WebSocket from QuickMatch
  duelStartMessage?: any; // Accept the duel:start message from Home
  onDuelEnd: () => void;
}

interface DuelState {
  roomCode?: string;
  subject?: string;
  round: number;
  scores: [number, number]; // [player1, player2]
  playerIndex?: number; // Which index the current player is (0 or 1)
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
  showTransition: boolean; // Add transition state between questions
  showFeedbackChip: boolean; // For instant feedback display
  feedbackData?: {
    correct: boolean;
    xpGained: number;
    subject?: string;
    subtopic?: string;
    masteryChange?: number;
  };
  userHP: number; // Pokemon-style HP tracking
  opponentHP: number;
  showAnswerAnimation: boolean; // Battle animation when selecting
}

export function DuelArena({ user, opponent, isVisible, websocket, duelStartMessage, onDuelEnd }: DuelArenaProps) {
  const { incrementStreak, resetStreak } = useStreak();
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
    showTransition: false,
    generatingQuestion: true, // Start with loading state for initial question
    showFeedbackChip: false,
    userHP: 100,
    opponentHP: 100,
    showAnswerAnimation: false
  });

  const timerRef = useRef<NodeJS.Timeout>();
  const wsRef = useRef<WebSocket>();

  useEffect(() => {
    if (!isVisible) return;

    // Use the existing WebSocket connection from QuickMatch instead of creating a new one
    if (websocket) {
      console.log('Using persistent WebSocket connection for duel');
      wsRef.current = websocket;
      
      // Store the original message handler
      const originalOnMessage = websocket.onmessage;
      
      // Set up message handler for the existing connection
      websocket.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          console.log('DuelArena received message:', message.type);
          
          // Handle all messages, including duel:start
          handleWebSocketMessage(message);
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error);
        }
      };
    } else {
      // Fallback: create new connection if none provided
      console.log('No WebSocket provided - creating new connection');
      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      // Determine the correct WebSocket URL based on the current port
      const isViteDev = window.location.port === '5173';
      const wsUrl = isViteDev 
        ? `${protocol}//${window.location.hostname}:5000/ws`
        : `${protocol}//${window.location.host}/ws`;
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

  // Handle duelStartMessage when it's passed from Home component
  useEffect(() => {
    if (duelStartMessage && duelStartMessage.type === 'duel:start') {
      handleWebSocketMessage(duelStartMessage);
    }
  }, [duelStartMessage]);

  const handleWebSocketMessage = (message: any) => {
    const { type, payload } = message;
    // console.log('🎯 DuelArena handling message:', type, payload);

    switch (type) {
      case 'duel:start':
        console.log('🎯 Duel started with payload:', payload);
        console.log('🎯 Setting playerIndex to:', payload.playerIndex || 0);
        setDuelState(prev => ({
          ...prev,
          roomCode: payload.roomCode,
          subject: payload.subject || 'Mixed Questions',
          round: 0,
          scores: [0, 0],
          playerIndex: payload.playerIndex || 0, // Store which player we are (0 or 1)
          isFinished: false,
          generatingQuestion: true // Show loading while waiting for first question
        }));
        break;

      case 'duel:question':
        handleNewQuestion(payload);
        break;

      case 'duel:result':
        console.log('🎯 Received duel:result message with payload:', payload);
        console.log('🎯 Payload scores field:', payload.scores);
        console.log('🎯 Payload scores type:', typeof payload.scores);
        console.log('🎯 Payload scores is array:', Array.isArray(payload.scores));
        handleQuestionResult(payload);
        break;

      case 'duel:end':
        console.log('🎯 Received duel:end message with payload:', payload);
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
        // console.log('Received question data:', questionData);
    
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
    console.log('🎯 handleQuestionResult called with:', resultData);
    const isCorrect = duelState.selectedAnswer === resultData.correctIndex;
    const opponentCorrect = resultData.opponentAnswer === resultData.correctIndex;
    
    // Track streak for achievements
    if (isCorrect) {
      incrementStreak();
    } else {
      resetStreak();
    }
    
    // Use progress data from server if available, otherwise use defaults
    const progressData = resultData.progressResult || {};
    const xpGained = progressData.xpGained || (isCorrect ? 12 : 3);
    const masteryChange = progressData.masteryDelta || (isCorrect ? 0.5 : -0.25);
    
    // Extract subject and subtopic from server response or question
    const subject = progressData.subject || resultData.subject || duelState.subject || 'Law';
    const subtopic = progressData.subtopic || resultData.subtopic || 'General';
    
    // Calculate HP damage (20 damage per wrong answer)
    const userHPChange = isCorrect ? 0 : -20;
    const opponentHPChange = opponentCorrect ? 0 : -20;
    
    setDuelState(prev => {
      const newScores = resultData.scores || [0, 0];
      console.log('🎯 Updating scores from', prev.scores, 'to', newScores);
      console.log('🎯 PlayerIndex:', prev.playerIndex, 'Human score:', newScores[prev.playerIndex || 0]);
      return {
        ...prev,
        showResult: true,
        lastResult: resultData,
        scores: newScores,
        waitingForOpponent: false,
        showFeedbackChip: true,
        userHP: Math.max(0, prev.userHP + userHPChange),
        opponentHP: Math.max(0, prev.opponentHP + opponentHPChange),
        feedbackData: {
          correct: isCorrect,
          xpGained,
          subject,
          subtopic,
          masteryChange
        }
      };
    });

    announceForScreenReader(
      isCorrect 
        ? `Correct! You gained ${xpGained} XP. ${subject}/${subtopic} mastery ${masteryChange > 0 ? 'increased' : 'decreased'} by ${Math.abs(masteryChange)}%. Current score: ${resultData.scores[0]} to ${resultData.scores[1]}.`
        : `Incorrect. The correct answer was ${String.fromCharCode(65 + resultData.correctIndex)}. Current score: ${resultData.scores[0]} to ${resultData.scores[1]}.`
    );
    
    // Hide feedback chip after delay
    setTimeout(() => {
      setDuelState(prev => ({ ...prev, showFeedbackChip: false }));
    }, 3500); // Match the chip display duration
    
    // Show transition state before next question
    setTimeout(() => {
      setDuelState(prev => ({
        ...prev,
        showResult: false,
        showTransition: true,
        currentQuestion: undefined,
        selectedAnswer: undefined
      }));
      
      // Clear transition after a brief moment
      setTimeout(() => {
        setDuelState(prev => ({ ...prev, showTransition: false }));
      }, 1500);
    }, 3000); // Wait 3 seconds before transitioning
  };

  const handleDuelFinished = async (finishedData: any) => {
    console.log('Duel finished with data:', finishedData);
    
    setDuelState(prev => ({
      ...prev,
      isFinished: true,
      finalResult: finishedData,
      scores: finishedData.scores || prev.scores // Update final scores
    }));

    // Determine if player won (0 = player1 won, 1 = player2 won, -1 = tie)
    const playerIndex = 0; // Player is always index 0 in arena view
    const won = finishedData.winner === 0; // Player is always index 0
    const tied = finishedData.winner === -1;
    
    // Get XP changes from the backend data structure
    const xpChange = finishedData.yourXPChange || 0;
    const newXP = finishedData.yourNewXP || user.points;
    
    // Update local user data to reflect new XP
    if (user) {
      const updatedUser = {
        ...user,
        points: newXP
      };
      localStorage.setItem("user", JSON.stringify(updatedUser));
    }
    
    // Announce result with XP changes
    if (tied) {
      announceForScreenReader(
        `Duel complete! It's a tie! You gained ${xpChange} XP. Your total XP is now ${newXP}.`
      );
    } else if (won) {
      announceForScreenReader(
        `Duel complete! You won and gained ${xpChange} XP! Your total XP is now ${newXP}.`
      );
    } else {
      announceForScreenReader(
        `Duel complete! You lost ${Math.abs(xpChange)} XP. Your total XP is now ${newXP}. Keep fighting to earn it back!`
      );
    }
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
                  roomCode: prev.roomCode,
                  choice: -1,
                  timeMs: 60000
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

    // Trigger battle animation
    setDuelState(prev => ({
      ...prev,
      selectedAnswer: answerIndex,
      waitingForOpponent: true,
      showAnswerAnimation: true
    }));

    // Reset animation after effect
    setTimeout(() => {
      setDuelState(prev => ({ ...prev, showAnswerAnimation: false }));
    }, 600);

    // Send answer to server
    // console.log('🔍 WebSocket state:', wsRef.current?.readyState, 'WebSocket object:', wsRef.current);
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      const answerMessage = {
        type: 'duel:answer',
        payload: {
          roomCode: duelState.roomCode,
          choice: answerIndex,
          timeMs: Math.min(responseTimeMs, 60000) // Cap at 60 seconds
        }
      };
      // console.log('🎯 Sending duel:answer message:', answerMessage);
      // console.log('🎯 WebSocket URL:', wsRef.current.url);
      // console.log('🎯 Current duelState.roomCode:', duelState.roomCode);
      wsRef.current.send(JSON.stringify(answerMessage));
    } else {
      // console.log('❌ WebSocket not ready, cannot send answer. State:', wsRef.current?.readyState);
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

  const timerProgress = duelState.timeLeft > 0 ? (duelState.timeLeft / 60) * 283 : 283;

  if (!isVisible) return null;

  return (
    <Card className="panel relative overflow-hidden min-h-screen max-w-4xl mx-auto" data-testid="duel-arena">
      {/* Pokemon-style Avatar Displays in Corners */}
      {/* Opponent Avatar - Top Left */}
      <div className={`absolute top-4 left-4 z-20 transition-transform ${duelState.showAnswerAnimation && duelState.selectedAnswer === duelState.lastResult?.correctIndex ? 'animate-pulse' : ''}`}>
        <div className="bg-panel-2 border-2 border-danger/60 rounded-xl p-3 shadow-lg min-w-[220px]">
          <div className="flex items-center space-x-3">
            <AvatarRenderer
              avatarData={opponent.avatarData as any}
              level={opponent.level}
              size={48}
            />
            <div className="flex-1">
              <h3 className="font-semibold text-sm text-white">{opponent.displayName}</h3>
              <p className="text-xs text-danger">Lv.{opponent.level} • HP: {duelState.opponentHP}/100</p>
              <div className="mt-1 bg-black/60 rounded-full h-2.5 w-24 border border-white/20">
                <div 
                  className={`h-full rounded-full transition-all duration-500 ${
                    duelState.opponentHP <= 30 
                      ? 'bg-gradient-to-r from-red-600 to-red-500' 
                      : duelState.opponentHP <= 50 
                      ? 'bg-gradient-to-r from-yellow-500 to-yellow-400'
                      : 'bg-gradient-to-r from-green-500 to-green-400'
                  }`}
                  style={{ width: `${duelState.opponentHP}%` }}
                ></div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* User Avatar - Top Right */}
      <div className={`absolute top-4 right-4 z-20 transition-transform ${duelState.showAnswerAnimation && duelState.selectedAnswer !== duelState.lastResult?.correctIndex ? 'animate-pulse' : ''}`}>
        <div className="bg-panel-2 border-2 border-arcane/60 rounded-xl p-3 shadow-lg min-w-[220px]">
          <div className="flex items-center space-x-3">
            <div className="flex-1 text-right">
              <h3 className="font-semibold text-sm text-white">{user.displayName}</h3>
              <p className="text-xs text-arcane">Lv.{user.level} • HP: {duelState.userHP}/100</p>
              <div className="mt-1 bg-black/60 rounded-full h-2.5 w-24 border border-white/20 ml-auto">
                <div 
                  className={`h-full rounded-full transition-all duration-500 ${
                    duelState.userHP <= 30 
                      ? 'bg-gradient-to-r from-red-600 to-red-500' 
                      : duelState.userHP <= 50 
                      ? 'bg-gradient-to-r from-yellow-500 to-yellow-400'
                      : 'bg-gradient-to-r from-blue-500 to-blue-400'
                  }`}
                  style={{ width: `${duelState.userHP}%` }}
                ></div>
              </div>
            </div>
            <AvatarRenderer
              avatarData={user.avatarData as any}
              level={user.level}
              size={48}
            />
          </div>
        </div>
      </div>
      
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
      
      <CardContent className="p-4 sm:p-6 pt-32 pb-20">
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
              <div className="w-8 h-8 bg-arcane rounded-full flex items-center justify-center font-bold" data-testid="score-user" key={`user-score-${duelState.scores[0]}-${duelState.scores[1]}`}>
                {duelState.playerIndex === 1 ? duelState.scores[1] : duelState.scores[0]}
                {/* Debug: playerIndex={duelState.playerIndex}, scores={JSON.stringify(duelState.scores)} */}
              </div>
              <p className="text-xs text-muted mt-1">You</p>
            </div>
            <div className="text-2xl font-cinzel font-bold text-muted">VS</div>
            <div className="text-center">
              <div className="w-8 h-8 bg-danger rounded-full flex items-center justify-center font-bold" data-testid="score-opponent" key={`opp-score-${duelState.scores[0]}-${duelState.scores[1]}`}>
                {duelState.playerIndex === 1 ? duelState.scores[0] : duelState.scores[1]}
              </div>
              <p className="text-xs text-muted mt-1">Opponent</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            <div className="text-right">
              <div className="flex items-center gap-2 mb-1">
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
        {!duelState.isFinished && (
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
        )}
        
        {/* Training Banner */}
        {duelState.showTrainingBanner && (
          <div className="bg-mystic-gold/10 border border-mystic-gold/30 rounded-lg p-3 mb-4">
            <p className="text-sm text-mystic-gold text-center">
              Using training questions while Atticus refills the vault.
            </p>
          </div>
        )}
        
        {/* Loading State - Generating Question or Transitioning */}
        {(duelState.generatingQuestion || duelState.showTransition) && !duelState.currentQuestion && (
          <div className="flex flex-col items-center justify-center py-16 mb-8">
            <div className="relative mb-6">
              <div className="w-16 h-16 border-4 border-arcane/20 border-t-arcane rounded-full animate-spin"></div>
              <div className="absolute inset-0 flex items-center justify-center">
                <i className="fas fa-magic text-arcane text-xl"></i>
              </div>
            </div>
            <div className="text-center space-y-2">
              <h3 className="text-xl font-semibold text-arcane">
                {duelState.showTransition ? `Moving to Round ${Math.min(duelState.round + 1, MATCH_QUESTIONS)}` : 'Generating Question'}
              </h3>
              <p className="text-muted text-sm">
                {duelState.showTransition 
                  ? 'Preparing next question...' 
                  : 'Atticus is crafting a question...'}
              </p>
            </div>
          </div>
        )}

        {/* Question */}
        {duelState.currentQuestion && !duelState.generatingQuestion && (
          <div className="question-reveal mb-8">
            <div className="bg-panel-2 border border-white/10 rounded-xl p-4 sm:p-6">
              <div className="flex flex-col sm:flex-row items-start justify-between mb-4 gap-2">
                <h4 className="font-semibold text-base sm:text-lg" data-testid="question-header">
                  {(duelState.currentQuestion as any)?.subject || duelState.subject} • Round {duelState.round}/{MATCH_QUESTIONS}
                </h4>
                <div className="flex items-center space-x-2 flex-shrink-0">
                  <button 
                    className="text-muted hover:text-mystic-gold transition-colors disabled:opacity-50"
                    onClick={handleHintRequest}
                    disabled={duelState.hintsUsed >= 3 || duelState.selectedAnswer !== undefined}
                    title={`Ask Atticus for a hint (${3 - duelState.hintsUsed} remaining)`}
                    data-testid="button-hint"
                  >
                    <AtticusCat size="xs" className="inline-block" />
                  </button>
                  <span className="text-xs text-muted whitespace-nowrap">Hints: {duelState.hintsUsed}/3</span>
                </div>
              </div>
               <p className="text-sm sm:text-base text-ink leading-relaxed mb-6 break-words" data-testid="question-stem">
                 {duelState.currentQuestion.stem}
               </p>
            </div>
          </div>
        )}
        
        {/* Answer Choices */}
        {duelState.currentQuestion && !duelState.showResult && !duelState.generatingQuestion && (
          <div className="grid grid-cols-1 gap-3 mb-6">
            {duelState.currentQuestion.choices.map((choice, index) => (
              <button
                key={index}
                onClick={() => handleAnswerSelect(index)}
                disabled={duelState.selectedAnswer !== undefined}
                className={`w-full text-left p-4 rounded-xl border border-white/10 hover:border-arcane hover:bg-arcane/5 transition-all min-h-[60px] bg-transparent flex items-start ${
                  duelState.selectedAnswer === index ? 'border-arcane bg-arcane/10' : ''
                } ${duelState.selectedAnswer !== undefined ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                data-testid={`answer-choice-${index}`}
              >
                <span className="w-8 h-8 bg-arcane/20 text-arcane rounded-lg font-bold flex items-center justify-center text-sm flex-shrink-0">
                  {String.fromCharCode(65 + index)}
                </span>
                 <span className="ml-4 text-sm leading-relaxed flex-1 break-words">
                   {choice}
                 </span>
              </button>
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
              {(duelState.finalResult as any)?.winner === 0 ? "VICTORY!" : 
               (duelState.finalResult as any)?.winner === 1 ? "DEFEAT" : "DRAW"}
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-arcane/10 rounded-lg">
                <h4 className="font-bold text-arcane">Final Score</h4>
                <p className="text-2xl font-cinzel" key={`final-score-${duelState.scores[0]}-${duelState.scores[1]}`}>
                  {duelState.scores ? 
                    `${duelState.scores[0]} - ${duelState.scores[1]}` : 
                    "0 - 0"}
                </p>
              </div>
              
              <div className={`p-4 rounded-lg ${
                ((duelState.finalResult as any)?.yourXPChange || 0) >= 0 
                  ? "bg-success/10" : "bg-danger/10"
              }`} key={`xp-display-${(duelState.finalResult as any)?.yourXPChange}`}>
                <h4 className={`font-bold ${
                  ((duelState.finalResult as any)?.yourXPChange || 0) >= 0 
                    ? "text-success" : "text-danger"
                }`}>
                  XP {((duelState.finalResult as any)?.yourXPChange || 0) >= 0 ? "Gained" : "Lost"}
                </h4>
                <p className={`text-xl ${
                  ((duelState.finalResult as any)?.yourXPChange || 0) >= 0 
                    ? "text-success" : "text-danger"
                }`}>
                  {((duelState.finalResult as any)?.yourXPChange || 0) >= 0 ? "+" : ""}
                  {(duelState.finalResult as any)?.yourXPChange || 0}
                </p>
              </div>
            </div>
            
            <div className="p-4 bg-muted/50 rounded-lg text-sm space-y-2">
              <h4 className="font-bold">Match Summary:</h4>
              
              {/* Show correct answers and XP breakdown */}
              <div className="flex justify-between">
                <span>Correct Answers:</span>
                <span className="text-arcane">
                  {duelState.scores ? duelState.scores[0] : 0}/{MATCH_QUESTIONS}
                </span>
              </div>
              
              <div className="border-t pt-2 flex justify-between font-bold">
                <span>Total XP Change:</span>
                <span className={
                  ((duelState.finalResult as any)?.yourXPChange || 0) >= 0 
                    ? "text-success" : "text-danger"
                }>
                  {((duelState.finalResult as any)?.yourXPChange || 0) >= 0 ? "+" : ""}
                  {(duelState.finalResult as any)?.yourXPChange || 0} XP
                </span>
              </div>
              
              <div className="flex justify-between text-xs">
                <span>New Total XP:</span>
                <span className="text-arcane font-bold">
                  {(duelState.finalResult as any)?.yourNewXP || user.xp}
                </span>
              </div>
              
              <p className="text-xs text-muted mt-2">
                {(duelState.finalResult as any)?.winner === 0 
                  ? "Great job! Keep winning to earn more XP!" 
                  : (duelState.finalResult as any)?.winner === 1
                  ? "Don't give up! Practice makes perfect."
                  : "A tie! Both players fought well."}
              </p>
            </div>
            
            {/* Add Elo and Mastery Summary */}
            <MatchSummaryChips
              totalXP={Math.abs(duelState.finalResult.xpGained?.player1 || 0)}
              masteryChanges={[]} // Will be populated when integrated with subtopic tracking
              eloChange={duelState.finalResult.xpGained?.player1 || 0}
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
