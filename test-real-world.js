#!/usr/bin/env node

const BASE_URL = 'http://localhost:5000';

async function loginUser(username, password) {
  console.log(`\n🔐 Logging in as ${username}...`);
  
  const loginResponse = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ username, password }),
  });
  
  const loginData = await loginResponse.json();
  
  if (!loginData.ok) {
    console.error('❌ Login failed:', loginData.error);
    return null;
  }
  
  // Extract session cookie from response
  const setCookieHeader = loginResponse.headers.get('set-cookie');
  const sessionCookie = setCookieHeader ? setCookieHeader.split(';')[0] : null;
  
  console.log('✅ Logged in successfully');
  return { sessionCookie, token: loginData.token, user: loginData.user };
}

async function testRealWorldQuestion(auth, subject, questionType) {
  console.log(`\n🎯 Testing ${questionType} question for ${subject}...`);
  
  const headers = {
    'Content-Type': 'application/json',
  };
  
  // Always use token for reliability
  if (auth.token) {
    headers['Authorization'] = `Bearer ${auth.token}`;
  }
  
  // Also include cookie if available  
  if (auth.sessionCookie) {
    headers['Cookie'] = auth.sessionCookie;
  }
  
  const response = await fetch(`${BASE_URL}/api/solo/start`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      subject,
      difficulty: 1,
      questionType
    }),
  });
  
  // Check if response is JSON
  const contentType = response.headers.get('content-type');
  if (!contentType || !contentType.includes('application/json')) {
    console.error('❌ Unexpected response type:', contentType);
    console.error('Response status:', response.status);
    const text = await response.text();
    console.error('Response preview:', text.substring(0, 200));
    return null;
  }
  
  const data = await response.json();
  
  if (!data.ok) {
    console.error('❌ Failed to start solo challenge:', data.error);
    return;
  }
  
  console.log('\n✅ Solo challenge started successfully!');
  console.log('📚 Challenge ID:', data.challengeId);
  console.log('📝 Question Type:', questionType);
  console.log('🎯 Subject:', subject);
  console.log('\n🤔 Question:', data.question.stem);
  console.log('\n📋 Choices:');
  data.question.choices.forEach((choice, index) => {
    console.log(`  ${index + 1}. ${choice}`);
  });
  
  return data;
}

async function registerUser(username, password, email) {
  console.log(`\n📝 Registering new user ${username}...`);
  
  const response = await fetch(`${BASE_URL}/api/auth/register`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ 
      username, 
      password, 
      confirmPassword: password,
      displayName: username,
      email 
    }),
  });
  
  const data = await response.json();
  
  if (!data.ok) {
    console.error('❌ Registration failed:', data.error);
    return null;
  }
  
  // Extract session cookie from response
  const setCookieHeader = response.headers.get('set-cookie');
  const sessionCookie = setCookieHeader ? setCookieHeader.split(';')[0] : null;
  
  console.log('✅ Registered successfully');
  return { sessionCookie, token: data.token, user: data.user };
}

async function main() {
  try {
    // Generate unique test user
    const timestamp = Date.now();
    const testUsername = `testuser_${timestamp}`;
    const testEmail = `test_${timestamp}@example.com`;
    
    // Register new test user
    let auth = await registerUser(testUsername, 'testpass123', testEmail);
    
    // If registration fails, try logging in
    if (!auth) {
      console.log('🔄 Trying to login instead...');
      auth = await loginUser(testUsername, 'testpass123');
    }
    
    if (!auth) {
      console.error('❌ Authentication failed, cannot proceed with tests');
      process.exit(1);
    }
    
    // Test Bar Exam question
    console.log('\n=== Testing Bar Exam Question ===');
    await testRealWorldQuestion(auth, 'Criminal Law', 'bar-exam');
    
    // Wait a bit between requests
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Test Real-World Law question
    console.log('\n=== Testing Real-World Law Question ===');
    await testRealWorldQuestion(auth, 'Criminal Law', 'real-world');
    
    console.log('\n✅ All tests completed successfully!');
  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

main();