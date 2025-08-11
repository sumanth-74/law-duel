import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

interface QuickMatchProps {
  onStartMatch: (subject: string) => void;
}

interface QueueState {
  isQueuing: boolean;
  timeElapsed: number;
  subject?: string;
}

export function QuickMatch({ onStartMatch }: QuickMatchProps) {
  const [queueState, setQueueState] = useState<QueueState>({
    isQueuing: false,
    timeElapsed: 0
  });

  const startQuickMatch = () => {
    // For demo, we'll use Evidence as default subject
    const subject = 'Evidence';
    
    setQueueState({
      isQueuing: true,
      timeElapsed: 0,
      subject
    });

    // Simulate queue timer
    const interval = setInterval(() => {
      setQueueState(prev => ({
        ...prev,
        timeElapsed: prev.timeElapsed + 1
      }));
    }, 1000);

    // Simulate finding match after 3-8 seconds
    const matchTime = Math.random() * 5000 + 3000;
    
    setTimeout(() => {
      clearInterval(interval);
      setQueueState({ isQueuing: false, timeElapsed: 0 });
      onStartMatch(subject);
    }, matchTime);
  };

  const cancelQueue = () => {
    setQueueState({ isQueuing: false, timeElapsed: 0 });
  };

  if (queueState.isQueuing) {
    return (
      <Card className="panel max-w-md mx-auto">
        <CardContent className="p-8 text-center">
          <div className="w-16 h-16 border-4 border-arcane border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <h3 className="font-cinzel text-xl font-bold mb-2">Finding Worthy Opponent</h3>
          <p className="text-muted mb-4">Searching the mystical realms...</p>
          <div className="flex justify-center space-x-2 mb-6">
            <div className="w-2 h-2 bg-arcane rounded-full animate-bounce"></div>
            <div className="w-2 h-2 bg-arcane rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
            <div className="w-2 h-2 bg-arcane rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
          </div>
          <p className="text-sm text-muted mb-6">
            Time elapsed: {queueState.timeElapsed}s • Average wait: 8s
          </p>
          <Button 
            onClick={cancelQueue}
            variant="outline" 
            className="btn-secondary py-2 px-6"
            data-testid="button-cancel-queue"
          >
            Cancel Search
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="flex flex-col sm:flex-row gap-4 justify-center max-w-md mx-auto">
      <Button
        onClick={startQuickMatch}
        className="btn-primary py-4 px-8 rounded-xl font-bold text-lg hover:transform hover:scale-105 transition-all animate-pulse-glow"
        data-testid="button-quick-match"
      >
        <i className="fas fa-bolt mr-2"></i>Quick Match
      </Button>
      <Button
        variant="outline"
        className="btn-secondary py-4 px-8 rounded-xl font-bold text-lg hover:transform hover:scale-105 transition-all"
        data-testid="button-create-room"
      >
        <i className="fas fa-users mr-2"></i>Create Room
      </Button>
    </div>
  );
}
