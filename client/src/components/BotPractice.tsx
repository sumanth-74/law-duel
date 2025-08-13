import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Heart, Flame, Trophy, Crown, CreditCard } from 'lucide-react';

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
}

interface SoloQuestion {
  id: string;
  stem: string;
  choices: string[];
  subject: string;
  difficulty: number;
  round: number;
}

interface SoloChallenge {
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
}

export default function BotPractice({ onBack }: BotPracticeProps) {
  const { toast } = useToast();
  const [gameState, setGameState] = useState<'setup' | 'playing' | 'result' | 'game-over' | 'monetization'>('setup');
  const [subject, setSubject] = useState('Mixed Questions');
  const [challenge, setChallenge] = useState<SoloChallenge | null>(null);
  const [currentQuestion, setCurrentQuestion] = useState<SoloQuestion | null>(null);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [showResult, setShowResult] = useState<QuestionResult | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [generatingQuestion, setGeneratingQuestion] = useState(false);
  const [showMonetization, setShowMonetization] = useState(false);

  // Check existing challenge status on component mount
  useEffect(() => {
    checkChallengeStatus();
  }, []);

  const checkChallengeStatus = async () => {
    try {
      const response = await fetch('/api/solo-challenge/status', {
        credentials: 'include'
      });
      if (response.ok) {
        const status = await response.json();
        if (status.isDailyComplete) {
          setGameState('game-over');
        }
      }
    } catch (error) {
      // User hasn't started challenge yet, stay in setup
    }
  };

  const startSoloChallenge = async () => {
    try {
      setGeneratingQuestion(true);
      const response = await fetch('/api/solo-challenge/start', {
        method: 'POST',
        body: JSON.stringify({ subject }),
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

    setIsSubmitting(true);
    try {
      const response = await fetch('/api/solo-challenge/answer', {
        method: 'POST',
        body: JSON.stringify({
          challengeId: challenge.id,
          questionId: currentQuestion.id,
          userAnswer: selectedAnswer
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
        setTimeout(() => {
          setGameState('game-over');
          setShowResult(null);
        }, 3000);
      } else {
        // Continue with next question after delay
        setTimeout(async () => {
          setShowResult(null);
          setSelectedAnswer(null);
          await loadNextQuestion(updatedChallenge);
        }, 3000);
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

  const handleContinueWithPayment = () => {
    setShowMonetization(true);
  };

  const handlePaymentSuccess = async () => {
    try {
      const response = await fetch('/api/solo-challenge/restore-lives', {
        method: 'POST',
        body: JSON.stringify({ challengeId: challenge?.id }),
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include'
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to restore lives');
      }
      
      setChallenge(prev => ({ ...prev!, livesRemaining: 3 }));
      setGameState('playing');
      setShowMonetization(false);
      await loadNextQuestion(challenge!);
      
      toast({
        title: "Lives Restored!",
        description: "You can continue your challenge with 3 fresh lives.",
        variant: "default"
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to restore lives",
        variant: "destructive"
      });
    }
  };

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
                <CreditCard className="w-4 h-4 text-green-400" />
                Continue after game over with payment
              </li>
            </ul>
          </div>

          <Button 
            onClick={startSoloChallenge} 
            className="w-full bg-arcane hover:bg-arcane/80"
            size="lg"
            disabled={generatingQuestion}
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
                <div className="w-16 h-16 border-4 border-arcane/20 border-t-arcane rounded-full animate-spin"></div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <Flame className="w-6 h-6 text-arcane" />
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
              <div className="flex items-center gap-1">
                {[...Array(3)].map((_, i) => (
                  <Heart 
                    key={i} 
                    className={`w-5 h-5 ${i < challenge.livesRemaining ? 'text-red-500 fill-red-500' : 'text-gray-400'}`}
                  />
                ))}
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
              
              <div className="p-4 bg-blue-500/10 border border-blue-500/30 rounded">
                <div className="font-semibold text-sm mb-2">Explanation:</div>
                <div className="text-sm text-muted">{showResult.explanation}</div>
              </div>

              <div className="flex items-center justify-between text-sm">
                <div>
                  {showResult.isCorrect ? 
                    <span className="text-green-400">+{showResult.pointsEarned} points earned</span> :
                    <span className="text-red-400">-1 life lost</span>
                  }
                </div>
                {!showResult.isCorrect && challenge.livesRemaining === 0 && (
                  <span className="text-red-400 font-semibold">All lives lost!</span>
                )}
              </div>
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
                  <Button
                    key={index}
                    onClick={() => setSelectedAnswer(index)}
                    disabled={isSubmitting}
                    className={`text-left p-4 rounded-xl border border-white/10 hover:border-arcane hover:bg-arcane/5 transition-all min-h-[44px] flex items-center bg-transparent ${
                      selectedAnswer === index ? 'border-arcane bg-arcane/10' : ''
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

  // GAME OVER STATE - Show final score and monetization option
  if (gameState === 'game-over') {
    return (
      <Card className="w-full max-w-2xl mx-auto bg-panel border-white/10">
        <CardHeader className="text-center">
          <div className="mb-4">
            <Crown className="w-16 h-16 mx-auto text-mystic-gold" />
          </div>
          <CardTitle className="text-3xl text-arcane font-cinzel">
            Challenge Complete!
          </CardTitle>
          <p className="text-muted text-sm mt-2">
            You made it through {challenge?.round || 0} rounds
          </p>
        </CardHeader>
        <CardContent className="space-y-6 text-center">
          <div className="bg-mystic-gold/10 border border-mystic-gold/30 p-6 rounded-lg">
            <div className="text-4xl font-bold text-mystic-gold mb-2">
              {challenge?.score || 0}
            </div>
            <div className="text-sm text-muted">Final Score</div>
          </div>

          <div className="bg-panel-2 border border-white/10 p-4 rounded-lg">
            <h3 className="font-semibold text-arcane mb-2">Challenge Over</h3>
            <p className="text-sm text-muted mb-4">
              You've used all 3 lives for today. Come back tomorrow for a fresh challenge, or continue now with a small purchase.
            </p>
          </div>

          <div className="space-y-3">
            <Button 
              onClick={handleContinueWithPayment}
              className="w-full bg-green-600 hover:bg-green-700 text-white"
              size="lg"
              data-testid="button-continue-payment"
            >
              <CreditCard className="w-4 h-4 mr-2" />
              Continue with 3 Fresh Lives ($0.99)
            </Button>
            <Button 
              onClick={() => setGameState('setup')}
              variant="outline" 
              className="w-full border-white/20 text-muted hover:bg-white/5"
              size="lg"
              data-testid="button-new-challenge"
            >
              Start New Challenge Tomorrow
            </Button>
            <Button 
              onClick={onBack} 
              variant="ghost" 
              className="w-full text-muted hover:bg-white/5"
              size="lg"
              data-testid="button-back-menu"
            >
              Back to Menu
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // MONETIZATION MODAL
  return (
    <>
      <Dialog open={showMonetization} onOpenChange={setShowMonetization}>
        <DialogContent className="bg-panel border-white/10 max-w-md">
          <DialogHeader>
            <DialogTitle className="text-arcane font-cinzel text-xl">
              Continue Your Challenge
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="text-center">
              <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <Heart className="w-8 h-8 text-green-500" />
              </div>
              <h3 className="font-semibold text-lg mb-2">Restore Your Lives</h3>
              <p className="text-sm text-muted">
                Get 3 fresh lives and continue your challenge right where you left off.
              </p>
            </div>
            
            <div className="bg-green-500/10 border border-green-500/30 p-4 rounded-lg text-center">
              <div className="text-2xl font-bold text-green-400">$0.99</div>
              <div className="text-sm text-muted">One-time purchase</div>
            </div>

            <div className="space-y-2">
              <Button 
                onClick={handlePaymentSuccess}
                className="w-full bg-green-600 hover:bg-green-700"
                size="lg"
              >
                Purchase & Continue
              </Button>
              <Button 
                onClick={() => setShowMonetization(false)}
                variant="outline"
                className="w-full border-white/20"
                size="lg"
              >
                Maybe Later
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      
      {/* Fallback when dialog state is inconsistent */}
      <Card className="w-full max-w-2xl mx-auto bg-panel border-white/10">
        <CardContent className="p-8 text-center">
          <p className="text-muted">Loading challenge...</p>
        </CardContent>
      </Card>
    </>
  );
}
