const { getDb } = require('../db');
async function checkMatches() {
  const db = await getDb();
  const res = db.exec(`
    SELECT matches.id, matches.score, matches.explanation,
           lost.id as lost_id, lost.title as lost_title, lost.category as lost_cat,
           found.id as found_id, found.title as found_title, found.category as found_cat
    FROM matches
    JOIN items lost ON matches.lost_item_id = lost.id
    JOIN items found ON matches.found_item_id = found.id
    ORDER BY matches.score DESC
  `);
  if (!res.length || !res[0].values.length) {
    console.log('No matches found in DB.');
    return;
  }
  const cols = res[0].columns;
  res[0].values.forEach(row => {
    const obj = {};
    cols.forEach((c, i) => obj[c] = row[i]);
    console.log(`Match #${obj.id} [${obj.score}%]: Lost '${obj.lost_title}' (${obj.lost_cat}) <==> Found '${obj.found_title}' (${obj.found_cat})`);
    console.log(`   Why: ${obj.explanation}`);
  });
}
checkMatches().catch(console.error);
