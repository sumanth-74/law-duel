import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';

interface DuelQuestion {
  id: string;
  subject: string;
  topic: string;
  stem: string;
  choices: string[];
  timeLimitSec: number;
  timeRemainingSec: number;
  round: number;
  totalRounds: number;
  duelId: string;
}

interface DuelResult {
  correct: boolean;
  correctIndex: number;
  explanation: string;
  timeRemaining: number;
  scores: [number, number];
  roundFinished: boolean;
  duelComplete: boolean;
}

export default function DuelTestPage() {
  const [duelId] = useState(`test_duel_${Date.now()}`);
  const [currentQuestion, setCurrentQuestion] = useState<DuelQuestion | null>(null);
  const [usedQuestions, setUsedQuestions] = useState<Set<string>>(new Set());
  const [selectedChoice, setSelectedChoice] = useState(-1);
  const [result, setResult] = useState<DuelResult | null>(null);
  const [timeRemaining, setTimeRemaining] = useState(60);
  const [loading, setLoading] = useState(false);
  const [duelComplete, setDuelComplete] = useState(false);
  const [playerScore, setPlayerScore] = useState(0);
  const [totalQuestions, setTotalQuestions] = useState(0);
  const [timeLeft, setTimeLeft] = useState(60);

  const letters = ['A', 'B', 'C', 'D'];

  // Hard-enforced 60-second timer in sync with server
  useEffect(() => {
    if (!currentQuestion) return;
    const t0 = Date.now();
    const tick = setInterval(() => {
      const left = Math.max(0, currentQuestion.timeLimitSec - Math.floor((Date.now() - t0) / 1000));
      setTimeLeft(left);
      setTimeRemaining(left);
      if (left === 0) {
        clearInterval(tick);
        // Server will mark as incorrect due to timeout
        if (!result) {
          handleSubmitAnswer(-1); // -1 indicates timeout
        }
      }
    }, 250);
    return () => clearInterval(tick);
  }, [currentQuestion, result]);

  const fetchNextQuestion = async () => {
    setLoading(true);
    setResult(null);
    setSelectedChoice(-1);
    
    try {
      const response = await fetch('/test/duel-next', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          duelId,
          subjects: ['Evidence', 'Contracts'] // Test with specific subjects
        }),
        cache: 'no-store'
      });

      const data = await response.json();
      
      if (data.done) {
        setDuelComplete(true);
        setCurrentQuestion(null);
      } else if (data.question) {
        // Check if we've seen this question before
        if (usedQuestions.has(data.question.id)) {
          console.warn('⚠️ Duplicate question detected, fetching another...');
          setTimeout(fetchNextQuestion, 100); // Try again quickly
          return;
        }
        
        console.log('✅ Question received:', data.question.subject, data.question.topic);
        setCurrentQuestion(data.question);
        setUsedQuestions(prev => new Set([...prev, data.question.id]));
        setTimeRemaining(data.question.timeLimitSec || 60);
        setTimeLeft(data.question.timeLimitSec || 60);
        setTotalQuestions(prev => prev + 1);
        setResult(null); // Clear previous result
      } else {
        console.error('Invalid response:', data);
        alert('Failed to load question: ' + JSON.stringify(data));
      }
    } catch (error) {
      console.error('Error fetching question:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitAnswer = async (choiceIndex: number) => {
    if (result || !currentQuestion) return; // Already submitted or no question

    console.log(`🎯 Submitting answer: choice ${choiceIndex} for question ${currentQuestion.id}`);

    try {
      const response = await fetch('/test/duel-answer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          duelId,
          playerId: 'test_player',
          choiceIndex,
          questionId: currentQuestion.id,
          timeMs: (60 - timeRemaining) * 1000
        })
      });

      const data = await response.json();
      console.log('✅ Answer result:', data);
      
      if (data.error) {
        alert(`Error: ${data.error}`);
        return;
      }
      
      setResult(data);
      
      // Update score if answer was correct
      if (data.correct) {
        setPlayerScore(prev => prev + 1);
      }
      
      if (data.duelComplete) {
        setDuelComplete(true);
      }
    } catch (error) {
      console.error('Error submitting answer:', error);
    }
  };

  const handleChoiceClick = (index: number) => {
    if (result || timeLeft <= 0) return; // Use timeLeft for immediate UI response
    setSelectedChoice(index);
    handleSubmitAnswer(index);
  };

  if (duelComplete) {
    return (
      <div className="container mx-auto p-6 max-w-4xl">
        <Card>
          <CardHeader>
            <CardTitle>Duel Complete!</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-lg mb-4">
              Final Score: {playerScore} correct out of {totalQuestions} questions
            </p>
            <p className="text-md mb-4">
              Accuracy: {totalQuestions > 0 ? Math.round((playerScore / totalQuestions) * 100) : 0}%
            </p>
            <Button onClick={() => window.location.reload()}>
              Start New Duel
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Duel API Test</h1>
        <p className="text-muted-foreground">Testing /duel/next and /duel/answer endpoints</p>
      </div>

      {!currentQuestion && !loading && (
        <Card>
          <CardContent className="pt-6">
            <Button 
              onClick={fetchNextQuestion}
              size="lg"
              data-testid="start-duel-button"
            >
              Start Duel Test
            </Button>
          </CardContent>
        </Card>
      )}

      {loading && (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="animate-pulse">Generating fresh question...</div>
            </div>
          </CardContent>
        </Card>
      )}

      {currentQuestion && (
        <div className="space-y-6">
          {/* Question Header */}
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div className="flex gap-2">
                  <Badge variant="secondary" data-testid="subject-badge">
                    {currentQuestion.subject}
                  </Badge>
                  <Badge variant="outline" data-testid="topic-badge">
                    {currentQuestion.topic}
                  </Badge>
                </div>
                <div className="flex gap-3 items-center">
                  <div className="text-sm text-muted-foreground" data-testid="round-counter">
                    Round {currentQuestion.round} of {currentQuestion.totalRounds}
                  </div>
                  <Badge variant="outline" data-testid="score-display">
                    Score: {playerScore}/{totalQuestions} ({totalQuestions > 0 ? Math.round((playerScore / totalQuestions) * 100) : 0}%)
                  </Badge>
                </div>
              </div>
            </CardHeader>
          </Card>

          {/* Timer */}
          <Card>
            <CardContent className="pt-4">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium">Time Remaining</span>
                <span className="text-lg font-bold" data-testid="timer-display">
                  {timeLeft}s
                </span>
              </div>
              <Progress 
                value={(timeLeft / 60) * 100} 
                className="h-2"
                data-testid="timer-progress"
              />
            </CardContent>
          </Card>

          {/* Question */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Question</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-base leading-relaxed" data-testid="question-stem">
                {currentQuestion.stem}
              </p>
            </CardContent>
          </Card>

          {/* Choices */}
          <div className="grid gap-3">
            {currentQuestion.choices.map((choice: string, index: number) => (
              <Button
                key={index}
                variant={
                  result
                    ? index === result.correctIndex
                      ? "default"
                      : index === selectedChoice
                      ? "destructive"
                      : "outline"
                    : selectedChoice === index
                    ? "secondary"
                    : "outline"
                }
                className="h-auto p-4 text-left justify-start"
                onClick={() => handleChoiceClick(index)}
                disabled={!!result || timeLeft <= 0}
                data-testid={`choice-${index}`}
              >
                <div className="flex gap-3 items-start w-full">
                  <span className="font-bold min-w-6" data-testid={`choice-letter-${index}`}>
                    {letters[index]}
                  </span>
                  <span className="flex-1" data-testid={`choice-text-${index}`}>
                    {choice}
                  </span>
                </div>
              </Button>
            ))}
          </div>

          {/* Result */}
          {result && (
            <Card>
              <CardHeader>
                <CardTitle className={result.correct ? "text-green-600" : "text-red-600"}>
                  {result.correct ? "Correct!" : "Incorrect"}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="mb-4" data-testid="explanation">
                  {result.explanationLong || result.explanation}
                </p>
                <p className="text-sm text-muted-foreground mb-4" data-testid="scores">
                  Scores: Player {result.scores[0]} - Bot {result.scores[1]}
                </p>
                {!result.duelComplete && (
                  <Button onClick={fetchNextQuestion} data-testid="next-question-button">
                    Next Question
                  </Button>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}