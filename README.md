<<<<<<< HEAD
# FINDIT – Smart Campus Recovery System
> **"Lost Something? Find It Smarter."**  
> *Built for College Hackathons (5-Hour Challenge)*

FINDIT is a centralized, proactive lost & found recovery platform designed for college campuses. Instead of relying on cluttered WhatsApp groups and notice boards, FINDIT proactively cross-references lost and found reports using an AI-inspired multi-factor matching engine and instantly alerts verified students.

---

## ⚡ Quick Start & Run Instructions

```bash
# 1. Install dependencies
npm install

# 2. (Optional) Reset and seed initial demo data
npm run seed

# 3. Start the application
npm start
```

The application runs on **[http://localhost:3000](http://localhost:3000)**.

To execute the automated end-to-end test suite:
```bash
npm test
```

---

## 👥 Default Login Credentials (Pre-seeded)

FINDIT comes pre-seeded with 2 student accounts and 1 college security/staff admin account, plus 10 lost items and 10 found items across 8 campus zones.

| Role | Email | Password | Access & Capabilities |
|---|---|---|---|
| **Student 1 (Alex)** | `student1@college.edu` | `student123` | Report lost/found items, receive match notifications, claim found items, view recovery QR code. |
| **Student 2 (Priya)** | `student2@college.edu` | `student123` | Report found items with secret verification details, review claims on found items. |
| **Campus Security Admin** | `admin@college.edu` | `admin123` | Access Admin Dashboard (`/admin.html`), review & approve claims, verify claim codes/QR codes, mark items Returned, view analytics. |

*(Quick-fill demo buttons are also provided on the Login page for 1-click login during presentations).*

---

## 🚀 The 6-Step Hackathon Demo Flow

1. **Student A Reports Lost Black Earphones**:
   - Log in as `student1@college.edu` / `student123`.
   - Go to **Report Lost** (`/report-lost.html`).
   - Enter: Title: *"Black Earphones"*, Category: *Earphones*, Color: *Black*, Location: *Library*, Date: *Today*.
   - Click **Submit Lost Item Report**.

2. **Student B Reports Found Black Earphones with Secret Detail**:
   - Log in as `student2@college.edu` / `student123`.
   - Go to **Report Found** (`/report-found.html`).
   - Enter: Title: *"Black Wireless Earbuds"*, Category: *Earphones*, Color: *Black*, Location: *Library*, Date: *Today*.
   - Location now: *"security desk"*.
   - **Private Verification Detail**: *"Tiny scratch on left bud and red carrying pouch"*.  
     *(Note: This detail is encrypted and never exposed on public pages).*
   - Click **Submit Found Item Report**.

3. **Student A Instantly Gets a Smart Match Notification (~89%)**:
   - Log back in as Student A (`student1@college.edu`).
   - The navbar notification bell pulses with an unread badge within 10 seconds.
   - Click the bell or go to **Smart Match** (`/smart-match.html`).
   - See the high-confidence match badge (**89% MATCH**) with explanation:
     > *"Same category (Earphones), Matching keywords: 'black, earphon', Both Black, Identical location (Library), Same day occurrence."*

4. **Student A Claims the Item & Answers Verification Question**:
   - Click **"This is Mine (Claim)"**.
   - A modal appears asking for verification.
   - Enter the answer: *"Left earphone has a small scratch on joint and red pouch"*.
   - Submit the claim. Item status updates to `Claim Pending`.

5. **Admin Approves Claim, Generates QR Pass & Marks Returned**:
   - Log in as Admin (`admin@college.edu` / `admin123`) and open **Admin Desk** (`/admin.html`).
   - In the **Pending Claims Queue**, see the claimant's answer compared against the stored secret detail.
   - Click **"Approve & Generate QR Pass"**.
   - Student A can now view their official **Recovery QR Code Pass** in **My Reports** (`/my-reports.html#claims`).
   - Security Desk enters the Claim Code (e.g. `FND-227A20F`) into the Security Handover box and clicks **Verify & Mark Returned**.
   - Status updates to `Returned`.

6. **Campus Map & Dashboard Reflect Updated Stats**:
   - Open **Campus Map** (`/map.html`) to see pin counters update and toggle **Heatmap View** to see zone activity.
   - Open **Admin Dashboard** (`/admin.html`) to see the recovery rate percentage and Chart.js bar chart by location.

---

## 🧠 AI Smart Matching Engine (`matcher.js`)

Located in [`matcher.js`](file:///c:/Users/KISHAN%20B%20G/OneDrive/Desktop/Findit/matcher.js) with clear, judge-friendly code and mathematical explanations:

| Factor | Weight | Method & Description |
|---|---|---|
| **Category Compatibility** | **30%** | Exact match = 30 pts. Closely related categories (e.g. Bag/Wallet) = 10 pts. Incompatible categories = 0 pts. |
| **Text Similarity** | **30%** | Tokenization, lowercase normalization, stopword filtering, English suffix stemming, and Cosine similarity / TF-IDF overlap. |
| **Color Match** | **15%** | Exact color = 15 pts. Secondary color mention or description keyword overlap = 10 pts. |
| **Location Proximity** | **15%** | Same campus zone = 15 pts. Adjacent campus zone (via hand-defined campus graph) = 9 pts. |
| **Date Proximity** | **10%** | Same day = 10 pts; within 1 day = 8 pts; within 3 days = 5 pts; within 7 days = 3 pts. |

- **Threshold**: Any pair with score $\ge 50\%$ is recorded as a match and triggers real-time alerts.
- **Claude API Vision (Optional)**: If `ANTHROPIC_API_KEY` is provided in environment variables, the system auto-detects item category and color from uploaded photos. If absent, it cleanly falls back to manual selection without errors.

---

## 🗺️ Interactive SVG Campus Map
- Zero external map APIs; works **100% offline**.
- 8 Clickable Zones: **Library**, **Canteen**, **Computer Lab**, **Main Block**, **Hostel**, **Sports Ground**, **Parking**, and **Auditorium**.
- Shows live Red pins (lost) and Green pins (found).
- Click any zone to view items reported in that zone.
- **Heatmap Toggle**: Visually shades zones by report density.

---

## 🌟 Stretch Features Included
- **AI Assistant Chat Widget**: Click the floating bot icon in bottom-left corner to ask natural language questions (e.g. *"Has anyone found a calculator near the computer lab?"*). The system parses keywords into category and location and retrieves matching records.
- **Voice Dictation**: Click **"Speak to Dictate"** on report forms to dictate descriptions using the browser Web Speech API.
- **Bilingual Interface (English / Kannada)**: Click **"ಕನ್ನಡ / EN"** in the navbar to switch labels and navigation between English and Kannada.

---

## 🛠️ Architecture & Tech Stack
- **Backend**: Node.js & Express
- **Database**: SQLite via `sql.js` (WebAssembly SQLite, zero native compilation issues)
- **Frontend**: Plain HTML5, Modern CSS3 (CSS Variables, Flexbox/Grid, Mobile Responsive down to 390px), Vanilla JavaScript
- **Security & Auth**: `bcryptjs` for salted password hashing, `express-session` for secure cookie sessions
- **Image Uploads**: `multer` storing files in `/uploads`
- **QR Codes**: `qrcode` generating cryptographic recovery passes
- **Data Visualization**: `Chart.js` via CDN

=======
# Vibex
>>>>>>> a4cb9f0866ab13726038957f634145d49aa15ad8
