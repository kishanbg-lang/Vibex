const express = require('express');
const session = require('express-session');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');
const QRCode = require('qrcode');

const { initDb, query, get, run, exec, saveDb } = require('./db');
const { calculateMatchScore, findAndSaveMatches, detectItemFromPhoto, CAMPUS_ADJACENCY } = require('./matcher');

const app = express();
const PORT = process.env.PORT || 3000;

// Ensure upload directory exists
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Multer storage configuration
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname).toLowerCase();
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'item-' + uniqueSuffix + ext);
  }
});
const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB max
});

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(session({
  secret: 'findit-campus-recovery-super-secure-key-2026',
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
  }
}));

// Static files
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(uploadDir));

// Auth Middleware Helper
function requireAuth(req, res, next) {
  if (!req.session || !req.session.user) {
    return res.status(401).json({ error: 'Please log in to continue.' });
  }
  next();
}

function requireAdmin(req, res, next) {
  if (!req.session || !req.session.user) {
    return res.status(401).json({ error: 'Please log in to continue.' });
  }
  if (req.session.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required.' });
  }
  next();
}

// ==========================================
// 1. AUTHENTICATION ROUTES
// ==========================================

// Register
app.post('/api/auth/register', (req, res) => {
  try {
    const { name, email, password, phone, role } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email, and password are required.' });
    }

    const trimmedEmail = email.trim().toLowerCase();
    const existing = get('SELECT id FROM users WHERE email = ?', [trimmedEmail]);
    if (existing) {
      return res.status(400).json({ error: 'An account with this email already exists.' });
    }

    const hashedPassword = bcrypt.hashSync(password, 10);
    const assignedRole = (role === 'admin') ? 'admin' : 'student';
    const now = new Date().toISOString();

    const { lastInsertRowid } = run(`
      INSERT INTO users (name, email, password, role, phone, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [name.trim(), trimmedEmail, hashedPassword, assignedRole, phone || '', now]);

    const user = {
      id: lastInsertRowid,
      name: name.trim(),
      email: trimmedEmail,
      role: assignedRole,
      phone: phone || ''
    };

    req.session.user = user;
    res.json({ success: true, user });
  } catch (err) {
    console.error('Registration error:', err);
    res.status(500).json({ error: 'Registration failed: ' + err.message });
  }
});

// Login
app.post('/api/auth/login', (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    const trimmedEmail = email.trim().toLowerCase();
    const user = get('SELECT * FROM users WHERE email = ?', [trimmedEmail]);
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const passwordMatch = bcrypt.compareSync(password, user.password);
    if (!passwordMatch) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const sessionUser = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      phone: user.phone
    };

    req.session.user = sessionUser;
    res.json({ success: true, user: sessionUser });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Login failed: ' + err.message });
  }
});

// Logout
app.post('/api/auth/logout', (req, res) => {
  req.session.destroy(() => {
    res.json({ success: true });
  });
});

// Current User
app.get('/api/auth/me', (req, res) => {
  if (req.session && req.session.user) {
    res.json({ user: req.session.user });
  } else {
    res.json({ user: null });
  }
});

// ==========================================
// 2. ITEMS ROUTES (REPORT, LIST, DETAILS)
// ==========================================

// Get All Items (with search, category, location, type, status filters)
app.get('/api/items', (req, res) => {
  try {
    const { search, type, category, location, status, user_id, limit } = req.query;
    let sql = `
      SELECT items.*, users.name as reporter_name, users.email as reporter_email
      FROM items
      LEFT JOIN users ON items.user_id = users.id
      WHERE 1=1
    `;
    const params = [];

    if (search && search.trim()) {
      sql += ` AND (items.title LIKE ? OR items.description LIKE ? OR items.color LIKE ?)`;
      const term = `%${search.trim()}%`;
      params.push(term, term, term);
    }
    if (type) {
      sql += ` AND items.type = ?`;
      params.push(type);
    }
    if (category) {
      sql += ` AND items.category = ?`;
      params.push(category);
    }
    if (location) {
      sql += ` AND items.location = ?`;
      params.push(location);
    }
    if (status) {
      sql += ` AND items.status = ?`;
      params.push(status);
    }
    if (user_id) {
      sql += ` AND items.user_id = ?`;
      params.push(parseInt(user_id, 10));
    }

    sql += ` ORDER BY items.id DESC`;

    if (limit) {
      sql += ` LIMIT ?`;
      params.push(parseInt(limit, 10));
    }

    const items = query(sql, params);

    // Privacy protection: hide private_detail from public if not admin or reporter
    const currentUserId = req.session?.user?.id;
    const isAdmin = req.session?.user?.role === 'admin';

    const sanitized = items.map(item => {
      const copy = { ...item };
      if (copy.type === 'found' && !isAdmin && copy.user_id !== currentUserId) {
        delete copy.private_detail;
      }
      return copy;
    });

    res.json(sanitized);
  } catch (err) {
    console.error('Fetch items error:', err);
    res.status(500).json({ error: 'Failed to fetch items' });
  }
});

// Get Single Item Details
app.get('/api/items/:id', (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const item = get(`
      SELECT items.*, users.name as reporter_name, users.email as reporter_email, users.phone as reporter_phone
      FROM items
      LEFT JOIN users ON items.user_id = users.id
      WHERE items.id = ?
    `, [id]);

    if (!item) {
      return res.status(404).json({ error: 'Item not found' });
    }

    // Privacy protection
    const currentUserId = req.session?.user?.id;
    const isAdmin = req.session?.user?.role === 'admin';
    if (item.type === 'found' && !isAdmin && item.user_id !== currentUserId) {
      delete item.private_detail;
    }

    // Also fetch matches involving this item
    const matches = query(`
      SELECT matches.*,
             lost.title as lost_title, lost.category as lost_category, lost.location as lost_location, lost.image_url as lost_image,
             found.title as found_title, found.category as found_category, found.location as found_location, found.image_url as found_image
      FROM matches
      JOIN items lost ON matches.lost_item_id = lost.id
      JOIN items found ON matches.found_item_id = found.id
      WHERE matches.lost_item_id = ? OR matches.found_item_id = ?
      ORDER BY matches.score DESC
    `, [id, id]);

    res.json({ item, matches });
  } catch (err) {
    console.error('Item details error:', err);
    res.status(500).json({ error: 'Failed to retrieve item' });
  }
});

// Create Lost or Found Report
app.post('/api/items', requireAuth, upload.single('photo'), async (req, res) => {
  try {
    const {
      type,
      title,
      category,
      description,
      color,
      location,
      date_lost_or_found,
      current_location_desc,
      private_detail
    } = req.body;

    if (!type || !title || !category || !description || !color || !location || !date_lost_or_found) {
      return res.status(400).json({ error: 'All primary fields are required.' });
    }

    let imageUrl = null;
    if (req.file) {
      imageUrl = '/uploads/' + req.file.filename;
    } else {
      // Default SVG based on category
      const catLower = category.toLowerCase().replace(/\s+/g, '');
      const defaultMap = {
        earphones: '/images/sample-earphones.svg',
        calculator: '/images/sample-calculator.svg',
        idcard: '/images/sample-idcard.svg',
        bottle: '/images/sample-bottle.svg',
        bag: '/images/sample-bag.svg',
        keys: '/images/sample-keys.svg',
        wallet: '/images/sample-wallet.svg',
        electronicdevices: '/images/sample-electronics.svg',
        electronics: '/images/sample-electronics.svg',
        stationery: '/images/sample-stationery.svg',
        stationeryitems: '/images/sample-stationery.svg',
        clothing: '/images/sample-clothing.svg',
        clothingwearables: '/images/sample-clothing.svg',
        other: '/images/sample-other.svg',
        otheritems: '/images/sample-other.svg'
      };
      imageUrl = defaultMap[catLower] || '/images/default-item.svg';
    }

    const now = new Date().toISOString();
    const userId = req.session.user.id;

    const { lastInsertRowid } = run(`
      INSERT INTO items (
        type, title, category, description, color, location,
        date_lost_or_found, image_url, current_location_desc,
        private_detail, status, user_id, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Open', ?, ?)
    `, [
      type,
      title.trim(),
      category.trim(),
      description.trim(),
      color.trim(),
      location.trim(),
      date_lost_or_found,
      imageUrl,
      type === 'found' ? (current_location_desc || 'with me') : null,
      type === 'found' ? (private_detail || '').trim() : null,
      userId,
      now
    ]);

    const createdItem = get('SELECT * FROM items WHERE id = ?', [lastInsertRowid]);

    // Run AI Smart Matcher against opposite type
    const matches = findAndSaveMatches(createdItem, { query, get, run, exec });

    res.json({
      success: true,
      item: createdItem,
      matchesFound: matches.length,
      matches
    });
  } catch (err) {
    console.error('Create item error:', err);
    res.status(500).json({ error: 'Failed to create report: ' + err.message });
  }
});

// Update item status (Admin or owner)
app.patch('/api/items/:id/status', requireAuth, (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const { status } = req.body;
    const item = get('SELECT * FROM items WHERE id = ?', [id]);
    if (!item) return res.status(404).json({ error: 'Item not found' });

    if (req.session.user.role !== 'admin' && item.user_id !== req.session.user.id) {
      return res.status(403).json({ error: 'Not authorized.' });
    }

    run('UPDATE items SET status = ? WHERE id = ?', [status, id]);
    res.json({ success: true, status });
  } catch (err) {
    console.error('Update status error:', err);
    res.status(500).json({ error: 'Failed to update item status' });
  }
});

// Delete item (Admin or owner)
app.delete('/api/items/:id', requireAuth, (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const item = get('SELECT * FROM items WHERE id = ?', [id]);
    if (!item) return res.status(404).json({ error: 'Item not found' });

    if (req.session.user.role !== 'admin' && item.user_id !== req.session.user.id) {
      return res.status(403).json({ error: 'Not authorized.' });
    }

    // Clean up matches and claims
    run('DELETE FROM matches WHERE lost_item_id = ? OR found_item_id = ?', [id, id]);
    run('DELETE FROM claims WHERE item_id = ?', [id]);
    run('DELETE FROM items WHERE id = ?', [id]);

    res.json({ success: true });
  } catch (err) {
    console.error('Delete item error:', err);
    res.status(500).json({ error: 'Failed to delete item' });
  }
});

// ==========================================
// 3. SMART MATCHES ROUTES
// ==========================================

// Get All Smart Matches (or user specific)
app.get('/api/matches', (req, res) => {
  try {
    const { userId, matchId } = req.query;
    let sql = `
      SELECT matches.*,
             lost.title as lost_title, lost.category as lost_category, lost.description as lost_desc,
             lost.color as lost_color, lost.location as lost_location, lost.date_lost_or_found as lost_date,
             lost.image_url as lost_image, lost.status as lost_status, lost.user_id as lost_user_id,
             lost_u.name as lost_owner_name,
             found.title as found_title, found.category as found_category, found.description as found_desc,
             found.color as found_color, found.location as found_location, found.date_lost_or_found as found_date,
             found.image_url as found_image, found.status as found_status, found.user_id as found_user_id,
             found.current_location_desc as found_where_now,
             found_u.name as found_finder_name
      FROM matches
      JOIN items lost ON matches.lost_item_id = lost.id
      JOIN items found ON matches.found_item_id = found.id
      LEFT JOIN users lost_u ON lost.user_id = lost_u.id
      LEFT JOIN users found_u ON found.user_id = found_u.id
      WHERE 1=1
    `;
    const params = [];

    if (matchId) {
      sql += ` AND matches.id = ?`;
      params.push(parseInt(matchId, 10));
    } else if (userId) {
      sql += ` AND (lost.user_id = ? OR found.user_id = ?)`;
      const uid = parseInt(userId, 10);
      params.push(uid, uid);
    }

    sql += ` ORDER BY matches.score DESC, matches.id DESC`;

    const matches = query(sql, params);
    res.json(matches);
  } catch (err) {
    console.error('Matches fetch error:', err);
    res.status(500).json({ error: 'Failed to fetch matches' });
  }
});

// Trigger full re-matching (helpful for testing & admin)
app.post('/api/matches/recalculate', requireAdmin, (req, res) => {
  try {
    const lostItems = query("SELECT * FROM items WHERE type = 'lost' AND status != 'Returned'");
    let count = 0;
    for (const item of lostItems) {
      const m = findAndSaveMatches(item, { query, get, run, exec });
      count += m.length;
    }
    res.json({ success: true, matchesGenerated: count });
  } catch (err) {
    res.status(500).json({ error: 'Recalculation failed: ' + err.message });
  }
});

// ==========================================
// 4. NOTIFICATIONS ROUTES
// ==========================================

// Get Notifications for Current User
app.get('/api/notifications', requireAuth, (req, res) => {
  try {
    const userId = req.session.user.id;
    const notifications = query(`
      SELECT * FROM notifications
      WHERE user_id = ?
      ORDER BY id DESC
      LIMIT 30
    `, [userId]);

    const unreadCountRow = get(`
      SELECT COUNT(*) as unread FROM notifications
      WHERE user_id = ? AND is_read = 0
    `, [userId]);

    res.json({
      notifications,
      unreadCount: unreadCountRow ? unreadCountRow.unread : 0
    });
  } catch (err) {
    console.error('Notification error:', err);
    res.status(500).json({ error: 'Failed to fetch notifications' });
  }
});

// Mark all as read
app.post('/api/notifications/mark-read', requireAuth, (req, res) => {
  try {
    const userId = req.session.user.id;
    run(`UPDATE notifications SET is_read = 1 WHERE user_id = ?`, [userId]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update notifications' });
  }
});

// Clear/Delete ALL notifications for current user
app.delete('/api/notifications', requireAuth, (req, res) => {
  try {
    const userId = req.session.user.id;
    run(`DELETE FROM notifications WHERE user_id = ?`, [userId]);
    res.json({ success: true, message: 'All notifications cleared.' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to clear notifications' });
  }
});

// Also support POST /api/notifications/clear
app.post('/api/notifications/clear', requireAuth, (req, res) => {
  try {
    const userId = req.session.user.id;
    run(`DELETE FROM notifications WHERE user_id = ?`, [userId]);
    res.json({ success: true, message: 'All notifications cleared.' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to clear notifications' });
  }
});

// Clear/Delete a single notification by ID
app.delete('/api/notifications/:id', requireAuth, (req, res) => {
  try {
    const userId = req.session.user.id;
    const notifId = parseInt(req.params.id, 10);
    run(`DELETE FROM notifications WHERE id = ? AND user_id = ?`, [notifId, userId]);
    res.json({ success: true, message: 'Notification dismissed.' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete notification' });
  }
});

// Mark single notification as read
app.post('/api/notifications/:id/read', requireAuth, (req, res) => {
  try {
    const userId = req.session.user.id;
    const notifId = parseInt(req.params.id, 10);
    run(`UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?`, [notifId, userId]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update notification' });
  }
});

// ==========================================
// 5. CLAIMS & VERIFICATION ROUTES
// ==========================================

// Submit a Claim for a Found Item
app.post('/api/claims', requireAuth, (req, res) => {
  try {
    const { item_id, verification_answer, message } = req.body;
    if (!item_id || !verification_answer) {
      return res.status(400).json({ error: 'Item ID and verification answer are required.' });
    }

    const item = get('SELECT * FROM items WHERE id = ?', [parseInt(item_id, 10)]);
    if (!item) {
      return res.status(404).json({ error: 'Found item not found' });
    }
    if (item.type !== 'found') {
      return res.status(400).json({ error: 'Claims can only be filed on found items.' });
    }

    const claimantId = req.session.user.id;

    // Security check: A user cannot claim an item they reported finding themselves
    if (item.user_id === claimantId) {
      return res.status(400).json({ error: 'You cannot claim an item that you reported finding yourself.' });
    }

    // Check if claimant already has an active claim on this item
    const existingClaim = get(`
      SELECT id FROM claims 
      WHERE item_id = ? AND claimant_id = ? AND status != 'Rejected'
    `, [item.id, claimantId]);
    if (existingClaim) {
      return res.status(400).json({ error: 'You have already submitted an active claim for this item.' });
    }
    const now = new Date().toISOString();

    // Unique Claim code e.g. "FND-94A2B"
    const randomHex = Math.random().toString(16).substring(2, 7).toUpperCase();
    const claimCode = `FND-${item.id}${randomHex}`;

    const { lastInsertRowid } = run(`
      INSERT INTO claims (item_id, claimant_id, verification_answer, message, status, claim_code, created_at, updated_at)
      VALUES (?, ?, ?, ?, 'Pending', ?, ?, ?)
    `, [item.id, claimantId, verification_answer.trim(), message ? message.trim() : '', claimCode, now, now]);

    // Update item status to 'Claim Pending'
    run(`UPDATE items SET status = 'Claim Pending' WHERE id = ?`, [item.id]);

    // Notify finder
    run(`
      INSERT INTO notifications (user_id, title, message, link, is_read, created_at)
      VALUES (?, ?, ?, ?, 0, ?)
    `, [
      item.user_id,
      'New Claim Submitted',
      `A student claimed your found item "${item.title}". Verify their answer!`,
      '/admin.html#claims',
      now
    ]);

    // Notify admin
    const admins = query("SELECT id FROM users WHERE role = 'admin'");
    for (const admin of admins) {
      if (admin.id !== item.user_id) {
        run(`
          INSERT INTO notifications (user_id, title, message, link, is_read, created_at)
          VALUES (?, ?, ?, ?, 0, ?)
        `, [
          admin.id,
          'New Claim for Verification',
          `Claim submitted for item "${item.title}" by student.`,
          '/admin.html#claims',
          now
        ]);
      }
    }

    res.json({
      success: true,
      claimId: lastInsertRowid,
      claimCode
    });
  } catch (err) {
    console.error('Submit claim error:', err);
    res.status(500).json({ error: 'Claim submission failed: ' + err.message });
  }
});

// Get Claims
app.get('/api/claims', requireAuth, (req, res) => {
  try {
    const userId = req.session.user.id;
    const isAdmin = req.session.user.role === 'admin';

    let sql = `
      SELECT claims.*,
             items.title as item_title, items.category as item_category, items.location as item_location,
             items.color as item_color, items.date_lost_or_found as item_date,
             items.description as item_description,
             items.image_url as item_image, items.private_detail as item_private_detail,
             items.current_location_desc as item_where_now, items.user_id as finder_user_id,
             claimant.name as claimant_name, claimant.email as claimant_email, claimant.phone as claimant_phone,
             finder.name as finder_name, finder.email as finder_email, finder.phone as finder_phone,
             finder.role as finder_role
      FROM claims
      JOIN items ON claims.item_id = items.id
      JOIN users claimant ON claims.claimant_id = claimant.id
      LEFT JOIN users finder ON items.user_id = finder.id
      WHERE 1=1
    `;
    const params = [];

    if (!isAdmin) {
      // Students can see claims they made OR claims on items they found
      sql += ` AND (claims.claimant_id = ? OR items.user_id = ?)`;
      params.push(userId, userId);
    }

    sql += ` ORDER BY claims.id DESC`;

    const claims = query(sql, params);

    // If claimant is viewing and is not admin or finder, don't expose stored private_detail
    const sanitized = claims.map(c => {
      const copy = { ...c };
      if (!isAdmin && copy.finder_user_id !== userId) {
        delete copy.item_private_detail;
      }
      return copy;
    });

    res.json(sanitized);
  } catch (err) {
    console.error('Get claims error:', err);
    res.status(500).json({ error: 'Failed to retrieve claims' });
  }
});

// Review Claim (Approve / Reject)
app.post('/api/claims/:id/review', requireAuth, async (req, res) => {
  try {
    const claimId = parseInt(req.params.id, 10);
    const { action, reason } = req.body; // 'approve', 'reject', or 'reopen'

    if (!['approve', 'reject', 'reopen'].includes(action)) {
      return res.status(400).json({ error: "Action must be 'approve', 'reject', or 'reopen'." });
    }

    const claim = get(`
      SELECT claims.*, items.title as item_title, items.user_id as finder_id
      FROM claims
      JOIN items ON claims.item_id = items.id
      WHERE claims.id = ?
    `, [claimId]);

    if (!claim) return res.status(404).json({ error: 'Claim not found' });

    // Authorization: only Admin or the finder can review
    if (req.session.user.role !== 'admin' && req.session.user.id !== claim.finder_id) {
      return res.status(403).json({ error: 'Not authorized to review this claim.' });
    }

    const now = new Date().toISOString();

    if (action === 'approve') {
      // Generate QR Code data URL with claim code
      const qrPayload = JSON.stringify({
        claim_code: claim.claim_code,
        item_id: claim.item_id,
        item_title: claim.item_title,
        claimant_id: claim.claimant_id,
        system: "FINDIT Campus Recovery"
      });

      const qrCodeDataUrl = await QRCode.toDataURL(qrPayload, {
        width: 300,
        margin: 2,
        color: {
          dark: '#1e3a8a',
          light: '#ffffff'
        }
      });

      run(`
        UPDATE claims
        SET status = 'Approved', qr_code = ?, updated_at = ?
        WHERE id = ?
      `, [qrCodeDataUrl, now, claimId]);

      run(`UPDATE items SET status = 'Approved' WHERE id = ?`, [claim.item_id]);

      // Notify claimant with celebration notification
      run(`
        INSERT INTO notifications (user_id, title, message, link, is_read, created_at)
        VALUES (?, ?, ?, ?, 0, ?)
      `, [
        claim.claimant_id,
        'Claim APPROVED! 🎉',
        `Your claim for "${claim.item_title}" has been APPROVED. Your QR code is ready in My Reports!`,
        '/my-reports.html#claims',
        now
      ]);

      res.json({
        success: true,
        status: 'Approved',
        qr_code: qrCodeDataUrl,
        claim_code: claim.claim_code
      });
    } else if (action === 'reopen') {
      // Re-open claim back to Pending
      run(`UPDATE claims SET status = 'Pending', updated_at = ? WHERE id = ?`, [now, claimId]);
      run(`UPDATE items SET status = 'Claim Pending' WHERE id = ?`, [claim.item_id]);

      run(`
        INSERT INTO notifications (user_id, title, message, link, is_read, created_at)
        VALUES (?, ?, ?, ?, 0, ?)
      `, [
        claim.claimant_id,
        'Claim Re-Opened',
        `Your claim for "${claim.item_title}" has been moved back to Pending Review for reconsideration.`,
        '/my-reports.html#claims',
        now
      ]);

      res.json({ success: true, status: 'Pending' });
    } else {
      // Rejected
      run(`UPDATE claims SET status = 'Rejected', updated_at = ? WHERE id = ?`, [now, claimId]);
      run(`UPDATE items SET status = 'Open' WHERE id = ?`, [claim.item_id]);

      const note = reason && reason.trim() ? ` Note from Admin: "${reason.trim()}"` : ' Please verify your identifying details.';

      run(`
        INSERT INTO notifications (user_id, title, message, link, is_read, created_at)
        VALUES (?, ?, ?, ?, 0, ?)
      `, [
        claim.claimant_id,
        'Claim Update',
        `Your claim for "${claim.item_title}" was not approved.${note}`,
        '/my-reports.html#claims',
        now
      ]);

      res.json({ success: true, status: 'Rejected' });
    }
  } catch (err) {
    console.error('Review claim error:', err);
    res.status(500).json({ error: 'Review failed: ' + err.message });
  }
});

// Security Desk / Admin: Mark Returned by Claim Code or QR Scan
app.post('/api/claims/return', requireAdmin, (req, res) => {
  try {
    let { claim_code } = req.body;
    if (!claim_code) {
      return res.status(400).json({ error: 'Claim code is required.' });
    }

    claim_code = claim_code.trim();

    // In case the input was raw JSON from QR scan
    if (claim_code.startsWith('{')) {
      try {
        const parsed = JSON.parse(claim_code);
        if (parsed.claim_code) claim_code = parsed.claim_code;
      } catch (e) {}
    }

    const claim = get(`
      SELECT claims.*, items.title as item_title
      FROM claims
      JOIN items ON claims.item_id = items.id
      WHERE claims.claim_code = ?
    `, [claim_code]);

    if (!claim) {
      return res.status(404).json({ error: `No claim found with code "${claim_code}".` });
    }

    if (claim.status === 'Returned') {
      return res.status(400).json({ error: 'This item has already been marked as Returned!' });
    }

    if (claim.status !== 'Approved') {
      return res.status(400).json({ error: `Cannot return: Claim status is currently "${claim.status}". Only Approved claims can be marked Returned.` });
    }

    const now = new Date().toISOString();

    run(`UPDATE claims SET status = 'Returned', updated_at = ? WHERE id = ?`, [now, claim.id]);
    run(`UPDATE items SET status = 'Returned' WHERE id = ?`, [claim.item_id]);

    // Notify claimant
    run(`
      INSERT INTO notifications (user_id, title, message, link, is_read, created_at)
      VALUES (?, ?, ?, ?, 0, ?)
    `, [
      claim.claimant_id,
      'Item Returned & Recovered! ✅',
      `"${claim.item_title}" has been handed over at security desk and marked Returned!`,
      '/my-reports.html',
      now
    ]);

    res.json({
      success: true,
      message: `Item "${claim.item_title}" marked as Returned successfully!`,
      claim
    });
  } catch (err) {
    console.error('Return item error:', err);
    res.status(500).json({ error: 'Failed to process return: ' + err.message });
  }
});

// ==========================================
// 6. CAMPUS MAP & STATS ROUTES
// ==========================================

app.get('/api/stats', (req, res) => {
  try {
    const totalLostRow = get("SELECT COUNT(*) as count FROM items WHERE type = 'lost'");
    const totalFoundRow = get("SELECT COUNT(*) as count FROM items WHERE type = 'found'");
    const matchesRow = get("SELECT COUNT(*) as count FROM matches WHERE score >= 50");
    const returnedRow = get("SELECT COUNT(*) as count FROM items WHERE status = 'Returned'");

    const totalLost = totalLostRow ? totalLostRow.count : 0;
    const totalFound = totalFoundRow ? totalFoundRow.count : 0;
    const matchesMade = matchesRow ? matchesRow.count : 0;
    const itemsReturned = returnedRow ? returnedRow.count : 0;

    const totalReports = totalLost + totalFound;
    const recoveryRate = totalReports > 0 ? Math.round((itemsReturned / totalReports) * 100) : 0;

    // Reports count by location for Chart.js and Map Heatmap
    const zones = ['Library', 'Canteen', 'Computer Lab', 'Main Block', 'Hostel', 'Sports Ground', 'Parking', 'Auditorium'];
    const locationStats = {};

    zones.forEach(z => {
      locationStats[z] = { lost: 0, found: 0, total: 0 };
    });

    const locationRows = query(`
      SELECT location, type, COUNT(*) as count
      FROM items
      GROUP BY location, type
    `);

    locationRows.forEach(r => {
      if (locationStats[r.location]) {
        if (r.type === 'lost') locationStats[r.location].lost = r.count;
        if (r.type === 'found') locationStats[r.location].found = r.count;
        locationStats[r.location].total += r.count;
      }
    });

    res.json({
      totalLost,
      totalFound,
      matchesMade,
      itemsReturned,
      recoveryRate,
      locationStats
    });
  } catch (err) {
    console.error('Stats error:', err);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

// ==========================================
// 7. AI ASSISTANT (PHASE 5a)
// ==========================================

app.post('/api/assistant/query', (req, res) => {
  try {
    const { query: userQuery } = req.body;
    if (!userQuery || !userQuery.trim()) {
      return res.status(400).json({ error: 'Query is required' });
    }

    const text = userQuery.toLowerCase();
    const categories = [
      { key: 'id card', patterns: ['id card', 'college id', 'identity card', 'smart card'] },
      { key: 'earphones', patterns: ['earphones', 'headphones', 'airpod', 'earbuds', 'headset', 'neckband'] },
      { key: 'electronic devices', patterns: ['electronic', 'electronics', 'device', 'laptop', 'tablet', 'ipad', 'smartwatch', 'watch', 'charger', 'powerbank', 'power bank', 'usb', 'mouse'] },
      { key: 'calculator', patterns: ['calculator', 'casio', 'scientific calculator', 'fx-991'] },
      { key: 'stationery', patterns: ['stationery', 'stationary', 'notebook', 'notes', 'book', 'textbook', 'pen', 'pencil', 'geometry box', 'compass', 'ruler', 'scale'] },
      { key: 'bottle', patterns: ['bottle', 'flask', 'sipper', 'water bottle'] },
      { key: 'bag', patterns: ['bag', 'backpack', 'pouch', 'sack'] },
      { key: 'keys', patterns: ['key', 'keys', 'keychain'] },
      { key: 'wallet', patterns: ['wallet', 'purse', 'cardholder'] },
      { key: 'clothing', patterns: ['clothing', 'jacket', 'hoodie', 'umbrella', 'spectacles', 'glasses', 'sweater'] },
      { key: 'other', patterns: ['other'] }
    ];
    const locations = ['library', 'canteen', 'computer lab', 'main block', 'hostel', 'sports ground', 'parking', 'auditorium'];

    let matchedCategory = null;
    let matchedLocation = null;
    let matchedType = null;

    if (text.includes('lost') || text.includes('missing') || text.includes('left my')) {
      matchedType = 'lost';
    } else if (text.includes('found') || text.includes('picked up') || text.includes('someone turned in')) {
      matchedType = 'found';
    }

    for (const c of categories) {
      if (c.patterns.some(p => text.includes(p))) {
        matchedCategory = c.key;
        break;
      }
    }

    for (const loc of locations) {
      if (text.includes(loc)) {
        matchedLocation = loc;
        break;
      }
    }

    // Build intelligent SQL query
    let sql = `SELECT * FROM items WHERE status != 'Returned'`;
    const params = [];

    if (matchedType) {
      sql += ` AND type = ?`;
      params.push(matchedType);
    }
    if (matchedCategory) {
      sql += ` AND LOWER(category) LIKE ?`;
      params.push(`%${matchedCategory}%`);
    }
    if (matchedLocation) {
      sql += ` AND LOWER(location) LIKE ?`;
      params.push(`%${matchedLocation}%`);
    }

    sql += ` ORDER BY id DESC LIMIT 5`;

    let results = query(sql, params);

    // If specific filters yielded nothing, try flexible keyword search
    if (results.length === 0) {
      const keywords = text.replace(/[^a-z0-9 ]/g, '').split(' ').filter(w => w.length > 3);
      if (keywords.length > 0) {
        const likeClauses = keywords.map(() => `(LOWER(title) LIKE ? OR LOWER(description) LIKE ?)`).join(' OR ');
        const likeParams = [];
        keywords.forEach(k => {
          likeParams.push(`%${k}%`, `%${k}%`);
        });
        results = query(`SELECT * FROM items WHERE status != 'Returned' AND (${likeClauses}) LIMIT 5`, likeParams);
      }
    }

    let reply = "";
    if (results.length > 0) {
      reply = `I found ${results.length} relevant report(s) on campus matching your query!`;
    } else {
      reply = `I couldn't find an exact open match for that right now. Try reporting it using our Report Lost/Found forms, and our AI will continuously search and alert you!`;
    }

    res.json({
      reply,
      parsed: {
        category: matchedCategory,
        location: matchedLocation,
        type: matchedType
      },
      results
    });
  } catch (err) {
    console.error('Assistant query error:', err);
    res.status(500).json({ error: 'Assistant failed to process query' });
  }
});

// Photo Classification Endpoint (optional Anthropic integration)
app.post('/api/ai/classify-image', upload.single('photo'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No image uploaded' });
    }
    const detected = await detectItemFromPhoto(req.file.path);
    res.json({
      success: true,
      detected: detected || null,
      imageUrl: '/uploads/' + req.file.filename
    });
  } catch (err) {
    res.json({ success: false, detected: null });
  }
});

// Fallback: serve index.html for root
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start Server and Initialize DB
async function startServer() {
  await initDb();
  app.listen(PORT, () => {
    console.log(`====================================================`);
    console.log(`  FINDIT - Smart Campus Recovery System is running!`);
    console.log(`  Port: http://localhost:${PORT}`);
    console.log(`  Default Students: student1@college.edu / student123`);
    console.log(`                    student2@college.edu / student123`);
    console.log(`                    student3@college.edu / student123`);
    console.log(`  Default Admin:    admin@college.edu / admin123`);
    console.log(`====================================================`);
  });
}

startServer().catch(err => {
  console.error('Failed to start server:', err);
  process.exit(1);
});

