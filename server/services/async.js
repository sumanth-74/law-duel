import { questionBank } from '../questionBank.js';
import { storage } from '../storage.js';
import { progressService } from '../progress.js';

class AsyncDuels {
  constructor() {
    this.queues = new Map(); // subject -> [userId] - keep in memory for quick matching
    this.notifications = new Map(); // userId -> count
    
    // Start background tasks
    this.startDeadlineChecker();
    this.startBotAnswerProcessor();
  }

  generateMatchId() {
    return `m_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Clean up matches that should be finished but aren't marked as such
  async cleanupFinishedMatches(userId, opponentId) {
    try {
      // Get all matches between these players using the existing method
      const allMatches = await storage.getAsyncMatches();
      const relevantMatches = allMatches.filter(match => 
        (match.player1Id === userId && match.player2Id === opponentId) || 
        (match.player1Id === opponentId && match.player2Id === userId)
      );
      
      console.log(`🧹 Cleaning up matches between ${userId} and ${opponentId}:`, relevantMatches.map(m => ({ id: m.id, status: m.status })));
      
      // Find matches that should be finished (have winnerId or finishedAt but status is not 'finished')
      const matchesToFix = relevantMatches.filter(match => 
        match.status !== 'finished' && (match.winnerId || match.finishedAt)
      );
      
      for (const match of matchesToFix) {
        console.log(`🔧 Fixing match ${match.id}: status=${match.status}, winnerId=${match.winnerId}, finishedAt=${match.finishedAt}`);
        await storage.updateMatch(match.id, {
          status: 'finished',
          updatedAt: new Date()
        });
      }
      
      if (matchesToFix.length > 0) {
        console.log(`✅ Fixed ${matchesToFix.length} matches that should have been finished`);
      }
    } catch (error) {
      console.error('Error cleaning up finished matches:', error);
    }
  }

  // Create new async match
  async createMatch(userId, subject, opponentUsername = null) {
    const user = await storage.getUser(userId);
    if (!user) throw new Error('User not found');
    
    // Clean up any matches that should be finished but aren't marked as such
    if (opponentUsername) {
      const opponent = await storage.getUserByUsername(opponentUsername.replace('@', ''));
      if (opponent) {
        await this.cleanupFinishedMatches(userId, opponent.id);
      }
    }
    
    let opponent = null;
    let isBotMatch = false;

    if (opponentUsername) {
      // Direct challenge by username
      opponent = await storage.getUserByUsername(opponentUsername.replace('@', ''));
      if (!opponent) throw new Error('Opponent not found');
      
      // Check if an active match already exists between these two players
      console.log(`🔍 Checking for existing match between ${user.username} (${userId}) and ${opponent.username} (${opponent.id})`);
      const existingMatch = await storage.getActiveAsyncMatch(userId, opponent.id);
      
      if (existingMatch) {
        // Double-check: if the match is not actually active, don't return it
        if (existingMatch.status !== 'active') {
          console.log(`⚠️ Found match but status is '${existingMatch.status}', not 'active'. Ignoring and creating new match.`);
        } else {
          // Return the existing match instead of creating a new one
          console.log(`⚠️ Found existing active match between ${user.username} and ${opponent.username}: ${existingMatch.id}, status: ${existingMatch.status}`);
          return { 
            matchId: existingMatch.id, 
            match: existingMatch,
            existing: true 
          };
        }
      } else {
        console.log(`✅ No existing match found, proceeding to create new match`);
      }
    } else {
      // Quick Match - check queue first
      const queueKey = `${subject}_Bar`; // Assume Bar for now
      if (!this.queues.has(queueKey)) this.queues.set(queueKey, []);

      const queue = this.queues.get(queueKey);
      if (queue.length > 0) {
        // Match with queued player
        const opponentId = queue.shift();
        opponent = await storage.getUser(opponentId);
      } else {
        // Add to queue, wait 8s for match
        queue.push(userId);

        // Wait 8s for another player
        await new Promise(resolve => setTimeout(resolve, 8000));
        
        if (queue.length > 1) {
          // Found a match
          const filteredQueue = queue.filter(id => id !== userId);
          const opponentId = filteredQueue.shift();
          opponent = await storage.getUser(opponentId);
          this.queues.set(queueKey, filteredQueue);
        } else {
          // No match - create stealth bot
          const filteredQueue = queue.filter(id => id !== userId);
          this.queues.set(queueKey, filteredQueue);
          
          opponent = this.createStealthBot();
          isBotMatch = true;
        }
      }
    }

    if (!opponent) {
      opponent = this.createStealthBot();
      isBotMatch = true;
    }

    // Create match in database
    const match = await storage.createMatch({
      roomCode: `async_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      subject,
      player1Id: userId,
      player2Id: opponent.id,
      status: 'active',
      mode: 'async',
      bestOf: 7,
      isBotMatch,
      turns: [],
      difficulty: 1
    });
    
    // Start first turn
    await this.startTurn(match.id);
    
    // Notify both players
    this.enqueueNotification(userId, `New async match vs @${opponent.username}`);
    if (!isBotMatch) {
      this.enqueueNotification(opponent.id, `New async match vs @${user.username}`);
    }

    return { matchId: match.id, match };
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

  async startTurn(matchId) {
    const match = await storage.getMatch(matchId);
    if (!match || match.status !== 'active') {
      console.log(`❌ StartTurn failed: match=${!!match}, status=${match?.status}`);
      return;
    }
    
    console.log(`🚀 StartTurn: currentRound=${match.currentRound}, bestOf=${match.bestOf}, turns=${match.turns?.length}`);

    try {
      // Progressive difficulty: increases every 2 rounds like VS mode
      const newRound = match.currentRound + 1;
      const difficulty = Math.min(Math.floor(newRound / 2), 10);
      console.log(`📈 Async Duel Round ${newRound}: Difficulty level ${difficulty}`);
      
      // Use the same question generation as VS mode with OpenAI and difficulty
      const { getQuestion } = await import('./qcoordinator.js');
      const question = await getQuestion(match.subject, [], true, difficulty);
      
      if (!question) {
        console.error('Failed to generate OpenAI question for async match:', matchId);
        return;
      }

      const turn = {
        qid: question.qid || question.id,
        stem: question.stem,
        choices: question.choices,
        subject: question.subject || match.subject, // Store subject for progress tracking
        difficulty: difficulty,
        deadlineTs: Date.now() + (24 * 60 * 60 * 1000), // 24 hours
        answers: {},
        revealed: false,
        correctIndex: question.correctIndex,
        explanation: question.explanationLong || question.explanation
      };

      const updatedTurns = [...(match.turns || []), turn];
      
      // Update match in database
      await storage.updateMatch(matchId, {
        turns: updatedTurns,
        difficulty: difficulty,
        currentRound: newRound
      });

      // Schedule bot answer if this is a bot match
      if (match.isBotMatch) {
        this.scheduleBotAnswer(matchId, match.currentRound);
      }

      // Notify players it's their turn
      const players = [match.player1Id, match.player2Id].filter(id => id);
      players.forEach(playerId => {
        if (!playerId.startsWith('bot_')) {
          const opponentId = players.find(id => id !== playerId);
          this.enqueueNotification(playerId, `Your turn vs @${opponentId ? 'Opponent' : 'Bot'} · Round ${match.currentRound}`);
        }
      });

    } catch (error) {
      console.error('Failed to start turn:', error);
    }
  }

  scheduleBotAnswer(matchId, round) {
    // Random delay between 8-45 minutes + jitter
    const delayMs = (8 + Math.random() * 37) * 60 * 1000 + Math.random() * 5000;
    
    setTimeout(async () => {
      const match = await storage.getMatch(matchId);
      if (!match || match.currentRound !== round || match.status !== 'active') return;

      const currentTurn = match.turns && match.turns.length > 0 ? match.turns[match.turns.length - 1] : null;
      if (!currentTurn || currentTurn.revealed) return;

      const botPlayerId = match.player1Id.startsWith('bot_') ? match.player1Id : match.player2Id;
      if (!botPlayerId) return;

      // Bot accuracy based on match difficulty (70% base with variance)
      const accuracy = 0.65 + Math.random() * 0.2; // 65-85%
      const isCorrect = Math.random() < accuracy;
      const answerIndex = isCorrect ? currentTurn.correctIndex : Math.floor(Math.random() * 4);
      const responseTime = Math.random() * 15000 + 5000; // 5-20 seconds

      await this.submitAnswer(matchId, botPlayerId, answerIndex, responseTime);
    }, delayMs);
  }

  async submitAnswer(matchId, userId, answerIndex, responseTimeMs) {
    console.log(`🔄 submitAnswer called: matchId=${matchId}, userId=${userId}, answerIndex=${answerIndex}, responseTimeMs=${responseTimeMs}`);
    
    const match = await storage.getMatch(matchId);
    if (!match || match.status !== 'active') {
      console.log(`❌ Match not found or not active: match=${!!match}, status=${match?.status}`);
      throw new Error('Match not found or not active');
    }

    // Verify user is in this match
    const isPlayerInMatch = match.player1Id === userId || match.player2Id === userId;
    if (!isPlayerInMatch) {
      console.log(`❌ User not in match: player1Id=${match.player1Id}, player2Id=${match.player2Id}, userId=${userId}`);
      throw new Error('User not in this match');
    }

    const currentTurn = match.turns && match.turns.length > 0 ? match.turns[match.turns.length - 1] : null;
    if (!currentTurn) {
      console.log(`❌ No active turn: turns.length=${match.turns?.length}`);
      throw new Error('No active turn');
    }

    // Check if already answered
    if (currentTurn.answers[userId]) {
      console.log(`❌ Already answered: userId=${userId}, existingAnswer=${JSON.stringify(currentTurn.answers[userId])}`);
      throw new Error('Already answered this turn');
    }

    // Check deadline
    if (Date.now() > currentTurn.deadlineTs) {
      throw new Error('Turn deadline passed');
    }

    // Record answer
    currentTurn.answers[userId] = {
      idx: answerIndex,
      ms: responseTimeMs,
      timestamp: Date.now()
    };

    console.log(`📝 SubmitAnswer: Recorded answer for ${userId}:`, {
      answerIndex,
      responseTimeMs,
      currentAnswers: currentTurn.answers,
      answersCount: Object.keys(currentTurn.answers).length
    });

    // Update match in database
    await storage.updateMatch(matchId, {
      turns: match.turns,
      updatedAt: new Date()
    });

    console.log(`💾 SubmitAnswer: Updated match in database`);

    // Check if both players have answered
    const players = [match.player1Id, match.player2Id].filter(id => id);
    const allAnswered = players.every(p => currentTurn.answers[p]);
    
    console.log(`📝 SubmitAnswer: player=${userId}, allAnswered=${allAnswered}, answers=${JSON.stringify(currentTurn.answers)}`);
    console.log(`📝 SubmitAnswer: Players check:`, {
      player1Id: match.player1Id,
      player2Id: match.player2Id,
      player1Answered: !!currentTurn.answers[match.player1Id],
      player2Answered: !!currentTurn.answers[match.player2Id],
      allAnswered
    });

    if (allAnswered) {
      console.log(`✅ Both players answered, revealing turn...`);
      console.log(`📊 Answer details:`, {
        player1Answer: currentTurn.answers[match.player1Id],
        player2Answer: currentTurn.answers[match.player2Id],
        correctIndex: currentTurn.correctIndex
      });
      await this.revealTurn(matchId);
    } else {
      console.log(`⏳ Waiting for more answers. Current answers:`, Object.keys(currentTurn.answers));
    }

    return match;
  }

  async revealTurn(matchId) {
    console.log(`🔍 RevealTurn called for match ${matchId}`);
    const match = await storage.getMatch(matchId);
    console.log(`🔍 Match data:`, {
      id: match?.id,
      currentRound: match?.currentRound,
      bestOf: match?.bestOf,
      status: match?.status,
      turnsLength: match?.turns?.length
    });
    
    const currentTurn = match.turns && match.turns.length > 0 ? match.turns[match.turns.length - 1] : null;
    
    if (!currentTurn) {
      console.log(`❌ RevealTurn: No current turn found`);
      return;
    }
    
    if (currentTurn.revealed) {
      console.log(`⚠️ RevealTurn: Turn already revealed`);
      return;
    }
    
    console.log(`🔄 RevealTurn: Revealing turn for match ${matchId}, round ${match.currentRound}`);
    console.log(`🔍 Current turn details before reveal:`, {
      qid: currentTurn.qid,
      revealed: currentTurn.revealed,
      answers: currentTurn.answers,
      answersCount: Object.keys(currentTurn.answers || {}).length,
      player1Id: match.player1Id,
      player2Id: match.player2Id,
      player1Answer: currentTurn.answers[match.player1Id],
      player2Answer: currentTurn.answers[match.player2Id]
    });
    
    // Mark turn as revealed
    currentTurn.revealed = true;
    console.log(`🔍 Turn marked as revealed:`, {
      turnId: currentTurn.qid,
      revealed: currentTurn.revealed,
      answers: Object.keys(currentTurn.answers || {})
    });

    // Score the turn and track subtopic progress
    const correctAnswers = [];
    const incorrectAnswers = [];
    const players = [match.player1Id, match.player2Id].filter(id => id);

    for (const playerId of players) {
      const answer = currentTurn.answers[playerId];
      const isCorrect = answer && answer.idx === currentTurn.correctIndex;
      
      // Track subtopic progress for human players
      if (!playerId.startsWith('bot_')) {
        try {
          await progressService.recordAttempt({
            userId: playerId,
            duelId: matchId,
            questionId: currentTurn.qid,
            subject: currentTurn.subject || match.subject,
            subtopic: currentTurn.subtopic || currentTurn.subject || match.subject,
            difficulty: currentTurn.difficulty || 1,
            correct: isCorrect,
            msToAnswer: answer ? answer.ms : 60000,
            ts: Date.now()
          });
        } catch (error) {
          console.error('Error recording subtopic progress in async duel:', error);
        }
      }
      
      if (isCorrect) {
        correctAnswers.push({ id: playerId, ...answer });
      } else {
        incorrectAnswers.push({ id: playerId, ...answer });
      }
    }

    // Determine round winner
    let roundWinnerId = null;
    if (correctAnswers.length === 1) {
      roundWinnerId = correctAnswers[0].id;
    } else if (correctAnswers.length === 2) {
      // Both correct, fastest wins
      roundWinnerId = correctAnswers.reduce((a, b) => a.ms < b.ms ? a : b).id;
    }

    // Update scores
    let newPlayer1Score = match.player1Score;
    let newPlayer2Score = match.player2Score;
    
    console.log(`📊 Score update:`, {
      roundWinnerId,
      player1Id: match.player1Id,
      player2Id: match.player2Id,
      currentPlayer1Score: newPlayer1Score,
      currentPlayer2Score: newPlayer2Score
    });
    
    if (roundWinnerId === match.player1Id) {
      newPlayer1Score++;
      console.log(`✅ Player 1 wins round, new score: ${newPlayer1Score}`);
    } else if (roundWinnerId === match.player2Id) {
      newPlayer2Score++;
      console.log(`✅ Player 2 wins round, new score: ${newPlayer2Score}`);
    } else {
      console.log(`🤝 No winner this round (tie or no correct answers)`);
    }

    // Don't increment round here - startTurn already handles it
    const updatedTurns = [...(match.turns || [])];
    updatedTurns[updatedTurns.length - 1] = currentTurn;
    
    console.log(`🔍 Updated turns before database update:`, {
      turnIndex: updatedTurns.length - 1,
      turnRevealed: updatedTurns[updatedTurns.length - 1]?.revealed,
      turnAnswers: Object.keys(updatedTurns[updatedTurns.length - 1]?.answers || {}),
      correctIndex: updatedTurns[updatedTurns.length - 1]?.correctIndex
    });

    // Check if match is over (only after all questions are answered)
    let newStatus = match.status;
    let newWinnerId = match.winnerId;
    
    console.log(`🔍 About to check match completion:`, {
      currentRound: match.currentRound,
      bestOf: match.bestOf,
      player1Score: newPlayer1Score,
      player2Score: newPlayer2Score,
      currentStatus: match.status
    });
    
    // Check if match is over - either by reaching bestOf rounds or by someone winning enough rounds
    const winningScore = Math.ceil(match.bestOf / 2);
    const hasWinner = newPlayer1Score >= winningScore || newPlayer2Score >= winningScore;
    const allRoundsCompleted = match.currentRound >= match.bestOf;
    
    console.log(`🔍 Detailed completion check:`, {
      currentRound: match.currentRound,
      bestOf: match.bestOf,
      currentRoundType: typeof match.currentRound,
      bestOfType: typeof match.bestOf,
      comparison: `${match.currentRound} >= ${match.bestOf} = ${match.currentRound >= match.bestOf}`,
      player1Score: newPlayer1Score,
      player2Score: newPlayer2Score,
      winningScore,
      hasWinner,
      allRoundsCompleted
    });
    
    console.log(`🏁 Match completion check:`, {
      currentRound: match.currentRound,
      bestOf: match.bestOf,
      player1Score: newPlayer1Score,
      player2Score: newPlayer2Score,
      winningScore,
      hasWinner,
      allRoundsCompleted,
      currentStatus: match.status
    });
    
    if (hasWinner || allRoundsCompleted) {
      const winnerId = newPlayer1Score > newPlayer2Score ? match.player1Id : 
                      newPlayer2Score > newPlayer1Score ? match.player2Id : null;
      
      newStatus = 'finished';
      newWinnerId = winnerId;
      
      console.log(`🏁 Match finished:`, {
        winnerId,
        finalScore: `${newPlayer1Score}-${newPlayer2Score}`,
        reason: hasWinner ? 'Winner found' : 'All rounds completed'
      });
    } else {
      console.log(`⚠️ Match not finished: hasWinner=${hasWinner}, allRoundsCompleted=${allRoundsCompleted}`);
    }

    // Update match in database
    console.log(`💾 Updating match in database:`, {
      matchId,
      currentRound: match.currentRound,
      newPlayer1Score,
      newPlayer2Score,
      newStatus,
      newWinnerId,
      turnRevealed: currentTurn.revealed,
      willFinish: newStatus === 'finished'
    });
    
    await storage.updateMatch(matchId, {
      turns: updatedTurns,
      player1Score: newPlayer1Score,
      player2Score: newPlayer2Score,
      status: newStatus,
      winnerId: newWinnerId,
      updatedAt: new Date()
    });
    
    console.log(`✅ Match updated successfully in database`);

    console.log(`🔄 RevealTurn: currentRound=${match.currentRound}, bestOf=${match.bestOf}, newStatus=${newStatus}`);
    
    if (newStatus === 'finished') {
      console.log(`🏁 Match finished, finalizing...`);
      await this.finalizeMatch(matchId);
    } else if (match.currentRound < match.bestOf) {
      console.log(`⏭️ Starting next turn in 5 seconds...`);
      // Start next turn - give more time for frontend to see the reveal
      setTimeout(() => this.startTurn(matchId), 5000);
    } else {
      console.log(`❌ No next turn: currentRound=${match.currentRound}, bestOf=${match.bestOf}`);
    }

    // Notify players of results
    players.forEach(playerId => {
      if (!playerId.startsWith('bot_')) {
        const opponentId = players.find(id => id !== playerId);
        if (newStatus === 'finished') {
          const won = newWinnerId === playerId;
          this.enqueueNotification(playerId, `Match ${won ? 'won' : 'lost'} vs @${opponentId ? 'Opponent' : 'Bot'}`);
        } else {
          this.enqueueNotification(playerId, `Round ${match.currentRound} results vs @${opponentId ? 'Opponent' : 'Bot'}`);
        }
      }
    });
  }

  async finalizeMatch(matchId) {
    const match = await storage.getMatch(matchId);
    const winnerId = match.winnerId;
    const loserId = winnerId === match.player1Id ? match.player2Id : match.player1Id;

    // Calculate Elo rating changes - Per North Star (K=24)
    const K = 24;
    const winner = await storage.getUser(winnerId && winnerId.startsWith && winnerId.startsWith('bot_') ? null : winnerId);
    const loser = await storage.getUser(loserId && loserId.startsWith && loserId.startsWith('bot_') ? null : loserId);
    
    if (winner && loser) {
      const winnerRating = winner.points || 1200;
      const loserRating = loser.points || 1200;
      
      const expectedWinner = 1 / (1 + Math.pow(10, (loserRating - winnerRating) / 400));
      const expectedLoser = 1 / (1 + Math.pow(10, (winnerRating - loserRating) / 400));
      
      const winnerChange = Math.round(K * (1 - expectedWinner));
      const loserChange = Math.round(K * (0 - expectedLoser));
      
      // Apply Elo changes
      await storage.updateUser(winnerId, { 
        points: winnerRating + winnerChange 
      });
      
      await storage.updateUser(loserId, { 
        points: loserRating + loserChange 
      });
      
      console.log(`🏆 Async Duel ${matchId} complete: Winner +${winnerChange} Elo, Loser ${loserChange} Elo`);
    } else if (winner && !loser) {
      // Bot match - human vs bot at 1200 rating
      const humanRating = winner.points || 1200;
      const botRating = 1200;
      
      const expected = 1 / (1 + Math.pow(10, (botRating - humanRating) / 400));
      const ratingChange = Math.round(K * (1 - expected));
      
      await storage.updateUser(winnerId, { 
        points: humanRating + ratingChange 
      });
    } else if (loser && !winner) {
      // Human lost to bot
      const humanRating = loser.points || 1200;
      const botRating = 1200;
      
      const expected = 1 / (1 + Math.pow(10, (botRating - humanRating) / 400));
      const ratingChange = Math.round(K * (0 - expected));
      
      await storage.updateUser(loserId, { 
        points: humanRating + ratingChange 
      });
    }
  }

  getOpponent(match, userId) {
    return match.players.find(p => p.id !== userId);
  }

  // Get user's inbox - only friend challenges, no bot matches
  async getUserInbox(userId) {
    const userMatches = await storage.getAsyncMatches(userId);
    
    return userMatches.map(match => {
      const opponent = {
        id: match.player1Id === userId ? match.player2Id : match.player1Id,
        username: match.player1Id === userId ? 
          (match.player2Id ? 'Opponent' : 'Bot') : 
          (match.player1Id ? 'Opponent' : 'Bot')
      };
      
      const currentTurn = match.turns && match.turns.length > 0 ? match.turns[match.turns.length - 1] : null;
      const yourTurn = currentTurn && !currentTurn.answers[userId] && !currentTurn.revealed;
      const timeLeft = currentTurn ? Math.max(0, currentTurn.deadlineTs - Date.now()) : 0;

      return {
        id: match.id,
        subject: match.subject,
        opponent: opponent.username,
        round: match.currentRound,
        status: match.status,
        yourTurn,
        timeLeft,
        scores: {
          [userId]: match.player1Id === userId ? match.player1Score : match.player2Score,
          [opponent.id]: match.player1Id === userId ? match.player2Score : match.player1Score
        },
        updatedAt: match.updatedAt ? new Date(match.updatedAt).getTime() : new Date(match.createdAt).getTime()
      };
    }).sort((a, b) => b.updatedAt - a.updatedAt);
  }

  // Get full match state (filtered for user)
  async getMatchForUser(matchId, userId) {
    const match = await storage.getMatch(matchId);
    if (!match) return null;
    
    console.log(`🔍 getMatchForUser for user ${userId}:`, {
      matchId,
      turnsLength: match.turns?.length,
      lastTurnRevealed: match.turns?.[match.turns.length - 1]?.revealed,
      lastTurnAnswers: match.turns?.[match.turns.length - 1] ? Object.keys(match.turns[match.turns.length - 1].answers || {}) : []
    });

    // Verify user is in this match
    const isPlayerInMatch = match.player1Id === userId || match.player2Id === userId;
    if (!isPlayerInMatch) return null;

    // Filter sensitive data
    const filteredTurns = (match.turns || []).map((turn, index) => {
      console.log(`🔍 Filtering turn ${index} for user ${userId}:`, {
        qid: turn.qid,
        revealed: turn.revealed,
        answersCount: Object.keys(turn.answers || {}).length,
        allAnswers: Object.keys(turn.answers || {}),
        userId,
        turnAnswers: turn.answers
      });
      
      if (turn.revealed) {
        // Show everything if revealed - both players should see all answers
        console.log(`✅ Turn ${index} is revealed, showing all data for user ${userId}`);
        return {
          ...turn,
          correctIndex: turn.correctIndex,
          explanation: turn.explanation
        };
      } else {
        // Hide correct answer and opponent's answer if not revealed
        console.log(`🔒 Turn ${index} not revealed, filtering answers for user ${userId}`);
        return {
          qid: turn.qid,
          stem: turn.stem,
          choices: turn.choices,
          deadlineTs: turn.deadlineTs,
          answers: { [userId]: turn.answers[userId] }, // Only show user's answer
          revealed: turn.revealed
        };
      }
    });

    // Transform to match frontend expectations
    const players = [
      { id: match.player1Id, username: match.player1Id && match.player1Id.startsWith('bot_') ? 'Bot' : 'Player 1' },
      { id: match.player2Id, username: match.player2Id ? (match.player2Id.startsWith('bot_') ? 'Bot' : 'Player 2') : 'Bot' }
    ];

    const result = {
      id: match.id,
      subject: match.subject,
      players: players,
      scores: {
        [match.player1Id]: match.player1Score || 0,
        [match.player2Id]: match.player2Score || 0
      },
      round: match.currentRound,
      turns: filteredTurns,
      status: match.status,
      winnerId: match.winnerId,
      bestOf: match.bestOf || 7
    };

    console.log(`🔍 getMatchForUser returning data for user ${userId}:`, {
      matchId: result.id,
      status: result.status,
      turnsLength: result.turns.length,
      lastTurnRevealed: result.turns[result.turns.length - 1]?.revealed,
      lastTurnAnswers: result.turns[result.turns.length - 1] ? Object.keys(result.turns[result.turns.length - 1].answers || {}) : []
    });

    return result;
  }

  async resignMatch(matchId, userId) {
    const match = await storage.getMatch(matchId);
    if (!match || match.status !== 'active') {
      throw new Error('Match not found or not active');
    }

    // Verify user is in this match
    const isPlayerInMatch = match.player1Id === userId || match.player2Id === userId;
    if (!isPlayerInMatch) {
      throw new Error('User not in this match');
    }

    // Set opponent as winner
    const opponentId = match.player1Id === userId ? match.player2Id : match.player1Id;
    
    // Update match in database
    console.log(`🔄 Resigning match ${matchId}: setting status to 'finished', winnerId=${opponentId}`);
    await storage.updateMatch(matchId, {
      status: 'finished',
      winnerId: opponentId,
      updatedAt: new Date()
    });
    
    // Add a small delay to ensure database update is committed
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Verify the update worked
    const updatedMatch = await storage.getMatch(matchId);
    console.log(`🔍 After resign - match ${matchId} status: ${updatedMatch?.status}, winnerId: ${updatedMatch?.winnerId}`);
    
    console.log(`✅ Match ${matchId} resigned successfully`);

    await this.finalizeMatch(matchId);

    return match;
  }

  // Notification system
  enqueueNotification(userId, text) {
    const current = this.notifications.get(userId) || 0;
    this.notifications.set(userId, current + 1);
    
    // TODO: Wire to email/push later
    console.log(`Notification for ${userId}: ${text}`);
  }

  getUnreadCount(userId) {
    return this.notifications.get(userId) || 0;
  }

  clearNotifications(userId) {
    this.notifications.set(userId, 0);
  }

  // Background tasks
  startDeadlineChecker() {
    setInterval(() => {
      this.checkDeadlines();
    }, 60000); // Check every minute
  }

  async checkDeadlines() {
    const now = Date.now();
    let matchesUpdated = false;

    // Get all active async matches from database
    const activeMatches = await storage.getAsyncMatches();
    
    for (const match of activeMatches) {
      if (match.status !== 'active') continue;

      const currentTurn = match.turns && match.turns.length > 0 ? match.turns[match.turns.length - 1] : null;
      if (!currentTurn || currentTurn.revealed) continue;

      if (now > currentTurn.deadlineTs) {
        // Deadline passed - forfeit round to players who answered
        const answeredPlayers = Object.keys(currentTurn.answers);
        const players = [match.player1Id, match.player2Id].filter(id => id);
        const unansweredPlayers = players.filter(p => !currentTurn.answers[p]);

        if (answeredPlayers.length === 1) {
          // One player answered, they win the round
          const winnerId = answeredPlayers[0];
          const newPlayer1Score = winnerId === match.player1Id ? match.player1Score + 1 : match.player1Score;
          const newPlayer2Score = winnerId === match.player2Id ? match.player2Score + 1 : match.player2Score;
          
          await storage.updateMatch(match.id, {
            player1Score: newPlayer1Score,
            player2Score: newPlayer2Score
          });
        }
        // If neither answered, no one gets the point

        // Check for forfeit (2 missed rounds or 48h total)
        // This is simplified - you'd track missed rounds per player
        
        await this.revealTurn(match.id);
        matchesUpdated = true;
      }
    }
  }

  startBotAnswerProcessor() {
    // Bot answers are scheduled individually, no global processor needed
  }
}

export default new AsyncDuels();