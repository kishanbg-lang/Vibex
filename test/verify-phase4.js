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

async function verifyPhase4() {
  console.log("=== VERIFYING PHASE 4: SEARCH, ADMIN DASHBOARD & FILTERS ===");

  // 1. Search by Keyword
  const searchKw = await request({
    hostname: 'localhost',
    port: 3000,
    path: '/api/items?search=earphones',
    method: 'GET'
  });
  if (searchKw.status === 200 && searchKw.json.length >= 2) {
    console.log(`✅ 1. Keyword search ("earphones") returned ${searchKw.json.length} matching reports.`);
  } else {
    throw new Error(`Keyword search failed: ${searchKw.body}`);
  }

  // 2. Filter by Category & Location
  const filterCatLoc = await request({
    hostname: 'localhost',
    port: 3000,
    path: '/api/items?category=Calculator&location=Computer%20Lab',
    method: 'GET'
  });
  if (filterCatLoc.status === 200 && filterCatLoc.json.length >= 1) {
    console.log(`✅ 2. Multi-filter ("Calculator" in "Computer Lab") returned ${filterCatLoc.json.length} report(s).`);
  } else {
    throw new Error(`Multi-filter failed: ${filterCatLoc.body}`);
  }

  // 3. Filter by Status
  const filterReturned = await request({
    hostname: 'localhost',
    port: 3000,
    path: '/api/items?status=Returned',
    method: 'GET'
  });
  if (filterReturned.status === 200 && filterReturned.json.length >= 1) {
    console.log(`✅ 3. Status filter ("Returned") correctly identified returned item #${filterReturned.json[0].id}.`);
  } else {
    throw new Error(`Status filter failed: ${filterReturned.body}`);
  }

  // 4. Admin stats & table verification
  const stats = await request({
    hostname: 'localhost',
    port: 3000,
    path: '/api/stats',
    method: 'GET'
  });
  if (stats.json && stats.json.itemsReturned >= 1 && Object.keys(stats.json.locationStats).length === 8) {
    console.log(`✅ 4. Admin analytics verified: 8 campus zones mapped for Chart.js bar chart.`);
  } else {
    throw new Error(`Admin stats failed: ${JSON.stringify(stats.json)}`);
  }

  console.log("\n>>> ALL PHASE 4 VERIFICATIONS PASSED! <<<\n");
}

verifyPhase4().catch(err => {
  console.error("Phase 4 verification failed:", err);
  process.exit(1);
});

