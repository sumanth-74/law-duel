// Pre-generated question bank for cost optimization
// Questions are batch-generated and cached to minimize API calls

export interface CachedQuestion {
  id: string;
  subject: string;
  stem: string;
  choices: string[];
  correctIndex: number;
  explanation: string;
  difficulty: 'novice' | 'intermediate' | 'expert';
  createdAt: Date;
  verified: boolean;
}

export class QuestionBank {
  private questions: Map<string, CachedQuestion[]> = new Map();
  private lastRefresh: Date = new Date();
  private readonly CACHE_DURATION = 10 * 60 * 1000; // 10 minutes
  private readonly BATCH_SIZE = 50; // Generate questions in batches

  constructor() {
    this.initializeBank();
  }

  private initializeBank() {
    // Pre-populate with verified high-quality questions
    const evidenceQuestions: CachedQuestion[] = [
      {
        id: 'evid_001',
        subject: 'Evidence',
        stem: 'A defendant is on trial for armed robbery. The prosecution calls a witness who testifies that she saw the defendant commit the crime. On cross-examination, defense counsel asks, "Isn\'t it true you were drinking heavily that night?" The witness denies this. Defense counsel then offers testimony from the witness\'s friend that the witness had consumed "at least six beers" before the incident. This testimony is:',
        choices: [
          'Admissible as impeachment evidence only',
          'Admissible as substantive evidence of the witness\'s intoxication',
          'Inadmissible hearsay',
          'Inadmissible because it\'s extrinsic evidence on a collateral matter'
        ],
        correctIndex: 0,
        explanation: 'Under FRE 608(b), specific instances of conduct may not be proven by extrinsic evidence when offered solely to attack credibility. However, evidence of intoxication affecting perception is admissible for impeachment as it bears directly on the witness\'s ability to observe and recall.',
        difficulty: 'intermediate',
        createdAt: new Date(),
        verified: true
      },
      {
        id: 'evid_002',
        subject: 'Evidence', 
        stem: 'In a personal injury lawsuit, plaintiff seeks to introduce a hospital record stating "Patient appears intoxicated and smells of alcohol." The record was made by a nurse who did not testify. Defendant objects. The record is:',
        choices: [
          'Admissible as a business record',
          'Admissible as a present sense impression',
          'Inadmissible hearsay containing inadmissible opinion',
          'Inadmissible because the nurse is available to testify'
        ],
        correctIndex: 0,
        explanation: 'Hospital records qualify as business records under FRE 803(6). The nurse\'s observations of apparent intoxication are admissible as they\'re based on personal knowledge and made in the regular course of medical treatment.',
        difficulty: 'intermediate',
        createdAt: new Date(),
        verified: true
      }
    ];

    const contractQuestions: CachedQuestion[] = [
      {
        id: 'cont_001',
        subject: 'Contracts',
        stem: 'A homeowner agreed to sell her house to a buyer for $300,000. Before closing, the buyer learned that the property was subject to a restrictive covenant limiting use to residential purposes only. The buyer had intended to convert the property for commercial use. The buyer refuses to close, claiming the restriction makes the contract voidable. The seller argues the covenant was recorded and the buyer should have discovered it. The buyer\'s best argument is:',
        choices: [
          'The seller had a duty to disclose all encumbrances',
          'The covenant constitutes a mutual mistake of fact',
          'The seller breached the duty of good faith and fair dealing',
          'The buyer\'s mistake was unilateral and not the seller\'s fault'
        ],
        correctIndex: 0,
        explanation: 'In most jurisdictions, sellers have an affirmative duty to disclose material encumbrances affecting the property\'s value or intended use, even if recorded. The covenant significantly impacts the buyer\'s intended commercial use.',
        difficulty: 'expert',
        createdAt: new Date(),
        verified: true
      }
    ];

    this.questions.set('Evidence', evidenceQuestions);
    this.questions.set('Contracts', contractQuestions);
    this.questions.set('Mixed', [...evidenceQuestions, ...contractQuestions]);
  }

  // Method that was being called but missing
  getCachedQuestion(subject: string): CachedQuestion | null {
    const questions = this.questions.get(subject);
    if (!questions || questions.length === 0) {
      return null;
    }
    
    // Return a random question from the subject
    const randomIndex = Math.floor(Math.random() * questions.length);
    return questions[randomIndex];
  }

  // Get a random question from any subject
  getRandomQuestion(): CachedQuestion | null {
    const allSubjects = Array.from(this.questions.keys());
    if (allSubjects.length === 0) {
      return null;
    }
    
    const randomSubject = allSubjects[Math.floor(Math.random() * allSubjects.length)];
    return this.getCachedQuestion(randomSubject);
  }

  // Check if cache needs refresh
  needsRefresh(): boolean {
    return Date.now() - this.lastRefresh.getTime() > this.CACHE_DURATION;
  }

  // Get question optimized for cost - shared between players
  getSharedQuestion(subject: string, difficulty: string = 'intermediate'): CachedQuestion | null {
    const subjectQuestions = this.questions.get(subject) || this.questions.get('Mixed') || [];
    const filteredQuestions = subjectQuestions.filter(q => 
      q.difficulty === difficulty && q.verified
    );
    
    if (filteredQuestions.length === 0) return null;
    
    // Return same question for cost optimization (shared server call)
    const now = new Date();
    const questionIndex = Math.floor(now.getMinutes() / 2) % filteredQuestions.length;
    return filteredQuestions[questionIndex];
  }

  // Fast question retrieval for <8s matchmaking
  getQuestionBatch(subject: string, count: number = 10): CachedQuestion[] {
    const subjectQuestions = this.questions.get(subject) || this.questions.get('Mixed') || [];
    const verified = subjectQuestions.filter(q => q.verified);
    
    const batch: CachedQuestion[] = [];
    for (let i = 0; i < count && i < verified.length; i++) {
      const index = (Date.now() + i) % verified.length;
      batch.push(verified[index]);
    }
    
    return batch;
  }

  // Check if bank needs refresh (10-min cache)
  needsRefresh(): boolean {
    return Date.now() - this.lastRefresh.getTime() > this.CACHE_DURATION;
  }

  // Add new verified questions to bank
  addVerifiedQuestions(subject: string, questions: CachedQuestion[]) {
    const existing = this.questions.get(subject) || [];
    const verified = questions.filter(q => q.verified);
    this.questions.set(subject, [...existing, ...verified]);
    this.lastRefresh = new Date();
  }

  // Get statistics for quality monitoring
  getStats() {
    let total = 0;
    let verified = 0;
    
    for (const [subject, questions] of this.questions.entries()) {
      total += questions.length;
      verified += questions.filter(q => q.verified).length;
    }
    
    return {
      totalQuestions: total,
      verifiedQuestions: verified,
      verificationRate: verified / total,
      subjects: Array.from(this.questions.keys()),
      lastRefresh: this.lastRefresh
    };
  }
}

export const questionBank = new QuestionBank();