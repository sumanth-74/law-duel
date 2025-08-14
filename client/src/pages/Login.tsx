import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2 } from "lucide-react";
import { useLocation } from "wouter";

export default function Login() {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [lawSchool, setLawSchool] = useState('');

  const { login, register, isAuthenticated } = useAuth();
  const [, navigate] = useLocation();

  // Redirect to home if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      console.log('User authenticated, redirecting to home...');
      navigate('/');
    }
  }, [isAuthenticated, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Form submitted, mode:', mode, 'username:', username);
    
    if (mode === 'login') {
      console.log('Attempting login with:', { username, password: password ? '***' : 'empty' });
      login.mutate({ username, password });
    } else {
      if (password !== confirmPassword) {
        console.log('Password mismatch');
        return;
      }
      
      // Temporary avatar data - user will customize this next
      const tempAvatar = {
        archetype: 'constitutional_scholar',
        primaryColor: '#8B5CF6',
        secondaryColor: '#A78BFA',
        level: 1,
        needsCharacterCreation: true // Flag to trigger character creation
      };

      console.log('Attempting registration with:', { username, displayName: displayName || username });
      register.mutate({
        username,
        displayName: displayName || username,
        password,
        confirmPassword,
        email: email || undefined,
        lawSchool: lawSchool || undefined,
        avatarData: tempAvatar,
      });
    }
  };

  const error = login.error || register.error;
  const isLoading = login.isPending || register.isPending;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-4">
      <Card className="w-full max-w-md bg-black/40 border-purple-500/20">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-cinzel text-purple-300">
            {mode === 'login' ? 'Enter Law Duel' : 'Join Law Duel'}
          </CardTitle>
          <p className="text-sm text-slate-400">
            {mode === 'login' ? 'Login to your account' : 'Create your legal warrior'}
          </p>
        </CardHeader>
        
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username" className="text-slate-200">Username</Label>
              <Input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                className="bg-slate-800/50 border-purple-500/30 text-white"
                placeholder="Enter your username"
                data-testid="input-username"
              />
            </div>

            {mode === 'register' && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="displayName" className="text-slate-200">Display Name</Label>
                  <Input
                    id="displayName"
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    className="bg-slate-800/50 border-purple-500/30 text-white"
                    placeholder="How others will see you"
                    data-testid="input-display-name"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-slate-200">Email (Optional)</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="bg-slate-800/50 border-purple-500/30 text-white"
                    placeholder="your.email@example.com"
                    data-testid="input-email"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="lawSchool" className="text-slate-200">Law School (Optional)</Label>
                  <Input
                    id="lawSchool"
                    type="text"
                    value={lawSchool}
                    onChange={(e) => setLawSchool(e.target.value)}
                    className="bg-slate-800/50 border-purple-500/30 text-white"
                    placeholder="e.g., Harvard Law School, Stanford Law"
                    data-testid="input-law-school"
                  />
                </div>
              </>
            )}

            <div className="space-y-2">
              <Label htmlFor="password" className="text-slate-200">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                className="bg-slate-800/50 border-purple-500/30 text-white"
                placeholder="Enter your password"
                data-testid="input-password"
              />
            </div>

            {mode === 'register' && (
              <div className="space-y-2">
                <Label htmlFor="confirmPassword" className="text-slate-200">Confirm Password</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  minLength={6}
                  className="bg-slate-800/50 border-purple-500/30 text-white"
                  placeholder="Confirm your password"
                  data-testid="input-confirm-password"
                />
                {password && confirmPassword && password !== confirmPassword && (
                  <p className="text-sm text-red-400">Passwords don't match</p>
                )}
              </div>
            )}

            {error && (
              <Alert className="border-red-500/50 bg-red-900/20">
                <AlertDescription className="text-red-300">
                  {error.message || `${mode === 'login' ? 'Login' : 'Registration'} failed`}
                </AlertDescription>
              </Alert>
            )}

            <Button
              type="submit"
              disabled={isLoading || (mode === 'register' && password !== confirmPassword)}
              className="w-full bg-purple-600 hover:bg-purple-700 text-white"
              data-testid="button-submit"
            >
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {mode === 'login' ? 'Login' : 'Create Account'}
            </Button>

            <div className="text-center">
              <button
                type="button"
                onClick={() => setMode(mode === 'login' ? 'register' : 'login')}
                className="text-sm text-purple-400 hover:text-purple-300 underline"
                data-testid="button-toggle-mode"
              >
                {mode === 'login' ? "Don't have an account? Sign up" : "Already have an account? Login"}
              </button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}