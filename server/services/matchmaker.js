import { WebSocket } from "ws";
import { makeStealthBot } from "./stealthbot.js";
import { getQuestion } from "./qcoordinator.js";
import { storage } from "../storage.js";
import { getWeaknessTargetedQuestions, logTargeting } from "./weaknessTargeting.js";
import { updateWeeklyLadder } from "./weeklyLadder.js";
import { progressService } from "../progress.js";
import { getPoolManager } from "./questionPoolManager.js";

// North Star configuration: All modes use 5 questions
const MATCH_QUESTIONS = 5;

const queues = {
  'Civil Procedure': [],
  'Constitutional Law': [],
  'Contracts': [],
  'Criminal Law': [],
  'Evidence': [],
  'Property': [],
  'Torts': []
};

const activeMatches = new Map();
const playerAnswers = new Map();
const presence = new Map();

export function registerPresence(ws, payload) {
  const { username, profile } = payload;
  if (!username) return;
  
  presence.set(username.toLowerCase(), { ws, profile });
  ws.username = username;
  ws.profile = profile;
  
  console.log(`User ${username} joined presence`);
}

export function startMatchmaking(wss, ws, payload) {
  console.log('Matchmaking started for:', payload);
  const { subject } = payload;
  
  // Handle "Mixed Questions" directly - pick random subject
  let normalizedSubject = subject;
  if (subject === "Mixed Questions" || subject?.toLowerCase() === "mixed questions") {
    const subjects = Object.keys(queues);
    normalizedSubject = subjects[Math.floor(Math.random() * subjects.length)];
    console.log(`Subject "${subject}" normalized to "${normalizedSubject}"`);
  }
  
  const queue = queues[normalizedSubject];
  if (!queue) {
    console.log('Invalid normalized subject:', normalizedSubject);
    return;
  }

  console.log(`Queue for ${normalizedSubject} has ${queue.length} players`);

  // Try to match immediately
  const waitingPlayer = queue.shift();
  if (waitingPlayer && waitingPlayer.ws !== ws && waitingPlayer.ws.readyState === 1) {
    console.log('Found immediate match, starting duel');
    return startDuel(wss, normalizedSubject, waitingPlayer.ws, ws, { ranked: false, stake: 0 });
  }

  // Add to queue with timeout for stealth bot
  const entry = { ws, timeout: null };
  queue.push(entry);
  console.log(`Player added to ${normalizedSubject} queue. Queue size: ${queue.length}`);
  
  // Send queue confirmation to player
  if (ws.readyState === 1) {
    ws.send(JSON.stringify({ 
      type: 'queue:joined', 
      payload: { subject: normalizedSubject, position: queue.length } 
    }));
  }
  
  entry.timeout = setTimeout(() => {
    const idx = queue.indexOf(entry);
    if (idx >= 0) queue.splice(idx, 1);
    
    // Check if client is still connected before starting duel
    if (ws.readyState !== 1) {
      console.log('❌ Client disconnected during queue wait - aborting match');
      return;
    }
    
    console.log(`Starting match for player in ${normalizedSubject}`);
    
    // Spawn stealth bot
    const player = ws.profile || { level: 1, points: 0, avatarData: { base: 'shadow_goblin', palette: '#5865f2', props: [] } };
    const bot = makeStealthBot({ 
      subject: normalizedSubject, 
      targetLevel: player.level, 
      targetPoints: player.points 
    });
    
    startDuelWithBot(wss, normalizedSubject, ws, bot);
  }, 8000); // 8 second grace period
}

function startDuel(wss, subject, player1Ws, player2Ws, config) {
  const roomCode = `r_${Date.now().toString(36)}_${Math.random().toString(36).slice(2,6)}`;
  
  // Create match in storage
  storage.createMatch({
    roomCode,
    subject,
    player1Id: player1Ws.profile?.id || 'guest1',
    player2Id: player2Ws.profile?.id || 'guest2',
    status: 'active'
  });

  const matchData = {
    roomCode,
    subject,
    bestOf: 7,
    ranked: config.ranked,
    stake: config.stake,
    playerIndex: 0,  // Player 1 is at index 0
    opponent: {
      username: player2Ws.profile?.username || 'Anonymous',
      displayName: player2Ws.profile?.displayName || 'Anonymous',
      level: player2Ws.profile?.level || 1,
      points: player2Ws.profile?.points || 0,
      avatarData: player2Ws.profile?.avatarData || { base: 'humanoid', palette: '#5865f2', props: [] }
    }
  };

  // Send match start to both players
  if (player1Ws.readyState === 1) {
    player1Ws.send(JSON.stringify({ type: 'duel:start', payload: matchData }));
  }
  
  if (player2Ws.readyState === 1) {
    const player2MatchData = {
      ...matchData,
      playerIndex: 1,  // Player 2 is at index 1
      opponent: {
        username: player1Ws.profile?.username || 'Anonymous',
        displayName: player1Ws.profile?.displayName || 'Anonymous',
        level: player1Ws.profile?.level || 1,
        points: player1Ws.profile?.points || 0,
        avatarData: player1Ws.profile?.avatarData || { base: 'humanoid', palette: '#5865f2', props: [] }
      }
    };
    player2Ws.send(JSON.stringify({ type: 'duel:start', payload: player2MatchData }));
  }

  // Start the duel loop
  runDuel(wss, roomCode, [player1Ws, player2Ws], subject);
}

function startDuelWithBot(wss, subject, humanWs, bot) {
  const roomCode = `r_${Date.now().toString(36)}_${Math.random().toString(36).slice(2,6)}`;
  
  // Create match in storage
  storage.createMatch({
    roomCode,
    subject,
    player1Id: humanWs.profile?.id || 'guest',
    player2Id: bot.id,
    status: 'active'
  });

  const matchData = {
    roomCode,
    subject,
    bestOf: 5,  // Changed from 7 to 5 per North Star requirements
    ranked: false,
    stake: 0,
    playerIndex: 0,  // Human is always player 0 when playing against bot
    opponent: {
      username: bot.username,
      displayName: bot.username,
      level: bot.level,
      points: bot.points,
      avatarData: bot.avatarData
    }
  };

  if (humanWs.readyState === 1) {
    humanWs.send(JSON.stringify({ type: 'duel:start', payload: matchData }));
  }

  // Start duel with bot
  runDuelWithBot(wss, roomCode, humanWs, bot, subject);
}

async function runDuel(wss, roomCode, players, subject) {
  const match = {
    roomCode,
    players,
    subject,
    round: 0,
    difficulty: 1, // Start at difficulty 1
    scores: [0, 0],
    usedQuestions: [],
    seen: new Set() // fingerprints of stems served in THIS duel
  };

  // Get weakness targeting for both players (use first player for targeting)
  const player1Id = players[0].profile?.id || 'guest';
  const questionTargets = await getWeaknessTargetedQuestions(player1Id, subject, MATCH_QUESTIONS);
  logTargeting(player1Id, questionTargets);
  match.questionTargets = questionTargets;

  // Reserve questions from pool
  const poolManager = await getPoolManager();
  const reservedQuestions = await poolManager.reserveQuestions(
    player1Id,
    roomCode,
    subject,
    MATCH_QUESTIONS,
    questionTargets
  );
  match.reservedQuestions = reservedQuestions;

  activeMatches.set(roomCode, match);

  for (let round = 1; round <= MATCH_QUESTIONS; round++) {
    if (match.scores[0] >= Math.ceil(MATCH_QUESTIONS / 2) || match.scores[1] >= Math.ceil(MATCH_QUESTIONS / 2)) break;  // First to majority wins
    
    match.round = round;
    // Progressive difficulty: increases every 2 rounds (1-2=D1, 3-4=D2, 5-6=D3, 7=D4)
    match.difficulty = Math.min(Math.floor((round + 1) / 2), 4);
    
    try {
      // Use pre-reserved question from pool (no OpenAI call during duel)
      let question;
      if (match.reservedQuestions && match.reservedQuestions[round - 1]) {
        question = match.reservedQuestions[round - 1];
        console.log(`📈 Round ${round}: Using reserved question from pool`);
      } else {
        // Fallback to old method if pool is empty (shouldn't happen)
        console.warn('⚠️ No reserved questions, falling back to direct generation');
        const targetInfo = match.questionTargets ? match.questionTargets[round - 1] : null;
        const targetSubject = targetInfo?.subject || subject;
        const targetDifficulty = targetInfo?.difficulty || match.difficulty;
        question = await getQuestion(targetSubject, match.usedQuestions, true, targetDifficulty);
      }
      
      if (!question) {
        throw new Error("Could not get question from pool");
      }
      
      match.usedQuestions.push(question.id || question.qid);

      // Normalize choices to ensure proper display (no "A A" rendering)
      const normalizedChoices = Array.isArray(question.choices) 
        ? question.choices.map(choice => String(choice).replace(/^\s*[A-D][\)\].:\-]\s*/i, "").trim())
        : [];

      const questionData = {
        qid: question.id || question.qid,
        subject: question.subject, // Include subject from question, not user selection
        round,
        difficulty: match.difficulty, // Include difficulty level
        stem: question.stem,
        choices: normalizedChoices,
        timeLimit: 60000, // 60 seconds per user requirement
        timeLimitSec: 60, // Enforce 60s
        deadlineTs: Date.now() + 60000
      };

      players.forEach(ws => {
        if (ws.readyState === 1) {
          ws.send(JSON.stringify({ type: 'duel:question', payload: questionData }));
        }
      });

      // Wait for answers
      const answers = new Map();
      playerAnswers.set(roomCode, answers);
      
      await new Promise(resolve => {
        const timeout = setTimeout(resolve, 61000);
        
        const checkInterval = setInterval(() => {
          if (answers.size >= players.length) {
            clearTimeout(timeout);
            clearInterval(checkInterval);
            resolve();
          }
        }, 100);
      });

      // Process results
      const results = [];
      for (let i = 0; i < players.length; i++) {
        const ws = players[i];
        const answer = answers.get(ws) || { choice: -1, timeMs: 60000 };
        const correct = answer.choice === question.correctIndex;
        
        if (correct) match.scores[i]++;
        
        // Track subtopic progress for human players (not bots)
        // Get user ID from profile or fetch from database if not available
        let userId = ws.profile?.id;
        if (!userId && ws.username && !ws.isBot) {
          // Try to fetch user from database if profile not set
          try {
            const user = await storage.getUserByUsername(ws.username);
            if (user) {
              userId = user.id;
              // Set profile on WebSocket for future use
              if (!ws.profile) {
                ws.profile = {
                  id: user.id,
                  username: user.username,
                  displayName: user.displayName,
                  level: user.level,
                  points: user.points,
                  avatarData: user.avatarData
                };
              }
            }
          } catch (error) {
            console.error('Error fetching user for stats:', error);
          }
        }
        
        console.log(`🔍 VS Duel - Checking stats recording:`, {
          hasProfile: !!ws.profile,
          profileId: userId,
          username: ws.username,
          isBot: ws.isBot,
          subject: question.subject,
          questionId: question.qid
        });
        
        if (userId && !ws.isBot) {
          try {
            // Normalize subject name for statsService (expects full names like "Civil Procedure")
            const { normalizeSubject } = await import('./subjects.js');
            const normalizedSubjectForStats = normalizeSubject(question.subject);
            console.log(`🔍 VS Duel - Subject normalization:`, {
              original: question.subject,
              normalized: normalizedSubjectForStats
            });
            
            // Map short names to full names for statsService
            const subjectMap = {
              'Civ Pro': 'Civil Procedure',
              'Con Law': 'Constitutional Law',
              'Crim': 'Criminal Law/Procedure',
              'Property': 'Real Property',
            };
            const fullSubjectName = subjectMap[normalizedSubjectForStats] || normalizedSubjectForStats || question.subject;
            console.log(`🔍 VS Duel - Final subject name for stats:`, fullSubjectName);
            
            // Record comprehensive stats using statsService
            const { statsService } = await import('./statsService.js');
            const statsResult = await statsService.recordQuestionAttempt(
              userId,
              question.qid,
              fullSubjectName,
              answer.choice,
              question.correctIndex,
              correct,
              answer.timeMs,
              `difficulty_${match.difficulty}`,
              roomCode
            );
            
            // Also record subtopic progress using subtopicProgressService
            const { subtopicProgressService } = await import('./subtopicProgressService.ts');
            const subtopicResult = await subtopicProgressService.recordAttempt(
              userId,
              question.subject,
              question.stem || '',
              question.explanation || '',
              correct,
              `difficulty_${match.difficulty}`,
              answer.timeMs,
              roomCode,
              question.qid
            );
            
            // Also record in old progressService for compatibility
            const progressResult = await progressService.recordAttempt({
              userId: userId,
              duelId: roomCode,
              questionId: question.qid,
              subject: question.subject,
              subtopic: question.subtopic || question.subject,
              difficulty: match.difficulty,
              correct,
              msToAnswer: answer.timeMs,
              ts: Date.now()
            });
            
            // Store progress result for inclusion in response
            if (progressResult || subtopicResult) {
              ws.progressResult = progressResult || subtopicResult;
            }
            
            console.log(`📊 VS Duel Stats Updated:`, {
              userId: userId,
              originalSubject: question.subject,
              normalizedForStats: fullSubjectName,
              correct,
              xpGained: statsResult.xpGained,
              levelUp: statsResult.levelUp,
              masteryUp: statsResult.masteryUp,
              subtopicResult: subtopicResult ? {
                subject: subtopicResult.subject,
                subtopic: subtopicResult.subtopic,
                proficiencyBefore: subtopicResult.before,
                proficiencyAfter: subtopicResult.after
              } : null
            });
          } catch (error) {
            console.error('❌ Error recording stats and progress:', error);
            console.error('Error stack:', error.stack);
          }
        }
        
        results.push({
          playerId: i,
          choice: answer.choice,
          correct,
          timeMs: answer.timeMs
        });
      }

      console.log('🎯 Regular duel result - match.scores:', match.scores);
      console.log('🎯 Regular duel result - match.scores type:', typeof match.scores);
      console.log('🎯 Regular duel result - match.scores is array:', Array.isArray(match.scores));
      const scoresSlice = match.scores ? match.scores.slice() : [0, 0];
      console.log('🎯 Regular duel result - scoresSlice:', scoresSlice);
      const resultData = {
        qid: question.qid,
        round,
        correctIndex: question.correctIndex,
        explanation: question.explanation,
        results,
        scores: scoresSlice,
        subject: question.subject
      };
      console.log('🎯 Regular duel resultData being sent:', resultData);

      players.forEach(ws => {
        if (ws.readyState === 1) {
          // Include the progress result for this player
          const payload = { ...resultData };
          if (ws.progressResult) {
            payload.progressResult = ws.progressResult;
            delete ws.progressResult; // Clear for next round
          }
          console.log('🎯 Regular duel final payload being sent:', payload);
          ws.send(JSON.stringify({ type: 'duel:result', payload }));
        }
      });

      await new Promise(resolve => setTimeout(resolve, 3000));

      // Clean up answers for this round after processing results
      playerAnswers.delete(roomCode);

    } catch (error) {
      console.error('Error in duel round:', error);
      break;
    }
  }

  // End duel - determine winner based on who got more questions correct
  const winner = match.scores[0] > match.scores[1] ? 0 : 
                 match.scores[1] > match.scores[0] ? 1 : 
                 -1; // -1 for tie
  
  // Calculate XP changes - winner gains XP, loser loses XP
  const baseXP = 50; // Base XP for winning
  const player1 = await storage.getUser(players[0].profile?.id);
  const player2 = await storage.getUser(players[1].profile?.id);
  
  const currentXP1 = player1?.points || 1200;
  const currentXP2 = player2?.points || 1200;
  
  // Calculate XP changes based on winner/loser and score difference
  let xpChange1 = 0;
  let xpChange2 = 0;
  
  if (winner === 0) {
    // Player 1 wins
    xpChange1 = baseXP + (match.scores[0] * 10); // Bonus XP per correct answer
    xpChange2 = -Math.max(20, Math.floor(baseXP / 2)); // Loser loses XP
  } else if (winner === 1) {
    // Player 2 wins
    xpChange1 = -Math.max(20, Math.floor(baseXP / 2)); // Loser loses XP
    xpChange2 = baseXP + (match.scores[1] * 10); // Bonus XP per correct answer
  } else {
    // Tie - both get small XP bonus
    xpChange1 = 15;
    xpChange2 = 15;
  }
  
  // Update player XP and win/loss records
  if (player1) {
    const newXP1 = Math.max(0, currentXP1 + xpChange1); // Never go below 0
    const isWinner1 = winner === 0;
    const isLoser1 = winner === 1;
    
    await storage.updateUser(player1.id, { 
      points: newXP1,
      totalWins: isWinner1 ? (player1.totalWins || 0) + 1 : (player1.totalWins || 0),
      totalLosses: isLoser1 ? (player1.totalLosses || 0) + 1 : (player1.totalLosses || 0)
    });
    await updateWeeklyLadder(player1.id, xpChange1, isWinner1);
  }
  
  if (player2) {
    const newXP2 = Math.max(0, currentXP2 + xpChange2); // Never go below 0
    const isWinner2 = winner === 1;
    const isLoser2 = winner === 0;
    
    await storage.updateUser(player2.id, { 
      points: newXP2,
      totalWins: isWinner2 ? (player2.totalWins || 0) + 1 : (player2.totalWins || 0),
      totalLosses: isLoser2 ? (player2.totalLosses || 0) + 1 : (player2.totalLosses || 0)
    });
    await updateWeeklyLadder(player2.id, xpChange2, isWinner2);
  }
  
  const finalData = {
    winner,
    scores: match.scores,
    roomCode,
    xpChanges: {
      player1: xpChange1,
      player2: xpChange2
    },
    newXP: {
      player1: Math.max(0, currentXP1 + xpChange1),
      player2: Math.max(0, currentXP2 + xpChange2)
    },
    // Keep legacy fields for compatibility
    ratingChanges: {
      player1: xpChange1,
      player2: xpChange2
    },
    newRatings: {
      player1: Math.max(0, currentXP1 + xpChange1),
      player2: Math.max(0, currentXP2 + xpChange2)
    }
  };

  players.forEach((ws, idx) => {
    if (ws.readyState === 1) {
      const playerData = {
        ...finalData,
        yourRatingChange: idx === 0 ? ratingChange1 : ratingChange2,
        yourNewRating: idx === 0 ? rating1 + ratingChange1 : rating2 + ratingChange2
      };
      ws.send(JSON.stringify({ type: 'duel:end', payload: playerData }));
    }
  });

  // Clean up immediately after duel ends
  activeMatches.delete(roomCode);
  // playerAnswers already cleaned up after each round
}

async function runDuelWithBot(wss, roomCode, humanWs, bot, subject) {
  const match = {
    roomCode,
    humanWs,
    bot,
    subject,
    round: 0,
    difficulty: 1, // Start at difficulty 1
    scores: [0, 0],
    usedQuestions: [],
    seen: new Set() // fingerprints of stems served in THIS duel
  };

  // Get weakness targeting for the human player
  const playerId = humanWs.profile?.id || 'guest';
  const questionTargets = await getWeaknessTargetedQuestions(playerId, subject, MATCH_QUESTIONS);
  logTargeting(playerId, questionTargets);
  match.questionTargets = questionTargets;

  activeMatches.set(roomCode, match);

  for (let round = 1; round <= MATCH_QUESTIONS; round++) {
    if (match.scores[0] >= Math.ceil(MATCH_QUESTIONS / 2) || match.scores[1] >= Math.ceil(MATCH_QUESTIONS / 2)) break;  // First to majority wins
    
    match.round = round;
    // Progressive difficulty: increases every 2 rounds (1-2=D1, 3-4=D2, 5-6=D3, 7=D4)
    match.difficulty = Math.min(Math.floor((round + 1) / 2), 4);
    
    try {
      // Use weakness targeting for this round
      const targetInfo = match.questionTargets ? match.questionTargets[round - 1] : null;
      const targetSubject = targetInfo?.subject || subject;
      // Use adaptive difficulty from weakness targeting (based on user mastery)
      const targetDifficulty = targetInfo?.difficulty || match.difficulty;
      
      console.log(`📈 Bot Duel Round ${round}: Subject ${targetSubject}, Difficulty ${targetDifficulty}, Target: ${targetInfo?.type || 'normal'}`);
      // Try up to 4 times to get a fresh, valid, unseen question within this duel
      let question, err;
      for (let tries = 0; tries < 4; tries++) {
        question = await getQuestion(targetSubject, match.usedQuestions, true, targetDifficulty);
        
        // Check if we've seen this stem before in this duel
        const { fingerprintStem } = await import('./robustGenerator.js');
        const fp = fingerprintStem(question.stem);
        if (match.seen.has(fp)) {
          err = "Seen in this duel";
          continue;
        }
        
        // Success - mark as seen and break
        match.seen.add(fp);
        break;
      }
      
      if (!question) {
        throw new Error(err || "Could not get fresh question after 4 attempts");
      }
      
      match.usedQuestions.push(question.qid);

      // Normalize choices to ensure proper display (no "A A" rendering)
      const normalizedChoices = Array.isArray(question.choices) 
        ? question.choices.map(choice => String(choice).replace(/^\s*[A-D][\)\].:\-]\s*/i, "").trim())
        : [];

      const questionData = {
        qid: question.qid,
        subject: question.subject, // Include subject from question, not user selection
        round,
        difficulty: match.difficulty, // Include difficulty level
        stem: question.stem,
        choices: normalizedChoices,
        timeLimit: 60000, // 60 seconds per user requirement
        timeLimitSec: 60, // Enforce 60s
        deadlineTs: Date.now() + 60000
      };

      if (humanWs.readyState === 1) {
        humanWs.send(JSON.stringify({ type: 'duel:question', payload: questionData }));
      }

      // Wait for human answer and get bot decision
      const answers = new Map();
      playerAnswers.set(roomCode, answers);
      
      const botDecision = bot.decide(round, question.correctIndex);
      
      await new Promise(resolve => {
        const timeout = setTimeout(() => {
          console.log('⏰ Bot duel timeout - using default answer');
          resolve();
        }, 61000);
        
        const checkInterval = setInterval(() => {
          if (answers.size >= 1) {
            console.log('✅ Human answer received, processing...');
            clearTimeout(timeout);
            clearInterval(checkInterval);
            resolve();
          }
        }, 100);
      });

      // Process results - use actual human answer if available
      let humanAnswer = answers.get(humanWs);
      if (!humanAnswer) {
        console.log('❌ No human answer found, using timeout default');
        humanAnswer = { choice: -1, timeMs: 60000 };
      } else {
        console.log('✅ Using human answer:', humanAnswer);
      }
      const humanCorrect = humanAnswer.choice === question.correctIndex;
      const botCorrect = botDecision.idx === question.correctIndex;
      
      if (humanCorrect) match.scores[0]++;
      if (botCorrect) match.scores[1]++;
      
      console.log(`🎯 Bot Duel Round ${round} Results:`, {
        humanCorrect,
        botCorrect,
        humanAnswer: humanAnswer.choice,
        correctIndex: question.correctIndex,
        subject: question.subject,
        questionId: question.qid,
        hasStem: !!question.stem,
        hasExplanation: !!question.explanation,
        stemLength: question.stem?.length || 0,
        explanationLength: question.explanation?.length || 0
      });
      
      // Track subtopic progress for human player
      // Get user ID from profile or fetch from database if not available
      let userId = humanWs.profile?.id;
      if (!userId && humanWs.username) {
        // Try to fetch user from database if profile not set
        try {
          const user = await storage.getUserByUsername(humanWs.username);
          if (user) {
            userId = user.id;
            // Set profile on WebSocket for future use
            if (!humanWs.profile) {
              humanWs.profile = {
                id: user.id,
                username: user.username,
                displayName: user.displayName,
                level: user.level,
                points: user.points,
                avatarData: user.avatarData
              };
            }
          }
        } catch (error) {
          console.error('Error fetching user for stats:', error);
        }
      }
      
      console.log(`🔍 Bot Duel - Checking stats recording:`, {
        hasProfile: !!humanWs.profile,
        profileId: userId,
        username: humanWs.username,
        subject: question.subject,
        questionId: question.qid
      });
      
      if (userId) {
        try {
          // Normalize subject name for statsService (expects full names like "Civil Procedure")
          const { normalizeSubject } = await import('./subjects.js');
          const normalizedSubjectForStats = normalizeSubject(question.subject);
          console.log(`🔍 Bot Duel - Subject normalization:`, {
            original: question.subject,
            normalized: normalizedSubjectForStats
          });
          
          // Map short names to full names for statsService
          const subjectMap = {
            'Civ Pro': 'Civil Procedure',
            'Con Law': 'Constitutional Law',
            'Crim': 'Criminal Law/Procedure',
            'Property': 'Real Property',
          };
          const fullSubjectName = subjectMap[normalizedSubjectForStats] || normalizedSubjectForStats || question.subject;
          console.log(`🔍 Bot Duel - Final subject name for stats:`, fullSubjectName);
          
          // Record comprehensive stats using statsService
          const { statsService } = await import('./statsService.js');
          const statsResult = await statsService.recordQuestionAttempt(
            userId,
            question.qid,
            fullSubjectName,
            humanAnswer.choice,
            question.correctIndex,
            humanCorrect,
            humanAnswer.timeMs,
            `difficulty_${match.difficulty}`,
            roomCode
          );
          
          // Record subtopic progress using subtopicProgressService
          console.log(`📝 Calling subtopicProgressService.recordAttempt with:`, {
            userId,
            subject: question.subject,
            stemLength: question.stem?.length || 0,
            explanationLength: question.explanation?.length || 0,
            humanCorrect,
            difficulty: `difficulty_${match.difficulty}`,
            duelId: roomCode,
            questionId: question.qid
          });
          
          const { subtopicProgressService } = await import('./subtopicProgressService.ts');
          const subtopicResult = await subtopicProgressService.recordAttempt(
            userId,
            question.subject,
            question.stem || '',
            question.explanation || '',
            humanCorrect,
            `difficulty_${match.difficulty}`,
            humanAnswer.timeMs,
            roomCode,
            question.qid
          );
          
          console.log(`📝 subtopicProgressService.recordAttempt returned:`, subtopicResult ? {
            subject: subtopicResult.subject,
            subtopic: subtopicResult.subtopic,
            proficiencyBefore: subtopicResult.before,
            proficiencyAfter: subtopicResult.after
          } : null);
          
          // Also record in old progressService for compatibility
          const progressResult = await progressService.recordAttempt({
            userId: userId,
            duelId: roomCode,
            questionId: question.qid,
            subject: question.subject,
            subtopic: question.subtopic || question.subject,
            difficulty: match.difficulty,
            correct: humanCorrect,
            msToAnswer: humanAnswer.timeMs,
            ts: Date.now()
          });
          
          // Store progress result for inclusion in response
          // Prioritize subtopicResult (new service) over progressResult (old service)
          if (subtopicResult) {
            humanWs.progressResult = subtopicResult;
          } else if (progressResult) {
            humanWs.progressResult = progressResult;
          }
          
          console.log(`📊 Bot Duel Stats Updated:`, {
            userId: userId,
            originalSubject: question.subject,
            normalizedForStats: fullSubjectName,
            correct: humanCorrect,
            xpGained: statsResult?.xpGained,
            levelUp: statsResult?.levelUp,
            masteryUp: statsResult?.masteryUp,
            subtopicResult: subtopicResult ? {
              subject: subtopicResult.subject,
              subtopic: subtopicResult.subtopic,
              proficiencyBefore: subtopicResult.before,
              proficiencyAfter: subtopicResult.after
            } : null
          });
        } catch (error) {
          console.error('❌ Error recording subtopic progress:', error);
          console.error('Error stack:', error.stack);
        }
      }

      const results = [
        {
          playerId: 0,
          choice: humanAnswer.choice,
          correct: humanCorrect,
          timeMs: humanAnswer.timeMs
        },
        {
          playerId: 1,
          choice: botDecision.idx,
          correct: botCorrect,
          timeMs: botDecision.ansMs
        }
      ];

      console.log('🎯 Bot duel result - match.scores:', match.scores);
      console.log('🎯 Bot duel result - match.scores type:', typeof match.scores);
      console.log('🎯 Bot duel result - match.scores is array:', Array.isArray(match.scores));
      const scoresSlice = match.scores ? match.scores.slice() : [0, 0];
      console.log('🎯 Bot duel result - scoresSlice:', scoresSlice);
      const resultData = {
        qid: question.qid,
        round,
        correctIndex: question.correctIndex,
        explanation: question.explanation,
        results,
        scores: scoresSlice,
        subject: question.subject
      };
      console.log('🎯 Bot duel resultData being sent:', resultData);

      if (humanWs.readyState === 1) {
        const payload = { ...resultData };
        if (humanWs.progressResult) {
          payload.progressResult = humanWs.progressResult;
          delete humanWs.progressResult; // Clear for next round
        }
        console.log('🎯 Bot duel final payload being sent:', payload);
        humanWs.send(JSON.stringify({ type: 'duel:result', payload }));
      }

      await new Promise(resolve => setTimeout(resolve, 3000));

      // Clean up answers for this round after processing results
      playerAnswers.delete(roomCode);

    } catch (error) {
      console.error('Error in bot duel round:', error);
      break;
    }
  }

  // End duel - determine winner based on who got more questions correct
  const winner = match.scores[0] > match.scores[1] ? 0 : 
                 match.scores[1] > match.scores[0] ? 1 : 
                 -1; // -1 for tie
  
  // Calculate XP changes for human vs bot
  const baseXP = 50; // Base XP for winning
  // Get user ID - try profile first, then username lookup
  let userId = humanWs.profile?.id;
  if (!userId && humanWs.username) {
    try {
      const user = await storage.getUserByUsername(humanWs.username);
      if (user) userId = user.id;
    } catch (error) {
      console.error('Error fetching user by username:', error);
    }
  }
  
  const humanPlayer = userId ? await storage.getUser(userId) : null;
  const currentXP = humanPlayer?.points || 1200;
  
  // Calculate XP changes based on winner/loser
  let xpChange = 0;
  
  if (winner === 0) {
    // Human wins - gain XP based on correct answers
    xpChange = baseXP + (match.scores[0] * 10);
  } else if (winner === 1) {
    // Human loses - lose some XP
    xpChange = -Math.max(20, Math.floor(baseXP / 2));
  } else {
    // Tie - small XP bonus
    xpChange = 15;
  }
  
  // Update human player XP and weekly ladder
  const newXP = Math.max(0, currentXP + xpChange); // Never go below 0
  if (humanPlayer) {
    try {
      await storage.updateUserStats(
        humanPlayer.id,
        winner === 0, // won
        xpChange, // xpGained
        xpChange, // pointsChange
        undefined // streakData (optional)
      );
      await updateWeeklyLadder(humanPlayer.id, xpChange, winner === 0);
    } catch (error) {
      console.error('❌ Error updating user stats after duel:', error);
      // Don't crash - just log the error
    }
  }
  
  const finalData = {
    winner,
    scores: match.scores,
    roomCode,
    yourXPChange: xpChange,
    yourNewXP: newXP,
    // Keep legacy fields for compatibility
    yourRatingChange: xpChange,
    yourNewRating: newXP
  };

  if (humanWs.readyState === 1) {
    humanWs.send(JSON.stringify({ type: 'duel:end', payload: finalData }));
  }

  // Clean up immediately after duel ends
  activeMatches.delete(roomCode);
  // playerAnswers already cleaned up after each round
}

export function handleDuelAnswer(ws, payload) {
  const { roomCode, choice, timeMs } = payload;
  console.log('🎯 handleDuelAnswer called - roomCode:', roomCode, 'choice:', choice, 'timeMs:', timeMs);
  console.log('🎯 PlayerAnswers keys at answer time:', Array.from(playerAnswers.keys()));
  
  const answers = playerAnswers.get(roomCode);
  if (answers) {
    answers.set(ws, { choice, timeMs });
    console.log('🎯 Answer stored successfully for roomCode:', roomCode);
  } else {
    console.log('❌ No answers map found for roomCode:', roomCode, '- ignoring late answer');
    // Don't process late answers - duel has already ended
    return;
  }
}

export function handleHintRequest(ws, payload) {
  const { qid } = payload;
  ws.send(JSON.stringify({
    type: 'duel:hint',
    payload: {
      qid,
      hint: "Focus on the key legal principle being tested."
    }
  }));
}