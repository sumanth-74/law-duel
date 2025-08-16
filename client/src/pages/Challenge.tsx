import { useEffect } from 'react';
import { useParams, useLocation } from 'wouter';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, Swords, LogIn } from 'lucide-react';

export default function Challenge() {
  const { username } = useParams() as { username: string };
  const { user, isAuthenticated, isLoading } = useAuth();
  const { toast } = useToast();
  const [, navigate] = useLocation();

  useEffect(() => {
    if (isLoading) return;

    // If not authenticated, redirect to login with return URL
    if (!isAuthenticated) {
      // Store the challenge info in localStorage so we can resume after login
      localStorage.setItem('pendingChallenge', username);
      navigate('/login');
      return;
    }

    // If authenticated and it's the user's own link, show error
    if (user?.username === username) {
      toast({
        title: "Cannot challenge yourself",
        description: "Share this link with friends to receive challenges!",
        variant: "destructive"
      });
      navigate('/');
      return;
    }

    // Auto-create the challenge
    handleCreateChallenge();
  }, [isAuthenticated, isLoading, user, username]);

  const handleCreateChallenge = async () => {
    try {
      const response = await apiRequest(
        'POST',
        '/api/async/create',
        {
          opponentUsername: username,
          subject: 'Mixed Questions',
          questionType: 'bar' // Default to bar exam questions
        }
      );

      const data = await response.json();
      
      // Check if this is an existing match or a new one
      if (data.existing) {
        toast({
          title: "Existing Match Found",
          description: `You already have an active match with ${username}. Opening that match.`,
          variant: "default"
        });
      } else {
        toast({
          title: "Challenge Created!",
          description: `You challenged ${username} to a duel!`,
          variant: "default"
        });
      }

      // Navigate to home and open the match
      navigate('/');
      
      // Store match ID to auto-open it
      if (data.matchId) {
        localStorage.setItem('autoOpenMatch', data.matchId);
      }
    } catch (error) {
      toast({
        title: "Challenge Failed",
        description: error instanceof Error ? error.message : "Could not create challenge",
        variant: "destructive"
      });
      navigate('/');
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <Card className="bg-black/40 border-purple-500/20 p-8">
          <div className="text-center">
            <Loader2 className="h-12 w-12 animate-spin text-purple-400 mx-auto mb-4" />
            <p className="text-purple-300">Processing challenge...</p>
          </div>
        </Card>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <Card className="bg-black/40 border-purple-500/20 max-w-md mx-auto">
          <CardHeader>
            <CardTitle className="text-center text-2xl font-cinzel text-purple-300">
              <Swords className="w-8 h-8 mx-auto mb-2 text-purple-400" />
              Law Duel Challenge
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-center text-purple-200">
              {username} has challenged you to a Law Duel!
            </p>
            <p className="text-center text-purple-300/80 text-sm">
              Sign in to accept this challenge and start playing.
            </p>
            <Button 
              onClick={() => navigate('/login')}
              className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
              size="lg"
            >
              <LogIn className="w-5 h-5 mr-2" />
              Sign In to Accept
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
      <Card className="bg-black/40 border-purple-500/20 p-8">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-purple-400 mx-auto mb-4" />
          <p className="text-purple-300">Creating challenge with {username}...</p>
        </div>
      </Card>
    </div>
  );
}