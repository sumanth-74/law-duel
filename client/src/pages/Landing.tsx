import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import LawDuelLogo from '@/components/LawDuelLogo';
import { BookOpen, Scale, Users, GraduationCap } from 'lucide-react';
import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';

export default function Landing() {
  const { toast } = useToast();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isSigningUp, setIsSigningUp] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [showLoginForm, setShowLoginForm] = useState(false);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim()) return;
    
    setIsSigningUp(true);
    try {
      // Check if username is available
      const checkResponse = await fetch('/api/auth/check-username', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: username.trim() })
      });
      
      if (checkResponse.ok) {
        // Redirect to signup page with username
        window.location.href = `/signup?username=${encodeURIComponent(username.trim())}`;
      } else {
        const error = await checkResponse.json();
        toast({
          title: "Username not available",
          description: error.message || 'Please try a different username',
          variant: "destructive"
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: 'Failed to check username. Please try again.',
        variant: "destructive"
      });
    } finally {
      setIsSigningUp(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) return;
    
    setIsLoggingIn(true);
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ 
          username: username.trim(), 
          password: password.trim() 
        })
      });
      
      if (response.ok) {
        // Successful login - reload to go to home page
        window.location.href = '/';
      } else {
        const error = await response.json();
        toast({
          title: "Login failed",
          description: error.message || 'Invalid username or password',
          variant: "destructive"
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: 'Failed to login. Please try again.',
        variant: "destructive"
      });
    } finally {
      setIsLoggingIn(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {/* Navigation */}
      <nav className="fixed top-0 w-full z-50 bg-black/20 backdrop-blur-sm border-b border-purple-500/20">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <LawDuelLogo size="md" showText={true} />
          <div className="flex gap-2">
            <Button 
              onClick={() => setShowLoginForm(!showLoginForm)} 
              variant="outline"
              className="border-purple-500/50 text-purple-300 hover:bg-purple-500/20"
            >
              {showLoginForm ? 'Sign Up' : 'Sign In'}
            </Button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="pt-24 pb-16">
        <div className="container mx-auto px-4 text-center">
          {/* Large Logo */}
          <div className="mb-8 flex justify-center">
            <LawDuelLogo size="xl" className="scale-150" />
          </div>
          
          <h1 className="font-cinzel text-6xl md:text-7xl font-bold mb-6">
            <span className="bg-gradient-to-r from-purple-400 via-purple-300 to-purple-500 bg-clip-text text-transparent">
              Law Duel
            </span>
          </h1>
          
          <p className="text-lg md:text-xl text-purple-200 mb-8 max-w-3xl mx-auto">
            Master law school exams and bar review through competitive duels. Test your knowledge, track progress, and play with friends.
          </p>

          {/* Login/Signup Form */}
          <div className="max-w-md mx-auto mb-12">
            <Card className="bg-black/40 border-purple-500/30">
              <CardContent className="p-6">
                <h2 className="font-cinzel text-xl text-purple-200 mb-4 text-center">
                  {showLoginForm ? 'Welcome Back' : 'Get Started'}
                </h2>
                
                {showLoginForm ? (
                  <form onSubmit={handleLogin} className="space-y-4">
                    <Input
                      type="text"
                      placeholder="Username"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      className="bg-slate-800 border-purple-500/30 text-slate-200"
                      disabled={isLoggingIn}
                    />
                    <Input
                      type="password"
                      placeholder="Password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="bg-slate-800 border-purple-500/30 text-slate-200"
                      disabled={isLoggingIn}
                    />
                    <Button 
                      type="submit"
                      className="w-full bg-purple-600 hover:bg-purple-700 text-white"
                      disabled={!username.trim() || !password.trim() || isLoggingIn}
                    >
                      {isLoggingIn ? 'Signing In...' : 'Sign In'}
                    </Button>
                    <p className="text-center text-sm text-purple-300">
                      Don't have an account? 
                      <button
                        type="button"
                        onClick={() => {
                          setShowLoginForm(false);
                          setPassword('');
                        }}
                        className="text-purple-400 hover:text-purple-300 ml-1 underline"
                      >
                        Sign up
                      </button>
                    </p>
                  </form>
                ) : (
                  <form onSubmit={handleSignup} className="space-y-4">
                    <Input
                      type="text"
                      placeholder="Choose your username"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      className="bg-slate-800 border-purple-500/30 text-slate-200"
                      disabled={isSigningUp}
                    />
                    <Button 
                      type="submit"
                      className="w-full bg-purple-600 hover:bg-purple-700 text-white"
                      disabled={!username.trim() || isSigningUp}
                    >
                      {isSigningUp ? 'Creating Account...' : 'Create Account & Avatar'}
                    </Button>
                    <p className="text-center text-sm text-purple-300">
                      Already have an account? 
                      <button
                        type="button"
                        onClick={() => setShowLoginForm(true)}
                        className="text-purple-400 hover:text-purple-300 ml-1 underline"
                      >
                        Sign in
                      </button>
                    </p>
                  </form>
                )}

              </CardContent>
            </Card>
          </div>

          {/* Features */}
          <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            <Card className="bg-black/40 border-purple-500/20">
              <CardContent className="p-6 text-center">
                <div className="w-16 h-16 bg-purple-600/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <GraduationCap className="w-8 h-8 text-purple-400" />
                </div>
                <h3 className="font-cinzel text-lg font-bold text-purple-200 mb-3">Law School Exams</h3>
                <p className="text-purple-300/80 text-sm">
                  Constitutional Law, Contracts, Torts, Civil Procedure, Criminal Law, Property Law
                </p>
              </CardContent>
            </Card>

            <Card className="bg-black/40 border-purple-500/20">
              <CardContent className="p-6 text-center">
                <div className="w-16 h-16 bg-purple-600/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Scale className="w-8 h-8 text-purple-400" />
                </div>
                <h3 className="font-cinzel text-lg font-bold text-purple-200 mb-3">Bar Exam Prep</h3>
                <p className="text-purple-300/80 text-sm">
                  MBE-style questions with detailed explanations and answer breakdowns
                </p>
              </CardContent>
            </Card>

            <Card className="bg-black/40 border-purple-500/20">
              <CardContent className="p-6 text-center">
                <div className="w-16 h-16 bg-purple-600/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Users className="w-8 h-8 text-purple-400" />
                </div>
                <h3 className="font-cinzel text-lg font-bold text-purple-200 mb-3">Competitive Study</h3>
                <p className="text-purple-300/80 text-sm">
                  Duel other students, track progress, and climb the leaderboard
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-purple-500/20 bg-black/20">
        <div className="container mx-auto px-4 py-8 text-center">
          <LawDuelLogo size="sm" showText={true} className="justify-center mb-4" />

        </div>
      </footer>
    </div>
  );
}