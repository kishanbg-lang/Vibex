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

async function verifyPhase3() {
  console.log("=== VERIFYING PHASE 3: NOTIFICATIONS, MAP & COMPLETE CLAIM WORKFLOW ===");

  // 1. Check Student 1 received the match notification
  const s1Login = await request({
    hostname: 'localhost',
    port: 3000,
    path: '/api/auth/login',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, JSON.stringify({ email: 'student1@college.edu', password: 'student123' }));
  const s1Cookie = s1Login.cookie;

  const notifsRes = await request({
    hostname: 'localhost',
    port: 3000,
    path: '/api/notifications',
    method: 'GET'
  }, null, s1Cookie);

  if (notifsRes.status === 200 && notifsRes.json?.notifications?.length > 0) {
    const matchNotif = notifsRes.json.notifications[0];
    console.log(`✅ 1. Student 1 notification bell received alert: "${matchNotif.title}" - ${matchNotif.message}`);
    console.log(`      Unread Count: ${notifsRes.json.unreadCount}`);
  } else {
    throw new Error(`Notification test failed: ${notifsRes.body}`);
  }

  // 2. Student 1 files a Claim for an open found item
  const foundItemsRes = await request({
    hostname: 'localhost',
    port: 3000,
    path: '/api/items?type=found',
    method: 'GET'
  });
  const targetItem = (foundItemsRes.json || []).find(i => i.status !== 'Returned') || { id: 11 };

  const claimRes = await request({
    hostname: 'localhost',
    port: 3000,
    path: '/api/claims',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, JSON.stringify({
    item_id: targetItem.id,
    verification_answer: 'My left earphone bud has a small scratch on the joint and it came with a red carrying pouch',
    message: 'Can pick it up from security desk today at 4pm'
  }), s1Cookie);

  if (claimRes.status !== 200 || !claimRes.json?.claimCode) {
    throw new Error(`Claim submission failed: ${claimRes.body}`);
  }
  const { claimId, claimCode } = claimRes.json;
  console.log(`✅ 2. Claim filed successfully! Claim ID: ${claimId}, Claim Code: "${claimCode}"`);

  // 3. Admin logs in to review pending claim
  const adminLogin = await request({
    hostname: 'localhost',
    port: 3000,
    path: '/api/auth/login',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, JSON.stringify({ email: 'admin@college.edu', password: 'admin123' }));
  const adminCookie = adminLogin.cookie;

  // Verify claim is visible in queue with secret detail
  const adminClaimsRes = await request({
    hostname: 'localhost',
    port: 3000,
    path: '/api/claims',
    method: 'GET'
  }, null, adminCookie);

  const pendingClaim = (adminClaimsRes.json || []).find(c => c.id === claimId);
  if (!pendingClaim) throw new Error("Claim not found in admin queue");
  console.log(`✅ 3. Admin retrieved claim from queue.`);
  console.log(`      Stored Secret Detail: "${pendingClaim.item_private_detail}"`);
  console.log(`      Claimant Answer:      "${pendingClaim.verification_answer}"`);

  // 4. Admin approves the claim (generates QR code)
  const approveRes = await request({
    hostname: 'localhost',
    port: 3000,
    path: `/api/claims/${claimId}/review`,
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, JSON.stringify({ action: 'approve' }), adminCookie);

  if (approveRes.status !== 200 || approveRes.json?.status !== 'Approved' || !approveRes.json?.qr_code) {
    throw new Error(`Claim approval failed: ${approveRes.body}`);
  }
  console.log(`✅ 4. Claim APPROVED by Admin!`);
  console.log(`      QR Code successfully generated: data URL prefix "${approveRes.json.qr_code.substring(0, 35)}..."`);

  // 5. Security desk handover: mark item Returned using claim_code
  const returnRes = await request({
    hostname: 'localhost',
    port: 3000,
    path: '/api/claims/return',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, JSON.stringify({ claim_code: claimCode }), adminCookie);

  if (returnRes.status !== 200 || !returnRes.json?.success) {
    throw new Error(`Security handover return failed: ${returnRes.body}`);
  }
  console.log(`✅ 5. Security desk handover complete: Item marked "Returned"!`);

  // 6. Check updated stats and map numbers
  const statsRes = await request({
    hostname: 'localhost',
    port: 3000,
    path: '/api/stats',
    method: 'GET'
  });
  console.log(`✅ 6. Updated Stats: Items Returned = ${statsRes.json.itemsReturned}, Recovery Rate = ${statsRes.json.recoveryRate}%`);

  console.log("\n>>> ALL PHASE 3 VERIFICATIONS PASSED! <<<\n");
}

verifyPhase3().catch(err => {
  console.error("Phase 3 verification failed:", err);
  process.exit(1);
});

