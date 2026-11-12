const { getDb } = require('../db');
async function checkClaims() {
  const db = await getDb();
  const res = db.exec(`
    SELECT claims.id, claims.status, claims.claim_code, claims.verification_answer,
           items.title as item_title, items.category as item_category, items.private_detail as item_private_detail,
           claimant.name as claimant_name, finder.name as finder_name
    FROM claims
    JOIN items ON claims.item_id = items.id
    JOIN users claimant ON claims.claimant_id = claimant.id
    LEFT JOIN users finder ON items.user_id = finder.id
    ORDER BY claims.id DESC
  `);
  if (!res.length || !res[0].values.length) {
    console.log('No claims found in DB.');
    return;
  }
  const cols = res[0].columns;
  res[0].values.forEach(row => {
    const obj = {};
    cols.forEach((c, i) => obj[c] = row[i]);
    console.log(`Claim #${obj.id} [${obj.status}] Code: ${obj.claim_code}`);
    console.log(`  Item: "${obj.item_title}" (${obj.item_category})`);
    console.log(`  Reported by (Finder): ${obj.finder_name}`);
    console.log(`  Claimed by:           ${obj.claimant_name}`);
    console.log(`  Finder's Secret:      "${obj.item_private_detail}"`);
    console.log(`  Claimant's Answer:    "${obj.verification_answer}"\n`);
  });
}
checkClaims().catch(console.error);

