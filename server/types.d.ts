// Type declarations for JavaScript service modules

declare module './services/matchmaker' {
  export function registerPresence(ws: any, payload: any): void;
  export function startMatchmaking(wss: any, ws: any, payload: any): void;
  export function handleDuelAnswer(ws: any, payload: any): void;
  export function handleHintRequest(ws: any, payload: any): void;
}

declare module './services/qcoordinator' {
  export function initializeQuestionCoordinator(): Promise<void>;
}

declare module './services/leaderboard' {
  export function initializeLeaderboard(): Promise<void>;
  export function updateBotActivity(): Promise<void>;
  export function updatePlayerStats(userId: string, username: string, points: number, level: number): void;
}

declare module './services/streakManager' {
  const streakManager: {
    calculateMatchResults(winnerId: string, loserId: string): any;
    getMemoryHook(userId: string): any;
    getTierInfo(points: number): any;
  };
  export default streakManager;
}

declare module './services/async' {
  const asyncDuels: {
    createMatch(userId: string, subject: string, opponentUsername: string): any;
    getUserInbox(userId: string): any;
    getUnreadCount(userId: string): number;
    getMatchForUser(matchId: string, userId: string): any;
    submitAnswer(matchId: string, userId: string, answerIndex: number, responseTime: number): Promise<any>;
    resignMatch(matchId: string, userId: string): Promise<any>;
    clearNotifications(userId: string): void;
  };
  export default asyncDuels;
}

declare module './services/chatbotService' {
  export const chatbotService: {
    generateResponse(userId: string, message: string, context: any): Promise<any>;
    clearHistory(userId: string): void;
    getSuggestedQuestions(subject: string): any[];
    getStudyTips(subject: string): any[];
  };
}

declare module './services/botPractice' {
  export class BotPractice {
    createPracticeMatch(userId: string, subject: string): Promise<any>;
    submitAnswer(practiceSession: any, userAnswer: number, responseTime: number): Promise<any>;
  }
}

declare module './services/robustGenerator' {
  export function generateFreshQuestion(subject: string): Promise<any>;
  export function healthCheck(): Promise<any>;
}

declare module './services/questionPool' {
  export function getPoolStatus(): any;
  export function getQuestionPool(): any;
}

declare module './services/questionPoolManager' {
  export function getPoolManager(): Promise<any>;
}

declare module './services/fallbacks' {
  export function pickLocalFallback(subjects: string[]): any;
}

declare module './services/dailyChallengeRewards' {
  const dailyChallengeRewards: {
    getUserDailyChallenges(userId: string): any[];
    claimChallengeReward(userId: string, challengeId: string): any;
    getUserRewardSummary(userId: string): any;
    getWeeklyChallengeProgress(userId: string): any[];
  };
  export default dailyChallengeRewards;
}

declare module './services/weeklyLadder' {
  export function getWeeklyTop50(): Promise<any[]>;
}

declare module './services/subtopicProgressService' {
  export const subtopicProgressService: {
    getDetailedProgress(userId: string): any;
    getStudyRecommendations(userId: string): any[];
  };
}

declare module './services/mbeGenerator' {
  export function generateMBEItem(config: any): Promise<any>;
}

declare module './services/emailTrackingService' {
  export const emailTrackingService: {
    getEmailAnalytics(): Promise<any>;
    getAllUsersWithEmails(limit: number): Promise<any[]>;
    getRecentSignups(days: number): Promise<any[]>;
    exportEmailList(filters: any): Promise<any[]>;
  };
}

declare module './services/progressionService' {
  export const progressionService: {
    updateUserLevel(userId: string, xpGained: number): Promise<any>;
    updateUserElo(userId: string, eloChange: number): Promise<any>;
    updateSubjectMastery(userId: string, subject: string, points: number): Promise<any>;
    resetDailyDuelFlag(userId: string): Promise<void>;
  };
}

declare module './services/statsService' {
  export const statsService: {
    getUserStats(userId: string): Promise<any>;
    getPublicStats(userId: string): Promise<any>;
    getLeaderboard(limit: number): Promise<any[]>;
    getSubjectLeaderboard(subject: string, limit: number): Promise<any[]>;
    recordQuestionAttempt(userId: string, questionId: string, subject: string, selectedAnswer: number, correctAnswer: number, isCorrect: boolean, timeSpent: number, difficulty: string, matchId?: string): Promise<void>;
    initializeUserStats(userId: string): Promise<void>;
  };
}

declare module './services/retentionOptimizer' {
  export const retentionOptimizer: {
    getRetentionMetrics(): any;
    getOptimizationSuggestions(): any[];
  };
}

declare module './services/realTimeLeaderboard' {
  export const realTimeLeaderboard: {
    addClient(ws: any, userId: string): void;
    updateAndBroadcast(): Promise<void>;
    sendFriendChallenge(challengerId: string, challengerName: string, targetUsername: string, subject: string): Promise<any>;
    handleChallengeResponse(challengeId: string, accepted: boolean, responderId: string): Promise<any>;
  };
}

declare module './services/questionBank' {
  export const questionBank: {
    getSharedQuestion(subject: string): any;
    getStats(): any;
  };
  export type CachedQuestion = any;
}

declare module './services/stealthbot' {
  export const stealthbot: any;
}

declare module './services/subjects' {
  export const subjects: any;
}

declare module './services/mbeTopics' {
  export const mbeTopics: any;
}

declare module './services/weaknessTargeting' {
  export const weaknessTargeting: any;
}

declare module './services/questionCache' {
  export const questionCache: any;
}

declare module './services/loadCachedQuestions' {
  export const loadCachedQuestions: any;
}

declare module './services/emailTrackingService' {
  export const emailTrackingService: any;
}

// Global types
declare global {
  interface User {
    id: string;
    username: string;
    displayName: string;
    email?: string;
    lawSchool?: string;
    level?: number;
    points?: number;
    overallElo?: number;
    dailyStreak?: number;
    totalCorrectAnswers?: number;
    totalQuestionsAnswered?: number;
    totalHoursPlayed?: number;
    totalWins?: number;
    totalLosses?: number;
    victoryDate?: string;
    createdAt?: string;
    lastLoginAt?: string;
    avatarData?: any;
    password?: string;
  }

  interface PlayerSubjectStats {
    subject: string;
    correctAnswers: number;
    questionsAnswered: number;
    currentDifficultyLevel: number;
    highestDifficultyReached: number;
    masteryPoints: number;
    hoursPlayed: number;
  }

  interface QuestionAttempt {
    userId: string;
    questionId: string;
    subject: string;
    selectedAnswer: number;
    correctAnswer: number;
    isCorrect: boolean;
    timeSpent: number;
    difficulty: string;
    matchId?: string;
    timestamp: string;
  }

  interface MBESubject {
    name: string;
    topics: string[];
  }
}
