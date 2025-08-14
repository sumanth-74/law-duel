// Integration test for authentication
async function testAuth() {
  console.log('=== Testing Law Duel Authentication ===\n');
  
  // 1. Test Login
  console.log('1. Testing login endpoint...');
  const loginRes = await fetch('http://localhost:5000/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'debuguser', password: 'test123' })
  });
  
  if (!loginRes.ok) {
    console.error('❌ Login failed:', await loginRes.text());
    return;
  }
  
  const user = await loginRes.json();
  console.log('✅ Login successful! User:', user.username);
  
  // Get the cookie
  const cookie = loginRes.headers.get('set-cookie');
  if (!cookie) {
    console.error('❌ No session cookie received');
    return;
  }
  
  console.log('✅ Session cookie received');
  
  // 2. Test Auth Check
  console.log('\n2. Testing authentication check...');
  const sessionId = cookie.match(/connect\.sid=([^;]+)/)?.[1];
  
  const authRes = await fetch('http://localhost:5000/api/auth/me', {
    headers: { 'Cookie': `connect.sid=${sessionId}` }
  });
  
  if (!authRes.ok) {
    console.error('❌ Auth check failed');
    return;
  }
  
  const authUser = await authRes.json();
  console.log('✅ Authentication verified! User:', authUser.username);
  
  // 3. Test Frontend
  console.log('\n3. Testing frontend accessibility...');
  const frontendRes = await fetch('http://localhost:5000/');
  const html = await frontendRes.text();
  
  if (html.includes('Law Duel')) {
    console.log('✅ Frontend is accessible');
  } else {
    console.log('❌ Frontend not loading properly');
  }
  
  console.log('\n=== AUTHENTICATION SYSTEM IS WORKING ===');
  console.log('\nYou can now log in with:');
  console.log('Username: debuguser');
  console.log('Password: test123');
  console.log('\nThe authentication is fully functional!');
}

testAuth().catch(console.error);