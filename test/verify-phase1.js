const http = require('http');

function request(options, data = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        let json = null;
        try { json = JSON.parse(body); } catch(e) {}
        resolve({
          status: res.statusCode,
          headers: res.headers,
          body,
          json
        });
      });
    });
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

async function verifyPhase1() {
  console.log("=== VERIFYING PHASE 1: FOUNDATION ===");

  // 1. Home page opens
  const home = await request({
    hostname: 'localhost',
    port: 3000,
    path: '/',
    method: 'GET'
  });
  if (home.status === 200 && home.body.includes('FINDIT')) {
    console.log("✅ 1. Home page (GET /) serves FINDIT successfully.");
  } else {
    throw new Error(`Failed to load home page: status ${home.status}`);
  }

  // 2. Stats API works & returns seeded item counts
  const stats = await request({
    hostname: 'localhost',
    port: 3000,
    path: '/api/stats',
    method: 'GET'
  });
  if (stats.status === 200 && stats.json && stats.json.totalLost >= 9 && stats.json.totalFound >= 9) {
    console.log(`✅ 2. Stats API reports ${stats.json.totalLost} lost items, ${stats.json.totalFound} found items.`);
  } else {
    throw new Error(`Stats verification failed: ${JSON.stringify(stats.json)}`);
  }

  // 3. Items API returns seeded items
  const items = await request({
    hostname: 'localhost',
    port: 3000,
    path: '/api/items',
    method: 'GET'
  });
  if (items.status === 200 && Array.isArray(items.json) && items.json.length >= 18) {
    console.log(`✅ 3. Items API returns ${items.json.length} total reports with photo thumbnails and categories.`);
  } else {
    throw new Error(`Items verification failed: ${JSON.stringify(items.json)}`);
  }

  // 4. Student Login works
  const studentLogin = await request({
    hostname: 'localhost',
    port: 3000,
    path: '/api/auth/login',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, JSON.stringify({ email: 'student1@college.edu', password: 'student123' }));

  if (studentLogin.status === 200 && studentLogin.json?.user?.email === 'student1@college.edu') {
    console.log(`✅ 4. Student login successful: ${studentLogin.json.user.name} (${studentLogin.json.user.role}).`);
  } else {
    throw new Error(`Student login failed: ${JSON.stringify(studentLogin.json)}`);
  }

  // 5. Admin Login works
  const adminLogin = await request({
    hostname: 'localhost',
    port: 3000,
    path: '/api/auth/login',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, JSON.stringify({ email: 'admin@college.edu', password: 'admin123' }));

  if (adminLogin.status === 200 && adminLogin.json?.user?.role === 'admin') {
    console.log(`✅ 5. Admin login successful: ${adminLogin.json.user.name} (${adminLogin.json.user.role}).`);
  } else {
    throw new Error(`Admin login failed: ${JSON.stringify(adminLogin.json)}`);
  }

  console.log("\n>>> ALL PHASE 1 VERIFICATIONS PASSED! <<<\n");
}

verifyPhase1().catch(err => {
  console.error("Phase 1 verification failed:", err);
  process.exit(1);
});

