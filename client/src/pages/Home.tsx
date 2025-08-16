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
import { LogOut, User as UserIcon, Bell, CalendarDays, Heart, Users, Zap, ChevronRight, UserPlus, ArrowLeft, Trophy, GraduationCap, Globe, Share2, Copy, BarChart3, Edit, Shield, Sword, Swords, Gamepad2, Scale, Clock } from 'lucide-react';
import { Link } from 'wouter';
import type { User } from '@shared/schema';
import { LEVEL_TITLES, RANK_TIERS, RANK_COLORS } from '@shared/schema';

// Import premium game images
import magicalCourtroomImg from '@assets/generated_images/Magical_courtroom_library_d630a7a8.png';
import legalWizardImg from '@assets/generated_images/Legal_wizard_character_9ff25884.png';
import duelArenaImg from '@assets/generated_images/Duel_arena_scene_cd6aa9fd.png';
import magicalTomeImg from '@assets/generated_images/Magical_law_tome_103fa743.png';

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
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      <div className="container max-w-4xl mx-auto py-8 px-4">
        {/* Daily Streak Indicator - Always at the top */}
        <div className="mb-6">
          <StreakIndicator />
        </div>
        
        {/* Header Section */}
        <div className="mb-8">
          {/* Header card */}
          <div className="bg-slate-950/80 rounded-2xl border border-purple-500/30 p-6 shadow-lg">
            
            <div className="relative flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
              <div className="flex items-center gap-4 flex-1 min-w-0">
                {/* Logo */}
                <LawDuelLogo size="lg" showText={true} className="flex-shrink-0" />
                
                {/* Character Profile */}
                <div className="flex items-center gap-4 flex-1 min-w-0">
                  {/* Avatar */}
                  <div className="bg-slate-900 rounded-full p-1 flex-shrink-0">
                    <AvatarRenderer
                      avatarData={character.avatarData as any}
                      level={character.level}
                      size={72}
                    />
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    {/* Name and badges */}
                    <div className="flex items-center gap-2 flex-wrap mb-2">
                      <h1 className="font-cinzel text-2xl lg:text-3xl font-bold bg-gradient-to-r from-purple-200 via-pink-200 to-purple-200 bg-clip-text text-transparent">
                        {character.displayName}
                      </h1>
                      <Badge className="bg-purple-600/30 text-purple-200 border-purple-500/50 px-2 py-1 text-xs">
                        @{character.username}
                      </Badge>
                      {character.lawSchool && (
                        <Badge className="bg-amber-600/30 text-amber-200 border-amber-500/50 px-2 py-1 text-xs">
                          {character.lawSchool.includes('Law School') ? 
                            character.lawSchool.split(' Law School')[0] : 
                            character.lawSchool.split(' ')[0]
                          }
                        </Badge>
                      )}
                    </div>
                    
                    {/* Stats bar */}
                    <div className="flex items-center gap-3 flex-wrap">
                      <div className="flex items-center gap-1">
                        <div className="text-cyan-400 text-xs">LEVEL</div>
                        <div className="bg-gradient-to-r from-cyan-600/30 to-blue-600/30 px-2 py-0.5 rounded border border-cyan-500/30">
                          <span className="font-bold text-cyan-200 text-sm">{character.level}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <div className="text-purple-400 text-xs">POINTS</div>
                        <div className="bg-gradient-to-r from-purple-600/30 to-pink-600/30 px-2 py-0.5 rounded border border-purple-500/30">
                          <span className="font-bold text-purple-200 text-sm">{character.points.toLocaleString()}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <div className="text-green-400 text-xs">XP</div>
                        <div className="bg-gradient-to-r from-green-600/30 to-emerald-600/30 px-2 py-0.5 rounded border border-green-500/30">
                          <span className="font-bold text-green-200 text-sm">{character.xp}</span>
                        </div>
                      </div>
                    </div>
                    
                    {/* Rank Display */}
                    <div className="mt-2 flex items-center gap-3 flex-wrap">
                      {(() => {
                        const currentRank = RANK_TIERS.find(tier => character.overallElo >= tier.minElo && character.overallElo <= tier.maxElo) || RANK_TIERS[0];
                        const rankColor = RANK_COLORS[currentRank.color as keyof typeof RANK_COLORS];
                        const nextRank = RANK_TIERS[RANK_TIERS.indexOf(currentRank) + 1];
                        
                        return (
                          <>
                            <div className={`flex items-center gap-1 px-2 py-0.5 rounded ${rankColor.bg} ${rankColor.border} border`}>
                              <Trophy className={`w-3 h-3 ${rankColor.text}`} />
                              <span className={`${rankColor.text} font-cinzel font-bold text-xs`}>
                                {currentRank.name}
                              </span>
                            </div>
                            <div className="flex items-center gap-1">
                              <div className="text-slate-400 text-xs">ELO</div>
                              <div className="bg-slate-800/50 px-2 py-0.5 rounded">
                                <span className="font-bold text-slate-200 text-sm">{character.overallElo}</span>
                              </div>
                            </div>
                            {nextRank && (
                              <div className="text-purple-300 text-xs">
                                Next: <span className="font-bold text-cyan-300">{nextRank.name}</span> ({nextRank.minElo})
                              </div>
                            )}
                          </>
                        );
                      })()}
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Action buttons - Premium Style */}
              <div className="flex items-center gap-2 flex-shrink-0">
                <Button 
                  onClick={() => setShowCharacterCreation(true)} 
                  className="bg-purple-900/70 hover:bg-purple-800/80 border border-purple-500/60 hover:border-purple-400/80 text-purple-100 px-3 py-1.5 transition-all duration-200"
                  size="sm"
                >
                  <span className="flex items-center gap-1 font-bold text-xs">
                    <Edit className="h-3 w-3" />
                    EDIT
                  </span>
                </Button>
                <Button
                  onClick={() => window.location.href = '/stats'}
                  className="bg-cyan-900/70 hover:bg-cyan-800/80 border border-cyan-500/60 hover:border-cyan-400/80 text-cyan-100 px-3 py-1.5 transition-all duration-200"
                  size="sm"
                >
                  <span className="flex items-center gap-1 font-bold text-xs">
                    <BarChart3 className="h-3 w-3" />
                    STATS
                  </span>
                </Button>
                <Button 
                  onClick={() => logout.mutate()} 
                  className="bg-red-900/70 hover:bg-red-800/80 border border-red-500/60 hover:border-red-400/80 text-red-100 px-3 py-1.5 transition-all duration-200"
                  size="sm"
                >
                  <span className="flex items-center gap-1 font-bold text-xs">
                    <LogOut className="h-3 w-3" />
                    LOGOUT
                  </span>
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Epic Hero Banner */}
        <div className="mb-8 relative rounded-lg overflow-hidden">
          <div 
            className="absolute inset-0 opacity-40"
            style={{
              backgroundImage: `url(${magicalCourtroomImg})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center'
            }}
          />
          <div className="relative z-10 bg-gradient-to-b from-transparent to-black/80 p-8 text-center">
            <h2 className="font-cinzel text-4xl font-bold text-purple-300 mb-3">
              MASTER THE BAR EXAM
            </h2>
            <p className="text-slate-300 text-lg">
              Dominate American law through epic legal duels
            </p>
          </div>
        </div>

        {/* Daily Challenge */}
        <div className="mb-8">
          <Card className="bg-slate-950/80 border border-amber-500/40 hover:border-amber-500/60 transition-colors">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-amber-600 rounded-lg flex items-center justify-center">
                    <Trophy className="w-8 h-8 text-white" />
                  </div>
                  <div>
                    <h3 className="font-cinzel text-2xl font-bold text-amber-300">
                      DAILY CHALLENGE
                    </h3>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge className="bg-red-900/50 text-red-200 border border-red-500/30 text-xs">
                        ADVANCED
                      </Badge>
                      <Badge className="bg-green-900/50 text-green-200 border border-green-500/30 text-xs">
                        3X REWARDS
                      </Badge>
                    </div>
                  </div>
                </div>
                <Link href="/daily">
                  <Button className="bg-amber-600 hover:bg-amber-700 text-white px-8 py-2">
                    <span className="flex items-center gap-2">
                      <Sword className="w-4 h-4" />
                      START CHALLENGE
                      <ChevronRight className="w-4 h-4" />
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
            {/* Solo Mode */}
            <div>
              <Card className="bg-slate-950/80 border border-purple-500/40 hover:border-purple-500/60 transition-colors h-full overflow-hidden relative">
                {/* Premium background image */}
                <div 
                  className="absolute inset-0 opacity-20 transition-opacity hover:opacity-30"
                  style={{
                    backgroundImage: `url(${magicalTomeImg})`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center'
                  }}
                />
                
                <CardHeader className="pb-4 relative z-10">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 bg-purple-600 rounded-lg flex items-center justify-center">
                      <UserIcon className="w-8 h-8 text-white" />
                    </div>
                    <div>
                      <CardTitle className="font-cinzel text-2xl font-bold text-purple-300">
                        SOLO MODE
                      </CardTitle>
                      <p className="text-slate-400 text-sm">Advanced training</p>
                    </div>
                  </div>
                </CardHeader>
                
                <CardContent className="px-6 space-y-4 relative z-10">
                  <div className="text-slate-300 text-sm space-y-2">
                    <div className="flex items-center gap-2">
                      <Shield className="w-4 h-4 text-purple-400" />
                      <span>3 attempts per session</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <ChevronRight className="w-4 h-4 text-purple-400" />
                      <span>Progressive difficulty</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Trophy className="w-4 h-4 text-purple-400" />
                      <span>Earn mastery points</span>
                    </div>
                  </div>
                  
                  <Button 
                    onClick={() => {
                      console.log('Solo Challenge clicked, setting gameMode to bot-practice');
                      setGameMode('bot-practice');
                    }}
                    className="w-full bg-purple-600 hover:bg-purple-700 text-white py-3"
                  >
                    <span className="flex items-center justify-center gap-2">
                      <Sword className="w-5 h-5" />
                      START TRAINING
                      <ChevronRight className="w-5 h-5" />
                    </span>
                  </Button>
                </CardContent>
              </Card>
            </div>

            {/* VS Mode */}
            <div>
              <Card className="bg-slate-950/80 border border-orange-500/40 hover:border-orange-500/60 transition-colors h-full overflow-hidden relative">
                {/* Premium background image */}
                <div 
                  className="absolute inset-0 opacity-20 transition-opacity hover:opacity-30"
                  style={{
                    backgroundImage: `url(${duelArenaImg})`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center'
                  }}
                />
                <CardHeader className="pb-4 relative z-10">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 bg-orange-600 rounded-lg flex items-center justify-center">
                      <Users className="w-8 h-8 text-white" />
                    </div>
                    <div>
                      <CardTitle className="font-cinzel text-2xl font-bold text-orange-300">
                        VS MODE
                      </CardTitle>
                      <p className="text-slate-400 text-sm">Multiplayer battles</p>
                    </div>
                  </div>
                </CardHeader>
                
                <CardContent className="px-6 space-y-4 relative z-10">
                  <div className="space-y-3">
                    <Button 
                      onClick={() => setGameMode('vs-selection')}
                      className="w-full bg-yellow-700 hover:bg-yellow-800 text-white py-3"
                    >
                      <div className="flex items-center justify-between w-full">
                        <span className="flex items-center gap-3">
                          <Zap className="w-5 h-5" />
                          <div className="text-left">
                            <div className="font-semibold">LIVE DUEL</div>
                            <div className="text-xs opacity-90">Instant matchmaking</div>
                          </div>
                        </span>
                        <ChevronRight className="w-5 h-5" />
                      </div>
                    </Button>
                    
                    <Button 
                      onClick={() => setGameMode('friend-challenge')}
                      className="w-full bg-pink-700 hover:bg-pink-800 text-white py-3"
                    >
                      <div className="flex items-center justify-between w-full">
                        <span className="flex items-center gap-3">
                          <UserPlus className="w-5 h-5" />
                          <div className="text-left">
                            <div className="font-semibold">FRIEND BATTLE</div>
                            <div className="text-xs opacity-90">Challenge friends</div>
                          </div>
                        </span>
                        <ChevronRight className="w-5 h-5" />
                      </div>
                    </Button>
                  </div>
                  
                  <div className="text-slate-300 text-sm space-y-2">
                    <div className="flex items-center gap-2">
                      <Swords className="w-4 h-4 text-orange-400" />
                      <span>Real-time PvP battles</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Trophy className="w-4 h-4 text-orange-400" />
                      <span>Earn ELO ranking</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4 text-orange-400" />
                      <span>Friend matches</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {/* VS Mode Selection Screen */}
        {gameMode === 'vs-selection' && (
          <div className="max-w-2xl mx-auto">
            <Card className="bg-slate-950/80 border border-purple-500/40">
              
              <CardHeader className="border-b border-purple-500/20 pb-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-purple-600 rounded-lg flex items-center justify-center">
                      <Zap className="w-6 h-6 text-white" />
                    </div>
                    <CardTitle className="font-cinzel text-xl font-bold text-purple-300">
                      LIVE DUEL CONFIGURATION
                    </CardTitle>
                  </div>
                  <Button
                    onClick={() => setGameMode('menu')}
                    className="bg-red-900/50 hover:bg-red-900/70 text-red-200"
                    size="sm"
                  >
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    BACK
                  </Button>
                </div>
              </CardHeader>
              
              <CardContent className="space-y-6 p-6">
                {/* Question Type Selection */}
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider mb-4 block text-purple-300">SELECT BATTLE MODE</label>
                  <div className="grid grid-cols-2 gap-4">
                    <Button
                      onClick={() => setGameSettings(prev => ({ ...prev, questionType: 'bar' }))}
                      className={`h-auto p-4 ${
                        gameSettings.questionType === 'bar' 
                          ? 'bg-purple-800/60 border-2 border-purple-400' 
                          : 'bg-slate-900/60 border border-purple-500/30 hover:bg-purple-900/40'
                      }`}
                    >
                      <div className="text-center">
                        <div className="w-12 h-12 mx-auto mb-2 bg-purple-600 rounded-lg flex items-center justify-center">
                          <GraduationCap className="w-7 h-7 text-white" />
                        </div>
                        <div className="font-bold text-purple-100">BAR EXAM</div>
                        <div className="text-xs text-purple-300/80 mt-1">MBE questions</div>
                        {gameSettings.questionType === 'bar' && (
                          <div className="absolute top-2 right-2 w-3 h-3 bg-green-400 rounded-full"></div>
                        )}
                      </div>
                    </Button>
                    
                    <Button
                      onClick={() => setGameSettings(prev => ({ ...prev, questionType: 'realWorld' }))}
                      className={`h-auto p-4 ${
                        gameSettings.questionType === 'realWorld' 
                          ? 'bg-cyan-800/60 border-2 border-cyan-400' 
                          : 'bg-slate-900/60 border border-cyan-500/30 hover:bg-cyan-900/40'
                      }`}
                    >
                      <div className="text-center">
                        <div className="w-12 h-12 mx-auto mb-2 bg-cyan-600 rounded-lg flex items-center justify-center">
                          <Globe className="w-7 h-7 text-white" />
                        </div>
                        <div className="font-bold text-cyan-100">REAL-WORLD</div>
                        <div className="text-xs text-cyan-300/80 mt-1">Practical law</div>
                        {gameSettings.questionType === 'realWorld' && (
                          <div className="absolute top-2 right-2 w-3 h-3 bg-green-400 rounded-full"></div>
                        )}
                      </div>
                    </Button>
                  </div>
                </div>

                {/* Subject Selection */}
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider mb-4 block text-purple-300">CHOOSE SUBJECT</label>
                  <Select 
                    value={gameSettings.subject} 
                    onValueChange={(value) => setGameSettings(prev => ({ ...prev, subject: value }))}
                  >
                    <SelectTrigger className="bg-slate-900/60 border border-purple-500/40 hover:border-purple-400/60 h-12 text-purple-100">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-950/95 border-purple-500/40">
                    {SUBJECTS.map(subject => (
                      <SelectItem key={subject} value={subject}>{subject}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
                    
                    {/* Opponent Difficulty */}
                    <div>
                      <label className="text-xs font-bold uppercase tracking-wider mb-4 block text-purple-300">OPPONENT DIFFICULTY</label>
                      <div className="grid grid-cols-2 gap-3">
                        {[
                          { value: 'easy', label: 'NOVICE', icon: '🌱' },
                          { value: 'medium', label: 'SKILLED', icon: '⚡' },
                          { value: 'hard', label: 'EXPERT', icon: '🔥' },
                          { value: 'expert', label: 'MASTER', icon: '👑' }
                        ].map(({ value, label, icon }) => (
                          <Button
                            key={value}
                            onClick={() => setGameSettings(prev => ({ ...prev, botDifficulty: value }))}
                            className={`h-auto p-3 ${
                              gameSettings.botDifficulty === value
                                ? 'bg-purple-800/60 border-2 border-purple-400'
                                : 'bg-slate-900/60 border border-purple-500/30 hover:bg-purple-900/40'
                            }`}
                          >
                            <div className="text-center">
                              <div className="text-2xl mb-1">{icon}</div>
                              <div className="font-bold text-sm text-purple-200">
                                {label}
                              </div>
                            </div>
                            {gameSettings.botDifficulty === value && (
                              <div className="absolute top-1 right-1 w-2 h-2 bg-green-400 rounded-full"></div>
                            )}
                          </Button>
                        ))}
                      </div>
                    </div>
                    
                    {/* Start Button */}
                    <div className="pt-2">
                      <Button 
                        onClick={handleStartBotGame} 
                        className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-4 text-lg"
                        size="lg"
                      >
                        <span className="flex items-center justify-center gap-3">
                          ⚔️ INITIATE DUEL
                          <ChevronRight className="w-5 h-5" />
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

        {/* Friend Challenge Screen */}
        {gameMode === 'friend-challenge' && (
          <div className="max-w-2xl mx-auto">
            <Card className="bg-slate-950/80 border border-pink-500/40">
              <CardHeader className="border-b border-pink-500/20 pb-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-pink-600 rounded-lg flex items-center justify-center">
                      <UserPlus className="w-6 h-6 text-white" />
                    </div>
                    <CardTitle className="font-cinzel text-xl font-bold text-pink-300">
                      FRIEND CHALLENGE
                    </CardTitle>
                  </div>
                  <Button
                    onClick={() => setGameMode('menu')}
                    className="bg-red-900/50 hover:bg-red-900/70 text-red-200"
                    size="sm"
                  >
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    BACK
                  </Button>
                </div>
              </CardHeader>
              
              <CardContent className="space-y-6 p-6">
                {/* Quick Share Section */}
                <div className="bg-purple-900/30 rounded-lg p-4 border border-purple-500/30">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-purple-300 flex items-center gap-2 mb-4">
                    <Share2 className="w-4 h-4" />
                    SHARE YOUR BATTLE LINK
                  </h3>
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
                      className="bg-purple-600 hover:bg-purple-700"
                      size="sm"
                    >
                      <Copy className="w-4 h-4" />
                    </Button>
                  </div>
                  <p className="text-xs text-purple-300/60 mt-3 uppercase tracking-wider">
                    Send this to friends for instant battle invites
                  </p>
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

                {/* Username Input */}
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider mb-4 block text-purple-300">ENTER OPPONENT USERNAME</label>
                  <Input
                    placeholder="Type username here..."
                    value={gameSettings.friendUsername}
                    onChange={(e) => setGameSettings(prev => ({ ...prev, friendUsername: e.target.value }))}
                    className="w-full h-12 bg-slate-900/60 border border-purple-500/40 hover:border-purple-400/60 text-purple-100 placeholder:text-purple-400/50"
                    onKeyPress={(e) => {
                      if (e.key === 'Enter' && gameSettings.friendUsername.trim()) {
                        handleStartAsyncFriendGame();
                      }
                    }}
                  />
                </div>

                {/* Question Type Selection */}
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider mb-4 block text-purple-300">SELECT BATTLE MODE</label>
                  <div className="grid grid-cols-2 gap-4">
                    <Button
                      onClick={() => setGameSettings(prev => ({ ...prev, questionType: 'bar' }))}
                      className={`h-auto p-4 ${
                        gameSettings.questionType === 'bar' 
                          ? 'bg-purple-800/60 border-2 border-purple-400' 
                          : 'bg-slate-900/60 border border-purple-500/30 hover:bg-purple-900/40'
                      }`}
                    >
                      <div className="text-center">
                        <GraduationCap className="w-7 h-7 mx-auto mb-2" />
                        <div className="font-bold text-sm text-purple-100">BAR EXAM</div>
                        <div className="text-xs text-purple-300/80">MBE questions</div>
                        {gameSettings.questionType === 'bar' && (
                          <div className="absolute top-2 right-2 w-3 h-3 bg-green-400 rounded-full"></div>
                        )}
                      </div>
                    </Button>
                    
                    <Button
                      onClick={() => setGameSettings(prev => ({ ...prev, questionType: 'realWorld' }))}
                      className={`h-auto p-4 ${
                        gameSettings.questionType === 'realWorld' 
                          ? 'bg-cyan-800/60 border-2 border-cyan-400' 
                          : 'bg-slate-900/60 border border-cyan-500/30 hover:bg-cyan-900/40'
                      }`}
                    >
                      <div className="text-center">
                        <Globe className="w-7 h-7 mx-auto mb-2" />
                        <div className="font-bold text-sm text-cyan-100">REAL-WORLD</div>
                        <div className="text-xs text-cyan-300/80">Street law</div>
                        {gameSettings.questionType === 'realWorld' && (
                          <div className="absolute top-2 right-2 w-3 h-3 bg-green-400 rounded-full"></div>
                        )}
                      </div>
                    </Button>
                  </div>
                </div>
              
                {/* Subject Selection */}
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider mb-4 block text-purple-300">CHOOSE SUBJECT</label>
                  <Select 
                    value={gameSettings.subject}
                    onValueChange={(value) => setGameSettings(prev => ({ ...prev, subject: value }))}
                  >
                    <SelectTrigger className="bg-slate-900/60 border border-purple-500/40 hover:border-purple-400/60 h-12 text-purple-100">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-950/95 border-purple-500/40">
                      {SUBJECTS.map(subject => (
                        <SelectItem key={subject} value={subject}>{subject}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                {/* Challenge Button */}
                <div className="pt-2">
                  <Button 
                    onClick={handleStartAsyncFriendGame}
                    className="w-full bg-pink-600 hover:bg-pink-700 text-white font-bold py-4 text-lg disabled:opacity-50 disabled:cursor-not-allowed"
                    size="lg"
                    disabled={!gameSettings.friendUsername.trim()}
                  >
                    <span className="flex items-center justify-center gap-3">
                      👥 SEND CHALLENGE
                      <ChevronRight className="w-5 h-5" />
                    </span>
                  </Button>
                </div>
                
                {/* Active Games Button */}
                <div className="border-t border-purple-500/30 pt-6">
                  <Button 
                    onClick={() => setShowAsyncInbox(true)}
                    className="w-full bg-purple-900/60 hover:bg-purple-800/70 border border-purple-500/40 hover:border-purple-400/60 text-purple-100 py-4"
                    size="lg"
                  >
                    <span className="flex items-center justify-center gap-3">
                      <Bell className={`h-5 w-5 ${asyncNotificationCount > 0 ? 'text-yellow-400' : ''}`} />
                      VIEW ACTIVE GAMES
                      {asyncNotificationCount > 0 && (
                        <Badge className="bg-red-500 text-white">{asyncNotificationCount}</Badge>
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