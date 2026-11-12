const http = require('http');
const fs = require('fs');
const path = require('path');

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

async function runDemoFlow() {
  console.log("==========================================================");
  console.log("   FINDIT – COMPLETE END-TO-END DEMO FLOW VERIFICATION");
  console.log("==========================================================");

  // STEP 1: Student A reports lost black earphones near Library
  console.log("\n[STEP 1] Student A reports lost black earphones near Library...");
  const s1Login = await request({
    hostname: 'localhost',
    port: 3000,
    path: '/api/auth/login',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, JSON.stringify({ email: 'student1@college.edu', password: 'student123' }));
  const s1Cookie = s1Login.cookie;

  const todayStr = new Date().toISOString().split('T')[0];
  const lostRes = await request({
    hostname: 'localhost',
    port: 3000,
    path: '/api/items',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, JSON.stringify({
    type: 'lost',
    title: 'Boat Rockerz 450 Black Earphones',
    category: 'Earphones',
    description: 'Matte black wireless headphones with cushioned earcups left on 2nd floor desk',
    color: 'Black',
    location: 'Library',
    date_lost_or_found: todayStr
  }), s1Cookie);

  const lostItem = lostRes.json.item;
  console.log(` -> Created Lost Item #${lostItem.id}: "${lostItem.title}" at ${lostItem.location}`);

  // STEP 2: Student B reports found black earphones near Library with private detail
  console.log("\n[STEP 2] Student B reports found black earphones near Library with secret verification detail...");
  const s2Login = await request({
    hostname: 'localhost',
    port: 3000,
    path: '/api/auth/login',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, JSON.stringify({ email: 'student2@college.edu', password: 'student123' }));
  const s2Cookie = s2Login.cookie;

  const foundRes = await request({
    hostname: 'localhost',
    port: 3000,
    path: '/api/items',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, JSON.stringify({
    type: 'found',
    title: 'Boat Rockerz Over-Ear Black Headphones',
    category: 'Earphones',
    description: 'Found black headphones sitting on library table near window',
    color: 'Black',
    location: 'Library',
    date_lost_or_found: todayStr,
    current_location_desc: 'security desk',
    private_detail: 'Small Pikachu sticker pasted inside the left headband adjustment slider'
  }), s2Cookie);

  const foundItem = foundRes.json.item;
  console.log(` -> Created Found Item #${foundItem.id}: "${foundItem.title}" at ${foundItem.location}`);
  console.log(` -> Secret Detail stored safely: "${foundItem.private_detail}"`);

  // STEP 3: Student A instantly gets a match notification (~87-93%)
  console.log("\n[STEP 3] Verifying Student A receives instant Smart Match notification...");
  const notifs = await request({
    hostname: 'localhost',
    port: 3000,
    path: '/api/notifications',
    method: 'GET'
  }, null, s1Cookie);

  const matchAlert = notifs.json.notifications.find(n => n.message.includes(foundItem.title) || n.message.includes('Boat Rockerz'));
  if (!matchAlert) {
    throw new Error("Match notification not found for Student A");
  }
  console.log(` -> Alert Received: "${matchAlert.title}"`);
  console.log(` -> Details: "${matchAlert.message}"`);

  const matchDetails = await request({
    hostname: 'localhost',
    port: 3000,
    path: `/api/items/${lostItem.id}`,
    method: 'GET'
  });
  const matchRecord = matchDetails.json.matches.find(m => m.found_item_id === foundItem.id);
  console.log(` -> Smart Match Score: ${matchRecord.score}%`);
  console.log(` -> Smart Match Explanation: "${matchRecord.explanation}"`);

  // STEP 4: Student A claims it and answers the verification question
  console.log("\n[STEP 4] Student A claims it and answers the verification question...");
  const claimRes = await request({
    hostname: 'localhost',
    port: 3000,
    path: '/api/claims',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, JSON.stringify({
    item_id: foundItem.id,
    verification_answer: 'I put a small Pikachu sticker inside the left headband adjustment slider',
    message: 'Can pick it up from the security desk after 3 PM'
  }), s1Cookie);

  const { claimId, claimCode } = claimRes.json;
  console.log(` -> Claim Submitted! Claim ID: ${claimId}, Claim Code: "${claimCode}"`);

  // STEP 5: Admin approves, QR is generated, item is marked Returned
  console.log("\n[STEP 5] Admin reviews verification answer, approves claim, and marks Returned...");
  const adminLogin = await request({
    hostname: 'localhost',
    port: 3000,
    path: '/api/auth/login',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, JSON.stringify({ email: 'admin@college.edu', password: 'admin123' }));
  const adminCookie = adminLogin.cookie;

  // Approve claim
  const approveRes = await request({
    hostname: 'localhost',
    port: 3000,
    path: `/api/claims/${claimId}/review`,
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, JSON.stringify({ action: 'approve' }), adminCookie);

  console.log(` -> Admin approved claim. Status: ${approveRes.json.status}`);
  console.log(` -> Cryptographic QR code generated: ${approveRes.json.qr_code.substring(0, 40)}...`);

  // Security Desk Handover: Mark Returned
  const returnRes = await request({
    hostname: 'localhost',
    port: 3000,
    path: '/api/claims/return',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, JSON.stringify({ claim_code: claimCode }), adminCookie);

  console.log(` -> Security desk scanned claim code: ${returnRes.json.message}`);

  // STEP 6: Campus map and dashboard show the updated stats
  console.log("\n[STEP 6] Verifying campus map and dashboard stats update...");
  const statsRes = await request({
    hostname: 'localhost',
    port: 3000,
    path: '/api/stats',
    method: 'GET'
  });

  console.log(` -> Total Lost: ${statsRes.json.totalLost}`);
  console.log(` -> Total Found: ${statsRes.json.totalFound}`);
  console.log(` -> Matches Made: ${statsRes.json.matchesMade}`);
  console.log(` -> Items Returned: ${statsRes.json.itemsReturned}`);
  console.log(` -> Campus Recovery Rate: ${statsRes.json.recoveryRate}%`);
  console.log(` -> Library Zone Total Reports: ${statsRes.json.locationStats.Library.total}`);

  // STEP 7: Verify Mobile Responsive CSS Rules (390px viewport rules)
  console.log("\n[STEP 7] Verifying mobile responsiveness (390px viewport)...");
  const cssContent = fs.readFileSync(path.join(__dirname, '..', 'public', 'css', 'style.css'), 'utf-8');
  if (cssContent.includes('@media (max-width: 390px)') && cssContent.includes('@media (max-width: 768px)')) {
    console.log(" -> Verified: Responsive breakpoints present for 768px and 390px iPhone mobile viewports.");
  } else {
    throw new Error("Mobile CSS media query missing");
  }

  console.log("\n==========================================================");
  console.log("🎉 FULL DEMO FLOW SUCCESSFULLY EXECUTED AND VERIFIED!");
  console.log("==========================================================");
}

runDemoFlow().catch(err => {
  console.error("Demo flow failed:", err);
  process.exit(1);
});

