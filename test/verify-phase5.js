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

async function verifyPhase5() {
  console.log("=== VERIFYING PHASE 5: STRETCH FEATURES ===");

  // 1. Test AI Assistant Query Parsing (5a)
  const q1 = await request({
    hostname: 'localhost',
    port: 3000,
    path: '/api/assistant/query',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, JSON.stringify({ query: "Has anyone found a calculator near the computer lab?" }));

  if (q1.status === 200 && q1.json.parsed.category === 'calculator' && q1.json.parsed.location === 'computer lab') {
    console.log(`✅ 1. AI Assistant successfully parsed Category: "${q1.json.parsed.category}", Location: "${q1.json.parsed.location}".`);
    console.log(`      Found ${q1.json.results.length} item(s). Reply: "${q1.json.reply}"`);
  } else {
    throw new Error(`AI Assistant query failed: ${JSON.stringify(q1.json)}`);
  }

  // 2. Test Voice mic button & Web Speech integration verification (5b)
  const lostPage = await request({
    hostname: 'localhost',
    port: 3000,
    path: '/report-lost.html',
    method: 'GET'
  });
  if (lostPage.body.includes('voiceMicBtn') && lostPage.body.includes('initVoiceInput')) {
    console.log("✅ 2. Voice reporting mic button & Web Speech API integration verified on report forms.");
  } else {
    throw new Error("Voice reporting element missing from report-lost.html");
  }

  // 3. Test English/Kannada bilingual dictionary (5c)
  const appJs = await request({
    hostname: 'localhost',
    port: 3000,
    path: '/js/app.js',
    method: 'GET'
  });
  if (appJs.body.includes('TRANSLATIONS') && appJs.body.includes('kn:') && appJs.body.includes('ಏನಾದರೂ ಕಳೆದುಹೋಗಿದೆಯೇ?')) {
    console.log("✅ 3. English/Kannada bilingual translation dictionary verified.");
  } else {
    throw new Error("Kannada translations missing from app.js");
  }

  console.log("\n>>> ALL PHASE 5 STRETCH FEATURES VERIFIED! <<<\n");
}

verifyPhase5().catch(err => {
  console.error("Phase 5 verification failed:", err);
  process.exit(1);
});

