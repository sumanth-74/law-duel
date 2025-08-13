import { db } from '../db';
import { dailyQuestions, userDailyAttempts, users, playerSubjectStats } from '../../shared/schema';
import { eq, and, sql } from 'drizzle-orm';
import { progressionService } from './progressionService';
import { generateMBEItem, getDailyTopic } from './mbeGenerator.js';
import type { DailyQuestion, UserDailyAttempt, MBESubject } from '../../shared/schema';

export class DailyCasefileService {
  
  // Get today's date in YYYY-MM-DD format for a given timezone
  private getTodayDateString(timezone: string = 'UTC'): string {
    const now = new Date();
    // Simple timezone offset - in production, use a proper timezone library
    const utcDate = new Date(now.getTime() + (now.getTimezoneOffset() * 60000));
    return utcDate.toISOString().split('T')[0];
  }

  // Clean up old daily questions (keep only last 7 days)
  async cleanupOldQuestions(): Promise<void> {
    try {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setUTCDate(sevenDaysAgo.getUTCDate() - 7);
      const cutoffDate = sevenDaysAgo.toISOString().split('T')[0];
      
      await db.delete(dailyQuestions)
        .where(sql`${dailyQuestions.dateUtc} < ${cutoffDate}`);
        
      console.log(`✅ Daily questions cleanup completed - removed questions older than ${cutoffDate}`);
    } catch (error) {
      console.error('❌ Failed to cleanup old daily questions:', error);
    }
  }

  // Force regenerate today's question (admin function)
  async regenerateTodaysQuestion(): Promise<DailyQuestion> {
    const today = this.getTodayDateString();
    
    // Delete existing question for today
    await db.delete(dailyQuestions)
      .where(eq(dailyQuestions.dateUtc, today));
    
    // Generate new question
    const newQuestion = await this.generateTodaysQuestion(today);
    console.log(`✅ Regenerated daily question for ${today}: ${newQuestion.subject} - ${newQuestion.topic}`);
    
    return newQuestion;
  }

  // Check if user has attempted today's question
  async hasUserAttemptedToday(userId: string): Promise<boolean> {
    const today = this.getTodayDateString();
    
    const [attempt] = await db
      .select()
      .from(userDailyAttempts)
      .where(and(
        eq(userDailyAttempts.userId, userId),
        sql`DATE(${userDailyAttempts.answeredAt}) = ${today}`
      ))
      .limit(1);
      
    return !!attempt;
  }

  // Get today's daily question
  async getTodaysQuestion(userId: string): Promise<{
    question: Omit<DailyQuestion, 'correctIndex'> | null;
    hasAttempted: boolean;
    attempt?: UserDailyAttempt;
    timeToReset?: number; // seconds until next question
  }> {
    const today = this.getTodayDateString();
    const hasAttempted = await this.hasUserAttemptedToday(userId);
    
    // Get today's question
    let [question] = await db
      .select()
      .from(dailyQuestions)
      .where(eq(dailyQuestions.dateUtc, today));
    
    // If no question exists for today, generate one
    if (!question) {
      question = await this.generateTodaysQuestion(today);
    }
    
    let attempt: UserDailyAttempt | undefined;
    if (hasAttempted) {
      [attempt] = await db
        .select()
        .from(userDailyAttempts)
        .where(and(
          eq(userDailyAttempts.userId, userId),
          eq(userDailyAttempts.questionId, question.id)
        ));
    }
    
    // Calculate time to reset (midnight UTC)
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
    tomorrow.setUTCHours(0, 0, 0, 0);
    const timeToReset = Math.floor((tomorrow.getTime() - now.getTime()) / 1000);
    
    // Remove correct answer from question if not attempted
    const { correctIndex, ...questionWithoutAnswer } = question;
    
    return {
      question: hasAttempted ? question : questionWithoutAnswer,
      hasAttempted,
      attempt,
      timeToReset
    };
  }

  // Generate today's question using structured OpenAI
  private async generateTodaysQuestion(date: string): Promise<DailyQuestion> {
    try {
      // Get daily topic based on day of year for rotation
      const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / (24 * 60 * 60 * 1000));
      const topicConfig = getDailyTopic(dayOfYear);
      
      // Generate MBE item using structured outputs
      const mbeItem = await generateMBEItem(topicConfig);
      
      // Shuffle choices and adjust correct index
      const shuffledData = this.shuffleChoices(mbeItem);
      
      // Insert into database
      const [insertedQuestion] = await db
        .insert(dailyQuestions)
        .values({
          dateUtc: date,
          subject: shuffledData.subject as MBESubject,
          topic: shuffledData.topic,
          difficulty: "hard",
          stem: shuffledData.stem,
          choices: shuffledData.choices,
          correctIndex: shuffledData.correctIndex,
          explanationLong: shuffledData.explanationLong,
          ruleRefs: shuffledData.ruleRefs || [],
        })
        .returning();
        
      return insertedQuestion;
      
    } catch (error) {
      console.error('Failed to generate daily question:', error);
      // Fallback to pre-generated questions if OpenAI fails
      return this.getFallbackQuestion();
    }
  }

  // Fallback pre-generated questions for when OpenAI is unavailable
  private async getFallbackQuestion(): Promise<any> {
    const date = this.getTodayDateString();
    
    // High-quality fallback questions rotating by day
    const fallbackQuestions = [
      {
        subject: "Evidence",
        topic: "Hearsay Exceptions",
        stem: "During a personal injury trial, the plaintiff seeks to introduce testimony from a nurse who overheard the defendant's doctor say to the defendant immediately after examining him, 'Your injuries are minimal and appear to be self-inflicted to exaggerate your condition.' The defendant objects. The trial court should:",
        choices: [
          "Sustain the objection because the statement is hearsay and no exception applies.",
          "Overrule the objection because the statement qualifies as a present sense impression.",
          "Overrule the objection because the statement is an admission by a party opponent.",
          "Sustain the objection because the statement violates the physician-patient privilege."
        ],
        correctIndex: 0,
        explanationLong: "This statement is hearsay - an out-of-court statement offered to prove the truth of the matter asserted. The doctor's statement about the plaintiff's injuries is being offered to prove that the injuries were indeed minimal and self-inflicted. While the statement might seem like a present sense impression, it fails this exception because it describes the doctor's medical conclusion rather than a contemporaneous observation of an event. The statement cannot be an admission by a party opponent because the doctor is not a party to the lawsuit. Physician-patient privilege protects confidential communications, but this was an overhead statement to the patient, not a confidential consultation.",
        ruleRefs: ["Fed. R. Evid. 801", "Fed. R. Evid. 803(1)", "Fed. R. Evid. 801(d)(2)"]
      },
      {
        subject: "Constitutional Law",
        topic: "Due Process",
        stem: "A state legislature passed a law requiring all public school teachers to take a loyalty oath affirming they have never been members of any organization advocating the violent overthrow of the government and will not become members of such organizations during their employment. A teacher who refuses to sign the oath is subject to immediate dismissal. This law is:",
        choices: [
          "Constitutional because the state has a compelling interest in ensuring loyalty among public employees.",
          "Constitutional because public employment is a privilege, not a right.",
          "Unconstitutional because it violates substantive due process by being vague and overbroad.",
          "Unconstitutional because it violates equal protection by treating teachers differently from other public employees."
        ],
        correctIndex: 2,
        explanationLong: "This loyalty oath is unconstitutional because it violates substantive due process. The oath is both vague and overbroad. It's vague because 'advocating violent overthrow' is unclear - it could include academic discussions, historical analysis, or theoretical political discourse. It's overbroad because it sweeps in protected speech and association under the First Amendment. The oath also punishes past lawful associations, which violates due process. While the state has legitimate interests in employee loyalty, the means chosen here are not narrowly tailored and chill protected First Amendment activities.",
        ruleRefs: ["U.S. Const. Amend. XIV", "U.S. Const. Amend. I", "Elfbrandt v. Russell (1966)"]
      },
      {
        subject: "Contracts",
        topic: "Statute of Frauds",
        stem: "A homeowner orally agreed to sell his house to a buyer for $450,000. The buyer immediately moved in, began making monthly payments of $2,000, and spent $15,000 on improvements with the seller's knowledge and approval. After six months, the seller refused to complete the sale, claiming the contract was unenforceable under the statute of frauds. The buyer's best argument for enforcement is:",
        choices: [
          "The doctrine of promissory estoppel prevents the seller from asserting the statute of frauds.",
          "The buyer's part performance satisfies the statute of frauds requirements.",
          "The monthly payments constitute sufficient written memoranda under the statute of frauds.",
          "The contract is for the sale of goods and falls under UCC Article 2, not the statute of frauds."
        ],
        correctIndex: 1,
        explanationLong: "The buyer's best argument is part performance. Under the part performance doctrine, an oral contract for the sale of land may be enforceable despite the statute of frauds if the buyer's conduct is unequivocally referable to the alleged oral agreement. Here, the buyer's taking possession, making payments, and making improvements with the seller's approval constitute sufficient part performance. These acts are clearly referable to a land sale contract and would make it inequitable to allow the statute of frauds defense. Promissory estoppel is less likely to apply in land sale contexts. The payments alone don't constitute a sufficient writing, and real estate sales are not governed by the UCC.",
        ruleRefs: ["Statute of Frauds", "Restatement (Second) of Contracts § 129", "Part Performance Doctrine"]
      }
    ];
    
    // Select question based on day of year to ensure rotation
    const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / (24 * 60 * 60 * 1000));
    const selectedQuestion = fallbackQuestions[dayOfYear % fallbackQuestions.length];
    
    // Shuffle choices
    const shuffledData = this.shuffleChoices(selectedQuestion);
    
    // Insert into database
    const [insertedQuestion] = await db
      .insert(dailyQuestions)
      .values({
        dateUtc: date,
        subject: shuffledData.subject,
        topic: shuffledData.topic,
        difficulty: "hard",
        stem: shuffledData.stem,
        choices: shuffledData.choices,
        correctIndex: shuffledData.correctIndex,
        explanationLong: shuffledData.explanationLong,
        ruleRefs: shuffledData.ruleRefs || [],
      })
      .returning();
      
    return insertedQuestion;
  }

  // Shuffle answer choices and update correct index
  private shuffleChoices(questionData: any): any {
    // Handle both mbeItem format (with rationales) and simple format
    const originalChoices = questionData.choices || questionData.options;
    const originalCorrectIndex = questionData.correctIndex !== undefined ? questionData.correctIndex : 0;
    const originalRationales = questionData.optionRationales || questionData.rationales;
    
    // Create array of items with their original indices
    const items = originalChoices.map((choice: string, index: number) => ({
      choice,
      rationale: originalRationales ? (originalRationales[index] || originalRationales[index.toString()]) : null,
      originalIndex: index,
      isCorrect: index === originalCorrectIndex
    }));
    
    // Fisher-Yates shuffle to ensure proper randomization
    for (let i = items.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [items[i], items[j]] = [items[j], items[i]];
    }
    
    // Extract shuffled data and find new correct index
    const shuffledChoices = items.map((item: any) => item.choice);
    const newCorrectIndex = items.findIndex((item: any) => item.isCorrect);
    
    // Build shuffled rationales if they exist
    let shuffledRationales: any = null;
    if (originalRationales) {
      shuffledRationales = {};
      items.forEach((item: any, newIndex: number) => {
        if (item.rationale) {
          shuffledRationales[newIndex.toString()] = item.rationale;
        }
      });
    }
    
    console.log(`🎲 Shuffled daily question: original correct was ${originalCorrectIndex} (${String.fromCharCode(65 + originalCorrectIndex)}), new correct is ${newCorrectIndex} (${String.fromCharCode(65 + newCorrectIndex)})`);
    
    return {
      ...questionData,
      choices: shuffledChoices,
      correctIndex: newCorrectIndex,
      ...(shuffledRationales && { optionRationales: shuffledRationales })
    };
  }

  // Submit daily answer
  async submitDailyAnswer(userId: string, questionId: string, choiceIndex: number): Promise<{
    correct: boolean;
    xpDelta: number;
    masteryDelta: number;
    newLevel?: number;
    newTitle?: string;
    newStreak: number;
    explanationLong: string;
    correctChoice: string;
    levelUp: boolean;
    masteryUp: boolean;
    streakMilestone?: { level: number; bonus: number };
  }> {
    // Check if already attempted today
    const hasAttempted = await this.hasUserAttemptedToday(userId);
    if (hasAttempted) {
      throw new Error('Daily question already attempted today');
    }
    
    // Get the question
    const [question] = await db
      .select()
      .from(dailyQuestions)
      .where(eq(dailyQuestions.id, questionId));
      
    if (!question) {
      throw new Error('Question not found');
    }
    
    // Check correctness
    const correct = choiceIndex === question.correctIndex;
    
    // Get user's current streak
    const [user] = await db.select().from(users).where(eq(users.id, userId));
    if (!user) {
      throw new Error('User not found');
    }
    
    // Calculate streak - daily participation streak (not just correct answers)
    const today = this.getTodayDateString();
    const yesterday = new Date();
    yesterday.setUTCDate(yesterday.getUTCDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];
    
    let newStreak = 1; // Starting today's attempt
    if (user.lastDailyDate === yesterdayStr) {
      // Consecutive day - continue streak
      newStreak = user.dailyStreak + 1;
    } else if (user.lastDailyDate && user.lastDailyDate !== today) {
      // Missed a day - streak resets to 1 (today's attempt)
      newStreak = 1;
    }
    // If lastDailyDate is null, this is their first attempt ever, streak = 1
    
    // Calculate rewards
    const baseXp = correct ? 150 : 30;
    const masteryMultiplier = correct ? 2 : 1;
    const masteryDelta = progressionService.calculateMasteryPoints(correct, "hard") * masteryMultiplier;
    
    // Check for streak milestone (daily participation milestones)
    let streakMilestone: { level: number; bonus: number } | undefined;
    let bonusXp = 0;
    if ([3, 7, 14, 30, 50, 100].includes(newStreak)) {
      const bonuses = { 3: 25, 7: 75, 14: 150, 30: 300, 50: 500, 100: 1000 };
      bonusXp = bonuses[newStreak as keyof typeof bonuses];
      streakMilestone = { level: newStreak, bonus: bonusXp };
      console.log(`🔥 Daily streak milestone reached: ${newStreak} days! Bonus XP: ${bonusXp}`);
    }
    
    // Additional correct answer bonus (separate from streak)
    let correctBonus = 0;
    if (correct) {
      correctBonus = Math.floor(newStreak * 5); // 5 XP per streak day for correct answers
    }
    
    const totalXp = baseXp + bonusXp + correctBonus;
    
    // Update user stats
    const bestStreak = Math.max(user.bestDailyStreak, newStreak);
    await db
      .update(users)
      .set({
        dailyStreak: newStreak,
        bestDailyStreak: bestStreak,
        lastDailyDate: today,
      })
      .where(eq(users.id, userId));
    
    // Update XP and level
    const levelResult = await progressionService.updateUserXp(userId, totalXp);
    
    // Update subject mastery
    const masteryResult = await progressionService.updateSubjectMastery(
      userId, 
      question.subject as MBESubject, 
      masteryDelta
    );
    
    // Record the attempt
    await db.insert(userDailyAttempts).values({
      userId,
      questionId,
      isCorrect: correct,
      choiceIndex,
      xpAwarded: totalXp,
      masteryDelta,
      streakBefore: user.dailyStreak,
      streakAfter: newStreak,
    });
    
    return {
      correct,
      xpDelta: totalXp,
      masteryDelta,
      newLevel: levelResult.newLevel,
      newTitle: levelResult.newTitle,
      newStreak,
      explanationLong: question.explanationLong,
      correctChoice: question.choices[question.correctIndex],
      levelUp: levelResult.levelUp,
      masteryUp: masteryResult.masteryUp,
      streakMilestone
    };
  }

  // Get user's daily streak info
  async getDailyStreakInfo(userId: string): Promise<{
    currentStreak: number;
    bestStreak: number;
    nextMilestone: number | null;
    milestoneProgress: number;
  }> {
    const [user] = await db.select().from(users).where(eq(users.id, userId));
    if (!user) {
      throw new Error('User not found');
    }
    
    const milestones = [3, 7, 14, 30];
    const nextMilestone = milestones.find(m => m > user.dailyStreak) || null;
    const prevMilestone = milestones.filter(m => m <= user.dailyStreak).pop() || 0;
    const milestoneProgress = nextMilestone ? 
      ((user.dailyStreak - prevMilestone) / (nextMilestone - prevMilestone)) * 100 : 100;
    
    return {
      currentStreak: user.dailyStreak,
      bestStreak: user.bestDailyStreak,
      nextMilestone,
      milestoneProgress: Math.round(milestoneProgress)
    };
  }
}

export const dailyCasefileService = new DailyCasefileService();