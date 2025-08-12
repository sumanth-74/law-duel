import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import LawDuelLogo from '@/components/LawDuelLogo';
import AtticusModal from '@/components/AtticusModal';
import { Sword, Trophy, BookOpen, Scale, Users, Zap } from 'lucide-react';
import { useState } from 'react';

export default function Landing() {
  const [showAtticus, setShowAtticus] = useState(false);

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
          
          <h1 className="font-cinzel text-5xl md:text-6xl font-bold mb-6">
            <span className="bg-gradient-to-r from-purple-400 via-purple-300 to-purple-500 bg-clip-text text-transparent">
              Beat the bar. Beat your class.
            </span>
          </h1>
          
          <p className="text-xl md:text-2xl text-purple-200 mb-8 max-w-4xl mx-auto leading-relaxed">
            Duel on real MBE-style questions—live or async. Grow your avatar as you master the law. Atticus explains every answer.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8">
            <Button 
              onClick={() => window.location.href = '/api/login'}
              size="lg" 
              className="bg-purple-600 hover:bg-purple-700 text-white text-lg px-8 py-4"
            >
              Start a Duel
            </Button>
            <Button 
              variant="outline" 
              size="lg" 
              className="border-purple-400/50 text-purple-300 hover:bg-purple-500/10 text-lg px-8 py-4"
            >
              Try a 30-sec demo
            </Button>
          </div>

          {/* Proof Chips */}
          <div className="flex flex-wrap justify-center gap-3 mb-16 max-w-3xl mx-auto">
            <Badge className="bg-purple-900/30 text-purple-200 border-purple-500/30 px-3 py-1">
              1L & Bar
            </Badge>
            <Badge className="bg-purple-900/30 text-purple-200 border-purple-500/30 px-3 py-1">
              Same question head-to-head
            </Badge>
            <Badge className="bg-purple-900/30 text-purple-200 border-purple-500/30 px-3 py-1">
              &lt; 8s matching
            </Badge>
            <Badge className="bg-purple-900/30 text-purple-200 border-purple-500/30 px-3 py-1">
              Explanation on every item
            </Badge>
          </div>

          {/* How it works / Why it works / Audience */}
          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {/* How it works */}
            <Card className="bg-black/40 border-purple-500/20">
              <CardContent className="p-6">
                <h3 className="font-cinzel text-xl font-bold text-purple-200 mb-4">How it works</h3>
                <div className="space-y-3 text-purple-300/90">
                  <div className="flex items-start gap-3">
                    <span className="bg-purple-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold">1</span>
                    <span>Make your avatar. Name it.</span>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="bg-purple-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold">2</span>
                    <span>Quick Match. Live or async; first to 4 wins.</span>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="bg-purple-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold">3</span>
                    <span>Climb the ladder. Correct answers = growth + points; Atticus gives the rule + why.</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Why it works */}
            <Card className="bg-black/40 border-purple-500/20">
              <CardContent className="p-6">
                <h3 className="font-cinzel text-xl font-bold text-purple-200 mb-4">Why it works</h3>
                <div className="space-y-3 text-purple-300/90">
                  <div>
                    <strong className="text-purple-200">Testing effect:</strong> recall beats rereading.
                  </div>
                  <div>
                    <strong className="text-purple-200">Pressure calibration:</strong> 20-second decisions simulate exam pace.
                  </div>
                  <div>
                    <strong className="text-purple-200">Focused feedback:</strong> one dispositive fact; concise rule-based explanations.
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Audience toggle */}
            <Card className="bg-black/40 border-purple-500/20">
              <CardContent className="p-6">
                <div className="flex border-b border-purple-500/30 mb-4">
                  <button className="flex-1 pb-2 text-center text-purple-200 border-b-2 border-purple-500 font-semibold">
                    1L Exams
                  </button>
                  <button className="flex-1 pb-2 text-center text-purple-400/60">
                    Bar Prep
                  </button>
                </div>
                <div className="space-y-2 text-purple-300/90 text-sm">
                  <div>Civ Pro</div>
                  <div>Contracts (incl. UCC)</div>
                  <div>Torts</div>
                  <div>Property</div>
                  <div>Crim</div>
                  <div>Con Law</div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Async Duels Banner */}
          <div className="mt-12 text-center">
            <Card className="bg-green-900/20 border-green-500/30 max-w-2xl mx-auto">
              <CardContent className="p-4">
                <p className="text-green-300">
                  Like Game Pigeon, but for the law. Take your turns when you're free.
                </p>
                <p className="text-green-400/80 text-sm mt-1">
                  Keep 5–10 matches going. Your inbox lights up when it's your turn.
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Ask Atticus Teaser */}
          <div className="mt-8 text-center">
            <Card className="bg-blue-900/20 border-blue-500/30 max-w-2xl mx-auto">
              <CardContent className="p-4">
                <p className="text-blue-300 mb-3">
                  Ask Atticus: rule → application → why the others are wrong.
                </p>
                <Button 
                  variant="outline" 
                  className="border-blue-400/50 text-blue-300 hover:bg-blue-500/10"
                  onClick={() => setShowAtticus(true)}
                >
                  Ask Atticus anything
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Pricing Strip */}
          <div className="mt-16 text-center">
            <Card className="bg-slate-900/50 border-purple-500/20 max-w-4xl mx-auto">
              <CardContent className="p-6">
                <div className="grid md:grid-cols-2 gap-6 text-left">
                  <div>
                    <h4 className="font-semibold text-purple-200 mb-2">Free</h4>
                    <p className="text-purple-300/80 text-sm">
                      10 duels/day • 3 hints/day
                    </p>
                  </div>
                  <div>
                    <h4 className="font-semibold text-purple-200 mb-2">Pro/Season Pass</h4>
                    <p className="text-purple-300/80 text-sm mb-2">
                      Unlimited duels • Atticus Teach • Advanced stats
                    </p>
                    <Button variant="outline" size="sm" className="border-purple-400/50 text-purple-300 hover:bg-purple-500/10">
                      See plans
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
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

      {/* Atticus Modal */}
      <AtticusModal
        isOpen={showAtticus}
        onClose={() => setShowAtticus(false)}
      />
    </div>
  );
}