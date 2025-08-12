import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { CharacterCreation } from '@/components/CharacterCreation';
import { QuickMatch } from '@/components/QuickMatch';
import { DuelArena } from '@/components/DuelArena';
import { Leaderboard } from '@/components/Leaderboard';
import { AvatarRenderer } from '@/components/AvatarRenderer';
import { useAuth } from '@/hooks/useAuth';
import { LogOut, User as UserIcon } from 'lucide-react';
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

export default function Home() {
  const { user, logout } = useAuth();
  const [showCharacterCreation, setShowCharacterCreation] = useState(false);
  const [gameMode, setGameMode] = useState<'menu' | 'bot-setup' | 'friend-setup' | 'searching' | 'duel'>('menu');
  const [gameSettings, setGameSettings] = useState({
    subject: 'Mixed Questions',
    botDifficulty: 'medium',
    friendUsername: ''
  });
  const [opponent, setOpponent] = useState<User | null>(null);
  const [duelData, setDuelData] = useState<any>(null);

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

  if (showCharacterCreation) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <CharacterCreation 
          isOpen={true} 
          onClose={() => setShowCharacterCreation(false)} 
          onCharacterCreated={(newCharacter) => {
            // Update user avatar data via API call
            console.log('Character updated:', newCharacter);
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
      level: gameSettings.botDifficulty === 'easy' ? Math.floor(Math.random() * 3) + 1 : 
             gameSettings.botDifficulty === 'medium' ? Math.floor(Math.random() * 3) + 3 :
             gameSettings.botDifficulty === 'hard' ? Math.floor(Math.random() * 3) + 6 : 
             Math.floor(Math.random() * 2) + 9,
      xp: 0,
      points: Math.floor(Math.random() * 2000) + 100,
      totalWins: Math.floor(Math.random() * 50),
      totalLosses: Math.floor(Math.random() * 30),
      createdAt: new Date(),
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
      bestOf: 7,
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
        level: Math.floor(Math.random() * 10) + 1,
        xp: 0,
        points: Math.floor(Math.random() * 2000),
        totalWins: Math.floor(Math.random() * 100),
        totalLosses: Math.floor(Math.random() * 50),
        createdAt: new Date(),
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
        bestOf: 7,
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
      <div className="min-h-screen bg-background">
        <DuelArena
          user={character}
          opponent={opponent}
          isVisible={true}
          onDuelEnd={handleDuelEnd}
        />
        <div className="fixed bottom-4 right-4 space-x-2">
          <Button onClick={handleRematch} variant="outline" size="sm">
            Rematch
          </Button>
          <Button onClick={handleDuelEnd} variant="outline" size="sm">
            Main Menu
          </Button>
        </div>
      </div>
    );
  }

  if (gameMode === 'searching') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="panel max-w-md">
          <CardContent className="p-8 text-center">
            <div className="w-16 h-16 border-4 border-arcane border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <h3 className="font-cinzel text-xl font-bold mb-2">Searching for {gameSettings.friendUsername}</h3>
            <p className="text-muted mb-4">Sending duel invitation...</p>
            <Button onClick={() => setGameMode('menu')} variant="outline">
              Cancel
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container max-w-4xl mx-auto py-8 px-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center space-x-4">
            <AvatarRenderer
              avatarData={character.avatarData as any}
              level={character.level}
              size={64}
            />
            <div>
              <h1 className="font-cinzel text-2xl font-bold">{character.displayName}</h1>
              <p className="text-muted">Level {character.level} • {character.points} Points</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Button 
              onClick={() => setShowCharacterCreation(true)} 
              variant="outline" 
              size="sm"
            >
              Edit Character
            </Button>
            <Button 
              onClick={() => logout.mutate()} 
              variant="outline" 
              size="sm"
              className="text-red-400 hover:text-red-300"
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
                <Card className="panel">
                  <CardHeader>
                    <CardTitle className="font-cinzel text-xl flex items-center gap-2">
                      ⚔️ Quick Match
                      <Badge variant="secondary">Find Opponent</Badge>
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
                    
                    <Button onClick={handleStartBotGame} className="w-full" size="lg">
                      Find Match
                    </Button>
                  </CardContent>
                </Card>

                {/* Play with Friend */}
                <Card className="panel">
                  <CardHeader>
                    <CardTitle className="font-cinzel text-xl flex items-center gap-2">
                      👥 Play with Friend
                      <Badge variant="default">Ranked</Badge>
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
                    
                    <Button 
                      onClick={handleStartFriendGame} 
                      className="w-full" 
                      size="lg"
                      disabled={!gameSettings.friendUsername.trim()}
                    >
                      Challenge Friend
                    </Button>
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
      </div>
    </div>
  );
}