import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Trophy, Share2, Download, X, Sparkles, Crown, Zap, Star } from 'lucide-react';
import { AvatarRenderer } from '@/components/AvatarRenderer';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import html2canvas from 'html2canvas';

interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: 'genius' | 'master' | 'legend' | 'champion';
  color: string;
  gradient: string;
  streak: number;
  earnedAt: Date;
}

interface AchievementBadgeProps {
  achievement: Achievement;
  onClose: () => void;
  correctStreak: number;
}

export function AchievementBadge({ achievement, onClose, correctStreak }: AchievementBadgeProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const badgeRef = useRef<HTMLDivElement>(null);
  const [isCapturing, setIsCapturing] = useState(false);

  const getBadgeIcon = () => {
    switch (achievement.icon) {
      case 'genius':
        return <Trophy className="w-20 h-20 text-yellow-400" />;
      case 'master':
        return <Crown className="w-20 h-20 text-purple-400" />;
      case 'legend':
        return <Star className="w-20 h-20 text-blue-400" />;
      case 'champion':
        return <Zap className="w-20 h-20 text-pink-400" />;
      default:
        return <Trophy className="w-20 h-20 text-yellow-400" />;
    }
  };

  const shareToSocial = async (platform: 'download' | 'clipboard') => {
    if (!badgeRef.current) return;
    
    setIsCapturing(true);
    
    try {
      // Hide buttons during capture
      const buttons = badgeRef.current.querySelectorAll('button');
      buttons.forEach(btn => (btn as HTMLElement).style.display = 'none');
      
      const canvas = await html2canvas(badgeRef.current, {
        backgroundColor: null,
        scale: 2,
        width: 1080,
        height: 1920,
        onclone: (clonedDoc) => {
          const clonedElement = clonedDoc.getElementById('achievement-badge');
          if (clonedElement) {
            clonedElement.style.width = '1080px';
            clonedElement.style.height = '1920px';
            clonedElement.style.padding = '60px';
          }
        }
      });
      
      // Restore buttons
      buttons.forEach(btn => (btn as HTMLElement).style.display = '');
      
      if (platform === 'download') {
        // Download as image
        canvas.toBlob((blob) => {
          if (!blob) return;
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `law-duel-${achievement.name.toLowerCase().replace(/\s+/g, '-')}.png`;
          a.click();
          URL.revokeObjectURL(url);
          
          toast({
            title: "Badge Downloaded!",
            description: "Share it on your story! 🔥",
          });
        });
      } else if (platform === 'clipboard') {
        // Copy to clipboard for easy paste
        canvas.toBlob(async (blob) => {
          if (!blob) return;
          try {
            await navigator.clipboard.write([
              new ClipboardItem({ 'image/png': blob })
            ]);
            toast({
              title: "Copied to Clipboard!",
              description: "Paste it directly to your story!",
            });
          } catch (err) {
            // Fallback to download if clipboard fails
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `law-duel-achievement.png`;
            a.click();
            URL.revokeObjectURL(url);
          }
        });
      }
    } catch (error) {
      console.error('Error capturing badge:', error);
      toast({
        title: "Capture Failed",
        description: "Try downloading instead",
        variant: "destructive"
      });
    } finally {
      setIsCapturing(false);
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.8, y: 50 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0.8, y: 50 }}
          transition={{ type: "spring", stiffness: 300, damping: 25 }}
          onClick={(e) => e.stopPropagation()}
          className="relative max-w-md w-full"
        >
          {/* Main Badge Card - Instagram Story Format (9:16) */}
          <div 
            ref={badgeRef}
            id="achievement-badge"
            className="relative aspect-[9/16] max-h-[80vh] rounded-3xl overflow-hidden"
            style={{
              background: achievement.gradient
            }}
          >
            {/* Animated Background Effects */}
            <div className="absolute inset-0">
              <div className="absolute inset-0 bg-black/20" />
              {[...Array(20)].map((_, i) => (
                <motion.div
                  key={i}
                  className="absolute"
                  initial={{
                    x: Math.random() * 400,
                    y: Math.random() * 700,
                    scale: 0,
                    opacity: 0
                  }}
                  animate={{
                    scale: [0, 1, 0],
                    opacity: [0, 0.6, 0],
                    y: [Math.random() * 700, Math.random() * 700 - 100]
                  }}
                  transition={{
                    duration: 3,
                    delay: i * 0.1,
                    repeat: Infinity,
                    repeatDelay: Math.random() * 2
                  }}
                >
                  <Sparkles className="w-4 h-4 text-white/40" />
                </motion.div>
              ))}
            </div>

            {/* Content */}
            <div className="relative z-10 h-full flex flex-col items-center justify-between p-8 text-white">
              {/* Top Section - App Branding */}
              <div className="text-center">
                <motion.h1 
                  className="text-3xl font-cinzel font-bold mb-2"
                  initial={{ y: -20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.2 }}
                >
                  LAW DUEL
                </motion.h1>
                <motion.p 
                  className="text-sm opacity-90"
                  initial={{ y: -10, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.3 }}
                >
                  Legal Battle Arena
                </motion.p>
              </div>

              {/* Middle Section - Achievement */}
              <div className="flex flex-col items-center space-y-6">
                {/* User Avatar */}
                {user?.avatarData && (
                  <motion.div 
                    className="relative"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.4, type: "spring" }}
                  >
                    <div className="absolute inset-0 bg-white/30 rounded-full blur-2xl animate-pulse" />
                    <div className="relative w-24 h-24 rounded-full overflow-hidden border-4 border-white/50 bg-black/30">
                      <AvatarRenderer avatarData={user.avatarData} size={96} />
                    </div>
                  </motion.div>
                )}

                {/* Badge Icon with Glow */}
                <motion.div 
                  className="relative"
                  initial={{ scale: 0, rotate: -180 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ delay: 0.5, type: "spring", stiffness: 200 }}
                >
                  <div className="absolute inset-0 blur-3xl bg-white/40 animate-pulse" />
                  <div className="relative">
                    {getBadgeIcon()}
                  </div>
                </motion.div>

                {/* Achievement Title */}
                <motion.div 
                  className="text-center space-y-2"
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.6 }}
                >
                  <h2 className="text-4xl font-bold font-cinzel">
                    {achievement.name}
                  </h2>
                  <p className="text-lg opacity-90">
                    {achievement.description}
                  </p>
                </motion.div>

                {/* Streak Counter */}
                <motion.div 
                  className="bg-white/20 backdrop-blur-md rounded-2xl px-6 py-4"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.7, type: "spring" }}
                >
                  <div className="flex items-center gap-3">
                    <Zap className="w-6 h-6 text-yellow-400" />
                    <div>
                      <p className="text-3xl font-bold">{correctStreak}</p>
                      <p className="text-sm opacity-90">CORRECT STREAK</p>
                    </div>
                  </div>
                </motion.div>
              </div>

              {/* Bottom Section - User Info */}
              <motion.div 
                className="text-center space-y-1"
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.8 }}
              >
                <p className="text-xl font-semibold">
                  @{user?.username || 'lawmaster'}
                </p>
                <p className="text-sm opacity-80">
                  {user?.lawSchool || 'Law School Champion'}
                </p>
                <p className="text-xs opacity-60 mt-2">
                  lawduel.net
                </p>
              </motion.div>
            </div>

            {/* Share Buttons - Not captured in screenshot */}
            {!isCapturing && (
              <div className="absolute bottom-20 left-0 right-0 flex justify-center gap-3 px-8">
                <Button
                  onClick={() => shareToSocial('clipboard')}
                  className="bg-white/20 backdrop-blur-md border-white/30 hover:bg-white/30"
                  size="lg"
                >
                  <Share2 className="w-5 h-5 mr-2" />
                  Copy
                </Button>
                <Button
                  onClick={() => shareToSocial('download')}
                  className="bg-white/20 backdrop-blur-md border-white/30 hover:bg-white/30"
                  size="lg"
                >
                  <Download className="w-5 h-5 mr-2" />
                  Save
                </Button>
              </div>
            )}

            {/* Close Button */}
            {!isCapturing && (
              <Button
                onClick={onClose}
                variant="ghost"
                size="icon"
                className="absolute top-4 right-4 text-white/80 hover:text-white hover:bg-white/20"
              >
                <X className="w-6 h-6" />
              </Button>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

// Achievement definitions
export const ACHIEVEMENTS = {
  LEGAL_GENIUS: {
    id: 'legal-genius',
    name: 'Legal Genius',
    description: '10 correct answers in a row!',
    icon: 'genius' as const,
    color: 'gold',
    gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    streakRequired: 10
  },
  LAW_MASTER: {
    id: 'law-master',
    name: 'Law Master',
    description: '20 correct answers in a row!',
    icon: 'master' as const,
    color: 'purple',
    gradient: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
    streakRequired: 20
  },
  LEGAL_LEGEND: {
    id: 'legal-legend',
    name: 'Legal Legend',
    description: '30 correct answers in a row!',
    icon: 'legend' as const,
    color: 'blue',
    gradient: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
    streakRequired: 30
  },
  BAR_CHAMPION: {
    id: 'bar-champion',
    name: 'Bar Champion',
    description: '50 correct answers in a row!',
    icon: 'champion' as const,
    color: 'rainbow',
    gradient: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
    streakRequired: 50
  }
};