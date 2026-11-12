/**
 * FINDIT - Client Core Framework (app.js)
 * Handles auth state, 10s notification polling, bilingual translation (English/Kannada),
 * voice dictation, toasts, claims, and the AI Assistant widget.
 */

// Global State
let currentUser = null;
let currentLang = localStorage.getItem('findit_lang') || 'en';
let pollInterval = null;

// Bilingual Dictionary (English / Kannada)
const TRANSLATIONS = {
  en: {
    brand_tagline: "Lost Something? Find It Smarter.",
    nav_home: "Home",
    nav_lost: "Report Lost",
    nav_found: "Report Found",
    nav_match: "Smart Match",
    nav_search: "Search & Filter",
    nav_map: "Campus Map",
    nav_my_reports: "My Reports",
    nav_admin: "Admin Desk",
    nav_login: "Login / Register",
    nav_logout: "Logout",
    hero_title: "FINDIT – Smart Campus Recovery System",
    hero_sub: "Central lost & found platform that proactively matches reports and alerts students instantly.",
    btn_report_lost: "Report Lost Item",
    btn_report_found: "Report Found Item",
    btn_view_matches: "View Smart Matches",
    stat_lost: "Lost Items",
    stat_found: "Found Items",
    stat_matches: "Matches Made",
    stat_returned: "Items Returned",
    stat_recovery: "Recovery Rate",
    recent_reports_title: "Recent Campus Reports",
    recent_reports_sub: "Real-time items logged by fellow students and campus security",
    filter_all: "All",
    filter_lost: "Lost",
    filter_found: "Found",
    search_all_btn: "Search All →",
    form_item_name: "Item Name",
    form_category: "Category",
    form_desc: "Description",
    form_color: "Color",
    form_location: "Campus Location",
    form_date: "Date",
    form_photo: "Photo Upload",
    form_submit: "Submit Report",
    form_private_detail: "Private Verification Detail",
    form_private_help: "Never shown publicly. Used to verify the true owner (e.g. scratch, sticker, initials).",
    btn_voice: "Speak to Dictate",
    voice_listening: "Listening...",
    assistant_title: "FindIt AI Assistant",
    assistant_placeholder: "e.g., Has anyone found black earphones near library?",
    toast_login_required: "Please log in to perform this action.",
    report_lost_heading: "Report a Lost Item",
    report_lost_sub: "Provide details so our AI Smart Matcher can automatically cross-reference found reports on campus.",
    btn_submit_lost: "Submit Lost Item Report",
    report_found_heading: "Report a Found Item",
    report_found_sub: "Help a fellow student recover their property. Keep secret details safe for verification.",
    btn_submit_found: "Submit Found Item Report",
    search_keyword: "Keyword Search",
    search_report_type: "Report Type",
    status_label: "Status",
    btn_apply_filters: "Apply Filters",
    btn_reset: "Reset",
    admin_title: "Campus Security & Admin Desk",
    admin_sub: "Master command center for verification, claims approval, analytics, and return handovers.",
    btn_rerun_matcher: "⚡ Re-run AI Matcher",
    sec_desk_title: "Security Desk: Scan / Enter Claim Code",
    sec_desk_sub: "When a student arrives at security with their QR Code or Claim Code, enter it here to complete handover.",
    btn_verify_returned: "✅ Verify & Mark Returned",
    claims_queue_title: "Pending Claims Queue",
    claims_queue_sub: "Review student claims by comparing submitted verification answers against stored private details.",
    all_reports_title: "All Campus Reports",
    all_reports_sub: "Master ledger of all lost and found submissions",
    smart_match_title: "⚡ AI Smart Matches",
    smart_match_sub: "Automated multi-factor matching across Category (30%), Text Similarity (30%), Color (15%), Location (15%), and Date (10%).",
    my_reports_sub: "Manage your reported items, check claim statuses, and access your Recovery QR Codes."
  },
  kn: {
    brand_tagline: "ಏನಾದರೂ ಕಳೆದುಹೋಗಿದೆಯೇ? ಸ್ಮಾರ್ಟ್ ಆಗಿ ಹುಡುಕಿ.",
    nav_home: "ಮುಖಪುಟ",
    nav_lost: "ಕಳೆದುಹೋದ ವರದಿ",
    nav_found: "ದೊರೆತ ವರದಿ",
    nav_match: "ಸ್ಮಾರ್ಟ್ ಮ್ಯಾಚ್",
    nav_search: "ಹುಡುಕು ಮತ್ತು ಫಿಲ್ಟರ್",
    nav_map: "ಕ್ಯಾಂಪಸ್ ನಕ್ಷೆ",
    nav_my_reports: "ನನ್ನ ವರದಿಗಳು",
    nav_admin: "ಅಡ್ಮಿನ್ ಡೆಸ್ಕ್",
    nav_login: "ಲಾಗಿನ್ / ನೋಂದಣಿ",
    nav_logout: "ಲಾಗ್ ಔಟ್",
    hero_title: "FINDIT – ಸ್ಮಾರ್ಟ್ ಕ್ಯಾಂಪಸ್ ರಿಕವರಿ ವ್ಯವಸ್ಥೆ",
    hero_sub: "ಕಳೆದುಹೋದ ವಸ್ತುಗಳನ್ನು ಶೀಘ್ರವಾಗಿ ಹುಡುಕಿ ವಿದ್ಯಾರ್ಥಿಗಳಿಗೆ ತಕ್ಷಣ ಮಾಹಿತಿ ನೀಡುವ ವ್ಯವಸ್ಥೆ.",
    btn_report_lost: "ಕಳೆದುಹೋದ ವಸ್ತು ವರದಿ",
    btn_report_found: "ದೊರೆತ ವಸ್ತು ವರದಿ",
    btn_view_matches: "ಸ್ಮಾರ್ಟ್ ಮ್ಯಾಚ್ ನೋಡಿ",
    stat_lost: "ಕಳೆದುಹೋದ ವಸ್ತುಗಳು",
    stat_found: "ದೊರೆತ ವಸ್ತುಗಳು",
    stat_matches: "ಹೊಂದಿಕೆಯಾದವು",
    stat_returned: "ವಾಪಸ್ ನೀಡಲಾದವು",
    stat_recovery: "ರಿಕವರಿ ಶೇಕಡಾ",
    recent_reports_title: "ಇತ್ತೀಚಿನ ಕ್ಯಾಂಪಸ್ ವರದಿಗಳು",
    recent_reports_sub: "ವಿದ್ಯಾರ್ಥಿಗಳು ಮತ್ತು ಕ್ಯಾಂಪಸ್ ಭದ್ರತಾ ಸಿಬ್ಬಂದಿ ದಾಖಲಿಸಿದ ನೈಜ ಸಮಯದ ವರದಿಗಳು",
    filter_all: "ಎಲ್ಲಾ",
    filter_lost: "ಕಳೆದುಹೋದ",
    filter_found: "ದೊರೆತ",
    search_all_btn: "ಎಲ್ಲವನ್ನೂ ಹುಡುಕಿ →",
    form_item_name: "ವಸ್ತುವಿನ ಹೆಸರು",
    form_category: "ವರ್ಗ",
    form_desc: "ವಿವರಣೆ",
    form_color: "ಬಣ್ಣ",
    form_location: "ಕ್ಯಾಂಪಸ್ ಸ್ಥಳ",
    form_date: "ದಿನಾಂಕ",
    form_photo: "ಭಾವಚಿತ್ರ ಅಪ್ಲೋಡ್",
    form_submit: "ವರದಿ ಸಲ್ಲಿಸಿ",
    form_private_detail: "ಖಾಸಗಿ ಪರಿಶೀಲನಾ ವಿವರ",
    form_private_help: "ಸಾರ್ವಜನಿಕವಾಗಿ ತೋರಿಸಲಾಗುವುದಿಲ್ಲ. ಮಾಲೀಕರನ್ನು ಪರಿಶೀಲಿಸಲು ಮಾತ್ರ ಬಳಸಲಾಗುತ್ತದೆ.",
    btn_voice: "ಮಾತನಾಡಿ ಬರೆಯಿರಿ",
    voice_listening: "ಆಲಿಸುತ್ತಿದೆ...",
    assistant_title: "ಫೈಂಡ್‌ಇಟ್ ಎಐ ಸಹಾಯಕ",
    assistant_placeholder: "ಉದಾಹರಣೆಗೆ: ಲೈಬ್ರರಿ ಬಳಿ ಇಯರ್‌ಫೋನ್ ಸಿಕ್ಕಿದೆಯೇ?",
    toast_login_required: "ದಯವಿಟ್ಟು ಮುಂದುವರಿಯಲು ಲಾಗಿನ್ ಆಗಿ.",
    report_lost_heading: "ಕಳೆದುಹೋದ ವಸ್ತುವನ್ನು ವರದಿ ಮಾಡಿ",
    report_lost_sub: "ವಿವರಗಳನ್ನು ನೀಡಿ, ಇದರಿಂದ ನಮ್ಮ ಎಐ ಸ್ಮಾರ್ಟ್ ಮ್ಯಾಚರ್ ಕ್ಯಾಂಪಸ್‌ನಲ್ಲಿ ದೊರೆತ ವರದಿಗಳೊಂದಿಗೆ ಸ್ವಯಂಚಾಲಿತವಾಗಿ ಹೊಂದಿಸುತ್ತದೆ.",
    btn_submit_lost: "ಕಳೆದುಹೋದ ವಸ್ತು ವರದಿ ಸಲ್ಲಿಸಿ",
    report_found_heading: "ದೊರೆತ ವಸ್ತುವನ್ನು ವರದಿ ಮಾಡಿ",
    report_found_sub: "ಸಹಪಾಠಿ ತಮ್ಮ ವಸ್ತುವನ್ನು ಮರಳಿ ಪಡೆಯಲು ಸಹಾಯ ಮಾಡಿ. ಪರಿಶೀಲನೆಗಾಗಿ ರಹಸ್ಯ ವಿವರಗಳನ್ನು ಸುರಕ್ಷಿತವಾಗಿಡಿ.",
    btn_submit_found: "ದೊರೆತ ವಸ್ತು ವರದಿ ಸಲ್ಲಿಸಿ",
    search_keyword: "ಕೀವರ್ಡ್ ಹುಡುಕಾಟ",
    search_report_type: "ವರದಿಯ ಪ್ರಕಾರ",
    status_label: "ಸ್ಥಿತಿ",
    btn_apply_filters: "ಫಿಲ್ಟರ್ ಅನ್ವಯಿಸಿ",
    btn_reset: "ಮರುಹೊಂದಿಸಿ",
    admin_title: "🛡️ ಕ್ಯಾಂಪಸ್ ಭದ್ರತೆ ಮತ್ತು ಅಡ್ಮಿನ್ ಡೆಸ್ಕ್",
    admin_sub: "ಪರಿಶೀಲನೆ, ಕ್ಲೈಮ್ ಅನುಮೋದನೆ, ವಿಶ್ಲೇಷಣೆ ಮತ್ತು ಹಸ್ತಾಂತರದ ಕಮಾಂಡ್ ಕೇಂದ್ರ.",
    btn_rerun_matcher: "⚡ ಎಐ ಮ್ಯಾಚರ್ ಮರುಚಾಲನೆ",
    sec_desk_title: "📷 ಸೆಕ್ಯುರಿಟಿ ಡೆಸ್ಕ್: ಕ್ಲೈಮ್ ಕೋಡ್ ಸ್ಕ್ಯಾನ್ / ನಮೂದಿಸಿ",
    sec_desk_sub: "ವಿದ್ಯಾರ್ಥಿ ಕ್ಯೂಆರ್ ಕೋಡ್ ಅಥವಾ ಕ್ಲೈಮ್ ಕೋಡ್‌ನೊಂದಿಗೆ ಬಂದಾಗ, ಹಸ್ತಾಂತರ ಪೂರ್ಣಗೊಳಿಸಲು ಇಲ್ಲಿ ನಮೂದಿಸಿ.",
    btn_verify_returned: "✅ ಪರಿಶೀಲಿಸಿ ಮತ್ತು ವಾಪಸ್ ಮಾಡಿ",
    claims_queue_title: "ಬಾಕಿ ಉಳಿದ ಕ್ಲೈಮ್‌ಗಳ ಸರತಿ ಸಾಲು",
    claims_queue_sub: "ದಾಖಲಾದ ರಹಸ್ಯ ವಿವರಗಳೊಂದಿಗೆ ವಿದ್ಯಾರ್ಥಿಯ ಉತ್ತರಗಳನ್ನು ಹೋಲಿಸಿ ಪರಿಶೀಲಿಸಿ.",
    all_reports_title: "ಎಲ್ಲಾ ಕ್ಯಾಂಪಸ್ ವರದಿಗಳು",
    all_reports_sub: "ಎಲ್ಲಾ ಸಲ್ಲಿಕೆಗಳ ಮುಖ್ಯ ಲೆಡ್ಜರ್",
    smart_match_title: "⚡ ಎಐ ಸ್ಮಾರ್ಟ್ ಹೊಂದಾಣಿಕೆಗಳು",
    smart_match_sub: "ವರ್ಗ (30%), ಪಠ್ಯ (30%), ಬಣ್ಣ (15%), ಸ್ಥಳ (15%) ಮತ್ತು ದಿನಾಂಕ (10%) ಆಧಾರಿತ ಸ್ವಯಂಚಾಲಿತ ಹೊಂದಾಣಿಕೆ.",
    my_reports_sub: "ನಿಮ್ಮ ವರದಿಗಳನ್ನು ನಿರ್ವಹಿಸಿ, ಕ್ಲೈಮ್ ಸ್ಥಿತಿ ಪರಿಶೀಲಿಸಿ ಮತ್ತು ರಿಕವರಿ QR ಕೋಡ್ ಪಡೆಯಿರಿ."
  }
};

// Initialize Application
document.addEventListener('DOMContentLoaded', async () => {
  renderNavbar();
  renderFooter();
  renderAssistantWidget();
  applyLanguage(currentLang);
  await checkAuth();
  startNotificationPolling();
});

// Render Navbar
function renderNavbar() {
  const existingNav = document.querySelector('nav.navbar');
  if (existingNav) return;

  const currentPath = window.location.pathname;

  const navHtml = `
    <nav class="navbar">
      <div class="nav-container">
        <a href="/index.html" class="nav-brand">
          <div class="nav-logo-badge">F</div>
          <span>FINDIT</span>
        </a>

        <ul class="nav-links" id="navLinks">
          <li><a href="/index.html" class="${currentPath.endsWith('index.html') || currentPath === '/' ? 'active' : ''}" data-i18n="nav_home">Home</a></li>
          <li><a href="/report-lost.html" class="${currentPath.endsWith('report-lost.html') ? 'active' : ''}" data-i18n="nav_lost">Report Lost</a></li>
          <li><a href="/report-found.html" class="${currentPath.endsWith('report-found.html') ? 'active' : ''}" data-i18n="nav_found">Report Found</a></li>
          <li><a href="/smart-match.html" class="${currentPath.endsWith('smart-match.html') ? 'active' : ''}" data-i18n="nav_match">Smart Match</a></li>
          <li><a href="/search.html" class="${currentPath.endsWith('search.html') ? 'active' : ''}" data-i18n="nav_search">Search</a></li>
          <li><a href="/map.html" class="${currentPath.endsWith('map.html') ? 'active' : ''}" data-i18n="nav_map">Campus Map</a></li>
          <li id="myReportsNavItem" style="display:none;"><a href="/my-reports.html" class="${currentPath.endsWith('my-reports.html') ? 'active' : ''}" data-i18n="nav_my_reports">My Reports</a></li>
          <li id="adminNavItem" style="display:none;"><a href="/admin.html" class="${currentPath.endsWith('admin.html') ? 'active' : ''}" data-i18n="nav_admin">Admin</a></li>
        </ul>

        <div class="nav-actions">
          <button class="lang-btn" onclick="toggleLanguage()" id="langToggleBtn">ಕನ್ನಡ / EN</button>
          
          <a href="/notifications.html" class="notification-bell-btn" id="notifBell" title="Notifications" style="display:none;">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
              <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
            </svg>
            <span class="notification-badge" id="notifBadge">0</span>
          </a>

          <div id="authArea">
            <a href="/login.html" class="btn btn-sm btn-primary" data-i18n="nav_login">Login</a>
          </div>

          <button class="mobile-menu-btn" onclick="toggleMobileMenu()" aria-label="Toggle navigation">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M4 6h16M4 12h16M4 18h16"/></svg>
          </button>
        </div>
      </div>
    </nav>
  `;

  document.body.insertAdjacentHTML('afterbegin', navHtml);
}

// Render Footer
function renderFooter() {
  if (document.querySelector('footer.app-footer')) return;
  const footerHtml = `
    <footer class="app-footer">
      <div style="max-width:1200px; margin:0 auto; display:flex; flex-wrap:wrap; justify-content:space-between; align-items:center; gap:1rem;">
        <div>
          <strong>FINDIT</strong> – Smart Campus Recovery System &copy; 2026. Built for College Hackathon.
        </div>
        <div style="font-size:0.8rem; color:var(--text-light);">
          Tagline: <span data-i18n="brand_tagline">Lost Something? Find It Smarter.</span>
        </div>
      </div>
    </footer>
    <div class="toast-container" id="toastContainer"></div>
  `;
  document.body.insertAdjacentHTML('beforeend', footerHtml);
}

// Mobile Menu Toggle
function toggleMobileMenu() {
  const links = document.getElementById('navLinks');
  if (links) links.classList.toggle('mobile-open');
}

// Check Current User Auth State
async function checkAuth() {
  try {
    const res = await fetch('/api/auth/me');
    const data = await res.json();
    currentUser = data.user;
    updateAuthUI();
  } catch (e) {
    currentUser = null;
    updateAuthUI();
  }
}

// Update UI according to auth state
function updateAuthUI() {
  const authArea = document.getElementById('authArea');
  const notifBell = document.getElementById('notifBell');
  const myReportsNav = document.getElementById('myReportsNavItem');
  const adminNav = document.getElementById('adminNavItem');

  if (currentUser) {
    if (notifBell) notifBell.style.display = 'flex';
    if (myReportsNav) myReportsNav.style.display = 'block';
    if (adminNav) adminNav.style.display = currentUser.role === 'admin' ? 'block' : 'none';

    if (authArea) {
      authArea.innerHTML = `
        <div class="user-menu-pill">
          <span style="font-weight:600;">${escapeHtml(currentUser.name.split(' ')[0])}</span>
          <span class="role-badge ${currentUser.role === 'admin' ? 'role-admin' : 'role-student'}">${currentUser.role}</span>
          <button onclick="logout()" class="btn-sm btn-outline" style="border:none; padding:0.2rem 0.4rem; cursor:pointer;" title="Logout">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/></svg>
          </button>
        </div>
      `;
    }
  } else {
    if (notifBell) notifBell.style.display = 'none';
    if (myReportsNav) myReportsNav.style.display = 'none';
    if (adminNav) adminNav.style.display = 'none';

    if (authArea) {
      authArea.innerHTML = `<a href="/login.html" class="btn btn-sm btn-primary" data-i18n="nav_login">Login</a>`;
    }
  }
  applyLanguage(currentLang);
}

// Logout
async function logout() {
  try {
    await fetch('/api/auth/logout', { method: 'POST' });
    currentUser = null;
    showToast('Logged out successfully', 'info');
    setTimeout(() => {
      window.location.href = '/login.html';
    }, 400);
  } catch (e) {
    showToast('Logout failed', 'error');
  }
}

// 10-Second Notification Polling
function startNotificationPolling() {
  if (pollInterval) clearInterval(pollInterval);
  checkNotifications();
  // Poll every 10 seconds exactly per prompt requirement
  pollInterval = setInterval(checkNotifications, 10000);
}

async function checkNotifications() {
  if (!currentUser) return;
  try {
    const res = await fetch('/api/notifications');
    if (!res.ok) return;
    const data = await res.json();
    const badge = document.getElementById('notifBadge');
    if (badge) {
      if (data.unreadCount > 0) {
        badge.textContent = data.unreadCount > 99 ? '99+' : data.unreadCount;
        badge.classList.add('active');
      } else {
        badge.classList.remove('active');
      }
    }
  } catch (e) {
    // Fail silently in background
  }
}

// ==========================================
// Comprehensive English to Kannada Phrase Map
// ==========================================
const EN_TO_KN_PHRASES = {
  // Navigation & Branding
  "FINDIT": "FINDIT",
  "FINDIT – Smart Campus Recovery System": "FINDIT – ಸ್ಮಾರ್ಟ್ ಕ್ಯಾಂಪಸ್ ರಿಕವರಿ ವ್ಯವಸ್ಥೆ",
  "Lost Something? Find It Smarter.": "ಏನಾದರೂ ಕಳೆದುಹೋಗಿದೆಯೇ? ಸ್ಮಾರ್ಟ್ ಆಗಿ ಹುಡುಕಿ.",
  "Home": "ಮುಖಪುಟ",
  "Report Lost": "ಕಳೆದುಹೋದ ವರದಿ",
  "Report Found": "ದೊರೆತ ವರದಿ",
  "Smart Match": "ಸ್ಮಾರ್ಟ್ ಮ್ಯಾಚ್",
  "Search": "ಹುಡುಕಿ",
  "Search & Filter": "ಹುಡುಕು & ಫಿಲ್ಟರ್",
  "Campus Map": "ಕ್ಯಾಂಪಸ್ ನಕ್ಷೆ",
  "My Reports": "ನನ್ನ ವರದಿಗಳು",
  "Admin": "ಅಡ್ಮಿನ್",
  "Admin Desk": "ಅಡ್ಮಿನ್ ಡೆಸ್ಕ್",
  "Login": "ಲಾಗಿನ್",
  "Login / Register": "ಲಾಗಿನ್ / ನೋಂದಣಿ",
  "Logout": "ಲಾಗ್ ಔಟ್",
  "Sign In": "ಸೈನ್ ಇನ್",
  "Register": "ನೋಂದಣಿ",
  "Notifications": "ಸೂಚನೆಗಳು",

  // Hero & Home
  "Central lost & found platform that proactively matches reports and alerts students instantly.": "ಕಳೆದುಹೋದ ವಸ್ತುಗಳನ್ನು ಶೀಘ್ರವಾಗಿ ಹುಡುಕಿ ವಿದ್ಯಾರ್ಥಿಗಳಿಗೆ ತಕ್ಷಣ ಮಾಹಿತಿ ನೀಡುವ ವ್ಯವಸ್ಥೆ.",
  "Centralized lost & found network connecting students, security desks, and AI-powered match verification.": "ವಿದ್ಯಾರ್ಥಿಗಳು, ಸೆಕ್ಯುರಿಟಿ ಡೆಸ್ಕ್ ಮತ್ತು ಎಐ ಹೊಂದಾಣಿಕೆ ಪರಿಶೀಲನೆಯನ್ನು ಜೋಡಿಸುವ ಕೇಂದ್ರೀಕೃತ ವ್ಯವಸ್ಥೆ.",
  "Report Lost Item": "ಕಳೆದುಹೋದ ವಸ್ತು ವರದಿ",
  "Report Found Item": "ದೊರೆತ ವಸ್ತು ವರದಿ",
  "View Smart Matches": "ಸ್ಮಾರ್ಟ್ ಮ್ಯಾಚ್ ನೋಡಿ",
  "Recent Campus Reports": "ಇತ್ತೀಚಿನ ಕ್ಯಾಂಪಸ್ ವರದಿಗಳು",
  "Real-time items logged by fellow students and campus security": "ವಿದ್ಯಾರ್ಥಿಗಳು ಮತ್ತು ಕ್ಯಾಂಪಸ್ ಭದ್ರತಾ ಸಿಬ್ಬಂದಿ ದಾಖಲಿಸಿದ ನೈಜ ಸಮಯದ ವರದಿಗಳು",
  "Search All →": "ಎಲ್ಲವನ್ನೂ ಹುಡುಕಿ →",
  "Search All": "ಎಲ್ಲವನ್ನೂ ಹುಡುಕಿ",
  "All": "ಎಲ್ಲಾ",
  "Lost": "ಕಳೆದುಹೋದ",
  "Found": "ದೊರೆತ",
  "Lost Items": "ಕಳೆದುಹೋದ ವಸ್ತುಗಳು",
  "Total Lost Reports": "ಒಟ್ಟು ಕಳೆದುಹೋದ ವರದಿಗಳು",
  "Found Items": "ದೊರೆತ ವಸ್ತುಗಳು",
  "Total Found Reports": "ಒಟ್ಟು ದೊರೆತ ವರದಿಗಳು",
  "Matches Made": "ಹೊಂದಿಕೆಯಾದವು",
  "Matches Made (>=50%)": "ಹೊಂದಿಕೆಯಾದವು (>=50%)",
  "Items Returned": "ವಾಪಸ್ ನೀಡಲಾದವು",
  "Recovery Rate": "ರಿಕವರಿ ಶೇಕಡಾ",
  "Recovery Rate %": "ರಿಕವರಿ ದರ %",
  "No items reported yet": "ಇನ್ನೂ ಯಾವುದೇ ವಸ್ತುಗಳ ವರದಿ ಬಂದಿಲ್ಲ",
  "Be the first to report a lost or found item!": "ಕಳೆದುಹೋದ ಅಥವಾ ದೊರೆತ ವಸ್ತುವನ್ನು ಮೊದಲು ವರದಿ ಮಾಡಿ!",
  "Loading campus items...": "ಕ್ಯಾಂಪಸ್ ವಸ್ತುಗಳನ್ನು ಲೋಡ್ ಮಾಡಲಾಗುತ್ತಿದೆ...",
  "Loading records...": "ದಾಖಲೆಗಳನ್ನು ಲೋಡ್ ಮಾಡಲಾಗುತ್ತಿದೆ...",

  // Search & Filter
  "Search & Filter Reports": "ವರದಿಗಳನ್ನು ಹುಡುಕಿ ಮತ್ತು ಫಿಲ್ಟರ್ ಮಾಡಿ",
  "Explore all active lost and found campus records with multi-attribute filtering.": "ಬಹು-ಆಯ್ಕೆಗಳ ಫಿಲ್ಟರ್ ಮೂಲಕ ಎಲ್ಲಾ ಸಕ್ರಿಯ ಕ್ಯಾಂಪಸ್ ದಾಖಲೆಗಳನ್ನು ಹುಡುಕಿ.",
  "Keyword Search": "ಕೀವರ್ಡ್ ಹುಡುಕಾಟ",
  "Report Type": "ವರದಿಯ ಪ್ರಕಾರ",
  "All Types": "ಎಲ್ಲಾ ಪ್ರಕಾರಗಳು",
  "Lost Only": "ಕಳೆದುಹೋದವು ಮಾತ್ರ",
  "Found Only": "ದೊರೆತವು ಮಾತ್ರ",
  "Category": "ವರ್ಗ",
  "Category *": "ವರ್ಗ *",
  "Select Category": "ವರ್ಗ ಆಯ್ಕೆಮಾಡಿ",
  "All Categories": "ಎಲ್ಲಾ ವರ್ಗಗಳು",
  "Campus Location": "ಕ್ಯಾಂಪಸ್ ಸ್ಥಳ",
  "Last Seen Campus Location *": "ಕೊನೆಯ ಬಾರಿ ನೋಡಿದ ಕ್ಯಾಂಪಸ್ ಸ್ಥಳ *",
  "Found at Campus Location *": "ವಸ್ತು ದೊರೆತ ಕ್ಯಾಂಪಸ್ ಸ್ಥಳ *",
  "All Locations": "ಎಲ್ಲಾ ಸ್ಥಳಗಳು",
  "Status": "ಸ್ಥಿತಿ",
  "All Statuses": "ಎಲ್ಲಾ ಸ್ಥಿತಿಗಳು",
  "Apply Filters": "ಫಿಲ್ಟರ್ ಅನ್ವಯಿಸಿ",
  "Reset": "ಮರುಹೊಂದಿಸಿ",
  "Showing results...": "ಫಲಿತಾಂಶಗಳು...",
  "No matching reports found": "ಯಾವುದೇ ವರದಿಗಳು ಕಂಡುಬಂದಿಲ್ಲ",
  "Try adjusting your filters or search keywords.": "ನಿಮ್ಮ ಫಿಲ್ಟರ್ ಅಥವಾ ಕೀವರ್ಡ್ ಬದಲಾಯಿಸಿ ಪ್ರಯತ್ನಿಸಿ.",

  // Categories
  "ID Card": "ಗುರುತಿನ ಚೀಟಿ (ID Card)",
  "ID Card / College Smart Card": "ಗುರುತಿನ ಚೀಟಿ / ಕಾಲೇಜು ಸ್ಮಾರ್ಟ್ ಕಾರ್ಡ್",
  "Earphones": "ಇಯರ್‌ಫೋನ್ಸ್ / ಹೆಡ್‌ಫೋನ್ಸ್",
  "Earphones / Headphones / AirPods": "ಇಯರ್‌ಫೋನ್ಸ್ / ಹೆಡ್‌ಫೋನ್ಸ್ / ಏರ್‌ಪಾಡ್ಸ್",
  "Electronic Devices": "ಎಲೆಕ್ಟ್ರಾನಿಕ್ ಸಾಧನಗಳು",
  "Electronic Devices (Laptop, Tablet, Charger, Smartwatch)": "ಎಲೆಕ್ಟ್ರಾನಿಕ್ ಸಾಧನಗಳು (ಲ್ಯಾಪ್‌ಟಾಪ್, ಚಾರ್ಜರ್, ವಾಚ್)",
  "Calculator": "ಕ್ಯಾಲ್ಕುಲೇಟರ್",
  "Calculator (Scientific / Basic)": "ಕ್ಯಾಲ್ಕುಲೇಟರ್ (ವೈಜ್ಞಾನಿಕ / ಮೂಲ)",
  "Stationery": "ಲೇಖನ ಸಾಮಗ್ರಿಗಳು",
  "Stationery Items (Books, Notes, Geometry Box, Pen)": "ಲೇಖನ ಸಾಮಗ್ರಿಗಳು (ಪುಸ್ತಕ, ನೋಟ್ಸ್, ಪೆನ್)",
  "Bottle": "ಬಾಟಲ್ / ಫ್ಲಾಸ್ಕ್",
  "Bottle / Sipper / Flask": "ಬಾಟಲ್ / ಸಿಪ್ಪರ್ / ಫ್ಲಾಸ್ಕ್",
  "Bag": "ಬ್ಯಾಗ್ / ಬೆನ್ನುಚೀಲ",
  "Bag / Backpack / Pouch": "ಬ್ಯಾಗ್ / ಬೆನ್ನುಚೀಲ / ಪೌಚ್",
  "Keys": "ಕೀಲಿಗಳು",
  "Keys (Hostel / Room / Vehicle)": "ಕೀಲಿಗಳು (ಹಾಸ್ಟೆಲ್ / ರೂಮ್ / ವಾಹನ)",
  "Wallet": "ವ್ಯಾಲೆಟ್ / ಪರ್ಸ್",
  "Wallet / Cardholder / Purse": "ವ್ಯಾಲೆಟ್ / ಕಾರ್ಡ್‌ಹೋಲ್ಡರ್ / ಪರ್ಸ್",
  "Clothing": "ಉಡುಪುಗಳು",
  "Clothing / Wearables": "ಉಡುಪುಗಳು / ಬಟ್ಟೆಗಳು",
  "Clothing / Wearables (Jacket, Umbrella, Spectacles)": "ಉಡುಪುಗಳು (ಜಾಕೆಟ್, ಛತ್ರಿ, ಕನ್ನಡಕ)",
  "Other": "ಇತರೆ",
  "Other Items": "ಇತರ ವಸ್ತುಗಳು",

  // Locations
  "Library": "ಗ್ರಂಥಾಲಯ (Library)",
  "📚 Library": "📚 ಗ್ರಂಥಾಲಯ (Library)",
  "Canteen": "ಕ್ಯಾಂಟೀನ್ (Canteen)",
  "☕ Canteen": "☕ ಕ್ಯಾಂಟೀನ್ (Canteen)",
  "Computer Lab": "ಕಂಪ್ಯೂಟರ್ ಲ್ಯಾಬ್ (Computer Lab)",
  "💻 Computer Lab": "💻 ಕಂಪ್ಯೂಟರ್ ಲ್ಯಾಬ್ (Computer Lab)",
  "Main Block": "ಮುಖ್ಯ ಬ್ಲಾಕ್ (Main Block)",
  "🏛️ Main Block (Admin)": "🏛️ ಮುಖ್ಯ ಬ್ಲಾಕ್ (ಆಡಳಿತ)",
  "Hostel": "ಹಾಸ್ಟೆಲ್ (Hostel)",
  "🏢 Hostel Block": "🏢 ಹಾಸ್ಟೆಲ್ ಬ್ಲಾಕ್",
  "Sports Ground": "ಕ್ರೀಡಾಂಗಣ (Sports Ground)",
  "⚽ Sports Ground": "⚽ ಕ್ರೀಡಾಂಗಣ (Sports Ground)",
  "Parking": "ಪಾರ್ಕಿಂಗ್ (Parking)",
  "🚗 Parking Lot": "🚗 ಪಾರ್ಕಿಂಗ್ (Parking)",
  "Auditorium": "ಆಡಿಟೋರಿಯಂ (Auditorium)",
  "🎭 Auditorium": "🎭 ಆಡಿಟೋರಿಯಂ (Auditorium)",
  "Other / Unknown": "ಇತರೆ / ತಿಳಿದಿಲ್ಲ (Other / Unknown)",
  "Other / Unknown (Not Sure Where Lost)": "ಇತರೆ / ತಿಳಿದಿಲ್ಲ (ಎಲ್ಲಿ ಕಳೆದುಹೋಗಿದೆ ಎಂದು ಖಚಿತವಿಲ್ಲ)",
  "Other / Unknown (Other Campus Area)": "ಇತರೆ / ತಿಳಿದಿಲ್ಲ (ಕ್ಯಾಂಪಸ್‌ನ ಇತರ ಸ್ಥಳ)",
  "Select Location": "ಸ್ಥಳವನ್ನು ಆಯ್ಕೆಮಾಡಿ",

  // Statuses
  "Open": "ಮುಕ್ತ (Open)",
  "Matched": "ಹೊಂದಿಕೆಯಾಗಿದೆ (Matched)",
  "Claim Pending": "ಕ್ಲೈಮ್ ಬಾಕಿ ಇದೆ (Pending)",
  "Approved": "ಅನುಮೋದಿಸಲಾಗಿದೆ (Approved)",
  "Returned": "ವಾಪಸ್ ನೀಡಲಾಗಿದೆ (Returned)",

  // Report Forms
  "Report a Lost Item": "ಕಳೆದುಹೋದ ವಸ್ತುವನ್ನು ವರದಿ ಮಾಡಿ",
  "Provide details so our AI Smart Matcher can automatically cross-reference found reports on campus.": "ವಿವರಗಳನ್ನು ನೀಡಿ, ಇದರಿಂದ ನಮ್ಮ ಎಐ ಸ್ಮಾರ್ಟ್ ಮ್ಯಾಚರ್ ಕ್ಯಾಂಪಸ್‌ನಲ್ಲಿ ದೊರೆತ ವರದಿಗಳೊಂದಿಗೆ ಸ್ವಯಂಚಾಲಿತವಾಗಿ ಹೊಂದಿಸುತ್ತದೆ.",
  "Item Name *": "ವಸ್ತುವಿನ ಹೆಸರು *",
  "Item Name": "ವಸ್ತುವಿನ ಹೆಸರು",
  "Primary Color *": "ಮುಖ್ಯ ಬಣ್ಣ *",
  "Primary Color": "ಮುಖ್ಯ ಬಣ್ಣ",
  "Date Lost *": "ಕಳೆದುಹೋದ ದಿನಾಂಕ *",
  "Date Found *": "ದೊರೆತ ದಿನಾಂಕ *",
  "Date": "ದಿನಾಂಕ",
  "Description & Identifying Details *": "ವಿವರಣೆ ಮತ್ತು ಗುರುತಿನ ಮಾಹಿತಿ *",
  "Description & Details": "ವಿವರಣೆ ಮತ್ತು ಗುರುತಿನ ಮಾಹಿತಿ",
  "Description": "ವಿವರಣೆ",
  "Speak to Dictate": "ಮಾತನಾಡಿ ಬರೆಯಿರಿ",
  "Item Photo (optional)": "ವಸ್ತುವಿನ ಭಾವಚಿತ್ರ (ಐಚ್ಛಿಕ)",
  "Submit Lost Item Report": "ಕಳೆದುಹೋದ ವಸ್ತು ವರದಿ ಸಲ್ಲಿಸಿ",
  "Submit Found Item Report": "ದೊರೆತ ವಸ್ತು ವರದಿ ಸಲ್ಲಿಸಿ",
  "Submit Report": "ವರದಿ ಸಲ್ಲಿಸಿ",
  "Report a Found Item": "ದೊರೆತ ವಸ್ತುವನ್ನು ವರದಿ ಮಾಡಿ",
  "Help a fellow student recover their property. Keep secret details safe for verification.": "ಸಹಪಾಠಿ ತಮ್ಮ ವಸ್ತುವನ್ನು ಮರಳಿ ಪಡೆಯಲು ಸಹಾಯ ಮಾಡಿ. ಪರಿಶೀಲನೆಗಾಗಿ ರಹಸ್ಯ ವಿವರಗಳನ್ನು ಸುರಕ್ಷಿತವಾಗಿಡಿ.",
  "Where is the item now? *": "ವಸ್ತು ಈಗ ಎಲ್ಲಿದೆ? *",
  "With me (I am holding it safely)": "ನನ್ನ ಬಳಿ ಇದೆ (ಸುರಕ್ಷಿತವಾಗಿದೆ)",
  "Handed over to Campus Security Desk": "ಕ್ಯಾಂಪಸ್ ಸೆಕ್ಯುರಿಟಿ ಡೆಸ್ಕ್‌ಗೆ ಒಪ್ಪಿಸಲಾಗಿದೆ",
  "Private Verification Detail (NEVER SHOWN PUBLICLY) *": "ಖಾಸಗಿ ಪರಿಶೀಲನಾ ರಹಸ್ಯ ವಿವರ (ಸಾರ್ವಜನಿಕವಾಗಿ ತೋರಿಸುವುದಿಲ್ಲ) *",
  "Private Verification Detail": "ಖಾಸಗಿ ಪರಿಶೀಲನಾ ವಿವರ",
  "Public Description (General overview) *": "ಸಾರ್ವಜನಿಕ ವಿವರಣೆ (ಸಾಮಾನ್ಯ ಅವಲೋಕನ) *",

  // Cards & Actions
  "Details": "ವಿವರಗಳು",
  "This is Mine": "ಇದು ನನ್ನದು",
  "This is Mine (Claim Item)": "ಇದು ನನ್ನದು (ಕ್ಲೈಮ್ ಮಾಡಿ)",
  "Your Report": "ನಿಮ್ಮ ವರದಿ",
  "Close": "ಮುಚ್ಚಿ",
  "Cancel": "ರದ್ದುಮಾಡಿ",
  "Item Details": "ವಸ್ತುವಿನ ವಿವರಗಳು",
  "Check Smart Matches": "ಸ್ಮಾರ್ಟ್ ಮ್ಯಾಚ್ ಪರಿಶೀಲಿಸಿ",
  "ℹ️ You reported finding this item": "ℹ️ ಈ ವಸ್ತು ದೊರೆತಿದೆ ಎಂದು ನೀವೇ ವರದಿ ಮಾಡಿದ್ದೀರಿ",
  "Claim Found Item:": "ದೊರೆತ ವಸ್ತುವನ್ನು ಕ್ಲೈಮ್ ಮಾಡಿ:",
  "Claim Item": "ವಸ್ತು ಕ್ಲೈಮ್ ಮಾಡಿ",
  "Verification Detail / Secret Answer *": "ಪರಿಶೀಲನಾ ವಿವರ / ರಹಸ್ಯ ಉತ್ತರ *",
  "Additional Message / Contact Note (optional)": "ಹೆಚ್ಚುವರಿ ಸಂದೇಶ / ಸಂಪರ್ಕ ಮಾಹಿತಿ (ಐಚ್ಛಿಕ)",
  "Submit Claim for Review": "ಪರಿಶೀಲನೆಗೆ ಕ್ಲೈಮ್ ಸಲ್ಲಿಸಿ",
  "Submit Claim": "ಕ್ಲೈಮ್ ಸಲ್ಲಿಸಿ",
  "Pending Review": "ಪರಿಶೀಲನೆ ಬಾಕಿ ಇದೆ",
  "🔒 Stored Private Detail (Secret)": "🔒 ದಾಖಲಾದ ಖಾಸಗಿ ವಿವರ (ರಹಸ್ಯ)",
  "📝 Claimant's Answer": "📝 ಕ್ಲೈಮ್ ಮಾಡಿದವರ ಉತ್ತರ",
  "Claimant Note:": "ಕ್ಲೈಮ್ ಮಾಡಿದವರ ಟಿಪ್ಪಣಿ:",
  "❌ Reject Claim": "❌ ಕ್ಲೈಮ್ ತಿರಸ್ಕರಿಸಿ",
  "✅ Approve & Generate QR Pass": "✅ ಅನುಮೋದಿಸಿ & QR ಪಾಸ್ ನೀಡಿ",
  "Campus Recovery QR Code": "ಕ್ಯಾಂಪಸ್ ರಿಕವರಿ QR ಕೋಡ್",
  "CLAIM CODE": "ಕ್ಲೈಮ್ ಕೋಡ್",
  "Show this QR code or claim code at the Campus Security Desk to collect your item.": "ನಿಮ್ಮ ವಸ್ತುವನ್ನು ಪಡೆಯಲು ಈ QR ಕೋಡ್ ಅಥವಾ ಕ್ಲೈಮ್ ಕೋಡ್ ಅನ್ನು ಕ್ಯಾಂಪಸ್ ಸೆಕ್ಯುರಿಟಿ ಡೆಸ್ಕ್‌ನಲ್ಲಿ ತೋರಿಸಿ.",

  // Smart Matches Page
  "⚡ AI Smart Matches": "⚡ ಎಐ ಸ್ಮಾರ್ಟ್ ಹೊಂದಾಣಿಕೆಗಳು",
  "Automated multi-factor matching across Category (30%), Text Similarity (30%), Color (15%), Location (15%), and Date (10%).": "ವರ್ಗ (30%), ಪಠ್ಯ (30%), ಬಣ್ಣ (15%), ಸ್ಥಳ (15%) ಮತ್ತು ದಿನಾಂಕ (10%) ಆಧಾರಿತ ಸ್ವಯಂಚಾಲಿತ ಹೊಂದಾಣಿಕೆ.",
  "All Matches": "ಎಲ್ಲಾ ಹೊಂದಾಣಿಕೆಗಳು",
  "80%+ (High)": "80%+ (ಹೆಚ್ಚು ಹೊಂದಾಣಿಕೆ)",
  "60-79% (Med)": "60-79% (ಮಧ್ಯಮ)",
  "My Items": "ನನ್ನ ವಸ್ತುಗಳು",
  "Loading AI Smart Matches...": "ಎಐ ಸ್ಮಾರ್ಟ್ ಹೊಂದಾಣಿಕೆಗಳನ್ನು ಲೋಡ್ ಮಾಡಲಾಗುತ್ತಿದೆ...",
  "No matches found in this category": "ಈ ವರ್ಗದಲ್ಲಿ ಯಾವುದೇ ಹೊಂದಾಣಿಕೆಗಳು ಕಂಡುಬಂದಿಲ್ಲ",
  "View Match →": "ಹೊಂದಾಣಿಕೆ ನೋಡಿ →",
  "View Details →": "ವಿವರಗಳನ್ನು ನೋಡಿ →",

  // My Reports Page
  "My Reports & Claims": "ನನ್ನ ವರದಿಗಳು ಮತ್ತು ಕ್ಲೈಮ್‌ಗಳು",
  "Manage your reported items, check claim statuses, and access your Recovery QR Codes.": "ನಿಮ್ಮ ವರದಿಗಳನ್ನು ನಿರ್ವಹಿಸಿ, ಕ್ಲೈಮ್ ಸ್ಥಿತಿ ಪರಿಶೀಲಿಸಿ ಮತ್ತು ರಿಕವರಿ QR ಕೋಡ್ ಪಡೆಯಿರಿ.",
  "+ Report Lost": "+ ಕಳೆದುಹೋದ ವರದಿ",
  "+ Report Found": "+ ದೊರೆತ ವರದಿ",
  "View Recovery Pass (QR)": "ರಿಕವರಿ ಪಾಸ್ ನೋಡಿ (QR)",
  "Loading your lost items...": "ನಿಮ್ಮ ಕಳೆದುಹೋದ ವಸ್ತುಗಳನ್ನು ಲೋಡ್ ಮಾಡಲಾಗುತ್ತಿದೆ...",
  "Loading your found items...": "ನಿಮ್ಮ ದೊರೆತ ವಸ್ತುಗಳನ್ನು ಲೋಡ್ ಮಾಡಲಾಗುತ್ತಿದೆ...",
  "Loading your claims...": "ನಿಮ್ಮ ಕ್ಲೈಮ್‌ಗಳನ್ನು ಲೋಡ್ ಮಾಡಲಾಗುತ್ತಿದೆ...",

  // Admin Desk
  "🛡️ Campus Security & Admin Desk": "🛡️ ಕ್ಯಾಂಪಸ್ ಭದ್ರತೆ ಮತ್ತು ಅಡ್ಮಿನ್ ಡೆಸ್ಕ್",
  "Master command center for verification, claims approval, analytics, and return handovers.": "ಪರಿಶೀಲನೆ, ಕ್ಲೈಮ್ ಅನುಮೋದನೆ, ವಿಶ್ಲೇಷಣೆ ಮತ್ತು ಹಸ್ತಾಂತರದ ಕಮಾಂಡ್ ಕೇಂದ್ರ.",
  "⚡ Re-run AI Matcher": "⚡ ಎಐ ಮ್ಯಾಚರ್ ಮರುಚಾಲನೆ",
  "Security Desk: Scan / Enter Claim Code": "ಸೆಕ್ಯುರಿಟಿ ಡೆಸ್ಕ್: ಕ್ಲೈಮ್ ಕೋಡ್ ಸ್ಕ್ಯಾನ್ / ನಮೂದಿಸಿ",
  "📷 Security Desk: Scan / Enter Claim Code": "📷 ಸೆಕ್ಯುರಿಟಿ ಡೆಸ್ಕ್: ಕ್ಲೈಮ್ ಕೋಡ್ ಸ್ಕ್ಯಾನ್ / ನಮೂದಿಸಿ",
  "When a student arrives at security with their QR Code or Claim Code, enter it here to complete handover.": "ವಿದ್ಯಾರ್ಥಿ ಕ್ಯೂಆರ್ ಕೋಡ್ ಅಥವಾ ಕ್ಲೈಮ್ ಕೋಡ್‌ನೊಂದಿಗೆ ಬಂದಾಗ, ಹಸ್ತಾಂತರ ಪೂರ್ಣಗೊಳಿಸಲು ಇಲ್ಲಿ ನಮೂದಿಸಿ.",
  "✅ Verify & Mark Returned": "✅ ಪರಿಶೀಲಿಸಿ ಮತ್ತು ವಾಪಸ್ ಮಾಡಿ",
  "Pending Claims Queue": "ಬಾಕಿ ಉಳಿದ ಕ್ಲೈಮ್‌ಗಳ ಸರತಿ ಸಾಲು",
  "Review student claims by comparing submitted verification answers against stored private details.": "ದಾಖಲಾದ ರಹಸ್ಯ ವಿವರಗಳೊಂದಿಗೆ ವಿದ್ಯಾರ್ಥಿಯ ಉತ್ತರಗಳನ್ನು ಹೋಲಿಸಿ ಪರಿಶೀಲಿಸಿ.",
  "All Campus Reports": "ಎಲ್ಲಾ ಕ್ಯಾಂಪಸ್ ವರದಿಗಳು",
  "Master ledger of all lost and found submissions": "ಎಲ್ಲಾ ಸಲ್ಲಿಕೆಗಳ ಮುಖ್ಯ ಲೆಡ್ಜರ್",
  "📊 Campus Reports by Zone (Chart.js)": "📊 ವಲಯವಾರು ಕ್ಯಾಂಪಸ್ ವರದಿಗಳು",
  "🛡️ Security Tips": "🛡️ ಭದ್ರತಾ ಸಲಹೆಗಳು",
  "Compare claimant's secret answer with the item's stored private detail.": "ದಾಖಲಾದ ರಹಸ್ಯ ವಿವರಗಳೊಂದಿಗೆ ವಿದ್ಯಾರ್ಥಿಯ ಉತ್ತರವನ್ನು ಹೋಲಿಸಿ ಪರಿಶೀಲಿಸಿ.",
  "Once approved, a unique encrypted QR code is issued to the student.": "ಅನುಮೋದನೆಯಾದ ನಂತರ, ವಿದ್ಯಾರ್ಥಿಗೆ ಎನ್‌ಕ್ರಿಪ್ಟ್ ಮಾಡಿದ QR ಕೋಡ್ ನೀಡಲಾಗುತ್ತದೆ.",
  "Never return an item without checking student college ID card.": "ವಿದ್ಯಾರ್ಥಿ ಐಡಿ ಕಾರ್ಡ್ ಪರಿಶೀಲಿಸದೆ ಯಾವುದೇ ವಸ್ತುವನ್ನು ಹಸ್ತಾಂತರಿಸಬೇಡಿ.",
  "Reported by (Finder)": "ವರದಿ ಮಾಡಿದವರು (ಕಂಡುಹಿಡಿದವರು)",
  "Claimed by (Claimant)": "ಕ್ಲೈಮ್ ಮಾಡಿದವರು (ವಿದ್ಯಾರ್ಥಿ)",
  "Item Public Description (Reported by Finder)": "ವಸ್ತುವಿನ ಸಾರ್ವಜನಿಕ ವಿವರಣೆ (ವರದಿಗಾರರಿಂದ)",
  "Stored Private Detail (Finder's Secret)": "ದಾಖಲಾದ ಖಾಸಗಿ ವಿವರ (ಗುಪ್ತ ರಹಸ್ಯ)",
  "Claimant's Submitted Answer": "ಕ್ಲೈಮ್ ಮಾಡಿದವರ ಸಲ್ಲಿಕೆಯಾದ ಉತ್ತರ",
  "Claimant's Additional Note:": "ಕ್ಲೈಮ್ ಮಾಡಿದವರ ಹೆಚ್ಚುವರಿ ಟಿಪ್ಪಣಿ:",
  "Approve & Issue QR Pass": "ಅನುಮೋದಿಸಿ & QR ಪಾಸ್ ನೀಡಿ",
  "Reject Claim": "ಕ್ಲೈಮ್ ತಿರಸ್ಕರಿಸಿ",
  "View QR Pass": "QR ಪಾಸ್ ನೋಡಿ",
  "Complete Handover": "ಹಸ್ತಾಂತರ ಪೂರ್ಣಗೊಳಿಸಿ",
  "Re-open for Review": "ಮರುಪರಿಶೀಲನೆಗೆ ತೆರೆಯಿರಿ",
  "Handover Complete & Returned": "ಹಸ್ತಾಂತರ ಪೂರ್ಣಗೊಂಡಿದೆ & ವಾಪಸ್ ನೀಡಲಾಗಿದೆ",
  "View Full Item": "ವಸ್ತುವಿನ ಪೂರ್ಣ ವಿವರ",
  "Copy Code": "ಕೋಡ್ ನಕಲಿಸಿ",
  "Full Item Dossier": "ವಸ್ತುವಿನ ಪೂರ್ಣ ಡಾಸಿಯರ್",
  "Mark Returned": "ವಾಪಸ್ ನೀಡಲಾಗಿದೆ ಎಂದು ಗುರುತಿಸಿ",
  "Delete": "ಅಳಿಸಿ",
  "Type": "ಪ್ರಕಾರ",
  "Title": "ಶೀರ್ಷಿಕೆ",
  "Reporter": "ವರದಿದಾರರು",
  "Actions": "ಕ್ರಮಗಳು",

  // Alerts & Notifications
  "🔔 Campus Recovery Alerts": "🔔 ಕ್ಯಾಂಪಸ್ ರಿಕವರಿ ಸೂಚನೆಗಳು",
  "Real-time updates on AI item matches, submitted claims, and recovery handovers.": "ಎಐ ಹೊಂದಾಣಿಕೆಗಳು, ಕ್ಲೈಮ್‌ಗಳು ಮತ್ತು ರಿಕವರಿಗಳ ನೈಜ-ಸಮಯದ ನವೀಕರಣಗಳು.",
  "✓ Mark All as Read": "✓ ಎಲ್ಲವನ್ನೂ ಓದಲಾಗಿದೆ ಎಂದು ಗುರುತಿಸಿ",
  "🗑️ Clear All": "🗑️ ಎಲ್ಲಾ ತೆರವುಗೊಳಿಸಿ",
  "All Alerts": "ಎಲ್ಲಾ ಸೂಚನೆಗಳು",
  "Unread": "ಓದದಿರುವವು",
  "No notifications yet": "ಇನ್ನೂ ಯಾವುದೇ ಸೂಚನೆಗಳಿಲ್ಲ",

  // Map
  "Interactive Campus Recovery Map": "ಸಂವಾದಾತ್ಮಕ ಕ್ಯಾಂಪಸ್ ರಿಕವರಿ ನಕ್ಷೆ",
  "Click on any campus zone to view active reports. Toggle Heatmap mode to visualize report density.": "ವರದಿಗಳನ್ನು ನೋಡಲು ಯಾವುದೇ ವಲಯ ಕ್ಲಿಕ್ ಮಾಡಿ. ಸಾಂದ್ರತೆ ನೋಡಲು ಹೀಟ್‌ಮ್ಯಾಪ್ ಆನ್ ಮಾಡಿ.",
  "🔥 Heatmap View": "🔥 ಹೀಟ್‌ಮ್ಯಾಪ್ ವೀಕ್ಷಣೆ",
  "Red Pins: Lost Items": "ಕೆಂಪು ಪಿನ್: ಕಳೆದುಹೋದ ವಸ್ತುಗಳು",
  "Green Pins: Found Items": "ಹಸಿರು ಪಿನ್: ದೊರೆತ ವಸ್ತುಗಳು",
  "(Click any zone to filter)": "(ಫಿಲ್ಟರ್ ಮಾಡಲು ಯಾವುದೇ ವಲಯ ಕ್ಲಿಕ್ ಮಾಡಿ)",
  "Showing: All Campus Zones": "ತೋರಿಸಲಾಗುತ್ತಿದೆ: ಎಲ್ಲಾ ಕ್ಯಾಂಪಸ್ ವಲಯಗಳು",

  // Login & Register
  "🚀 HACKATHON DEMO SHORTCUTS": "🚀 ಡೆಮೊ ತ್ವರಿತ ಲಾಗಿನ್",
  "👤 Student 1": "👤 ವಿದ್ಯಾರ್ಥಿ 1",
  "👤 Student 2": "👤 ವಿದ್ಯಾರ್ಥಿ 2",
  "👤 Student 3": "👤 ವಿದ್ಯಾರ್ಥಿ 3",
  "🛡️ Admin": "🛡️ ಅಡ್ಮಿನ್",
  "Campus Email": "ಕ್ಯಾಂಪಸ್ ಇಮೇಲ್",
  "Password": "ಪಾಸ್‌ವರ್ಡ್",
  "Full Name": "ಪೂರ್ಣ ಹೆಸರು",
  "Phone Number": "ದೂರವಾಣಿ ಸಂಖ್ಯೆ",
  "Phone Number (optional)": "ದೂರವಾಣಿ ಸಂಖ್ಯೆ (ಐಚ್ಛಿಕ)",
  "Role": "ಪಾತ್ರ",
  "Student": "ವಿದ್ಯಾರ್ಥಿ",
  "College Staff / Security Admin": "ಕಾಲೇಜು ಸಿಬ್ಬಂದಿ / ಭದ್ರತಾ ಅಡ್ಮಿನ್",
  "Create Password": "ಪಾಸ್‌ವರ್ಡ್ ರಚಿಸಿ",
  "Create Account": "ಖಾತೆ ರಚಿಸಿ",

  // AI Assistant
  "FindIt AI Assistant": "ಫೈಂಡ್‌ಇಟ್ ಎಐ ಸಹಾಯಕ",
  "Send": "ಕಳುಹಿಸಿ",
  "Ask about an item...": "ವಸ್ತುವಿನ ಬಗ್ಗೆ ಕೇಳಿ...",
  "Searching campus records...": "ಕ್ಯಾಂಪಸ್ ದಾಖಲೆಗಳನ್ನು ಹುಡುಕಲಾಗುತ್ತಿದೆ...",
  "👋 Hi! I can help you find missing items on campus. Ask me things like:": "👋 ನಮಸ್ಕಾರ! ಕ್ಯಾಂಪಸ್‌ನಲ್ಲಿ ಕಳೆದುಹೋದ ವಸ್ತುಗಳನ್ನು ಹುಡುಕಲು ನಾನು ಸಹಾಯ ಮಾಡಬಲ್ಲೆ. ಹೀಗೆ ಕೇಳಿ ನೋಡಿ:",
  "\"Has anyone found a calculator near the library?\"": "\"ಲೈಬ್ರರಿ ಬಳಿ ಕ್ಯಾಲ್ಕುಲೇಟರ್ ಸಿಕ್ಕಿದೆಯೇ?\"",

  // Seeded Campus Items & Product Names
  "Sony WH-1000XM4 Wireless Earphones": "ಸೋನಿ WH-1000XM4 ವೈರ್‌ಲೆಸ್ ಇಯರ್‌ಫೋನ್‌ಗಳು",
  "Casio fx-991EX Scientific Calculator": "ಕ್ಯಾಸಿಯೊ fx-991EX ಸೈಂಟಿಫಿಕ್ ಕ್ಯಾಲ್ಕುಲೇಟರ್",
  "Milton Thermosteel Water Bottle 750ml": "ಮಿಲ್ಟನ್ ಥರ್ಮೋಸ್ಟೀಲ್ ವಾಟರ್ ಬಾಟಲ್ 750ml",
  "College ID Card - Student B.Tech CSE": "ಕಾಲೇಜು ಐಡಿ ಕಾರ್ಡ್ - ವಿದ್ಯಾರ್ಥಿ ಬಿ.ಟೆಕ್ ಸಿಎಸ್ಇ",
  "Wildcraft Grey College Backpack": "ವೈಲ್ಡ್‌ಕ್ರಾಫ್ಟ್ ಬೂದು ಕಾಲೇಜು ಬ್ಯಾಕ್‌ಪ್ಯಾಕ್",
  "Apple AirPods Pro 2 Charging Case": "ಆಪಲ್ ಏರ್‌ಪಾಡ್ಸ್ ಪ್ರೊ 2 ಚಾರ್ಜಿಂಗ್ ಕೇಸ್",
  "Classmate Spiral Engineering Notebook & Scale": "ಕ್ಲಾಸ್‌ಮೇಟ್ ಸ್ಪೈರಲ್ ಎಂಜಿನಿಯರಿಂಗ್ ನೋಟ್‌ಬುಕ್ & ಸ್ಕೇಲ್",
  "Logitech Wireless Mouse & Fast Charger": "ಲಾಜಿಟೆಕ್ ವೈರ್‌ಲೆಸ್ ಮೌಸ್ & ಫಾಸ್ಟ್ ಚಾರ್ಜರ್",
  "Royal Enfield Bike Key with Leather Tag": "ರಾಯಲ್ ಎನ್‌ಫೀಲ್ಡ್ ಬೈಕ್ ಕೀಲಿ ಲೆದರ್ ಟ್ಯಾಗ್‌ನೊಂದಿಗೆ",
  "College Identity Card with Blue Strap": "ಕಾಲೇಜು ಗುರುತಿನ ಚೀಟಿ (ನೀಲಿ ಪಟ್ಟಿಯೊಂದಿಗೆ)",
  "Spiral Bound Notebook & Drafting Scale": "ಸ್ಪೈರಲ್ ಬೌಂಡ್ ನೋಟ್‌ಬುಕ್ & ಡ್ರಾಫ್ಟಿಂಗ್ ಸ್ಕೇಲ್",
  "White AirPods Charging Case": "ಬಿಳಿ ಏರ್‌ಪಾಡ್ಸ್ ಚಾರ್ಜಿಂಗ್ ಕೇಸ್",
  "Black Sony Wireless Over-Ear Headphones": "ಕಪ್ಪು ಸೋನಿ ವೈರ್‌ಲೆಸ್ ಓವರ್-ಇಯರ್ ಹೆಡ್‌ಫೋನ್ಸ್",
  "Silver Insulated Water Flask": "ಬೆಳ್ಳಿ ಬಣ್ಣದ ಇನ್ಸುಲೇಟೆಡ್ ವಾಟರ್ ಫ್ಲಾಸ್ಕ್",
  "Compact Wireless Optical Mouse & Fast Charger": "ಕಾಂಪ್ಯಾಕ್ಟ್ ವೈರ್‌ಲೆಸ್ ಆಪ್ಟಿಕಲ್ ಮೌಸ್ & ಫಾಸ್ಟ್ ಚಾರ್ಜರ್",
  "Grey Wildcraft College Bag": "ಬೂದು ವೈಲ್ಡ್‌ಕ್ರಾಫ್ಟ್ ಕಾಲೇಜು ಬ್ಯಾಗ್",
  "Casio Scientific Calculator ClassWiz": "ಕ್ಯಾಸಿಯೊ ಸೈಂಟಿಫಿಕ್ ಕ್ಯಾಲ್ಕುಲೇಟರ್ ಕ್ಲಾಸ್‌ವಿಜ್",
  "Brown Leather Men Wallet": "ಕಂದು ಲೆದರ್ ಪುರುಷರ ವ್ಯಾಲೆಟ್",

  // Seeded Item Descriptions
  "Matte black over-ear noise-cancelling headphones left near the silent study desk.": "ಸೈಲೆಂಟ್ ಸ್ಟಡಿ ಡೆಸ್ಕ್ ಬಳಿ ಬಿಡಲಾದ ಮ್ಯಾಟ್ ಕಪ್ಪು ಓವರ್-ಇಯರ್ ಶಬ್ದ ರದ್ದತಿ ಹೆಡ್‌ಫೋನ್‌ಗಳು.",
  "ClassWiz non-programmable scientific calculator with white slide-on cover.": "ಬಿಳಿ ಸ್ಲೈಡ್-ಆನ್ ಕವರ್ ಹೊಂದಿರುವ ಕ್ಲಾಸ್‌ವಿಜ್ ನಾನ್-ಪ್ರೋಗ್ರಾಮೆಬಲ್ ಸೈಂಟಿಫಿಕ್ ಕ್ಯಾಲ್ಕುಲೇಟರ್.",
  "Silver insulated metal water bottle with small dent at bottom edge.": "ಕೆಳಗಿನ ಅಂಚಿನಲ್ಲಿ ಸಣ್ಣ ಡೆಂಟ್ ಇರುವ ಬೆಳ್ಳಿ ಬಣ್ಣದ ಇನ್ಸುಲೇಟೆಡ್ ಮೆಟಲ್ ವಾಟರ್ ಬಾಟಲ್.",
  "Official college smart ID card with blue lanyard and cardholder pouch.": "ನೀಲಿ ಲ್ಯಾನ್ಯಾರ್ಡ್ ಮತ್ತು ಕಾರ್ಡ್‌ಹೋಲ್ಡರ್ ಪೌಚ್ ಹೊಂದಿರುವ ಅಧಿಕೃತ ಕಾಲೇಜು ಸ್ಮಾರ್ಟ್ ಐಡಿ ಕಾರ್ಡ್.",
  "Grey and black college backpack containing notebook and USB pen drive.": "ನೋಟ್‌ಬುಕ್ ಮತ್ತು ಯುಎಸ್‌ಬಿ ಪೆನ್ ಡ್ರೈವ್ ಹೊಂದಿರುವ ಬೂದು ಮತ್ತು ಕಪ್ಪು ಕಾಲೇಜು ಬ್ಯಾಕ್‌ಪ್ಯಾಕ್.",
  "White AirPods Pro charging case without the pods inside.": "ಒಳಗೆ ಪಾಡ್‌ಗಳಿಲ್ಲದ ಬಿಳಿ ಏರ್‌ಪಾಡ್ಸ್ ಪ್ರೊ ಚಾರ್ಜಿಂಗ್ ಕೇಸ್.",
  "Blue 300-page spiral notebook with lecture notes and 30cm transparent ruler.": "ಉಪನ್ಯಾಸ ನೋಟ್ಸ್ ಮತ್ತು 30 ಸೆಂ.ಮೀ ಪಾರದರ್ಶಕ ಸ್ಕೇಲ್ ಹೊಂದಿರುವ ನೀಲಿ 300 ಪುಟಗಳ ಸ್ಪೈರಲ್ ನೋಟ್‌ಬುಕ್.",
  "Silent optical mouse, charcoal grey color with Type-C 65W fast charger.": "ಟೈಪ್-ಸಿ 65W ಫಾಸ್ಟ್ ಚಾರ್ಜರ್‌ನೊಂದಿಗೆ ಸೈಲೆಂಟ್ ಆಪ್ಟಿಕಲ್ ಮೌಸ್, ಇದ್ದಿಲು ಬೂದು ಬಣ್ಣ.",
  "Single ignition key attached to a brown leather RE keychain.": "ಕಂದು ಬಣ್ಣದ ಲೆದರ್ ಆರ್‌ಇ ಕೀಚೈನ್‌ಗೆ ಜೋಡಿಸಲಾದ ಸಿಂಗಲ್ ಇಗ್ನಿಷನ್ ಕೀಲಿ.",
  "Student ID card found near the main administrative staircase.": "ಮುಖ್ಯ ಆಡಳಿತ ಮೆಟ್ಟಿಲುಗಳ ಬಳಿ ದೊರೆತ ವಿದ್ಯಾರ್ಥಿ ಗುರುತಿನ ಚೀಟಿ.",
  "Blue ruled spiral notes found on bench outside Seminar Hall 1.": "ಸೆಮಿನಾರ್ ಹಾಲ್ 1 ರ ಹೊರಗಿನ ಬೆಂಚ್ ಮೇಲೆ ದೊರೆತ ನೀಲಿ ರೂಲ್ಡ್ ಸ್ಪೈರಲ್ ನೋಟ್ಸ್.",
  "Glossy white wireless earphone case picked up from hostel mess lobby.": "ಹಾಸ್ಟೆಲ್ ಮೆಸ್ ಲಾಬಿಯಿಂದ ಪಡೆದ ಹೊಳೆಯುವ ಬಿಳಿ ವೈರ್‌ಲೆಸ್ ಇಯರ್‌ಫೋನ್ ಕೇಸ್.",
  "Found black Sony wireless headphones with zipped travel case on 2nd floor desk.": "2 ನೇ ಮಹಡಿಯ ಡೆಸ್ಕ್‌ನಲ್ಲಿ ಜಿಪ್ ಮಾಡಿದ ಟ್ರಾವೆಲ್ ಕೇಸ್‌ನೊಂದಿಗೆ ದೊರೆತ ಕಪ್ಪು ಸೋನಿ ವೈರ್‌ಲೆಸ್ ಹೆಡ್‌ಫೋನ್ಸ್.",
  "Found stainless steel water bottle at the canteen counter table.": "ಕ್ಯಾಂಟೀನ್ ಕೌಂಟರ್ ಟೇಬಲ್‌ನಲ್ಲಿ ದೊರೆತ ಸ್ಟೇನ್‌ಲೆಸ್ ಸ್ಟೀಲ್ ವಾಟರ್ ಬಾಟಲ್.",
  "Grey computer mouse and Type-C laptop charger found in computer lab 2.": "ಕಂಪ್ಯೂಟರ್ ಲ್ಯಾಬ್ 2 ರಲ್ಲಿ ದೊರೆತ ಬೂದು ಕಂಪ್ಯೂಟರ್ ಮೌಸ್ ಮತ್ತು ಟೈಪ್-ಸಿ ಲ್ಯಾಪ್‌ಟಾಪ್ ಚಾರ್ಜರ್.",
  "Grey backpack found in the reading hall corner.": "ರೀಡಿಂಗ್ ಹಾಲ್ ಮೂಲೆಯಲ್ಲಿ ದೊರೆತ ಬೂದು ಬ್ಯಾಕ್‌ಪ್ಯಾಕ್.",
  "Black scientific calculator fx-991EX left at Terminal 14 in computer lab.": "ಕಂಪ್ಯೂಟರ್ ಲ್ಯಾಬ್‌ನ ಟರ್ಮಿನಲ್ 14 ರಲ್ಲಿ ಬಿಡಲಾದ ಕಪ್ಪು ಸೈಂಟಿಫಿಕ್ ಕ್ಯಾಲ್ಕುಲೇಟರ್ fx-991EX.",
  "Tommy Hilfiger brown bi-fold wallet found in auditorium row 4.": "ಆಡಿಟೋರಿಯಂ ಸಾಲು 4 ರಲ್ಲಿ ದೊರೆತ ಟಾಮಿ ಹಿಲ್ಫಿಗರ್ ಕಂದು ಬೈ-ಫೋಲ್ಡ್ ವ್ಯಾಲೆಟ್.",

  // Seeded Private Details & Verification Answers
  "Roll number ends with digit 042 and valid till 2027": "ರೋಲ್ ನಂಬರ್ ಕೊನೆಯ ಅಂಕಿ 042 ಮತ್ತು 2027 ರವರೆಗೆ ಮಾನ್ಯತೆ ಹೊಂದಿದೆ",
  "First page has subject \"Data Structures & Algorithms\" written with green pen": "ಮೊದಲ ಪುಟದಲ್ಲಿ ಹಸಿರು ಪೆನ್ನಿನಿಂದ \"ಡೇಟಾ ಸ್ಟ್ರಕ್ಚರ್ಸ್ & ಆಲ್ಗಾರಿದಮ್ಸ್\" ಬರೆಯಲಾಗಿದೆ",
  "Serial number starts with H7Y and has transparent protective silicone sleeve": "ಕ್ರಮಸಂಖ್ಯೆಯು H7Y ನಿಂದ ಪ್ರಾರಂಭವಾಗುತ್ತದೆ ಮತ್ತು ಪಾರದರ್ಶಕ ಸಿಲಿಕೋನ್ ಕವರ್ ಹೊಂದಿದೆ",
  "Initials AS written in silver marker inside right headband": "ಬಲ ಹೆಡ್‌ಬ್ಯಾಂಡ್ ಒಳಗೆ ಸಿಲ್ವರ್ ಮಾರ್ಕರ್‌ನಿಂದ AS ಎಂದು ಬರೆಯಲಾಗಿದೆ",
  "Has a small dent on the bottom rim and black rubber ring": "ಕೆಳಗಿನ ಅಂಚಿನಲ್ಲಿ ಸಣ್ಣ ಡೆಂಟ್ ಮತ್ತು ಕಪ್ಪು ರಬ್ಬರ್ ರಿಂಗ್ ಹೊಂದಿದೆ",
  "Duracell battery inside with yellow inspection sticker on bottom": "ಒಳಗೆ ಡ್ಯುರಾಸೆಲ್ ಬ್ಯಾಟರಿ ಮತ್ತು ಕೆಳಭಾಗದಲ್ಲಿ ಹಳದಿ ಇನ್‌ಸ್ಪೆಕ್ಷನ್ ಸ್ಟಿಕ್ಕರ್ ಇದೆ",
  "Contains a red spiral engineering mechanics notebook and a SanDisk 32GB drive": "ಕೆಂಪು ಸ್ಪೈರಲ್ ಎಂಜಿನಿಯರಿಂಗ್ ಮೆಕ್ಯಾನಿಕ್ಸ್ ನೋಟ್‌ಬುಕ್ ಮತ್ತು ಸ್ಯಾನ್‌ಡಿಸ್ಕ್ 32GB ಡ್ರೈವ್ ಹೊಂದಿದೆ",
  "Name \"Rahul K.\" faintly written with pencil inside the slide cover": "ಸ್ಲೈಡ್ ಕವರ್ ಒಳಗೆ ಪೆನ್ಸಿಲ್‌ನಿಂದ \"ರಾಹುಲ್ ಕೆ.\" ಎಂದು ಬರೆಯಲಾಗಿದೆ",
  "Contains a metro card and exactly Rs 240 cash with student bus pass": "ಮೆಟ್ರೋ ಕಾರ್ಡ್ ಮತ್ತು ವಿದ್ಯಾರ್ಥಿ ಬಸ್ ಪಾಸ್‌ನೊಂದಿಗೆ ನಿಖರವಾಗಿ 240 ರೂ. ನಗದು ಇದೆ",
  "Initials AS written in silver marker on inner headband with blue case sticker": "ನೀಲಿ ಕೇಸ್ ಸ್ಟಿಕ್ಕರ್‌ನೊಂದಿಗೆ ಒಳ ಹೆಡ್‌ಬ್ಯಾಂಡ್‌ನಲ್ಲಿ ಸಿಲ್ವರ್ ಮಾರ್ಕರ್‌ನಿಂದ AS ಎಂದು ಬರೆಯಲಾಗಿದೆ",
  "Small dent on bottom rim with black rubber seal ring": "ಕಪ್ಪು ರಬ್ಬರ್ ಸೀಲ್ ರಿಂಗ್‌ನೊಂದಿಗೆ ಕೆಳಗಿನ ಅಂಚಿನಲ್ಲಿ ಸಣ್ಣ ಡೆಂಟ್ ಇದೆ",
  "My left earphone bud has a small scratch on the joint and it came with a red carrying pouch": "ನನ್ನ ಎಡ ಇಯರ್‌ಫೋನ್ ಜಾಯಿಂಟ್‌ನಲ್ಲಿ ಸಣ್ಣ ಗೀರು ಇದೆ ಮತ್ತು ಇದು ಕೆಂಪು ಪೌಚ್‌ನೊಂದಿಗೆ ಬಂದಿತ್ತು"
};

// Placeholders Map
const PLACEHOLDER_MAP = {
  "Search by title, description, brand, or color...": "ಶೀರ್ಷಿಕೆ, ವಿವರಣೆ, ಬಣ್ಣದ ಮೂಲಕ ಹುಡುಕಿ...",
  "e.g. Black Sony WH-1000XM4 Earphones": "ಉದಾ: ಕಪ್ಪು ಬಣ್ಣದ ಸೋನಿ ಇಯರ್‌ಫೋನ್",
  "e.g. Black, Blue, Silver": "ಉದಾ: ಕಪ್ಪು, ನೀಲಿ, ಬೆಳ್ಳಿ",
  "e.g. Black Wireless Over-Ear Headphones": "ಉದಾ: ಕಪ್ಪು ವೈರ್‌ಲೆಸ್ ಹೆಡ್‌ಫೋನ್ಸ್",
  "Describe branding, stickers, case type, or specific distinguishing marks...": "ಬ್ರಾಂಡ್, ಸ್ಟಿಕ್ಕರ್, ಗುರುತುಗಳನ್ನು ವಿವರಿಸಿ...",
  "Describe the item without revealing the private verification detail...": "ಖಾಸಗಿ ರಹಸ್ಯ ವಿವರವನ್ನು ಬಹಿರಂಗಪಡಿಸದೆ ವಿವರಿಸಿ...",
  "e.g. Tiny scratch on right hinge and blue sticker on inner case": "ಉದಾ: ಬಲಭಾಗದಲ್ಲಿ ಸಣ್ಣ ಗೀರು ಮತ್ತು ನೀಲಿ ಸ್ಟಿಕ್ಕರ್ ಇದೆ",
  "Enter Claim Code (e.g. FND-1A3B)": "ಕ್ಲೈಮ್ ಕೋಡ್ ನಮೂದಿಸಿ (ಉದಾ: FND-1A3B)",
  "Quick filter table...": "ಕೋಷ್ಟಕವನ್ನು ಹುಡುಕಿ...",
  "Ask about an item...": "ವಸ್ತುವಿನ ಬಗ್ಗೆ ಕೇಳಿ...",
  "e.g. My initial 'R.K.' is etched on the back cover, or there is a red sticker inside...": "ಉದಾ: ಹಿಂಭಾಗದಲ್ಲಿ ನನ್ನ ಹೆಸರು ಅಥವಾ ಕೆಂಪು ಸ್ಟಿಕ್ಕರ್ ಇದೆ...",
  "e.g. Can meet near Library entrance or Security desk": "ಉದಾ: ಗ್ರಂಥಾಲಯ ಪ್ರವೇಶ ದ್ವಾರ ಅಥವಾ ಸೆಕ್ಯುರಿಟಿ ಡೆಸ್ಕ್ ಬಳಿ ಭೇಟಿಯಾಗಬಹುದು"
};

// ==========================================
// Reverse Dictionaries: Kannada to English
// ==========================================
const KN_TO_EN_PHRASES = {};
for (const [en, kn] of Object.entries(EN_TO_KN_PHRASES)) {
  KN_TO_EN_PHRASES[kn] = en;
}

const KN_TO_EN_PLACEHOLDERS = {};
for (const [en, kn] of Object.entries(PLACEHOLDER_MAP)) {
  KN_TO_EN_PLACEHOLDERS[kn] = en;
}

// ==========================================
// Generic Product / Item Terms Dictionary
// Translates any dynamic product/item words
// ==========================================
const PRODUCT_TERM_MAP = [
  // Multi-word items (longer specific phrases first)
  [/Wireless Earphones/gi, "ವೈರ್‌ಲೆಸ್ ಇಯರ್‌ಫೋನ್‌ಗಳು"],
  [/Wireless Headphones/gi, "ವೈರ್‌ಲೆಸ್ ಹೆಡ್‌ಫೋನ್‌ಗಳು"],
  [/Wireless Optical Mouse/gi, "ವೈರ್‌ಲೆಸ್ ಆಪ್ಟಿಕಲ್ ಮೌಸ್"],
  [/Wireless Mouse/gi, "ವೈರ್‌ಲೆಸ್ ಮೌಸ್"],
  [/Optical Mouse/gi, "ಆಪ್ಟಿಕಲ್ ಮೌಸ್"],
  [/Scientific Calculator/gi, "ಸೈಂಟಿಫಿಕ್ ಕ್ಯಾಲ್ಕುಲೇಟರ್"],
  [/Charging Case/gi, "ಚಾರ್ಜಿಂಗ್ ಕೇಸ್"],
  [/AirPods Pro/gi, "ಏರ್‌ಪಾಡ್ಸ್ ಪ್ರೊ"],
  [/AirPods/gi, "ಏರ್‌ಪಾಡ್ಸ್"],
  [/Water Bottle/gi, "ವಾಟರ್ ಬಾಟಲ್"],
  [/Water Flask/gi, "ವಾಟರ್ ಫ್ಲಾಸ್ಕ್"],
  [/College Backpack/gi, "ಕಾಲೇಜು ಬ್ಯಾಕ್‌ಪ್ಯಾಕ್"],
  [/College Bag/gi, "ಕಾಲೇಜು ಬ್ಯಾಗ್"],
  [/Laptop Backpack/gi, "ಲ್ಯಾಪ್‌ಟಾಪ್ ಬ್ಯಾಕ್‌ಪ್ಯಾಕ್"],
  [/Identity Card/gi, "ಗುರುತಿನ ಚೀಟಿ (ID Card)"],
  [/Smart ID Card/gi, "ಸ್ಮಾರ್ಟ್ ಐಡಿ ಕಾರ್ಡ್"],
  [/Smart Card/gi, "ಸ್ಮಾರ್ಟ್ ಕಾರ್ಡ್"],
  [/ID Card/gi, "ಐಡಿ ಕಾರ್ಡ್"],
  [/Engineering Notebook/gi, "ಎಂಜಿನಿಯರಿಂಗ್ ನೋಟ್‌ಬುಕ್"],
  [/Spiral Bound Notebook/gi, "ಸ್ಪೈರಲ್ ಬೌಂಡ್ ನೋಟ್‌ಬುಕ್"],
  [/Spiral Notebook/gi, "ಸ್ಪೈರಲ್ ನೋಟ್‌ಬುಕ್"],
  [/Drafting Scale/gi, "ಡ್ರಾಫ್ಟಿಂಗ್ ಸ್ಕೇಲ್"],
  [/Fountain Pen/gi, "ಫೌಂಟೇನ್ ಪೆನ್"],
  [/Fast Charger/gi, "ಫಾಸ್ಟ್ ಚಾರ್ಜರ್"],
  [/Laptop Charger/gi, "ಲ್ಯಾಪ್‌ಟಾಪ್ ಚಾರ್ಜರ್"],
  [/Fitness Band/gi, "ಫಿಟ್‌ನೆಸ್ ಬ್ಯಾಂಡ್"],
  [/Leather Wallet/gi, "ಲೆದರ್ ವ್ಯಾಲೆಟ್"],
  [/Leather Tag/gi, "ಲೆದರ್ ಟ್ಯಾಗ್"],
  [/Two Bike Keys/gi, "ಎರಡು ಬೈಕ್ ಕೀಗಳು"],
  [/Bike Keys/gi, "ಬೈಕ್ ಕೀಗಳು"],
  [/Bike Key/gi, "ಬೈಕ್ ಕೀಲಿ"],
  [/Room Keys/gi, "ರೂಮ್ ಕೀಗಳು"],
  [/Room Key/gi, "ರೂಮ್ ಕೀಲಿ"],
  [/Hostel Keys/gi, "ಹಾಸ್ಟೆಲ್ ಕೀಗಳು"],
  [/Hostel Key/gi, "ಹಾಸ್ಟೆಲ್ ಕೀಲಿ"],
  [/\bTwo\b/gi, "ಎರಡು"],
  [/\bThree\b/gi, "ಮೂರು"],
  [/\bOne\b/gi, "ಒಂದು"],

  // Single word product types
  [/\bEarphones\b/gi, "ಇಯರ್‌ಫೋನ್‌ಗಳು"],
  [/\bHeadphones\b/gi, "ಹೆಡ್‌ಫೋನ್‌ಗಳು"],
  [/\bCalculator\b/gi, "ಕ್ಯಾಲ್ಕುಲೇಟರ್"],
  [/\bBackpack\b/gi, "ಬ್ಯಾಕ್‌ಪ್ಯಾಕ್"],
  [/\bNotebook\b/gi, "ನೋಟ್‌ಬುಕ್"],
  [/\bSmartwatch\b/gi, "ಸ್ಮಾರ್ಟ್‌ವಾಚ್"],
  [/\bWatch\b/gi, "ವಾಚ್"],
  [/\bWallet\b/gi, "ವ್ಯಾಲೆಟ್"],
  [/\bPurse\b/gi, "ಪರ್ಸ್"],
  [/\bKeys\b/gi, "ಕೀಲಿಗಳು"],
  [/\bKey\b/gi, "ಕೀಲಿ"],
  [/\bKeychain\b/gi, "ಕೀಚೈನ್"],
  [/\bMouse\b/gi, "ಮೌಸ್"],
  [/\bCharger\b/gi, "ಚಾರ್ಜರ್"],
  [/\bBottle\b/gi, "ಬಾಟಲ್"],
  [/\bFlask\b/gi, "ಫ್ಲಾಸ್ಕ್"],
  [/\bUmbrella\b/gi, "ಛತ್ರಿ"],
  [/\bSpectacles\b/gi, "ಕನ್ನಡಕ"],
  [/\bGlasses\b/gi, "ಕನ್ನಡಕ"],
  [/\bHelmet\b/gi, "ಹೆಲ್ಮೆಟ್"],
  [/\bJacket\b/gi, "ಜಾಕೆಟ್"],
  [/\bRing\b/gi, "ಉಂಗುರ"],
  [/\bBag\b/gi, "ಬ್ಯಾಗ್"],
  [/\bPouch\b/gi, "ಪೌಚ್"],
  [/\bPen\b/gi, "ಪೆನ್"],
  [/\bScale\b/gi, "ಸ್ಕೇಲ್"],
  [/\bRuler\b/gi, "ರೂಲರ್"],
  [/\bLaptop\b/gi, "ಲ್ಯಾಪ್‌ಟಾಪ್"],

  // Common colors
  [/\bMatte Black\b/gi, "ಮ್ಯಾಟ್ ಕಪ್ಪು"],
  [/\bCharcoal Grey\b/gi, "ಇದ್ದಿಲು ಬೂದು"],
  [/\bBlack\b/gi, "ಕಪ್ಪು"],
  [/\bWhite\b/gi, "ಬಿಳಿ"],
  [/\bBlue\b/gi, "ನೀಲಿ"],
  [/\bGrey\b/gi, "ಬೂದು"],
  [/\bGray\b/gi, "ಬೂದು"],
  [/\bSilver\b/gi, "ಬೆಳ್ಳಿ (ಸಿಲ್ವರ್)"],
  [/\bBrown\b/gi, "ಕಂದು"],
  [/\bRed\b/gi, "ಕೆಂಪು"],
  [/\bGreen\b/gi, "ಹಸಿರು"],
  [/\bYellow\b/gi, "ಹಳದಿ"],
  [/\bGolden\b/gi, "ಚಿನ್ನದ ಬಣ್ಣ (ಗೋಲ್ಡ್)"],
  [/\bGold\b/gi, "ಚಿನ್ನದ ಬಣ್ಣ"],
  [/\bPink\b/gi, "ಗುಲಾಬಿ"],

  // Brands and descriptors
  [/\bCasio\b/gi, "ಕ್ಯಾಸಿಯೊ"],
  [/\bSony\b/gi, "ಸೋನಿ"],
  [/\bWildcraft\b/gi, "ವೈಲ್ಡ್‌ಕ್ರಾಫ್ಟ್"],
  [/\bMilton\b/gi, "ಮಿಲ್ಟನ್"],
  [/\bApple\b/gi, "ಆಪಲ್"],
  [/\bLogitech\b/gi, "ಲಾಜಿಟೆಕ್"],
  [/\bClassmate\b/gi, "ಕ್ಲಾಸ್‌ಮೇಟ್"],
  [/\bTitan\b/gi, "ಟೈಟಾನ್"],
  [/\bFastrack\b/gi, "ಫಾಸ್ಟ್ರಾಕ್"],
  [/\bRoyal Enfield\b/gi, "ರಾಯಲ್ ಎನ್‌ಫೀಲ್ಡ್"],
  [/\bStudent\b/gi, "ವಿದ್ಯಾರ್ಥಿ"],
  [/\bCollege\b/gi, "ಕಾಲೇಜು"],
  [/\bLeather\b/gi, "ಲೆದರ್"],
  [/\bStainless Steel\b/gi, "ಸ್ಟೇನ್‌ಲೆಸ್ ಸ್ಟೀಲ್"],
  [/\bThermosteel\b/gi, "ಥರ್ಮೋಸ್ಟೀಲ್"],
  [/\bInsulated\b/gi, "ಇನ್ಸುಲೇಟೆಡ್"],

  // Match Explanation & Admin Verification Guidance
  [/Key overlap:/gi, "ಪ್ರಮುಖ ಹೊಂದಾಣಿಕೆ:"],
  [/Exact Category:/gi, "ನಿಖರ ವರ್ಗ:"],
  [/Related Category:/gi, "ಸಂಬಂಧಿತ ವರ್ಗ:"],
  [/Compatible Category:/gi, "ಹೊಂದಾಣಿಕೆಯಾಗುವ ವರ್ಗ:"],
  [/Identical zone/gi, "ಒಂದೇ ವಲಯ"],
  [/Adjacent zones/gi, "ಹತ್ತಿರದ ವಲಯಗಳು"],
  [/Same day occurrence/gi, "ಅದೇ ದಿನ"],
  [/Within 24 hours/gi, "24 ಗಂಟೆಗಳ ಒಳಗೆ"],
  [/Admin Check:/gi, "ಅಡ್ಮಿನ್ ಪರಿಶೀಲನೆ:"],
  [/High confidence/gi, "ಹೆಚ್ಚಿನ ಹೊಂದಾಣಿಕೆ ದರ"],
  [/Moderate confidence/gi, "ಮಧ್ಯಮ ಹೊಂದಾಣಿಕೆ ದರ"],
  [/Potential match/gi, "ಸಂಭಾವ್ಯ ಹೊಂದಾಣಿಕೆ"],
  [/Verify student's submitted answer matches finder's stored secret detail/gi, "ವಿದ್ಯಾರ್ಥಿಯ ಉತ್ತರವು ದಾಖಲಾದ ರಹಸ್ಯ ವಿವರಕ್ಕೆ ಹೊಂದಿಕೆಯಾಗುತ್ತದೆಯೇ ಎಂದು ಪರಿಶೀಲಿಸಿ"],
  [/Verify claimant's submitted verification answer against stored private secret detail/gi, "ವಿದ್ಯಾರ್ಥಿಯ ಉತ್ತರವು ದಾಖಲಾದ ರಹಸ್ಯ ವಿವರಕ್ಕೆ ಹೊಂದಿಕೆಯಾಗುತ್ತದೆಯೇ ಎಂದು ಪರಿಶೀಲಿಸಿ"]
];

function translateProductTerms(text) {
  if (!text || typeof text !== 'string') return text;
  // If already in Kannada, return as-is
  if (/[\u0C80-\u0CFF]/.test(text)) return text;

  let result = text;
  for (const [regex, kn] of PRODUCT_TERM_MAP) {
    if (regex.test(result)) {
      result = result.replace(regex, kn);
    }
  }
  return result;
}

let isTranslating = false;
let mutationTimeout = null;

// Language Toggle (English / Kannada)
function toggleLanguage() {
  currentLang = currentLang === 'en' ? 'kn' : 'en';
  localStorage.setItem('findit_lang', currentLang);
  applyLanguage(currentLang);
  showToast(currentLang === 'kn' ? 'ಭಾಷೆ ಬದಲಾಯಿಸಲಾಗಿದೆ: ಕನ್ನಡ' : 'Language changed: English', 'info');

  // Trigger active page re-renders if loaded
  try {
    if (typeof loadRecentItems === 'function') loadRecentItems();
    if (typeof loadFilteredItems === 'function') loadFilteredItems();
    if (typeof renderMatches === 'function') renderMatches();
    if (typeof loadMyData === 'function') loadMyData();
    if (typeof loadClaimsQueue === 'function') loadClaimsQueue();
    if (typeof loadAllItemsTable === 'function') loadAllItemsTable();
    if (typeof loadNotificationsPage === 'function') loadNotificationsPage();
    if (typeof loadZoneItems === 'function') loadZoneItems(typeof selectedZone !== 'undefined' ? selectedZone : null);
  } catch (err) {
    // Non-fatal if page-specific function is not on current page
  }
}

// Universal Language Application Function (Two-Way English <-> Kannada)
function applyLanguage(lang) {
  isTranslating = true;
  document.documentElement.lang = lang;
  const dict = TRANSLATIONS[lang] || TRANSLATIONS.en;

  // 1. Handle elements with explicit data-i18n
  const elements = document.querySelectorAll('[data-i18n]');
  elements.forEach(el => {
    const key = el.getAttribute('data-i18n');
    if (dict[key]) {
      if (el.tagName === 'INPUT' && (el.type === 'text' || el.type === 'search')) {
        el.placeholder = dict[key];
      } else {
        el.textContent = dict[key];
      }
    }
  });

  // 2. Handle Select Option elements
  const options = document.querySelectorAll('option');
  options.forEach(opt => {
    const txt = opt.textContent.trim();
    if (lang === 'kn') {
      if (!opt.hasAttribute('data-orig-en')) {
        opt.setAttribute('data-orig-en', txt);
      }
      const orig = opt.getAttribute('data-orig-en');
      if (EN_TO_KN_PHRASES[orig]) {
        opt.textContent = EN_TO_KN_PHRASES[orig];
      }
    } else {
      if (opt.hasAttribute('data-orig-en')) {
        opt.textContent = opt.getAttribute('data-orig-en');
      } else if (KN_TO_EN_PHRASES[txt]) {
        opt.textContent = KN_TO_EN_PHRASES[txt];
      }
    }
  });

  // 3. Handle Placeholders
  const inputs = document.querySelectorAll('input[placeholder], textarea[placeholder]');
  inputs.forEach(inp => {
    const ph = inp.placeholder;
    if (lang === 'kn') {
      if (!inp.hasAttribute('data-orig-ph')) {
        inp.setAttribute('data-orig-ph', ph);
      }
      const orig = inp.getAttribute('data-orig-ph');
      if (PLACEHOLDER_MAP[orig]) {
        inp.placeholder = PLACEHOLDER_MAP[orig];
      } else if (EN_TO_KN_PHRASES[orig]) {
        inp.placeholder = EN_TO_KN_PHRASES[orig];
      }
    } else {
      if (inp.hasAttribute('data-orig-ph')) {
        inp.placeholder = inp.getAttribute('data-orig-ph');
      } else if (KN_TO_EN_PLACEHOLDERS[ph]) {
        inp.placeholder = KN_TO_EN_PLACEHOLDERS[ph];
      } else if (KN_TO_EN_PHRASES[ph]) {
        inp.placeholder = KN_TO_EN_PHRASES[ph];
      }
    }
  });

  // 4. Universal DOM text walker
  const textSelectors = 'h1, h2, h3, h4, h5, p, span, label, button, a, th, td, div.meta-chip, div.item-card-title, div.stat-label, div.notif-tab, div.legend-item, div.item-desc, strong, em';
  const targetNodes = document.querySelectorAll(textSelectors);

  targetNodes.forEach(el => {
    // Never alter the toggle button itself via generic walker
    if (el.id === 'langToggleBtn' || el.closest('#langToggleBtn')) return;

    el.childNodes.forEach(child => {
      if (child.nodeType === Node.TEXT_NODE) {
        const text = child.textContent.trim();
        if (!text) return;

        if (lang === 'kn') {
          if (!child._origEnText) {
            child._origEnText = text;
          }
          const orig = child._origEnText;

          // Direct phrase match
          if (EN_TO_KN_PHRASES[orig]) {
            child.textContent = child.textContent.replace(text, EN_TO_KN_PHRASES[orig]);
          } else if (EN_TO_KN_PHRASES[text]) {
            child.textContent = child.textContent.replace(text, EN_TO_KN_PHRASES[text]);
          }
          // Dynamic patterns
          else if (/^Reported by\s+(.+)$/i.test(orig)) {
            const name = orig.replace(/^Reported by\s+/i, '');
            child.textContent = `ವರದಿ ಮಾಡಿದವರು: ${name}`;
          } else if (/^Lost Reports\s*\((.+)\)$/i.test(orig)) {
            const count = orig.match(/\((.+)\)/)[1];
            child.textContent = `📋 ಕಳೆದುಹೋದ ವರದಿಗಳು (${count})`;
          } else if (/^Found Reports\s*\((.+)\)$/i.test(orig)) {
            const count = orig.match(/\((.+)\)/)[1];
            child.textContent = `📦 ದೊರೆತ ವರದಿಗಳು (${count})`;
          } else if (/^My Claims\s*&.*QR.*\((.+)\)$/i.test(orig)) {
            const count = orig.match(/\((.+)\)/)[1];
            child.textContent = `📱 ನನ್ನ ಕ್ಲೈಮ್‌ಗಳು & QR (${count})`;
          } else if (/^All Alerts\s*\((.+)\)$/i.test(orig)) {
            const count = orig.match(/\((.+)\)/)[1];
            child.textContent = `ಎಲ್ಲಾ ಸೂಚನೆಗಳು (${count})`;
          } else if (/^Unread\s*\((.+)\)$/i.test(orig)) {
            const count = orig.match(/\((.+)\)/)[1];
            child.textContent = `ಓದದಿರುವವು (${count})`;
          } else if (/^(\d+)%\s*MATCH$/i.test(orig)) {
            const score = orig.match(/^(\d+)%/)[1];
            child.textContent = `${score}% ಹೊಂದಾಣಿಕೆ`;
          } else if (/^Match ID\s*#(\d+)$/i.test(orig)) {
            const id = orig.match(/#(\d+)/)[1];
            child.textContent = `ಹೊಂದಾಣಿಕೆ ID #${id}`;
          } else if (/^Showing:\s*(.+)$/i.test(orig)) {
            const zone = orig.replace(/^Showing:\s*/, '');
            child.textContent = `ತೋರಿಸಲಾಗುತ್ತಿದೆ: ${zone}`;
          } else {
            // Intelligent Product / Item Name & Description translation
            const translated = translateProductTerms(orig);
            if (translated && translated !== orig) {
              child.textContent = child.textContent.replace(text, translated);
            }
          }
        } else {
          // Revert back to English
          if (child._origEnText) {
            child.textContent = child.textContent.replace(text, child._origEnText);
          } else if (KN_TO_EN_PHRASES[text]) {
            child.textContent = child.textContent.replace(text, KN_TO_EN_PHRASES[text]);
          }
          // Reverse dynamic patterns
          else if (/^ವರದಿ ಮಾಡಿದವರು:\s*(.+)$/i.test(text)) {
            const name = text.replace(/^ವರದಿ ಮಾಡಿದವರು:\s*/i, '');
            child.textContent = `Reported by ${name}`;
          } else if (/^📋 ಕಳೆದುಹೋದ ವರದಿಗಳು\s*\((.+)\)$/i.test(text)) {
            const count = text.match(/\((.+)\)/)[1];
            child.textContent = `📋 Lost Reports (${count})`;
          } else if (/^📦 ದೊರೆತ ವರದಿಗಳು\s*\((.+)\)$/i.test(text)) {
            const count = text.match(/\((.+)\)/)[1];
            child.textContent = `📦 Found Reports (${count})`;
          } else if (/^📱 ನನ್ನ ಕ್ಲೈಮ್‌ಗಳು & QR\s*\((.+)\)$/i.test(text)) {
            const count = text.match(/\((.+)\)/)[1];
            child.textContent = `📱 My Claims & QR Codes (${count})`;
          } else if (/^ಎಲ್ಲಾ ಸೂಚನೆಗಳು\s*\((.+)\)$/i.test(text)) {
            const count = text.match(/\((.+)\)/)[1];
            child.textContent = `All Alerts (${count})`;
          } else if (/^ಓದದಿರುವವು\s*\((.+)\)$/i.test(text)) {
            const count = text.match(/\((.+)\)/)[1];
            child.textContent = `Unread (${count})`;
          } else if (/^(\d+)%\s*ಹೊಂದಾಣಿಕೆ$/i.test(text)) {
            const score = text.match(/^(\d+)%/)[1];
            child.textContent = `${score}% MATCH`;
          } else if (/^ಹೊಂದಾಣಿಕೆ ID\s*#(\d+)$/i.test(text)) {
            const id = text.match(/#(\d+)/)[1];
            child.textContent = `Match ID #${id}`;
          } else if (/^ತೋರಿಸಲಾಗುತ್ತಿದೆ:\s*(.+)$/i.test(text)) {
            const zone = text.replace(/^ತೋರಿಸಲಾಗುತ್ತಿದೆ:\s*/, '');
            child.textContent = `Showing: ${zone}`;
          }
        }
      }
    });
  });

  // 5. Update Language Toggle Button Text
  const langBtn = document.getElementById('langToggleBtn');
  if (langBtn) {
    langBtn.textContent = lang === 'en' ? 'ಕನ್ನಡ / EN' : 'English / ಕ';
  }

  isTranslating = false;
}

// Observe dynamic changes and auto-translate if Kannada is active
if (typeof MutationObserver !== 'undefined') {
  const domObserver = new MutationObserver(() => {
    if (currentLang === 'kn' && !isTranslating) {
      if (mutationTimeout) clearTimeout(mutationTimeout);
      mutationTimeout = setTimeout(() => {
        applyLanguage('kn');
      }, 75);
    }
  });

  document.addEventListener('DOMContentLoaded', () => {
    domObserver.observe(document.body, { childList: true, subtree: true });
  });
}

// Toast Notifications
function showToast(message, type = 'info') {
  const container = document.getElementById('toastContainer');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `
    <div style="flex:1; font-size:0.9rem; font-weight:500;">${escapeHtml(message)}</div>
    <button onclick="this.parentElement.remove()" style="background:none; border:none; color:#94a3b8; cursor:pointer; font-size:1.1rem;">&times;</button>
  `;
  container.appendChild(toast);

  setTimeout(() => {
    if (toast.parentElement) toast.remove();
  }, 4500);
}

// Voice Dictation (Web Speech API)
function initVoiceInput(targetInputId, buttonId) {
  const btn = document.getElementById(buttonId);
  const input = document.getElementById(targetInputId);
  if (!btn || !input) return;

  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) {
    btn.title = "Voice recognition not supported in this browser";
    btn.style.opacity = '0.5';
    btn.onclick = () => showToast("Voice speech recognition not supported in this browser.", "error");
    return;
  }

  const recognition = new SpeechRecognition();
  recognition.continuous = false;
  recognition.interimResults = false;
  recognition.lang = currentLang === 'kn' ? 'kn-IN' : 'en-US';

  let isRecording = false;

  btn.addEventListener('click', (e) => {
    e.preventDefault();
    if (isRecording) {
      recognition.stop();
      return;
    }

    try {
      recognition.start();
      isRecording = true;
      btn.classList.add('recording');
      btn.innerHTML = `<span style="color:#ef4444;">●</span> ${TRANSLATIONS[currentLang]?.voice_listening || 'Listening...'}`;
    } catch (err) {
      console.warn("Speech start error:", err);
    }
  });

  recognition.onresult = (event) => {
    const transcript = event.results[0][0].transcript;
    input.value = input.value ? input.value + ' ' + transcript : transcript;
    showToast(`Transcribed: "${transcript}"`, 'success');
  };

  recognition.onerror = (event) => {
    console.error('Speech recognition error:', event.error);
    showToast(`Speech error: ${event.error}`, 'error');
  };

  recognition.onend = () => {
    isRecording = false;
    btn.classList.remove('recording');
    btn.innerHTML = `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="22"/></svg> ${TRANSLATIONS[currentLang]?.btn_voice || 'Speak to Dictate'}`;
  };
}

// AI Assistant Chat Widget (Phase 5a)
function renderAssistantWidget() {
  if (document.getElementById('finditAssistantWidget')) return;

  const widgetHtml = `
    <div class="assistant-widget" id="finditAssistantWidget">
      <button class="assistant-toggle-btn" onclick="toggleAssistant()" title="Ask FindIt Assistant">
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
        </svg>
      </button>

      <div class="assistant-popup" id="assistantPopup">
        <div class="assistant-header">
          <div style="font-weight:700; display:flex; align-items:center; gap:0.4rem;">
            <span>🤖</span> <span data-i18n="assistant_title">FindIt AI Assistant</span>
          </div>
          <button onclick="toggleAssistant()" style="background:none; border:none; color:#fff; cursor:pointer; font-size:1.2rem;">&times;</button>
        </div>

        <div class="assistant-messages" id="assistantMessages">
          <div class="assistant-msg bot">
            👋 Hi! I can help you find missing items on campus. Ask me things like:
            <em>"Has anyone found a calculator near the library?"</em>
          </div>
        </div>

        <form class="assistant-input-area" onsubmit="sendAssistantMessage(event)">
          <input type="text" id="assistantInput" class="form-control" placeholder="Ask about an item..." style="font-size:0.85rem;" required />
          <button type="submit" class="btn btn-sm btn-primary">Send</button>
        </form>
      </div>
    </div>
  `;

  document.body.insertAdjacentHTML('beforeend', widgetHtml);
}

function toggleAssistant() {
  const popup = document.getElementById('assistantPopup');
  if (popup) popup.classList.toggle('open');
}

async function sendAssistantMessage(e) {
  e.preventDefault();
  const input = document.getElementById('assistantInput');
  const msgContainer = document.getElementById('assistantMessages');
  const text = input.value.trim();
  if (!text) return;

  // Add user message
  const userDiv = document.createElement('div');
  userDiv.className = 'assistant-msg user';
  userDiv.textContent = text;
  msgContainer.appendChild(userDiv);
  input.value = '';
  msgContainer.scrollTop = msgContainer.scrollHeight;

  // Typing indicator
  const botDiv = document.createElement('div');
  botDiv.className = 'assistant-msg bot';
  botDiv.textContent = 'Searching campus records...';
  msgContainer.appendChild(botDiv);
  msgContainer.scrollTop = msgContainer.scrollHeight;

  try {
    const res = await fetch('/api/assistant/query', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: text })
    });
    const data = await res.json();

    let html = `<div>${escapeHtml(data.reply)}</div>`;
    if (data.results && data.results.length > 0) {
      html += `<div style="margin-top:0.5rem; display:flex; flex-direction:column; gap:0.4rem;">`;
      data.results.forEach(item => {
        html += `
          <div style="background:#fff; border:1px solid #e2e8f0; border-radius:6px; padding:0.4rem 0.6rem; font-size:0.8rem;">
            <strong>[${item.type.toUpperCase()}] ${escapeHtml(item.title)}</strong><br/>
            <span style="color:#64748b;">📍 ${escapeHtml(item.location)} | 🏷️ ${escapeHtml(item.category)}</span><br/>
            <a href="/search.html?search=${encodeURIComponent(item.title)}" style="font-weight:600; font-size:0.75rem;">View Details &rarr;</a>
          </div>
        `;
      });
      html += `</div>`;
    }

    botDiv.innerHTML = html;
    msgContainer.scrollTop = msgContainer.scrollHeight;
  } catch (err) {
    botDiv.textContent = 'Sorry, could not process request right now.';
  }
}

// Claim Modal Utility
function openClaimModal(itemId, itemTitle, itemUserId) {
  if (!currentUser) {
    showToast(TRANSLATIONS[currentLang]?.toast_login_required || 'Please log in to submit a claim', 'error');
    setTimeout(() => {
      window.location.href = '/login.html';
    }, 1200);
    return;
  }

  if (itemUserId && currentUser.id === itemUserId) {
    showToast('You cannot claim an item that you reported finding yourself', 'error');
    return;
  }

  let modal = document.getElementById('claimModal');
  if (!modal) {
    const modalHtml = `
      <div class="modal-overlay" id="claimModal">
        <div class="modal-window">
          <div class="modal-header">
            <h3 style="font-size:1.15rem;">Claim Found Item: <span id="claimModalItemTitle" style="color:var(--primary);"></span></h3>
            <button class="modal-close-btn" onclick="closeClaimModal()">&times;</button>
          </div>
          <form onsubmit="submitClaimForm(event)">
            <input type="hidden" id="claimModalItemId" />
            <div class="form-group" style="margin-bottom:1rem;">
              <label style="font-weight:700;">Verification Detail / Secret Answer *</label>
              <p style="font-size:0.8rem; color:var(--text-muted); margin-bottom:0.4rem;">
                The finder set a private verification detail. Please describe the item's identifying marks, engravings, or contents to prove ownership:
              </p>
              <textarea id="claimVerificationAnswer" class="form-control" rows="3" required placeholder="e.g. My initial 'R.K.' is etched on the back cover, or there is a red sticker inside..."></textarea>
            </div>
            <div class="form-group" style="margin-bottom:1.25rem;">
              <label>Additional Message / Contact Note (optional)</label>
              <input type="text" id="claimMessage" class="form-control" placeholder="e.g. Can meet near Library entrance or Security desk" />
            </div>
            <div style="display:flex; justify-content:flex-end; gap:0.5rem;">
              <button type="button" class="btn btn-outline" onclick="closeClaimModal()">Cancel</button>
              <button type="submit" class="btn btn-primary" id="claimSubmitBtn">Submit Claim for Review</button>
            </div>
          </form>
        </div>
      </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHtml);
    modal = document.getElementById('claimModal');
  }

  document.getElementById('claimModalItemId').value = itemId;
  document.getElementById('claimModalItemTitle').textContent = itemTitle;
  document.getElementById('claimVerificationAnswer').value = '';
  document.getElementById('claimMessage').value = '';
  modal.classList.add('active');
  applyLanguage(currentLang);
}

function closeClaimModal() {
  const modal = document.getElementById('claimModal');
  if (modal) modal.classList.remove('active');
}

async function submitClaimForm(e) {
  e.preventDefault();
  const itemId = document.getElementById('claimModalItemId').value;
  const answer = document.getElementById('claimVerificationAnswer').value.trim();
  const message = document.getElementById('claimMessage').value.trim();
  const btn = document.getElementById('claimSubmitBtn');

  if (!answer) {
    showToast('Please provide an answer to verify ownership', 'error');
    return;
  }

  btn.disabled = true;
  btn.textContent = 'Submitting...';

  try {
    const res = await fetch('/api/claims', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        item_id: itemId,
        verification_answer: answer,
        message
      })
    });
    const data = await res.json();
    btn.disabled = false;
    btn.textContent = 'Submit Claim for Review';

    if (res.ok && data.success) {
      closeClaimModal();
      showToast('Claim submitted! The finder/admin will review your verification answer.', 'success');
      setTimeout(() => {
        window.location.href = '/my-reports.html#claims';
      }, 1200);
    } else {
      showToast(data.error || 'Claim submission failed', 'error');
    }
  } catch (err) {
    btn.disabled = false;
    btn.textContent = 'Submit Claim for Review';
    showToast('Network error submitting claim', 'error');
  }
}

// Helper: Escape HTML
function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}


// Item Details Popup Modal
async function openItemDetailsModal(itemId) {
  let modal = document.getElementById('itemDetailsModal');
  if (!modal) {
    const modalHtml = `
      <div class="modal-overlay" id="itemDetailsModal" onclick="if(event.target===this) closeItemDetailsModal()">
        <div class="modal-window" style="max-width: 640px;">
          <div class="modal-header">
            <div style="display:flex; align-items:center; gap:0.6rem;">
              <span id="detailTypeBadge" class="item-type-badge" style="position:static;"></span>
              <h3 id="detailModalTitle" style="font-size:1.2rem; color:var(--text-main);">Item Details</h3>
            </div>
            <button class="modal-close-btn" onclick="closeItemDetailsModal()">&times;</button>
          </div>
          <div id="detailModalBody" style="padding:0.5rem 0;">
            <div style="text-align:center; padding:2rem; color:var(--text-muted);">Loading item details...</div>
          </div>
        </div>
      </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHtml);
    modal = document.getElementById('itemDetailsModal');
  }

  const bodyEl = document.getElementById('detailModalBody');
  const typeBadge = document.getElementById('detailTypeBadge');
  const titleEl = document.getElementById('detailModalTitle');

  modal.classList.add('active');
  bodyEl.innerHTML = '<div style="text-align:center; padding:2rem; color:var(--text-muted);">Loading details...</div>';

  try {
    const res = await fetch(`/api/items/${itemId}`);
    const data = await res.json();
    const item = data.item;
    const matches = data.matches || [];

    if (!item) {
      bodyEl.innerHTML = '<div style="color:#ef4444; text-align:center;">Item not found.</div>';
      return;
    }

    typeBadge.className = `item-type-badge ${item.type === 'lost' ? 'type-lost' : 'type-found'}`;
    typeBadge.textContent = item.type.toUpperCase();
    titleEl.textContent = item.title;

    bodyEl.innerHTML = `
      <div style="display:flex; flex-direction:column; gap:1.25rem;">
        <!-- Top Image Banner -->
        <div style="width:100%; height:200px; background:#f1f5f9; border-radius:12px; overflow:hidden; display:flex; align-items:center; justify-content:center; border:1px solid #e2e8f0;">
          <img src="${item.image_url || '/images/default-item.svg'}" alt="${escapeHtml(item.title)}" style="max-height:100%; max-width:100%; object-fit:contain;" onerror="this.src='/images/default-item.svg'" />
        </div>

        <!-- Meta Grid -->
        <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap:0.75rem;">
          <div class="meta-chip" style="padding:0.5rem 0.75rem; flex-direction:column; align-items:flex-start;">
            <span style="font-size:0.7rem; color:#64748b; font-weight:600;">CATEGORY</span>
            <span style="font-weight:700; color:var(--text-main);">🏷️ ${escapeHtml(item.category)}</span>
          </div>
          <div class="meta-chip" style="padding:0.5rem 0.75rem; flex-direction:column; align-items:flex-start;">
            <span style="font-size:0.7rem; color:#64748b; font-weight:600;">COLOR</span>
            <span style="font-weight:700; color:var(--text-main);">🎨 ${escapeHtml(item.color)}</span>
          </div>
          <div class="meta-chip" style="padding:0.5rem 0.75rem; flex-direction:column; align-items:flex-start;">
            <span style="font-size:0.7rem; color:#64748b; font-weight:600;">CAMPUS LOCATION</span>
            <span style="font-weight:700; color:var(--text-main);">📍 ${escapeHtml(item.location)}</span>
          </div>
          <div class="meta-chip" style="padding:0.5rem 0.75rem; flex-direction:column; align-items:flex-start;">
            <span style="font-size:0.7rem; color:#64748b; font-weight:600;">DATE</span>
            <span style="font-weight:700; color:var(--text-main);">📅 ${escapeHtml(item.date_lost_or_found)}</span>
          </div>
          <div class="meta-chip" style="padding:0.5rem 0.75rem; flex-direction:column; align-items:flex-start;">
            <span style="font-size:0.7rem; color:#64748b; font-weight:600;">STATUS</span>
            <span class="role-badge ${item.status === 'Returned' ? 'role-student' : 'role-admin'}">${escapeHtml(item.status)}</span>
          </div>
          <div class="meta-chip" style="padding:0.5rem 0.75rem; flex-direction:column; align-items:flex-start;">
            <span style="font-size:0.7rem; color:#64748b; font-weight:600;">REPORTED BY</span>
            <span style="font-weight:700; color:var(--text-main);">👤 ${escapeHtml(item.reporter_name || 'Student')}</span>
          </div>
        </div>

        ${item.type === 'found' && item.current_location_desc ? `
          <div style="background:#eff6ff; border:1px solid #bfdbfe; border-radius:8px; padding:0.6rem 0.9rem; font-size:0.85rem;">
            📍 <strong>Where is the item right now?</strong> ${escapeHtml(item.current_location_desc)}
          </div>
        ` : ''}

        <!-- Description Box -->
        <div>
          <h4 style="font-size:0.9rem; color:var(--text-muted); text-transform:uppercase; margin-bottom:0.35rem; font-weight:700;">Description &amp; Details</h4>
          <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:8px; padding:0.85rem 1rem; font-size:0.92rem; line-height:1.5;">
            ${escapeHtml(item.description)}
          </div>
        </div>

        <!-- Matches Section -->
        ${matches.length > 0 ? `
          <div>
            <h4 style="font-size:0.9rem; color:var(--text-muted); text-transform:uppercase; margin-bottom:0.4rem; font-weight:700;">
              ⚡ AI Smart Matches for this Item (${matches.length})
            </h4>
            <div style="display:flex; flex-direction:column; gap:0.5rem;">
              ${matches.map(m => `
                <div style="background:#fff; border:1px solid #cbd5e1; border-radius:8px; padding:0.65rem 0.85rem; display:flex; justify-content:space-between; align-items:center; gap:0.5rem; flex-wrap:wrap;">
                  <div>
                    <span class="match-badge ${m.score >= 80 ? 'match-high' : 'match-medium'}" style="font-size:0.8rem; padding:0.2rem 0.5rem;">${m.score}% MATCH</span>
                    <strong style="margin-left:0.4rem; font-size:0.88rem;">${escapeHtml(item.type === 'lost' ? m.found_title : m.lost_title)}</strong>
                    <div style="font-size:0.78rem; color:#64748b; margin-top:0.2rem;">${escapeHtml(m.explanation)}</div>
                  </div>
                  <a href="/smart-match.html?matchId=${m.id}" class="btn btn-sm btn-outline" style="font-size:0.8rem;">View Match &rarr;</a>
                </div>
              `).join('')}
            </div>
          </div>
        ` : ''}

        <!-- Action Buttons -->
        <div style="display:flex; justify-content:flex-end; gap:0.75rem; border-top:1px solid #e2e8f0; padding-top:1rem; margin-top:0.5rem;">
          <button type="button" class="btn btn-outline" onclick="closeItemDetailsModal()">Close</button>
          ${item.type === 'found' && item.status !== 'Returned' ? (
            currentUser && item.user_id === currentUser.id ? `
              <span style="font-size:0.85rem; color:#64748b; font-weight:600; align-self:center;">
                ℹ️ You reported finding this item
              </span>
            ` : `
              <button type="button" class="btn btn-found" onclick="closeItemDetailsModal(); openClaimModal(${item.id}, '${escapeHtml(item.title).replace(/'/g, "\\'")}', ${item.user_id})">
                This is Mine (Claim Item)
              </button>
            `
          ) : `
            <a href="/smart-match.html" class="btn btn-primary">Check Smart Matches</a>
          `}
        </div>
      </div>
    `;
    applyLanguage(currentLang);
  } catch (err) {
    bodyEl.innerHTML = '<div style="color:#ef4444; text-align:center;">Failed to load item details.</div>';
  }
}

function closeItemDetailsModal() {
  const modal = document.getElementById('itemDetailsModal');
  if (modal) modal.classList.remove('active');
}
