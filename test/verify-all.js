const { execSync } = require('child_process');
const path = require('path');

console.log("==========================================================");
console.log("   FINDIT – Smart Campus Recovery System Test Suite");
console.log("==========================================================");

const testFiles = [
  'verify-phase1.js',
  'verify-phase2.js',
  'verify-phase3.js',
  'verify-phase4.js',
  'verify-phase5.js'
];

let allPassed = true;

for (const file of testFiles) {
  const filePath = path.join(__dirname, file);
  try {
    console.log(`\n▶ Running ${file}...`);
    const output = execSync(`node "${filePath}"`, { encoding: 'utf-8' });
    console.log(output);
  } catch (err) {
    console.error(`❌ FAILED ${file}:`);
    console.error(err.stdout || err.message);
    allPassed = false;
    break;
  }
}

if (allPassed) {
  console.log("==========================================================");
  console.log("🎉 ALL TESTS PASSED! FINDIT SYSTEM FULLY VERIFIED!");
  console.log("==========================================================");
  process.exit(0);
} else {
  console.error("❌ TEST SUITE FAILED");
  process.exit(1);
}

