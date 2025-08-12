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

const BOT_DIFFICULTIES = [
  { value: 'easy', label: 'Easy', description: 'Slower responses, 70% accuracy' },
  { value: 'medium', label: 'Medium', description: 'Human-like timing, 80% accuracy' },
  { value: 'hard', label: 'Hard', description: 'Quick responses, 90% accuracy' },
  { value: 'expert', label: 'Expert', description: 'Lightning fast, 95% accuracy' }
];

export default function Home() {
  const [character, setCharacter] = useState<User | null>(() => {
    const saved = localStorage.getItem('bar-duel-character');
    return saved ? JSON.parse(saved) : null;
  });

  const [gameMode, setGameMode] = useState<'menu' | 'bot-setup' | 'friend-setup' | 'searching' | 'duel'>('menu');
  const [gameSettings, setGameSettings] = useState({
    subject: 'Mixed Questions',
    botDifficulty: 'medium',
    friendUsername: ''
  });
  const [opponent, setOpponent] = useState<User | null>(null);
  const [duelData, setDuelData] = useState<any>(null);

  if (!character) {
    return <CharacterCreation onComplete={setCharacter} />;
  }

  const handleStartBotGame = () => {
    // Create a bot opponent based on difficulty
    const botOpponent: User = {
      id: `bot_${Date.now()}`,
      username: `Bot_${gameSettings.botDifficulty}`,
      displayName: `${BOT_DIFFICULTIES.find(d => d.value === gameSettings.botDifficulty)?.label} Bot`,
      level: gameSettings.botDifficulty === 'easy' ? 1 : 
             gameSettings.botDifficulty === 'medium' ? 3 :
             gameSettings.botDifficulty === 'hard' ? 5 : 8,
      points: Math.floor(Math.random() * 1000),
      avatarData: {
        base: 'robot',
        palette: '#64748b',
        props: ['circuits', 'antenna']
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
        points: Math.floor(Math.random() * 2000),
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
              avatarData={character.avatarData}
              level={character.level}
              size={64}
            />
            <div>
              <h1 className="font-cinzel text-2xl font-bold">{character.displayName}</h1>
              <p className="text-muted">Level {character.level} • {character.points} Points</p>
            </div>
          </div>
          <Button 
            onClick={() => setCharacter(null)} 
            variant="outline" 
            size="sm"
          >
            Change Character
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Game Modes */}
          <div className="lg:col-span-2 space-y-6">
            {gameMode === 'menu' && (
              <>
                {/* Play Against Bot */}
                <Card className="panel">
                  <CardHeader>
                    <CardTitle className="font-cinzel text-xl flex items-center gap-2">
                      🤖 Play Against Bot
                      <Badge variant="secondary">Practice Mode</Badge>
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
                      <label className="text-sm font-medium mb-2 block">Bot Difficulty</label>
                      <Select 
                        value={gameSettings.botDifficulty}
                        onValueChange={(value) => setGameSettings(prev => ({ ...prev, botDifficulty: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {BOT_DIFFICULTIES.map(difficulty => (
                            <SelectItem key={difficulty.value} value={difficulty.value}>
                              <div>
                                <div className="font-medium">{difficulty.label}</div>
                                <div className="text-xs text-muted">{difficulty.description}</div>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <Button onClick={handleStartBotGame} className="w-full" size="lg">
                      Start Practice Duel
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