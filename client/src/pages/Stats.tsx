import { useState } from 'react';
import { useLocation, Link } from 'wouter';
import { PlayerStats } from '@/components/PlayerStats';
import { PublicLeaderboard } from '@/components/PublicLeaderboard';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, Search, User, Trophy } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

export default function Stats() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const [searchUsername, setSearchUsername] = useState('');
  const [viewingUserId, setViewingUserId] = useState<string | null>(null);

  // Get userId from URL or use current user
  const urlUserId = window.location.pathname.split('/')[2];
  const currentUserId = viewingUserId || urlUserId || user?.id;
  const isOwnProfile = currentUserId === user?.id;

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchUsername.trim()) return;

    try {
      // Search for user by username
      const response = await fetch('/api/auth/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ username: searchUsername.trim() })
      });

      if (response.ok) {
        const searchedUser = await response.json();
        setViewingUserId(searchedUser.id);
        setLocation(`/stats/${searchedUser.id}`);
      } else {
        // User not found - could show toast here
        console.error('User not found');
      }
    } catch (error) {
      console.error('Search failed:', error);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <Card className="bg-black/40 border-purple-500/30 max-w-md">
          <CardContent className="p-8 text-center">
            <User className="w-12 h-12 mx-auto mb-4 text-purple-400" />
            <h3 className="text-xl font-bold text-purple-200 mb-2">Login Required</h3>
            <p className="text-purple-400 mb-4">Please log in to view player statistics.</p>
            <Link href="/">
              <Button className="bg-purple-600 hover:bg-purple-700 text-white">
                Go to Home
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {/* Header */}
      <div className="border-b border-purple-500/20 bg-black/20 backdrop-blur-sm">
        <div className="container max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/">
                <Button variant="ghost" size="sm" className="text-purple-300 hover:text-purple-200">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to Game
                </Button>
              </Link>
              <h1 className="font-cinzel text-2xl font-bold text-purple-200">
                {isOwnProfile ? 'Your Statistics' : 'Player Statistics'}
              </h1>
            </div>

            {/* Search for other players */}
            <form onSubmit={handleSearch} className="flex gap-2">
              <Input
                placeholder="Search by username..."
                value={searchUsername}
                onChange={(e) => setSearchUsername(e.target.value)}
                className="w-56 bg-slate-800 border-purple-500/30 text-slate-200 placeholder:text-slate-500"
                data-testid="input-search-player"
              />
              <Button 
                type="submit" 
                size="sm" 
                variant="outline" 
                className="border-purple-500/50 text-purple-300 hover:bg-purple-500/20"
                data-testid="button-search-player"
              >
                <Search className="w-4 h-4" />
              </Button>
            </form>
          </div>
        </div>
      </div>

      {/* Stats Content */}
      {currentUserId ? (
        <PlayerStats 
          userId={currentUserId} 
          isOwnProfile={isOwnProfile}
        />
      ) : (
        <div className="container max-w-6xl mx-auto p-6">
          <Tabs defaultValue="browse" className="w-full">
            <TabsList className="grid w-full grid-cols-2 max-w-md mx-auto mb-6 bg-slate-800 border-purple-500/30">
              <TabsTrigger 
                value="browse" 
                className="data-[state=active]:bg-purple-600 data-[state=active]:text-white"
                data-testid="tab-browse-players"
              >
                <Trophy className="w-4 h-4 mr-2" />
                Browse Players
              </TabsTrigger>
              <TabsTrigger 
                value="search" 
                className="data-[state=active]:bg-purple-600 data-[state=active]:text-white"
                data-testid="tab-search-player"
              >
                <Search className="w-4 h-4 mr-2" />
                Search Player
              </TabsTrigger>
            </TabsList>

            <TabsContent value="browse">
              <PublicLeaderboard />
            </TabsContent>

            <TabsContent value="search">
              <Card className="bg-black/40 border-purple-500/20 max-w-md mx-auto">
                <CardContent className="p-8 text-center">
                  <User className="w-12 h-12 mx-auto mb-4 text-purple-400" />
                  <h3 className="text-xl font-bold text-purple-200 mb-2">Search for a Player</h3>
                  <p className="text-purple-400 mb-4">Enter a username in the search box above to view their statistics.</p>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      )}
    </div>
  );
}