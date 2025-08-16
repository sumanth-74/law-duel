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
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { LogOut, User as UserIcon, Bell, CalendarDays, Heart, Users, Zap, ChevronRight, UserPlus, ArrowLeft, Trophy, GraduationCap, Globe, Share2, Copy, BarChart3, Edit, Shield, Sword, Gamepad2 } from 'lucide-react';
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
    friendUsername: '',
    questionType: 'bar' as 'bar' | 'realWorld'
  });
  const [opponent, setOpponent] = useState<User | null>(null);
  const [duelData, setDuelData] = useState<any>(null);
  const [duelWebSocket, setDuelWebSocket] = useState<WebSocket | null>(null);
  const [showAtticusDuel, setShowAtticusDuel] = useState(false);
  const [atticusCooldown, setAtticusCooldown] = useState<number | null>(null);

  // Handle auto-open match from challenge link
  useEffect(() => {
    const autoOpenMatchId = localStorage.getItem('autoOpenMatch');
    if (autoOpenMatchId && user) {
      setShowAsyncMatch(autoOpenMatchId);
      localStorage.removeItem('autoOpenMatch');
    }
  }, [user]);

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
          subject: gameSettings.subject,
          questionType: gameSettings.questionType
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
          botDifficulty: gameSettings.botDifficulty,
          questionType: gameSettings.questionType
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
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 relative overflow-hidden">
      {/* Animated background effects */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-purple-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-cyan-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-2000"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-pink-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-4000"></div>
      </div>
      
      <div className="container max-w-4xl mx-auto py-8 px-4 relative">
        {/* Daily Streak Indicator - Always at the top */}
        <div className="mb-6">
          <StreakIndicator />
        </div>
        
        {/* Epic Header Section */}
        <div className="relative mb-8">
          {/* Header card with glass morphism */}
          <div className="relative bg-gradient-to-r from-slate-950/80 via-purple-950/80 to-slate-950/80 backdrop-blur-2xl rounded-2xl border border-purple-500/30 p-6 shadow-2xl overflow-hidden">
            {/* Animated gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-r from-purple-600/10 via-pink-600/10 to-purple-600/10 animate-pulse"></div>
            
            <div className="relative flex items-center justify-between">
              <div className="flex items-center space-x-6">
                {/* Epic Logo */}
                <div className="relative">
                  <div className="absolute inset-0 bg-purple-600 blur-xl opacity-30"></div>
                  <LawDuelLogo size="lg" showText={true} className="relative" />
                </div>
                
                {/* Character Profile */}
                <div className="flex items-center space-x-5">
                  {/* Avatar with glow effect */}
                  <div className="relative group">
                    <div className="absolute -inset-1 bg-gradient-to-r from-purple-600 to-pink-600 rounded-full blur-md opacity-50 group-hover:opacity-75 transition duration-300"></div>
                    <div className="relative bg-slate-900 rounded-full p-1">
                      <AvatarRenderer
                        avatarData={character.avatarData as any}
                        level={character.level}
                        size={72}
                      />
                    </div>
                  </div>
                  
                  <div>
                    {/* Name and badges */}
                    <div className="flex items-center gap-3 flex-wrap mb-2">
                      <h1 className="font-cinzel text-3xl font-bold bg-gradient-to-r from-purple-200 via-pink-200 to-purple-200 bg-clip-text text-transparent">
                        {character.displayName}
                      </h1>
                      <Badge className="bg-purple-600/30 text-purple-200 border-purple-500/50 px-3 py-1">
                        @{character.username}
                      </Badge>
                      {character.lawSchool && (
                        <Badge className="bg-amber-600/30 text-amber-200 border-amber-500/50 px-3 py-1">
                          {character.lawSchool.includes('Law School') ? 
                            character.lawSchool.split(' Law School')[0] : 
                            character.lawSchool.split(' ')[0]
                          }
                        </Badge>
                      )}
                    </div>
                    
                    {/* Stats bar */}
                    <div className="flex items-center gap-6">
                      <div className="flex items-center gap-2">
                        <div className="text-cyan-400 text-sm">LEVEL</div>
                        <div className="bg-gradient-to-r from-cyan-600/30 to-blue-600/30 px-3 py-1 rounded-lg border border-cyan-500/30">
                          <span className="font-bold text-cyan-200">{character.level}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="text-purple-400 text-sm">POINTS</div>
                        <div className="bg-gradient-to-r from-purple-600/30 to-pink-600/30 px-3 py-1 rounded-lg border border-purple-500/30">
                          <span className="font-bold text-purple-200">{character.points.toLocaleString()}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="text-green-400 text-sm">XP</div>
                        <div className="bg-gradient-to-r from-green-600/30 to-emerald-600/30 px-3 py-1 rounded-lg border border-green-500/30">
                          <span className="font-bold text-green-200">{character.xp}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Action buttons - Premium Style */}
              <div className="flex items-center gap-3">
                <Button 
                  onClick={() => setShowCharacterCreation(true)} 
                  className="relative group bg-gradient-to-r from-purple-900/70 to-indigo-900/70 hover:from-purple-800/80 hover:to-indigo-800/80 border-2 border-purple-500/60 hover:border-purple-400/80 text-purple-100 px-4 py-2 transition-all duration-300 shadow-lg hover:shadow-purple-500/40"
                  size="sm"
                >
                  <span className="absolute inset-0 bg-gradient-to-r from-purple-600 to-indigo-600 opacity-0 group-hover:opacity-15 transition-opacity duration-300 rounded-md"></span>
                  <span className="relative flex items-center gap-2 font-bold uppercase tracking-wider text-xs">
                    <Edit className="h-4 w-4" />
                    EDIT
                  </span>
                </Button>
                <Button
                  onClick={() => window.location.href = '/stats'}
                  className="relative group bg-gradient-to-r from-cyan-900/70 to-blue-900/70 hover:from-cyan-800/80 hover:to-blue-800/80 border-2 border-cyan-500/60 hover:border-cyan-400/80 text-cyan-100 px-4 py-2 transition-all duration-300 shadow-lg hover:shadow-cyan-500/40"
                  size="sm"
                >
                  <span className="absolute inset-0 bg-gradient-to-r from-cyan-600 to-blue-600 opacity-0 group-hover:opacity-15 transition-opacity duration-300 rounded-md"></span>
                  <span className="relative flex items-center gap-2 font-bold uppercase tracking-wider text-xs">
                    <BarChart3 className="h-4 w-4" />
                    STATS
                  </span>
                </Button>
                <Button 
                  onClick={() => logout.mutate()} 
                  className="relative group bg-gradient-to-r from-red-900/70 to-orange-900/70 hover:from-red-800/80 hover:to-orange-800/80 border-2 border-red-500/60 hover:border-red-400/80 text-red-100 px-4 py-2 transition-all duration-300 shadow-lg hover:shadow-red-500/40"
                  size="sm"
                >
                  <span className="absolute inset-0 bg-gradient-to-r from-red-600 to-orange-600 opacity-0 group-hover:opacity-15 transition-opacity duration-300 rounded-md"></span>
                  <span className="relative flex items-center gap-2 font-bold uppercase tracking-wider text-xs">
                    <LogOut className="h-4 w-4" />
                    LOGOUT
                  </span>
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* LEGENDARY DAILY QUEST - EPIC GOLDEN BANNER */}
        <div className="relative mb-8 group">
          {/* Multiple magical glows for legendary effect */}
          <div className="absolute -inset-2 opacity-80">
            <div className="absolute inset-0 bg-gradient-to-r from-amber-600 via-yellow-500 to-orange-600 blur-3xl opacity-60 group-hover:opacity-90 transition-opacity duration-700 animate-[pulseGlow_2s_ease-in-out_infinite]"></div>
            <div className="absolute inset-0 bg-gradient-to-r from-yellow-400 to-amber-400 blur-2xl opacity-40 animate-pulse"></div>
          </div>
          
          <Card className="relative luxury-card border-2 border-amber-400/60 hover:border-amber-300/80 transition-all duration-500 backdrop-blur-2xl overflow-hidden shadow-[0_0_60px_rgba(251,191,36,0.5)] group-hover:shadow-[0_0_100px_rgba(251,191,36,0.7)] transform group-hover:scale-[1.01]">
            {/* Epic shimmer overlay */}
            <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-1000">
              <div className="absolute inset-0 bg-[linear-gradient(105deg,transparent_30%,rgba(255,255,255,0.2)_50%,transparent_70%)] animate-shimmer bg-[length:200%_100%]"></div>
            </div>
            
            {/* Animated magical particles */}
            <div className="absolute inset-0 opacity-20">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_50%,rgba(251,191,36,0.4),transparent_40%)]"></div>
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_50%,rgba(251,146,60,0.4),transparent_40%)]"></div>
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(250,204,21,0.3),transparent_60%)]"></div>
            </div>
            
            <CardContent className="relative p-8">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-6">
                  {/* Epic floating trophy */}
                  <div className="relative animate-[orbFloat_4s_ease-in-out_infinite]">
                    <div className="absolute inset-0 bg-gradient-to-r from-amber-400 to-yellow-400 blur-2xl opacity-70"></div>
                    <div className="relative w-16 h-16 bg-gradient-to-br from-amber-500 via-yellow-500 to-orange-500 rounded-2xl flex items-center justify-center shadow-[0_0_50px_rgba(251,191,36,0.7)] animate-[legendaryGlow_3s_ease-in-out_infinite]">
                      <Trophy className="w-10 h-10 text-white drop-shadow-[0_0_10px_rgba(255,255,255,0.9)]" />
                    </div>
                  </div>
                  <div>
                    <h3 className="font-cinzel text-3xl font-black animate-[textGlowPulse_3s_ease-in-out_infinite] bg-gradient-to-r from-amber-100 via-yellow-100 to-amber-100 bg-clip-text text-transparent tracking-wide">
                      LEGENDARY DAILY QUEST
                    </h3>
                    <div className="flex items-center gap-3 mt-2">
                      <Badge className="bg-gradient-to-r from-red-900/50 to-orange-900/50 text-red-200 border border-red-400/60 text-xs font-bold uppercase tracking-wider shadow-lg flex items-center gap-1">
                        <Zap className="w-3 h-3" />
                        EXTREME MODE
                      </Badge>
                      <Badge className="bg-gradient-to-r from-green-900/50 to-emerald-900/50 text-green-200 border border-green-400/60 text-xs font-bold uppercase tracking-wider shadow-lg flex items-center gap-1">
                        <Trophy className="w-3 h-3" />
                        3X REWARDS
                      </Badge>
                      <Badge className="bg-gradient-to-r from-blue-900/50 to-indigo-900/50 text-blue-200 border border-blue-400/60 text-xs font-bold uppercase tracking-wider shadow-lg flex items-center gap-1">
                        <Shield className="w-3 h-3" />
                        LIMITED TIME
                      </Badge>
                    </div>
                  </div>
                </div>
                <Link href="/daily">
                  <Button className="relative group/btn bg-gradient-to-r from-amber-600 via-yellow-600 to-amber-600 hover:from-amber-500 hover:via-yellow-500 hover:to-amber-500 text-white border-2 border-amber-400/60 px-12 py-7 text-xl font-black shadow-[0_6px_30px_rgba(251,191,36,0.5)] hover:shadow-[0_8px_40px_rgba(251,191,36,0.7)] transition-all duration-500 transform hover:scale-110">
                    <span className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/30 to-white/0 opacity-0 group-hover/btn:opacity-100 transition-opacity duration-700 rounded-md"></span>
                    <span className="relative flex items-center gap-3 epic-text-glow">
                      <Sword className="w-6 h-6" />
                      ACCEPT QUEST
                      <ChevronRight className="w-6 h-6 group-hover/btn:translate-x-3 transition-transform" />
                    </span>
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Game Mode Selection - Epic Gaming Style */}
        {gameMode === 'menu' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
            {/* Solo Mode - EPIC MAGICAL CARD */}
            <div className="relative group">
              {/* Multiple animated glows for magical effect */}
              <div className="absolute -inset-2 opacity-75">
                <div className="absolute inset-0 bg-gradient-to-r from-purple-600 via-pink-600 to-indigo-600 rounded-2xl blur-2xl opacity-50 group-hover:opacity-80 transition duration-700 animate-[gradientShift_3s_ease-in-out_infinite]"></div>
                <div className="absolute inset-0 bg-gradient-to-r from-cyan-600 to-blue-600 rounded-2xl blur-3xl opacity-30 animate-pulse"></div>
              </div>
              
              <Card className="relative h-full luxury-card border-2 border-purple-500/50 hover:border-purple-400/80 transition-all duration-500 backdrop-blur-2xl overflow-hidden hover:scale-[1.03] hover:-translate-y-2 shadow-[0_0_50px_rgba(168,85,247,0.4)] group-hover:shadow-[0_0_80px_rgba(168,85,247,0.6)]">
                {/* Epic shimmer overlay */}
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-1000">
                  <div className="absolute inset-0 bg-[linear-gradient(105deg,transparent_40%,rgba(255,255,255,0.15)_50%,transparent_60%)] animate-shimmer bg-[length:200%_100%]"></div>
                </div>
                
                {/* Magical corner accents */}
                <div className="absolute top-0 left-0 w-24 h-24 border-t-2 border-l-2 border-purple-400/60 rounded-tl-xl"></div>
                <div className="absolute top-0 right-0 w-24 h-24 border-t-2 border-r-2 border-purple-400/60 rounded-tr-xl"></div>
                <div className="absolute bottom-0 left-0 w-24 h-24 border-b-2 border-l-2 border-purple-400/60 rounded-bl-xl"></div>
                <div className="absolute bottom-0 right-0 w-24 h-24 border-b-2 border-r-2 border-purple-400/60 rounded-br-xl"></div>
                
                <CardHeader className="relative pb-4">
                  <div className="flex items-center gap-5 mb-4">
                    {/* Epic floating icon */}
                    <div className="relative group-hover:animate-[float_3s_ease-in-out_infinite]">
                      <div className="absolute inset-0 bg-gradient-to-r from-purple-500 to-pink-500 blur-2xl opacity-70"></div>
                      <div className="relative w-20 h-20 bg-gradient-to-br from-purple-600 via-pink-600 to-indigo-600 rounded-2xl flex items-center justify-center shadow-[0_0_40px_rgba(168,85,247,0.6)] animate-[pulseGlow_2s_ease-in-out_infinite]">
                        <UserIcon className="w-11 h-11 text-white drop-shadow-[0_0_8px_rgba(255,255,255,0.8)]" />
                      </div>
                    </div>
                    <div>
                      <CardTitle className="font-cinzel text-4xl font-black epic-text-glow bg-gradient-to-r from-purple-100 via-pink-100 to-purple-100 bg-clip-text text-transparent tracking-wider">
                        SOLO MODE
                      </CardTitle>
                      <p className="text-purple-200/90 text-sm font-black mt-2 uppercase tracking-[0.2em] flex items-center gap-2">
                        <Sword className="w-4 h-4" />
                        LEGENDARY CAMPAIGN
                      </p>
                    </div>
                  </div>
                </CardHeader>
                
                <CardContent className="relative space-y-5 px-6">
                  {/* Epic Stats Display */}
                  <div className="grid grid-cols-3 gap-4">
                    <div className="relative bg-gradient-to-br from-purple-900/50 via-indigo-900/50 to-purple-900/50 rounded-xl p-4 border-2 border-purple-400/40 group-hover:border-purple-400/60 transition-all shadow-inner">
                      <div className="absolute inset-0 bg-gradient-to-br from-purple-600/10 to-pink-600/10 rounded-xl"></div>
                      <div className="relative">
                        <div className="text-xs text-purple-300 mb-1 font-bold uppercase tracking-wider">Mode</div>
                        <div className="text-lg font-black text-transparent bg-gradient-to-r from-purple-200 to-pink-200 bg-clip-text">ADAPTIVE</div>
                      </div>
                    </div>
                    <div className="relative bg-gradient-to-br from-red-900/50 via-pink-900/50 to-red-900/50 rounded-xl p-4 border-2 border-red-400/40 group-hover:border-red-400/60 transition-all shadow-inner">
                      <div className="absolute inset-0 bg-gradient-to-br from-red-600/10 to-pink-600/10 rounded-xl"></div>
                      <div className="relative">
                        <div className="text-xs text-red-300 mb-1 font-bold uppercase tracking-wider">Lives</div>
                        <div className="flex gap-1 justify-center">
                          <Heart className="w-5 h-5 text-red-400 fill-red-400 drop-shadow-[0_0_8px_rgba(248,113,113,0.8)] animate-pulse" />
                          <Heart className="w-5 h-5 text-red-400 fill-red-400 drop-shadow-[0_0_8px_rgba(248,113,113,0.8)] animate-pulse" style={{ animationDelay: '0.2s' }} />
                          <Heart className="w-5 h-5 text-red-400 fill-red-400 drop-shadow-[0_0_8px_rgba(248,113,113,0.8)] animate-pulse" style={{ animationDelay: '0.4s' }} />
                        </div>
                      </div>
                    </div>
                    <div className="relative bg-gradient-to-br from-green-900/50 via-emerald-900/50 to-green-900/50 rounded-xl p-4 border-2 border-green-400/40 group-hover:border-green-400/60 transition-all shadow-inner">
                      <div className="absolute inset-0 bg-gradient-to-br from-green-600/10 to-emerald-600/10 rounded-xl"></div>
                      <div className="relative">
                        <div className="text-xs text-green-300 mb-1 font-bold uppercase tracking-wider">Reward</div>
                        <div className="text-lg font-black text-transparent bg-gradient-to-r from-green-200 to-emerald-200 bg-clip-text">EPIC XP</div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Premium Features */}
                  <div className="space-y-3 py-2">
                    <div className="flex items-center gap-3 group/feature">
                      <div className="w-7 h-7 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center shadow-lg">
                        <ChevronRight className="w-4 h-4 text-white" />
                      </div>
                      <span className="text-purple-200 text-sm font-semibold group-hover/feature:text-purple-100 transition-colors">Progressive difficulty mastery system</span>
                    </div>
                    <div className="flex items-center gap-3 group/feature">
                      <div className="w-7 h-7 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center shadow-lg">
                        <ChevronRight className="w-4 h-4 text-white" />
                      </div>
                      <span className="text-purple-200 text-sm font-semibold group-hover/feature:text-purple-100 transition-colors">Epic Atticus legendary boss battles</span>
                    </div>
                    <div className="flex items-center gap-3 group/feature">
                      <div className="w-7 h-7 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center shadow-lg">
                        <ChevronRight className="w-4 h-4 text-white" />
                      </div>
                      <span className="text-purple-200 text-sm font-semibold group-hover/feature:text-purple-100 transition-colors">Massive XP & achievement rewards</span>
                    </div>
                  </div>
                  
                  <Button 
                    onClick={() => {
                      console.log('Solo Challenge clicked, setting gameMode to bot-practice');
                      setGameMode('bot-practice');
                    }}
                    className="w-full relative group/btn bg-gradient-to-r from-purple-700 via-pink-700 to-purple-700 hover:from-purple-600 hover:via-pink-600 hover:to-purple-600 text-white font-black py-7 text-xl shadow-[0_6px_30px_rgba(168,85,247,0.5)] hover:shadow-[0_8px_40px_rgba(168,85,247,0.7)] transition-all duration-500 transform hover:scale-105 border-2 border-purple-400/50"
                    size="lg"
                  >
                    <span className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 opacity-0 group-hover/btn:opacity-100 transition-opacity duration-700 rounded-md"></span>
                    <span className="relative flex items-center justify-center gap-3 epic-text-glow">
                      <Sword className="w-6 h-6" />
                      ENTER THE ARENA
                      <ChevronRight className="w-6 h-6 group-hover/btn:translate-x-2 transition-transform" />
                    </span>
                  </Button>
                </CardContent>
              </Card>
            </div>

            {/* VS Mode - LEGENDARY PVP BATTLES */}
            <div className="relative group">
              {/* Multiple magical glows for epic effect */}
              <div className="absolute -inset-2 opacity-75">
                <div className="absolute inset-0 bg-gradient-to-r from-red-600 via-orange-600 to-yellow-600 rounded-2xl blur-2xl opacity-50 group-hover:opacity-80 transition duration-700 animate-[gradientShift_3s_ease-in-out_infinite]"></div>
                <div className="absolute inset-0 bg-gradient-to-r from-pink-600 to-purple-600 rounded-2xl blur-3xl opacity-30 animate-pulse"></div>
              </div>
              
              <Card className="relative h-full luxury-card border-2 border-orange-500/50 hover:border-orange-400/80 transition-all duration-500 backdrop-blur-2xl overflow-hidden hover:scale-[1.03] hover:-translate-y-2 shadow-[0_0_50px_rgba(251,146,60,0.4)] group-hover:shadow-[0_0_80px_rgba(251,146,60,0.6)]">
                {/* Epic shimmer overlay */}
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-1000">
                  <div className="absolute inset-0 bg-[linear-gradient(105deg,transparent_40%,rgba(255,255,255,0.15)_50%,transparent_60%)] animate-shimmer bg-[length:200%_100%]"></div>
                </div>
                
                {/* Magical corner accents */}
                <div className="absolute top-0 left-0 w-24 h-24 border-t-2 border-l-2 border-orange-400/60 rounded-tl-xl"></div>
                <div className="absolute top-0 right-0 w-24 h-24 border-t-2 border-r-2 border-orange-400/60 rounded-tr-xl"></div>
                <div className="absolute bottom-0 left-0 w-24 h-24 border-b-2 border-l-2 border-orange-400/60 rounded-bl-xl"></div>
                <div className="absolute bottom-0 right-0 w-24 h-24 border-b-2 border-r-2 border-orange-400/60 rounded-br-xl"></div>
                
                <CardHeader className="relative pb-4">
                  <div className="flex items-center gap-5 mb-4">
                    {/* Epic floating icon */}
                    <div className="relative group-hover:animate-[float_3s_ease-in-out_infinite]">
                      <div className="absolute inset-0 bg-gradient-to-r from-orange-500 to-red-500 blur-2xl opacity-70"></div>
                      <div className="relative w-20 h-20 bg-gradient-to-br from-orange-600 via-red-600 to-pink-600 rounded-2xl flex items-center justify-center shadow-[0_0_40px_rgba(251,146,60,0.6)] animate-[pulseGlow_2s_ease-in-out_infinite]">
                        <Users className="w-11 h-11 text-white drop-shadow-[0_0_8px_rgba(255,255,255,0.8)]" />
                      </div>
                    </div>
                    <div>
                      <CardTitle className="font-cinzel text-4xl font-black epic-text-glow bg-gradient-to-r from-orange-100 via-yellow-100 to-orange-100 bg-clip-text text-transparent tracking-wider">
                        VS MODE
                      </CardTitle>
                      <p className="text-orange-200/90 text-sm font-black mt-2 uppercase tracking-[0.2em] flex items-center gap-2">
                        <Sword className="w-4 h-4" />
                        MULTIPLAYER WARFARE
                      </p>
                    </div>
                  </div>
                </CardHeader>
                
                <CardContent className="relative space-y-5 px-6">
                  {/* Epic Battle Mode Buttons */}
                  <div className="space-y-4">
                    <Button 
                      onClick={() => setGameMode('vs-selection')}
                      className="w-full relative group/btn bg-gradient-to-r from-yellow-900 via-orange-900 to-yellow-900 hover:from-yellow-800 hover:via-orange-800 hover:to-yellow-800 border-2 border-yellow-400/50 hover:border-yellow-300/70 text-white py-6 transition-all duration-500 shadow-[0_4px_20px_rgba(250,204,21,0.3)] hover:shadow-[0_6px_30px_rgba(250,204,21,0.5)] transform hover:scale-105"
                      size="lg"
                    >
                      <span className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/10 to-white/0 opacity-0 group-hover/btn:opacity-100 transition-opacity duration-700 rounded-md"></span>
                      <div className="relative flex items-center justify-between w-full">
                        <span className="flex items-center gap-4">
                          <Zap className="w-8 h-8 text-yellow-400 drop-shadow-[0_0_10px_rgba(250,204,21,0.7)] animate-pulse" />
                          <div className="text-left">
                            <div className="font-black text-lg uppercase tracking-wide">LIVE DUEL</div>
                            <div className="text-xs text-yellow-200/80 font-medium">Instant PvP matchmaking</div>
                          </div>
                        </span>
                        <ChevronRight className="w-6 h-6 group-hover/btn:translate-x-2 transition-transform duration-300" />
                      </div>
                    </Button>
                    
                    <Button 
                      onClick={() => setGameMode('friend-challenge')}
                      className="w-full relative group/btn bg-gradient-to-r from-pink-900 via-rose-900 to-pink-900 hover:from-pink-800 hover:via-rose-800 hover:to-pink-800 border-2 border-pink-400/50 hover:border-pink-300/70 text-white py-6 transition-all duration-500 shadow-[0_4px_20px_rgba(236,72,153,0.3)] hover:shadow-[0_6px_30px_rgba(236,72,153,0.5)] transform hover:scale-105"
                      size="lg"
                    >
                      <span className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/10 to-white/0 opacity-0 group-hover/btn:opacity-100 transition-opacity duration-700 rounded-md"></span>
                      <div className="relative flex items-center justify-between w-full">
                        <span className="flex items-center gap-4">
                          <UserPlus className="w-8 h-8 text-pink-400 drop-shadow-[0_0_10px_rgba(236,72,153,0.7)]" />
                          <div className="text-left">
                            <div className="font-black text-lg uppercase tracking-wide">FRIEND BATTLE</div>
                            <div className="text-xs text-pink-200/80 font-medium">Challenge your allies</div>
                          </div>
                        </span>
                        <ChevronRight className="w-6 h-6 group-hover/btn:translate-x-2 transition-transform duration-300" />
                      </div>
                    </Button>
                  </div>
                  
                  {/* Epic Features List */}
                  <div className="space-y-3 pt-2">
                    <div className="flex items-center gap-3 group/feature">
                      <div className="w-7 h-7 rounded-full bg-gradient-to-r from-orange-500 to-red-500 flex items-center justify-center shadow-lg">
                        <ChevronRight className="w-4 h-4 text-white" />
                      </div>
                      <span className="text-orange-200 text-sm font-semibold group-hover/feature:text-orange-100 transition-colors">Real-time PvP combat system</span>
                    </div>
                    <div className="flex items-center gap-3 group/feature">
                      <div className="w-7 h-7 rounded-full bg-gradient-to-r from-orange-500 to-red-500 flex items-center justify-center shadow-lg">
                        <ChevronRight className="w-4 h-4 text-white" />
                      </div>
                      <span className="text-orange-200 text-sm font-semibold group-hover/feature:text-orange-100 transition-colors">Asynchronous friend warfare</span>
                    </div>
                    <div className="flex items-center gap-3 group/feature">
                      <div className="w-7 h-7 rounded-full bg-gradient-to-r from-orange-500 to-red-500 flex items-center justify-center shadow-lg">
                        <ChevronRight className="w-4 h-4 text-white" />
                      </div>
                      <span className="text-orange-200 text-sm font-semibold group-hover/feature:text-orange-100 transition-colors">Dominate the global leaderboard</span>
                    </div>
                  </div>
                  
                  {/* Epic Stats Badge */}
                  <div className="relative bg-gradient-to-r from-orange-950/60 via-red-950/60 to-orange-950/60 rounded-2xl p-5 border-2 border-orange-400/30 shadow-inner">
                    <div className="absolute inset-0 bg-gradient-to-br from-orange-600/5 to-red-600/5 rounded-2xl"></div>
                    <div className="relative flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Trophy className="w-6 h-6 text-yellow-400 animate-pulse" />
                        <span className="text-orange-200 font-bold uppercase tracking-wider text-sm">Ranked Battles</span>
                      </div>
                      <Badge className="bg-gradient-to-r from-yellow-600/30 to-orange-600/30 text-yellow-300 border border-yellow-500/50 font-bold">
                        EARN ELO
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {/* VS Mode Selection Screen - Premium Edition */}
        {gameMode === 'vs-selection' && (
          <div className="relative max-w-2xl mx-auto">
            {/* Animated glow effect */}
            <div className="absolute -inset-1 bg-gradient-to-r from-purple-600 via-pink-600 to-purple-600 rounded-2xl blur-xl opacity-30 animate-pulse"></div>
            
            <Card className="relative bg-gradient-to-br from-slate-950/95 via-purple-950/95 to-slate-950/95 border-2 border-purple-500/40 backdrop-blur-2xl shadow-2xl overflow-hidden">
              {/* Animated background mesh */}
              <div className="absolute inset-0 opacity-10">
                <div className="absolute inset-0 bg-[linear-gradient(45deg,transparent_25%,rgba(168,85,247,0.1)_50%,transparent_75%,transparent_100%)] bg-[length:250px_250px] animate-[shimmer_3s_linear_infinite]"></div>
              </div>
              
              <CardHeader className="relative border-b border-purple-500/20 pb-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-600 rounded-xl flex items-center justify-center shadow-lg">
                      <Zap className="w-7 h-7 text-white" />
                    </div>
                    <CardTitle className="font-cinzel text-2xl font-bold bg-gradient-to-r from-purple-200 to-pink-200 bg-clip-text text-transparent">
                      LIVE DUEL CONFIGURATION
                    </CardTitle>
                  </div>
                  <Button
                    onClick={() => setGameMode('menu')}
                    className="bg-gradient-to-r from-red-600/20 to-orange-600/20 hover:from-red-600/30 hover:to-orange-600/30 border border-red-500/50 text-red-200"
                    size="sm"
                  >
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    BACK
                  </Button>
                </div>
              </CardHeader>
              
              <CardContent className="relative space-y-6 p-6">
                {/* Question Type Selection - Premium Cards */}
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider mb-4 block text-purple-300">SELECT BATTLE MODE</label>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="relative group">
                      <div className={`absolute -inset-0.5 rounded-xl blur-sm transition-opacity duration-300 ${
                        gameSettings.questionType === 'bar' 
                          ? 'bg-gradient-to-r from-purple-600 to-pink-600 opacity-75' 
                          : 'opacity-0 group-hover:opacity-50'
                      }`}></div>
                      <Button
                        onClick={() => setGameSettings(prev => ({ ...prev, questionType: 'bar' }))}
                        className={`relative w-full h-auto p-5 transition-all duration-300 ${
                          gameSettings.questionType === 'bar' 
                            ? 'bg-gradient-to-br from-purple-900/90 to-pink-900/90 border-2 border-purple-400/60 scale-105' 
                            : 'bg-slate-900/80 border border-purple-500/30 hover:bg-purple-950/60'
                        }`}
                      >
                        <div className="text-center">
                          <div className="w-14 h-14 mx-auto mb-3 bg-gradient-to-br from-purple-500 to-pink-600 rounded-xl flex items-center justify-center shadow-lg">
                            <GraduationCap className="w-8 h-8 text-white" />
                          </div>
                          <div className="font-bold text-lg text-purple-100">BAR EXAM</div>
                          <div className="text-xs text-purple-300/80 mt-1">Professional MBE questions</div>
                          {gameSettings.questionType === 'bar' && (
                            <div className="absolute top-2 right-2 w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
                          )}
                        </div>
                      </Button>
                    </div>
                    
                    <div className="relative group">
                      <div className={`absolute -inset-0.5 rounded-xl blur-sm transition-opacity duration-300 ${
                        gameSettings.questionType === 'realWorld' 
                          ? 'bg-gradient-to-r from-cyan-600 to-blue-600 opacity-75' 
                          : 'opacity-0 group-hover:opacity-50'
                      }`}></div>
                      <Button
                        onClick={() => setGameSettings(prev => ({ ...prev, questionType: 'realWorld' }))}
                        className={`relative w-full h-auto p-5 transition-all duration-300 ${
                          gameSettings.questionType === 'realWorld' 
                            ? 'bg-gradient-to-br from-cyan-900/90 to-blue-900/90 border-2 border-cyan-400/60 scale-105' 
                            : 'bg-slate-900/80 border border-cyan-500/30 hover:bg-cyan-950/60'
                        }`}
                      >
                        <div className="text-center">
                          <div className="w-14 h-14 mx-auto mb-3 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg">
                            <Globe className="w-8 h-8 text-white" />
                          </div>
                          <div className="font-bold text-lg text-cyan-100">REAL-WORLD</div>
                          <div className="text-xs text-cyan-300/80 mt-1">Practical legal knowledge</div>
                          {gameSettings.questionType === 'realWorld' && (
                            <div className="absolute top-2 right-2 w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
                          )}
                        </div>
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Subject Selection - Premium Dropdown */}
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider mb-4 block text-purple-300">CHOOSE BATTLEFIELD</label>
                  <Select 
                    value={gameSettings.subject} 
                    onValueChange={(value) => setGameSettings(prev => ({ ...prev, subject: value }))}
                  >
                    <SelectTrigger className="bg-gradient-to-r from-purple-950/60 to-pink-950/60 border border-purple-500/40 hover:border-purple-400/60 h-14 text-purple-100 font-medium">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-950/95 border-purple-500/40 backdrop-blur-xl">
                    {SUBJECTS.map(subject => (
                      <SelectItem key={subject} value={subject}>{subject}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
                    
                    {/* Opponent Skill Level - Premium Selection */}
                    <div>
                      <label className="text-xs font-bold uppercase tracking-wider mb-4 block text-purple-300">OPPONENT DIFFICULTY</label>
                      <div className="grid grid-cols-2 gap-3">
                        {[
                          { value: 'easy', label: 'NOVICE', color: 'green', icon: '🌱' },
                          { value: 'medium', label: 'SKILLED', color: 'yellow', icon: '⚡' },
                          { value: 'hard', label: 'EXPERT', color: 'orange', icon: '🔥' },
                          { value: 'expert', label: 'MASTER', color: 'red', icon: '👑' }
                        ].map(({ value, label, color, icon }) => (
                          <Button
                            key={value}
                            onClick={() => setGameSettings(prev => ({ ...prev, botDifficulty: value }))}
                            className={`relative h-auto p-4 transition-all duration-300 ${
                              gameSettings.botDifficulty === value
                                ? `bg-gradient-to-br from-${color}-900/90 to-${color}-800/90 border-2 border-${color}-400/60 scale-105`
                                : `bg-slate-900/60 border border-${color}-500/30 hover:bg-${color}-950/40`
                            }`}
                          >
                            <div className="text-center">
                              <div className="text-2xl mb-1">{icon}</div>
                              <div className={`font-bold text-sm ${
                                gameSettings.botDifficulty === value ? `text-${color}-100` : `text-${color}-300`
                              }`}>
                                {label}
                              </div>
                            </div>
                            {gameSettings.botDifficulty === value && (
                              <div className="absolute top-1 right-1 w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                            )}
                          </Button>
                        ))}
                      </div>
                    </div>
                    
                    {/* Start Button - Epic Style */}
                    <div className="pt-2">
                      <Button 
                        onClick={handleStartBotGame} 
                        className="w-full relative group bg-gradient-to-r from-purple-600 via-pink-600 to-purple-600 hover:from-purple-500 hover:via-pink-500 hover:to-purple-500 text-white font-bold py-6 text-xl shadow-2xl transition-all duration-300 border-2 border-purple-400/50"
                        size="lg"
                      >
                        <span className="absolute inset-0 bg-white opacity-0 group-hover:opacity-20 transition-opacity duration-300 rounded-md"></span>
                        <span className="relative flex items-center justify-center gap-3">
                          ⚔️ INITIATE DUEL
                          <ChevronRight className="w-6 h-6 group-hover:translate-x-1 transition-transform" />
                        </span>
                      </Button>
                      <p className="text-xs text-center mt-3 text-purple-300/60 uppercase tracking-wider">
                        Instant matchmaking enabled
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </div>
        )}

        {/* Friend Challenge Screen - Premium Edition */}
        {gameMode === 'friend-challenge' && (
          <div className="relative max-w-2xl mx-auto">
            {/* Animated glow effect */}
            <div className="absolute -inset-1 bg-gradient-to-r from-pink-600 via-purple-600 to-pink-600 rounded-2xl blur-xl opacity-30 animate-pulse"></div>
            
            <Card className="relative bg-gradient-to-br from-slate-950/95 via-purple-950/95 to-slate-950/95 border-2 border-pink-500/40 backdrop-blur-2xl shadow-2xl overflow-hidden">
              {/* Animated background mesh */}
              <div className="absolute inset-0 opacity-10">
                <div className="absolute inset-0 bg-[linear-gradient(-45deg,transparent_25%,rgba(236,72,153,0.1)_50%,transparent_75%,transparent_100%)] bg-[length:250px_250px] animate-[shimmer_3s_linear_infinite]"></div>
              </div>
              
              <CardHeader className="relative border-b border-pink-500/20 pb-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-gradient-to-br from-pink-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
                      <UserPlus className="w-7 h-7 text-white" />
                    </div>
                    <CardTitle className="font-cinzel text-2xl font-bold bg-gradient-to-r from-pink-200 to-purple-200 bg-clip-text text-transparent">
                      FRIEND CHALLENGE
                    </CardTitle>
                  </div>
                  <Button
                    onClick={() => setGameMode('menu')}
                    className="bg-gradient-to-r from-red-600/20 to-orange-600/20 hover:from-red-600/30 hover:to-orange-600/30 border border-red-500/50 text-red-200"
                    size="sm"
                  >
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    BACK
                  </Button>
                </div>
              </CardHeader>
              
              <CardContent className="relative space-y-6 p-6">
                {/* Quick Share Section - Premium Style */}
                <div className="relative group">
                  <div className="absolute -inset-0.5 bg-gradient-to-r from-purple-600 to-pink-600 rounded-xl blur opacity-30 group-hover:opacity-50 transition duration-300"></div>
                  <div className="relative bg-gradient-to-r from-purple-900/60 to-pink-900/60 rounded-xl p-5 border border-purple-500/40">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-xs font-bold uppercase tracking-wider text-purple-300 flex items-center gap-2">
                        <Share2 className="w-4 h-4" />
                        SHARE YOUR BATTLE LINK
                      </h3>
                    </div>
                    <div className="flex gap-3">
                      <Input
                        value={`${window.location.origin}/challenge/${user?.username || 'yourname'}`}
                        readOnly
                        className="flex-1 bg-slate-900/60 border-purple-500/40 text-purple-100 font-mono text-sm"
                      />
                      <Button
                        onClick={() => {
                          const link = `${window.location.origin}/challenge/${user?.username || 'yourname'}`;
                          navigator.clipboard.writeText(link);
                          toast({
                            title: "Link copied!",
                            description: "Share this link with friends to challenge them",
                          });
                        }}
                        className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 border border-purple-400/50"
                        size="sm"
                      >
                        <Copy className="w-4 h-4" />
                      </Button>
                    </div>
                    <p className="text-xs text-purple-300/60 mt-3 uppercase tracking-wider">
                      Send this to friends for instant battle invites
                    </p>
                  </div>
                </div>

                {/* Divider */}
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t border-purple-500/30" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-gradient-to-r from-purple-950 to-pink-950 px-4 py-1 rounded-full border border-purple-500/30 text-purple-300 font-bold tracking-wider">
                      OR CHALLENGE DIRECTLY
                    </span>
                  </div>
                </div>

                {/* Username Input - Premium Style */}
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider mb-4 block text-purple-300">ENTER OPPONENT USERNAME</label>
                  <Input
                    placeholder="Type username here..."
                    value={gameSettings.friendUsername}
                    onChange={(e) => setGameSettings(prev => ({ ...prev, friendUsername: e.target.value }))}
                    className="w-full h-14 bg-gradient-to-r from-purple-950/60 to-pink-950/60 border border-purple-500/40 hover:border-purple-400/60 text-purple-100 font-medium text-lg placeholder:text-purple-400/50"
                    onKeyPress={(e) => {
                      if (e.key === 'Enter' && gameSettings.friendUsername.trim()) {
                        handleStartAsyncFriendGame();
                      }
                    }}
                  />
                </div>

                {/* Question Type Selection - Premium Cards */}
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider mb-4 block text-purple-300">SELECT BATTLE MODE</label>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="relative group">
                      <div className={`absolute -inset-0.5 rounded-xl blur-sm transition-opacity duration-300 ${
                        gameSettings.questionType === 'bar' 
                          ? 'bg-gradient-to-r from-purple-600 to-pink-600 opacity-75' 
                          : 'opacity-0 group-hover:opacity-50'
                      }`}></div>
                      <Button
                        onClick={() => setGameSettings(prev => ({ ...prev, questionType: 'bar' }))}
                        className={`relative w-full h-auto p-4 transition-all duration-300 ${
                          gameSettings.questionType === 'bar' 
                            ? 'bg-gradient-to-br from-purple-900/90 to-pink-900/90 border-2 border-purple-400/60 scale-105' 
                            : 'bg-slate-900/80 border border-purple-500/30 hover:bg-purple-950/60'
                        }`}
                      >
                        <div className="text-center">
                          <GraduationCap className="w-7 h-7 mx-auto mb-2" />
                          <div className="font-bold text-sm text-purple-100">BAR EXAM</div>
                          <div className="text-xs text-purple-300/80">MBE questions</div>
                          {gameSettings.questionType === 'bar' && (
                            <div className="absolute top-2 right-2 w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
                          )}
                        </div>
                      </Button>
                    </div>
                    
                    <div className="relative group">
                      <div className={`absolute -inset-0.5 rounded-xl blur-sm transition-opacity duration-300 ${
                        gameSettings.questionType === 'realWorld' 
                          ? 'bg-gradient-to-r from-cyan-600 to-blue-600 opacity-75' 
                          : 'opacity-0 group-hover:opacity-50'
                      }`}></div>
                      <Button
                        onClick={() => setGameSettings(prev => ({ ...prev, questionType: 'realWorld' }))}
                        className={`relative w-full h-auto p-4 transition-all duration-300 ${
                          gameSettings.questionType === 'realWorld' 
                            ? 'bg-gradient-to-br from-cyan-900/90 to-blue-900/90 border-2 border-cyan-400/60 scale-105' 
                            : 'bg-slate-900/80 border border-cyan-500/30 hover:bg-cyan-950/60'
                        }`}
                      >
                        <div className="text-center">
                          <Globe className="w-7 h-7 mx-auto mb-2" />
                          <div className="font-bold text-sm text-cyan-100">REAL-WORLD</div>
                          <div className="text-xs text-cyan-300/80">Street law</div>
                          {gameSettings.questionType === 'realWorld' && (
                            <div className="absolute top-2 right-2 w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
                          )}
                        </div>
                      </Button>
                    </div>
                  </div>
                </div>
              
                {/* Subject Selection - Premium Style */}
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider mb-4 block text-purple-300">CHOOSE BATTLEFIELD</label>
                  <Select 
                    value={gameSettings.subject}
                    onValueChange={(value) => setGameSettings(prev => ({ ...prev, subject: value }))}
                  >
                    <SelectTrigger className="bg-gradient-to-r from-purple-950/60 to-pink-950/60 border border-purple-500/40 hover:border-purple-400/60 h-14 text-purple-100 font-medium">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-950/95 border-purple-500/40 backdrop-blur-xl">
                      {SUBJECTS.map(subject => (
                        <SelectItem key={subject} value={subject}>{subject}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                {/* Challenge Button - Epic Style */}
                <div className="pt-2">
                  <Button 
                    onClick={handleStartAsyncFriendGame}
                    className="w-full relative group bg-gradient-to-r from-pink-600 via-purple-600 to-pink-600 hover:from-pink-500 hover:via-purple-500 hover:to-pink-500 text-white font-bold py-6 text-xl shadow-2xl transition-all duration-300 border-2 border-pink-400/50 disabled:opacity-50 disabled:cursor-not-allowed"
                    size="lg"
                    disabled={!gameSettings.friendUsername.trim()}
                  >
                    <span className="absolute inset-0 bg-white opacity-0 group-hover:opacity-20 transition-opacity duration-300 rounded-md"></span>
                    <span className="relative flex items-center justify-center gap-3">
                      👥 SEND CHALLENGE
                      <ChevronRight className="w-6 h-6 group-hover:translate-x-1 transition-transform" />
                    </span>
                  </Button>
                </div>
                
                {/* Active Games Button */}
                <div className="border-t border-purple-500/30 pt-6">
                  <Button 
                    onClick={() => setShowAsyncInbox(true)}
                    className="w-full relative group bg-gradient-to-r from-purple-900/60 to-indigo-900/60 hover:from-purple-800/70 hover:to-indigo-800/70 border border-purple-500/40 hover:border-purple-400/60 text-purple-100 py-5 transition-all duration-300"
                    size="lg"
                  >
                    <span className="absolute inset-0 bg-gradient-to-r from-purple-600 to-indigo-600 opacity-0 group-hover:opacity-10 transition-opacity duration-300 rounded-md"></span>
                    <span className="relative flex items-center justify-center gap-3">
                      <Bell className={`h-5 w-5 ${asyncNotificationCount > 0 ? 'animate-pulse text-yellow-400' : ''}`} />
                      VIEW ACTIVE GAMES
                      {asyncNotificationCount > 0 && (
                        <Badge className="bg-red-500 text-white animate-pulse">{asyncNotificationCount}</Badge>
                      )}
                    </span>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
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

        {/* Floating Chatbot Button */}
        <ChatbotButton 
          variant="floating"
          currentSubject={gameSettings.subject !== 'Mixed Questions' ? gameSettings.subject : undefined}
        />
      </div>
    </div>
  );
}