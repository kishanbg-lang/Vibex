// test/verify-pending-queue-ui.js
const fs = require('fs');
const path = require('path');

const adminHtml = fs.readFileSync(path.join(__dirname, '..', 'public', 'admin.html'), 'utf8');

// Verify that the required strings and sections are present in admin.html
const checks = [
  { name: "Reported by (Finder) Section", pattern: /Reported by \(Finder\)/ },
  { name: "Claimed by (Claimant) Section", pattern: /Claimed by \(Claimant\)/ },
  { name: "Finder Name & Contact Display", pattern: /finder_name/ },
  { name: "Finder Email Display", pattern: /finder_email/ },
  { name: "Finder Phone Display", pattern: /finder_phone/ },
  { name: "Claimant Name & Contact Display", pattern: /claimant_name/ },
  { name: "Claimant Email Display", pattern: /claimant_email/ },
  { name: "Claimant Phone Display", pattern: /claimant_phone/ },
  { name: "Item Public Description Section", pattern: /Item Public Description \(Reported by Finder\)/ },
  { name: "Stored Private Detail Box", pattern: /Stored Private Detail \(Finder's Secret\)/ },
  { name: "Claimant Submitted Answer Box", pattern: /Claimant's Submitted Answer/ },
  { name: "Approve Button with Styling & Icon", pattern: /Approve &amp; Issue QR Pass/ },
  { name: "Reject Button with Styling & Icon", pattern: /Reject Claim/ },
  { name: "Complete Handover Button", pattern: /Complete Handover/ },
  { name: "View QR Pass Button", pattern: /View QR Pass/ },
  { name: "Re-open for Review Button", pattern: /Re-open for Review/ }
];

let failed = 0;
console.log("=== Checking Pending Queue UI Enhancements in admin.html ===");
checks.forEach(c => {
  if (c.pattern.test(adminHtml)) {
    console.log(`✅ Passed: ${c.name}`);
  } else {
    console.error(`❌ Failed: ${c.name}`);
    failed++;
  }
});

if (failed === 0) {
  console.log("\n🎉 ALL PENDING QUEUE UI ENHANCEMENTS VERIFIED IN admin.html!");
  process.exit(0);
} else {
  console.error(`\n❌ ${failed} checks failed.`);
  process.exit(1);
}

