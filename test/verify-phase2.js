const http = require('http');

function request(options, data = null, cookie = null) {
  return new Promise((resolve, reject) => {
    const headers = options.headers || {};
    if (cookie) headers['Cookie'] = cookie;
    options.headers = headers;

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        let json = null;
        try { json = JSON.parse(body); } catch(e) {}
        let setCookie = res.headers['set-cookie'];
        let cookieHeader = null;
        if (setCookie && setCookie.length > 0) {
          cookieHeader = setCookie[0].split(';')[0];
        }
        resolve({
          status: res.statusCode,
          headers: res.headers,
          cookie: cookieHeader,
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

async function verifyPhase2() {
  console.log("=== VERIFYING PHASE 2: REPORTING + AI MATCHING ===");

  // 1. Login as Student 1
  const s1Login = await request({
    hostname: 'localhost',
    port: 3000,
    path: '/api/auth/login',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, JSON.stringify({ email: 'student1@college.edu', password: 'student123' }));

  const s1Cookie = s1Login.cookie;
  if (!s1Cookie) throw new Error("Student 1 login failed to set session cookie");

  // 2. Report Lost: black earphones at Library
  const lostRes = await request({
    hostname: 'localhost',
    port: 3000,
    path: '/api/items',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, JSON.stringify({
    type: 'lost',
    title: 'black earphones',
    category: 'Earphones',
    description: 'Lost my wireless black earphones near reading tables',
    color: 'black',
    location: 'Library',
    date_lost_or_found: '2026-11-12'
  }), s1Cookie);

  if (lostRes.status !== 200 || !lostRes.json?.item) {
    throw new Error(`Report lost failed: ${lostRes.body}`);
  }
  const lostItemId = lostRes.json.item.id;
  console.log(`✅ 1. Created Lost item #${lostItemId}: "black earphones", Library`);

  // 3. Login as Student 2
  const s2Login = await request({
    hostname: 'localhost',
    port: 3000,
    path: '/api/auth/login',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, JSON.stringify({ email: 'student2@college.edu', password: 'student123' }));

  const s2Cookie = s2Login.cookie;
  if (!s2Cookie) throw new Error("Student 2 login failed to set session cookie");

  // 4. Report Found: black earphones at Library
  const foundRes = await request({
    hostname: 'localhost',
    port: 3000,
    path: '/api/items',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, JSON.stringify({
    type: 'found',
    title: 'black earphones',
    category: 'Earphones',
    description: 'Found black earphones on second floor desk',
    color: 'black',
    location: 'Library',
    date_lost_or_found: '2026-11-12',
    current_location_desc: 'security desk',
    private_detail: 'Tiny scratch on left bud and red carrying pouch'
  }), s2Cookie);

  if (foundRes.status !== 200 || !foundRes.json?.item) {
    throw new Error(`Report found failed: ${foundRes.body}`);
  }
  const foundItemId = foundRes.json.item.id;
  console.log(`✅ 2. Created Found item #${foundItemId}: "black earphones", Library with secret private detail`);

  // 5. Verify match exists between lostItemId and foundItemId with score >= 70
  const matchesRes = await request({
    hostname: 'localhost',
    port: 3000,
    path: `/api/items/${lostItemId}`,
    method: 'GET'
  });

  const matches = matchesRes.json?.matches || [];
  const match = matches.find(m => m.found_item_id === foundItemId);

  if (match && match.score >= 70) {
    console.log(`✅ 3. Match CONFIRMED with Score: ${match.score}% (>= 70 threshold)`);
    console.log(`      Why Matched: "${match.explanation}"`);
  } else {
    throw new Error(`Match not found or score < 70: ${JSON.stringify(matches)}`);
  }

  // 6. Test Non-matching items: Calculator vs Bottle
  const lostCalc = await request({
    hostname: 'localhost',
    port: 3000,
    path: '/api/items',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, JSON.stringify({
    type: 'lost',
    title: 'Casio Scientific Calculator',
    category: 'Calculator',
    description: 'Black calculator fx-991EX',
    color: 'Black',
    location: 'Computer Lab',
    date_lost_or_found: '2026-11-01'
  }), s1Cookie);

  const foundBottle = await request({
    hostname: 'localhost',
    port: 3000,
    path: '/api/items',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, JSON.stringify({
    type: 'found',
    title: 'Milton Steel Bottle',
    category: 'Bottle',
    description: 'Silver thermos flask',
    color: 'Silver',
    location: 'Canteen',
    date_lost_or_found: '2026-11-12',
    current_location_desc: 'with me',
    private_detail: 'Dent on rim'
  }), s2Cookie);

  const calcDetails = await request({
    hostname: 'localhost',
    port: 3000,
    path: `/api/items/${lostCalc.json.item.id}`,
    method: 'GET'
  });

  const calcBottleMatch = (calcDetails.json?.matches || []).find(m => m.found_item_id === foundBottle.json.item.id);
  if (!calcBottleMatch) {
    console.log("✅ 4. Confirmed: Calculator and Bottle do NOT match (score is below 50% threshold).");
  } else {
    throw new Error(`Unexpected match between calculator and bottle! Score: ${calcBottleMatch.score}`);
  }

  console.log("\n>>> ALL PHASE 2 VERIFICATIONS PASSED! <<<\n");
}

verifyPhase2().catch(err => {
  console.error("Phase 2 verification failed:", err);
  process.exit(1);
});

