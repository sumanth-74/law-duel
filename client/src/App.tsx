import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/useAuth";
import { StreakProvider } from "@/contexts/StreakContext";
import Home from "@/pages/Home";
import Login from "@/pages/Login";
import Landing from "@/pages/Landing";
import Stats from "@/pages/Stats";
import DailyCasefile from "@/pages/DailyCasefile";
import DuelTestPage from "@/pages/DuelTestPage";
import LoginTest from "@/pages/LoginTest";
import NotFound from "@/pages/not-found";
import Signup from "@/pages/Signup";
import EmailAdmin from "@/pages/EmailAdmin";
import AuthDebug from "@/pages/AuthDebug";
import Challenge from "@/pages/Challenge";
import { Loader2 } from "lucide-react";

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
          <Route path="/challenge/:username" component={Challenge} />
        </>
      ) : (
        <>
          <Route path="/" component={Home} />
          <Route path="/play" component={Home} />
          <Route path="/daily" component={DailyCasefile} />
          <Route path="/stats" component={Stats} />
          <Route path="/stats/:userId" component={Stats} />
          <Route path="/admin/emails" component={EmailAdmin} />
          <Route path="/challenge/:username" component={Challenge} />
        </>
      )}
      <Route path="/duel-test" component={DuelTestPage} />
      <Route path="/login-test" component={LoginTest} />
      <Route path="/auth-debug" component={AuthDebug} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <StreakProvider>
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </StreakProvider>
    </QueryClientProvider>
  );
}

export default App;
