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
  onDuelFinished?: () => void; // Callback when duel finishes automatically
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

export function DuelArena({ user, opponent, isVisible, websocket, duelStartMessage, onDuelEnd, onDuelFinished }: DuelArenaProps) {
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
  const questionReceivedTimeRef = useRef<number>(0); // Track when question was received
  const lastQuestionRoundRef = useRef<number>(0); // Track the round of the last question received
  const currentRoundRef = useRef<number>(0); // Track current round (always up-to-date)
  const pendingResultsRef = useRef<Map<number, any>>(new Map()); // Queue for results that arrive before questions
  const submittedAnswersRef = useRef<Map<number, number>>(new Map()); // Store submitted answers by round
  const resultTransitionTimeoutRef = useRef<NodeJS.Timeout>(); // Store timeout for result transition
  const transitionClearTimeoutRef = useRef<NodeJS.Timeout>(); // Store timeout for clearing transition

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
          const receiveTime = Date.now();
          const messageSize = event.data?.length || 0;
          console.log(`📨 [${receiveTime}] DuelArena received message:`, message.type, message.payload?.round ? `round ${message.payload.round}` : '', `(${messageSize} bytes)`);
          console.log('🔌 WebSocket readyState when message received:', websocket.readyState);
          console.log('🔗 WebSocket URL:', websocket.url);
          
          // Log message details for result messages
          if (message.type === 'duel:result') {
            console.log(`📬 Result message details:`, {
              round: message.payload?.round,
              qid: message.payload?.qid,
              scores: message.payload?.scores,
              messageSize,
              timestamp: receiveTime
            });
          }
          
          // Handle all messages, including duel:start
          handleWebSocketMessage(message);
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error, event.data);
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
  
  // Monitor for missing results - if we receive a question but no result after timeout
  useEffect(() => {
    if (!duelState.currentQuestion || duelState.isFinished) return;
    
    const questionRound = duelState.currentQuestion.round;
    const questionTime = questionReceivedTimeRef.current;
    const questionQid = duelState.currentQuestion.qid;
    const roomCode = duelState.roomCode;
    
    // Set up multiple timeouts for progressive checking
    // First check at 10 seconds (for very fast answers)
    const quickCheck = setTimeout(() => {
      setDuelState(prev => {
        if (prev.currentQuestion?.round === questionRound && !prev.showResult && !prev.isFinished && prev.waitingForOpponent) {
          console.log(`⏱️ Quick check: Round ${questionRound} - answer submitted, waiting for result...`);
        }
        return prev;
      });
    }, 10000);
    
    // Second check at 30 seconds (should have result by now if answer was submitted)
    const mediumCheck = setTimeout(() => {
      setDuelState(prev => {
        if (prev.currentQuestion?.round === questionRound && !prev.showResult && !prev.isFinished && prev.waitingForOpponent) {
          console.warn(`⚠️ Medium check: Round ${questionRound} - still waiting for result after 30s, answer was submitted`);
        }
        return prev;
      });
    }, 30000);
    
    // Final check at 65 seconds - request result if missing
    const resultTimeout = setTimeout(() => {
      // Check if we still have this question and no result has been shown
      setDuelState(prev => {
        if (prev.currentQuestion?.round === questionRound && !prev.showResult && !prev.isFinished) {
          console.error(`⚠️ TIMEOUT: No result received for round ${questionRound} (qid: ${questionQid}) after 65 seconds!`);
          console.error('This suggests the WebSocket message was lost or connection dropped.');
          console.error('Current WebSocket state:', wsRef.current?.readyState);
          console.error('Question received at:', questionTime, 'Current time:', Date.now());
          console.error('Connection ID:', (wsRef.current as any)?.connectionId);
          console.error('WebSocket URL:', wsRef.current?.url);
          console.error('Room code:', roomCode);
          
          // Request the missing result from the backend
          if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
            try {
              console.log(`📤 Requesting missing result for round ${questionRound} from backend...`);
              const requestMessage = {
                type: 'duel:requestResult',
                payload: {
                  roomCode: roomCode || prev.roomCode,
                  round: questionRound,
                  qid: questionQid
                }
              };
              console.log('📤 Request message:', requestMessage);
              wsRef.current.send(JSON.stringify(requestMessage));
              console.log('✅ Result request sent to backend');
            } catch (err) {
              console.error('❌ Failed to request result:', err);
            }
          } else {
            console.error('❌ WebSocket not open, cannot request result. State:', wsRef.current?.readyState);
          }
          
          return prev;
        }
        return prev;
      });
    }, 65000); // 60s question time + 5s buffer
    
    return () => {
      clearTimeout(quickCheck);
      clearTimeout(mediumCheck);
      clearTimeout(resultTimeout);
    };
  }, [duelState.currentQuestion?.round, duelState.showResult, duelState.isFinished, duelState.roomCode, duelState.waitingForOpponent]);

  // Handle duelStartMessage when it's passed from Home component
  useEffect(() => {
    if (duelStartMessage && duelStartMessage.type === 'duel:start') {
      handleWebSocketMessage(duelStartMessage);
    }
  }, [duelStartMessage]);

  const handleWebSocketMessage = (message: any) => {
    const { type, payload } = message;
    const processTime = Date.now();
    console.log(`🔄 [${processTime}] DuelArena handling message:`, type, payload?.round ? `round ${payload.round}` : '', payload?.qid ? `qid: ${payload.qid?.substring(0, 20)}...` : '');

    switch (type) {
      case 'duel:start':
        console.log('🎯 Duel started with payload:', payload);
        console.log('🎯 Setting playerIndex to:', payload.playerIndex || 0);
        setDuelState(prev => {
          currentRoundRef.current = 0; // Reset round ref
          return {
          ...prev,
          roomCode: payload.roomCode,
          subject: payload.subject || 'Mixed Questions',
          round: 0,
          scores: [0, 0],
          playerIndex: payload.playerIndex || 0, // Store which player we are (0 or 1)
          isFinished: false,
          generatingQuestion: true // Show loading while waiting for first question
          };
        });
        break;

      case 'duel:question':
        handleNewQuestion(payload);
        break;

      case 'duel:result':
        console.log('🎯 Received duel:result message with payload:', payload);
        console.log('🎯 Payload scores field:', payload.scores);
        console.log('🎯 Payload scores type:', typeof payload.scores);
        console.log('🎯 Payload scores is array:', Array.isArray(payload.scores));
        // Use functional update to get current state (not stale closure)
        setDuelState(prev => {
          console.log('🎯 Current state - round:', prev.round, 'currentQuestion round:', prev.currentQuestion?.round, 'result round:', payload.round);
          console.log('🎯 Round refs - lastQuestionRound:', lastQuestionRoundRef.current, 'currentRound:', currentRoundRef.current);
          
          // CRITICAL: Check multiple conditions to handle race conditions:
          // 1. Check state (might be stale due to React batching)
          // 2. Check refs (always up-to-date)
          // 3. Allow result if it's for the same round as last question OR current round
          const questionRound = prev.currentQuestion?.round;
          const lastQuestionRound = lastQuestionRoundRef.current;
          const currentRound = currentRoundRef.current;
          
          // If result is for a future round (ahead of what we've seen), queue it
          if (payload.round > Math.max(questionRound || 0, lastQuestionRound, currentRound)) {
            console.log(`⏳ Result for round ${payload.round} is ahead of current state (question: ${questionRound}, lastQ: ${lastQuestionRound}, current: ${currentRound}) - queuing it`);
            pendingResultsRef.current.set(payload.round, payload);
            // Set a timeout to process it if question doesn't arrive (safety net)
            setTimeout(() => {
              if (pendingResultsRef.current.has(payload.round)) {
                console.log(`⚠️ Processing queued result for round ${payload.round} after timeout`);
                pendingResultsRef.current.delete(payload.round);
        handleQuestionResult(payload);
              }
            }, 10000); // 10 second safety timeout (longer to account for network delays)
            return prev;
          }
          
          // If result is for a past round, ignore it (stale)
          if (payload.round < Math.max(questionRound || 0, lastQuestionRound, currentRound)) {
            console.log(`⚠️ Ignoring stale result for round ${payload.round} (current: ${Math.max(questionRound || 0, lastQuestionRound, currentRound)})`);
            return prev;
          }
          
          // Result is for current/expected round - process it
          // Use refs to verify (they're always current, unlike state which might be batched)
          if (payload.round === lastQuestionRound || payload.round === currentRound || payload.round === questionRound) {
            console.log(`✅ Result for round ${payload.round} matches expected round - processing immediately`);
            setTimeout(() => handleQuestionResult(payload), 0);
            return prev; // Don't update here, handleQuestionResult will
          }
          
          // Fallback: if we're not sure, queue it but with a shorter timeout
          console.log(`⏳ Result for round ${payload.round} - uncertain state, queuing with short timeout`);
          pendingResultsRef.current.set(payload.round, payload);
          setTimeout(() => {
            if (pendingResultsRef.current.has(payload.round)) {
              console.log(`⚠️ Processing uncertain result for round ${payload.round} after short timeout`);
              pendingResultsRef.current.delete(payload.round);
              handleQuestionResult(payload);
            }
          }, 2000); // 2 second timeout for uncertain cases
          return prev;
        });
        break;

      case 'duel:end':
        console.log('🎯 Received duel:end message with payload:', payload);
        handleDuelFinished(payload);
        break;

      case 'duel:botAnswer':
        // Handle bot answer for visual feedback
        break;

      case 'leaderboard:update':
        // Ignore leaderboard updates in duel view (but log for debugging)
        console.log(`📊 Leaderboard update received during duel (ignored)`);
        break;
      
      case 'duel:error':
        // Handle error messages from backend
        console.error('❌ Duel error received from backend:', payload);
        if (payload?.error === 'Result not available') {
          console.error('⚠️ Backend does not have the requested result - this is a critical issue');
        }
        break;

      default:
        console.log(`⚠️ Unknown message type: ${type}`, message);
    }
  };

  const handleNewQuestion = (questionData: QuestionData) => {
    const receiveTime = Date.now();
    console.log('📥 Received question data:', {
      round: questionData.round,
      qid: questionData.qid,
      subject: (questionData as any).subject,
      stemLength: questionData.stem?.length || 0,
      choicesCount: questionData.choices?.length || 0,
      timestamp: receiveTime
    });
    
    // Track when question was received to prevent premature result display
    questionReceivedTimeRef.current = receiveTime;
    lastQuestionRoundRef.current = questionData.round;
    currentRoundRef.current = questionData.round; // Update current round ref
    console.log(`⏰ Question round ${questionData.round} timestamp set: ${receiveTime}`);
    
    // Get time limit in seconds (handle both timeLimitSec and timeLimit fields)
    const timeLimitSeconds = (questionData as any).timeLimitSec || Math.floor((questionData.timeLimit || 60000) / 1000);
    
    // Clear any stale state and force fresh question display
    // CRITICAL: Always set showResult to false when new question arrives
    setDuelState(prev => {
      console.log(`🔄 Setting question state for round ${questionData.round}, clearing showResult`);
      
      // CRITICAL: Cancel any pending transition timeouts from previous results
      // This prevents old timeouts from clearing the new question
      if (resultTransitionTimeoutRef.current) {
        clearTimeout(resultTransitionTimeoutRef.current);
        resultTransitionTimeoutRef.current = undefined;
      }
      if (transitionClearTimeoutRef.current) {
        clearTimeout(transitionClearTimeoutRef.current);
        transitionClearTimeoutRef.current = undefined;
      }
      
      // CRITICAL: If we're moving to a new round but were waiting for a result on the previous round,
      // check if we need to request that missing result
      const previousRound = prev.currentQuestion?.round;
      if (previousRound && previousRound < questionData.round && prev.waitingForOpponent && !prev.showResult) {
        console.warn(`⚠️ Moving to round ${questionData.round} but never received result for round ${previousRound} - requesting it now`);
        const previousQid = prev.currentQuestion?.qid;
        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN && prev.roomCode) {
          try {
            wsRef.current.send(JSON.stringify({
              type: 'duel:requestResult',
              payload: {
                roomCode: prev.roomCode,
                round: previousRound,
                qid: previousQid
              }
            }));
            console.log(`📤 Requested missing result for round ${previousRound} when moving to next round`);
          } catch (err) {
            console.error('❌ Failed to request missing result:', err);
          }
        }
      }
      
      // Check if we have a pending result for this round
      const pendingResult = pendingResultsRef.current.get(questionData.round);
      if (pendingResult) {
        console.log(`📬 Found pending result for round ${questionData.round}, will process after state update`);
        pendingResultsRef.current.delete(questionData.round);
        // Process the pending result after state is set
        setTimeout(() => {
          console.log(`🔄 Processing pending result for round ${questionData.round}`);
          handleQuestionResult(pendingResult);
        }, 100); // Small delay to ensure state is updated
      }
      
      return {
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
        showResult: false, // CRITICAL: Always clear result when new question arrives
        showTransition: false, // Clear transition state when question arrives
      waitingForOpponent: false,
      showHint: false,
      showTrainingBanner: false,
      generatingQuestion: false, // Clear loading state when question arrives
      questionStartTime: Date.now() // Track when question started for accurate timing
      };
    });

    // Use deadlineTs if available, otherwise calculate based on time limit
    const deadline = questionData.deadlineTs || (Date.now() + timeLimitSeconds * 1000);
    startTimer(deadline);
    announceForScreenReader(`Round ${questionData.round}. New question presented.`);
  };

  const handleQuestionResult = (resultData: any) => {
    const resultTime = Date.now();
    const resultRound = resultData.round;
    const timeSinceQuestion = resultTime - questionReceivedTimeRef.current;
    const MIN_QUESTION_DISPLAY_TIME = 2000; // 2 second minimum display time
    
    // Use refs for delay check (they're always up-to-date, unlike state)
    // Also check state using functional update to see current values
    setDuelState(prev => {
      console.log('🎯 handleQuestionResult called:', {
        round: resultRound,
        qid: resultData.qid,
        timestamp: resultTime,
        timeSinceQuestion,
        lastQuestionRound: lastQuestionRoundRef.current,
        questionTimestamp: questionReceivedTimeRef.current,
        currentStateRound: prev.round,
        currentQuestionRound: prev.currentQuestion?.round
      });
      
      // Always ensure question is visible first - delay result if needed
      // Use refs for round check (always current) and state for question existence
      const shouldDelayResult = timeSinceQuestion < MIN_QUESTION_DISPLAY_TIME && 
                               lastQuestionRoundRef.current === resultRound &&
                               questionReceivedTimeRef.current > 0 &&
                               prev.currentQuestion?.round === resultRound;
      
      if (shouldDelayResult) {
        const delayTime = MIN_QUESTION_DISPLAY_TIME - timeSinceQuestion;
        console.log(`⏳ DELAYING result for round ${resultRound}: arrived ${timeSinceQuestion}ms after question - will show in ${delayTime}ms`);
        // Delay showing result to ensure question is displayed first
        setTimeout(() => {
          console.log(`✅ Processing delayed result for round ${resultRound}`);
          processQuestionResult(resultData);
        }, delayTime);
        return prev; // Don't update state yet
      }
      
      console.log(`✅ Processing result immediately for round ${resultRound} (${timeSinceQuestion}ms after question)`);
      // Process immediately - will update state in processQuestionResult
      setTimeout(() => processQuestionResult(resultData), 0);
      return prev; // Don't update here, processQuestionResult will
    });
  };
  
  const processQuestionResult = (resultData: any) => {
    // Use ref for round check (always up-to-date)
    const currentRound = currentRoundRef.current;
    console.log(`🔄 processQuestionResult called for round ${resultData.round}, current round (ref): ${currentRound}`);
    
    // Check if this result is for a round that's already passed (stale result)
    if (resultData.round < currentRound) {
      console.log(`⚠️ Ignoring stale result for round ${resultData.round} (current round: ${currentRound})`);
      return;
    }
    
    // Get selected answer - try multiple sources
    // 1. First try the ref (always accurate, even if state was cleared)
    let currentSelectedAnswer: number | undefined = submittedAnswersRef.current.get(resultData.round);
    
    // 2. If not in ref, try state
    if (currentSelectedAnswer === undefined) {
      setDuelState(prev => {
        currentSelectedAnswer = prev.selectedAnswer;
        return prev; // Don't update yet
      });
    }
    
    // 3. If still undefined, try to get it from the result data itself
    if (currentSelectedAnswer === undefined && resultData.results) {
      const playerResult = resultData.results.find((r: any) => r.playerId === 0);
      if (playerResult && playerResult.choice !== undefined && playerResult.choice !== -1) {
        currentSelectedAnswer = playerResult.choice;
        console.log(`🔍 Recovered selectedAnswer from result data: ${currentSelectedAnswer}`);
      }
    }
    
    // Clean up the ref entry after using it
    if (currentSelectedAnswer !== undefined) {
      submittedAnswersRef.current.delete(resultData.round);
    }
    
    const isCorrect = currentSelectedAnswer === resultData.correctIndex;
    
    console.log(`✅ Processing result for round ${resultData.round}: isCorrect=${isCorrect}, selectedAnswer=${currentSelectedAnswer}, correctIndex=${resultData.correctIndex}`);
    
    // Track streak for achievements (outside of state update to avoid React warning)
    // Use setTimeout to defer to avoid render-phase updates
    setTimeout(() => {
    if (isCorrect) {
      incrementStreak();
    } else {
      resetStreak();
    }
    }, 0);
    
    // Now update state with result
    setDuelState(prev => {
      // Check opponent's answer from results array
      const opponentResult = resultData.results?.find((r: any) => r.playerId === 1) || resultData.results?.[1];
      const opponentCorrect = opponentResult?.correct || (opponentResult?.choice === resultData.correctIndex);
    
    // Use progress data from server if available, otherwise use defaults
    const progressData = resultData.progressResult || {};
    const xpGained = progressData.xpGained || (isCorrect ? 12 : 3);
    const masteryChange = progressData.masteryDelta || (isCorrect ? 0.5 : -0.25);
    
    // Extract subject and subtopic from server response or question
      const subject = progressData.subject || resultData.subject || prev.subject || 'Law';
    const subtopic = progressData.subtopic || resultData.subtopic || 'General';
    
    // Calculate HP damage (20 damage per wrong answer)
    const userHPChange = isCorrect ? 0 : -20;
    const opponentHPChange = opponentCorrect ? 0 : -20;
    
      const newScores = resultData.scores || [0, 0];
      console.log('🎯 Updating scores from', prev.scores, 'to', newScores);
      console.log('🎯 PlayerIndex:', prev.playerIndex, 'Human score:', newScores[prev.playerIndex || 0]);
      
      // Announce result for screen reader
      setTimeout(() => {
    announceForScreenReader(
      isCorrect 
            ? `Correct! You gained ${xpGained} XP. ${subject}/${subtopic} mastery ${masteryChange > 0 ? 'increased' : 'decreased'} by ${Math.abs(masteryChange)}%. Current score: ${newScores[0]} to ${newScores[1]}.`
            : `Incorrect. The correct answer was ${String.fromCharCode(65 + resultData.correctIndex)}. Current score: ${newScores[0]} to ${newScores[1]}.`
    );
      }, 0);
    
    // Hide feedback chip after delay
    setTimeout(() => {
        setDuelState(prevState => ({ ...prevState, showFeedbackChip: false }));
    }, 3500); // Match the chip display duration
    
    // Show transition state before next question
    // CRITICAL: Store the round number to prevent clearing if a new question has arrived
    const resultRound = resultData.round;
    
    // Clear any existing transition timeouts from previous results
    if (resultTransitionTimeoutRef.current) {
      clearTimeout(resultTransitionTimeoutRef.current);
    }
    if (transitionClearTimeoutRef.current) {
      clearTimeout(transitionClearTimeoutRef.current);
    }
    
    resultTransitionTimeoutRef.current = setTimeout(() => {
        setDuelState(prevState => {
          // Only clear if we're still showing the result for the same round
          // If a new question has arrived (round has advanced), don't clear it!
          if (prevState.round === resultRound && prevState.showResult && !prevState.currentQuestion) {
            return {
              ...prevState,
              showResult: false,
              showTransition: true,
              currentQuestion: undefined,
              selectedAnswer: undefined
            };
          }
          // New question already arrived, just clear transition flag if needed
          return prevState;
        });
      
      // Clear transition after a brief moment
      transitionClearTimeoutRef.current = setTimeout(() => {
          setDuelState(prevState => {
            // Only clear transition if we're still in transition for this round
            if (prevState.showTransition && prevState.round === resultRound && !prevState.currentQuestion) {
              return { ...prevState, showTransition: false };
            }
            return prevState;
          });
      }, 1500);
    }, 3000); // Wait 3 seconds before transitioning
      
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
        },
        // CRITICAL: Always keep currentQuestion visible when showing result for the same round
        // This ensures the question text stays visible even when result screen appears
        currentQuestion: (prev.currentQuestion?.round === resultData.round) 
          ? prev.currentQuestion 
          : prev.currentQuestion, // Keep question even if round doesn't match (defensive)
        // Ensure round is updated to match the result
        round: Math.max(prev.round, resultData.round)
      };
    });
    
    // Update round ref after state update
    setDuelState(prev => {
      currentRoundRef.current = prev.round;
      return prev;
    });
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
    
    // Notify parent to refresh user data
    if (onDuelFinished) {
      onDuelFinished();
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
        // Auto-submit if no answer selected or selected but not submitted
        setDuelState(prev => {
          if (!prev.waitingForOpponent) {
            // Auto-submit (either no answer or selected but not submitted)
            const choiceToSubmit = prev.selectedAnswer !== undefined ? prev.selectedAnswer : -1;
            if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
              wsRef.current.send(JSON.stringify({
                type: 'duel:answer',
                payload: {
                  roomCode: prev.roomCode,
                  choice: choiceToSubmit,
                  timeMs: 60000
                }
              }));
            }
            return { 
              ...prev, 
              selectedAnswer: choiceToSubmit, 
              waitingForOpponent: true 
            };
          }
          return prev;
        });
      }
    }, 1000);
  };

  const handleAnswerSelect = (answerIndex: number) => {
    // Only allow selection if no answer has been submitted yet
    if (duelState.selectedAnswer !== undefined || duelState.timeLeft === 0 || duelState.waitingForOpponent) return;

    // Just highlight the selected answer, don't submit yet
    setDuelState(prev => ({
      ...prev,
      selectedAnswer: answerIndex
    }));

    announceForScreenReader(`Answer ${String.fromCharCode(65 + answerIndex)} selected. Press Submit to confirm.`);
  };

  const handleSubmitAnswer = () => {
    // Only allow submission if an answer is selected and not already submitted
    if (duelState.selectedAnswer === undefined || duelState.waitingForOpponent || duelState.timeLeft === 0) return;

    // Calculate actual response time from when question started
    const responseTimeMs = Date.now() - ((duelState as any).questionStartTime || Date.now());

    // Trigger battle animation
    setDuelState(prev => ({
      ...prev,
      waitingForOpponent: true,
      showAnswerAnimation: true
    }));

    // Reset animation after effect
    setTimeout(() => {
      setDuelState(prev => ({ ...prev, showAnswerAnimation: false }));
    }, 600);

    // Send answer to server
    console.log('📤 Submitting answer to server:', {
      choice: duelState.selectedAnswer,
      timeMs: Math.min(responseTimeMs, 60000),
      roomCode: duelState.roomCode,
      currentRound: currentRoundRef.current
    });
    
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      const answerMessage = {
        type: 'duel:answer',
        payload: {
          roomCode: duelState.roomCode,
          choice: duelState.selectedAnswer,
          timeMs: Math.min(responseTimeMs, 60000) // Cap at 60 seconds
        }
      };
      wsRef.current.send(JSON.stringify(answerMessage));
      console.log('✅ Answer submitted successfully');
      
      // Store the submitted answer in a ref so we can retrieve it even if state changes
      const submittedRound = currentRoundRef.current;
      const submittedChoice = duelState.selectedAnswer;
      if (submittedRound && submittedChoice !== undefined) {
        submittedAnswersRef.current.set(submittedRound, submittedChoice);
        console.log(`💾 Stored submitted answer for round ${submittedRound}: ${submittedChoice}`);
      }
      
      // Set up a safety check: if we don't receive result within 15 seconds of submitting, request it
      const currentRound = currentRoundRef.current;
      const questionQid = duelState.currentQuestion?.qid;
      setTimeout(() => {
        setDuelState(prev => {
          // If we're still waiting for this round's result, request it
          if (prev.waitingForOpponent && 
              prev.currentQuestion?.round === currentRound && 
              !prev.showResult && 
              !prev.isFinished) {
            console.warn(`⚠️ No result received 15s after submitting answer for round ${currentRound} - requesting...`);
            if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
              try {
                wsRef.current.send(JSON.stringify({
                  type: 'duel:requestResult',
                  payload: {
                    roomCode: prev.roomCode,
                    round: currentRound,
                    qid: questionQid
                  }
                }));
                console.log('📤 Early result request sent');
              } catch (err) {
                console.error('❌ Failed to send early result request:', err);
              }
            }
          }
          return prev;
        });
      }, 15000); // 15 seconds after answer submission
    } else {
      console.error('❌ WebSocket not ready, cannot send answer. State:', wsRef.current?.readyState);
    }

    announceForScreenReader(`Answer ${String.fromCharCode(65 + (duelState.selectedAnswer || 0))} submitted. Waiting for opponent.`);
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
          <div className="flex flex-col items-center justify-center py-12 mb-6">
            <div className="relative mb-4">
              <div className="w-12 h-12 border-3 border-arcane/20 border-t-arcane rounded-full animate-spin"></div>
              <div className="absolute inset-0 flex items-center justify-center">
                <i className="fas fa-magic text-arcane text-lg"></i>
              </div>
            </div>
            <div className="text-center space-y-1">
              <h3 className="text-lg font-semibold text-arcane">
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

        {/* Question - Always show if we have a current question, even if result is showing */}
        {duelState.currentQuestion && !duelState.generatingQuestion && !duelState.showTransition && (
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
        {duelState.currentQuestion && !duelState.showResult && !duelState.generatingQuestion && !duelState.showTransition && (
          <>
            <div className="grid grid-cols-1 gap-3 mb-4">
            {duelState.currentQuestion.choices.map((choice, index) => (
              <button
                key={index}
                onClick={() => handleAnswerSelect(index)}
                  disabled={duelState.waitingForOpponent || duelState.timeLeft === 0}
                  className={`w-full text-left p-4 rounded-xl border transition-all min-h-[60px] bg-transparent flex items-start ${
                    duelState.selectedAnswer === index 
                      ? 'border-arcane bg-arcane/10 shadow-lg shadow-arcane/20' 
                      : 'border-white/10 hover:border-arcane hover:bg-arcane/5'
                  } ${duelState.waitingForOpponent || duelState.timeLeft === 0 ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                data-testid={`answer-choice-${index}`}
              >
                  <span className={`w-8 h-8 rounded-lg font-bold flex items-center justify-center text-sm flex-shrink-0 ${
                    duelState.selectedAnswer === index 
                      ? 'bg-arcane text-white' 
                      : 'bg-arcane/20 text-arcane'
                  }`}>
                  {String.fromCharCode(65 + index)}
                </span>
                 <span className="ml-4 text-sm leading-relaxed flex-1 break-words">
                   {choice}
                 </span>
              </button>
            ))}
            </div>
            
            {/* Submit Button */}
            {duelState.selectedAnswer !== undefined && !duelState.waitingForOpponent && duelState.timeLeft > 0 && (
              <div className="mb-6 flex justify-center">
                <button
                  onClick={handleSubmitAnswer}
                  className="px-8 py-3 bg-arcane hover:bg-arcane/90 text-white font-bold rounded-xl shadow-lg shadow-arcane/30 transition-all transform hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                  disabled={duelState.waitingForOpponent || duelState.timeLeft === 0}
                >
                  Submit Answer
                </button>
          </div>
            )}
          </>
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
