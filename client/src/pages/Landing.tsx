import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import LawDuelLogo from '@/components/LawDuelLogo';
import { BookOpen, Scale, Users, GraduationCap, Shield, Sparkles, BookOpenCheck, Zap, X } from 'lucide-react';
import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { motion, AnimatePresence } from 'framer-motion';
import atticusCatImage from '../../assets/atticus_cat.png';

export default function Landing() {
  const { toast } = useToast();
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSigningUp, setIsSigningUp] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showSignupModal, setShowSignupModal] = useState(false);
  
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
        // Successful login - force full page reload to refresh auth state
        console.log('Login successful, reloading page...');
        window.location.reload();
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
    <div className="h-screen w-screen overflow-hidden relative">
      {/* Mystical Background with Atticus Cat Image - Full Image Visible */}
      <div 
        className="absolute inset-0 bg-contain bg-center bg-no-repeat"
        style={{ 
          backgroundImage: `url(${atticusCatImage})`,
          backgroundPosition: 'center center',
          backgroundSize: 'contain'
        }}
      >
        {/* Dark mystical overlay - reduced opacity to show cat better */}
        <div className="absolute inset-0 bg-gradient-to-br from-purple-900/60 via-black/40 to-purple-800/60" />
        
        {/* Subtle mystical effects */}
        <div className="absolute inset-0">
          {/* Floating mystical sparkles - reduced and repositioned */}
          <motion.div
            animate={{ 
              y: [0, -20, 0],
              rotate: [0, 360],
              scale: [1, 1.1, 1]
            }}
            transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
            className="absolute top-16 left-16 text-purple-300/50"
          >
            <Sparkles className="w-6 h-6" />
          </motion.div>
          
          <motion.div
            animate={{ 
              y: [0, 15, 0],
              rotate: [0, -360],
              scale: [1, 1.2, 1]
            }}
            transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
            className="absolute top-20 right-20 text-purple-400/40"
          >
            <Sparkles className="w-5 h-5" />
          </motion.div>
          
          <motion.div
            animate={{ 
              y: [0, -15, 0],
              rotate: [0, 180, 360],
              scale: [1, 0.9, 1]
            }}
            transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
            className="absolute bottom-20 left-20 text-purple-200/30"
          >
            <Sparkles className="w-4 h-4" />
          </motion.div>
          
          <motion.div
            animate={{ 
              y: [0, 20, 0],
              rotate: [0, -180, -360],
              scale: [1, 1.3, 1]
            }}
            transition={{ duration: 14, repeat: Infinity, ease: "easeInOut" }}
            className="absolute bottom-16 right-16 text-purple-500/40"
          >
            <Sparkles className="w-7 h-7" />
          </motion.div>
        </div>
      </div>

      {/* Main Content Container - Game-like Layout */}
      <div className="relative z-10 h-full flex flex-col items-center justify-end text-center px-4 pb-16">
        
        {/* Mystical Atticus Icon Above Title */}
        <motion.div
          initial={{ opacity: 0, scale: 0.5, rotate: -180 }}
          animate={{ opacity: 1, scale: 1, rotate: 0 }}
          transition={{ duration: 1.5, delay: 0.2 }}
          className="mb-2"
        >
          <motion.div
            animate={{ 
              rotate: [0, 5, -5, 0],
              scale: [1, 1.05, 1]
            }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
            className="w-16 h-16 bg-gradient-to-br from-purple-500/80 to-purple-700/80 rounded-full flex items-center justify-center border-2 border-purple-300/60 shadow-2xl backdrop-blur-sm"
          >
            <Scale className="w-8 h-8 text-white" />
          </motion.div>
        </motion.div>
        
        {/* Law Duel Title - Reduced Size */}
        <motion.h1
          initial={{ opacity: 0, y: -30, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 1, delay: 0.5 }}
          className="font-cinzel text-5xl md:text-6xl font-bold mb-2"
        >
          <span className="bg-gradient-to-r from-white via-purple-100 to-purple-200 bg-clip-text text-transparent drop-shadow-2xl">
            LAW DUEL
          </span>
        </motion.h1>
        
        {/* Subtitle - Reduced Size */}
        <motion.p
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.8 }}
          className="text-lg md:text-xl text-purple-100 mb-6 font-medium tracking-wide"
        >
          Learn the law through epic legal duels
        </motion.p>

        {/* Action Buttons - Reduced Size */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 1 }}
          className="flex flex-col sm:flex-row gap-4 mb-6"
        >
          <motion.div
            whileHover={{ scale: 1.03, y: -1 }}
            whileTap={{ scale: 0.97 }}
          >
                  <Button 
              onClick={() => setShowSignupModal(true)}
              className="bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white px-8 py-4 text-lg font-bold rounded-xl border border-purple-400/50 shadow-xl transition-all duration-300"
                  >
              <Sparkles className="w-5 h-5 mr-2" />
              Sign Up
                  </Button>
          </motion.div>
          <motion.div
            whileHover={{ scale: 1.03, y: -1 }}
            whileTap={{ scale: 0.97 }}
          >
            <Button 
                      onClick={() => setShowLoginModal(true)}
              variant="outline"
              className="border border-purple-300/60 text-purple-100 hover:bg-purple-500/20 hover:border-purple-200 px-8 py-4 text-lg font-bold rounded-xl shadow-xl transition-all duration-300 backdrop-blur-sm"
            >
              <Zap className="w-5 h-5 mr-2" />
              Play Now
            </Button>
          </motion.div>
        </motion.div>

        {/* Feature Cards - Uniform Smaller Size */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 1.3 }}
          className="grid grid-cols-2 md:grid-cols-4 gap-3 max-w-5xl mx-auto"
        >
          <motion.div
            whileHover={{ y: -4, scale: 1.02 }}
            transition={{ duration: 0.2 }}
          >
            <Card className="bg-black/50 border-purple-400/40 backdrop-blur-md hover:border-purple-300/70 transition-all duration-300 h-full">
              <CardContent className="p-4 text-center">
                <motion.div 
                  className="w-12 h-12 bg-gradient-to-br from-purple-500/40 to-purple-700/40 rounded-full flex items-center justify-center mx-auto mb-3 border border-purple-400/60"
                  whileHover={{ scale: 1.1, rotate: 5 }}
                  transition={{ duration: 0.2 }}
                >
                  <Shield className="w-6 h-6 text-purple-200" />
                </motion.div>
                <h3 className="font-cinzel text-sm font-bold text-purple-100 mb-2">Real-World Law</h3>
                <p className="text-purple-200/90 text-xs leading-tight">
                  Traffic stops, Miranda rights, DUI laws
                </p>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            whileHover={{ y: -4, scale: 1.02 }}
            transition={{ duration: 0.2 }}
          >
            <Card className="bg-black/50 border-purple-400/40 backdrop-blur-md hover:border-purple-300/70 transition-all duration-300 h-full">
              <CardContent className="p-4 text-center">
                <motion.div 
                  className="w-12 h-12 bg-gradient-to-br from-purple-500/40 to-purple-700/40 rounded-full flex items-center justify-center mx-auto mb-3 border border-purple-400/60"
                  whileHover={{ scale: 1.1, rotate: 5 }}
                  transition={{ duration: 0.2 }}
                >
                  <GraduationCap className="w-6 h-6 text-purple-200" />
                </motion.div>
                <h3 className="font-cinzel text-sm font-bold text-purple-100 mb-2">Law School</h3>
                <p className="text-purple-200/90 text-xs leading-tight">
                  Con Law, Contracts, Torts, Civ Pro
                </p>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            whileHover={{ y: -4, scale: 1.02 }}
            transition={{ duration: 0.2 }}
          >
            <Card className="bg-black/50 border-purple-400/40 backdrop-blur-md hover:border-purple-300/70 transition-all duration-300 h-full">
              <CardContent className="p-4 text-center">
                <motion.div 
                  className="w-12 h-12 bg-gradient-to-br from-purple-500/40 to-purple-700/40 rounded-full flex items-center justify-center mx-auto mb-3 border border-purple-400/60"
                  whileHover={{ scale: 1.1, rotate: 5 }}
                  transition={{ duration: 0.2 }}
                >
                  <Scale className="w-6 h-6 text-purple-200" />
                </motion.div>
                <h3 className="font-cinzel text-sm font-bold text-purple-100 mb-2">Bar Exam</h3>
                <p className="text-purple-200/90 text-xs leading-tight">
                  MBE-style questions with explanations
                </p>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            whileHover={{ y: -4, scale: 1.02 }}
            transition={{ duration: 0.2 }}
          >
            <Card className="bg-black/50 border-purple-400/40 backdrop-blur-md hover:border-purple-300/70 transition-all duration-300 h-full">
              <CardContent className="p-4 text-center">
                <motion.div 
                  className="w-12 h-12 bg-gradient-to-br from-purple-500/40 to-purple-700/40 rounded-full flex items-center justify-center mx-auto mb-3 border border-purple-400/60"
                  whileHover={{ scale: 1.1, rotate: 5 }}
                  transition={{ duration: 0.2 }}
                >
                  <Users className="w-6 h-6 text-purple-200" />
                </motion.div>
                <h3 className="font-cinzel text-sm font-bold text-purple-100 mb-2">Compete</h3>
                <p className="text-purple-200/90 text-xs leading-tight">
                  Duel friends, track progress
                </p>
              </CardContent>
            </Card>
          </motion.div>
        </motion.div>
      </div>

      {/* Login Modal */}
      <Dialog open={showLoginModal} onOpenChange={setShowLoginModal}>
        <DialogContent className="bg-black/90 border-purple-500/40 max-w-md backdrop-blur-xl shadow-2xl">
          <DialogHeader>
            <DialogTitle className="font-cinzel text-2xl text-purple-200 text-center mb-4">
              <span className="bg-gradient-to-r from-purple-300 to-purple-400 bg-clip-text text-transparent">
                Welcome Back, Duelist
              </span>
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleModalLogin} className="space-y-6">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.4 }}
            >
            <Input
              type="text"
              placeholder="Username"
              value={modalUsername}
              onChange={(e) => setModalUsername(e.target.value)}
                className="bg-slate-800/80 border-purple-500/40 text-slate-200 placeholder:text-slate-400 focus:border-purple-400 transition-all duration-300 py-3"
              disabled={isLoggingIn}
              autoFocus
            />
            </motion.div>
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.4, delay: 0.1 }}
            >
            <Input
              type="password"
              placeholder="Password"
              value={modalPassword}
              onChange={(e) => setModalPassword(e.target.value)}
                className="bg-slate-800/80 border-purple-500/40 text-slate-200 placeholder:text-slate-400 focus:border-purple-400 transition-all duration-300 py-3"
              disabled={isLoggingIn}
            />
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.2 }}
            >
            <Button 
              type="submit"
                className="w-full bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white font-semibold py-4 rounded-lg shadow-xl transition-all duration-300"
              disabled={!modalUsername.trim() || !modalPassword.trim() || isLoggingIn}
            >
                {isLoggingIn ? (
                  <div className="flex items-center justify-center">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                    Signing In...
                  </div>
                ) : (
                  <div className="flex items-center justify-center">
                    <Zap className="w-4 h-4 mr-2" />
                    Enter the Arena
                  </div>
                )}
            </Button>
            </motion.div>
            <p className="text-center text-sm text-purple-300">
              Don't have an account? 
              <button
                type="button"
                onClick={() => {
                  setShowLoginModal(false);
                  setShowSignupModal(true);
                  setModalUsername('');
                  setModalPassword('');
                }}
                className="text-purple-400 hover:text-purple-300 ml-1 underline transition-colors duration-300"
              >
                Join the duel
              </button>
            </p>
          </form>
        </DialogContent>
      </Dialog>

      {/* Signup Modal */}
      <Dialog open={showSignupModal} onOpenChange={setShowSignupModal}>
        <DialogContent className="bg-black/90 border-purple-500/40 max-w-md backdrop-blur-xl shadow-2xl">
          <DialogHeader>
            <DialogTitle className="font-cinzel text-2xl text-purple-200 text-center mb-4">
              <span className="bg-gradient-to-r from-purple-300 to-purple-400 bg-clip-text text-transparent">
                Join the Duel
              </span>
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSignup} className="space-y-6">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.4 }}
            >
              <Input
                type="text"
                placeholder="Choose your username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="bg-slate-800/80 border-purple-500/40 text-slate-200 placeholder:text-slate-400 focus:border-purple-400 transition-all duration-300 py-3"
                disabled={isSigningUp}
                autoFocus
                required
              />
            </motion.div>
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.4, delay: 0.1 }}
            >
              <Input
                type="email"
                placeholder="Email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="bg-slate-800/80 border-purple-500/40 text-slate-200 placeholder:text-slate-400 focus:border-purple-400 transition-all duration-300 py-3"
                disabled={isSigningUp}
                required
              />
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.2 }}
            >
              <Button 
                type="submit"
                className="w-full bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white font-semibold py-4 rounded-lg shadow-xl transition-all duration-300"
                disabled={!username.trim() || !email.trim() || isSigningUp}
              >
                {isSigningUp ? (
                  <div className="flex items-center justify-center">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                    Creating Account...
                  </div>
                ) : (
                  <div className="flex items-center justify-center">
                    <Sparkles className="w-4 h-4 mr-2" />
                    Create Account & Avatar
                  </div>
                )}
              </Button>
            </motion.div>
            <p className="text-center text-sm text-purple-300">
              Already have an account? 
              <button
                type="button"
                onClick={() => {
                  setShowSignupModal(false);
                  setShowLoginModal(true);
                  setUsername('');
                  setEmail('');
                }}
                className="text-purple-400 hover:text-purple-300 ml-1 underline transition-colors duration-300"
              >
                Sign in
              </button>
            </p>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}