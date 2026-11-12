const { initDb, seedInitialData } = require('./db');

async function runSeed() {
  console.log("Resetting and reseeding FINDIT database...");
  await initDb(true);
  console.log("Database reset and seeded successfully!");
  process.exit(0);
}

runSeed().catch(err => {
  console.error("Seed error:", err);
  process.exit(1);
});

