import { makeStealthBot } from './stealthbot.js';
import { generateQuestion } from '../ai.js';
import { storage } from '../storage.js';
import { getQuestion } from './qcoordinator.js';

const presence = new Map();
const queues = Object.create(null);
const activeMatches = new Map();
const playerAnswers = new Map(); // Track player answers by match ID

const SUBJECTS = ["Evidence","Contracts","Torts","Property","Civil Procedure","Constitutional Law","Criminal Law/Procedure"];
SUBJECTS.forEach(s => queues[s] = []);

// Fallback question function
function getFallbackQuestion(subject) {
  const fallbacks = {
    "Evidence": {
      stem: "Under Federal Rule of Evidence 403, evidence may be excluded if its probative value is substantially outweighed by what?",
      choices: ["Any prejudicial effect", "The danger of unfair prejudice", "Confusion of the issues", "Misleading the jury"],
      correctIndex: 1,
      explanation: "FRE 403 allows exclusion when probative value is substantially outweighed by the danger of unfair prejudice."
    },
    "Contracts": {
      stem: "What is required for a valid offer under common law contract formation?",
      choices: ["Present intent to contract", "Definite and certain terms", "Communication to offeree", "All of the above"],
      correctIndex: 3,
      explanation: "A valid offer requires present intent, definite terms, and communication to the offeree."
    }
  };
  const fallback = fallbacks[subject] || fallbacks["Evidence"];
  return {
    qid: `fallback_${subject}_${Date.now()}`,
    stem: fallback.stem,
    choices: fallback.choices,
    correctIndex: fallback.correctIndex,
    explanation: fallback.explanation,
    timeLimit: 60000,
    deadlineTs: Date.now() + 60000
  };
}

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
  const queue = queues[subject];
  if (!queue) {
    console.log('Invalid subject:', subject);
    return;
  }

  console.log(`Queue for ${subject} has ${queue.length} players`);

  // Try to match immediately
  const waitingPlayer = queue.shift();
  if (waitingPlayer && waitingPlayer.ws !== ws && waitingPlayer.ws.readyState === 1) {
    console.log('Found immediate match, starting duel');
    return startDuel(wss, subject, waitingPlayer.ws, ws, { ranked: false, stake: 0 });
  }

  // Add to queue with timeout for stealth bot
  const entry = { ws, timeout: null };
  queue.push(entry);
  console.log(`Player added to ${subject} queue. Queue size: ${queue.length}`);
  
  // Send queue confirmation to player
  if (ws.readyState === 1) {
    ws.send(JSON.stringify({ 
      type: 'queue:joined', 
      payload: { subject, position: queue.length } 
    }));
  }
  
  entry.timeout = setTimeout(() => {
    const idx = queue.indexOf(entry);
    if (idx >= 0) queue.splice(idx, 1);
    
    console.log(`Starting bot match for player in ${subject}`);
    
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
      const question = await getQuestion(subject, match.usedQuestions, true); // Force new OpenAI questions for duels
      match.usedQuestions.push(question.qid);

      // Send question to all players
      const questionData = {
        qid: question.qid,
        round,
        stem: question.stem,
        choices: question.choices,
        timeLimit: question.timeLimit || 60000, // Ensure 60 seconds
        deadlineTs: question.deadlineTs || (Date.now() + 60000),
        showTrainingBanner: useTrainingBanner
      };

      console.log(`Question data timeLimit: ${questionData.timeLimit}ms`);

      players.forEach(ws => {
        if (ws.readyState === 1) {
          ws.send(JSON.stringify({ type: 'duel:question', payload: questionData }));
        }
      });

      // Wait for answers or timeout with proper answer collection
      const answers = new Map();
      playerAnswers.set(roomCode, answers);
      
      await new Promise(resolve => {
        const timeout = setTimeout(resolve, 61000);
        
        // Check for all answers periodically
        const checkInterval = setInterval(() => {
          if (answers.size >= players.length) {
            clearTimeout(timeout);
            clearInterval(checkInterval);
            resolve();
          }
        }, 100);
      });
      
      // Process round results with actual player answers
      const roundAnswers = playerAnswers.get(roomCode) || new Map();
      const results = {
        qid: question.qid,
        correctIndex: question.correctIndex,
        explanation: question.explanation,
        results: [],
        scores: { player1: match.scores[0], player2: match.scores[1] }
      };
      
      // Process each player's answer
      players.forEach((ws, index) => {
        const playerId = ws.profile?.id || `player${index + 1}`;
        const answer = roundAnswers.get(playerId);
        
        if (answer) {
          const correct = answer.selectedIndex === question.correctIndex;
          if (correct) {
            match.scores[index]++;
          }
          
          results.results.push({
            playerId,
            selectedIndex: answer.selectedIndex,
            timeMs: answer.timeMs,
            correct
          });
        }
      });
      
      results.scores = { player1: match.scores[0], player2: match.scores[1] };
      playerAnswers.delete(roomCode);

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
  console.log(`Starting duel ${roomCode} - Human WS state: ${humanWs.readyState}`);
  
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
  
  // Give client time to set up duel connection
  console.log('Waiting 2 seconds for client to establish duel connection...');
  await new Promise(resolve => setTimeout(resolve, 2000));

  for (let round = 1; round <= 7; round++) {
    if (match.scores[0] >= 4 || match.scores[1] >= 4) break;
    
    match.round = round;
    
    try {
      console.log(`Generating fresh OpenAI question for round ${round} in ${subject}`);
      
      // Use coordinated question system to ensure fresh OpenAI questions
      const question = await getQuestion(subject, match.usedQuestions, true); // Force new OpenAI questions for bot duels
      console.log(`Fresh question generated: "${question.stem.substring(0, 50)}..."`);
      
      let useTrainingBanner = false;
      
      match.usedQuestions.push(question.qid);

      const questionData = {
        qid: question.qid,
        round,
        stem: question.stem,
        choices: question.choices,
        timeLimit: question.timeLimit || 60000, // Ensure 60 seconds for bot duels
        deadlineTs: question.deadlineTs || (Date.now() + 60000),
        showTrainingBanner: useTrainingBanner
      };

      console.log(`Bot duel question timeLimit: ${questionData.timeLimit}ms`);
      console.log(`Generated question object timeLimit: ${question.timeLimit}ms`);

      console.log(`Broadcasting question to human player for round ${round}`);
      console.log(`Question: "${question.stem.substring(0, 60)}..."`);

      // Broadcast to all connected clients for this room
      console.log('Broadcasting question to all clients...');
      let questionSent = false;
      
      wss.clients.forEach(client => {
        if (client.readyState === 1) {
          const questionMessage = JSON.stringify({ type: 'duel:question', payload: questionData });
          client.send(questionMessage);
          questionSent = true;
          console.log('Question broadcast to connected client');
        }
      });
      
      if (!questionSent) {
        console.error('No active WebSocket connections found');
        break;
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

      // Wait for human answer or timeout
      const humanAnswerMap = new Map();
      playerAnswers.set(roomCode, humanAnswerMap);
      
      await new Promise(resolve => {
        const timeout = setTimeout(resolve, 61000);
        
        const checkInterval = setInterval(() => {
          const playerId = humanWs.profile?.id || 'human';
          if (humanAnswerMap.has(playerId)) {
            clearTimeout(timeout);
            clearInterval(checkInterval);
            resolve();
          }
        }, 100);
      });
      
      // Process results with both human and bot answers
      const roundAnswers = playerAnswers.get(roomCode) || new Map();
      const humanPlayerId = humanWs.profile?.id || 'human';
      const humanAnswer = roundAnswers.get(humanPlayerId);
      
      // Score human answer if provided
      if (humanAnswer && humanAnswer.selectedIndex === question.correctIndex) {
        match.scores[0]++;
      }
      
      // Score bot answer
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
      
      // Add human result if they answered
      if (humanAnswer) {
        results.results.unshift({
          playerId: humanPlayerId,
          selectedIndex: humanAnswer.selectedIndex,
          timeMs: humanAnswer.timeMs,
          correct: humanAnswer.selectedIndex === question.correctIndex
        });
      }
      
      playerAnswers.delete(roomCode);

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

export function handleDuelAnswer(wss, ws, payload) {
  const { qid, selectedIndex, timeMs } = payload;
  const playerId = ws.profile?.id || ws.username || 'anonymous';
  
  // Find the match this player is in
  for (const [roomCode, match] of activeMatches) {
    if ((match.players && match.players.includes(ws)) || 
        (match.humanWs && match.humanWs === ws)) {
      
      const answers = playerAnswers.get(roomCode);
      if (answers) {
        answers.set(playerId, {
          qid,
          selectedIndex,
          timeMs: timeMs || Date.now(),
          timestamp: Date.now()
        });
        
        console.log(`Player ${playerId} answered question ${qid} in match ${roomCode}`);
      }
      break;
    }
  }
}

export function handleHintRequest(wss, ws, payload) {
  // Implementation for hint requests can be added later
  console.log('Hint request received:', payload);
}
