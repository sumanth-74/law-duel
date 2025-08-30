import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Sparkles, Heart, Zap, Clock, Shield, BookOpen, Target, Trophy } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { AvatarRenderer } from '@/components/AvatarRenderer';

interface AtticusDuelProps {
  onVictory: () => void;
  onDefeat: () => void;
  onExit: () => void;
  onRevive?: () => void;
  challengeId?: string;
}

interface AtticusQuestion {
  id: string;
  stem: string;
  choices: string[];
  correctAnswer: number;
  explanation: string;
  subject: string;
  difficulty: string;
}

interface AtticusDuelData {
  id: string;
  status: string;
  round: number;
  playerScore: number;
  atticusScore: number;
  currentQuestion: AtticusQuestion;
}

export function AtticusDuel({ onVictory, onDefeat, onExit, onRevive, challengeId }: AtticusDuelProps) {
  const [duelPhase, setDuelPhase] = useState<'intro' | 'question' | 'result' | 'victory' | 'defeat'>('intro');
  const [currentQuestion, setCurrentQuestion] = useState<AtticusQuestion | null>(null);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [isAnswered, setAnswered] = useState(false);
  const [duelData, setDuelData] = useState<AtticusDuelData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [playerPoints, setPlayerPoints] = useState(0);
  const [atticusPoints, setAtticusPoints] = useState(0);
  const [nextQuestion, setNextQuestion] = useState<AtticusQuestion | null>(null); // Store next question from API

  // Check for existing active duel when component mounts
  useEffect(() => {
    checkExistingDuel();
  }, []);

  // Debug: Log when points change
  useEffect(() => {
    console.log('🔍 Debug: Player points state changed to:', playerPoints);
  }, [playerPoints]);
  
  // Debug: Log when currentQuestion changes
  useEffect(() => {
    console.log('🔍 Debug: Current question changed to:', currentQuestion?.id, currentQuestion?.stem?.substring(0, 50) + '...');
  }, [currentQuestion]);

  const checkExistingDuel = async () => {
    try {
      const response = await fetch('/api/atticus/status', {
        credentials: 'include'
      });
      
      if (response.ok) {
        const status = await response.json();
        if (status.inDuel && status.duel) {
          // There's an active duel, continue it
          setDuelData(status.duel);
          setCurrentQuestion(status.duel.currentQuestion);
          setDuelPhase('question');
          console.log('🔍 Debug: Found existing duel, continuing...');
        }
      }
    } catch (error) {
      console.log('🔍 Debug: No existing duel found');
    }
  };

  // Start the Atticus duel
  const startDuel = async () => {
    if (!challengeId) {
      setError('No challenge ID provided');
      return;
    }

    // Check if there's already an active duel
    if (duelData && duelData.status === 'active') {
      console.log('🔍 Debug: Duel already active, continuing...');
      setDuelPhase('question');
      return;
    }

    setLoading(true);
    setError(null);

    // Debug: Log the URL being constructed
    const apiUrl = '/api/atticus/start';
    console.log('🔍 Debug: Making API call to:', apiUrl);
    console.log('🔍 Debug: Current window.location:', window.location.href);
    console.log('🔍 Debug: Current window.location.origin:', window.location.origin);

    try {
      console.log('🔍 Debug: Request details:', {
        url: apiUrl,
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: { challengeId },
        credentials: 'include'
      });

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ challengeId }),
        credentials: 'include',
      });

      console.log('🔍 Debug: Response received:', {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok,
        headers: Object.fromEntries(response.headers.entries())
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.log('🔍 Debug: Error response body:', errorText);
        throw new Error(`Failed to start Atticus duel: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      setDuelData(data.duel);
      setCurrentQuestion(data.question);
      setDuelPhase('question');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start duel');
    } finally {
      setLoading(false);
    }
  };

  // Submit answer to current question
  const submitAnswer = async () => {
    if (selectedAnswer === null || !duelData) return;

    setLoading(true);
    setAnswered(true);

    try {
      // Debug: Log the URL being constructed
      const apiUrl = '/api/atticus/answer';
      console.log('🔍 Debug: Making API call to:', apiUrl);
      
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userAnswer: selectedAnswer,
          timeToAnswer: 5, // Default time for now
        }),
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to submit answer');
      }

            const result = await response.json();
      
      console.log('🔍 Debug: Full API response:', result);
      console.log('🔍 Debug: Points in response:', result.points);
      console.log('🔍 Debug: Player score in response:', result.playerScore);
      
      // Update duel data with the new round and points
      if (duelData) {
        setDuelData(prev => prev ? { ...prev, round: result.round } : null);
        // Update player points - use the server's playerScore for consistency
        if (result.playerScore !== undefined) {
          console.log('🔍 Debug: Setting player score to:', result.playerScore);
          setPlayerPoints(result.playerScore);
        } else if (result.points && result.points > 0) {
          console.log('🔍 Debug: Adding points:', result.points);
          const newPoints = playerPoints + result.points;
          console.log('🔍 Debug: Old points:', playerPoints, 'New points:', newPoints);
          setPlayerPoints(newPoints);
        }
      }
      
      // Store the next question for the next round
      if (result.nextQuestion) {
        console.log('🔍 Debug: Storing next question:', result.nextQuestion);
        setNextQuestion(result.nextQuestion);
      }
      
      // Check if duel has ended
      if (result.duelEnded) {
        console.log('🔍 Debug: Duel ended! Result:', result);
        // Duel is complete, show result - NO AUTO-REDIRECT
        if (result.playerWon) {
          console.log('🔍 Debug: Player won! Moving to victory phase');
          setDuelPhase('victory');
          // User must click to continue - no auto-redirect
        } else {
          console.log('🔍 Debug: Player lost! Moving to defeat phase');
          setDuelPhase('defeat');
          // User must click to continue - no auto-redirect
        }
      } else {
        // Show result briefly - wait for user to click continue
        console.log('🔍 Debug: Duel continues, moving to result phase');
        setDuelPhase('result');
      }

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit answer');
      setAnswered(false);
    } finally {
      setLoading(false);
    }
  };

  // Handle answer selection
  const handleAnswerSelect = (answerIndex: number) => {
    if (isAnswered) return;
    setSelectedAnswer(answerIndex);
  };

  // Continue to next question
  const continueToNext = () => {
    console.log('🔍 Debug: continueToNext called');
    console.log('🔍 Debug: nextQuestion state:', nextQuestion);
    console.log('🔍 Debug: currentQuestion state:', currentQuestion);
    
    // Use the next question stored from the API response
    if (nextQuestion) {
      console.log('🔍 Debug: Moving to next question:', nextQuestion);
      setCurrentQuestion(nextQuestion);
      setNextQuestion(null); // Clear it after using
    } else {
      console.log('🔍 Debug: No next question available');
    }
    setDuelPhase('question');
    setSelectedAnswer(null);
    setAnswered(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <AnimatePresence>
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="relative max-w-4xl w-full mx-4"
        >
          <Card className="bg-gradient-to-br from-purple-900/90 via-purple-800/90 to-purple-900/90 border-purple-500 shadow-2xl">
            <CardContent className="p-8">
              {/* Atticus Visual - Purple Wizard Cat */}
              <div className="text-center mb-6">
                <motion.div
                  animate={{ scale: [1, 1.05, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="inline-block"
                >
                  <div className="relative inline-block">
                    <AvatarRenderer
                      avatarData={{
                        base: 'atticus',
                        palette: '#8B5CF6',
                        props: [],
                        archetypeId: 'atticus'
                      }}
                      size={120}
                      className="mx-auto"
                      animated={true}
                    />
                    <div className="absolute -top-2 -right-2 animate-pulse">
                      <Sparkles className="w-6 h-6 text-purple-400" />
                    </div>
                  </div>
                  <div className="text-purple-300 font-bold text-xl mt-2">ATTICUS THE PURPLE WIZARD CAT</div>
                </motion.div>
                
                {/* Atticus Stats */}
                <div className="flex items-center justify-center gap-2 mt-4">
                  <Shield className="w-5 h-5 text-purple-400" />
                  <Progress value={100} className="w-48 h-3 bg-purple-950" />
                  <span className="text-purple-300 text-sm font-mono">Atticus: {atticusPoints}</span>
                </div>
              </div>

              {/* Intro Phase */}
              {duelPhase === 'intro' && (
                <div className="text-center">
                  <div className="bg-gradient-to-r from-green-900/40 to-purple-900/40 rounded-lg p-4 mb-6 border border-green-500/30">
                    <div className="text-green-400 font-bold mb-2">🎯 THE STAKES 🎯</div>
                    <div className="text-purple-200 text-sm space-y-1">
                      <div>✅ <span className="text-green-300 font-semibold">WIN:</span> Restore all 3 lives + continue playing immediately!</div>
                      <div>❌ <span className="text-red-300 font-semibold">LOSE:</span> 3-hour cooldown OR revive for $1</div>
                          </div>
                      </div>
                  
                  <div className="text-purple-200 mb-6">
                    <p className="mb-2">Face Atticus in a 5-question legal duel!</p>
                    <p className="text-sm opacity-80">Answer correctly to earn points. Beat Atticus's score to win!</p>
                  </div>

                  <div className="flex justify-center gap-4">
                    <Button
                      onClick={startDuel}
                      disabled={loading}
                      className="bg-purple-600 hover:bg-purple-700 text-white px-8 py-3"
                    >
                      <Sparkles className="w-5 h-5 mr-2" />
                      {loading ? 'Starting Duel...' : 'Begin Duel'}
                    </Button>
                    <Button
                      onClick={onExit}
                      variant="outline"
                      className="border-purple-400 text-purple-300 hover:bg-purple-900/50 px-8 py-3"
                    >
                      Flee in Terror
                    </Button>
                  </div>
                </div>
              )}

              {/* Question Phase */}
              {duelPhase === 'question' && currentQuestion && (
                <div className="space-y-6">
                                     <div className="text-center">
                     <div className="text-purple-300 text-sm mb-2">
                       Round {Math.min(duelData?.round || 1, 5)} of 5
                     </div>
                    <div className="text-purple-200 text-lg font-semibold">
                      {currentQuestion.subject} - {currentQuestion.difficulty}
                </div>
              </div>

                  <div className="bg-purple-950/30 rounded-lg p-6 border border-purple-400/20">
                    <div className="text-purple-100 mb-4 text-lg leading-relaxed">
                      {currentQuestion.stem}
                    </div>
                    
                    <div className="space-y-3">
                      {currentQuestion.choices.map((choice, index) => (
                        <button
                          key={index}
                          onClick={() => handleAnswerSelect(index)}
                          disabled={isAnswered}
                          className={`w-full text-left p-4 rounded-lg border transition-all ${
                            selectedAnswer === index
                              ? 'border-purple-400 bg-purple-800/50 text-white'
                              : 'border-purple-400/30 bg-purple-900/30 text-purple-200 hover:border-purple-400/60 hover:bg-purple-800/30'
                          } ${isAnswered ? 'cursor-not-allowed' : 'cursor-pointer'}`}
                        >
                          <span className="font-mono text-purple-300 mr-3">
                            {String.fromCharCode(65 + index)}.
                          </span>
                          {choice}
                        </button>
                      ))}
                    </div>
                  </div>

                                     {selectedAnswer !== null && !isAnswered && (
                     <div className="text-center">
                       <Button
                         onClick={submitAnswer}
                         disabled={loading}
                         className="bg-green-600 hover:bg-green-700 text-white px-8 py-3"
                       >
                         <Target className="w-5 h-5 mr-2" />
                         {loading ? 'Submitting...' : 'Submit Answer'}
                       </Button>
                     </div>
                   )}

                   {/* Loading indicator during submission */}
                   {loading && (
                     <div className="text-center mt-4">
                       <div className="inline-flex items-center gap-2 text-purple-300">
                         <div className="w-4 h-4 border-2 border-purple-400 border-t-transparent rounded-full animate-spin"></div>
                         Processing answer...
                       </div>
                     </div>
                   )}
                </div>
              )}

              {/* Result Phase */}
              {duelPhase === 'result' && (
                <div className="text-center space-y-4">
                  <div className="text-2xl font-bold text-purple-300">
                    {selectedAnswer === currentQuestion?.correctAnswer ? '✅ Correct!' : '❌ Incorrect!'}
                  </div>
                  
                  {currentQuestion && (
                    <div className="bg-purple-950/30 rounded-lg p-4 border border-purple-400/20">
                      <div className="text-purple-200 text-sm">
                        <div className="font-semibold mb-2">Explanation:</div>
                        {currentQuestion.explanation}
                      </div>
                    </div>
                  )}

                                     <Button
                     onClick={continueToNext}
                     disabled={loading}
                     className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-2"
                   >
                     {loading ? 'Processing...' : 'Continue'}
                   </Button>
                </div>
              )}

                            {/* Victory Phase */}
              {duelPhase === 'victory' && (
                <div className="text-center space-y-4">
                  <div className="text-4xl">🎉</div>
                  <div className="text-2xl font-bold text-green-400">VICTORY!</div>
                  <div className="text-purple-200">
                    You've defeated Atticus! Your lives have been restored.
                  </div>
                  <div className="text-green-300 font-semibold">
                    +3 Lives Restored!
                  </div>
                  <div className="mt-6">
                    <Button
                      onClick={onVictory}
                      className="bg-green-600 hover:bg-green-700 text-white px-8 py-3"
                    >
                      Continue to Dashboard
                    </Button>
                  </div>
                </div>
              )}

                            {/* Defeat Phase */}
              {duelPhase === 'defeat' && (
                <div className="text-center space-y-4">
                  <div className="text-4xl">💀</div>
                  <div className="text-2xl font-bold text-red-400">DEFEATED</div>
                  <div className="text-purple-200">
                    Atticus has bested you this time.
                  </div>
                  
                  {onRevive && (
                    <div className="space-y-3">
                      <div className="text-purple-300 text-sm">
                        3-hour cooldown activated. Come back in 3 hours, or...
                      </div>
                      <Button
                        onClick={onRevive}
                        className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-bold px-6 py-3"
                      >
                        <Heart className="w-4 h-4 mr-2" />
                        Revive Now for $1
                      </Button>
                      <div className="text-purple-400 text-xs">
                        Skip the cooldown and restore your lives instantly!
                      </div>
                    </div>
                  )}
                  
                  <div className="mt-6">
                    <Button
                      onClick={onDefeat}
                      variant="outline"
                      className="border-red-400 text-red-300 hover:bg-red-900/50 px-8 py-3"
                    >
                      Return to Dashboard
                    </Button>
                  </div>
                </div>
              )}

              {/* Error Display */}
              {error && (
                <div className="bg-red-900/50 border border-red-500 rounded-lg p-4 mt-4">
                  <div className="text-red-200 text-center">{error}</div>
                  <div className="text-center mt-2">
                    <Button
                      onClick={() => setError(null)}
                      variant="outline"
                      size="sm"
                      className="border-red-400 text-red-300"
                    >
                      Dismiss
                    </Button>
                  </div>
                </div>
              )}

              {/* Player Status */}
              <div className="flex items-center justify-between mt-6">
                <div className="flex items-center gap-2">
                  <Heart className="w-5 h-5 text-red-400" />
                  <Progress value={100} className="w-48 h-3 bg-red-950" />
                  <span className="text-red-300 text-sm font-mono">You: {playerPoints}</span>
                </div>
                
                <div className="text-purple-300 text-sm">
                  Round {Math.min(duelData?.round || 1, 5)}
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}