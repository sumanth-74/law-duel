// Test the complete authentication flow
const puppeteer = require('puppeteer');

async function testAuthFlow() {
  console.log('Testing authentication flow...');
  
  // Test backend directly first
  const loginResponse = await fetch('http://localhost:5000/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'debuguser', password: 'test123' })
  });
  
  if (!loginResponse.ok) {
    console.error('❌ Backend login failed');
    return;
  }
  
  const setCookie = loginResponse.headers.get('set-cookie');
  console.log('✅ Backend login successful');
  console.log('Cookie:', setCookie ? setCookie.substring(0, 50) + '...' : 'None');
  
  // Extract session cookie
  const sessionId = setCookie?.match(/connect\.sid=([^;]+)/)?.[1];
  if (!sessionId) {
    console.error('❌ No session cookie received');
    return;
  }
  
  // Test auth check with cookie
  const authResponse = await fetch('http://localhost:5000/api/auth/me', {
    headers: {
      'Cookie': `connect.sid=${sessionId}`
    }
  });
  
  if (authResponse.ok) {
    const user = await authResponse.json();
    console.log('✅ Auth check successful:', user.username);
    console.log('\n✅ AUTHENTICATION IS WORKING!');
    console.log('The backend is fully functional. Frontend should work after page reload.');
  } else {
    console.error('❌ Auth check failed');
  }
}

testAuthFlow().catch(console.error);