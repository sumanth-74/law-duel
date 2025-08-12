import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import LawDuelLogo from '@/components/LawDuelLogo';
import { Sword, Trophy, BookOpen, Scale, Users, Zap } from 'lucide-react';

export default function Landing() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {/* Navigation */}
      <nav className="fixed top-0 w-full z-50 bg-black/20 backdrop-blur-sm border-b border-purple-500/20">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <LawDuelLogo size="md" showText={true} />
          <Button 
            onClick={() => window.location.href = '/api/login'} 
            className="bg-purple-600 hover:bg-purple-700 text-white"
          >
            Sign In
          </Button>
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
          
          <p className="text-xl md:text-2xl text-purple-200 mb-4 max-w-3xl mx-auto">
            Master the Bar Exam & Law School Through Epic Legal Duels
          </p>
          
          <p className="text-lg text-purple-300/80 mb-12 max-w-2xl mx-auto">
            Transform legal education into competitive gameplay. Duel opponents with bar-quality questions, 
            ace your law school finals, and climb the leaderboard.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16">
            <Button 
              onClick={() => window.location.href = '/api/login'}
              size="lg" 
              className="bg-purple-600 hover:bg-purple-700 text-white text-lg px-8 py-4"
            >
              <Sword className="w-5 h-5 mr-2" />
              Start Dueling
            </Button>
            <Button 
              variant="outline" 
              size="lg" 
              className="border-purple-400/50 text-purple-300 hover:bg-purple-500/10 text-lg px-8 py-4"
            >
              <BookOpen className="w-5 h-5 mr-2" />
              Learn More
            </Button>
          </div>

          {/* Features Grid */}
          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            <Card className="bg-black/40 border-purple-500/20 hover:border-purple-400/40 transition-colors">
              <CardContent className="p-6 text-center">
                <div className="w-16 h-16 bg-purple-600/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Zap className="w-8 h-8 text-purple-400" />
                </div>
                <h3 className="font-cinzel text-xl font-bold text-purple-200 mb-3">Live & Async Duels</h3>
                <p className="text-purple-300/80">
                  Real-time battles or turn-based matches. Play on your schedule against human opponents or stealth AI.
                </p>
              </CardContent>
            </Card>

            <Card className="bg-black/40 border-purple-500/20 hover:border-purple-400/40 transition-colors">
              <CardContent className="p-6 text-center">
                <div className="w-16 h-16 bg-purple-600/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Scale className="w-8 h-8 text-purple-400" />
                </div>
                <h3 className="font-cinzel text-xl font-bold text-purple-200 mb-3">Bar & Law School Questions</h3>
                <p className="text-purple-300/80">
                  Professional Themis/BarBri quality questions for bar prep plus law school exam questions across all subjects.
                </p>
              </CardContent>
            </Card>

            <Card className="bg-black/40 border-purple-500/20 hover:border-purple-400/40 transition-colors">
              <CardContent className="p-6 text-center">
                <div className="w-16 h-16 bg-purple-600/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Trophy className="w-8 h-8 text-purple-400" />
                </div>
                <h3 className="font-cinzel text-xl font-bold text-purple-200 mb-3">Competitive Progression</h3>
                <p className="text-purple-300/80">
                  Climb tiers, earn streaks, unlock legal archetypes. Track your progress from Novice to Archon.
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Stats Section */}
          <div className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-8 max-w-3xl mx-auto">
            <div className="text-center">
              <div className="text-3xl font-bold text-purple-400">40+</div>
              <div className="text-purple-300/80">Legal Archetypes</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-purple-400">&lt;8s</div>
              <div className="text-purple-300/80">Matchmaking</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-purple-400">7</div>
              <div className="text-purple-300/80">MBE Subjects</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-purple-400">24/7</div>
              <div className="text-purple-300/80">Available</div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-purple-500/20 bg-black/20">
        <div className="container mx-auto px-4 py-8 text-center">
          <LawDuelLogo size="sm" showText={true} className="justify-center mb-4" />
          <p className="text-purple-400/60">
            Transform your legal education. Master the bar exam and law school finals through competitive gameplay.
          </p>
        </div>
      </footer>
    </div>
  );
}