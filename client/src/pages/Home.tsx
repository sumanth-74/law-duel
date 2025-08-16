import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { CharacterCreation } from '@/components/CharacterCreation';
import { QuickMatch } from '@/components/QuickMatch';
import { DuelArena } from '@/components/DuelArena';
import { Leaderboard } from '@/components/Leaderboard';
import { AvatarRenderer } from '@/components/AvatarRenderer';
import { StreakIndicator } from '@/components/StreakIndicator';
import AsyncInbox from '@/components/AsyncInbox';
import AsyncMatch from '@/components/AsyncMatch';
import BotPractice from '@/components/BotPractice';
import LawDuelLogo from '@/components/LawDuelLogo';
import { ChatbotButton } from '@/components/ChatbotButton';
import { AtticusDuel } from '@/components/AtticusDuel';
import { DailyChallenges } from '@/components/DailyChallenges';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { LogOut, User as UserIcon, Bell, CalendarDays, Heart, Users, Zap, ChevronRight, UserPlus, ArrowLeft, Trophy } from 'lucide-react';
import { Link } from 'wouter';
import type { User } from '@shared/schema';

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

// Removed BOT_DIFFICULTIES as we now use inline skill levels

interface ChallengeNotification {
  challengeId: string;
  challengerName: string;
  subject: string;
  expiresAt: string;
}

export default function Home() {
  const { user, logout } = useAuth();
  const { toast } = useToast();
  const [showCharacterCreation, setShowCharacterCreation] = useState(false);
  const [realTimeLeaderboard, setRealTimeLeaderboard] = useState<any[]>([]);
  const [challengeNotification, setChallengeNotification] = useState<ChallengeNotification | null>(null);
  const [showAsyncInbox, setShowAsyncInbox] = useState(false);
  const [showAsyncMatch, setShowAsyncMatch] = useState<string | null>(null);
  const [asyncNotificationCount, setAsyncNotificationCount] = useState(0);
  const wsRef = useRef<WebSocket | null>(null);
  
  // Check if new user needs character creation
  const needsCharacterCreation = user?.avatarData && 
    typeof user.avatarData === 'object' && 
    'needsCharacterCreation' in user.avatarData && 
    user.avatarData.needsCharacterCreation;
  const [gameMode, setGameMode] = useState<'menu' | 'bot-practice' | 'friend-setup' | 'searching' | 'duel' | 'vs-selection' | 'friend-challenge'>('menu');
  const [gameSettings, setGameSettings] = useState({
    subject: 'Mixed Questions',
    botDifficulty: 'medium',
    friendUsername: ''
  });
  const [opponent, setOpponent] = useState<User | null>(null);
  const [duelData, setDuelData] = useState<any>(null);
  const [duelWebSocket, setDuelWebSocket] = useState<WebSocket | null>(null);
  const [showAtticusDuel, setShowAtticusDuel] = useState(false);
  const [atticusCooldown, setAtticusCooldown] = useState<number | null>(null);
  const [showDailyChallenges, setShowDailyChallenges] = useState(false);

  // Fetch async inbox notifications count
  useEffect(() => {
    if (!user) return;

    const fetchNotificationCount = async () => {
      try {
        const response = await fetch('/api/async/inbox', {
          credentials: 'include'
        });
        if (response.ok) {
          const data = await response.json();
          const activeGames = data.matches?.filter((m: any) => m.status === 'active' && m.yourTurn) || [];
          setAsyncNotificationCount(activeGames.length);
        }
      } catch (error) {
        console.error('Error fetching notification count:', error);
      }
    };

    fetchNotificationCount();
    const interval = setInterval(fetchNotificationCount, 30000); // Check every 30 seconds

    return () => clearInterval(interval);
  }, [user]);

  // WebSocket connection for real-time features
  useEffect(() => {
    if (!user) return;

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log('Connected to real-time server');
    };

    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        
        switch (message.type) {
          case 'leaderboard:update':
            setRealTimeLeaderboard(message.payload.leaderboard);
            break;
            
          case 'challenge:received':
            setChallengeNotification(message.payload);
            toast({
              title: "Challenge Received!",
              description: `${message.payload.challengerName} wants to duel you in ${message.payload.subject}`,
              variant: "default"
            });
            break;
            
          case 'challenge:declined':
            toast({
              title: "Challenge Declined",
              description: `${message.payload.targetUsername} declined your challenge`,
              variant: "destructive"
            });
            break;
            
          case 'challenge:expired':
            toast({
              title: "Challenge Expired",
              description: `Your challenge to ${message.payload.targetUsername} has expired`,
              variant: "destructive"
            });
            break;
            
          case 'duel:friend_match_start':
            toast({
              title: "Match Starting!",
              description: "Your friend duel is about to begin",
              variant: "default"
            });
            setGameMode('duel');
            setDuelData(message.payload);
            break;
            
          case 'async:turn_notification':
            setAsyncNotificationCount(prev => prev + 1);
            toast({
              title: "Your Turn!",
              description: `${message.payload.opponentName} made their move in your game`,
              variant: "default"
            });
            break;
        }
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
      }
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };

    ws.onclose = () => {
      console.log('WebSocket connection closed');
    };

    return () => {
      ws.close();
    };
  }, [user, toast]);

  // Start async friend game
  const handleStartAsyncFriendGame = async () => {
    if (!gameSettings.friendUsername.trim()) {
      toast({
        title: "Username Required",
        description: "Please enter your friend's username",
        variant: "destructive"
      });
      return;
    }

    try {
      const response = await apiRequest(
        'POST',
        '/api/async/create',
        {
          opponentUsername: gameSettings.friendUsername,
          subject: gameSettings.subject
        }
      );

      const data = await response.json();
      
      // Check if this is an existing match or a new one
      if (data.existing) {
        toast({
          title: "Existing Match Found",
          description: `You already have an active match with ${gameSettings.friendUsername}. Opening that match.`,
          variant: "default"
        });
      } else {
        toast({
          title: "Game Started!",
          description: `New game with ${gameSettings.friendUsername}`,
          variant: "default"
        });
      }

      // Clear the username field
      setGameSettings(prev => ({ ...prev, friendUsername: '' }));
      
      // Open the async match directly
      if (data.matchId) {
        setShowAsyncMatch(data.matchId);
      }
    } catch (error) {
      toast({
        title: "Failed to Start Game",
        description: error instanceof Error ? error.message : "Could not start game with this user",
        variant: "destructive"
      });
    }
  };

  // Send friend challenge (for live challenges - kept for future use)
  const sendFriendChallenge = async () => {
    if (!gameSettings.friendUsername.trim()) {
      toast({
        title: "Username Required",
        description: "Please enter your friend's username",
        variant: "destructive"
      });
      return;
    }

    try {
      await apiRequest(
        'POST',
        '/api/challenge/send',
        {
          targetUsername: gameSettings.friendUsername,
          subject: gameSettings.subject
        }
      );

      toast({
        title: "Challenge Sent!",
        description: `Challenge sent to ${gameSettings.friendUsername}`,
        variant: "default"
      });

      setGameMode('menu');
    } catch (error) {
      toast({
        title: "Challenge Failed",
        description: error instanceof Error ? error.message : "Failed to send challenge",
        variant: "destructive"
      });
    }
  };

  // Respond to challenge
  const respondToChallenge = async (accepted: boolean) => {
    if (!challengeNotification) return;

    try {
      await apiRequest(
        'POST',
        '/api/challenge/respond',
        {
          challengeId: challengeNotification.challengeId,
          accepted
        }
      );

      if (accepted) {
        toast({
          title: "Challenge Accepted!",
          description: "Starting match...",
          variant: "default"
        });
      }

      setChallengeNotification(null);
    } catch (error) {
      toast({
        title: "Response Failed",
        description: error instanceof Error ? error.message : "Failed to respond to challenge",
        variant: "destructive"
      });
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center text-slate-300">
          <UserIcon className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>Loading your character...</p>
        </div>
      </div>
    );
  }

  const character = user;

  // Show character creation for new users or when manually requested
  if (showCharacterCreation || needsCharacterCreation) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <CharacterCreation 
          isOpen={true}
          editMode={!needsCharacterCreation}
          existingUser={!needsCharacterCreation ? {
            username: user?.username || '',
            displayName: user?.displayName || '',
            lawSchool: user?.lawSchool || '',
            avatarData: user?.avatarData || { base: 'humanoid', palette: '#5865f2', props: [] }
          } : undefined}
          onClose={() => {
            setShowCharacterCreation(false);
            // For new users, don't allow closing without creating character
            if (needsCharacterCreation) {
              logout.mutate(); // Force them to complete character creation
            }
          }} 
          onCharacterCreated={async (newCharacter) => {
            // Update user in database with new character data
            try {
              const response = await fetch(`/api/users/${user?.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({
                  displayName: newCharacter.displayName,
                  avatarData: {
                    ...newCharacter.avatarData,
                    needsCharacterCreation: false // Remove the flag
                  }
                })
              });
              
              if (response.ok) {
                // Refresh user data
                window.location.reload();
              }
            } catch (error) {
              console.error('Failed to update character:', error);
            }
            setShowCharacterCreation(false);
          }} 
        />
      </div>
    );
  }

  const handleStartBotGame = () => {
    // Create WebSocket connection for the full match flow
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    const matchWebSocket = new WebSocket(wsUrl);
    
    matchWebSocket.onopen = () => {
      console.log('Connected to matchmaking server for bot game');
      
      // Register presence first
      const savedCharacter = localStorage.getItem('bar-duel-character');
      if (savedCharacter) {
        const profile = JSON.parse(savedCharacter);
        matchWebSocket.send(JSON.stringify({
          type: 'presence:hello',
          payload: { username: profile.username, profile }
        }));
      }
      
      // Join queue for bot match
      matchWebSocket.send(JSON.stringify({
        type: 'queue:join',
        payload: { 
          subject: gameSettings.subject,
          botDifficulty: gameSettings.botDifficulty
        }
      }));
    };

    matchWebSocket.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        console.log('Bot match websocket message:', message.type);

        if (message.type === 'duel:start') {
          console.log('Bot match starting with persistent connection');
          
          // Create opponent from match data
          const matchData = message.payload;
          setOpponent(matchData.opponent);
          setDuelData(matchData);
          setDuelWebSocket(matchWebSocket); // Pass the SAME WebSocket to duel
          setGameMode('duel');
        }
      } catch (error) {
        console.error('Error parsing bot match WebSocket message:', error);
      }
    };

    matchWebSocket.onerror = (error) => {
      console.error('Bot match WebSocket error:', error);
    };

    // Set searching mode while waiting for match
    setGameMode('searching');
  };

  const handleStartFriendGame = async () => {
    if (!gameSettings.friendUsername.trim()) return;
    
    setGameMode('searching');
    
    try {
      // First, search for the friend to verify they exist
      const searchResponse = await fetch('/api/auth/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: gameSettings.friendUsername.trim() })
      });
      
      if (!searchResponse.ok) {
        const error = await searchResponse.json();
        toast({
          title: "Friend not found",
          description: `Could not find user "${gameSettings.friendUsername}"`,
          variant: "destructive"
        });
        setGameMode('menu');
        return;
      }
      
      const friendData = await searchResponse.json();
      
      // Create async match with friend
      const createMatchResponse = await fetch('/api/async/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject: gameSettings.subject,
          opponentUsername: gameSettings.friendUsername.trim()
        })
      });
      
      if (!createMatchResponse.ok) {
        const error = await createMatchResponse.json();
        toast({
          title: "Failed to create match",
          description: error.message || "Could not start a match with this friend",
          variant: "destructive"
        });
        setGameMode('menu');
        return;
      }
      
      const matchData = await createMatchResponse.json();
      
      // Check if this is an existing match or a new one
      if (matchData.existing) {
        toast({
          title: "Existing match found",
          description: `You already have an active match with ${friendData.displayName || friendData.username}. Opening that match instead.`,
        });
        
        // Open the existing match
        setShowAsyncMatch(matchData.matchId);
        setGameMode('menu');
      } else {
        // New match created
        setOpponent(friendData);
        setDuelData({
          roomCode: matchData.matchId,
          subject: gameSettings.subject,
          bestOf: 10,
          ranked: true,
          stake: 10,
          asyncMatch: matchData.match // Store the async match data
        });
        
        toast({
          title: "Match created!",
          description: `Started async duel with ${friendData.displayName || friendData.username}`,
        });
        
        // For async matches, we should navigate to a different view
        // For now, show the match has been created and return to menu
        setTimeout(() => {
          setGameMode('menu');
          toast({
            title: "Check your inbox",
            description: "Your async match has been created. Check your inbox to play!",
          });
        }, 2000);
      }
      
    } catch (error) {
      console.error('Error creating friend match:', error);
      toast({
        title: "Error",
        description: "Failed to create match. Please try again.",
        variant: "destructive"
      });
      setGameMode('menu');
    }
  };

  const handleDuelEnd = () => {
    // Clean up the WebSocket connection when duel ends
    if (duelWebSocket) {
      duelWebSocket.close();
      setDuelWebSocket(null);
    }
    setGameMode('menu');
    setOpponent(null);
    setDuelData(null);
  };

  const handleRematch = () => {
    if (duelData) {
      // Reset duel with same opponent and settings
      setDuelData({
        ...duelData,
        roomCode: `rematch_${Date.now()}`
      });
    }
  };

  if (gameMode === 'duel' && opponent && duelData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
        {/* Daily Streak at top */}
        <div className="fixed top-4 left-4 right-4 z-10">
          <StreakIndicator />
        </div>
        
        {/* Persistent Logo and Gamer Tag - Below Streak */}
        <div className="fixed top-20 left-4 right-4 z-10 flex items-center justify-between">
          <LawDuelLogo size="sm" showText={true} className="bg-purple-900/30 backdrop-blur-sm rounded-lg px-3 py-2 border border-purple-500/30" />
          <Badge variant="outline" className="border-purple-400/50 text-purple-300 bg-purple-900/30 backdrop-blur-sm">
            @{character.username}
          </Badge>
        </div>
        
        <DuelArena
          user={character}
          opponent={opponent}
          isVisible={true}
          websocket={duelWebSocket}
          onDuelEnd={handleDuelEnd}
        />
        <div className="fixed bottom-4 right-4 space-x-2">
          <Button onClick={handleRematch} variant="outline" size="sm" className="border-purple-500/50 text-purple-300 hover:bg-purple-500/20">
            Rematch
          </Button>
          <Button onClick={handleDuelEnd} variant="outline" size="sm" className="border-purple-500/50 text-purple-300 hover:bg-purple-500/20">
            Main Menu
          </Button>
        </div>
      </div>
    );
  }

  if (gameMode === 'bot-practice') {
    // If Atticus duel is active, show that instead
    if (showAtticusDuel) {
      return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
          {/* Daily Streak at top */}
          <div className="fixed top-4 left-4 right-4 z-10">
            <StreakIndicator />
          </div>
          
          {/* Persistent Logo and Gamer Tag - Below Streak */}
          <div className="fixed top-20 left-4 right-4 z-10 flex items-center justify-between">
            <LawDuelLogo size="sm" showText={true} className="bg-purple-900/30 backdrop-blur-sm rounded-lg px-3 py-2 border border-purple-500/30" />
            <Badge variant="outline" className="border-purple-400/50 text-purple-300 bg-purple-900/30 backdrop-blur-sm">
              @{character.username}
            </Badge>
          </div>
          
          <div className="pt-36 px-4">
            <AtticusDuel 
              userId={user!.id}
              onVictory={() => {
                setShowAtticusDuel(false);
                // Return to menu after victory
                setGameMode('menu');
                toast({
                  title: "Victory!",
                  description: "You've defeated Atticus and restored your lives! +100 XP bonus!",
                  variant: "default"
                });
              }}
              onDefeat={() => {
                setShowAtticusDuel(false);
                // Set cooldown for 24 hours
                setAtticusCooldown(Date.now() + 24 * 60 * 60 * 1000);
                setGameMode('menu');
                toast({
                  title: "Defeated",
                  description: "Atticus has bested you. Come back tomorrow or pay to retry.",
                  variant: "destructive"
                });
              }}
              onRetreat={() => {
                setShowAtticusDuel(false);
                setGameMode('menu');
              }}
            />
          </div>
        </div>
      );
    }

    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
        {/* Daily Streak at top */}
        <div className="fixed top-4 left-4 right-4 z-10">
          <StreakIndicator />
        </div>
        
        {/* Persistent Logo and Gamer Tag - Below Streak */}
        <div className="fixed top-20 left-4 right-4 z-10 flex items-center justify-between">
          <LawDuelLogo size="sm" showText={true} className="bg-purple-900/30 backdrop-blur-sm rounded-lg px-3 py-2 border border-purple-500/30" />
          <Badge variant="outline" className="border-purple-400/50 text-purple-300 bg-purple-900/30 backdrop-blur-sm">
            @{character.username}
          </Badge>
        </div>
        
        <div className="pt-36 px-4">
          <BotPractice 
            onBack={() => setGameMode('menu')} 
            onLivesLost={(challenge) => {
              // Trigger Atticus duel when lives are lost
              setShowAtticusDuel(true);
              toast({
                title: "All Lives Lost! But Wait...",
                description: "Beat Atticus the Purple Wizard Cat to restore all 3 lives and continue playing!",
                variant: "default"
              });
            }}
          />
        </div>
      </div>
    );
  }

  if (gameMode === 'searching') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        {/* Daily Streak at top */}
        <div className="fixed top-4 left-4 right-4 z-10">
          <StreakIndicator />
        </div>
        
        {/* Persistent Logo and Gamer Tag - Below Streak */}
        <div className="fixed top-20 left-4 right-4 z-10 flex items-center justify-between">
          <LawDuelLogo size="sm" showText={true} className="bg-purple-900/30 backdrop-blur-sm rounded-lg px-3 py-2 border border-purple-500/30" />
          <Badge variant="outline" className="border-purple-400/50 text-purple-300 bg-purple-900/30 backdrop-blur-sm">
            @{character.username}
          </Badge>
        </div>
        
        <Card className="bg-black/40 border-purple-500/20 max-w-md">
          <CardContent className="p-8 text-center">
            <div className="w-16 h-16 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <h3 className="font-cinzel text-xl font-bold mb-2 text-purple-200">Searching for {gameSettings.friendUsername}</h3>
            <p className="text-purple-400 mb-4">Sending duel invitation...</p>
            <Button onClick={() => setGameMode('menu')} variant="outline" className="border-purple-500/50 text-purple-300 hover:bg-purple-500/20">
              Cancel
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      <div className="container max-w-4xl mx-auto py-8 px-4">
        {/* Daily Streak Indicator - Always at the top */}
        <div className="mb-6">
          <StreakIndicator />
        </div>
        
        {/* Header with Logo and Persistent Gamer Tag */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center space-x-6">
            <LawDuelLogo size="lg" showText={true} />
            <div className="flex items-center space-x-4">
              <AvatarRenderer
                avatarData={character.avatarData as any}
                level={character.level}
                size={64}
              />
              <div>
                <div className="flex items-center gap-3 flex-wrap">
                  <h1 className="font-cinzel text-2xl font-bold text-purple-200">{character.displayName}</h1>
                  <Badge variant="outline" className="border-purple-400/50 text-purple-300 bg-purple-900/20">
                    @{character.username}
                  </Badge>
                  {character.lawSchool && (
                    <Badge variant="outline" className="border-amber-400/50 text-amber-300 bg-amber-900/20">
                      {character.lawSchool.includes('Law School') ? 
                        character.lawSchool.split(' Law School')[0] : 
                        character.lawSchool.split(' ')[0]
                      }
                    </Badge>
                  )}
                </div>
                <p className="text-purple-400">
                  Level {character.level} • {character.points} Points
                </p>
              </div>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Button 
              onClick={() => setShowCharacterCreation(true)} 
              variant="outline" 
              size="sm"
              className="border-purple-500/50 text-purple-300 hover:bg-purple-500/20 hover:border-purple-400"
            >
              Edit Character
            </Button>
            <Button
              onClick={() => window.location.href = '/stats'}
              variant="outline"
              size="sm"
              className="border-purple-500/50 text-purple-300 hover:bg-purple-500/20 hover:border-purple-400"
            >
              <UserIcon className="h-4 w-4 mr-2" />
              My Stats
            </Button>
            <Button 
              onClick={() => logout.mutate()} 
              variant="outline" 
              size="sm"
              className="border-red-500/50 text-red-400 hover:bg-red-500/20 hover:border-red-400"
            >
              <LogOut className="h-4 w-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>

        {/* Daily Casefile Banner */}
        <Card className="bg-gradient-to-r from-amber-900/40 via-yellow-900/40 to-orange-900/40 border-amber-500/30 mb-6">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <CalendarDays className="w-8 h-8 text-amber-400" />
                <div>
                  <h3 className="font-cinzel text-lg font-bold text-amber-200">Daily Casefile</h3>
                  <p className="text-amber-300 text-sm">Hard question • Enhanced rewards • Resets daily</p>
                </div>
              </div>
              <Link href="/daily">
                <Button className="bg-amber-600 hover:bg-amber-700 text-white border-0">
                  Take Challenge
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* Daily Challenges & Rewards Button */}
        <Card 
          className="bg-gradient-to-r from-yellow-900/40 via-orange-900/40 to-yellow-900/40 border-yellow-500/30 hover:border-yellow-400/50 transition-all cursor-pointer mb-6"
          onClick={() => setShowDailyChallenges(true)}
        >
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Trophy className="w-8 h-8 text-yellow-400" />
                <div>
                  <h3 className="font-cinzel text-lg font-bold text-yellow-200">Daily Challenges & Rewards</h3>
                  <p className="text-yellow-300/70 text-sm">Complete challenges to earn XP, points and streak rewards!</p>
                </div>
              </div>
              <ChevronRight className="w-6 h-6 text-yellow-400" />
            </div>
          </CardContent>
        </Card>

        {/* Main Game Mode Selection */}
        {gameMode === 'menu' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            {/* Solo Mode */}
            <Card className="bg-gradient-to-br from-indigo-900/40 to-blue-900/40 border-indigo-500/30 hover:border-indigo-400/50 transition-all">
              <CardHeader className="pb-4">
                <CardTitle className="font-cinzel text-2xl flex items-center gap-3 text-indigo-300">
                  <UserIcon className="w-8 h-8 text-indigo-400" />
                  Solo Mode
                </CardTitle>
                <p className="text-indigo-300/80 text-sm mt-2">
                  Progressive difficulty • 3 Lives system • Test your limits
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="bg-indigo-950/40 rounded-lg p-4 space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-indigo-300">Starting Difficulty</span>
                    <Badge className="bg-indigo-600/30 text-indigo-200 border-indigo-500/50">Level 1</Badge>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-indigo-300">Lives</span>
                    <div className="flex gap-1">
                      <Heart className="w-4 h-4 text-red-400 fill-red-400" />
                      <Heart className="w-4 h-4 text-red-400 fill-red-400" />
                      <Heart className="w-4 h-4 text-red-400 fill-red-400" />
                    </div>
                  </div>
                </div>
                <Button 
                  onClick={() => {
                    console.log('Solo Challenge clicked, setting gameMode to bot-practice');
                    setGameMode('bot-practice');
                  }}
                  className="w-full bg-indigo-600 hover:bg-indigo-700 text-white"
                  size="lg"
                >
                  Start Solo Challenge
                </Button>
              </CardContent>
            </Card>

            {/* VS Mode */}
            <Card className="bg-gradient-to-br from-purple-900/40 to-pink-900/40 border-purple-500/30 hover:border-purple-400/50 transition-all">
              <CardHeader className="pb-4">
                <CardTitle className="font-cinzel text-2xl flex items-center gap-3 text-purple-300">
                  <Users className="w-8 h-8 text-purple-400" />
                  VS Mode
                </CardTitle>
                <p className="text-purple-300/80 text-sm mt-2">
                  Play against friends or random opponents
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="bg-purple-950/40 rounded-lg p-4 space-y-2">
                  <Button 
                    onClick={() => setGameMode('vs-selection')}
                    className="w-full bg-purple-600 hover:bg-purple-700 text-white justify-between"
                    size="lg"
                  >
                    <span className="flex items-center gap-2">
                      <Zap className="w-5 h-5" />
                      Live Duel
                    </span>
                    <ChevronRight className="w-5 h-5" />
                  </Button>
                  <p className="text-xs text-purple-300/60 text-center">Match with random player or bot instantly</p>
                </div>
                <div className="bg-purple-950/40 rounded-lg p-4 space-y-2">
                  <Button 
                    onClick={() => setGameMode('friend-challenge')}
                    className="w-full bg-pink-600 hover:bg-pink-700 text-white justify-between"
                    size="lg"
                  >
                    <span className="flex items-center gap-2">
                      <UserPlus className="w-5 h-5" />
                      Friend Challenge
                    </span>
                    <ChevronRight className="w-5 h-5" />
                  </Button>
                  <p className="text-xs text-purple-300/60 text-center">Challenge a specific friend by username</p>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* VS Mode Selection Screen */}
        {gameMode === 'vs-selection' && (
          <Card className="bg-black/40 border-purple-500/20 max-w-2xl mx-auto">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="font-cinzel text-xl flex items-center gap-2 text-purple-300">
                  ⚔️ Live Duel Setup
                </CardTitle>
                <Button
                  onClick={() => setGameMode('menu')}
                  variant="ghost"
                  size="sm"
                  className="text-purple-400 hover:text-purple-300"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Subject</label>
                <Select 
                  value={gameSettings.subject} 
                  onValueChange={(value) => setGameSettings(prev => ({ ...prev, subject: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SUBJECTS.map(subject => (
                      <SelectItem key={subject} value={subject}>{subject}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                    </div>
                    
                    <div>
                      <label className="text-sm font-medium mb-2 block">Opponent Skill Level</label>
                      <Select 
                        value={gameSettings.botDifficulty}
                        onValueChange={(value) => setGameSettings(prev => ({ ...prev, botDifficulty: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="easy">
                            <div>
                              <div className="font-medium">Novice</div>
                              <div className="text-xs text-muted">Beginner level opponents</div>
                            </div>
                          </SelectItem>
                          <SelectItem value="medium">
                            <div>
                              <div className="font-medium">Intermediate</div>
                              <div className="text-xs text-muted">Average skill level</div>
                            </div>
                          </SelectItem>
                          <SelectItem value="hard">
                            <div>
                              <div className="font-medium">Advanced</div>
                              <div className="text-xs text-muted">Experienced players</div>
                            </div>
                          </SelectItem>
                          <SelectItem value="expert">
                            <div>
                              <div className="font-medium">Expert</div>
                              <div className="text-xs text-muted">Top tier opponents</div>
                            </div>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="pt-4">
                      <Button onClick={handleStartBotGame} className="w-full bg-purple-600 hover:bg-purple-700 text-white" size="lg">
                        Start Live Duel
                      </Button>
                      <p className="text-xs text-purple-300/60 text-center mt-2">
                        Matches you with a random player or bot
                      </p>
                    </div>
                  </CardContent>
                </Card>
        )}

        {/* Friend Challenge Screen */}
        {gameMode === 'friend-challenge' && (
          <Card className="bg-black/40 border-purple-500/20 max-w-2xl mx-auto">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="font-cinzel text-xl flex items-center gap-2 text-purple-300">
                  👥 Friend Challenge
                </CardTitle>
                <Button
                  onClick={() => setGameMode('menu')}
                  variant="ghost"
                  size="sm"
                  className="text-purple-400 hover:text-purple-300"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Friend's Username</label>
                <Input
                  placeholder="Enter friend's username"
                  value={gameSettings.friendUsername}
                  onChange={(e) => setGameSettings(prev => ({ ...prev, friendUsername: e.target.value }))}
                  className="w-full"
                  onKeyPress={(e) => {
                    if (e.key === 'Enter' && gameSettings.friendUsername.trim()) {
                      handleStartAsyncFriendGame();
                    }
                  }}
                />
              </div>
              
              <div>
                <label className="text-sm font-medium mb-2 block">Subject</label>
                <Select 
                  value={gameSettings.subject}
                  onValueChange={(value) => setGameSettings(prev => ({ ...prev, subject: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SUBJECTS.map(subject => (
                      <SelectItem key={subject} value={subject}>{subject}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="pt-4">
                <Button 
                  onClick={handleStartAsyncFriendGame}
                  className="w-full bg-pink-600 hover:bg-pink-700 text-white" 
                  size="lg"
                  disabled={!gameSettings.friendUsername.trim()}
                >
                  Challenge Friend
                </Button>
              </div>
              
              <div className="border-t border-purple-500/20 pt-4">
                <Button 
                  onClick={() => setShowAsyncInbox(true)}
                  className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white" 
                  size="lg"
                >
                  <Bell className={`h-4 w-4 mr-2 ${asyncNotificationCount > 0 ? 'animate-pulse' : ''}`} />
                  View Active Games
                  {asyncNotificationCount > 0 && (
                    <Badge className="ml-2 bg-red-500 text-white">{asyncNotificationCount}</Badge>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Leaderboard - Always visible on the right side */}
        {gameMode === 'menu' && (
          <div className="mt-6">
            <Leaderboard />
          </div>
        )}

        {/* Async Inbox */}
        <AsyncInbox
          isOpen={showAsyncInbox}
          onClose={() => setShowAsyncInbox(false)}
          onPlayMatch={(matchId) => {
            setShowAsyncMatch(matchId);
            setShowAsyncInbox(false);
          }}
        />

        {/* Async Match */}
        {showAsyncMatch && (
          <AsyncMatch
            matchId={showAsyncMatch}
            isOpen={!!showAsyncMatch}
            onClose={() => {
              setShowAsyncMatch(null);
              setShowAsyncInbox(true); // Return to inbox
            }}
          />
        )}
        
        {/* Daily Challenges Modal */}
        {showDailyChallenges && (
          <DailyChallenges onClose={() => setShowDailyChallenges(false)} />
        )}

        {/* Floating Chatbot Button */}
        <ChatbotButton 
          variant="floating"
          currentSubject={gameSettings.subject !== 'Mixed Questions' ? gameSettings.subject : undefined}
        />
      </div>
    </div>
  );
}