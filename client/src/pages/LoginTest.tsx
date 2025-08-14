import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function LoginTest() {
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('admin123');
  const [status, setStatus] = useState('');
  const [cookies, setCookies] = useState('');

  const testLogin = async () => {
    setStatus('Testing login...');
    
    try {
      // Step 1: Login
      const loginResponse = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ username, password }),
      });
      
      const loginData = await loginResponse.json();
      setStatus(prev => prev + '\n\nLogin Response: ' + JSON.stringify(loginData, null, 2));
      
      // Step 2: Check cookies
      setCookies('Browser cookies: ' + document.cookie);
      
      // Step 3: Test auth check
      const authResponse = await fetch('/api/auth/me', {
        credentials: 'include',
      });
      
      const authData = await authResponse.json();
      setStatus(prev => prev + '\n\nAuth Check: ' + JSON.stringify(authData, null, 2));
      
    } catch (error) {
      setStatus(prev => prev + '\n\nError: ' + error.message);
    }
  };

  const clearSession = () => {
    document.cookie = 'sid=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
    setCookies('Cookies cleared');
    setStatus('Session cleared');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-8">
      <Card className="max-w-2xl mx-auto bg-black/40 border-purple-500/20">
        <CardHeader>
          <CardTitle className="text-2xl font-cinzel text-purple-300">
            Login Debug Test
          </CardTitle>
        </CardHeader>
        
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-slate-200 text-sm">Username</label>
              <Input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="bg-slate-800/50 border-purple-500/30 text-white"
              />
            </div>
            <div>
              <label className="text-slate-200 text-sm">Password</label>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="bg-slate-800/50 border-purple-500/30 text-white"
              />
            </div>
          </div>
          
          <div className="flex gap-4">
            <Button onClick={testLogin} className="bg-purple-600 hover:bg-purple-700">
              Test Login
            </Button>
            <Button onClick={clearSession} variant="outline" className="border-purple-500/30 text-purple-300">
              Clear Session
            </Button>
          </div>
          
          <div className="bg-slate-800/50 p-4 rounded">
            <p className="text-amber-400 font-mono text-sm">{cookies}</p>
          </div>
          
          <pre className="bg-slate-800/50 p-4 rounded text-green-400 text-xs overflow-auto max-h-96">
            {status}
          </pre>
        </CardContent>
      </Card>
    </div>
  );
}