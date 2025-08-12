import { WebSocket } from "ws";
import { makeStealthBot } from "./stealthbot.js";
import { getQuestion } from "./qcoordinator.js";
import { storage } from "../storage.js";

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
    
    console.log(`Starting bot match for player in ${normalizedSubject}`);
    
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
    usedQuestions: [],
    seen: new Set() // fingerprints of stems served in THIS duel
  };

  activeMatches.set(roomCode, match);

  for (let round = 1; round <= 7; round++) {
    if (match.scores[0] >= 4 || match.scores[1] >= 4) break;
    
    match.round = round;
    
    try {
      // Try up to 4 times to get a fresh, valid, unseen question within this duel
      let question, err;
      for (let tries = 0; tries < 4; tries++) {
        question = await getQuestion(subject, match.usedQuestions, true);
        
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
        stem: question.stem,
        choices: normalizedChoices,
        timeLimit: 60000, // Always 60 seconds for duels
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
        
        results.push({
          playerId: i,
          choice: answer.choice,
          correct,
          timeMs: answer.timeMs
        });
      }

      const resultData = {
        qid: question.qid,
        round,
        correctIndex: question.correctIndex,
        explanation: question.explanation,
        results,
        scores: match.scores.slice()
      };

      players.forEach(ws => {
        if (ws.readyState === 1) {
          ws.send(JSON.stringify({ type: 'duel:result', payload: resultData }));
        }
      });

      await new Promise(resolve => setTimeout(resolve, 3000));

    } catch (error) {
      console.error('Error in duel round:', error);
      break;
    }
  }

  // End duel
  const winner = match.scores[0] > match.scores[1] ? 0 : 1;
  const finalData = {
    winner,
    scores: match.scores,
    roomCode
  };

  players.forEach(ws => {
    if (ws.readyState === 1) {
      ws.send(JSON.stringify({ type: 'duel:end', payload: finalData }));
    }
  });

  activeMatches.delete(roomCode);
  playerAnswers.delete(roomCode);
}

async function runDuelWithBot(wss, roomCode, humanWs, bot, subject) {
  const match = {
    roomCode,
    humanWs,
    bot,
    subject,
    round: 0,
    scores: [0, 0],
    usedQuestions: [],
    seen: new Set() // fingerprints of stems served in THIS duel
  };

  activeMatches.set(roomCode, match);

  for (let round = 1; round <= 7; round++) {
    if (match.scores[0] >= 4 || match.scores[1] >= 4) break;
    
    match.round = round;
    
    try {
      // Try up to 4 times to get a fresh, valid, unseen question within this duel
      let question, err;
      for (let tries = 0; tries < 4; tries++) {
        question = await getQuestion(subject, match.usedQuestions, true);
        
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
        stem: question.stem,
        choices: normalizedChoices,
        timeLimit: 60000, // Always 60 seconds for duels
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
        const timeout = setTimeout(resolve, 61000);
        
        const checkInterval = setInterval(() => {
          if (answers.size >= 1) {
            clearTimeout(timeout);
            clearInterval(checkInterval);
            resolve();
          }
        }, 100);
      });

      // Process results
      const humanAnswer = answers.get(humanWs) || { choice: -1, timeMs: 60000 };
      const humanCorrect = humanAnswer.choice === question.correctIndex;
      const botCorrect = botDecision.idx === question.correctIndex;
      
      if (humanCorrect) match.scores[0]++;
      if (botCorrect) match.scores[1]++;

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

      const resultData = {
        qid: question.qid,
        round,
        correctIndex: question.correctIndex,
        explanation: question.explanation,
        results,
        scores: match.scores.slice()
      };

      if (humanWs.readyState === 1) {
        humanWs.send(JSON.stringify({ type: 'duel:result', payload: resultData }));
      }

      await new Promise(resolve => setTimeout(resolve, 3000));

    } catch (error) {
      console.error('Error in bot duel round:', error);
      break;
    }
  }

  // End duel
  const winner = match.scores[0] > match.scores[1] ? 0 : 1;
  const finalData = {
    winner,
    scores: match.scores,
    roomCode
  };

  if (humanWs.readyState === 1) {
    humanWs.send(JSON.stringify({ type: 'duel:end', payload: finalData }));
  }

  activeMatches.delete(roomCode);
  playerAnswers.delete(roomCode);
}

export function handleDuelAnswer(ws, payload) {
  const { roomCode, choice, timeMs } = payload;
  const answers = playerAnswers.get(roomCode);
  
  if (answers) {
    answers.set(ws, { choice, timeMs });
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