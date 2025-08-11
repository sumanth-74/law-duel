import { makeStealthBot } from './stealthbot.js';
import { getQuestion } from './qcoordinator.js';
import { storage } from '../storage.js';

const presence = new Map();
const queues = Object.create(null);
const activeMatches = new Map();

const SUBJECTS = ["Evidence","Contracts","Torts","Property","Civil Procedure","Constitutional Law","Criminal Law/Procedure"];
SUBJECTS.forEach(s => queues[s] = []);

export function registerPresence(ws, payload) {
  const { username, profile } = payload;
  if (!username) return;
  
  presence.set(username.toLowerCase(), { ws, profile });
  ws.username = username;
  ws.profile = profile;
  
  console.log(`User ${username} joined presence`);
}

export function startMatchmaking(wss, ws, payload) {
  const { subject } = payload;
  const queue = queues[subject];
  if (!queue) return;

  // Try to match immediately
  const waitingPlayer = queue.shift();
  if (waitingPlayer && waitingPlayer.ws !== ws && waitingPlayer.ws.readyState === 1) {
    return startDuel(wss, subject, waitingPlayer.ws, ws, { ranked: false, stake: 0 });
  }

  // Add to queue with timeout for stealth bot
  const entry = { ws, timeout: null };
  queue.push(entry);
  
  entry.timeout = setTimeout(() => {
    const idx = queue.indexOf(entry);
    if (idx >= 0) queue.splice(idx, 1);
    
    // Spawn stealth bot
    const player = ws.profile || { level: 1, points: 0, avatarData: { base: 'shadow_goblin', palette: '#5865f2', props: [] } };
    const bot = makeStealthBot({ 
      subject, 
      targetLevel: player.level, 
      targetPoints: player.points 
    });
    
    startDuelWithBot(wss, subject, ws, bot);
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
    bestOf: 7,
    ranked: false,
    stake: 0,
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
    scores: [0, 0],
    usedQuestions: []
  };

  activeMatches.set(roomCode, match);

  for (let round = 1; round <= 7; round++) {
    if (match.scores[0] >= 4 || match.scores[1] >= 4) break;
    
    match.round = round;
    
    try {
      const question = await getQuestion(subject, match.usedQuestions);
      match.usedQuestions.push(question.qid);

      // Send question to all players
      const questionData = {
        qid: question.qid,
        round,
        stem: question.stem,
        choices: question.choices,
        timeLimit: question.timeLimit,
        deadlineTs: question.deadlineTs
      };

      players.forEach(ws => {
        if (ws.readyState === 1) {
          ws.send(JSON.stringify({ type: 'duel:question', payload: questionData }));
        }
      });

      // Wait for answers or timeout
      await new Promise(resolve => setTimeout(resolve, 21000));
      
      // Process round results (simplified)
      const results = {
        qid: question.qid,
        correctIndex: question.correctIndex,
        explanation: question.explanation,
        results: [],
        scores: { player1: match.scores[0], player2: match.scores[1] }
      };

      players.forEach(ws => {
        if (ws.readyState === 1) {
          ws.send(JSON.stringify({ type: 'duel:result', payload: results }));
        }
      });

    } catch (error) {
      console.error('Duel round error:', error);
    }
  }

  // Determine winner and clean up
  const winnerId = match.scores[0] > match.scores[1] ? 0 : 1;
  
  const finishedData = {
    winnerId: players[winnerId]?.profile?.id || `player${winnerId + 1}`,
    finalScores: { player1: match.scores[0], player2: match.scores[1] },
    pointChanges: { player1: winnerId === 0 ? 25 : -25, player2: winnerId === 1 ? 25 : -25 },
    xpGained: { player1: match.scores[0] * 10, player2: match.scores[1] * 10 }
  };

  players.forEach(ws => {
    if (ws.readyState === 1) {
      ws.send(JSON.stringify({ type: 'duel:finished', payload: finishedData }));
    }
  });

  activeMatches.delete(roomCode);
}

async function runDuelWithBot(wss, roomCode, humanWs, bot, subject) {
  const match = {
    roomCode,
    humanWs,
    bot,
    subject,
    round: 0,
    scores: [0, 0], // [human, bot]
    usedQuestions: []
  };

  activeMatches.set(roomCode, match);

  for (let round = 1; round <= 7; round++) {
    if (match.scores[0] >= 4 || match.scores[1] >= 4) break;
    
    match.round = round;
    
    try {
      const question = await getQuestion(subject, match.usedQuestions);
      match.usedQuestions.push(question.qid);

      const questionData = {
        qid: question.qid,
        round,
        stem: question.stem,
        choices: question.choices,
        timeLimit: question.timeLimit,
        deadlineTs: question.deadlineTs
      };

      // Send to human
      if (humanWs.readyState === 1) {
        humanWs.send(JSON.stringify({ type: 'duel:question', payload: questionData }));
      }

      // Schedule bot answer
      const botDecision = bot.decide(round, question.correctIndex);
      setTimeout(() => {
        // Simulate bot answer
        const botAnswer = {
          qid: question.qid,
          idx: botDecision.idx,
          ms: botDecision.ansMs,
          opponentId: bot.id
        };
        
        if (humanWs.readyState === 1) {
          humanWs.send(JSON.stringify({ type: 'duel:botAnswer', payload: botAnswer }));
        }
      }, botDecision.ansMs);

      // Wait for round completion
      await new Promise(resolve => setTimeout(resolve, 21000));
      
      // Process results (simplified - bot gets its decision result)
      if (botDecision.idx === question.correctIndex) {
        match.scores[1]++;
      }

      const results = {
        qid: question.qid,
        correctIndex: question.correctIndex,
        explanation: question.explanation,
        results: [
          {
            playerId: bot.id,
            selectedIndex: botDecision.idx,
            timeMs: botDecision.ansMs,
            correct: botDecision.idx === question.correctIndex
          }
        ],
        scores: { player1: match.scores[0], player2: match.scores[1] }
      };

      if (humanWs.readyState === 1) {
        humanWs.send(JSON.stringify({ type: 'duel:result', payload: results }));
      }

    } catch (error) {
      console.error('Duel with bot round error:', error);
    }
  }

  // Finish match
  const winnerId = match.scores[0] > match.scores[1] ? humanWs.profile?.id : bot.id;
  const humanWon = match.scores[0] > match.scores[1];
  
  const finishedData = {
    winnerId,
    finalScores: { player1: match.scores[0], player2: match.scores[1] },
    pointChanges: { player1: humanWon ? 25 : -25, player2: humanWon ? -25 : 25 },
    xpGained: { player1: match.scores[0] * 10, player2: match.scores[1] * 10 }
  };

  if (humanWs.readyState === 1) {
    humanWs.send(JSON.stringify({ type: 'duel:finished', payload: finishedData }));
  }

  activeMatches.delete(roomCode);
}
