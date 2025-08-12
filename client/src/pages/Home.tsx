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
import AsyncInbox from '@/components/AsyncInbox';
import AsyncMatch from '@/components/AsyncMatch';
import LawDuelLogo from '@/components/LawDuelLogo';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { LogOut, User as UserIcon, Bell } from 'lucide-react';
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
  const wsRef = useRef<WebSocket | null>(null);
  
  // Check if new user needs character creation
  const needsCharacterCreation = user?.avatarData && 
    typeof user.avatarData === 'object' && 
    'needsCharacterCreation' in user.avatarData && 
    user.avatarData.needsCharacterCreation;
  const [gameMode, setGameMode] = useState<'menu' | 'bot-setup' | 'friend-setup' | 'searching' | 'duel'>('menu');
  const [gameSettings, setGameSettings] = useState({
    subject: 'Mixed Questions',
    botDifficulty: 'medium',
    friendUsername: ''
  });
  const [opponent, setOpponent] = useState<User | null>(null);
  const [duelData, setDuelData] = useState<any>(null);

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

  // Send friend challenge
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
      await apiRequest('/api/challenge/send', {
        method: 'POST',
        body: JSON.stringify({
          targetUsername: gameSettings.friendUsername,
          subject: gameSettings.subject
        })
      });

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
      await apiRequest('/api/challenge/respond', {
        method: 'POST',
        body: JSON.stringify({
          challengeId: challengeNotification.challengeId,
          accepted
        })
      });

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
    // Create a stealth bot opponent that appears human
    const humanNames = [
      'LegalEagle47', 'JuristJoe', 'BarExamAce', 'LawScholar99', 'AttorneyAtLaw',
      'CounselorCat', 'LegalBeagle', 'JudgeJudy42', 'BarPasser', 'LawStudent2024'
    ];
    
    const botOpponent: User = {
      id: `player_${Date.now()}`,
      username: humanNames[Math.floor(Math.random() * humanNames.length)],
      displayName: humanNames[Math.floor(Math.random() * humanNames.length)],
      password: '', // Not used for bots
      email: null,
      level: gameSettings.botDifficulty === 'easy' ? Math.floor(Math.random() * 3) + 1 : 
             gameSettings.botDifficulty === 'medium' ? Math.floor(Math.random() * 3) + 3 :
             gameSettings.botDifficulty === 'hard' ? Math.floor(Math.random() * 3) + 6 : 
             Math.floor(Math.random() * 2) + 9,
      xp: 0,
      points: Math.floor(Math.random() * 2000) + 100,
      totalWins: Math.floor(Math.random() * 50),
      totalLosses: Math.floor(Math.random() * 30),
      createdAt: new Date(),
      lastLoginAt: null,
      avatarData: {
        base: 'human',
        palette: ['#8b5cf6', '#ef4444', '#10b981', '#f59e0b', '#06b6d4'][Math.floor(Math.random() * 5)],
        props: [['hood', 'staff'], ['armor', 'sword'], ['cloak', 'dagger'], ['runes', 'crystal']][Math.floor(Math.random() * 4)]
      }
    };
    
    setOpponent(botOpponent);
    setDuelData({
      roomCode: `bot_${Date.now()}`,
      subject: gameSettings.subject,
      bestOf: 10,
      ranked: false,
      stake: 0,
      botDifficulty: gameSettings.botDifficulty
    });
    setGameMode('duel');
  };

  const handleStartFriendGame = () => {
    if (!gameSettings.friendUsername.trim()) return;
    
    setGameMode('searching');
    // This would normally search for the friend and initiate a match
    // For now, we'll simulate finding them
    setTimeout(() => {
      const friendOpponent: User = {
        id: `friend_${Date.now()}`,
        username: gameSettings.friendUsername,
        displayName: gameSettings.friendUsername,
        password: '', // Not used for simulated friends
        email: null,
        level: Math.floor(Math.random() * 10) + 1,
        xp: 0,
        points: Math.floor(Math.random() * 2000),
        totalWins: Math.floor(Math.random() * 100),
        totalLosses: Math.floor(Math.random() * 50),
        createdAt: new Date(),
        lastLoginAt: null,
        avatarData: {
          base: 'human',
          palette: '#8b5cf6',
          props: ['hood', 'staff']
        }
      };
      
      setOpponent(friendOpponent);
      setDuelData({
        roomCode: `friend_${Date.now()}`,
        subject: gameSettings.subject,
        bestOf: 10,
        ranked: true,
        stake: 10
      });
      setGameMode('duel');
    }, 2000);
  };

  const handleDuelEnd = () => {
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
        {/* Persistent Logo and Gamer Tag - Top Bar */}
        <div className="fixed top-4 left-4 right-4 z-50 flex items-center justify-between">
          <LawDuelLogo size="sm" showText={true} className="bg-purple-900/30 backdrop-blur-sm rounded-lg px-3 py-2 border border-purple-500/30" />
          <Badge variant="outline" className="border-purple-400/50 text-purple-300 bg-purple-900/30 backdrop-blur-sm">
            @{character.username}
          </Badge>
        </div>
        
        <DuelArena
          user={character}
          opponent={opponent}
          isVisible={true}
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

  if (gameMode === 'searching') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        {/* Persistent Logo and Gamer Tag - Top Bar */}
        <div className="fixed top-4 left-4 right-4 z-50 flex items-center justify-between">
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
                <p className="text-purple-400">Level {character.level} • {character.points} Points</p>
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

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Game Modes */}
          <div className="lg:col-span-2 space-y-6">
            {gameMode === 'menu' && (
              <>
                {/* Quick Match */}
                <Card className="bg-black/40 border-purple-500/20">
                  <CardHeader>
                    <CardTitle className="font-cinzel text-xl flex items-center gap-2 text-purple-300">
                      ⚔️ Quick Match
                      <Badge variant="secondary" className="bg-purple-600/30 text-purple-200 border-purple-500/50">Find Opponent</Badge>
                    </CardTitle>
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
                    
                    <div className="grid grid-cols-2 gap-3">
                      <Button onClick={handleStartBotGame} className="bg-purple-600 hover:bg-purple-700 text-white" size="lg">
                        Live Match
                      </Button>
                      <Button 
                        onClick={async () => {
                          try {
                            const response = await fetch('/api/async/create', {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              credentials: 'include',
                              body: JSON.stringify({
                                subject: gameSettings.subject
                              })
                            });
                            const data = await response.json();
                            toast({
                              title: "Async Match Created!",
                              description: "Check your inbox to play",
                            });
                            setShowAsyncInbox(true);
                          } catch (error) {
                            toast({
                              title: "Failed to create match",
                              description: "Please try again",
                              variant: "destructive"
                            });
                          }
                        }} 
                        className="bg-green-600 hover:bg-green-700 text-white" 
                        size="lg"
                      >
                        Async Match
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                {/* Play with Friend */}
                <Card className="bg-black/40 border-purple-500/20">
                  <CardHeader>
                    <CardTitle className="font-cinzel text-xl flex items-center gap-2 text-purple-300">
                      👥 Play with Friend
                      <Badge variant="default" className="bg-purple-600/30 text-purple-200 border-purple-500/50">Ranked</Badge>
                    </CardTitle>
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
                      <label className="text-sm font-medium mb-2 block">Friend's Username</label>
                      <Input
                        placeholder="Enter username"
                        value={gameSettings.friendUsername}
                        onChange={(e) => setGameSettings(prev => ({ ...prev, friendUsername: e.target.value }))}
                      />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-3">
                      <Button 
                        onClick={handleStartFriendGame} 
                        className="bg-purple-600 hover:bg-purple-700 text-white" 
                        size="lg"
                        disabled={!gameSettings.friendUsername.trim()}
                      >
                        Live Challenge
                      </Button>
                      <Button 
                        onClick={() => setShowAsyncInbox(true)}
                        className="bg-blue-600 hover:bg-blue-700 text-white" 
                        size="lg"
                      >
                        Async Inbox
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </>
            )}
          </div>

          {/* Leaderboard */}
          <div>
            <Leaderboard />
          </div>
        </div>

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
      </div>
    </div>
  );
}