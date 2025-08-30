import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Heart, Flame, Trophy, Crown, Zap, Shield, GraduationCap, BookOpen } from 'lucide-react';
import LawDuelLogo from '@/components/LawDuelLogo';
import { useStreak } from '@/contexts/StreakContext';


const SUBJECTS = [
  'Mixed Questions',
  'Evidence',
  'Contracts', 
  'Torts',
  'Property',
  'Civil Procedure',
  'Constitutional Law',
  'Criminal Law/Procedure'
];

interface BotPracticeProps {
  onBack: () => void;
  onLivesLost?: (challenge: SoloChallenge) => void;
}

interface SoloQuestion {
  id: string;
  stem: string;
  choices: string[];
  subject: string;
  difficulty: number;
  round: number;
}

export interface SoloChallenge {
  id: string;
  subject: string;
  livesRemaining: number;
  round: number;
  score: number;
  difficulty: number;
  isDailyComplete: boolean;
}

interface QuestionResult {
  isCorrect: boolean;
  correctAnswer: number;
  explanation: string;
  livesLost: number;
  newDifficulty: number;
  pointsEarned: number;
  speedBonus?: number;
}

export default function BotPractice({ onBack, onLivesLost }: BotPracticeProps) {
  const { toast } = useToast();
  const { incrementStreak, resetStreak } = useStreak();
  const [gameState, setGameState] = useState<'setup' | 'playing' | 'result'>('setup');
  const [questionType, setQuestionType] = useState<'bar-exam' | 'real-world'>('bar-exam');
  const [subject, setSubject] = useState('Mixed Questions');
  const [challenge, setChallenge] = useState<SoloChallenge | null>(null);
  const [currentQuestion, setCurrentQuestion] = useState<SoloQuestion | null>(null);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [showResult, setShowResult] = useState<QuestionResult | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [generatingQuestion, setGeneratingQuestion] = useState(false);
  const [questionStartTime, setQuestionStartTime] = useState<number | null>(null);
  const [timeToAnswer, setTimeToAnswer] = useState<number | null>(null);


  // Check existing challenge status on component mount
  useEffect(() => {
    checkChallengeStatus();
  }, []);
  
  // Check Atticus cooldown status
  const [atticusCooldown, setAtticusCooldown] = useState<{
    canChallenge: boolean;
    cooldownHours?: number;
    cooldownMinutes?: number;
    message?: string;
  } | null>(null);
  
  useEffect(() => {
    checkAtticusCooldown();
  }, []);
  
  const checkAtticusCooldown = async () => {
    try {
      const response = await fetch('/api/atticus/status', {
        credentials: 'include'
      });
      if (response.ok) {
        const status = await response.json();
        setAtticusCooldown(status);
      }
    } catch (error) {
      console.error('Error checking Atticus cooldown:', error);
    }
  };

  const checkChallengeStatus = async () => {
    try {
      const response = await fetch('/api/solo-challenge/status', {
        credentials: 'include'
      });
      if (response.ok) {
        const status = await response.json();
        // No more daily completion check - lives are handled by Atticus system
      }
    } catch (error) {
      // User hasn't started challenge yet, stay in setup
    }
  };

  const startSoloChallenge = async () => {
    try {
      // Check backend cooldown status before starting challenge
      const statusResponse = await fetch('/api/atticus/status', {
        credentials: 'include'
      });
      
      if (statusResponse.ok) {
        const status = await statusResponse.json();
        
        if (status.canChallenge === false) {
          // User is in cooldown period
          toast({
            title: "Cooldown Active",
            description: status.message || "You must wait before starting a new challenge. Atticus defeated you recently.",
            variant: "destructive"
          });
          return; // Don't allow new challenge
        }
      }
      
      setGeneratingQuestion(true);
      const response = await fetch('/api/solo-challenge/start', {
        method: 'POST',
        body: JSON.stringify({ 
          subject,
          questionType // Pass the question type to the backend
        }),
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include'
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to start solo challenge');
      }

      const challengeData = await response.json();
      setChallenge(challengeData.challenge);
      setCurrentQuestion(challengeData.question);
      setQuestionStartTime(Date.now()); // Start timing
      setGameState('playing');
      setGeneratingQuestion(false);
    } catch (error: any) {
      setGeneratingQuestion(false);
      toast({
        title: "Error",
        description: error.message || "Failed to start solo challenge",
        variant: "destructive"
      });
    }
  };

  const submitAnswer = async () => {
    if (selectedAnswer === null || !challenge || !currentQuestion) return;

    // Calculate time taken to answer
    const answerTime = questionStartTime ? Math.floor((Date.now() - questionStartTime) / 1000) : 0;
    setTimeToAnswer(answerTime);

    setIsSubmitting(true);
    try {
      const response = await fetch('/api/solo-challenge/answer', {
        method: 'POST',
        body: JSON.stringify({
          challengeId: challenge.id,
          questionId: currentQuestion.id,
          userAnswer: selectedAnswer,
          timeToAnswer: answerTime
        }),
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include'
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to submit answer');
      }

      const data = await response.json();
      setShowResult(data);
      
      // Track streak for achievements
      if (data.isCorrect) {
        incrementStreak();
      } else {
        resetStreak();
      }
      
      // Update challenge state
      const updatedChallenge = {
        ...challenge,
        livesRemaining: Math.max(0, challenge.livesRemaining - data.livesLost),
        round: challenge.round + 1,
        score: challenge.score + data.pointsEarned,
        difficulty: data.newDifficulty
      };
      setChallenge(updatedChallenge);

      // Check if game over (no lives left)
      if (updatedChallenge.livesRemaining === 0) {
        // Don't auto-advance, wait for user to read explanation
        // Will trigger onLivesLost when user clicks continue
      } else {
        // Don't auto-advance, wait for user to click continue
      }

    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to submit answer",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleContinue = async () => {
    if (!challenge) return;
    
          // Check if game is over
      if (challenge.livesRemaining === 0) {
        if (onLivesLost) {
          onLivesLost(challenge);
        }
        // No more game-over state - lives are handled by Atticus system
      } else {
      // Continue to next question
      setShowResult(null);
      setSelectedAnswer(null);
      await loadNextQuestion(challenge);
    }
  };

  const loadNextQuestion = async (challengeState: SoloChallenge) => {
    try {
      setGeneratingQuestion(true);
      const response = await fetch('/api/solo-challenge/next-question', {
        method: 'POST',
        body: JSON.stringify({ challengeId: challengeState.id }),
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include'
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to load next question');
      }
      
      const data = await response.json();
      setCurrentQuestion(data);
      setQuestionStartTime(Date.now()); // Start timing for new question
      setTimeToAnswer(null); // Reset time
      setGeneratingQuestion(false);
    } catch (error: any) {
      setGeneratingQuestion(false);
      toast({
        title: "Error",
        description: error.message || "Failed to load next question",
        variant: "destructive"
      });
    }
  };

  // Remove payment functionality - lives are now free but limited

  // SETUP STATE - Choose subject and start challenge
  if (gameState === 'setup') {
    return (
      <Card className="w-full max-w-2xl mx-auto bg-panel border-white/10">
        <CardHeader>
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={onBack} data-testid="button-back">
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div>
              <CardTitle className="text-2xl text-arcane font-cinzel">
                Solo Challenge
              </CardTitle>
              <p className="text-muted text-sm mt-1">
                Progressive questions that get harder as you advance
              </p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <label className="text-sm font-medium mb-2 block text-ink">Question Type</label>
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant={questionType === 'bar-exam' ? 'default' : 'outline'}
                onClick={() => setQuestionType('bar-exam')}
                className={`justify-start flex-col items-start py-3 ${questionType === 'bar-exam' ? 'bg-arcane' : ''}`}
              >
                <div className="flex items-center mb-1">
                  <GraduationCap className="w-4 h-4 mr-2" />
                  <span className="font-semibold">Bar Study</span>
                </div>
                <span className="text-xs text-muted ml-6">1L exam & MBE review</span>
              </Button>
              <Button
                variant={questionType === 'real-world' ? 'default' : 'outline'}
                onClick={() => setQuestionType('real-world')}
                className={`justify-start flex-col items-start py-3 ${questionType === 'real-world' ? 'bg-arcane' : ''}`}
              >
                <div className="flex items-center mb-1">
                  <Shield className="w-4 h-4 mr-2" />
                  <span className="font-semibold">Legal Trivia</span>
                </div>
                <span className="text-xs text-muted ml-6">Test your everyday law smarts</span>
              </Button>
            </div>
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block text-ink">Subject</label>
            <Select value={subject} onValueChange={setSubject}>
              <SelectTrigger className="bg-panel-2 border-white/10">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SUBJECTS.map(subj => (
                  <SelectItem key={subj} value={subj}>{subj}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="bg-mystic-gold/10 border border-mystic-gold/30 p-4 rounded-lg">
            <h3 className="font-semibold text-mystic-gold mb-3 flex items-center">
              <Flame className="w-5 h-5 mr-2" />
              Challenge Rules
            </h3>
            <ul className="text-sm text-muted space-y-2">
              <li className="flex items-center gap-2">
                <Heart className="w-4 h-4 text-red-400" />
                You get 3 lives (wrong answers)
              </li>
              <li className="flex items-center gap-2">
                <Trophy className="w-4 h-4 text-yellow-400" />
                Questions get harder as you progress
              </li>
              <li className="flex items-center gap-2">
                <Crown className="w-4 h-4 text-purple-400" />
                Higher difficulty = more points
              </li>
              <li className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-blue-400" />
                Speed bonus: Answer faster for extra points!
              </li>
            </ul>
          </div>

          {/* Atticus Cooldown Warning */}
          {atticusCooldown && !atticusCooldown.canChallenge && (
            <div className="p-4 bg-red-900/30 border border-red-500/50 rounded-lg text-center mb-4">
              <div className="text-red-300 font-semibold mb-2">⏰ Atticus Cooldown Active</div>
              <div className="text-red-400 text-sm">
                {atticusCooldown.cooldownHours && atticusCooldown.cooldownMinutes ? (
                  `Lives will be automatically restored in ${atticusCooldown.cooldownHours} hour${atticusCooldown.cooldownHours > 1 ? 's' : ''} and ${atticusCooldown.cooldownMinutes % 60} minute${atticusCooldown.cooldownMinutes % 60 > 1 ? 's' : ''}`
                ) : (
                  'Lives will be automatically restored in 3 hours'
                )}
              </div>
              <div className="text-red-300 text-xs mt-2">
                After losing to Atticus, you must wait for automatic life restoration
              </div>
            </div>
          )}
          
          <Button 
            onClick={startSoloChallenge} 
            className="w-full bg-arcane hover:bg-arcane/80"
            size="lg"
            disabled={generatingQuestion || (atticusCooldown ? !atticusCooldown.canChallenge : false)}
            data-testid="button-start-challenge"
          >
            {generatingQuestion ? 'Generating Challenge...' : 'Start Solo Challenge'}
          </Button>
        </CardContent>
      </Card>
    );
  }

  // PLAYING STATE - Show question and handle answers  
  if (gameState === 'playing') {
    if (generatingQuestion) {
      return (
        <Card className="w-full max-w-2xl mx-auto bg-panel border-white/10">
          <CardContent className="p-8">
            <div className="flex flex-col items-center justify-center py-16 space-y-4">
              <div className="relative">
                <div className="w-24 h-24 border-4 border-arcane/20 border-t-arcane rounded-full animate-spin"></div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <LawDuelLogo size="sm" />
                </div>
              </div>
              <h3 className="text-xl font-semibold text-arcane">Generating Question</h3>
              <p className="text-muted text-sm">Crafting difficulty level {challenge?.difficulty} question...</p>
            </div>
          </CardContent>
        </Card>
      );
    }

    if (!currentQuestion || !challenge) return null;

    return (
      <Card className="w-full max-w-4xl mx-auto bg-panel border-white/10">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="sm" onClick={onBack} data-testid="button-back">
                <ArrowLeft className="w-4 h-4" />
              </Button>
              <div>
                <CardTitle className="text-xl text-arcane font-cinzel">
                  Solo Challenge - Round {challenge.round}
                </CardTitle>
                <p className="text-muted text-sm">
                  {currentQuestion.subject} • Difficulty Level {challenge.difficulty}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex flex-col items-end">
                <div className="flex items-center gap-1">
                  {[...Array(3)].map((_, i) => (
                    <Heart 
                      key={i} 
                      className={`w-5 h-5 ${i < challenge.livesRemaining ? 'text-red-500 fill-red-500' : 'text-gray-400'}`}
                    />
                  ))}
                </div>
                {challenge.livesRemaining === 1 && (
                  <div className="text-[10px] text-yellow-400 mt-1">
                    Last life! Lose = Atticus!
                  </div>
                )}
              </div>
              <Badge variant="outline" className="text-mystic-gold border-mystic-gold/50">
                {challenge.score} Points
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {showResult ? (
            <div className="bg-panel-2 border border-white/10 p-6 rounded-lg space-y-4">
              <div className={`p-4 rounded ${showResult.isCorrect ? 'bg-green-500/10 border border-green-500/30' : 'bg-red-500/10 border border-red-500/30'}`}>
                <div className="font-semibold text-lg mb-2">
                  {showResult.isCorrect ? '✓ Correct!' : '✗ Incorrect'}
                </div>
                <div className="text-sm text-muted mb-2">
                  Your answer: {currentQuestion.choices[selectedAnswer!]}
                </div>
                {!showResult.isCorrect && (
                  <div className="text-sm text-muted">
                    Correct answer: {currentQuestion.choices[showResult.correctAnswer]}
                  </div>
                )}
              </div>
              
              {/* Atticus Says Explanation */}
              <div className="bg-mystic-gold/10 border border-mystic-gold/30 rounded-xl p-4">
                <div className="flex items-start space-x-3">
                  <div className="w-10 h-10 bg-mystic-gold rounded-lg flex items-center justify-center flex-shrink-0">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="w-6 h-6 fill-dark-bg">
                      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-3-9c.55 0 1-.45 1-1s-.45-1-1-1-1 .45-1 1 .45 1 1 1zm6 0c.55 0 1-.45 1-1s-.45-1-1-1-1 .45-1 1 .45 1 1 1zm-3 5c1.66 0 3-1.34 3-3h-6c0 1.66 1.34 3 3 3z"/>
                      <path d="M8 4c0-.55-.45-1-1-1s-1 .45-1 1v2c0 .55.45 1 1 1s1-.45 1-1V4zm10 0c0-.55-.45-1-1-1s-1 .45-1 1v2c0 .55.45 1 1 1s1-.45 1-1V4z"/>
                    </svg>
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-mystic-gold mb-1">Atticus Says:</p>
                    <p className="text-sm text-gray-200">{showResult.explanation}</p>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between text-sm mb-4">
                <div>
                  {showResult.isCorrect ? (
                    <div className="space-y-1">
                      {showResult.speedBonus && showResult.speedBonus > 0 ? (
                        <>
                          <span className="text-green-400 block">
                            +{showResult.pointsEarned} total points
                          </span>
                          <span className="text-blue-400 text-xs flex items-center gap-1">
                            <Zap className="w-3 h-3" />
                            {showResult.pointsEarned - showResult.speedBonus} base + {showResult.speedBonus} speed bonus ({timeToAnswer}s)
                          </span>
                        </>
                      ) : (
                        <span className="text-green-400 block">+{showResult.pointsEarned} points earned</span>
                      )}
                    </div>
                  ) : (
                    <span className="text-red-400">-1 life lost</span>
                  )}
                </div>
                {!showResult.isCorrect && challenge.livesRemaining === 0 && (
                  <span className="text-red-400 font-semibold">All lives lost!</span>
                )}
              </div>

              {/* Special Atticus Alert when all lives lost */}
              {challenge.livesRemaining === 0 && (
                <div className="bg-gradient-to-r from-purple-900/40 to-green-900/40 border border-purple-500/50 rounded-lg p-4 animate-pulse">
                  <div className="text-center space-y-2">
                    <div className="text-xl font-bold text-purple-300">🐱🎩 ATTICUS APPROACHES! 🎩🐱</div>
                    <div className="text-sm text-gray-200">
                      The Purple Wizard Cat has sensed your weakness!
                    </div>
                    <div className="text-sm text-green-300 font-semibold">
                      ✨ BEAT HIM = RESTORE ALL 3 LIVES + 100 XP! ✨
                    </div>
                    <div className="text-xs text-gray-400">
                      (Lose and you'll have to wait 3 hours)
                    </div>
                  </div>
                </div>
              )}

              {/* Continue button - user can take as much time as needed to read */}
              <Button 
                onClick={handleContinue}
                className="w-full bg-arcane hover:bg-arcane/80"
                size="lg"
                data-testid="button-continue"
              >
                {challenge.livesRemaining === 0 ? 'Face Atticus to Restore Lives (Win = 3 Lives!)' : 'Continue to Next Question'}
              </Button>
            </div>
          ) : (
            <>
              <div className="bg-panel-2 border border-white/10 rounded-xl p-6">
                <p className="text-ink leading-relaxed" data-testid="question-stem">
                  {currentQuestion.stem}
                </p>
              </div>
              
              <div className="grid grid-cols-1 gap-3">
                {currentQuestion.choices.map((choice, index) => (
                  <button
                    key={index}
                    onClick={() => setSelectedAnswer(index)}
                    disabled={isSubmitting}
                    className={`w-full text-left p-4 rounded-xl border border-white/10 hover:border-arcane hover:bg-arcane/5 transition-all min-h-[44px] flex items-start bg-transparent ${
                      selectedAnswer === index ? 'border-arcane bg-arcane/10' : ''
                    } ${isSubmitting ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                    data-testid={`answer-choice-${index}`}
                  >
                    <span className="w-8 h-8 bg-arcane/20 text-arcane rounded-lg font-bold flex items-center justify-center text-sm flex-shrink-0">
                      {String.fromCharCode(65 + index)}
                    </span>
                    <span className="ml-4 text-sm leading-relaxed flex-1 break-all overflow-hidden">{choice}</span>
                  </button>
                ))}
              </div>

              <Button 
                onClick={submitAnswer}
                disabled={selectedAnswer === null || isSubmitting}
                className="w-full bg-arcane hover:bg-arcane/80"
                size="lg"
                data-testid="button-submit-answer"
              >
                {isSubmitting ? 'Submitting...' : 'Submit Answer'}
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    );
  }

  // No more game-over state - lives are handled by Atticus system
}
