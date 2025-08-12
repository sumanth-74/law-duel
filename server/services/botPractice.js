// Instant bot practice system - separate from async friend challenges
import { questionBank } from '../questionBank.ts';

export class BotPractice {
  constructor() {
    // No persistent storage needed - all instant
  }

  // Create instant practice match against bot
  async createPracticeMatch(userId, subject = 'Mixed Questions') {
    const matchId = `practice_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Get a question immediately
    const question = questionBank.getCachedQuestion(subject);
    if (!question) {
      throw new Error('No questions available for this subject');
    }

    // Create stealth bot opponent
    const bot = this.createStealthBot();
    
    const practiceSession = {
      id: matchId,
      mode: 'practice',
      subject,
      currentQuestion: {
        id: question.id,
        stem: question.stem,
        choices: question.choices,
        correctIndex: question.correctIndex,
        explanation: question.explanation,
        startTime: Date.now()
      },
      opponent: bot,
      userScore: 0,
      botScore: 0,
      questionsAnswered: 0,
      totalQuestions: 10,
      isComplete: false
    };

    return practiceSession;
  }

  // Submit answer and get next question instantly
  async submitAnswer(practiceSession, userAnswer, responseTime) {
    const { currentQuestion } = practiceSession;
    const isCorrect = userAnswer === currentQuestion.correctIndex;
    
    // Update scores
    if (isCorrect) {
      practiceSession.userScore++;
    }

    // Bot answers with adaptive difficulty (70% base accuracy)
    const botAccuracy = 0.7;
    const botCorrect = Math.random() < botAccuracy;
    if (botCorrect) {
      practiceSession.botScore++;
    }

    practiceSession.questionsAnswered++;

    // Check if match is complete
    if (practiceSession.questionsAnswered >= practiceSession.totalQuestions) {
      practiceSession.isComplete = true;
      
      return {
        result: {
          userAnswer,
          correctAnswer: currentQuestion.correctIndex,
          isCorrect,
          explanation: currentQuestion.explanation,
          botAnswer: botCorrect ? currentQuestion.correctIndex : (currentQuestion.correctIndex + 1) % currentQuestion.choices.length,
          botCorrect,
          finalScores: {
            user: practiceSession.userScore,
            bot: practiceSession.botScore
          },
          winner: practiceSession.userScore > practiceSession.botScore ? 'user' : 
                 practiceSession.userScore < practiceSession.botScore ? 'bot' : 'tie'
        },
        nextQuestion: null,
        isComplete: true
      };
    }

    // Get next question
    const nextQuestion = questionBank.getCachedQuestion(practiceSession.subject);
    if (!nextQuestion) {
      throw new Error('No more questions available');
    }

    practiceSession.currentQuestion = {
      id: nextQuestion.id,
      stem: nextQuestion.stem,
      choices: nextQuestion.choices,
      correctIndex: nextQuestion.correctIndex,
      explanation: nextQuestion.explanation,
      startTime: Date.now()
    };

    return {
      result: {
        userAnswer,
        correctAnswer: currentQuestion.correctIndex,
        isCorrect,
        explanation: currentQuestion.explanation,
        botAnswer: botCorrect ? currentQuestion.correctIndex : (currentQuestion.correctIndex + 1) % currentQuestion.choices.length,
        botCorrect,
        currentScores: {
          user: practiceSession.userScore,
          bot: practiceSession.botScore
        }
      },
      nextQuestion: {
        id: nextQuestion.id,
        stem: nextQuestion.stem,
        choices: nextQuestion.choices,
        questionNumber: practiceSession.questionsAnswered + 1,
        totalQuestions: practiceSession.totalQuestions
      },
      isComplete: false
    };
  }

  createStealthBot() {
    const humanNames = [
      'LegalEagle47', 'JuristJoe', 'BarExamAce', 'LawScholar99', 'AttorneyAtLaw',
      'CounselorCat', 'LegalBeagle', 'JudgeJudy42', 'BarPasser', 'LawStudent2024',
      'ConLawExpert', 'TortsGuru', 'EvidenceNinja', 'ContractKing', 'CivilProcAce'
    ];

    return {
      id: `bot_${Date.now()}`,
      username: humanNames[Math.floor(Math.random() * humanNames.length)],
      displayName: humanNames[Math.floor(Math.random() * humanNames.length)],
      isBot: true,
      level: Math.floor(Math.random() * 5) + 2,
      points: Math.floor(Math.random() * 1000) + 200
    };
  }
}