import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

interface QuickMatchProps {
  onStartMatch: (subject: string, matchData?: any, websocket?: WebSocket) => void;
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
  const [ws, setWs] = useState<WebSocket | null>(null);

  useEffect(() => {
    return () => {
      if (ws) {
        ws.close();
      }
    };
  }, [ws]);

  const startQuickMatch = () => {
    // For demo, we'll use Evidence as default subject
    const subject = 'Evidence';
    
    setQueueState({
      isQueuing: true,
      timeElapsed: 0,
      subject
    });

    // Connect to WebSocket and join queue
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    const websocket = new WebSocket(wsUrl);
    setWs(websocket);

    // Queue timer
    const interval = setInterval(() => {
      setQueueState(prev => ({
        ...prev,
        timeElapsed: prev.timeElapsed + 1
      }));
    }, 1000);

    websocket.onopen = () => {
      console.log('Connected to matchmaking server');
      
      // Register presence first
      const savedCharacter = localStorage.getItem('bar-duel-character');
      if (savedCharacter) {
        const profile = JSON.parse(savedCharacter);
        websocket.send(JSON.stringify({
          type: 'presence:hello',
          payload: { username: profile.username, profile }
        }));
      }
      
      // Join the queue
      websocket.send(JSON.stringify({
        type: 'queue:join',
        payload: { subject }
      }));
    };

    websocket.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        console.log('Matchmaking message:', message);

        if (message.type === 'queue:joined') {
          console.log('Successfully joined queue');
        } else if (message.type === 'duel:start') {
          console.log('Duel starting!', message.payload);
          clearInterval(interval);
          setQueueState({ isQueuing: false, timeElapsed: 0 });
          // Keep the WebSocket connection alive and pass it to the duel
          onStartMatch(subject, message.payload, websocket);
        }
      } catch (error) {
        console.error('Failed to parse matchmaking message:', error);
      }
    };

    websocket.onclose = () => {
      console.log('Disconnected from matchmaking server');
      clearInterval(interval);
    };

    websocket.onerror = (error) => {
      console.error('WebSocket error:', error);
      clearInterval(interval);
      setQueueState({ isQueuing: false, timeElapsed: 0 });
    };
  };

  const cancelQueue = () => {
    if (ws) {
      ws.close();
      setWs(null);
    }
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
