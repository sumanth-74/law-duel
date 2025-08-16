import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { AchievementBadge, ACHIEVEMENTS } from '@/components/AchievementBadge';

interface StreakContextType {
  correctStreak: number;
  bestStreak: number;
  incrementStreak: () => void;
  resetStreak: () => void;
  checkAchievements: () => void;
}

const StreakContext = createContext<StreakContextType | undefined>(undefined);

export function StreakProvider({ children }: { children: ReactNode }) {
  const [correctStreak, setCorrectStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [currentAchievement, setCurrentAchievement] = useState<any>(null);

  // Load streak from localStorage
  useEffect(() => {
    const savedStreak = localStorage.getItem('lawDuelStreak');
    const savedBest = localStorage.getItem('lawDuelBestStreak');
    
    if (savedStreak) setCorrectStreak(Number(savedStreak));
    if (savedBest) setBestStreak(Number(savedBest));
  }, []);

  // Save streak to localStorage
  useEffect(() => {
    localStorage.setItem('lawDuelStreak', String(correctStreak));
    if (correctStreak > bestStreak) {
      setBestStreak(correctStreak);
      localStorage.setItem('lawDuelBestStreak', String(correctStreak));
    }
  }, [correctStreak, bestStreak]);

  const incrementStreak = () => {
    setCorrectStreak(prev => {
      const newStreak = prev + 1;
      console.log('Streak increased to:', newStreak);
      
      // Check for achievements after updating
      setTimeout(() => checkAchievements(), 100);
      
      return newStreak;
    });
  };

  const resetStreak = () => {
    console.log('Streak reset from:', correctStreak);
    setCorrectStreak(0);
  };

  const checkAchievements = () => {
    // Check for each achievement milestone
    if (correctStreak === 10 && !currentAchievement) {
      const achievement = {
        ...ACHIEVEMENTS.LEGAL_GENIUS,
        streak: correctStreak,
        earnedAt: new Date()
      };
      setCurrentAchievement(achievement);
    } else if (correctStreak === 20 && !currentAchievement) {
      const achievement = {
        ...ACHIEVEMENTS.LAW_MASTER,
        streak: correctStreak,
        earnedAt: new Date()
      };
      setCurrentAchievement(achievement);
    } else if (correctStreak === 30 && !currentAchievement) {
      const achievement = {
        ...ACHIEVEMENTS.LEGAL_LEGEND,
        streak: correctStreak,
        earnedAt: new Date()
      };
      setCurrentAchievement(achievement);
    } else if (correctStreak === 50 && !currentAchievement) {
      const achievement = {
        ...ACHIEVEMENTS.BAR_CHAMPION,
        streak: correctStreak,
        earnedAt: new Date()
      };
      setCurrentAchievement(achievement);
    }
  };

  return (
    <StreakContext.Provider value={{
      correctStreak,
      bestStreak,
      incrementStreak,
      resetStreak,
      checkAchievements
    }}>
      {children}
      
      {/* Achievement Badge Modal */}
      {currentAchievement && (
        <AchievementBadge
          achievement={currentAchievement}
          correctStreak={correctStreak}
          onClose={() => setCurrentAchievement(null)}
        />
      )}
    </StreakContext.Provider>
  );
}

export function useStreak() {
  const context = useContext(StreakContext);
  if (!context) {
    throw new Error('useStreak must be used within a StreakProvider');
  }
  return context;
}