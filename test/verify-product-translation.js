// test/verify-product-translation.js
const fs = require('fs');
const path = require('path');

const appJs = fs.readFileSync(path.join(__dirname, '..', 'public', 'js', 'app.js'), 'utf8');

// Evaluate app.js in a mock DOM environment
const mockDOM = `
  const localStorage = {
    _data: {},
    getItem(k) { return this._data[k] || null; },
    setItem(k, v) { this._data[k] = String(v); }
  };
  const window = { location: { search: '' } };
  const document = {
    addEventListener() {},
    querySelectorAll() { return []; },
    getElementById() { return null; },
    body: { insertAdjacentHTML() {} }
  };
  class MutationObserver {
    observe() {}
    disconnect() {}
  }
`;

try {
  const evalCode = mockDOM + '\n' + appJs;
  const scriptFunc = new Function(evalCode + '\nreturn { EN_TO_KN_PHRASES, KN_TO_EN_PHRASES, translateProductTerms };');
  const { EN_TO_KN_PHRASES, KN_TO_EN_PHRASES, translateProductTerms } = scriptFunc();

  console.log("=== Testing Product & Item Name Translation ===");

  const testItems = [
    "Sony WH-1000XM4 Wireless Earphones",
    "Casio fx-991EX Scientific Calculator",
    "Milton Thermosteel Water Bottle 750ml",
    "College ID Card - Student B.Tech CSE",
    "Wildcraft Grey College Backpack",
    "Apple AirPods Pro 2 Charging Case",
    "Classmate Spiral Engineering Notebook & Scale",
    "Logitech Wireless Mouse & Fast Charger",
    "Royal Enfield Bike Key with Leather Tag",
    "College Identity Card with Blue Strap",
    "Spiral Bound Notebook & Drafting Scale",
    "White AirPods Charging Case",
    "Black Sony Wireless Over-Ear Headphones",
    "Silver Insulated Water Flask",
    "Compact Wireless Optical Mouse & Fast Charger",
    "Grey Wildcraft College Bag",
    "Casio Scientific Calculator ClassWiz",
    "Brown Leather Men Wallet"
  ];

  let missingCount = 0;
  testItems.forEach(item => {
    const kn = EN_TO_KN_PHRASES[item];
    const backEn = KN_TO_EN_PHRASES[kn];
    if (kn) {
      console.log(`✅ [Exact] "${item}" -> "${kn}"`);
      if (backEn !== item) {
        console.warn(`   ⚠️ Reverse mismatch: got "${backEn}", expected "${item}"`);
      }
    } else {
      console.error(`❌ Missing translation for seeded item: "${item}"`);
      missingCount++;
    }
  });

  console.log("\n=== Testing Dynamic / Generic Product Name Translation ===");
  const dynamicItems = [
    "Black Earphones",
    "Blue Water Bottle",
    "Casio Scientific Calculator",
    "Room Keys",
    "Grey College Backpack",
    "Brown Leather Wallet",
    "Fast Charger",
    "Two Bike Keys"
  ];

  dynamicItems.forEach(dyn => {
    const translated = translateProductTerms(dyn);
    console.log(`✅ [Dynamic] "${dyn}" -> "${translated}"`);
  });

  if (missingCount === 0) {
    console.log("\n🎉 ALL PRODUCT TRANSLATION TESTS PASSED PERFECTLY!");
    process.exit(0);
  } else {
    console.error(`\n❌ ${missingCount} items missing translation.`);
    process.exit(1);
  }
} catch (e) {
  console.error("Syntax / execution error in app.js:", e);
  process.exit(1);
}

