import { useState, useEffect } from 'react';
import { CharacterCreation } from '@/components/CharacterCreation';
import { Dashboard } from '@/components/Dashboard';
import { DuelArena } from '@/components/DuelArena';
import { AvatarRenderer } from '@/components/AvatarRenderer';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import type { User, AvatarData } from '@shared/schema';
import angelLogo from '@assets/generated_images/Photorealistic_divine_angel_portrait_94c3a62d.png';

interface GameState {
  currentView: 'dashboard' | 'duel';
  user?: User;
  opponent?: User;
  showCharacterCreation: boolean;
}

export default function Home() {
  const [gameState, setGameState] = useState<GameState>({
    currentView: 'dashboard',
    showCharacterCreation: false
  });
  
  const [motionReduced, setMotionReduced] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    // Check for existing character in localStorage
    const savedCharacter = localStorage.getItem('bar-duel-character');
    const reducedMotion = localStorage.getItem('reduce-motion') === 'true';
    
    setMotionReduced(reducedMotion);
    
    if (savedCharacter) {
      try {
        const character = JSON.parse(savedCharacter);
        setGameState(prev => ({ ...prev, user: character }));
      } catch (error) {
        console.error('Failed to parse saved character:', error);
        setGameState(prev => ({ ...prev, showCharacterCreation: true }));
      }
    } else {
      // Show character creation immediately for new users
      setGameState(prev => ({ ...prev, showCharacterCreation: true }));
    }

    // Apply motion reduction styles
    if (reducedMotion) {
      document.body.style.setProperty('--motion-reduce', '1');
      document.documentElement.style.setProperty('--reduce-motion', '1');
    }
  }, []);

  const handleCharacterCreated = async (characterData: { 
    username: string; 
    displayName: string; 
    avatarData: AvatarData 
  }) => {
    try {
      const response = await apiRequest('POST', '/api/auth/register', {
        username: characterData.username,
        displayName: characterData.displayName,
        avatarData: characterData.avatarData,
        level: 1,
        xp: 0,
        points: 0,
        totalWins: 0,
        totalLosses: 0
      });

      const user = await response.json();
      
      // Save to localStorage
      localStorage.setItem('bar-duel-character', JSON.stringify(user));
      
      setGameState(prev => ({ 
        ...prev, 
        user,
        showCharacterCreation: false 
      }));

      toast({
        title: "Welcome to Bar Duel!",
        description: `${user.displayName} has entered the arena.`,
      });
    } catch (error) {
      console.error('Failed to create character:', error);
      toast({
        title: "Character Creation Failed",
        description: "Please try again. If the issue persists, check your connection.",
        variant: "destructive",
      });
    }
  };

  const handleQuickMatch = (subject: string) => {
    // Create a mock opponent for the duel
    const mockOpponent: User = {
      id: 'opponent_1',
      username: 'eriedemon',
      displayName: 'Erie Demon',
      avatarData: {
        base: 'undead',
        palette: '#ef4444',
        props: ['chains', 'codex']
      },
      level: 8,
      xp: 380,
      points: 1340,
      totalWins: 45,
      totalLosses: 12,
      createdAt: new Date()
    };

    setGameState(prev => ({
      ...prev,
      currentView: 'duel',
      opponent: mockOpponent
    }));

    toast({
      title: "Match Found!",
      description: `Preparing duel against ${mockOpponent.displayName}`,
    });
  };

  const handleDuelEnd = () => {
    setGameState(prev => ({
      ...prev,
      currentView: 'dashboard',
      opponent: undefined
    }));

    toast({
      title: "Duel Complete",
      description: "Returning to the arena lobby.",
    });
  };

  const toggleMotionReduction = () => {
    const newReducedState = !motionReduced;
    setMotionReduced(newReducedState);
    localStorage.setItem('reduce-motion', newReducedState.toString());
    
    if (newReducedState) {
      document.body.style.setProperty('--motion-reduce', '1');
      document.querySelectorAll('*').forEach(el => {
        (el as HTMLElement).style.animationDuration = '0.01ms';
        (el as HTMLElement).style.transitionDuration = '0.01ms';
      });
    } else {
      document.body.style.removeProperty('--motion-reduce');
      window.location.reload(); // Simple reset
    }

    toast({
      title: motionReduced ? "Motion Enabled" : "Motion Reduced",
      description: motionReduced ? "Animations and transitions restored." : "Animations minimized for accessibility.",
    });
  };

  if (!gameState.user) {
    return (
      <div className="min-h-screen bg-dark-bg noise-overlay text-ink">
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-arcane border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-muted">Loading your legal arsenal...</p>
          </div>
        </div>
        
        <CharacterCreation
          isOpen={gameState.showCharacterCreation}
          onClose={() => setGameState(prev => ({ ...prev, showCharacterCreation: false }))}
          onCharacterCreated={handleCharacterCreated}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-dark-bg noise-overlay text-ink">
      {/* Navigation Header */}
      <header className="fixed top-0 left-0 right-0 z-50 panel border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo & Brand */}
            <div className="flex items-center space-x-3" data-testid="brand-logo">
              {/* Bar Duel Logo - Divine Angel Character */}
              <div className="w-10 h-10 rounded-xl overflow-hidden ring-2 ring-mystic-gold/50">
                <img 
                  src={angelLogo} 
                  alt="Bar Duel Logo" 
                  className="w-full h-full object-cover"
                />
              </div>
              <div>
                <h1 className="font-cinzel font-bold text-xl">Bar Duel</h1>
                <p className="text-xs text-muted">Arcane Legal Arena</p>
              </div>
            </div>
            
            {/* User Profile */}
            <div className="flex items-center space-x-4">
              <div className="hidden sm:block text-right">
                <p className="text-sm font-semibold" data-testid="user-display-name">{gameState.user.displayName}</p>
                <p className="text-xs text-muted" data-testid="user-stats">
                  Level {gameState.user.level} • {gameState.user.points.toLocaleString()} Points
                </p>
              </div>
              <AvatarRenderer
                avatarData={gameState.user.avatarData}
                level={gameState.user.level}
                size={48}
              />
              <Button
                variant="ghost"
                size="sm"
                className="p-2 rounded-lg hover:bg-white/5 transition-colors"
                data-testid="button-settings"
              >
                <i className="fas fa-cog text-muted"></i>
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="pt-20 pb-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {gameState.currentView === 'dashboard' && (
            <Dashboard 
              user={gameState.user}
              onQuickMatch={handleQuickMatch}
            />
          )}
          
          {gameState.currentView === 'duel' && gameState.opponent && (
            <DuelArena
              user={gameState.user}
              opponent={gameState.opponent}
              isVisible={true}
              onDuelEnd={handleDuelEnd}
            />
          )}
        </div>
      </main>

      {/* Floating Quick Match Button (Mobile) */}
      {gameState.currentView === 'dashboard' && (
        <Button 
          onClick={() => handleQuickMatch('Evidence')}
          className="fixed bottom-6 right-6 w-14 h-14 btn-primary rounded-full shadow-2xl lg:hidden animate-pulse-glow"
          data-testid="button-floating-quick-match"
        >
          <i className="fas fa-bolt"></i>
        </Button>
      )}

      {/* Accessibility Toggle */}
      <div className="fixed bottom-6 left-6">
        <Button
          onClick={toggleMotionReduction}
          variant="outline"
          size="sm"
          className="w-12 h-12 bg-panel border border-white/10 rounded-xl hover:bg-white/5 transition-colors"
          title={motionReduced ? "Enable Motion" : "Reduce Motion"}
          data-testid="button-toggle-motion"
        >
          <i className="fas fa-universal-access text-muted"></i>
        </Button>
      </div>

      {/* Character Creation Modal */}
      <CharacterCreation
        isOpen={gameState.showCharacterCreation}
        onClose={() => setGameState(prev => ({ ...prev, showCharacterCreation: false }))}
        onCharacterCreated={handleCharacterCreated}
      />

      {/* Screen Reader Announcements */}
      <div aria-live="polite" aria-atomic="true" className="sr-only" id="announcements"></div>
    </div>
  );
}
