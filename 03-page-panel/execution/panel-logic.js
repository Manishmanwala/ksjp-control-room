import { initializeApp, getApps } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendEmailVerification,
  signOut
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

export async function showAdminPanel() {
  const bootEl = document.getElementById("boot-screen");
  const panelEl = document.getElementById("panel-screen");

  if (bootEl) bootEl.style.display = "none";

  // ग्राफ़िक्स, रंग-रूप और डिज़ाइन (CSS) सीधे इसी एकलौती फ़ाइल में लॉक
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

  // रिपॉज़िटरी से अपलोड की गई Screenshot फ़ोटो को अपने आप गोल लोगो में लगाना
  const logoImg = document.getElementById("ksjp-logo-img");
  try {
    const res = await fetch("https://api.github.com/repos/Manishmanwala/ksjp-control-room/contents/");
    if (res.ok) {
      const files = await res.json();
      const foundLogo = files.find((f) =>
        f.type === "file" &&
        (f.name.startsWith("Screenshot_") || /\.(jpg|jpeg|png|webp)$/i.test(f.name))
      );
      if (foundLogo && foundLogo.download_url) {
        logoImg.src = foundLogo.download_url;
      }
    }
  } catch (e) {}

  // =========================================================================
  // 01-config/firebase-key.js से अलग रखी हुई गोदाम की चाबी सुरक्षित रूप से लाना
  // =========================================================================
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
    }
  } catch (e) {}

  const USER_LOCAL_KEY = "KSJP_CURRENT_SEAT_USER";
  const getLocalUser = () => { try { return JSON.parse(localStorage.getItem(USER_LOCAL_KEY)) || null; } catch (e) { return null; } };
  const setLocalUser = (u) => { try { localStorage.setItem(USER_LOCAL_KEY, JSON.stringify(u)); } catch (e) {} };

  const firestoreBase = projectId
    ? `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents`
    : "";

  // भारतीय मोबाइल नंबर सत्यापन (नकली नंबरों को रोकना)
  function isValidIndianMobile(phone) {
    if (!/^[6-9]\d{9}$/.test(phone)) return false;
    if (/^(\d)\1{9}$/.test(phone)) return false; // जैसे 9999999999, 8888888888
    const fakeList = ["1234567890", "9876543210", "6789012345", "7890123456", "8901234567"];
    if (fakeList.includes(phone)) return false;
    return true;
  }

  async function cloudGetMembers() {
    if (!firestoreBase) return {};
    try {
      const res = await fetch(`${firestoreBase}/ksjp_members?key=${apiKey}`);
      if (!res.ok) return {};
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
          locked: Boolean(f.locked?.booleanValue)
        };
      });
      return out;
    } catch (e) { return {}; }
  }

  // मुख्य वेबसाइट व एडमिन पैनल से जुड़े सभी नागरिकों का रिकॉर्ड लाना (View-Only)
  async function cloudGetRegisteredUsers() {
    if (!firestoreBase) return [];
    const collectionsToTry = ["ksjp_users", "users", "registrations"];
    const mergedMap = new Map();

    for (const col of collectionsToTry) {
      try {
        const res = await fetch(`${firestoreBase}/${col}?pageSize=300&key=${apiKey}`);
        if (!res.ok) continue;
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
      } catch (e) {}
    }

    const adminMap = await cloudGetMembers();
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
          joinedAt: ""
        });
      }
    });

    return Array.from(mergedMap.values());
  }

  async function cloudSaveMember(rec) {
    if (!firestoreBase) return false;
    try {
      const nowStr = new Date().toLocaleString("hi-IN");
      const res1 = await fetch(`${firestoreBase}/ksjp_members/${rec.seatId}?key=${apiKey}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fields: {
            name: { stringValue: rec.name },
            phone: { stringValue: rec.phone },
            email: { stringValue: rec.email || "" },
            address: { stringValue: rec.address || "" },
            reason: { stringValue: rec.reason || "" },
            note: { stringValue: rec.note || "" },
            photo: { stringValue: rec.photo || "" },
            locked: { booleanValue: true }
          }
        })
      });

      // साथ ही स्थायी नागरिक/सदस्य दस्तावेज़ सूची (ksjp_users) में भी सुरक्षित करना
      await fetch(`${firestoreBase}/ksjp_users/${rec.phone}?key=${apiKey}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fields: {
            name: { stringValue: `${rec.name} (${rec.seatId.toUpperCase()})` },
            phone: { stringValue: rec.phone },
            email: { stringValue: rec.email || "" },
            emailVerified: { booleanValue: true },
            address: { stringValue: rec.address || "" },
            reason: { stringValue: rec.reason || "" },
            note: { stringValue: rec.note || "" },
            photo: { stringValue: rec.photo || "" },
            joinedAt: { stringValue: nowStr }
          }
        })
      });

      return res1.ok;
    } catch (e) { return false; }
  }

  async function cloudGetPosts(roomId) {
    if (!firestoreBase) return [];
    try {
      const res = await fetch(`${firestoreBase}/ksjp_rooms/${roomId}/messages?pageSize=100&key=${apiKey}`);
      if (!res.ok) return [];
      const data = await res.json();
      const list = (data.documents || []).map((doc) => {
        const f = doc.fields || {};
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
    } catch (e) { return []; }
  }

  async function cloudAddPost(roomId, postObj) {
    if (!firestoreBase) return false;
    try {
      const res = await fetch(`${firestoreBase}/ksjp_rooms/${roomId}/messages?key=${apiKey}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fields: {
            name: { stringValue: postObj.name },
            seat: { stringValue: postObj.seat },
            photo: { stringValue: postObj.photo || "" },
            text: { stringValue: postObj.text },
            time: { stringValue: postObj.time },
            ts: { integerValue: String(Date.now()) }
          }
        })
      });
      return res.ok;
    } catch (e) { return false; }
  }

  // फ़ोटो को क्लाउड के अनुकूल हल्के आकार में कंप्रेस करना (140px / 75% quality)
  const compressPhoto = (fileInput) => new Promise((resolve) => {
    const file = fileInput?.files?.[0];
    if (!file) return resolve("");
    const reader = new FileReader();
    reader.onload = (ev) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const max = 140;
        const scale = Math.min(max / img.width, max / img.height, 1);
        canvas.width = img.width * scale;
        canvas.height = img.height * scale;
        canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/jpeg", 0.75));
      };
      img.src = ev.target.result;
    };
    reader.readAsDataURL(file);
  });

  // सभी डिवाइस पर लाइव कार्ड और ऊपर वाले 'P' गोले में प्रोफ़ाइल फ़ोटो अपडेट करना
  let cachedMembers = {};
  const refreshUI = async () => {
    cachedMembers = await cloudGetMembers();
    const me = getLocalUser();

    const topP = document.getElementById("btn-profile");
    if (topP && me) {
      const latestMe = cachedMembers[me.seatId] || me;
      if (latestMe.photo) {
        topP.innerHTML = `<img src="${latestMe.photo}" style="width:100%;height:100%;object-fit:cover;display:block;" />`;
      } else {
        topP.textContent = latestMe.name.charAt(0).toUpperCase();
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
        if (av && m.photo) {
          av.innerHTML = `<img src="${m.photo}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;" />`;
        }
      }
    });
  };

  // =========================================================================
  // सभी जुड़े हुए नागरिकों की View-Only सूची, सर्च और पूरा रिकॉर्ड कार्ड (बिना Delete/Edit)
  // =========================================================================
  const openCitizenRecordsViewer = async () => {
    const me = getLocalUser();
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
    document.getElementById("rec-back-btn").onclick = () => screen.remove();

    const allUsers = await cloudGetRegisteredUsers();
    const listContainer = document.getElementById("rec-users-list");
    const countBadge = document.getElementById("rec-count-badge");
    const searchInput = document.getElementById("rec-search-input");

    const showUserDossierModal = (u) => {
      document.getElementById("ksjp-dossier-modal")?.remove();
      const dModal = document.createElement("div");
      dModal.id = "ksjp-dossier-modal";
      dModal.style.cssText = "position:fixed;inset:0;background:rgba(15,23,42,0.8);display:flex;align-items:center;justify-content:center;padding:14px;z-index:10002;";

      dModal.innerHTML = `
        <div style="width:100%;max-width:400px;max-height:88dvh;overflow-y:auto;background:#ffffff;border-radius:18px;border:2px solid #0057ff;padding:16px;">
          <div style="display:flex;align-items:center;gap:12px;padding-bottom:12px;border-bottom:1px solid #e2e8f0;">
            <img src="${u.photo || ""}" onerror="this.style.display='none'" style="width:64px;height:64px;border-radius:50%;object-fit:cover;border:2.5px solid #0057ff;background:#dbeafe;flex-shrink:0;" />
            <div>
              <div style="font-size:17px;font-weight:800;color:#0f172a;">${u.name}</div>
              <div style="font-size:13px;font-weight:700;color:#0057ff;margin-top:2px;">📞 ${u.phone || "नंबर नहीं"}</div>
              <div style="font-size:11.5px;color:#15803d;font-weight:700;margin-top:2px;">
                ${u.email ? `✅ ${u.email}` : "वेरीफाइड सदस्य"}
              </div>
            </div>
          </div>

          <div style="margin-top:12px;display:flex;flex-direction:column;gap:9px;font-size:13.5px;">
            <div style="background:#f8fafc;padding:9px 11px;border-radius:10px;border:1px solid #e2e8f0;">
              <div style="font-size:11px;font-weight:800;color:#64748b;">पूरा पता (Address):</div>
              <div style="color:#0f172a;font-weight:600;margin-top:2px;">${u.address || "उपलब्ध नहीं"}</div>
            </div>

            <div style="background:#f8fafc;padding:9px 11px;border-radius:10px;border:1px solid #e2e8f0;">
              <div style="font-size:11px;font-weight:800;color:#64748b;">जुड़ने का कारण:</div>
              <div style="color:#0f172a;font-weight:600;margin-top:2px;">${u.reason || "उपलब्ध नहीं"}</div>
            </div>

            ${u.note ? `
              <div style="background:#fefce8;padding:9px 11px;border-radius:10px;border:1px solid #fde047;">
                <div style="font-size:11px;font-weight:800;color:#854d0e;">अतिरिक्त जानकारी / पर्ची:</div>
                <div style="color:#0f172a;margin-top:3px;white-space:pre-wrap;line-height:1.4;">${u.note}</div>
              </div>
            ` : ""}

            ${u.joinedAt ? `
              <div style="font-size:11.5px;color:#64748b;text-align:right;">पंजीकरण समय: ${u.joinedAt}</div>
            ` : ""}
          </div>

          <div style="margin-top:14px;background:#eff6ff;border:1px solid #bfdbfe;color:#1e40af;padding:7px 10px;border-radius:10px;font-size:11px;font-weight:700;text-align:center;">
            🔒 यह स्थायी सत्यापन दस्तावेज़ है (केवल देखने के लिए)
          </div>

          <button id="close-dossier-btn" style="width:100%;margin-top:12px;padding:10px;background:#0057ff;color:#ffffff;border:none;border-radius:999px;font-size:14px;font-weight:800;cursor:pointer;">बंद करें</button>
        </div>
      `;

      document.body.appendChild(dModal);
      document.getElementById("close-dossier-btn").onclick = () => dModal.remove();
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
              ${u.photo ? `<img src="${u.photo}" style="width:100%;height:100%;object-fit:cover;" />` : (u.name.charAt(0).toUpperCase())}
            </div>
            <div>
              <div style="font-size:15px;font-weight:800;color:#0f172a;">${u.name}</div>
              <div style="font-size:12.5px;font-weight:600;color:#475569;">📞 ${u.phone || "नंबर नहीं"}</div>
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

  // =========================================================================
  // 2-स्टेप वेरिफिकेशन (Google Sign-In / Email Verification + पूरा पंजीकरण फॉर्म)
  // =========================================================================
  const openJoinOrProfile = async () => {
    cachedMembers = await cloudGetMembers();
    const me = getLocalUser();
    document.getElementById("ksjp-modal")?.remove();

    const modal = document.createElement("div");
    modal.id = "ksjp-modal";
    modal.style.cssText = "position:fixed;inset:0;background:rgba(15,23,42,0.78);display:flex;align-items:center;justify-content:center;padding:14px;z-index:10000;";

    if (me) {
      const activeData = cachedMembers[me.seatId] || me;
      modal.innerHTML = `
        <div style="width:100%;max-width:370px;background:#fff;border-radius:18px;border:2px solid #0057ff;padding:18px;">
          <div style="display:flex;align-items:center;gap:12px;margin-bottom:12px;">
            <img src="${activeData.photo || ""}" style="width:54px;height:54px;border-radius:50%;object-fit:cover;background:#e2e8f0;border:2px solid #0057ff;" />
            <div>
              <div style="font-size:16px;font-weight:800;">${activeData.name}</div>
              <div style="font-size:12px;color:#0057ff;font-weight:700;">पद: ${activeData.seatId.toUpperCase()} 🔒</div>
              <div style="font-size:11.5px;color:#475569;">मोबाइल: ${activeData.phone}</div>
              ${activeData.email ? `<div style="font-size:11px;color:#15803d;font-weight:700;">✅ ${activeData.email}</div>` : ""}
            </div>
          </div>
          <div style="background:#fef9c3;border:1px solid #eab308;color:#854d0e;padding:7px 10px;border-radius:10px;font-size:11.5px;font-weight:700;margin-bottom:12px;">
            🔒 आपकी सदस्यता क्लाउड पर स्थायी लॉक है। आप खुद से नहीं हट सकते।
          </div>
          <input id="upd-name" type="text" value="${activeData.name}" style="width:100%;padding:9px;border:1.5px solid #cbd5e1;border-radius:10px;margin-bottom:8px;font-size:14px;" />
          <input id="upd-photo" type="file" accept="image/*" style="width:100%;font-size:12px;margin-bottom:12px;" />
          <div style="display:flex;gap:8px;">
            <button id="save-prof" style="flex:1;padding:10px;background:#0057ff;color:#fff;border:none;border-radius:999px;font-weight:700;">क्लाउड पर अपडेट करें</button>
            <button id="close-mod" style="padding:10px 16px;background:#e2e8f0;border:none;border-radius:999px;font-weight:700;">बंद</button>
          </div>
        </div>
      `;

      document.body.appendChild(modal);
      document.getElementById("close-mod").onclick = () => modal.remove();
      document.getElementById("save-prof").onclick = async () => {
        const nm = document.getElementById("upd-name").value.trim();
        const ph = await compressPhoto(document.getElementById("upd-photo"));
        const updated = { ...(cachedMembers[me.seatId] || me) };
        if (nm.length >= 2) updated.name = nm;
        if (ph) updated.photo = ph;
        await cloudSaveMember(updated);
        setLocalUser(updated);
        modal.remove();
        await refreshUI();
      };
      return;
    }

    // स्टेप 1 और स्टेप 2 का इंटरफेस (नए एडमिन/मैनेजर पंजीकरण के लिए)
    const opts = [
      { id: "site-manager", label: "Site Manager (मुख्य संचालक)" },
      { id: "admin-1", label: "एडमिन 1" },
      { id: "admin-2", label: "एडमिन 2" },
      { id: "admin-3", label: "एडमिन 3" },
      { id: "admin-4", label: "एडमिन 4" },
      { id: "admin-5", label: "एडमिन 5" }
    ].map((s) => `<option value="${s.id}" ${cachedMembers[s.id]?.locked ? "disabled" : ""}>${s.label} ${cachedMembers[s.id]?.locked ? "(पहले से लॉक)" : "(खाली)"}</option>`).join("");

    modal.innerHTML = `
      <div style="width:100%;max-width:390px;max-height:92dvh;overflow-y:auto;background:#fff;border-radius:18px;border:2px solid #0057ff;padding:16px;">
        <h3 style="font-size:17px;font-weight:800;color:#0057ff;margin-bottom:3px;">KSJP सत्यापित एडमिन पंजीकरण</h3>
        <p style="font-size:12px;color:#475569;margin-bottom:10px;">चरण 1: पहले Google या Email लिंक से असली पहचान प्रमाणित करें।</p>

        <!-- चरण 1: Google / Email Verification बॉक्स -->
        <div id="auth-step-box" style="background:#f8fafc;border:1.5px solid #cbd5e1;border-radius:12px;padding:12px;margin-bottom:10px;">
          <button id="btn-google-verify" type="button" style="width:100%;padding:10px;background:#ffffff;color:#0f172a;border:1.5px solid #0057ff;border-radius:999px;font-weight:800;font-size:13.5px;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:8px;">
            <span>🔵</span> <span>Continue with Google (तुरंत वेरीफाई)</span>
          </button>

          <div style="text-align:center;font-size:11px;color:#64748b;margin:8px 0;font-weight:700;">— या Gmail / Email से वेरीफाई करें —</div>

          <input id="auth-email-inp" type="email" placeholder="अपना असली Gmail / Email लिखें" style="width:100%;padding:8.5px;border:1.5px solid #cbd5e1;border-radius:10px;margin-bottom:6px;font-size:13.5px;" />
          <input id="auth-pass-inp" type="password" placeholder="नया पासवर्ड बनाएं (8-10 अक्षर)" style="width:100%;padding:8.5px;border:1.5px solid #cbd5e1;border-radius:10px;margin-bottom:8px;font-size:13.5px;" />
          <div style="display:flex;gap:6px;">
            <button id="btn-send-email-link" type="button" style="flex:1;padding:8.5px;background:#0057ff;color:#fff;border:none;border-radius:999px;font-size:12.5px;font-weight:700;cursor:pointer;">वेरिफिकेशन लिंक भेजें</button>
            <button id="btn-check-email-verified" type="button" style="flex:1;padding:8.5px;background:#00c853;color:#fff;border:none;border-radius:999px;font-size:12.5px;font-weight:700;cursor:pointer;">लिंक क्लिक कर दिया ✓</button>
          </div>
          <div id="auth-status-msg" style="font-size:11.5px;color:#b45309;font-weight:700;margin-top:6px;"></div>
        </div>

        <!-- चरण 2: पूरा पंजीकरण फॉर्म (ईमेल वेरीफाई होने के बाद खुलेगा) -->
        <div id="reg-form-box" style="display:none;flex-direction:column;gap:8px;">
          <div id="verified-email-badge" style="background:#dcfce7;border:1px solid #22c55e;color:#15803d;padding:7px 10px;border-radius:10px;font-size:12px;font-weight:800;"></div>

          <label style="font-size:11.5px;font-weight:800;color:#334155;">पद चुनें:</label>
          <select id="j-seat" style="width:100%;padding:9px;border:1.5px solid #cbd5e1;border-radius:10px;font-size:13.5px;">${opts}</select>

          <input id="j-name" type="text" placeholder="पूरा नाम लिखें (अनिवार्य)" style="width:100%;padding:9px;border:1.5px solid #cbd5e1;border-radius:10px;font-size:13.5px;" />
          <input id="j-phone" type="tel" maxlength="10" placeholder="10 अंकों का असली मोबाइल नंबर (अनिवार्य)" style="width:100%;padding:9px;border:1.5px solid #cbd5e1;border-radius:10px;font-size:13.5px;" />
          <textarea id="j-address" rows="2" placeholder="पूरा पता: ग्राम/मोहल्ला, पोस्ट, तहसील, जिला, राज्य (अनिवार्य)" style="width:100%;padding:9px;border:1.5px solid #cbd5e1;border-radius:10px;font-size:13.5px;"></textarea>
          <textarea id="j-reason" rows="2" placeholder="मैं क्यों जुड़ना चाहता हूँ? कारण लिखें (अनिवार्य)" style="width:100%;padding:9px;border:1.5px solid #cbd5e1;border-radius:10px;font-size:13.5px;"></textarea>
          <textarea id="j-note" rows="2" placeholder="अतिरिक्त जानकारी / पर्ची / बायोडाटा (वैकल्पिक - कोई सीमा नहीं)" style="width:100%;padding:9px;border:1.5px solid #cbd5e1;border-radius:10px;font-size:13.5px;"></textarea>

          <div style="font-size:11.5px;font-weight:700;color:#334155;">अपनी स्पष्ट फ़ोटो चुनें (स्वतः कंप्रेस होगी):</div>
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

    const unlockRegistrationForm = (email) => {
      verifiedEmail = email;
      authBox.style.display = "none";
      regBox.style.display = "flex";
      emailBadge.textContent = `✅ वेरीफाइड ईमेल: ${email} (लॉक)`;
    };

    // विकल्प A: Google Sign-In
    document.getElementById("btn-google-verify").onclick = async () => {
      if (!firebaseAuth) return alert("Firebase कुंजी लोड नहीं हुई है।");
      statusMsg.textContent = "Google से जोड़ा जा रहा है...";
      try {
        const provider = new GoogleAuthProvider();
        const result = await signInWithPopup(firebaseAuth, provider);
        if (result.user && result.user.email) {
          unlockRegistrationForm(result.user.email);
        }
      } catch (err) {
        statusMsg.textContent = "Google साइन-इन पूरा नहीं हुआ: " + (err.message || "");
      }
    };

    // विकल्प B1: Email पर वेरिफिकेशन लिंक भेजना
    document.getElementById("btn-send-email-link").onclick = async () => {
      if (!firebaseAuth) return alert("Firebase कुंजी लोड नहीं हुई है।");
      const em = document.getElementById("auth-email-inp").value.trim();
      const pw = document.getElementById("auth-pass-inp").value;
      if (!em || !em.includes("@")) return alert("कृपया सही ईमेल पता लिखें।");
      if (pw.length < 8 || pw.length > 10) return alert("कृपया 8 से 10 अक्षरों का पासवर्ड लिखें।");

      statusMsg.textContent = "वेरिफिकेशन लिंक भेजा जा रहा है...";
      try {
        let userCred;
        try {
          userCred = await createUserWithEmailAndPassword(firebaseAuth, em, pw);
        } catch (createErr) {
          userCred = await signInWithEmailAndPassword(firebaseAuth, em, pw);
        }
        if (userCred.user.emailVerified) {
          unlockRegistrationForm(userCred.user.email);
        } else {
          await sendEmailVerification(userCred.user);
          statusMsg.textContent = "📩 आपके Gmail इनबॉक्स (या Spam फ़ोल्डर) में लिंक भेज दिया गया है। लिंक पर क्लिक करने के बाद हरे बटन 'लिंक क्लिक कर दिया ✓' को दबाएं।";
        }
      } catch (err) {
        statusMsg.textContent = "त्रुटि: " + (err.message || "ईमेल भेजने में समस्या हुई।");
      }
    };

    // विकल्प B2: ईमेल लिंक वेरिफिकेशन की जांच करना
    document.getElementById("btn-check-email-verified").onclick = async () => {
      if (!firebaseAuth || !firebaseAuth.currentUser) {
        return alert("पहले ऊपर अपना ईमेल व पासवर्ड डालकर लिंक भेजें।");
      }
      statusMsg.textContent = "सत्यापन जांचा जा रहा है...";
      await firebaseAuth.currentUser.reload();
      if (firebaseAuth.currentUser.emailVerified) {
        unlockRegistrationForm(firebaseAuth.currentUser.email);
      } else {
        statusMsg.textContent = "⚠️ अभी ईमेल वेरीफाई नहीं हुआ है। कृपया अपने Gmail में आए लिंक पर क्लिक करें और फिर यह बटन दबाएं।";
      }
    };

    // चरण 2 सबमिट करना
    document.getElementById("sub-join").onclick = async () => {
      if (!verifiedEmail) return alert("पहले Google या Email से पहचान वेरीफाई करें।");
      const seatId = document.getElementById("j-seat").value;
      const name = document.getElementById("j-name").value.trim();
      const phone = document.getElementById("j-phone").value.replace(/\D/g, "");
      const address = document.getElementById("j-address").value.trim();
      const reason = document.getElementById("j-reason").value.trim();
      const note = document.getElementById("j-note").value.trim();
      const photo = await compressPhoto(document.getElementById("j-photo"));

      if (name.length < 2) return alert("कृपया अपना पूरा नाम लिखें।");
      if (!isValidIndianMobile(phone)) return alert("कृपया 10 अंकों का असली भारतीय मोबाइल नंबर डालें (नकली नंबर मान्य नहीं हैं)।");
      if (address.length < 5) return alert("कृपया अपना पूरा पता लिखें।");
      if (reason.length < 3) return alert("कृपया जुड़ने का कारण लिखें।");

      const latest = await cloudGetMembers();
      if (latest[seatId]?.locked) {
        alert("यह पद अभी किसी और सदस्य द्वारा लॉक कर दिया गया है!");
        return;
      }

      const rec = {
        seatId,
        name,
        phone,
        email: verifiedEmail,
        address,
        reason,
        note,
        photo,
        locked: true
      };

      const saved = await cloudSaveMember(rec);
      if (!saved) return alert("क्लाउड से जुड़ने में समस्या हुई, कृपया इंटरनेट जांचें।");

      try { await signOut(firebaseAuth); } catch (e) {}
      setLocalUser(rec);
      modal.remove();
      await refreshUI();
    };
  };

  // सख्त गोपनीयता नियम के साथ कक्ष खोलना (सभी सदस्यों के बीच 1-to-1 निजी चैट)
  const openRoom = async (roomId, title) => {
    const me = getLocalUser();
    if (!me) {
      openJoinOrProfile();
      return;
    }

    const isDirectChat = (roomId === "site-manager" || roomId.startsWith("admin-"));
    if (isDirectChat && me.seatId === roomId) {
      alert("यह आपकी अपनी सीट है। निजी बातचीत करने के लिए किसी दूसरे सदस्य या Site Manager के कार्ड पर टच करें।");
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
        ? `🔒 निजी 1-to-1 चैट: यह बातचीत केवल आपके और ${title} के बीच गोपनीय है (कोई तीसरा नहीं पढ़ सकता)।`
        : "📢 आधिकारिक कक्ष";

    const loadMessages = async () => {
      const list = await cloudGetPosts(activeRoomId);
      const box = document.getElementById("room-list");
      if (!box) return;
      box.innerHTML = list.length === 0
        ? `<div style="text-align:center;color:#64748b;margin-top:40px;font-size:13.5px;">अभी कोई संदेश नहीं है। नीचे से पोस्ट करें!</div>`
        : list.map((p) => `
          <div style="background:#fff;border-radius:14px;padding:10px 12px;margin-bottom:10px;border:1px solid #cbd5e1;">
            <div style="display:flex;align-items:center;gap:8px;margin-bottom:5px;">
              <img src="${p.photo || ""}" style="width:28px;height:28px;border-radius:50%;object-fit:cover;background:#0057ff;" />
              <div>
                <div style="font-size:13px;font-weight:800;color:#0057ff;">${p.name} (${p.seat})</div>
                <div style="font-size:10px;color:#64748b;">${p.time}</div>
              </div>
            </div>
            <div style="font-size:14px;color:#0f172a;white-space:pre-wrap;">${p.text}</div>
          </div>
        `).join("");
      box.scrollTop = box.scrollHeight;
    };

    room.innerHTML = `
      <header style="height:56px;background:#0057ff;color:#fff;padding:0 14px;display:flex;align-items:center;gap:10px;flex-shrink:0;">
        <button id="back-btn" style="background:rgba(255,255,255,0.2);border:none;color:#fff;padding:6px 12px;border-radius:999px;font-weight:800;cursor:pointer;">← वापस</button>
        <div style="font-size:16px;font-weight:800;">${title}</div>
      </header>
      <div style="background:#fef9c3;color:#854d0e;padding:6px 12px;font-size:11.5px;font-weight:700;border-bottom:1px solid #eab308;">${privacyNote}</div>
      <main id="room-list" style="flex:1;overflow-y:auto;padding:12px;"><div style="text-align:center;color:#64748b;margin-top:30px;">लोड हो रहा है...</div></main>
      <footer style="padding:8px 10px;background:#fff;border-top:1px solid #cbd5e1;display:flex;gap:8px;flex-shrink:0;">
        <input id="post-inp" type="text" placeholder="यहाँ संदेश लिखें..." style="flex:1;padding:10px 12px;border:1.5px solid #cbd5e1;border-radius:999px;font-size:14px;" />
        <button id="send-btn" style="padding:10px 16px;background:#0057ff;color:#fff;border:none;border-radius:999px;font-weight:800;cursor:pointer;">पोस्ट</button>
      </footer>
    `;

    document.body.appendChild(room);
    await loadMessages();
    const poll = setInterval(loadMessages, 4000);

    document.getElementById("back-btn").onclick = () => {
      clearInterval(poll);
      room.roomEl?.remove();
      room.remove();
    };

    document.getElementById("send-btn").onclick = async () => {
      const inp = document.getElementById("post-inp");
      const txt = inp.value.trim();
      if (!txt) return;
      inp.value = "";
      await cloudAddPost(activeRoomId, {
        name: me.name,
        seat: me.seatId.toUpperCase(),
        photo: me.photo || "",
        text: txt,
        time: new Date().toLocaleString("hi-IN")
      });
      await loadMessages();
    };
  };

  await refreshUI();
  setInterval(refreshUI, 6000);

  if (!getLocalUser()) setTimeout(openJoinOrProfile, 500);

  document.querySelectorAll(".panel-card").forEach((c) => {
    c.onclick = () => openRoom(c.getAttribute("data-action"), c.querySelector(".card-name").textContent);
  });
  document.getElementById("btn-all-citizens").onclick = openCitizenRecordsViewer;
  document.getElementById("btn-notify").onclick = () => openRoom("notices", "🔔 पार्टी सूचना केंद्र");
  document.getElementById("btn-profile").onclick = openJoinOrProfile;

  // चौथे फ़ोल्डर (04-execution/actions.js) को सक्रिय करना (यदि मौजूद हो)
  try {
    const execModule = await import("../../04-execution/actions.js");
    if (execModule && execModule.initPanelActions) {
      execModule.initPanelActions();
    }
  } catch (e) {}

  // =========================================================================
  // सदस्य व एडमिन प्रबंधन (Kick/Reset Member Tool) को स्वतः सक्रिय करना
  // =========================================================================
  try {
    "const kickModule = await import("../../06-kick-member/kick-member.js";
    if (kickModule && kickModule.initKickMemberTool) {
      kickModule.initKickMemberTool();
    }
  } catch (e) {}
}
