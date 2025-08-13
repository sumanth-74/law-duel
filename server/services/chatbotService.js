import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

class ChatbotService {
  constructor() {
    this.conversationHistory = new Map(); // Store conversation history per user
    this.maxHistoryLength = 10; // Keep last 10 exchanges
  }

  // System prompt for the legal study companion
  getSystemPrompt() {
    return `You are Atticus, an AI-powered legal study companion for law students preparing for the bar exam and law school finals. You are knowledgeable, encouraging, and focused on helping students learn legal concepts effectively.

Key guidelines:
- Keep responses concise but comprehensive (2-4 paragraphs max)
- Use clear, educational language appropriate for law students
- Provide practical examples when explaining legal concepts
- Reference relevant cases, statutes, or legal principles when helpful
- Encourage active learning and critical thinking
- Focus on MBE subjects: Constitutional Law, Contracts, Torts, Criminal Law/Procedure, Evidence, Civil Procedure, and Property
- If asked about non-legal topics, gently redirect to legal studies
- Use a supportive, mentor-like tone

Format your responses to be engaging and educational, helping students understand complex legal concepts through clear explanations and practical applications.`;
  }

  // Get conversation history for a user
  getUserHistory(userId) {
    if (!this.conversationHistory.has(userId)) {
      this.conversationHistory.set(userId, []);
    }
    return this.conversationHistory.get(userId);
  }

  // Add message to user's conversation history
  addToHistory(userId, role, content) {
    const history = this.getUserHistory(userId);
    history.push({ role, content });
    
    // Keep only the last maxHistoryLength exchanges (user + assistant pairs)
    if (history.length > this.maxHistoryLength * 2) {
      history.splice(0, history.length - (this.maxHistoryLength * 2));
    }
    
    this.conversationHistory.set(userId, history);
  }

  // Clear conversation history for a user
  clearHistory(userId) {
    this.conversationHistory.set(userId, []);
  }

  // Generate response using OpenAI
  async generateResponse(userId, userMessage, context = {}) {
    try {
      // Add user message to history
      this.addToHistory(userId, 'user', userMessage);
      
      // Get conversation history
      const history = this.getUserHistory(userId);
      
      // Build messages array for OpenAI
      const messages = [
        { role: 'system', content: this.getSystemPrompt() }
      ];

      // Add context if provided (e.g., current subject being studied)
      if (context.subject) {
        messages.push({
          role: 'system',
          content: `The user is currently studying ${context.subject}. Tailor your response to be relevant to this subject when appropriate.`
        });
      }

      // Add conversation history
      messages.push(...history);

      const completion = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: messages,
        max_tokens: 500,
        temperature: 0.7,
        presence_penalty: 0.3,
        frequency_penalty: 0.3
      });

      const assistantResponse = completion.choices[0].message.content;
      
      // Add assistant response to history
      this.addToHistory(userId, 'assistant', assistantResponse);
      
      return {
        response: assistantResponse,
        tokensUsed: completion.usage.total_tokens
      };
      
    } catch (error) {
      console.error('Error generating chatbot response:', error);
      throw new Error('Failed to generate response. Please try again.');
    }
  }

  // Get suggested questions based on subject
  getSuggestedQuestions(subject = null) {
    const generalQuestions = [
      "What's the difference between negligence and strict liability?",
      "Can you explain the elements of a valid contract?",
      "What are the key Constitutional amendments I should memorize?",
      "How do I approach evidence questions on the MBE?",
      "What's the best way to analyze a civil procedure problem?"
    ];

    const subjectQuestions = {
      'Constitutional Law': [
        "Explain the levels of constitutional scrutiny",
        "What's the difference between facial and as-applied challenges?",
        "When does the Commerce Clause apply?",
        "Explain the Establishment Clause vs Free Exercise Clause"
      ],
      'Contracts': [
        "What are the elements of offer and acceptance?",
        "Explain the parol evidence rule",
        "When can a contract be rescinded?",
        "What's the difference between warranties and conditions?"
      ],
      'Torts': [
        "Explain the elements of negligence",
        "What are intentional torts vs negligence?",
        "When does strict liability apply?",
        "Explain comparative vs contributory negligence"
      ],
      'Criminal Law': [
        "What are the elements of murder vs manslaughter?",
        "Explain mens rea and actus reus",
        "What are the major defenses to criminal liability?",
        "When can someone be charged with conspiracy?"
      ],
      'Evidence': [
        "What's the difference between relevance and admissibility?",
        "Explain the hearsay rule and its exceptions",
        "When can character evidence be introduced?",
        "What are the rules for expert testimony?"
      ],
      'Civil Procedure': [
        "Explain personal jurisdiction vs subject matter jurisdiction",
        "What are the requirements for class action suits?",
        "When can a case be removed to federal court?",
        "Explain the discovery process"
      ],
      'Property': [
        "What are the different types of estates in land?",
        "Explain adverse possession requirements",
        "What's the difference between easements and licenses?",
        "When do recording acts apply?"
      ]
    };

    if (subject && subjectQuestions[subject]) {
      return [...subjectQuestions[subject], ...generalQuestions.slice(0, 2)];
    }
    
    return generalQuestions;
  }

  // Get study tips for a specific subject
  getStudyTips(subject) {
    const tips = {
      'Constitutional Law': [
        "Create a flowchart for levels of scrutiny (strict, intermediate, rational basis)",
        "Memorize key constitutional amendments and their applications",
        "Practice identifying when state action is required",
        "Focus on Commerce Clause, Due Process, and Equal Protection analysis"
      ],
      'Contracts': [
        "Master the elements: offer, acceptance, consideration, and capacity",
        "Understand the difference between UCC and common law rules",
        "Practice identifying material vs minor breaches",
        "Know your remedies: damages, specific performance, rescission"
      ],
      'Torts': [
        "Create duty analysis charts for different relationships",
        "Practice causation analysis (but-for and proximate cause)",
        "Memorize intentional tort elements and defenses",
        "Understand when strict liability applies (products, abnormally dangerous activities)"
      ],
      'Criminal Law': [
        "Focus on mens rea categories: purposely, knowingly, recklessly, negligently",
        "Practice applying defenses: self-defense, necessity, duress",
        "Understand accomplice liability and conspiracy rules",
        "Know the difference between murder degrees and manslaughter"
      ],
      'Evidence': [
        "Master the hearsay rule and ALL exceptions",
        "Practice relevance vs prejudice balancing (Rule 403)",
        "Understand authentication requirements for documents",
        "Know when character evidence is admissible"
      ],
      'Civil Procedure': [
        "Create jurisdiction flowcharts for personal and subject matter",
        "Practice venue analysis and transfer rules",
        "Understand pleading standards (notice vs fact pleading)",
        "Know discovery scope and limitations"
      ],
      'Property': [
        "Memorize the estates: fee simple, life estate, future interests",
        "Practice recording acts problems with multiple parties",
        "Understand landlord-tenant law basics",
        "Know easement creation and termination rules"
      ]
    };

    return tips[subject] || [
      "Create active study schedules with regular practice questions",
      "Form study groups to discuss complex legal concepts",
      "Use flashcards for key legal rules and elements",
      "Practice issue-spotting with past exam questions"
    ];
  }
}

export const chatbotService = new ChatbotService();