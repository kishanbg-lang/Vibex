const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const QRCode = require('qrcode');

const DB_FILE = path.join(__dirname, 'findit.sqlite');

let dbInstance = null;
let SQL = null;

async function getDb() {
  if (!dbInstance) {
    await initDb();
  }
  return dbInstance;
}

function saveDb() {
  if (dbInstance) {
    const data = dbInstance.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(DB_FILE, buffer);
  }
}

async function initDb(forceReset = false) {
  SQL = await initSqlJs();

  if (forceReset && fs.existsSync(DB_FILE)) {
    try {
      fs.unlinkSync(DB_FILE);
    } catch (e) {
      console.warn("Could not delete existing DB file, continuing:", e.message);
    }
  }

  if (!forceReset && fs.existsSync(DB_FILE)) {
    const fileBuffer = fs.readFileSync(DB_FILE);
    dbInstance = new SQL.Database(fileBuffer);
  } else {
    dbInstance = new SQL.Database();
  }

  // Create tables
  dbInstance.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'student',
      phone TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      type TEXT NOT NULL, -- 'lost' or 'found'
      title TEXT NOT NULL,
      category TEXT NOT NULL, -- 'ID Card', 'Earphones', 'Calculator', 'Bottle', 'Bag', 'Keys', 'Wallet', 'Other'
      description TEXT NOT NULL,
      color TEXT NOT NULL,
      location TEXT NOT NULL, -- 'Library', 'Canteen', 'Computer Lab', 'Main Block', 'Hostel', 'Sports Ground', 'Parking', 'Auditorium'
      date_lost_or_found TEXT NOT NULL,
      image_url TEXT,
      current_location_desc TEXT, -- for found: 'with me' or 'security desk'
      private_detail TEXT, -- for found only, hidden from public
      status TEXT NOT NULL DEFAULT 'Open', -- 'Open', 'Matched', 'Claim Pending', 'Approved', 'Returned'
      user_id INTEGER NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS matches (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      lost_item_id INTEGER NOT NULL,
      found_item_id INTEGER NOT NULL,
      score INTEGER NOT NULL,
      explanation TEXT NOT NULL,
      created_at TEXT NOT NULL,
      UNIQUE(lost_item_id, found_item_id),
      FOREIGN KEY (lost_item_id) REFERENCES items(id),
      FOREIGN KEY (found_item_id) REFERENCES items(id)
    );

    CREATE TABLE IF NOT EXISTS claims (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      item_id INTEGER NOT NULL,
      claimant_id INTEGER NOT NULL,
      verification_answer TEXT NOT NULL,
      message TEXT,
      status TEXT NOT NULL DEFAULT 'Pending', -- 'Pending', 'Approved', 'Rejected', 'Returned'
      claim_code TEXT UNIQUE,
      qr_code TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (item_id) REFERENCES items(id),
      FOREIGN KEY (claimant_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS notifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      link TEXT,
      is_read INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );
  `);

  saveDb();

  // Check if users exist; if not, seed data
  const userCheck = query("SELECT COUNT(*) as count FROM users;");
  if (userCheck.length === 0 || userCheck[0].count === 0 || forceReset) {
    console.log("Seeding database with initial users and items...");
    await seedInitialData();
  }

  return dbInstance;
}

function query(sql, params = []) {
  if (!dbInstance) throw new Error("Database not initialized. Call initDb() first.");
  const stmt = dbInstance.prepare(sql);
  if (params && params.length > 0) {
    stmt.bind(params);
  }
  const rows = [];
  while (stmt.step()) {
    rows.push(stmt.getAsObject());
  }
  stmt.free();
  return rows;
}

function get(sql, params = []) {
  const rows = query(sql, params);
  return rows.length > 0 ? rows[0] : null;
}

function run(sql, params = []) {
  if (!dbInstance) throw new Error("Database not initialized. Call initDb() first.");
  dbInstance.run(sql, params);
  const res = dbInstance.exec("SELECT last_insert_rowid() AS id;");
  const lastInsertRowid = (res && res.length && res[0].values.length) ? res[0].values[0][0] : 0;
  const changes = dbInstance.getRowsModified();
  saveDb();
  return { lastInsertRowid, changes };
}

function exec(sql) {
  if (!dbInstance) throw new Error("Database not initialized. Call initDb() first.");
  const res = dbInstance.exec(sql);
  saveDb();
  return res;
}

async function seedInitialData() {
  // Clear any existing tables if seeding
  exec(`
    DELETE FROM notifications;
    DELETE FROM claims;
    DELETE FROM matches;
    DELETE FROM items;
    DELETE FROM users;
  `);

  const now = new Date().toISOString();
  const todayStr = now.split('T')[0];
  const yesterdayStr = new Date(Date.now() - 86400000).toISOString().split('T')[0];
  const twoDaysAgoStr = new Date(Date.now() - 172800000).toISOString().split('T')[0];

  // Passwords hashed with bcrypt
  const studentPw = bcrypt.hashSync('student123', 10);
  const adminPw = bcrypt.hashSync('admin123', 10);

  // Users: 3 demo students, 1 admin
  run(`
    INSERT INTO users (id, name, email, password, role, phone, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `, [1, 'Alex Student', 'student1@college.edu', studentPw, 'student', '+91 9876543210', now]);

  run(`
    INSERT INTO users (id, name, email, password, role, phone, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `, [2, 'Priya Sharma', 'student2@college.edu', studentPw, 'student', '+91 9876543211', now]);

  run(`
    INSERT INTO users (id, name, email, password, role, phone, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `, [3, 'Rohan Verma', 'student3@college.edu', studentPw, 'student', '+91 9876543212', now]);

  run(`
    INSERT INTO users (id, name, email, password, role, phone, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `, [4, 'Campus Security Admin', 'admin@college.edu', adminPw, 'admin', '+91 9876543299', now]);

  // 9 Lost Items (Exactly 3 for Student 1, 3 for Student 2, 3 for Student 3)
  const lostItems = [
    // --- Student 1 (Alex, user_id: 1) ---
    {
      title: 'Sony WH-1000XM4 Wireless Earphones',
      category: 'Earphones',
      description: 'Matte black over-ear noise-cancelling headphones left near the silent study desk.',
      color: 'Black',
      location: 'Library',
      date: todayStr,
      user_id: 1,
      image_url: '/images/sample-earphones.svg',
      status: 'Returned'
    },
    {
      title: 'Casio fx-991EX Scientific Calculator',
      category: 'Calculator',
      description: 'ClassWiz non-programmable scientific calculator with white slide-on cover.',
      color: 'Black',
      location: 'Computer Lab',
      date: yesterdayStr,
      user_id: 1,
      image_url: '/images/sample-calculator.svg',
      status: 'Claim Pending'
    },
    {
      title: 'Milton Thermosteel Water Bottle 750ml',
      category: 'Bottle',
      description: 'Silver insulated metal water bottle with small dent at bottom edge.',
      color: 'Silver',
      location: 'Canteen',
      date: yesterdayStr,
      user_id: 1,
      image_url: '/images/sample-bottle.svg',
      status: 'Returned'
    },

    // --- Student 2 (Priya, user_id: 2) ---
    {
      title: 'College ID Card - Student B.Tech CSE',
      category: 'ID Card',
      description: 'Official college smart ID card with blue lanyard and cardholder pouch.',
      color: 'Blue',
      location: 'Main Block',
      date: todayStr,
      user_id: 2,
      image_url: '/images/sample-idcard.svg',
      status: 'Matched'
    },
    {
      title: 'Wildcraft Grey College Backpack',
      category: 'Bag',
      description: 'Grey and black college backpack containing notebook and USB pen drive.',
      color: 'Grey',
      location: 'Library',
      date: twoDaysAgoStr,
      user_id: 2,
      image_url: '/images/sample-bag.svg',
      status: 'Approved'
    },
    {
      title: 'Apple AirPods Pro 2 Charging Case',
      category: 'Earphones',
      description: 'White AirPods Pro charging case without the pods inside.',
      color: 'White',
      location: 'Hostel',
      date: todayStr,
      user_id: 2,
      image_url: '/images/sample-earphones.svg',
      status: 'Matched'
    },

    // --- Student 3 (Rohan, user_id: 3) ---
    {
      title: 'Classmate Spiral Engineering Notebook & Scale',
      category: 'Stationery',
      description: 'Blue 300-page spiral notebook with lecture notes and 30cm transparent ruler.',
      color: 'Blue',
      location: 'Main Block',
      date: yesterdayStr,
      user_id: 3,
      image_url: '/images/sample-stationery.svg',
      status: 'Matched'
    },
    {
      title: 'Logitech Wireless Mouse & Fast Charger',
      category: 'Electronic Devices',
      description: 'Silent optical mouse, charcoal grey color with Type-C 65W fast charger.',
      color: 'Grey',
      location: 'Computer Lab',
      date: twoDaysAgoStr,
      user_id: 3,
      image_url: '/images/sample-electronics.svg',
      status: 'Matched'
    },
    {
      title: 'Royal Enfield Bike Key with Leather Tag',
      category: 'Keys',
      description: 'Single ignition key attached to a brown leather RE keychain.',
      color: 'Brown',
      location: 'Other / Unknown',
      date: todayStr,
      user_id: 3,
      image_url: '/images/sample-keys.svg',
      status: 'Open'
    }
  ];

  for (const item of lostItems) {
    run(`
      INSERT INTO items (type, title, category, description, color, location, date_lost_or_found, image_url, current_location_desc, private_detail, status, user_id, created_at)
      VALUES ('lost', ?, ?, ?, ?, ?, ?, ?, NULL, NULL, ?, ?, ?)
    `, [item.title, item.category, item.description, item.color, item.location, item.date, item.image_url, item.status || 'Open', item.user_id, now]);
  }

  // 9 Found Items (Exactly 3 for Student 1, 3 for Student 2, 3 for Student 3)
  const foundItems = [
    // --- Student 1 (Alex, user_id: 1) found items ---
    {
      title: 'College Identity Card with Blue Strap',
      category: 'ID Card',
      description: 'Student ID card found near the main administrative staircase.',
      color: 'Blue',
      location: 'Main Block',
      date: todayStr,
      user_id: 1,
      image_url: '/images/sample-idcard.svg',
      current_location_desc: 'security desk',
      private_detail: 'Roll number ends with digit 042 and valid till 2027',
      status: 'Matched'
    },
    {
      title: 'Spiral Bound Notebook & Drafting Scale',
      category: 'Stationery',
      description: 'Blue ruled spiral notes found on bench outside Seminar Hall 1.',
      color: 'Blue',
      location: 'Main Block',
      date: yesterdayStr,
      user_id: 1,
      image_url: '/images/sample-stationery.svg',
      current_location_desc: 'security desk',
      private_detail: 'First page has subject "Data Structures & Algorithms" written with green pen',
      status: 'Matched'
    },
    {
      title: 'White AirPods Charging Case',
      category: 'Earphones',
      description: 'Glossy white wireless earphone case picked up from hostel mess lobby.',
      color: 'White',
      location: 'Hostel',
      date: todayStr,
      user_id: 1,
      image_url: '/images/sample-earphones.svg',
      current_location_desc: 'with me',
      private_detail: 'Serial number starts with H7Y and has transparent protective silicone sleeve',
      status: 'Matched'
    },

    // --- Student 2 (Priya, user_id: 2) found items ---
    {
      title: 'Black Sony Wireless Over-Ear Headphones',
      category: 'Earphones',
      description: 'Found black Sony wireless headphones with zipped travel case on 2nd floor desk.',
      color: 'Black',
      location: 'Library',
      date: todayStr,
      user_id: 2,
      image_url: '/images/sample-earphones.svg',
      current_location_desc: 'security desk',
      private_detail: 'Initials AS written in silver marker inside right headband',
      status: 'Returned'
    },
    {
      title: 'Silver Insulated Water Flask',
      category: 'Bottle',
      description: 'Found stainless steel water bottle at the canteen counter table.',
      color: 'Silver',
      location: 'Canteen',
      date: yesterdayStr,
      user_id: 2,
      image_url: '/images/sample-bottle.svg',
      current_location_desc: 'with me',
      private_detail: 'Has a small dent on the bottom rim and black rubber ring',
      status: 'Returned'
    },
    {
      title: 'Compact Wireless Optical Mouse & Fast Charger',
      category: 'Electronic Devices',
      description: 'Grey computer mouse and Type-C laptop charger found in computer lab 2.',
      color: 'Grey',
      location: 'Computer Lab',
      date: twoDaysAgoStr,
      user_id: 2,
      image_url: '/images/sample-electronics.svg',
      current_location_desc: 'with me',
      private_detail: 'Duracell battery inside with yellow inspection sticker on bottom',
      status: 'Matched'
    },

    // --- Student 3 (Rohan, user_id: 3) found items ---
    {
      title: 'Grey Wildcraft College Bag',
      category: 'Bag',
      description: 'Grey backpack found in the reading hall corner.',
      color: 'Grey',
      location: 'Library',
      date: twoDaysAgoStr,
      user_id: 3,
      image_url: '/images/sample-bag.svg',
      current_location_desc: 'security desk',
      private_detail: 'Contains a red spiral engineering mechanics notebook and a SanDisk 32GB drive',
      status: 'Approved'
    },
    {
      title: 'Casio Scientific Calculator ClassWiz',
      category: 'Calculator',
      description: 'Black scientific calculator fx-991EX left at Terminal 14 in computer lab.',
      color: 'Black',
      location: 'Computer Lab',
      date: yesterdayStr,
      user_id: 3,
      image_url: '/images/sample-calculator.svg',
      current_location_desc: 'with me',
      private_detail: 'Name "Rahul K." faintly written with pencil inside the slide cover',
      status: 'Claim Pending'
    },
    {
      title: 'Brown Leather Men Wallet',
      category: 'Wallet',
      description: 'Tommy Hilfiger brown bi-fold wallet found in auditorium row 4.',
      color: 'Brown',
      location: 'Auditorium',
      date: yesterdayStr,
      user_id: 3,
      image_url: '/images/sample-wallet.svg',
      current_location_desc: 'security desk',
      private_detail: 'Contains a metro card and exactly Rs 240 cash with student bus pass',
      status: 'Open'
    }
  ];

  for (const item of foundItems) {
    run(`
      INSERT INTO items (type, title, category, description, color, location, date_lost_or_found, image_url, current_location_desc, private_detail, status, user_id, created_at)
      VALUES ('found', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [item.title, item.category, item.description, item.color, item.location, item.date, item.image_url, item.current_location_desc, item.private_detail, item.status || 'Open', item.user_id, now]);
  }

  // Pre-seed Matches between demo students
  const matches = [
    {
      lost_item_id: 1, // Sony Earphones (Alex, user 1)
      found_item_id: 13, // Black Sony Headphones (Priya, user 2)
      score: 95,
      explanation: '🎯 Key overlap: "sony", "wireless", "headphones" • ✅ Exact Category: Both "Earphones" • 🎨 Color: Both Black • 📍 Location: Identical zone (Library) • 📅 Timeline: Same day occurrence • 🔍 Admin Check: High confidence (95%). Verify student\'s submitted answer matches finder\'s stored secret detail.'
    },
    {
      lost_item_id: 2, // Casio Calculator (Alex, user 1)
      found_item_id: 17, // Casio Calculator ClassWiz (Rohan, user 3)
      score: 94,
      explanation: '🎯 Key overlap: "casio", "scientific", "calculator" • ✅ Exact Category: Both "Calculator" • 🎨 Color: Both Black • 📍 Location: Identical zone (Computer Lab) • 📅 Timeline: Within 24 hours • 🔍 Admin Check: High confidence (94%). Verify student\'s submitted answer matches finder\'s stored secret detail.'
    },
    {
      lost_item_id: 3, // Milton Water Bottle (Alex, user 1)
      found_item_id: 14, // Silver Insulated Water Flask (Priya, user 2)
      score: 92,
      explanation: '🎯 Key overlap: "water", "bottle", "insulated", "flask" • ✅ Exact Category: Both "Bottle" • 🎨 Color: Both Silver • 📍 Location: Identical zone (Canteen) • 📅 Timeline: Same day occurrence • 🔍 Admin Check: High confidence (92%). Verify physical item characteristics and secret bottom dent.'
    },
    {
      lost_item_id: 4, // College ID Card CSE (Priya, user 2)
      found_item_id: 10, // College Identity Card with Blue Strap (Alex, user 1)
      score: 93,
      explanation: '🎯 Key overlap: "college", "id", "card", "smart" • ✅ Exact Category: Both "ID Card" • 🎨 Color: Both Blue • 📍 Location: Identical zone (Main Block) • 📅 Timeline: Same day occurrence • 🔍 Admin Check: High confidence (93%). Check student roll number (ends with 042) on card before handover.'
    },
    {
      lost_item_id: 5, // Wildcraft College Backpack (Priya, user 2)
      found_item_id: 16, // Grey Wildcraft College Bag (Rohan, user 3)
      score: 93,
      explanation: '🎯 Key overlap: "wildcraft", "college", "bag", "backpack" • ✅ Exact Category: Both "Bag" • 🎨 Color: Both Grey • 📍 Location: Identical zone (Library) • 📅 Timeline: Within 24 hours • 🔍 Admin Check: High confidence (93%). Verify secret internal contents (spiral notes & USB drive) before handover.'
    },
    {
      lost_item_id: 6, // Apple AirPods Pro 2 Case (Priya, user 2)
      found_item_id: 12, // White AirPods Charging Case (Alex, user 1)
      score: 91,
      explanation: '🎯 Key overlap: "airpods", "charging", "case" • ✅ Exact Category: Both "Earphones" • 🎨 Color: Both White • 📍 Location: Identical zone (Hostel) • 📅 Timeline: Same day occurrence • 🔍 Admin Check: High confidence (91%). Verify case serial number prefix and silicone sleeve.'
    },
    {
      lost_item_id: 7, // Classmate Spiral Notebook & Scale (Rohan, user 3)
      found_item_id: 11, // Spiral Bound Notebook & Drafting Scale (Alex, user 1)
      score: 94,
      explanation: '🎯 Key overlap: "spiral", "notebook", "scale", "engineering" • ✅ Exact Category: Both "Stationery" • 🎨 Color: Both Blue • 📍 Location: Identical zone (Main Block) • 📅 Timeline: Same day occurrence • 🔍 Admin Check: High confidence (94%). Verify student subject notes on first page ("Data Structures & Algorithms").'
    },
    {
      lost_item_id: 8, // Logitech Mouse & Fast Charger (Rohan, user 3)
      found_item_id: 15, // Compact Optical Mouse & Charger (Priya, user 2)
      score: 92,
      explanation: '🎯 Key overlap: "mouse", "fast", "charger", "optical" • ✅ Exact Category: Both "Electronic Devices" • 🎨 Color: Both Grey • 📍 Location: Identical zone (Computer Lab) • 📅 Timeline: Within 24 hours • 🔍 Admin Check: High confidence (92%). Verify inspection sticker and Duracell battery inside battery compartment.'
    }
  ];

  for (const m of matches) {
    run(`
      INSERT INTO matches (lost_item_id, found_item_id, score, explanation, created_at)
      VALUES (?, ?, ?, ?, ?)
    `, [m.lost_item_id, m.found_item_id, m.score, m.explanation, now]);
  }

  // Pre-seed QR Code for Approved Claim (Item 16: Wildcraft College Bag)
  let approvedQrUrl = null;
  try {
    approvedQrUrl = await QRCode.toDataURL(JSON.stringify({
      claim_code: 'FND-APP004',
      item_id: 16,
      claimant_id: 2
    }), {
      width: 300,
      margin: 2,
      color: { dark: '#1e3a8a', light: '#ffffff' }
    });
  } catch (e) {
    console.error("QR Code seed generation error:", e);
  }

  // Pre-seed Claims (Returned, Pending, Approved)
  const claims = [
    {
      item_id: 13, // Sony Wireless Headphones (Found by Priya user 2)
      claimant_id: 1, // Alex (user 1)
      answer: 'Initials AS written in silver marker on inner headband with blue case sticker',
      message: 'Collected from security desk on Thursday',
      status: 'Returned',
      claim_code: 'FND-RET001',
      qr_code: null
    },
    {
      item_id: 14, // Silver Insulated Water Flask (Found by Priya user 2)
      claimant_id: 1, // Alex (user 1)
      answer: 'Small dent on bottom rim with black rubber seal ring',
      message: 'Collected at canteen security desk',
      status: 'Returned',
      claim_code: 'FND-RET002',
      qr_code: null
    },
    {
      item_id: 17, // Casio Scientific Calculator ClassWiz (Found by Rohan user 3)
      claimant_id: 1, // Alex (user 1)
      answer: 'Name "Rahul K." faintly written with pencil inside the slide cover',
      message: 'Left at terminal 14 after lab test',
      status: 'Pending',
      claim_code: 'FND-PEN003',
      qr_code: null
    },
    {
      item_id: 16, // Grey Wildcraft College Bag (Found by Rohan user 3)
      claimant_id: 2, // Priya (user 2)
      answer: 'Contains red spiral engineering mechanics notes and a SanDisk 32GB drive',
      message: 'Claim approved! Ready to collect at security desk',
      status: 'Approved',
      claim_code: 'FND-APP004',
      qr_code: approvedQrUrl
    }
  ];

  for (const c of claims) {
    run(`
      INSERT INTO claims (item_id, claimant_id, verification_answer, message, status, claim_code, qr_code, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [c.item_id, c.claimant_id, c.answer, c.message, c.status, c.claim_code, c.qr_code, now, now]);
  }

  // Pre-seed Notifications for Student 1, Student 2, and Student 3
  const notifications = [
    // Student 1 (Alex)
    {
      user_id: 1,
      title: 'Possible match found (94%)',
      message: 'A found item "Casio Scientific Calculator ClassWiz" matches your lost "Casio fx-991EX Scientific Calculator" at 94%!',
      link: '/smart-match.html',
      is_read: 0
    },
    {
      user_id: 1,
      title: 'Item Returned & Recovered! ✅',
      message: '"Sony WH-1000XM4 Wireless Earphones" has been handed over at security desk and marked Returned!',
      link: '/my-reports.html',
      is_read: 1
    },
    {
      user_id: 1,
      title: 'Item Returned & Recovered! ✅',
      message: '"Milton Thermosteel Water Bottle 750ml" has been handed over at security desk and marked Returned!',
      link: '/my-reports.html',
      is_read: 1
    },

    // Student 2 (Priya)
    {
      user_id: 2,
      title: 'Claim APPROVED! 🎉',
      message: 'Your claim for "Wildcraft Grey College Backpack" has been APPROVED. Your QR code is ready in My Reports!',
      link: '/my-reports.html#claims',
      is_read: 0
    },
    {
      user_id: 2,
      title: 'Possible match found (93%)',
      message: 'A found item "College Identity Card with Blue Strap" matches your lost "College ID Card - Student B.Tech CSE" at 93%!',
      link: '/smart-match.html',
      is_read: 0
    },
    {
      user_id: 2,
      title: 'Possible match found (90%)',
      message: 'A found item "White AirPods Charging Case" matches your lost "Apple AirPods Pro 2 Charging Case" at 90%!',
      link: '/smart-match.html',
      is_read: 0
    },

    // Student 3 (Rohan)
    {
      user_id: 3,
      title: 'Possible match found (85%)',
      message: 'A found item "Spiral Bound Notebook & Drafting Scale" matches your lost "Classmate Spiral Engineering Notebook & Scale" at 85%!',
      link: '/smart-match.html',
      is_read: 0
    },
    {
      user_id: 3,
      title: 'Possible match found (86%)',
      message: 'A found item "Compact Wireless Optical Mouse & Fast Charger" matches your lost "Logitech Wireless Mouse & Fast Charger" at 86%!',
      link: '/smart-match.html',
      is_read: 0
    }
  ];

  for (const n of notifications) {
    run(`
      INSERT INTO notifications (user_id, title, message, link, is_read, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [n.user_id, n.title, n.message, n.link, n.is_read, now]);
  }

  saveDb();
  console.log("Database seeded successfully with 3 students, 1 admin, 9 lost items (3 each), and 9 found items (3 each).");
}

module.exports = {
  getDb,
  initDb,
  query,
  get,
  run,
  exec,
  saveDb,
  seedInitialData
};

