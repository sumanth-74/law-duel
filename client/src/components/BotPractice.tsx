import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Trophy, Target } from 'lucide-react';

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

interface PracticeQuestion {
  id: string;
  stem: string;
  choices: string[];
  questionNumber: number;
  totalQuestions: number;
}

interface PracticeResult {
  userAnswer: number;
  correctAnswer: number;
  isCorrect: boolean;
  explanation: string;
  botAnswer: number;
  botCorrect: boolean;
  currentScores?: {
    user: number;
    bot: number;
  };
  finalScores?: {
    user: number;
    bot: number;
  };
  winner?: string;
}

export default function BotPractice({ onBack }: BotPracticeProps) {
  const { toast } = useToast();
  const [gameState, setGameState] = useState<'setup' | 'playing' | 'result'>('setup');
  const [subject, setSubject] = useState('Mixed Questions');
  const [practiceSession, setPracticeSession] = useState<any>(null);
  const [currentQuestion, setCurrentQuestion] = useState<PracticeQuestion | null>(null);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [showResult, setShowResult] = useState<PracticeResult | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const startPractice = async () => {
    try {
      const session = await apiRequest('/api/practice/start', {
        method: 'POST',
        body: JSON.stringify({ subject }),
        headers: { 'Content-Type': 'application/json' }
      });

      setPracticeSession(session);
      setCurrentQuestion({
        id: session.currentQuestion.id,
        stem: session.currentQuestion.stem,
        choices: session.currentQuestion.choices,
        questionNumber: 1,
        totalQuestions: session.totalQuestions
      });
      setGameState('playing');
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to start practice",
        variant: "destructive"
      });
    }
  };

  const submitAnswer = async () => {
    if (selectedAnswer === null || !practiceSession) return;

    setIsSubmitting(true);
    try {
      const result = await apiRequest('/api/practice/answer', {
        method: 'POST',
        body: JSON.stringify({
          practiceSession,
          userAnswer: selectedAnswer,
          responseTime: Date.now() - practiceSession.currentQuestion.startTime
        }),
        headers: { 'Content-Type': 'application/json' }
      });

      setShowResult(result.result);

      // Update session scores
      setPracticeSession(prev => ({
        ...prev,
        userScore: result.result.currentScores?.user || result.result.finalScores?.user || prev.userScore,
        botScore: result.result.currentScores?.bot || result.result.finalScores?.bot || prev.botScore,
        questionsAnswered: prev.questionsAnswered + 1
      }));

      if (result.isComplete) {
        setGameState('result');
      } else {
        // Set up next question
        setTimeout(() => {
          setCurrentQuestion({
            id: result.nextQuestion.id,
            stem: result.nextQuestion.stem,
            choices: result.nextQuestion.choices,
            questionNumber: result.nextQuestion.questionNumber,
            totalQuestions: result.nextQuestion.totalQuestions
          });
          setSelectedAnswer(null);
          setShowResult(null);
        }, 3000); // Show result for 3 seconds
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

  const resetPractice = () => {
    setGameState('setup');
    setPracticeSession(null);
    setCurrentQuestion(null);
    setSelectedAnswer(null);
    setShowResult(null);
  };

  if (gameState === 'setup') {
    return (
      <Card className="w-full max-w-2xl mx-auto">
        <CardHeader>
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={onBack}>
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div>
              <CardTitle className="text-2xl text-purple-900 dark:text-purple-100 font-cinzel">
                Bot Practice
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Practice instantly against AI opponents
              </p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <label className="text-sm font-medium mb-2 block">Subject</label>
            <Select value={subject} onValueChange={setSubject}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SUBJECTS.map(subj => (
                  <SelectItem key={subj} value={subj}>{subj}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-lg">
            <h3 className="font-semibold text-purple-900 dark:text-purple-100 mb-2">
              <Target className="w-4 h-4 inline mr-2" />
              Practice Mode
            </h3>
            <ul className="text-sm text-purple-700 dark:text-purple-200 space-y-1">
              <li>• 10 questions against stealth bot</li>
              <li>• Instant feedback and explanations</li>
              <li>• Practice anytime, no waiting</li>
              <li>• Compete for the higher score</li>
            </ul>
          </div>

          <Button 
            onClick={startPractice} 
            className="w-full bg-purple-600 hover:bg-purple-700"
            size="lg"
          >
            Start Practice
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (gameState === 'result') {
    const finalResult = showResult?.finalScores;
    const winner = showResult?.winner;
    
    return (
      <Card className="w-full max-w-2xl mx-auto">
        <CardHeader className="text-center">
          <div className="mb-4">
            <Trophy className="w-16 h-16 mx-auto text-yellow-500" />
          </div>
          <CardTitle className="text-3xl text-purple-900 dark:text-purple-100 font-cinzel">
            Practice Complete!
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">{finalResult?.user || 0}</div>
              <div className="text-sm text-blue-600">Your Score</div>
            </div>
            <div className="text-center p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
              <div className="text-2xl font-bold text-red-600">{finalResult?.bot || 0}</div>
              <div className="text-sm text-red-600">Bot Score</div>
            </div>
          </div>

          <div className="text-center">
            <Badge 
              variant={winner === 'user' ? 'default' : winner === 'tie' ? 'secondary' : 'destructive'}
              className="text-lg px-4 py-2"
            >
              {winner === 'user' ? '🎉 You Won!' : 
               winner === 'tie' ? '🤝 Tie Game!' : 
               '🤖 Bot Won!'}
            </Badge>
          </div>

          <div className="space-y-3">
            <Button 
              onClick={resetPractice} 
              className="w-full bg-purple-600 hover:bg-purple-700"
              size="lg"
            >
              Practice Again
            </Button>
            <Button 
              onClick={onBack} 
              variant="outline" 
              className="w-full"
              size="lg"
            >
              Back to Menu
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Playing state
  if (!currentQuestion || !practiceSession) return null;

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={onBack}>
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div>
              <CardTitle className="text-xl text-purple-900 dark:text-purple-100 font-cinzel">
                Practice vs {practiceSession.opponent.username}
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Question {currentQuestion.questionNumber} of {currentQuestion.totalQuestions} • {subject}
              </p>
            </div>
          </div>
          <div className="flex gap-4">
            <Badge variant="outline">You: {practiceSession.userScore}</Badge>
            <Badge variant="outline">Bot: {practiceSession.botScore}</Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {showResult ? (
          <div className="bg-gray-50 dark:bg-gray-900 p-6 rounded-lg space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className={`p-3 rounded ${showResult.isCorrect ? 'bg-green-100 dark:bg-green-900' : 'bg-red-100 dark:bg-red-900'}`}>
                <div className="font-semibold">Your Answer</div>
                <div>{currentQuestion.choices[showResult.userAnswer]}</div>
                <div className="text-sm">{showResult.isCorrect ? '✓ Correct' : '✗ Incorrect'}</div>
              </div>
              <div className={`p-3 rounded ${showResult.botCorrect ? 'bg-green-100 dark:bg-green-900' : 'bg-red-100 dark:bg-red-900'}`}>
                <div className="font-semibold">Bot Answer</div>
                <div>{currentQuestion.choices[showResult.botAnswer]}</div>
                <div className="text-sm">{showResult.botCorrect ? '✓ Correct' : '✗ Incorrect'}</div>
              </div>
            </div>
            <div className="p-3 bg-blue-100 dark:bg-blue-900 rounded">
              <div className="font-semibold">Correct Answer: {currentQuestion.choices[showResult.correctAnswer]}</div>
              <div className="text-sm mt-2">{showResult.explanation}</div>
            </div>
          </div>
        ) : (
          <>
            <div className="prose max-w-none">
              <div className="text-lg leading-relaxed">{currentQuestion.stem}</div>
            </div>
            
            <div className="space-y-3">
              {currentQuestion.choices.map((choice, index) => (
                <Button
                  key={index}
                  variant={selectedAnswer === index ? "default" : "outline"}
                  className="w-full text-left justify-start p-4 h-auto whitespace-normal"
                  onClick={() => setSelectedAnswer(index)}
                  disabled={isSubmitting}
                >
                  <span className="font-medium mr-3">{String.fromCharCode(65 + index)}.</span>
                  {choice}
                </Button>
              ))}
            </div>

            <Button 
              onClick={submitAnswer}
              disabled={selectedAnswer === null || isSubmitting}
              className="w-full bg-purple-600 hover:bg-purple-700"
              size="lg"
            >
              {isSubmitting ? 'Submitting...' : 'Submit Answer'}
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}