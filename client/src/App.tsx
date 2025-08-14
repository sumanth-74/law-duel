import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/useAuth";
import Home from "@/pages/Home";
import Login from "@/pages/Login";
import Landing from "@/pages/Landing";
import Stats from "@/pages/Stats";
import DailyCasefile from "@/pages/DailyCasefile";
import DuelTestPage from "@/pages/DuelTestPage";
import NotFound from "@/pages/not-found";
import Signup from "@/pages/Signup";
import EmailAdmin from "@/pages/EmailAdmin";
import { Loader2 } from "lucide-react";
import { useEffect } from "react";

function Router() {
  const { user, isAuthenticated, isLoading } = useAuth();

  console.log('Router render - isAuthenticated:', isAuthenticated, 'isLoading:', isLoading, 'user:', user);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-purple-400 mx-auto mb-4" />
          <p className="text-slate-300">Loading Law Duel...</p>
        </div>
      </div>
    );
  }

  return (
    <Switch>
      {!isAuthenticated ? (
        <>
          <Route path="/" component={Landing} />
          <Route path="/login" component={Login} />
          <Route path="/signup" component={Signup} />
        </>
      ) : (
        <>
          <Route path="/" component={Home} />
          <Route path="/daily" component={DailyCasefile} />
          <Route path="/stats" component={Stats} />
          <Route path="/stats/:userId" component={Stats} />
          <Route path="/admin/emails" component={EmailAdmin} />
        </>
      )}
      <Route path="/duel-test" component={DuelTestPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  // Only clear the old connect.sid cookie once, not the new sid cookie
  useEffect(() => {
    // Check if old connect.sid exists and clear it ONLY
    if (document.cookie.includes('connect.sid')) {
      document.cookie = 'connect.sid=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
      console.log('Cleared old connect.sid cookie');
    }
  }, []);
  
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
