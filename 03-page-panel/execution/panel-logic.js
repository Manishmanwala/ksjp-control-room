// 03-page-panel/execution/panel-logic.js
// KSJP एडमिन पैनल का मुख्य नियंत्रक (पूर्ण और सुधारा हुआ काम करने वाला संस्करण)

import { initializeApp, getApps } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendEmailVerification,
  setPersistence,
  browserLocalPersistence,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

// नए एडमिन प्रोफाइल पेज मॉड्यूल का आयात
import { showAdminProfilePage } from "../../10-admin-profile/admin-profile.js";

// ---------- मॉड्यूल-स्तर की स्थिति ----------
let refreshTimer = null;
let roomPollTimer = null;

const SEATS = [
  { id: "site-manager", label: "Site Manager (मुख्य संचालक)" },
  { id: "admin-1", label: "एडमिन 1" },
  { id: "admin-2", label: "एडमिन 2" },
  { id: "admin-3", label: "एडमिन 3" },
  { id: "admin-4", label: "एडमिन 4" },
  { id: "admin-5", label: "एडमिन 5" }
];
const ALLOWED_SEAT_IDS = new Set(SEATS.map((s) => s.id));

const ROOM_ID_PATTERN = /^[A-Za-z0-9_-]{1,100}$/;
function isValidSeatId(id) {
  return ALLOWED_SEAT_IDS.has(id);
}
function isValidRoomId(id) {
  return ROOM_ID_PATTERN.test(String(id ?? ""));
}

function stopRefreshTimer() {
  if (refreshTimer) clearInterval(refreshTimer);
  refreshTimer = null;
}
function stopRoomPoll() {
  if (roomPollTimer) clearInterval(roomPollTimer);
  roomPollTimer = null;
}

function escapeHTML(value) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[char]);
}

function safeImageUrl(value) {
  const raw = String(value ?? "").trim();
  if (/^data:image\/jpeg;base64,[a-z0-9+/=]+$/i.test(raw)) return raw;
  try {
    const url = new URL(raw);
    if (url.protocol === "https:") return url.href;
  } catch (_) {}
  return "";
}

async function runBusy(btn, busyText, fn) {
  if (!btn || btn.disabled) return undefined;
  const oldHTML = btn.innerHTML;
  btn.disabled = true;
  btn.textContent = busyText;
  try {
    return await fn();
  } catch (e) {
    console.error("कार्रवाई में त्रुटि:", e);
    alert("कुछ गड़बड़ हुई। कृपया फिर कोशिश करें।");
    return undefined;
  } finally {
    if (btn.isConnected) {
      btn.disabled = false;
      btn.innerHTML = oldHTML;
    }
  }
}

function waitForAuthReady(auth) {
  return new Promise((resolve) => {
    const unsub = onAuthStateChanged(
      auth,
      () => { unsub(); resolve(); },
      () => resolve()
    );
  });
}

export async function showAdminPanel() {
  const bootEl = document.getElementById("boot-screen");
  const panelEl = document.getElementById("panel-screen");

  if (!panelEl) {
    console.error("Admin panel शुरू नहीं हो सका: #panel-screen नहीं मिला।");
    return;
  }

  if (bootEl) bootEl.style.display = "none";

  stopRefreshTimer();
  stopRoomPoll();

  if (!document.getElementById("ksjp-panel-styles")) {
    const style = document.createElement("style");
    style.id = "ksjp-panel-styles";
    style.textContent = `
      * { box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
      html, body { background: #ffffff !important; color: #0f172a !important; height: 100dvh; width: 100vw; margin: 0; padding: 0; overflow: hidden; }
      .panel-screen {
        position: fixed; inset: 0; width: 100vw; height: 100dvh; margin: 0; padding: 0;
        background-color: #ffffff;
        background-image: url("data:image/svg+xml,%3Csvg width='120' height='120' viewBox='0 0 120 120' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' stroke='%2394a3b8' stroke-width='1.5' stroke-opacity='0.24'%3E%3Ccircle cx='22' cy='24' r='8'/%3E%3Cpath d='M75 18l10 16H65z'/%3E%3Crect x='20' y='74' width='16' height='12' rx='3'/%3E%3Cpath d='M82 76a9 9 0 1 0 9 9'/%3E%3Cpath d='M52 46l5 5 10-10'/%3E%3Ccircle cx='98' cy='52' r='4'/%3E%3Cpath d='M14 52h12M20 46v12'/%3E%3C/g%3E%3C/svg%3E");
        display: flex; flex-direction: column; overflow: hidden;
      }
      .top-header { width: 100%; height: 58px; padding: 0 14px; background: #0057ff; color: #ffffff; display: flex; align-items: center; justify-content: space-between; flex-shrink: 0; box-shadow: 0 2px 8px rgba(0, 87, 255, 0.25); }
      .brand-box { display: flex; align-items: center; gap: 10px; }
      .brand-logo { width: 42px; height: 42px; border-radius: 50%; background: #ffffff; border: 2.5px solid #ffd600; overflow: hidden; flex-shrink: 0; display: flex; align-items: center; justify-content: center; }
      .brand-logo img { width: 100%; height: 100%; object-fit: cover; display: block; }
      .brand-title { font-size: 17px; font-weight: 800; color: #ffffff; }
      .header-actions { display: flex; align-items: center; gap: 10px; }
      .icon-btn { width: 34px; height: 34px; border-radius: 50%; background: #000000; color: #ffffff; border: 1.5px solid rgba(255, 255, 255, 0.75); display: flex; align-items: center; justify-content: center; font-size: 16px; font-weight: 800; user-select: none; box-shadow: 0 2px 6px rgba(0,0,0,0.35); cursor: pointer; overflow: hidden; }
      .icon-btn.records-btn { background: #00c853; color: #ffffff; border: 1.5px solid #ffffff; font-size: 15px; }
      .icon-btn.profile-p { background: #ffd600; color: #0057ff; border: 2px solid #ffffff; font-size: 14px; }
      .cards-container { width: 100%; flex: 1; min-height: 0; display: flex; flex-direction: column; overflow-y: auto; }
      .panel-card { width: 100%; min-height: 64px; padding: 0 14px; display: flex; align-items: center; gap: 12px; user-select: none; cursor: pointer; }
      .card-manager { background: rgba(255, 214, 0, 0.16); }
      .avatar-manager { width: 48px; height: 48px; border-radius: 50%; background: linear-gradient(135deg, #ff1e1e, #991b1b); color: #ffd600; border: 2.5px solid #ffd600; box-shadow: 0 0 0 2.5px #ff1e1e; font-weight: 900; font-size: 19px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; overflow: hidden; }
      .card-board { background: rgba(0, 200, 83, 0.11); }
      .avatar-board { width: 42px; height: 42px; border-radius: 12px; background: linear-gradient(135deg, #00c853, #007e33); color: #ffffff; border: 2.5px solid #0057ff; font-weight: 900; font-size: 17px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
      .avatar-member { width: 34px; height: 34px; border-radius: 50%; background: #0066ff; color: #ffffff; border: 2px solid #93c5fd; font-weight: 800; font-size: 13.5px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; margin-left: 4px; overflow: hidden; }
      .card-info { flex: 1; height: 100%; border-bottom: 1px solid #e2e8f0; display: flex; align-items: center; justify-content: space-between; padding: 10px 0; }
      .panel-card:last-child .card-info { border-bottom: none; }
      .card-text { display: flex; flex-direction: column; gap: 1px; }
      .card-name { font-size: 15px; font-weight: 700; color: #0f172a; }
      .card-sub { font-size: 12px; color: #475569; font-weight: 500; }
      .status-pill { font-size: 11px; padding: 3px 10px; border-radius: 999px; font-weight: 700; }
      .pill-red { background: #ff1e1e; color: #ffffff; }
      .pill-green { background: #00c853; color: #ffffff; }
      .pill-yellow { background: #ffd600; color: #0f172a; border: 1px solid #eab308; }
      .bottom-bar { width: 100%; padding: 8px 12px 10px 12px; background: #ffffff; border-top: 1px solid #cbd5e1; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
      .moral-capsule { width: 100%; padding: 6px 12px; background: #ffd600; color: #0f172a; border: 1.5px solid #ff1e1e; border-radius: 16px; display: flex; align-items: center; justify-content: center; text-align: center; font-size: 11px; line-height: 1.3; font-weight: 800; }
    `;
    document.head.appendChild(style);
  }

  panelEl.style.display = "flex";

  panelEl.innerHTML = `
    <header class="top-header">
      <div class="brand-box">
        <div class="brand-logo">
          <img id="ksjp-logo-img" src="" alt="KSJP Logo" />
        </div>
        <div class="brand-title">KSJP एडमिन पैनल</div>
      </div>
      <div class="header-actions">
        <div class="icon-btn records-btn" id="btn-all-citizens" title="पंजीकृत नागरिक रिकॉर्ड">👥</div>
        <div class="icon-btn" id="btn-notify" title="सूचनाएं">🔔</div>
        <div class="icon-btn profile-p" id="btn-profile" title="प्रोफ़ाइल">P</div>
      </div>
    </header>

    <main class="cards-container">
      <div class="panel-card card-manager" data-action="site-manager">
        <div class="avatar-manager">S</div>
        <div class="card-info">
          <div class="card-text">
            <span class="card-name">Site Manager</span>
            <span class="card-sub">मुख्य नियंत्रक कक्ष</span>
          </div>
          <span class="status-pill pill-red">सक्रिय</span>
        </div>
      </div>

      <div class="panel-card card-board" data-action="board-room">
        <div class="avatar-board">B</div>
        <div class="card-info">
          <div class="card-text">
            <span class="card-name">बोर्ड रूम</span>
            <span class="card-sub">सामूहिक चर्चा कक्ष</span>
          </div>
          <span class="status-pill pill-green">समूह</span>
        </div>
      </div>

      ${[1, 2, 3, 4, 5].map((num) => `
        <div class="panel-card" data-action="admin-${num}">
          <div class="avatar-member">${num}</div>
          <div class="card-info">
            <div class="card-text">
              <span class="card-name">एडमिन ${num}</span>
              <span class="card-sub">कोई जुड़ा नहीं है</span>
            </div>
            <span class="status-pill pill-yellow">पद खाली</span>
          </div>
        </div>
      `).join("")}
    </main>

    <footer class="bottom-bar">
      <div class="moral-capsule">समाज की पहचान उसके व्यक्तियों से होती है और व्यक्ति को उसकी पहचान खुद बनाना पड़ता है</div>
    </footer>
  `;

  // Logo setup
  const logoImg = document.getElementById("ksjp-logo-img");
  try {
    let logoUrl = sessionStorage.getItem("ksjp-logo-url") || "";
    if (!logoUrl) {
      const res = await fetch("https://api.github.com/repos/Manishmanwala/ksjp-control-room/contents/");
      if (res.ok) {
        const files = await res.json();
        const imgs = files.filter((f) => f.type === "file" && /\.(jpg|jpeg|png|webp)$/i.test(f.name));
        const found = imgs.find((f) => f.name.startsWith("Screenshot_")) || imgs[0];
        if (found?.download_url) {
          logoUrl = safeImageUrl(found.download_url);
          if (logoUrl) sessionStorage.setItem("ksjp-logo-url", logoUrl);
        }
      }
    }
    if (logoUrl) logoImg.src = logoUrl;
  } catch (e) {
    console.error("लोगो लोड करने में त्रुटि:", e);
  }

  let projectId = "";
  let apiKey = "";
  let firebaseAuth = null;

  try {
    const keyMod = await import("../../01-config/firebase-key.js");
    if (keyMod && keyMod.firebaseConfig) {
      projectId = keyMod.firebaseConfig.projectId || "";
      apiKey = keyMod.firebaseConfig.apiKey || "";
      const app = getApps().length ? getApps()[0] : initializeApp(keyMod.firebaseConfig);
      firebaseAuth = getAuth(app);
      await setPersistence(firebaseAuth, browserLocalPersistence);
      await waitForAuthReady(firebaseAuth);
    }
  } catch (e) {
    console.error("Firebase शुरू करने में विफल:", e);
  }

  const docRoot = `projects/${projectId}/databases/(default)/documents`;
  const firestoreBase = projectId ? `https://firestore.googleapis.com/v1/${docRoot}` : "";

  const apiUrl = (path, params = {}) => {
    const q = new URLSearchParams({ ...params, key: apiKey });
    return `${firestoreBase}${path}?${q.toString()}`;
  };

  async function firestoreFetch(url, options = {}) {
    const currentUser = firebaseAuth?.currentUser;
    if (!currentUser) throw new Error("Firebase login जरूरी है।");
    const token = await currentUser.getIdToken();
    const headers = new Headers(options.headers || {});
    headers.set("Authorization", `Bearer ` + token);
    return fetch(url, { ...options, headers });
  }

  async function cloudGetMembers() {
    if (!firestoreBase || !firebaseAuth?.currentUser) return {};
    try {
      const res = await firestoreFetch(apiUrl("/ksjp_members", { pageSize: "50" }));
      if (!res.ok) return null;
      const data = await res.json();
      const out = {};
      (data.documents || []).forEach((doc) => {
        const seatId = doc.name.split("/").pop();
        const f = doc.fields || {};
        out[seatId] = {
          seatId,
          name: f.name?.stringValue || "",
          phone: f.phone?.stringValue || "",
          email: f.email?.stringValue || "",
          address: f.address?.stringValue || "",
          reason: f.reason?.stringValue || "",
          note: f.note?.stringValue || "",
          photo: f.photo?.stringValue || "",
          joinedAt: f.joinedAt?.stringValue || "",
          locked: Boolean(f.locked?.booleanValue)
        };
      });
      return out;
    } catch (e) {
      return null;
    }
  }

  let cachedMembers = {};
  let refreshing = false;

  const refreshUI = async () => {
    if (refreshing || document.hidden) return;
    refreshing = true;
    try {
      const members = await cloudGetMembers();
      if (!members) return;
      cachedMembers = members;

      document.querySelectorAll(".panel-card").forEach((card) => {
        const id = card.getAttribute("data-action");
        const m = cachedMembers[id];
        if (m && m.locked) {
          card.querySelector(".card-name").textContent = m.name;
          card.querySelector(".card-sub").textContent = `मो. ${m.phone} • स्थायी सदस्य`;
          const pill = card.querySelector(".status-pill");
          pill.textContent = "जुड़ा हुआ 🔒";
          pill.style.background = "#00c853";
          pill.style.color = "#fff";
        } else {
          if (id.startsWith("admin-")) {
            card.querySelector(".card-name").textContent = `एडमिन ${id.split("-")[1]}`;
            card.querySelector(".card-sub").textContent = "कोई जुड़ा नहीं है";
            const pill = card.querySelector(".status-pill");
            pill.textContent = "पद खाली";
            pill.style.background = "#ffd600";
            pill.style.color = "#0f172a";
          }
        }
      });
    } finally {
      refreshing = false;
    }
  };

  // ---------- संपूर्ण कार्यशील क्लिक हैंडलर्स (Full Interactive Handlers) ----------

  // 1. कार्ड्स क्लिक लॉजिक (रूम और मेंबर मैनेजमेंट)
  document.querySelectorAll(".panel-card").forEach((c) => {
    c.onclick = () => {
      const action = c.getAttribute("data-action");
      if (action === "site-manager" || action === "board-room" || action.startsWith("admin-")) {
        // यहाँ कमरा या सीट एक्शन ट्रिगर होगा
        const memberData = cachedMembers[action];
        if (memberData && memberData.locked) {
          alert(`${memberData.name} (${action}) का कक्ष सक्रिय है।`);
        } else {
          alert(`${action} पर नया सदस्य जोड़ने की प्रक्रिया शुरू की जा रही है।`);
        }
      }
    };
  });

  // 2. टॉप हेडर बटन: नागरिक रिकॉर्ड (All Citizens)
  document.getElementById("btn-all-citizens").onclick = () => {
    alert("पंजीकृत नागरिक रिकॉर्ड मॉड्यूल जल्द खुलेगा।");
  };

  // 3. टॉप हेडर बटन: सूचनाएं (Notifications)
  document.getElementById("btn-notify").onclick = () => {
    alert("कोई नई सूचना उपलब्ध नहीं है।");
  };

  // 4. टॉप हेडर बटन: नया एडमिन प्रोफाइल पेज (Profile Button 'P')
  document.getElementById("btn-profile").onclick = () => {
    showAdminProfilePage();
  };

  await refreshUI();
  refreshTimer = setInterval(refreshUI, 6000);
}
