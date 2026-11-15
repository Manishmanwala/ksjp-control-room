
// panel-logic.js
// KSJP एडमिन पैनल का मुख्य नियंत्रक (सुधारा हुआ संस्करण)

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

// ---------- मॉड्यूल-स्तर की स्थिति (window पर कुछ नहीं) ----------
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

function stopRefreshTimer() {
  if (refreshTimer) clearInterval(refreshTimer);
  refreshTimer = null;
}
function stopRoomPoll() {
  if (roomPollTimer) clearInterval(roomPollTimer);
  roomPollTimer = null;
}

// ---------- सामान्य हेल्पर ----------
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
  } catch (_) {
    // अमान्य URL: खाली लौटाएँगे
  }
  return "";
}

function isValidIndianMobile(phone) {
  if (!/^[6-9]\d{9}$/.test(phone)) return false;
  if (/^(\d)\1{9}$/.test(phone)) return false;
  const fakeList = ["1234567890", "9876543210", "6789012345", "7890123456", "8901234567"];
  return !fakeList.includes(phone);
}

// बटन दबते ही disable + लोडिंग टेक्स्ट; खत्म होने पर वापस
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
      .cards-container { width: 100%; flex: 1; min-height: 0; display: flex; flex-direction: column; overflow: hidden; }
      .panel-card { width: 100%; flex: 1; min-height: 0; padding: 0 14px; display: flex; align-items: center; gap: 12px; user-select: none; cursor: pointer; }
      .card-manager { background: rgba(255, 214, 0, 0.16); }
      .avatar-manager { width: 48px; height: 48px; border-radius: 50%; background: linear-gradient(135deg, #ff1e1e, #991b1b); color: #ffd600; border: 2.5px solid #ffd600; box-shadow: 0 0 0 2.5px #ff1e1e; font-weight: 900; font-size: 19px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; overflow: hidden; }
      .card-board { background: rgba(0, 200, 83, 0.11); }
      .avatar-board { width: 42px; height: 42px; border-radius: 12px; background: linear-gradient(135deg, #00c853, #007e33); color: #ffffff; border: 2.5px solid #0057ff; font-weight: 900; font-size: 17px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
      .avatar-member { width: 34px; height: 34px; border-radius: 50%; background: #0066ff; color: #ffffff; border: 2px solid #93c5fd; font-weight: 800; font-size: 13.5px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; margin-left: 4px; overflow: hidden; }
      .card-info { flex: 1; height: 100%; border-bottom: 1px solid #e2e8f0; display: flex; align-items: center; justify-content: space-between; }
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
      button:disabled { opacity: 0.6; cursor: not-allowed; }
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

  // ---------- लोगो (sessionStorage में कैश, ताकि GitHub API की सीमा न टूटे) ----------
  const logoImg = document.getElementById("ksjp-logo-img");
  try {
    let logoUrl = "";
    try {
      logoUrl = sessionStorage.getItem("ksjp-logo-url") || "";
    } catch (_) {
      logoUrl = "";
    }
    if (!logoUrl) {
      const res = await fetch("https://api.github.com/repos/Manishmanwala/ksjp-control-room/contents/");
      if (res.ok) {
        const files = await res.json();
        const imgs = files.filter((f) => f.type === "file" && /\.(jpg|jpeg|png|webp)$/i.test(f.name));
        const found = imgs.find((f) => f.name.startsWith("Screenshot_")) || imgs[0];
        if (found?.download_url) {
          logoUrl = safeImageUrl(found.download_url);
          try {
            if (logoUrl) sessionStorage.setItem("ksjp-logo-url", logoUrl);
          } catch (_) {
            // कैश न हो पाए तो कोई बात नहीं
          }
        }
      } else {
        console.warn("लोगो सूची नहीं मिली, status:", res.status);
      }
    }
    if (logoUrl) logoImg.src = logoUrl;
  } catch (e) {
    console.error("लोगो लोड करने में त्रुटि:", e);
  }

  // ---------- Firebase शुरू करना ----------
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
      await waitForAuthReady(firebaseAuth); // पेज खुलते ही currentUser सही मिले
    } else {
      console.error("firebase-key.js में firebaseConfig export नहीं मिला।");
    }
  } catch (e) {
    console.error("Firebase शुरू करने में विफल (firebase-key.js का पाथ/कॉन्फ़िग जाँचें):", e);
  }

  const docRoot = `projects/${projectId}/databases/(default)/documents`;
  const firestoreBase = projectId
    ? `https://firestore.googleapis.com/v1/${docRoot}`
    : "";

  const apiUrl = (path, params = {}) => {
    const q = new URLSearchParams({ ...params, key: apiKey });
    return `${firestoreBase}${path}?${q.toString()}`;
  };

  async function firestoreFetch(url, options = {}) {
    const currentUser = firebaseAuth?.currentUser;
    if (!currentUser) {
      throw new Error("Firestore request के लिए Firebase login जरूरी है।");
    }
    const token = await currentUser.getIdToken();
    const headers = new Headers(options.headers || {});
    headers.set("Authorization", `Bearer ${token}`);
    return fetch(url, { ...options, headers });
  }

  const str = (v) => ({ stringValue: String(v ?? "") });

  // ---------- सदस्य / सीट ----------
  async function getAuthenticatedUserSeat(membersMap) {
    const user = firebaseAuth?.currentUser;
    if (!user || !user.email || !user.emailVerified) return null;
    const email = user.email.toLowerCase();
    for (const [seatId, m] of Object.entries(membersMap || {})) {
      if (m && m.email && m.email.toLowerCase() === email && m.locked) {
        return { ...m, seatId };
      }
    }
    return null;
  }

  // लौटाता है: {} = लॉगिन नहीं है, null = कॉन्फ़िग/नेटवर्क/सर्वर त्रुटि, वरना सदस्यों का नक्शा
  async function cloudGetMembers() {
    if (!firestoreBase) return null;
    if (!firebaseAuth?.currentUser) return {};
    try {
      const res = await firestoreFetch(apiUrl("/ksjp_members", { pageSize: "50" }));
      if (!res.ok) {
        throw new Error(`सदस्य सूची status ${res.status}: ${await res.text()}`);
      }
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
      console.error("डेटाबेस से सदस्य सूची लाने में त्रुटि:", e);
      return null;
    }
  }

  async function cloudGetRegisteredUsers() {
    if (!firestoreBase || !firebaseAuth?.currentUser) return [];
    const collectionsToTry = ["ksjp_users", "users", "registrations"];
    const mergedMap = new Map();

    for (const col of collectionsToTry) {
      try {
        let pageToken = "";
        for (let page = 0; page < 10; page++) {
          const params = { pageSize: "300" };
          if (pageToken) params.pageToken = pageToken;
          const res = await firestoreFetch(apiUrl(`/${col}`, params));
          if (!res.ok) {
            console.warn(`संग्रह ${col} पढ़ा नहीं जा सका, status: ${res.status}`);
            break;
          }
          const data = await res.json();
          (data.documents || []).forEach((doc) => {
            const docId = doc.name.split("/").pop();
            const f = doc.fields || {};
            const userObj = {
              id: docId,
              name: f.name?.stringValue || f.fullName?.stringValue || "नाम उपलब्ध नहीं",
              phone: f.phone?.stringValue || f.mobile?.stringValue || "",
              email: f.email?.stringValue || "",
              emailVerified: Boolean(f.emailVerified?.booleanValue),
              address: f.address?.stringValue || "",
              reason: f.reason?.stringValue || f.joinReason?.stringValue || "",
              note: f.note?.stringValue || f.bio?.stringValue || f.parchi?.stringValue || "",
              photo: f.photo?.stringValue || f.photoURL?.stringValue || "",
              joinedAt: f.joinedAt?.stringValue || f.createdAt?.stringValue || ""
            };
            mergedMap.set(userObj.phone || userObj.email || docId, userObj);
          });
          pageToken = data.nextPageToken || "";
          if (!pageToken) break;
        }
      } catch (e) {
        console.error(`संग्रह ${col} पढ़ने में विफल:`, e);
      }
    }

    const adminMap = await cloudGetMembers();
    if (adminMap) {
      Object.values(adminMap).forEach((m) => {
        if (m && m.locked && !mergedMap.has(m.phone)) {
          mergedMap.set(m.phone || m.seatId, {
            id: m.seatId,
            name: `${m.name} (${m.seatId.toUpperCase()})`,
            phone: m.phone || "",
            email: m.email || "एडमिन पैनल सदस्य",
            emailVerified: true,
            address: m.address || "KSJP नियंत्रण कक्ष",
            reason: m.reason || "पार्टी संचालन एवं प्रबंधन",
            note: m.note || "",
            photo: m.photo || "",
            joinedAt: m.joinedAt || ""
          });
        }
      });
    }

    return Array.from(mergedMap.values());
  }

  // दोनों दस्तावेज़ एक ही atomic :commit में। नई सीट पर "पहले से मौजूद न हो" की शर्त।
  // लौटाता है: "ok" | "taken" | "error"
  async function cloudSaveMember(rec, { isNew = false } = {}) {
    if (!firestoreBase || !firebaseAuth?.currentUser) return "error";
    try {
      const nowStr = new Date().toLocaleString("hi-IN");

      const memberFields = {
        name: str(rec.name),
        phone: str(rec.phone),
        email: str(rec.email),
        address: str(rec.address),
        reason: str(rec.reason),
        note: str(rec.note),
        photo: str(rec.photo),
        locked: { booleanValue: true }
      };
      const userFields = {
        name: str(`${rec.name} (${rec.seatId.toUpperCase()})`),
        phone: str(rec.phone),
        email: str(rec.email),
        emailVerified: { booleanValue: true },
        address: str(rec.address),
        reason: str(rec.reason),
        note: str(rec.note),
        photo: str(rec.photo)
      };

      if (isNew) {
        memberFields.joinedAt = str(nowStr);
        userFields.joinedAt = str(nowStr);
      }

      const memberWrite = {
        update: { name: `${docRoot}/ksjp_members/${rec.seatId}`, fields: memberFields }
      };
      const userWrite = {
        update: { name: `${docRoot}/ksjp_users/${rec.phone}`, fields: userFields }
      };

      if (isNew) {
        memberWrite.currentDocument = { exists: false };
      } else {
        // प्रोफ़ाइल अपडेट में joinedAt को छुआ नहीं जाता
        memberWrite.updateMask = { fieldPaths: Object.keys(memberFields) };
        userWrite.updateMask = { fieldPaths: Object.keys(userFields) };
      }

      const res = await firestoreFetch(`${firestoreBase}:commit?key=${encodeURIComponent(apiKey)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ writes: [memberWrite, userWrite] })
      });

      if (res.ok) return "ok";
      const bodyText = await res.text();
      console.error("सदस्य रिकॉर्ड सहेजा नहीं जा सका:", res.status, bodyText);
      if (res.status === 409 || bodyText.includes("ALREADY_EXISTS")) return "taken";
      return "error";
    } catch (e) {
      console.error("सदस्य डेटा सहेजने में त्रुटि:", e);
      return "error";
    }
  }

  // ts के हिसाब से सबसे नए 100 संदेश (null = त्रुटि, [] = सच में कोई संदेश नहीं)
  async function cloudGetPosts(roomId) {
    if (!firestoreBase || !firebaseAuth?.currentUser) return null;
    try {
      const res = await firestoreFetch(apiUrl(`/ksjp_rooms/${encodeURIComponent(roomId)}:runQuery`), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          structuredQuery: {
            from: [{ collectionId: "messages" }],
            orderBy: [{ field: { fieldPath: "ts" }, direction: "DESCENDING" }],
            limit: 100
          }
        })
      });
      if (!res.ok) {
        console.error("चैट संदेश status:", res.status, await res.text());
        return null;
      }
      const rows = await res.json();
      const list = (Array.isArray(rows) ? rows : [])
        .filter((r) => r && r.document)
        .map((r) => {
          const f = r.document.fields || {};
          return {
            name: f.name?.stringValue || "",
            seat: f.seat?.stringValue || "",
            photo: f.photo?.stringValue || "",
            text: f.text?.stringValue || "",
            time: f.time?.stringValue || "",
            ts: Number(f.ts?.integerValue || 0)
          };
        });
      return list.sort((a, b) => a.ts - b.ts);
    } catch (e) {
      console.error("चैट संदेश लाने में त्रुटि:", e);
      return null;
    }
  }

  async function cloudAddPost(roomId, postObj) {
    if (!firestoreBase || !firebaseAuth?.currentUser) return false;
    if (!postObj?.text || postObj.text.length > 2000) {
      console.error("संदेश खाली है या 2000 अक्षरों से अधिक है।");
      return false;
    }
    try {
      const res = await firestoreFetch(apiUrl(`/ksjp_rooms/${encodeURIComponent(roomId)}/messages`), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fields: {
            name: str(postObj.name),
            seat: str(postObj.seat),
            photo: str(postObj.photo),
            text: str(postObj.text),
            time: str(postObj.time),
            ts: { integerValue: String(Date.now()) }
          }
        })
      });
      if (!res.ok) console.error("संदेश status:", res.status, await res.text());
      return res.ok;
    } catch (e) {
      console.error("संदेश पोस्ट करने में त्रुटि:", e);
      return false;
    }
  }

  const compressPhoto = (fileInput) => new Promise((resolve) => {
    const file = fileInput?.files?.[0];
    if (!file) return resolve("");

    if (!file.type.startsWith("image/")) {
      alert("कृपया image फ़ाइल चुनें।");
      return resolve("");
    }
    if (file.size > 5 * 1024 * 1024) {
      alert("फ़ोटो 5 MB से छोटी होनी चाहिए।");
      return resolve("");
    }

    const reader = new FileReader();
    reader.onerror = () => resolve("");
    reader.onload = (ev) => {
      const img = new Image();
      img.onerror = () => resolve("");
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const max = 140;
        const scale = Math.min(max / img.width, max / img.height, 1);
        canvas.width = Math.max(1, Math.round(img.width * scale));
        canvas.height = Math.max(1, Math.round(img.height * scale));
        const context = canvas.getContext("2d");
        if (!context) return resolve("");
        context.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/jpeg", 0.75));
      };
      img.src = String(ev.target?.result || "");
    };
    reader.readAsDataURL(file);
  });

  // ---------- मुख्य स्क्रीन का रिफ्रेश ----------
  let cachedMembers = {};
  let refreshing = false;

  const refreshUI = async () => {
    if (refreshing || document.hidden) return;
    refreshing = true;
    try {
      const members = await cloudGetMembers();
      if (!members) return; // त्रुटि पर UI न छेड़ें
      cachedMembers = members;
      const me = await getAuthenticatedUserSeat(cachedMembers);

      const topP = document.getElementById("btn-profile");
      if (topP && me) {
        const photoUrl = safeImageUrl(me.photo);
        if (photoUrl) {
          const img = document.createElement("img");
          img.src = photoUrl;
          img.alt = "";
          img.style.cssText = "width:100%;height:100%;object-fit:cover;display:block;";
          topP.replaceChildren(img);
        } else {
          topP.textContent = (me.name || "P").charAt(0).toUpperCase();
        }
      }

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
          const av = card.querySelector(".avatar-manager, .avatar-member");
          const photoUrl = safeImageUrl(m.photo);
          if (av && photoUrl) {
            const img = document.createElement("img");
            img.src = photoUrl;
            img.alt = "";
            img.style.cssText = "width:100%;height:100%;object-fit:cover;border-radius:50%;";
            av.replaceChildren(img);
          }
        }
      });
    } finally {
      refreshing = false;
    }
  };

  // ---------- रिकॉर्ड व्यूअर ----------
  const openCitizenRecordsViewer = async () => {
    const mems = await cloudGetMembers();
    if (!mems) {
      return alert("डेटाबेस से कनेक्ट करने में समस्या हुई। कृपया इंटरनेट जांचें।");
    }
    cachedMembers = mems;
    const me = await getAuthenticatedUserSeat(cachedMembers);
    if (!me) {
      openJoinOrProfile();
      return;
    }

    document.getElementById("ksjp-records-screen")?.remove();
    const screen = document.createElement("div");
    screen.id = "ksjp-records-screen";
    screen.style.cssText = "position:fixed;inset:0;width:100vw;height:100dvh;background:#f1f5f9;display:flex;flex-direction:column;z-index:10001;";

    screen.innerHTML = `
      <header style="height:56px;background:#0057ff;color:#fff;padding:0 14px;display:flex;align-items:center;justify-content:space-between;flex-shrink:0;">
        <div style="display:flex;align-items:center;gap:10px;">
          <button id="rec-back-btn" style="background:rgba(255,255,255,0.2);border:none;color:#fff;padding:6px 12px;border-radius:999px;font-weight:800;cursor:pointer;">← वापस</button>
          <div style="font-size:15.5px;font-weight:800;">जुड़े हुए लोग (रिकॉर्ड)</div>
        </div>
        <span id="rec-count-badge" style="background:#ffd600;color:#0f172a;padding:3px 10px;border-radius:999px;font-size:12px;font-weight:800;">लोड हो रहा है...</span>
      </header>
      <div style="padding:10px 12px;background:#ffffff;border-bottom:1px solid #cbd5e1;flex-shrink:0;">
        <input id="rec-search-input" type="text" placeholder="🔍 नाम या मोबाइल नंबर लिखकर खोजें..." style="width:100%;padding:10px 14px;border:1.5px solid #0057ff;border-radius:999px;font-size:14px;outline:none;" />
      </div>
      <main id="rec-users-list" style="flex:1;overflow-y:auto;padding:12px;">
        <div style="text-align:center;color:#64748b;margin-top:40px;font-size:14px;">डेटाबेस से रिकॉर्ड निकाला जा रहा है...</div>
      </main>
    `;

    document.body.appendChild(screen);
    screen.querySelector("#rec-back-btn").onclick = () => screen.remove();

    const allUsers = await cloudGetRegisteredUsers();
    if (!screen.isConnected) return;

    const listContainer = screen.querySelector("#rec-users-list");
    const countBadge = screen.querySelector("#rec-count-badge");
    const searchInput = screen.querySelector("#rec-search-input");

    const showUserDossierModal = (u) => {
      document.getElementById("ksjp-dossier-modal")?.remove();
      const dModal = document.createElement("div");
      dModal.id = "ksjp-dossier-modal";
      dModal.style.cssText = "position:fixed;inset:0;background:rgba(15,23,42,0.8);display:flex;align-items:center;justify-content:center;padding:14px;z-index:10002;";

      const photoUrl = safeImageUrl(u.photo);

      dModal.innerHTML = `
        <div style="width:100%;max-width:400px;max-height:88dvh;overflow-y:auto;background:#ffffff;border-radius:18px;border:2px solid #0057ff;padding:16px;">
          <div style="display:flex;align-items:center;gap:12px;padding-bottom:12px;border-bottom:1px solid #e2e8f0;">
            ${photoUrl
              ? `<img src="${escapeHTML(photoUrl)}" alt="" style="width:64px;height:64px;border-radius:50%;object-fit:cover;border:2.5px solid #0057ff;background:#dbeafe;flex-shrink:0;" />`
              : `<div style="width:64px;height:64px;border-radius:50%;background:#0057ff;color:#fff;font-weight:800;font-size:24px;display:flex;align-items:center;justify-content:center;flex-shrink:0;">${escapeHTML((u.name || "?").charAt(0).toUpperCase())}</div>`}
            <div>
              <div style="font-size:17px;font-weight:800;color:#0f172a;">${escapeHTML(u.name)}</div>
              <div style="font-size:13px;font-weight:700;color:#0057ff;margin-top:2px;">📞 ${escapeHTML(u.phone || "नंबर नहीं")}</div>
              <div style="font-size:11.5px;color:#15803d;font-weight:700;margin-top:2px;">
                ${u.email ? `✅ ${escapeHTML(u.email)}` : "वेरीफाइड सदस्य"}
              </div>
            </div>
          </div>

          <div style="margin-top:12px;display:flex;flex-direction:column;gap:9px;font-size:13.5px;">
            <div style="background:#f8fafc;padding:9px 11px;border-radius:10px;border:1px solid #e2e8f0;">
              <div style="font-size:11px;font-weight:800;color:#64748b;">पूरा पता (Address):</div>
              <div style="color:#0f172a;font-weight:600;margin-top:2px;">${escapeHTML(u.address || "उपलब्ध नहीं")}</div>
            </div>

            <div style="background:#f8fafc;padding:9px 11px;border-radius:10px;border:1px solid #e2e8f0;">
              <div style="font-size:11px;font-weight:800;color:#64748b;">जुड़ने का कारण:</div>
              <div style="color:#0f172a;font-weight:600;margin-top:2px;">${escapeHTML(u.reason || "उपलब्ध नहीं")}</div>
            </div>

            ${u.note ? `
              <div style="background:#fefce8;padding:9px 11px;border-radius:10px;border:1px solid #fde047;">
                <div style="font-size:11px;font-weight:800;color:#854d0e;">अतिरिक्त जानकारी / पर्ची:</div>
                <div style="color:#0f172a;margin-top:3px;white-space:pre-wrap;line-height:1.4;">${escapeHTML(u.note)}</div>
              </div>
            ` : ""}

            ${u.joinedAt ? `
              <div style="font-size:11.5px;color:#64748b;text-align:right;">पंजीकरण समय: ${escapeHTML(u.joinedAt)}</div>
            ` : ""}
          </div>

          <div style="margin-top:14px;background:#eff6ff;border:1px solid #bfdbfe;color:#1e40af;padding:7px 10px;border-radius:10px;font-size:11px;font-weight:700;text-align:center;">
            🔒 यह स्थायी सत्यापन दस्तावेज़ है (केवल देखने के लिए)
          </div>

          <button id="close-dossier-btn" style="width:100%;margin-top:12px;padding:10px;background:#0057ff;color:#ffffff;border:none;border-radius:999px;font-size:14px;font-weight:800;cursor:pointer;">बंद करें</button>
        </div>
      `;

      document.body.appendChild(dModal);
      dModal.querySelector("#close-dossier-btn").onclick = () => dModal.remove();
    };

    const renderList = (query = "") => {
      const q = query.trim().toLowerCase();
      const filtered = allUsers.filter((u) =>
        (u.name || "").toLowerCase().includes(q) ||
        (u.phone || "").includes(q)
      );

      countBadge.textContent = `कुल: ${filtered.length}`;

      if (filtered.length === 0) {
        listContainer.innerHTML = `<div style="text-align:center;color:#64748b;margin-top:40px;font-size:14px;">कोई रिकॉर्ड नहीं मिला।</div>`;
        return;
      }

      listContainer.innerHTML = filtered.map((u, idx) => `
        <div class="citizen-row-card" data-idx="${idx}" style="background:#ffffff;border:1px solid #cbd5e1;border-radius:14px;padding:10px 12px;margin-bottom:9px;display:flex;align-items:center;justify-content:space-between;cursor:pointer;box-shadow:0 1px 3px rgba(0,0,0,0.05);">
          <div style="display:flex;align-items:center;gap:11px;">
            <div style="width:44px;height:44px;border-radius:50%;background:#0057ff;color:#fff;font-weight:800;font-size:16px;display:flex;align-items:center;justify-content:center;overflow:hidden;flex-shrink:0;border:2px solid #93c5fd;">
              ${safeImageUrl(u.photo)
                ? `<img src="${escapeHTML(safeImageUrl(u.photo))}" alt="" style="width:100%;height:100%;object-fit:cover;" />`
                : escapeHTML((u.name || "?").charAt(0).toUpperCase())}
            </div>
            <div>
              <div style="font-size:15px;font-weight:800;color:#0f172a;">${escapeHTML(u.name || "नाम उपलब्ध नहीं")}</div>
              <div style="font-size:12.5px;font-weight:600;color:#475569;">📞 ${escapeHTML(u.phone || "नंबर नहीं")}</div>
            </div>
          </div>
          <span style="font-size:11.5px;font-weight:800;color:#0057ff;background:#eff6ff;padding:5px 10px;border-radius:999px;">विवरण देखें →</span>
        </div>
      `).join("");

      listContainer.querySelectorAll(".citizen-row-card").forEach((el) => {
        el.onclick = () => {
          const item = filtered[Number(el.getAttribute("data-idx"))];
          if (item) showUserDossierModal(item);
        };
      });
    };

    renderList("");
    searchInput.oninput = (e) => renderList(e.target.value);
  };

  // ---------- जॉइन / प्रोफ़ाइल ----------
  const buildSeatOptions = (members) => SEATS.map((s) => {
    const locked = Boolean(members?.[s.id]?.locked);
    return `<option value="${s.id}" ${locked ? "disabled" : ""}>${escapeHTML(s.label)} ${locked ? "(पहले से लॉक)" : "(खाली)"}</option>`;
  }).join("");

  const openJoinOrProfile = async () => {
    const mems = await cloudGetMembers();
    if (!mems) {
      return alert("डेटाबेस लोड करने में विफल। कृपया इंटरनेट connection जांचें।");
    }
    cachedMembers = mems;
    const me = await getAuthenticatedUserSeat(cachedMembers);
    document.getElementById("ksjp-modal")?.remove();

    const modal = document.createElement("div");
    modal.id = "ksjp-modal";
    modal.style.cssText = "position:fixed;inset:0;background:rgba(15,23,42,0.78);display:flex;align-items:center;justify-content:center;padding:14px;z-index:10000;";

    // ----- मौजूदा सदस्य: प्रोफ़ाइल -----
    if (me) {
      const mePhoto = safeImageUrl(me.photo);
      modal.innerHTML = `
        <div style="width:100%;max-width:370px;background:#fff;border-radius:18px;border:2px solid #0057ff;padding:18px;">
          <div style="display:flex;align-items:center;gap:12px;margin-bottom:12px;">
            ${mePhoto
              ? `<img src="${escapeHTML(mePhoto)}" alt="" style="width:54px;height:54px;border-radius:50%;object-fit:cover;background:#e2e8f0;border:2px solid #0057ff;" />`
              : `<div style="width:54px;height:54px;border-radius:50%;background:#0057ff;color:#fff;font-weight:800;font-size:20px;display:flex;align-items:center;justify-content:center;">${escapeHTML((me.name || "?").charAt(0).toUpperCase())}</div>`}
            <div>
              <div style="font-size:16px;font-weight:800;">${escapeHTML(me.name)}</div>
              <div style="font-size:12px;color:#0057ff;font-weight:700;">पद: ${escapeHTML(me.seatId.toUpperCase())} 🔒</div>
              <div style="font-size:11.5px;color:#475569;">मोबाइल: ${escapeHTML(me.phone)}</div>
              ${me.email ? `<div style="font-size:11px;color:#15803d;font-weight:700;">✅ ${escapeHTML(me.email)}</div>` : ""}
            </div>
          </div>
          <div style="background:#fef9c3;border:1px solid #eab308;color:#854d0e;padding:7px 10px;border-radius:10px;font-size:11.5px;font-weight:700;margin-bottom:12px;">
            🔒 आपकी सदस्यता क्लाउड पर स्थायी लॉक है।
          </div>
          <input id="upd-name" type="text" value="${escapeHTML(me.name)}" style="width:100%;padding:9px;border:1.5px solid #cbd5e1;border-radius:10px;margin-bottom:8px;font-size:14px;" />
          <input id="upd-photo" type="file" accept="image/*" style="width:100%;font-size:12px;margin-bottom:12px;" />
          <div style="display:flex;gap:8px;">
            <button id="save-prof" style="flex:1;padding:10px;background:#0057ff;color:#fff;border:none;border-radius:999px;font-weight:700;cursor:pointer;">क्लाउड पर अपडेट करें</button>
            <button id="close-mod" style="padding:10px 16px;background:#e2e8f0;border:none;border-radius:999px;font-weight:700;cursor:pointer;">बंद</button>
          </div>
        </div>
      `;

      document.body.appendChild(modal);
      document.getElementById("close-mod").onclick = () => modal.remove();

      const saveBtn = document.getElementById("save-prof");
      saveBtn.onclick = () => runBusy(saveBtn, "सहेजा जा रहा है...", async () => {
        const nm = document.getElementById("upd-name").value.trim();
        if (nm.length > 50) return alert("नाम 50 अक्षरों से छोटा होना चाहिए।");
        if (nm.length > 0 && nm.length < 2) return alert("नाम कम से कम 2 अक्षरों का होना चाहिए।");
        const ph = await compressPhoto(document.getElementById("upd-photo"));

        const updated = { ...me };
        if (nm.length >= 2) updated.name = nm;
        if (ph) updated.photo = ph;

        const result = await cloudSaveMember(updated, { isNew: false });
        if (result !== "ok") {
          alert("प्रोफ़ाइल अपडेट नहीं हो सकी। कृपया फिर कोशिश करें।");
          return;
        }
        modal.remove();
        await refreshUI();
      });
      return;
    }

    // ----- नया सदस्य: पंजीकरण -----
    modal.innerHTML = `
      <div style="width:100%;max-width:390px;max-height:92dvh;overflow-y:auto;background:#fff;border-radius:18px;border:2px solid #0057ff;padding:16px;">
        <h3 style="font-size:17px;font-weight:800;color:#0057ff;margin-bottom:3px;">KSJP सत्यापित एडमिन पंजीकरण</h3>
        <p style="font-size:12px;color:#475569;margin-bottom:10px;">चरण 1: पहले Google या Email लिंक से असली पहचान प्रमाणित करें।</p>

        <div id="auth-step-box" style="background:#f8fafc;border:1.5px solid #cbd5e1;border-radius:12px;padding:12px;margin-bottom:10px;">
          <button id="btn-google-verify" type="button" style="width:100%;padding:10px;background:#ffffff;color:#0f172a;border:1.5px solid #0057ff;border-radius:999px;font-weight:800;font-size:13.5px;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:8px;">
            <span>🔵</span> <span>Continue with Google (तुरंत वेरीफाई)</span>
          </button>

          <div style="text-align:center;font-size:11px;color:#64748b;margin:8px 0;font-weight:700;">— या Gmail / Email से वेरीफाई करें —</div>

          <input id="auth-email-inp" type="email" placeholder="अपना असली Gmail / Email लिखें" style="width:100%;padding:8.5px;border:1.5px solid #cbd5e1;border-radius:10px;margin-bottom:6px;font-size:13.5px;" />
          <input id="auth-pass-inp" type="password" placeholder="पासवर्ड (कम से कम 8 अक्षर)" style="width:100%;padding:8.5px;border:1.5px solid #cbd5e1;border-radius:10px;margin-bottom:8px;font-size:13.5px;" />
          <div style="display:flex;gap:6px;">
            <button id="btn-send-email-link" type="button" style="flex:1;padding:8.5px;background:#0057ff;color:#fff;border:none;border-radius:999px;font-size:12.5px;font-weight:700;cursor:pointer;">वेरिफिकेशन लिंक भेजें</button>
            <button id="btn-check-email-verified" type="button" style="flex:1;padding:8.5px;background:#00c853;color:#fff;border:none;border-radius:999px;font-size:12.5px;font-weight:700;cursor:pointer;">लिंक क्लिक कर दिया ✓</button>
          </div>
          <div id="auth-status-msg" style="font-size:11.5px;color:#b45309;font-weight:700;margin-top:6px;"></div>
        </div>

        <div id="reg-form-box" style="display:none;flex-direction:column;gap:8px;">
          <div id="verified-email-badge" style="background:#dcfce7;border:1px solid #22c55e;color:#15803d;padding:7px 10px;border-radius:10px;font-size:12px;font-weight:800;"></div>

          <label style="font-size:11.5px;font-weight:800;color:#334155;">पद चुनें:</label>
          <select id="j-seat" style="width:100%;padding:9px;border:1.5px solid #cbd5e1;border-radius:10px;font-size:13.5px;">${buildSeatOptions(cachedMembers)}</select>

          <input id="j-name" type="text" placeholder="पूरा नाम लिखें (अनिवार्य)" style="width:100%;padding:9px;border:1.5px solid #cbd5e1;border-radius:10px;font-size:13.5px;" />
          <input id="j-phone" type="tel" maxlength="10" placeholder="10 अंकों का असली मोबाइल नंबर (अनिवार्य)" style="width:100%;padding:9px;border:1.5px solid #cbd5e1;border-radius:10px;font-size:13.5px;" />
          <textarea id="j-address" rows="2" placeholder="पूरा पता: ग्राम/मोहल्ला, पोस्ट, तहसील, जिला, राज्य (अनिवार्य)" style="width:100%;padding:9px;border:1.5px solid #cbd5e1;border-radius:10px;font-size:13.5px;"></textarea>
          <textarea id="j-reason" rows="2" placeholder="मैं क्यों जुड़ना चाहता हूँ? कारण लिखें (अनिवार्य)" style="width:100%;padding:9px;border:1.5px solid #cbd5e1;border-radius:10px;font-size:13.5px;"></textarea>
          <textarea id="j-note" rows="2" placeholder="अतिरिक्त जानकारी / पर्ची / बायोडाटा (वैकल्पिक)" style="width:100%;padding:9px;border:1.5px solid #cbd5e1;border-radius:10px;font-size:13.5px;"></textarea>

          <div style="font-size:11.5px;font-weight:700;color:#334155;">अपनी स्पष्ट फ़ोटो चुनें:</div>
          <input id="j-photo" type="file" accept="image/*" style="width:100%;font-size:12px;" />

          <button id="sub-join" type="button" style="width:100%;padding:11px;background:#00c853;color:#fff;border:none;border-radius:999px;font-weight:800;font-size:14px;margin-top:4px;cursor:pointer;">पंजीकरण पूरा करें और लॉक करें 🔒</button>
        </div>

        <button id="close-mod" type="button" style="width:100%;margin-top:8px;padding:9px;background:#e2e8f0;border:none;border-radius:999px;font-weight:700;cursor:pointer;">बाद में</button>
      </div>
    `;

    document.body.appendChild(modal);
    document.getElementById("close-mod").onclick = () => modal.remove();

    let verifiedEmail = "";
    const statusMsg = document.getElementById("auth-status-msg");
    const authBox = document.getElementById("auth-step-box");
    const regBox = document.getElementById("reg-form-box");
    const emailBadge = document.getElementById("verified-email-badge");
    const seatSelect = document.getElementById("j-seat");

    // सत्यापन के बाद: ताज़ा सीट सूची लाओ; अगर इसी ईमेल की सीट पहले से है तो फ़ॉर्म की जरूरत नहीं
    const unlockRegistrationForm = async (email) => {
      verifiedEmail = email;
      const fresh = await cloudGetMembers();
      if (fresh) {
        cachedMembers = fresh;
        const already = await getAuthenticatedUserSeat(fresh);
        if (already) {
          modal.remove();
          await refreshUI();
          alert("आप पहले से सदस्य हैं।");
          return;
        }
        seatSelect.innerHTML = buildSeatOptions(fresh);
      }
      authBox.style.display = "none";
      regBox.style.display = "flex";
      emailBadge.textContent = `✅ वेरीफाइड ईमेल: ${email} (लॉक)`;
    };

    // पहले से लॉग-इन और verified यूज़र को दोबारा लॉगिन न कराएँ
    const existingUser = firebaseAuth?.currentUser;
    if (existingUser?.emailVerified && existingUser.email) {
      await unlockRegistrationForm(existingUser.email);
    }

    const googleBtn = document.getElementById("btn-google-verify");
    googleBtn.onclick = () => runBusy(googleBtn, "जोड़ा जा रहा है...", async () => {
      if (!firebaseAuth) return alert("Firebase कुंजी लोड नहीं हुई है।");
      statusMsg.textContent = "Google से जोड़ा जा रहा है...";
      try {
        const provider = new GoogleAuthProvider();
        const result = await signInWithPopup(firebaseAuth, provider);
        if (result.user) await result.user.getIdToken(true);
        if (result.user?.email && result.user.emailVerified) {
          statusMsg.textContent = "";
          await unlockRegistrationForm(result.user.email);
        } else {
          statusMsg.textContent = "Google खाते का ईमेल सत्यापित नहीं है।";
        }
      } catch (err) {
        console.error("Google साइन-इन त्रुटि:", err);
        statusMsg.textContent = err?.code === "auth/unauthorized-domain"
          ? "यह वेबसाइट Firebase के Authorized domains में जुड़ी नहीं है।"
          : "Google साइन-इन पूरा नहीं हुआ: " + (err?.code || err?.message || "");
      }
    });

    const sendBtn = document.getElementById("btn-send-email-link");
    sendBtn.onclick = () => runBusy(sendBtn, "भेजा जा रहा है...", async () => {
      if (!firebaseAuth) return alert("Firebase कुंजी लोड नहीं हुई है।");
      const em = document.getElementById("auth-email-inp").value.trim();
      const pw = document.getElementById("auth-pass-inp").value;
      if (!em || !em.includes("@")) return alert("कृपया सही ईमेल पता लिखें।");
      if (pw.length < 8 || pw.length > 128) return alert("पासवर्ड कम से कम 8 अक्षरों का होना चाहिए।");

      statusMsg.textContent = "वेरिफिकेशन लिंक भेजा जा रहा है...";
      try {
        let userCred;
        try {
          userCred = await createUserWithEmailAndPassword(firebaseAuth, em, pw);
        } catch (createErr) {
          if (createErr.code !== "auth/email-already-in-use") throw createErr;
          userCred = await signInWithEmailAndPassword(firebaseAuth, em, pw);
        }
        if (userCred.user.emailVerified) {
          statusMsg.textContent = "";
          await unlockRegistrationForm(userCred.user.email);
        } else {
          await sendEmailVerification(userCred.user);
          statusMsg.textContent = "📩 आपके इनबॉक्स में लिंक भेज दिया गया है। लिंक पर क्लिक करने के बाद हरा बटन दबाएं।";
        }
      } catch (err) {
        console.error("ईमेल प्रमाणीकरण त्रुटि:", err);
        if (err?.code === "auth/invalid-credential" || err?.code === "auth/wrong-password") {
          statusMsg.textContent = "यह ईमेल पहले से मौजूद है। पासवर्ड गलत है, या यह ईमेल पहले Google से जुड़ा है, तो ऊपर Google बटन चुनें।";
        } else if (err?.code === "auth/weak-password") {
          statusMsg.textContent = "पासवर्ड कमज़ोर है, कृपया मज़बूत पासवर्ड रखें।";
        } else {
          statusMsg.textContent = "त्रुटि: " + (err?.code || err?.message || "ईमेल भेजने में समस्या हुई।");
        }
      }
    });

    const checkBtn = document.getElementById("btn-check-email-verified");
    checkBtn.onclick = () => runBusy(checkBtn, "जाँच रहा है...", async () => {
      const user = firebaseAuth?.currentUser;
      if (!user) {
        return alert("पहले ऊपर अपना ईमेल व पासवर्ड डालकर लिंक भेजें।");
      }
      statusMsg.textContent = "सत्यापन जांचा जा रहा है...";
      try {
        await user.reload();
        const refreshedUser = firebaseAuth.currentUser;
        if (refreshedUser) await refreshedUser.getIdToken(true);

        if (refreshedUser?.emailVerified && refreshedUser.email) {
          statusMsg.textContent = "";
          await unlockRegistrationForm(refreshedUser.email);
        } else {
          statusMsg.textContent = "⚠️ अभी ईमेल वेरीफाई नहीं हुआ है।";
        }
      } catch (err) {
        console.error("Email verification check failed:", err);
        statusMsg.textContent = "ईमेल सत्यापन जांचने में समस्या हुई।";
      }
    });

    const joinBtn = document.getElementById("sub-join");
    joinBtn.onclick = () => runBusy(joinBtn, "पंजीकरण हो रहा है...", async () => {
      if (!verifiedEmail) return alert("पहले पहचान वेरीफाई करें।");
      const authUser = firebaseAuth?.currentUser;
      if (
        !authUser?.emailVerified ||
        !authUser.email ||
        authUser.email.toLowerCase() !== verifiedEmail.toLowerCase()
      ) {
        return alert("सत्यापित खाते से दोबारा साइन-इन करके ईमेल सत्यापन जांचें।");
      }

      const seatId = seatSelect.value;
      if (!ALLOWED_SEAT_IDS.has(seatId)) {
        return alert("चुना गया पद मान्य नहीं है।");
      }

      const name = document.getElementById("j-name").value.trim();
      const phone = document.getElementById("j-phone").value.replace(/\D/g, "");
      const address = document.getElementById("j-address").value.trim();
      const reason = document.getElementById("j-reason").value.trim();
      const note = document.getElementById("j-note").value.trim();

      if (name.length < 2 || name.length > 50) return alert("नाम 2 से 50 अक्षरों के बीच होना चाहिए।");
      if (!isValidIndianMobile(phone)) return alert("कृपया 10 अंकों का असली भारतीय मोबाइल नंबर डालें।");
      if (address.length < 5 || address.length > 200) return alert("पता 5 से 200 अक्षरों के बीच होना चाहिए।");
      if (reason.length < 3 || reason.length > 300) return alert("जुड़ने का कारण 3 से 300 अक्षरों के बीच होना चाहिए।");
      if (note.length > 1000) return alert("अतिरिक्त नोट 1000 अक्षरों से छोटा होना चाहिए।");

      const photo = await compressPhoto(document.getElementById("j-photo"));

      const latest = await cloudGetMembers();
      if (!latest) {
        return alert("डेटाबेस से कनेक्ट नहीं हो पा रहा है। पंजीकरण रद्द किया गया।");
      }
      if (latest[seatId]?.locked) {
        seatSelect.innerHTML = buildSeatOptions(latest);
        return alert("यह पद अभी किसी और सदस्य द्वारा लॉक कर दिया गया है!");
      }
      const emailLower = verifiedEmail.toLowerCase();
      if (Object.values(latest).some((m) => m?.locked && m.email?.toLowerCase() === emailLower)) {
        return alert("इस ईमेल से पहले ही एक पद लिया जा चुका है।");
      }

      const rec = { seatId, name, phone, email: verifiedEmail, address, reason, note, photo, locked: true };
      const result = await cloudSaveMember(rec, { isNew: true });

      if (result === "taken") {
        const again = await cloudGetMembers();
        if (again) seatSelect.innerHTML = buildSeatOptions(again);
        return alert("यह पद अभी किसी और सदस्य द्वारा लॉक कर दिया गया है!");
      }
      if (result !== "ok") return alert("क्लाउड से जुड़ने में समस्या हुई। कृपया फिर कोशिश करें।");

      modal.remove();
      await refreshUI();
    });
  };

  // ---------- चैट रूम ----------
  const openRoom = async (roomId, title) => {
    stopRoomPoll();

    const mems = await cloudGetMembers();
    if (!mems) {
      return alert("डेटाबेस लोड करने में विफल।");
    }
    cachedMembers = mems;
    const me = await getAuthenticatedUserSeat(cachedMembers);
    if (!me) {
      openJoinOrProfile();
      return;
    }

    const isDirectChat = (roomId === "site-manager" || roomId.startsWith("admin-"));
    if (isDirectChat && me.seatId === roomId) {
      alert("यह आपकी अपनी सीट है। निजी बातचीत करने के लिए किसी दूसरे सदस्य के कार्ड पर टच करें।");
      return;
    }
    const activeRoomId = isDirectChat ? [me.seatId, roomId].sort().join("__") : roomId;

    document.getElementById("ksjp-room")?.remove();
    const room = document.createElement("div");
    room.id = "ksjp-room";
    room.style.cssText = "position:fixed;inset:0;width:100vw;height:100dvh;background:#f1f5f9;display:flex;flex-direction:column;z-index:9999;";

    const privacyNote = roomId === "board-room"
      ? "🌐 सामूहिक कक्ष: यहाँ सभी सक्रिय सदस्य संदेश देख और लिख सकेंगे।"
      : isDirectChat
        ? `🔒 निजी 1-to-1 चैट: यह बातचीत केवल आपके और ${title} के बीच गोपनीय है।`
        : "📢 आधिकारिक कक्ष";

    let lastSignature = "";
    let firstLoad = true;
    let loadingMessages = false;

    const loadMessages = async () => {
      if (loadingMessages || document.hidden) return;
      const box = document.getElementById("room-list");
      if (!box || !room.isConnected) {
        stopRoomPoll();
        return;
      }
      loadingMessages = true;
      try {
        const list = await cloudGetPosts(activeRoomId);
        if (list === null) {
          // त्रुटि: पुरानी स्क्रीन जस की तस; पहली बार में ही संदेश दिखाएँ
          if (firstLoad) {
            box.innerHTML = `<div style="text-align:center;color:#b91c1c;margin-top:40px;font-size:13.5px;">संदेश लोड नहीं हो सके। कृपया इंटरनेट/अनुमतियाँ जांचें।</div>`;
          }
          return;
        }

        const signature = JSON.stringify(list);
        if (signature === lastSignature && !firstLoad) return;
        lastSignature = signature;

        const nearBottom = box.scrollHeight - box.scrollTop - box.clientHeight < 80;

        box.innerHTML = list.length === 0
          ? `<div style="text-align:center;color:#64748b;margin-top:40px;font-size:13.5px;">अभी कोई संदेश नहीं है। नीचे से पोस्ट करें!</div>`
          : list.map((p) => {
            const pPhoto = safeImageUrl(p.photo);
            return `
          <div style="background:#fff;border-radius:14px;padding:10px 12px;margin-bottom:10px;border:1px solid #cbd5e1;">
            <div style="display:flex;align-items:center;gap:8px;margin-bottom:5px;">
              ${pPhoto
                ? `<img src="${escapeHTML(pPhoto)}" alt="" style="width:28px;height:28px;border-radius:50%;object-fit:cover;background:#0057ff;" />`
                : `<div style="width:28px;height:28px;border-radius:50%;background:#0057ff;color:#fff;font-size:12px;font-weight:800;display:flex;align-items:center;justify-content:center;">${escapeHTML((p.name || "?").charAt(0).toUpperCase())}</div>`}
              <div>
                <div style="font-size:13px;font-weight:800;color:#0057ff;">${escapeHTML(p.name)} (${escapeHTML(p.seat)})</div>
                <div style="font-size:10px;color:#64748b;">${escapeHTML(p.time)}</div>
              </div>
            </div>
            <div style="font-size:14px;color:#0f172a;white-space:pre-wrap;">${escapeHTML(p.text)}</div>
          </div>`;
          }).join("");

        if (firstLoad || nearBottom) box.scrollTop = box.scrollHeight;
        firstLoad = false;
      } finally {
        loadingMessages = false;
      }
    };

    room.innerHTML = `
      <header style="height:56px;background:#0057ff;color:#fff;padding:0 14px;display:flex;align-items:center;gap:10px;flex-shrink:0;">
        <button id="back-btn" style="background:rgba(255,255,255,0.2);border:none;color:#fff;padding:6px 12px;border-radius:999px;font-weight:800;cursor:pointer;">← वापस</button>
        <div style="font-size:16px;font-weight:800;">${escapeHTML(title)}</div>
      </header>
      <div style="background:#fef9c3;color:#854d0e;padding:6px 12px;font-size:11.5px;font-weight:700;border-bottom:1px solid #eab308;">${escapeHTML(privacyNote)}</div>
      <main id="room-list" style="flex:1;overflow-y:auto;padding:12px;"><div style="text-align:center;color:#64748b;margin-top:30px;">लोड हो रहा है...</div></main>
      <footer style="padding:8px 10px;background:#fff;border-top:1px solid #cbd5e1;display:flex;gap:8px;flex-shrink:0;">
        <input id="post-inp" type="text" maxlength="2000" placeholder="यहाँ संदेश लिखें..." style="flex:1;padding:10px 12px;border:1.5px solid #cbd5e1;border-radius:999px;font-size:14px;" />
        <button id="send-btn" style="padding:10px 16px;background:#0057ff;color:#fff;border:none;border-radius:999px;font-weight:800;cursor:pointer;">पोस्ट</button>
      </footer>
    `;

    document.body.appendChild(room);

    document.getElementById("back-btn").onclick = () => {
      stopRoomPoll();
      room.remove();
    };

    const sendBtn = document.getElementById("send-btn");
    const postInp = document.getElementById("post-inp");

    const sendMessage = () => runBusy(sendBtn, "भेज रहा है...", async () => {
      const txt = postInp.value.trim();
      if (!txt) return;
      if (txt.length > 2000) return alert("संदेश 2000 अक्षरों से छोटा रखें।");

      const saved = await cloudAddPost(activeRoomId, {
        name: me.name,
        seat: me.seatId.toUpperCase(),
        photo: me.photo || "",
        text: txt,
        time: new Date().toLocaleString("hi-IN")
      });

      if (!saved) {
        alert("संदेश भेजा नहीं जा सका। आपका लिखा संदेश बॉक्स में सुरक्षित है, फिर कोशिश करें।");
        return;
      }
      postInp.value = ""; // सिर्फ़ सफल होने पर साफ़ करें
      firstLoad = true;   // नया संदेश भेजने पर नीचे तक स्क्रोल हो
      await loadMessages();
    });

    sendBtn.onclick = sendMessage;
    postInp.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        sendMessage();
      }
    });

    await loadMessages();
    roomPollTimer = setInterval(loadMessages, 4000);
  };

  // ---------- बटन/कार्ड हैंडलर (पहले जोड़ें, ताकि UI तुरंत चले) ----------
  document.querySelectorAll(".panel-card").forEach((c) => {
    c.onclick = () => openRoom(c.getAttribute("data-action"), c.querySelector(".card-name").textContent);
  });
  document.getElementById("btn-all-citizens").onclick = openCitizenRecordsViewer;
  document.getElementById("btn-notify").onclick = () => openRoom("notices", "🔔 पार्टी सूचना केंद्र");
  document.getElementById("btn-profile").onclick = openJoinOrProfile;

  // ---------- शुरुआती लोड ----------
  await refreshUI();
  refreshTimer = setInterval(refreshUI, 6000);

  // लॉगिन-रहित या बिना-सीट वाले यूज़र को जॉइन फ़ॉर्म दिखाएँ (त्रुटि पर चुप रहें, अलर्ट नहीं)
  const initialCheck = async () => {
    const m = await cloudGetMembers();
    if (m === null) return;
    const me = await getAuthenticatedUserSeat(m);
    if (!me) openJoinOrProfile();
  };
  await initialCheck();

  // ---------- वैकल्पिक मॉड्यूल (त्रुटि छुपाई नहीं जाती) ----------
  try {
    const execModule = await import("../../04-execution/actions.js");
    if (execModule && execModule.initPanelActions) {
      execModule.initPanelActions();
    }
  } catch (e) {
    console.error("actions.js लोड/चलाने में त्रुटि:", e);
  }

  try {
    const kickModule = await import("../../06-kick-member/kick-member.js");
    if (kickModule && kickModule.initKickMemberTool) {
      kickModule.initKickMemberTool();
    }
  } catch (e) {
    console.error("kick-member.js लोड/चलाने में त्रुटि:", e);
  }
}
