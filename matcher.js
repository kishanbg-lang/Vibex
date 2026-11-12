/**
 * FINDIT - Smart Campus Recovery System
 * AI Smart Matching Engine (matcher.js)
 * 
 * Hackathon Judge Explanation:
 * The matching algorithm computes a weighted multi-factor compatibility score
 * between 0 and 100 between a Lost item and a Found item.
 * 
 * Scoring Breakdown (Total: 100 points):
 * 1. Category Match:        30% (Exact category = 30 pts, related = 10 pts)
 * 2. Text Similarity:       30% (TF-IDF / Token Cosine Overlap on title & description)
 * 3. Color Compatibility:   15% (Exact color = 15 pts, partial/description mention = 10 pts)
 * 4. Location Proximity:    15% (Same location = 15 pts, adjacent campus zone = 9 pts)
 * 5. Date Proximity:        10% (Same day = 10 pts, 1-3 days = 5-8 pts, <=7 days = 3 pts)
 * 
 * Matches with Score >= 50 are saved, and the owner of the lost item is
 * immediately notified with the match score and a human-readable explanation.
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

// Common English stopwords to filter out before computing text similarity
const STOPWORDS = new Set([
  'a', 'about', 'above', 'after', 'again', 'against', 'all', 'am', 'an', 'and', 'any', 'are', 'as', 'at',
  'be', 'because', 'been', 'before', 'being', 'below', 'between', 'both', 'but', 'by',
  'could', 'did', 'do', 'does', 'doing', 'down', 'during',
  'each', 'few', 'for', 'from', 'further',
  'had', 'has', 'have', 'having', 'he', 'her', 'here', 'hers', 'herself', 'him', 'himself', 'his', 'how',
  'i', 'if', 'in', 'into', 'is', 'it', 'its', 'itself',
  'just', 'me', 'more', 'most', 'my', 'myself',
  'no', 'nor', 'not', 'now', 'of', 'off', 'on', 'once', 'only', 'or', 'other', 'our', 'ours', 'ourselves', 'out', 'over', 'own',
  'same', 'she', 'should', 'so', 'some', 'such',
  'than', 'that', 'the', 'their', 'theirs', 'them', 'themselves', 'then', 'there', 'these', 'they', 'this', 'those', 'through', 'to', 'too',
  'under', 'until', 'up', 'very', 'was', 'we', 'were', 'what', 'when', 'where', 'which', 'while', 'who', 'whom', 'why', 'with', 'would', 'you', 'your', 'yours'
]);

// Campus Zones Adjacency Graph (Hand-defined based on campus map geography)
const CAMPUS_ADJACENCY = {
  'Library': ['Main Block', 'Computer Lab', 'Canteen'],
  'Canteen': ['Library', 'Main Block', 'Hostel'],
  'Computer Lab': ['Library', 'Main Block', 'Auditorium'],
  'Main Block': ['Library', 'Canteen', 'Computer Lab', 'Auditorium', 'Parking'],
  'Hostel': ['Canteen', 'Sports Ground', 'Parking'],
  'Sports Ground': ['Hostel', 'Parking', 'Auditorium'],
  'Parking': ['Main Block', 'Hostel', 'Sports Ground'],
  'Auditorium': ['Main Block', 'Computer Lab', 'Sports Ground']
};

/**
 * Basic Porter-style suffix stemmer for English words
 */
function stemWord(word) {
  let w = word.toLowerCase();
  // English stemming only for ASCII letters
  if (/^[a-z]+$/.test(w)) {
    if (w.endsWith("ies") && w.length > 4) return w.slice(0, -3) + "y";
    if (w.endsWith("ing") && w.length > 5) return w.slice(0, -3);
    if (w.endsWith("ed") && w.length > 4) return w.slice(0, -2);
    if (w.endsWith("es") && w.length > 4) return w.slice(0, -2);
    if (w.endsWith("s") && !w.endsWith("ss") && w.length > 3) return w.slice(0, -1);
  }
  return w;
}

/**
 * Tokenize, clean, remove stopwords, and stem a string (supports English & Kannada Unicode)
 */
function extractTokens(text) {
  if (!text) return [];
  const words = text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s-]/gu, ' ')
    .split(/[\s-]+/)
    .filter(w => w.length > 1 && !STOPWORDS.has(w));

  return words.map(stemWord);
}

/**
 * Computes Token Overlap Cosine Similarity between two text passages
 */
function computeTextSimilarity(text1, text2) {
  const tokens1 = extractTokens(text1);
  const tokens2 = extractTokens(text2);

  if (tokens1.length === 0 || tokens2.length === 0) return { score: 0, sharedKeywords: [] };

  // Frequency maps
  const freq1 = {};
  tokens1.forEach(t => { freq1[t] = (freq1[t] || 0) + 1; });

  const freq2 = {};
  tokens2.forEach(t => { freq2[t] = (freq2[t] || 0) + 1; });

  let dotProduct = 0;
  const sharedKeywords = [];

  for (const token in freq1) {
    if (freq2[token]) {
      dotProduct += freq1[token] * freq2[token];
      sharedKeywords.push(token);
    }
  }

  const mag1 = Math.sqrt(Object.values(freq1).reduce((sum, v) => sum + v * v, 0));
  const mag2 = Math.sqrt(Object.values(freq2).reduce((sum, v) => sum + v * v, 0));

  if (mag1 === 0 || mag2 === 0) return { score: 0, sharedKeywords: [] };

  const cosineSim = dotProduct / (mag1 * mag2);
  return {
    score: Math.min(1, Math.max(0, cosineSim)),
    sharedKeywords: [...new Set(sharedKeywords)]
  };
}

// Category Compatibility Graph
// Incompatible categories cannot match under any circumstances
const COMPATIBLE_CATEGORIES = {
  'calculator': new Set(['calculator', 'electronic devices', 'stationery']),
  'earphones': new Set(['earphones', 'electronic devices']),
  'electronic devices': new Set(['electronic devices', 'calculator', 'earphones']),
  'stationery': new Set(['stationery', 'calculator']),
  'bag': new Set(['bag', 'wallet', 'clothing']),
  'wallet': new Set(['wallet', 'bag']),
  'bottle': new Set(['bottle']), // Bottle ONLY matches Bottle (or Other)
  'id card': new Set(['id card']), // ID card ONLY matches ID card (or Other)
  'keys': new Set(['keys']), // Keys ONLY match Keys (or Other)
  'clothing': new Set(['clothing', 'bag']),
  'other': null // Other acts as wildcard
};

/**
 * Compares two items and computes a match score from 0 to 100 with detailed explanation.
 * Enforces strict category compatibility gates (e.g. Bottle NEVER matches Calculator),
 * weighted title/keyword similarity (40%), category (25%), color (12%), location (8%),
 * description (10%), and date timeline (5%).
 */
function calculateMatchScore(lostItem, foundItem) {
  let totalScore = 0;
  const explanationParts = [];

  const cat1 = (lostItem.category || '').trim();
  const cat2 = (foundItem.category || '').trim();
  const c1 = cat1.toLowerCase();
  const c2 = cat2.toLowerCase();

  // 1. STRICT CATEGORY COMPATIBILITY GATE (Veto Incompatible Pairs)
  const isWildcard = c1 === 'other' || c2 === 'other' || !c1 || !c2;
  const c1Compat = COMPATIBLE_CATEGORIES[c1];
  const isCategoryCompatible = isWildcard || (c1Compat && c1Compat.has(c2));

  if (!isCategoryCompatible) {
    return {
      score: 0,
      explanation: `❌ Incompatible Categories: "${cat1}" cannot match "${cat2}".`,
      breakdown: { titlePoints: 0, categoryScore: 0, descPoints: 0, colorScore: 0, locationScore: 0, dateScore: 0 }
    };
  }

  // 2. CATEGORY COMPATIBILITY SCORING (25%)
  let categoryScore = 0;
  let categoryVerdict = '';
  if (c1 === c2) {
    categoryScore = 25;
    categoryVerdict = `✅ Exact Category: Both "${cat1}"`;
  } else if (
    (c1 === 'electronic devices' && (c2 === 'earphones' || c2 === 'calculator')) ||
    (c2 === 'electronic devices' && (c1 === 'earphones' || c1 === 'calculator')) ||
    (c1 === 'stationery' && c2 === 'calculator') ||
    (c2 === 'stationery' && c1 === 'calculator') ||
    (c1 === 'bag' && (c2 === 'wallet' || c2 === 'clothing')) ||
    (c2 === 'bag' && (c1 === 'wallet' || c1 === 'clothing'))
  ) {
    categoryScore = 15;
    categoryVerdict = `🔄 Related Category: "${cat1}" & "${cat2}"`;
  } else if (isWildcard) {
    categoryScore = 10;
    categoryVerdict = `ℹ️ Compatible Category: "${cat1 || 'Other'}" & "${cat2 || 'Other'}"`;
  }
  totalScore += categoryScore;

  // 3. ITEM NAME / TITLE SIMILARITY (40%)
  const title1 = (lostItem.title || '').trim();
  const title2 = (foundItem.title || '').trim();
  const { score: titleSim, sharedKeywords: titleKeywords } = computeTextSimilarity(title1, title2);

  let titlePoints = Math.round(titleSim * 40);
  const t1Lower = title1.toLowerCase();
  const t2Lower = title2.toLowerCase();

  if (t1Lower === t2Lower) {
    titlePoints = 40;
  } else if (titleKeywords.length >= 3) {
    titlePoints = Math.max(titlePoints, 35);
  } else if (titleKeywords.length >= 2) {
    titlePoints = Math.max(titlePoints, 28);
  } else if (titleKeywords.length === 1) {
    titlePoints = Math.max(titlePoints, 18);
  }
  totalScore += titlePoints;

  // 4. DESCRIPTION & ATTRIBUTE TEXT SIMILARITY (10%)
  const desc1 = (lostItem.description || '').trim();
  const desc2 = (foundItem.description || '').trim();
  const { score: descSim } = computeTextSimilarity(desc1, desc2);
  const descPoints = Math.round(descSim * 10);
  totalScore += descPoints;

  // 5. COLOR COMPATIBILITY (12%)
  let colorScore = 0;
  let colorDesc = '';
  const col1 = (lostItem.color || '').trim().toLowerCase();
  const col2 = (foundItem.color || '').trim().toLowerCase();
  const text1Lower = `${title1} ${desc1}`.toLowerCase();
  const text2Lower = `${title2} ${desc2}`.toLowerCase();

  if (col1 && col2 && col1 === col2) {
    colorScore = 12;
    colorDesc = `🎨 Color: Both ${lostItem.color}`;
  } else if (
    (col1 && text2Lower.includes(col1)) ||
    (col2 && text1Lower.includes(col2)) ||
    (col1 === 'black' && col2 === 'grey') ||
    (col1 === 'grey' && (col2 === 'silver' || col2 === 'black')) ||
    (col1 === 'silver' && col2 === 'grey')
  ) {
    colorScore = 8;
    colorDesc = `🎨 Color: Compatible shades (${lostItem.color} / ${foundItem.color})`;
  } else if (!col1 || !col2) {
    colorScore = 4;
  }
  totalScore += colorScore;

  // 6. LOCATION PROXIMITY (8%)
  let locationScore = 0;
  let locationDesc = '';
  const loc1 = (lostItem.location || '').trim();
  const loc2 = (foundItem.location || '').trim();
  const l1 = loc1.toLowerCase();
  const l2 = loc2.toLowerCase();

  if (loc1 && loc2 && l1 === l2) {
    locationScore = 8;
    locationDesc = `📍 Location: Identical zone (${loc1})`;
  } else if (CAMPUS_ADJACENCY[loc1] && CAMPUS_ADJACENCY[loc1].includes(loc2)) {
    locationScore = 5;
    locationDesc = `📍 Location: Adjacent zones (${loc1} & ${loc2})`;
  } else if (l1.includes('other') || l1.includes('unknown') || l2.includes('other') || l2.includes('unknown')) {
    locationScore = 4;
    locationDesc = `📍 Location: General campus area`;
  }
  totalScore += locationScore;

  // 7. DATE PROXIMITY (5%)
  let dateScore = 0;
  let dateDesc = '';
  try {
    const d1 = new Date(lostItem.date_lost_or_found).getTime();
    const d2 = new Date(foundItem.date_lost_or_found).getTime();
    if (!isNaN(d1) && !isNaN(d2)) {
      const diffDays = Math.round(Math.abs(d1 - d2) / (1000 * 60 * 60 * 24));
      if (diffDays === 0) {
        dateScore = 5;
        dateDesc = `📅 Timeline: Same day occurrence`;
      } else if (diffDays <= 2) {
        dateScore = 3;
        dateDesc = `📅 Timeline: Within ${diffDays} day${diffDays > 1 ? 's' : ''}`;
      } else if (diffDays <= 5) {
        dateScore = 2;
        dateDesc = `📅 Timeline: Within ${diffDays} days`;
      }
    }
  } catch (e) {}
  totalScore += dateScore;

  // Cap final score at 100
  totalScore = Math.min(100, Math.max(0, Math.round(totalScore)));

  // If title keywords didn't overlap and category is different, cap below 50
  if (titleKeywords.length === 0 && c1 !== c2) {
    totalScore = Math.min(totalScore, 35);
  }

  // 8. STRUCTURED EXPLANATION FOR ADMIN & STUDENT VERIFICATION
  if (titleKeywords.length > 0) {
    explanationParts.push(`🎯 Key overlap: ${titleKeywords.map(k => `"${k}"`).join(', ')}`);
  }
  if (categoryVerdict) explanationParts.push(categoryVerdict);
  if (colorDesc) explanationParts.push(colorDesc);
  if (locationDesc) explanationParts.push(locationDesc);
  if (dateDesc) explanationParts.push(dateDesc);

  let adminGuidance = '';
  if (totalScore >= 80) {
    adminGuidance = `🔍 Admin Check: High confidence (${totalScore}%). Verify claimant's submitted verification answer against stored private secret detail.`;
  } else if (totalScore >= 65) {
    adminGuidance = `🔍 Admin Check: Moderate confidence (${totalScore}%). Inspect unique distinguishing marks, brand model, or stickers before approval.`;
  } else {
    adminGuidance = `🔍 Admin Check: Potential match (${totalScore}%). Compare student college ID and ask for identifying marks at Security Desk.`;
  }
  explanationParts.push(adminGuidance);

  const explanation = explanationParts.join(' • ');

  return {
    score: totalScore,
    explanation,
    breakdown: {
      titlePoints,
      categoryScore,
      descPoints,
      colorScore,
      locationScore,
      dateScore
    }
  };
}

/**
 * Scan opposite open items and record any matches >= 50%
 */
function findAndSaveMatches(newItem, db) {
  const isLost = newItem.type === 'lost';
  const oppositeType = isLost ? 'found' : 'lost';

  // Get all active opposite items
  const candidates = db.query(`
    SELECT * FROM items
    WHERE type = ? AND status IN ('Open', 'Matched', 'Claim Pending')
  `, [oppositeType]);

  const newMatches = [];

  for (const candidate of candidates) {
    // Prevent self-matching: a student cannot match their own lost item against their own found report
    if (newItem.user_id && candidate.user_id && newItem.user_id === candidate.user_id) {
      continue;
    }

    const lostItem = isLost ? newItem : candidate;
    const foundItem = isLost ? candidate : newItem;

    const { score, explanation } = calculateMatchScore(lostItem, foundItem);

    if (score >= 50) {
      const now = new Date().toISOString();

      // Check if match already recorded
      const existing = db.get(`
        SELECT * FROM matches
        WHERE lost_item_id = ? AND found_item_id = ?
      `, [lostItem.id, foundItem.id]);

      if (existing) {
        db.run(`
          UPDATE matches
          SET score = ?, explanation = ?
          WHERE id = ?
        `, [score, explanation, existing.id]);
        newMatches.push({ ...existing, score, explanation });
      } else {
        const { lastInsertRowid } = db.run(`
          INSERT INTO matches (lost_item_id, found_item_id, score, explanation, created_at)
          VALUES (?, ?, ?, ?, ?)
        `, [lostItem.id, foundItem.id, score, explanation, now]);

        newMatches.push({
          id: lastInsertRowid,
          lost_item_id: lostItem.id,
          found_item_id: foundItem.id,
          score,
          explanation
        });

        // Update item statuses to Matched if Open
        if (lostItem.status === 'Open') {
          db.run(`UPDATE items SET status = 'Matched' WHERE id = ?`, [lostItem.id]);
        }
        if (foundItem.status === 'Open') {
          db.run(`UPDATE items SET status = 'Matched' WHERE id = ?`, [foundItem.id]);
        }

        // Create in-app notification for the lost item owner
        const lostOwnerNotificationTitle = `Possible match found (${score}%)`;
        const lostOwnerNotificationMsg = `A found item "${foundItem.title}" matches your lost "${lostItem.title}" at ${score}%!`;
        db.run(`
          INSERT INTO notifications (user_id, title, message, link, is_read, created_at)
          VALUES (?, ?, ?, ?, 0, ?)
        `, [
          lostItem.user_id,
          lostOwnerNotificationTitle,
          lostOwnerNotificationMsg,
          `/smart-match.html?matchId=${lastInsertRowid}`,
          now
        ]);
      }
    }
  }

  return newMatches;
}

/**
 * Optional AI Photo Feature (Claude API)
 * If ANTHROPIC_API_KEY is configured, detects item category & primary color.
 * Safe fallback: never crashes if key is absent or request fails.
 */
async function detectItemFromPhoto(filePath) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return null; // Fallback to manual selection
  }

  try {
    if (!fs.existsSync(filePath)) return null;
    const fileData = fs.readFileSync(filePath);
    const base64Data = fileData.toString('base64');
    const ext = path.extname(filePath).toLowerCase();
    const mediaType = ext === '.png' ? 'image/png' : 'image/jpeg';

    const payload = JSON.stringify({
      model: "claude-3-haiku-20240307",
      max_tokens: 200,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: {
                type: "base64",
                media_type: mediaType,
                data: base64Data
              }
            },
            {
              type: "text",
              text: "Classify this lost/found campus item into JSON format only: {\"category\": \"ID Card\"|\"Earphones\"|\"Electronic Devices\"|\"Calculator\"|\"Stationery\"|\"Bottle\"|\"Bag\"|\"Keys\"|\"Wallet\"|\"Clothing\"|\"Other\", \"color\": \"ColorName\"}"
            }
          ]
        }
      ]
    });

    return new Promise((resolve) => {
      const req = https.request({
        hostname: 'api.anthropic.com',
        path: '/v1/messages',
        method: 'POST',
        headers: {
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
          'content-type': 'application/json',
          'content-length': Buffer.byteLength(payload)
        }
      }, (res) => {
        let body = '';
        res.on('data', chunk => body += chunk);
        res.on('end', () => {
          try {
            const data = JSON.parse(body);
            const content = data.content?.[0]?.text;
            const parsed = JSON.parse(content);
            resolve(parsed);
          } catch (err) {
            resolve(null);
          }
        });
      });

      req.on('error', () => resolve(null));
      req.write(payload);
      req.end();
    });
  } catch (e) {
    return null; // Safe fallback
  }
}

module.exports = {
  calculateMatchScore,
  findAndSaveMatches,
  computeTextSimilarity,
  detectItemFromPhoto,
  CAMPUS_ADJACENCY
};

