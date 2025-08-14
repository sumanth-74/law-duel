import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/hooks/useAuth';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { CheckCircle, XCircle, LogOut, LogIn, RefreshCw } from 'lucide-react';

export default function AuthDebug() {
  const { user, isAuthenticated, isLoading, logout, refetch } = useAuth();
  const { toast } = useToast();
  const [loginData, setLoginData] = useState({ username: 'admin', password: 'admin123' });
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const handleLogin = async () => {
    setIsLoggingIn(true);
    try {
      await apiRequest('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify(loginData)
      });
      
      // Hard reload to ensure clean state
      window.location.href = '/';
    } catch (error: any) {
      toast({
        title: "Login Failed",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      window.location.href = '/';
    } catch (error) {
      console.error('Logout error:', error);
      // Force reload anyway
      window.location.href = '/';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 p-4">
      <div className="max-w-4xl mx-auto space-y-4">
        
        {/* Current Auth Status */}
        <Card className="bg-gray-800/90 border-purple-500">
          <CardHeader>
            <CardTitle className="text-2xl font-bold text-purple-200">
              Authentication Status
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-2">
              {isLoading ? (
                <RefreshCw className="animate-spin text-yellow-400" />
              ) : isAuthenticated ? (
                <CheckCircle className="text-green-400" />
              ) : (
                <XCircle className="text-red-400" />
              )}
              <span className="text-white text-lg">
                {isLoading ? 'Checking...' : isAuthenticated ? 'Logged In' : 'Not Logged In'}
              </span>
            </div>

            {user && (
              <div className="bg-gray-700/50 p-4 rounded-lg space-y-2">
                <p className="text-purple-200">Username: <span className="text-white font-bold">{user.username}</span></p>
                <p className="text-purple-200">Display Name: <span className="text-white">{user.displayName}</span></p>
                <p className="text-purple-200">Email: <span className="text-white">{user.email}</span></p>
                <p className="text-purple-200">ID: <span className="text-xs text-gray-400">{user.id}</span></p>
              </div>
            )}

            <div className="flex gap-2">
              <Button 
                onClick={() => refetch()} 
                variant="outline"
                className="bg-purple-600 hover:bg-purple-700"
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                Refresh Status
              </Button>
              
              {isAuthenticated && (
                <Button 
                  onClick={handleLogout}
                  variant="destructive"
                  className="bg-red-600 hover:bg-red-700"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  Logout
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Login Form */}
        {!isAuthenticated && !isLoading && (
          <Card className="bg-gray-800/90 border-purple-500">
            <CardHeader>
              <CardTitle className="text-xl font-bold text-purple-200">
                Login
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-purple-200 text-sm">Username</label>
                <Input
                  value={loginData.username}
                  onChange={(e) => setLoginData({...loginData, username: e.target.value})}
                  className="bg-gray-700 text-white border-purple-500"
                  placeholder="Enter username"
                />
              </div>
              
              <div>
                <label className="text-purple-200 text-sm">Password</label>
                <Input
                  type="password"
                  value={loginData.password}
                  onChange={(e) => setLoginData({...loginData, password: e.target.value})}
                  className="bg-gray-700 text-white border-purple-500"
                  placeholder="Enter password"
                />
              </div>

              <Button
                onClick={handleLogin}
                disabled={isLoggingIn}
                className="w-full bg-purple-600 hover:bg-purple-700"
              >
                {isLoggingIn ? (
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <LogIn className="mr-2 h-4 w-4" />
                )}
                {isLoggingIn ? 'Logging in...' : 'Login'}
              </Button>

              <div className="bg-gray-700/50 p-3 rounded">
                <p className="text-purple-200 text-sm">Test Accounts:</p>
                <ul className="text-gray-300 text-xs space-y-1 mt-2">
                  <li>• admin / admin123</li>
                  <li>• debuguser / test123</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Navigation */}
        <Card className="bg-gray-800/90 border-purple-500">
          <CardContent className="pt-6">
            <div className="flex gap-2 flex-wrap">
              <Button
                onClick={() => window.location.href = '/'}
                variant="outline"
                className="bg-purple-600 hover:bg-purple-700"
              >
                Go to Home
              </Button>
              <Button
                onClick={() => window.location.href = '/login'}
                variant="outline"
                className="bg-purple-600 hover:bg-purple-700"
              >
                Go to Login Page
              </Button>
              <Button
                onClick={() => window.location.href = '/play'}
                variant="outline"
                className="bg-purple-600 hover:bg-purple-700"
              >
                Go to Play (if logged in)
              </Button>
            </div>
          </CardContent>
        </Card>

      </div>
    </div>
  );
}