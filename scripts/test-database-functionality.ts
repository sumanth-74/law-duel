import { storage } from '../server/storage.js';
import { soloChallengeService } from '../server/services/soloChallengeService.js';
import { atticusDuelService } from '../server/services/atticusDuelService.js';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function testDatabaseFunctionality() {
  console.log('🧪 Testing database functionality...\n');

  try {
    // Test 1: User creation and retrieval
    console.log('1️⃣ Testing user operations...');
    const randomId = Math.random().toString(36).substr(2, 9);
    const testUser = {
      username: `testuser_${randomId}`,
      displayName: 'Test User',
      password: 'testpassword',
      email: `test_${randomId}@example.com`,
      avatarData: { backgroundColor: '#4F46E5', style: 'casual' }
    };

    const user = await storage.createUser(testUser);
    console.log(`✅ Created user: ${user.username} (ID: ${user.id})`);

    // Test 2: Solo Challenge operations
    console.log('\n2️⃣ Testing solo challenge operations...');
    
    const challenge = await storage.createSoloChallenge({
      id: `solo_${user.id}_${Date.now()}`,
      userId: user.id,
      subject: 'Contracts',
      questionType: 'bar-exam',
      livesRemaining: 3,
      round: 1,
      score: 0,
      difficulty: 1,
      currentQuestionId: 'test_question_123'
    });
    
    console.log(`✅ Created solo challenge: ${challenge.id}`);
    
    // Update challenge
    const updatedChallenge = await storage.updateSoloChallenge(challenge.id, {
      livesRemaining: 2,
      score: 50
    });
    console.log(`✅ Updated challenge - Lives: ${updatedChallenge?.livesRemaining}, Score: ${updatedChallenge?.score}`);

    // Get user challenges
    const userChallenges = await storage.getUserSoloChallenges(user.id);
    console.log(`✅ Retrieved ${userChallenges.length} challenges for user`);

    // Test 3: Atticus Duel operations
    console.log('\n3️⃣ Testing Atticus duel operations...');
    
    const duel = await storage.createAtticusDuel({
      id: `atticus_${user.id}_${Date.now()}`,
      userId: user.id,
      challengeId: challenge.id,
      result: null,
      playerScore: 0,
      atticusScore: 0,
      round: 1,
      status: 'active',
      questions: [],
      currentQuestion: { question: 'Test question', correctAnswer: 1 }
    });
    
    console.log(`✅ Created Atticus duel: ${duel.id}`);
    
    // Test getting active duel
    const activeDuel = await storage.getUserActiveAtticusDuel(user.id);
    console.log(`✅ Retrieved active duel: ${activeDuel?.id === duel.id ? 'MATCH' : 'NO MATCH'}`);
    
    // Complete the duel
    await storage.updateAtticusDuel(duel.id, {
      status: 'completed',
      result: 'win',
      playerScore: 250,
      atticusScore: 200,
      completedAt: new Date()
    });
    console.log(`✅ Completed Atticus duel with win result`);

    // Test 4: Leaderboard operations
    console.log('\n4️⃣ Testing leaderboard operations...');
    
    await storage.upsertLeaderboardEntry({
      userId: user.id,
      username: user.username,
      displayName: user.displayName,
      points: 350,
      level: 5,
      avatarData: user.avatarData,
      isBot: false,
      lastActivity: new Date()
    });
    console.log(`✅ Added user to leaderboard`);
    
    const leaderboard = await storage.getLeaderboard(5);
    console.log(`✅ Retrieved leaderboard with ${leaderboard.length} entries`);
    
    const userEntry = leaderboard.find(entry => entry.userId === user.id);
    console.log(`✅ User in leaderboard: ${userEntry ? 'YES' : 'NO'}`);

    // Test 5: Service integration
    console.log('\n5️⃣ Testing service integration...');
    
    // Test solo challenge service
    const challengeStatus = await soloChallengeService.getChallengeStatus(user.id);
    console.log(`✅ Solo challenge status: ${JSON.stringify(challengeStatus)}`);
    
    // Test Atticus duel service
    const duelStatus = await atticusDuelService.getDuelStatus(user.id);
    console.log(`✅ Atticus duel status: ${JSON.stringify(duelStatus)}`);

    // Test 6: Clean up
    console.log('\n6️⃣ Testing cleanup...');
    
    await storage.deleteSoloChallenge(challenge.id);
    console.log(`✅ Deleted solo challenge`);
    
    console.log('\n🎉 All database tests passed successfully!');
    
    return {
      success: true,
      userId: user.id,
      challengeId: challenge.id,
      duelId: duel.id
    };

  } catch (error) {
    console.error('❌ Test failed:', error);
    throw error;
  }
}

async function main() {
  try {
    const result = await testDatabaseFunctionality();
    console.log('\n✅ Database functionality test completed successfully!');
    console.log('📊 Test Results:', result);
  } catch (error) {
    console.error('\n❌ Database functionality test failed:', error);
    process.exit(1);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
