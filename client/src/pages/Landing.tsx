import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import LawDuelLogo from '@/components/LawDuelLogo';
import { BookOpen, Scale, Users, GraduationCap } from 'lucide-react';
import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';

export default function Landing() {
  const { toast } = useToast();
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSigningUp, setIsSigningUp] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  
  // Separate state for modal login form
  const [modalUsername, setModalUsername] = useState('');
  const [modalPassword, setModalPassword] = useState('');

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !email.trim()) return;
    
    setIsSigningUp(true);
    try {
      // Check if username is available
      const checkResponse = await fetch('/api/auth/check-username', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: username.trim() })
      });
      
      if (checkResponse.ok) {
        // Redirect to signup page with username and email
        window.location.href = `/signup?username=${encodeURIComponent(username.trim())}&email=${encodeURIComponent(email.trim())}`;
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

  const handleModalLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!modalUsername.trim() || !modalPassword.trim()) return;
    
    setIsLoggingIn(true);
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ 
          username: modalUsername.trim(), 
          password: modalPassword.trim() 
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
              onClick={() => setShowLoginModal(true)} 
              variant="outline"
              className="border-purple-500/50 text-purple-300 hover:bg-purple-500/20"
            >
              Sign In
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
            Master law school exams and bar review through competitive duels and daily challenges. Test your knowledge, track progress, and play with friends.
          </p>

          {/* Login/Signup Form */}
          <div className="max-w-md mx-auto mb-12">
            <Card className="bg-black/40 border-purple-500/30">
              <CardContent className="p-6">
                <h2 className="font-cinzel text-xl text-purple-200 mb-4 text-center">Get Started</h2>
                
                <form onSubmit={handleSignup} className="space-y-4">
                  <Input
                    type="text"
                    placeholder="Choose your username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="bg-slate-800 border-purple-500/30 text-slate-200"
                    disabled={isSigningUp}
                    required
                  />
                  <Input
                    type="email"
                    placeholder="Email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="bg-slate-800 border-purple-500/30 text-slate-200"
                    disabled={isSigningUp}
                    required
                  />
                  <Button 
                    type="submit"
                    className="w-full bg-purple-600 hover:bg-purple-700 text-white"
                    disabled={!username.trim() || !email.trim() || isSigningUp}
                  >
                    {isSigningUp ? 'Creating Account...' : 'Create Account & Avatar'}
                  </Button>
                  <p className="text-center text-sm text-purple-300">
                    Already have an account? 
                    <button
                      type="button"
                      onClick={() => setShowLoginModal(true)}
                      className="text-purple-400 hover:text-purple-300 ml-1 underline"
                    >
                      Sign in
                    </button>
                  </p>
                </form>

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

      {/* Login Modal */}
      <Dialog open={showLoginModal} onOpenChange={setShowLoginModal}>
        <DialogContent className="bg-slate-900 border-purple-500/30 max-w-md">
          <DialogHeader>
            <DialogTitle className="font-cinzel text-xl text-purple-200 text-center">
              Welcome Back
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleModalLogin} className="space-y-4">
            <Input
              type="text"
              placeholder="Username"
              value={modalUsername}
              onChange={(e) => setModalUsername(e.target.value)}
              className="bg-slate-800 border-purple-500/30 text-slate-200"
              disabled={isLoggingIn}
              autoFocus
            />
            <Input
              type="password"
              placeholder="Password"
              value={modalPassword}
              onChange={(e) => setModalPassword(e.target.value)}
              className="bg-slate-800 border-purple-500/30 text-slate-200"
              disabled={isLoggingIn}
            />
            <Button 
              type="submit"
              className="w-full bg-purple-600 hover:bg-purple-700 text-white"
              disabled={!modalUsername.trim() || !modalPassword.trim() || isLoggingIn}
            >
              {isLoggingIn ? 'Signing In...' : 'Sign In'}
            </Button>
            <p className="text-center text-sm text-purple-300">
              Don't have an account? 
              <button
                type="button"
                onClick={() => {
                  setShowLoginModal(false);
                  setModalUsername('');
                  setModalPassword('');
                }}
                className="text-purple-400 hover:text-purple-300 ml-1 underline"
              >
                Sign up below
              </button>
            </p>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}