#!/usr/bin/env node

/**
 * Bug Test Suite for Law Duel
 * Tests key functionality after recent fixes
 */

import http from 'http';

// Test configuration
const BASE_URL = 'http://localhost:5000';
const TEST_USER = {
  username: 'testplayer' + Date.now(),
  displayName: 'Test Player',
  password: 'testpass123',
  confirmPassword: 'testpass123',
  email: 'test' + Date.now() + '@test.com'
};

// Colors for output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m'
};

// Helper to make HTTP requests
function makeRequest(options, data = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          resolve({
            status: res.statusCode,
            headers: res.headers,
            body: body ? JSON.parse(body) : null
          });
        } catch (e) {
          resolve({
            status: res.statusCode,
            headers: res.headers,
            body: body
          });
        }
      });
    });
    
    req.on('error', reject);
    
    if (data) {
      req.write(JSON.stringify(data));
    }
    req.end();
  });
}

// Test results tracking
const testResults = {
  passed: 0,
  failed: 0,
  tests: []
};

async function runTest(name, testFn) {
  process.stdout.write(`Testing ${name}... `);
  try {
    await testFn();
    console.log(`${colors.green}✓${colors.reset}`);
    testResults.passed++;
    testResults.tests.push({ name, status: 'passed' });
  } catch (error) {
    console.log(`${colors.red}✗${colors.reset}`);
    console.log(`  ${colors.red}Error: ${error.message}${colors.reset}`);
    testResults.failed++;
    testResults.tests.push({ name, status: 'failed', error: error.message });
  }
}

// Test Suite
async function runTests() {
  console.log(`${colors.blue}═══════════════════════════════════════${colors.reset}`);
  console.log(`${colors.blue}     Law Duel Bug Test Suite${colors.reset}`);
  console.log(`${colors.blue}═══════════════════════════════════════${colors.reset}\n`);

  let sessionCookie = null;
  let userId = null;

  // Test 1: Server Health
  await runTest('Server is running', async () => {
    const res = await makeRequest({
      hostname: 'localhost',
      port: 5000,
      path: '/api/health',
      method: 'GET'
    });
    
    if (res.status !== 200) {
      throw new Error(`Server returned status ${res.status}`);
    }
  });

  // Test 2: Registration
  await runTest('User registration', async () => {
    const res = await makeRequest({
      hostname: 'localhost',
      port: 5000,
      path: '/api/auth/register',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    }, TEST_USER);
    
    if (!res.body.ok) {
      throw new Error('Registration failed: ' + (res.body.error || 'Unknown error'));
    }
    
    if (res.headers['set-cookie']) {
      sessionCookie = res.headers['set-cookie'][0].split(';')[0];
    }
    
    userId = res.body.user?.id;
  });

  // Test 3: Authentication Check
  await runTest('Session persistence', async () => {
    if (!sessionCookie) {
      throw new Error('No session cookie from registration');
    }
    
    const res = await makeRequest({
      hostname: 'localhost',
      port: 5000,
      path: '/api/auth/me',
      method: 'GET',
      headers: {
        'Cookie': sessionCookie
      }
    });
    
    if (!res.body.ok) {
      throw new Error('Session not persisted');
    }
    
    if (res.body.user?.username !== TEST_USER.username) {
      throw new Error('Wrong user in session');
    }
  });

  // Test 4: Logout and Login
  await runTest('Logout and re-login', async () => {
    // Logout
    const logoutRes = await makeRequest({
      hostname: 'localhost',
      port: 5000,
      path: '/api/auth/logout',
      method: 'POST',
      headers: {
        'Cookie': sessionCookie
      }
    });
    
    if (!logoutRes.body.ok) {
      throw new Error('Logout failed');
    }
    
    // Login again
    const loginRes = await makeRequest({
      hostname: 'localhost',
      port: 5000,
      path: '/api/auth/login',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    }, {
      username: TEST_USER.username,
      password: TEST_USER.password
    });
    
    if (!loginRes.body.ok) {
      throw new Error('Re-login failed');
    }
    
    if (loginRes.headers['set-cookie']) {
      sessionCookie = loginRes.headers['set-cookie'][0].split(';')[0];
    }
  });

  // Test 5: Session Cookie Configuration
  await runTest('Session cookie security', async () => {
    const res = await makeRequest({
      hostname: 'localhost',
      port: 5000,
      path: '/api/debug/session',
      method: 'GET'
    });
    
    const config = res.body?.sessionConfig;
    if (!config) {
      throw new Error('Could not get session configuration');
    }
    
    // Check cookie settings
    if (!config.cookieSettings.httpOnly) {
      throw new Error('httpOnly not set on cookies');
    }
    
    if (config.cookieSettings.sameSite !== 'lax') {
      throw new Error(`sameSite is ${config.cookieSettings.sameSite}, expected 'lax'`);
    }
  });

  // Test 6: Leaderboard Access
  await runTest('Leaderboard endpoint', async () => {
    const res = await makeRequest({
      hostname: 'localhost',
      port: 5000,
      path: '/api/leaderboard',
      method: 'GET'
    });
    
    if (res.status !== 200) {
      throw new Error(`Leaderboard returned status ${res.status}`);
    }
    
    if (!Array.isArray(res.body)) {
      throw new Error('Leaderboard should return an array');
    }
  });

  // Test 7: Question Pool Status
  await runTest('Question pool availability', async () => {
    const res = await makeRequest({
      hostname: 'localhost',
      port: 5000,
      path: '/api/pool-status',
      method: 'GET',
      headers: {
        'Cookie': sessionCookie
      }
    });
    
    if (res.status !== 200) {
      throw new Error(`Pool status returned ${res.status}`);
    }
    
    if (typeof res.body?.totalQuestions !== 'number') {
      throw new Error('Pool status should return totalQuestions count');
    }
  });

  // Test 8: Daily Question
  await runTest('Daily question endpoint', async () => {
    const res = await makeRequest({
      hostname: 'localhost',
      port: 5000,
      path: '/api/daily-question',
      method: 'GET',
      headers: {
        'Cookie': sessionCookie
      }
    });
    
    if (res.status !== 200) {
      throw new Error(`Daily question returned status ${res.status}`);
    }
    
    if (!res.body?.question) {
      throw new Error('Should return a daily question');
    }
  });

  // Test 9: Database Connection
  await runTest('Database connectivity', async () => {
    const res = await makeRequest({
      hostname: 'localhost',
      port: 5000,
      path: '/api/health',
      method: 'GET'
    });
    
    // Simple check - if we can register users, DB is working
    if (res.status !== 200) {
      throw new Error('Database may not be connected properly');
    }
  });

  // Test 10: WebSocket Connectivity (basic check)
  await runTest('WebSocket endpoint exists', async () => {
    // We can't fully test WebSocket from here, but check the upgrade would work
    const res = await makeRequest({
      hostname: 'localhost',
      port: 5000,
      path: '/ws',
      method: 'GET',
      headers: {
        'Upgrade': 'websocket',
        'Connection': 'Upgrade',
        'Sec-WebSocket-Key': 'dGhlIHNhbXBsZSBub25jZQ==',
        'Sec-WebSocket-Version': '13'
      }
    });
    
    // Server should respond with upgrade or at least not 404
    if (res.status === 404) {
      throw new Error('WebSocket endpoint not found');
    }
  });

  // Print summary
  console.log(`\n${colors.blue}═══════════════════════════════════════${colors.reset}`);
  console.log(`${colors.blue}            Test Summary${colors.reset}`);
  console.log(`${colors.blue}═══════════════════════════════════════${colors.reset}`);
  
  console.log(`\n${colors.green}Passed: ${testResults.passed}${colors.reset}`);
  console.log(`${colors.red}Failed: ${testResults.failed}${colors.reset}`);
  
  if (testResults.failed > 0) {
    console.log(`\n${colors.yellow}Failed Tests:${colors.reset}`);
    testResults.tests
      .filter(t => t.status === 'failed')
      .forEach(t => {
        console.log(`  ${colors.red}✗ ${t.name}${colors.reset}`);
        console.log(`    ${t.error}`);
      });
  }
  
  // Return exit code
  process.exit(testResults.failed > 0 ? 1 : 0);
}

// Run tests
runTests().catch(error => {
  console.error(`${colors.red}Test suite failed to run: ${error.message}${colors.reset}`);
  process.exit(1);
});