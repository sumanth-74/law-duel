import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { QuickMatch } from './QuickMatch';
import { Leaderboard } from './Leaderboard';
import { AvatarRenderer } from './AvatarRenderer';
import type { User } from '@shared/schema';

interface DashboardProps {
  user: User;
  onQuickMatch: (subject: string) => void;
}

const SUBJECTS = [
  { 
    name: "Evidence", 
    icon: "fas fa-gavel", 
    color: "from-indigo-500 to-purple-600",
    description: "FRE 401-901"
  },
  { 
    name: "Contracts", 
    icon: "fas fa-handshake", 
    color: "from-mystic-gold to-yellow-600",
    description: "UCC & Common Law"
  },
  { 
    name: "Torts", 
    icon: "fas fa-shield-alt", 
    color: "from-red-500 to-pink-600",
    description: "Negligence & Strict Liability"
  },
  { 
    name: "Property", 
    icon: "fas fa-home", 
    color: "from-green-500 to-teal-600",
    description: "Real & Personal"
  },
  { 
    name: "Civil Procedure", 
    icon: "fas fa-balance-scale", 
    color: "from-blue-500 to-cyan-600",
    description: "FRCP & Jurisdiction"
  },
  { 
    name: "Constitutional Law", 
    icon: "fas fa-landmark", 
    color: "from-purple-500 to-indigo-600",
    description: "Fed Powers & Rights"
  },
  { 
    name: "Criminal Law/Procedure", 
    icon: "fas fa-gavel", 
    color: "from-red-600 to-orange-600",
    description: "Elements & 4th-6th Amend"
  }
];

export function Dashboard({ user, onQuickMatch }: DashboardProps) {
  const [selectedSubject, setSelectedSubject] = useState<string>('');

  const winRate = user.totalWins + user.totalLosses > 0 
    ? Math.round((user.totalWins / (user.totalWins + user.totalLosses)) * 100)
    : 0;

  const xpToNextLevel = (user.level * 50) - user.xp;
  const xpProgress = ((user.xp % 50) / 50) * 100;

  return (
    <div className="space-y-8">
      {/* Quick Actions Hero */}
      <div className="text-center">
        <h2 className="font-cinzel text-4xl font-bold mb-4">Ready for Battle?</h2>
        <p className="text-muted text-lg mb-8">Test your legal knowledge in arcane duels</p>
        
        <QuickMatch onStartMatch={onQuickMatch} />
      </div>

      {/* Subject Selection */}
      <Card className="panel">
        <CardContent className="p-6">
          <h3 className="font-cinzel text-2xl font-bold mb-6 text-center">Choose Your Arena</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {SUBJECTS.map((subject) => (
              <div
                key={subject.name}
                className={`panel-2 border border-white/10 rounded-xl p-4 text-center cursor-pointer hover:bg-white/5 hover:transform hover:scale-105 transition-all ${
                  selectedSubject === subject.name ? 'ring-2 ring-arcane' : ''
                }`}
                onClick={() => setSelectedSubject(subject.name)}
                data-testid={`subject-${subject.name.toLowerCase().replace(/[^a-z0-9]/g, '-')}`}
              >
                <div className={`w-12 h-12 bg-gradient-to-br ${subject.color} rounded-xl mx-auto mb-3 flex items-center justify-center`}>
                  <i className={`${subject.icon} text-white`}></i>
                </div>
                <h4 className="font-semibold mb-1">{subject.name}</h4>
                <p className="text-xs text-muted">{subject.description}</p>
              </div>
            ))}
          </div>
          
          {selectedSubject && (
            <div className="mt-6 text-center">
              <Button 
                onClick={() => onQuickMatch(selectedSubject)}
                className="btn-primary py-3 px-8 font-bold"
                data-testid="button-start-selected-subject"
              >
                Start {selectedSubject} Duel
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Stats and Leaderboard */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Leaderboard */}
        <Leaderboard />
        
        {/* User Statistics */}
        <Card className="panel">
          <CardContent className="p-6">
            <h3 className="font-cinzel text-2xl font-bold mb-6">Your Stats</h3>
            
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="text-center">
                <p className="text-3xl font-bold text-success">{user.totalWins}</p>
                <p className="text-sm text-muted">Total Wins</p>
              </div>
              <div className="text-center">
                <p className="text-3xl font-bold text-danger">{user.totalLosses}</p>
                <p className="text-sm text-muted">Total Losses</p>
              </div>
            </div>
            
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span>Win Rate</span>
                  <span className="font-semibold">{winRate}%</span>
                </div>
                <div className="w-full bg-panel-2 rounded-full h-2">
                  <div 
                    className="bg-success h-2 rounded-full transition-all duration-300" 
                    style={{ width: `${winRate}%` }}
                  ></div>
                </div>
              </div>
              
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span>Progress to Level {user.level + 1}</span>
                  <span className="font-semibold">{user.xp % 50}/50 XP</span>
                </div>
                <div className="w-full bg-panel-2 rounded-full h-2">
                  <div 
                    className="bg-arcane h-2 rounded-full transition-all duration-300" 
                    style={{ width: `${xpProgress}%` }}
                  ></div>
                </div>
              </div>
            </div>
            
            {/* Recent Matches Section */}
            <div className="mt-6 pt-6 border-t border-white/10">
              <h4 className="font-semibold mb-4">Profile</h4>
              <div className="flex items-center space-x-4">
                <AvatarRenderer 
                  avatarData={user.avatarData && typeof user.avatarData === 'object' && 'props' in user.avatarData 
                    ? user.avatarData as { props: string[]; base: string; palette: string; archetypeId?: string; customLabel?: string; }
                    : {
                        props: [],
                        base: 'default',
                        palette: 'default'
                      }
                  }
                  level={user.level}
                  size={80}
                />
                <div>
                  <h3 className="font-semibold text-lg">{user.displayName}</h3>
                  <p className="text-sm text-muted">Level {user.level} • {user.points} Points</p>
                  <p className="text-xs text-muted">{user.xp} XP • {xpToNextLevel} to next level</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
