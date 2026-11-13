// 04-execution/actions.js — KSJP नियंत्रण कक्ष के संपूर्ण नियम (Rules) व क्रियान्वयन (Execution)

if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("./sw.js").catch(() => {});
}

const MEMBERS_KEY = "KSJP_MEMBERS_V2";
const USER_KEY = "KSJP_USER_V2";
const POSTS_KEY = "KSJP_POSTS_V2";

// 1. संपूर्ण संचालन नियम (Rules Engine — सीधे इसी फ़ाइल में सुरक्षित)
const KSJP_RULES = {
  "site-manager": "नियम 1: यह मुख्य संचालक कक्ष है। यहाँ से नए एडमिन जोड़े और नियंत्रित किए जाएंगे।",
  "board-room": "नियम 2: बोर्ड रूम में सभी सक्रिय पदाधिकारी सामूहिक चर्चा व संवाद कर सकेंगे।",
  "notices": "नियम 3: यहाँ केवल पार्टी की आधिकारिक सूचनाएँ और घोषणाएँ पोस्ट की जाएंगी।",
  "admin-default": "नियम 4: एक बार पद पर जुड़ने के बाद सदस्यता स्थायी रूप से लॉक हो जाती है; कोई भी एडमिन खुद से नहीं हट सकता।"
};

function getRoomRuleNote(roomId) {
  return KSJP_RULES[roomId] || KSJP_RULES["admin-default"];
}

function getMembers() {
  try { return JSON.parse(localStorage.getItem(MEMBERS_KEY)) || {}; } catch (e) { return {}; }
}

function getUser() {
  try { return JSON.parse(localStorage.getItem(USER_KEY)) || null; } catch (e) { return null; }
}

function getPosts(room) {
  try { return (JSON.parse(localStorage.getItem(POSTS_KEY)) || {})[room] || []; } catch (e) { return []; }
}

// 2. जुड़े हुए सदस्यों के नाम, नंबर और फ़ोटो कार्ड पर दिखाना
export function syncPanelCardsWithMembers() {
  const members = getMembers();
  document.querySelectorAll(".panel-card").forEach((card) => {
    const id = card.getAttribute("data-action");
    if (members[id]) {
      const m = members[id];
      const nameEl = card.querySelector(".card-name");
      const subEl = card.querySelector(".card-sub");
      const pill = card.querySelector(".status-pill");
      const av = card.querySelector(".avatar-manager, .avatar-member");

      if (nameEl) nameEl.textContent = m.name;
      if (subEl) subEl.textContent = `मो. ${m.phone} • स्थायी सदस्य`;
      if (pill) {
        pill.textContent = "जुड़ा हुआ 🔒";
        pill.style.background = "#00c853";
        pill.style.color = "#ffffff";
      }
      if (av && m.photo) {
        av.innerHTML = `<img src="${m.photo}" style="width:100%;height:100%;border-radius:50%;object-fit:cover;" />`;
      }
    }
  });
}

// 3. पंजीकरण, स्थायी सीट लॉक और प्रोफ़ाइल फ़ोटो/नाम अपडेट
function openJoinOrProfileModal() {
  const user = getUser();
  const members = getMembers();
  document.getElementById("ksjp-modal")?.remove();

  const modal = document.createElement("div");
  modal.id = "ksjp-modal";
  modal.style.cssText = "position:fixed;inset:0;background:rgba(15,23,42,0.75);display:flex;align-items:center;justify-content:center;padding:16px;z-index:10000;";

  if (user) {
    modal.innerHTML = `
      <div style="width:100%;max-width:360px;background:#fff;border-radius:18px;border:2px solid #0057ff;padding:18px;">
        <div style="display:flex;align-items:center;gap:12px;margin-bottom:12px;">
          <img src="${user.photo || ""}" style="width:54px;height:54px;border-radius:50%;object-fit:cover;background:#e2e8f0;border:2px solid #0057ff;" />
          <div>
            <div style="font-size:16px;font-weight:800;">${user.name}</div>
            <div style="font-size:12px;color:#0057ff;font-weight:700;">पद: ${user.seatId.toUpperCase()} 🔒</div>
            <div style="font-size:11.5px;color:#475569;">मोबाइल: ${user.phone}</div>
          </div>
        </div>
        <div style="background:#fef9c3;border:1px solid #eab308;color:#854d0e;padding:7px 10px;border-radius:10px;font-size:11.5px;font-weight:700;margin-bottom:12px;">
          🔒 नियम: आपकी सदस्यता स्थायी लॉक है। आप खुद से नहीं हट सकते।
        </div>
        <input id="upd-name" type="text" value="${user.name}" style="width:100%;padding:9px;border:1.5px solid #cbd5e1;border-radius:10px;margin-bottom:8px;font-size:14px;" />
        <input id="upd-photo" type="file" accept="image/*" style="width:100%;font-size:12px;margin-bottom:12px;" />
        <div style="display:flex;gap:8px;">
          <button id="save-prof" style="flex:1;padding:10px;background:#0057ff;color:#fff;border:none;border-radius:999px;font-weight:700;">सुरक्षित करें</button>
          <button id="close-mod" style="padding:10px 16px;background:#e2e8f0;border:none;border-radius:999px;font-weight:700;">बंद</button>
        </div>
      </div>
    `;
  } else {
    const opts = [
      { id: "site-manager", label: "Site Manager (मुख्य संचालक)" },
      { id: "admin-1", label: "एडमिन 1" },
      { id: "admin-2", label: "एडमिन 2" },
      { id: "admin-3", label: "एडमिन 3" },
      { id: "admin-4", label: "एडमिन 4" },
      { id: "admin-5", label: "एडमिन 5" }
    ].map((s) => `<option value="${s.id}" ${members[s.id]?.locked ? "disabled" : ""}>${s.label} ${members[s.id]?.locked ? "(लॉक)" : "(खाली)"}</option>`).join("");

    modal.innerHTML = `
      <div style="width:100%;max-width:360px;background:#fff;border-radius:18px;border:2px solid #0057ff;padding:18px;">
        <h3 style="font-size:17px;font-weight:800;color:#0057ff;margin-bottom:4px;">KSJP एडमिन पंजीकरण</h3>
        <p style="font-size:12px;color:#475569;margin-bottom:10px;">जुड़ने के बाद आपका पद स्थायी रूप से लॉक हो जाएगा।</p>
        <select id="j-seat" style="width:100%;padding:9px;border:1.5px solid #cbd5e1;border-radius:10px;margin-bottom:8px;">${opts}</select>
        <input id="j-name" type="text" placeholder="अपना पूरा नाम लिखें" style="width:100%;padding:9px;border:1.5px solid #cbd5e1;border-radius:10px;margin-bottom:8px;" />
        <input id="j-phone" type="tel" maxlength="10" placeholder="10 अंकों का मोबाइल नंबर" style="width:100%;padding:9px;border:1.5px solid #cbd5e1;border-radius:10px;margin-bottom:8px;" />
        <input id="j-photo" type="file" accept="image/*" style="width:100%;font-size:12px;margin-bottom:12px;" />
        <div style="display:flex;gap:8px;">
          <button id="sub-join" style="flex:1;padding:10px;background:#00c853;color:#fff;border:none;border-radius:999px;font-weight:800;">जुड़ें और लॉक करें</button>
          <button id="close-mod" style="padding:10px 14px;background:#e2e8f0;border:none;border-radius:999px;font-weight:700;">बाद में</button>
        </div>
      </div>
    `;
  }

  document.body.appendChild(modal);
  document.getElementById("close-mod").onclick = () => modal.remove();

  const readImg = (inp) => new Promise((res) => {
    const f = inp?.files?.[0];
    if (!f) return res("");
    const r = new FileReader();
    r.onload = () => res(r.result);
    r.readAsDataURL(f);
  });

  if (user) {
    document.getElementById("save-prof").onclick = async () => {
      const nm = document.getElementById("upd-name").value.trim();
      const ph = await readImg(document.getElementById("upd-photo"));
      if (nm.length >= 2) user.name = nm;
      if (ph) user.photo = ph;
      const m = getMembers();
      m[user.seatId] = user;
      localStorage.setItem(MEMBERS_KEY, JSON.stringify(m));
      localStorage.setItem(USER_KEY, JSON.stringify(user));
      modal.remove();
      syncPanelCardsWithMembers();
    };
  } else {
    document.getElementById("sub-join").onclick = async () => {
      const seatId = document.getElementById("j-seat").value;
      const name = document.getElementById("j-name").value.trim();
      const phone = document.getElementById("j-phone").value.replace(/\D/g, "");
      const photo = await readImg(document.getElementById("j-photo"));
      if (name.length < 2) return alert("कृपया पूरा नाम लिखें।");
      if (phone.length !== 10) return alert("10 अंकों का सही मोबाइल नंबर डालें।");
      if (members[seatId]?.locked) return alert("यह पद पहले से लॉक है!");

      const rec = { seatId, name, phone, photo, locked: true };
      const m = getMembers();
      m[seatId] = rec;
      localStorage.setItem(MEMBERS_KEY, JSON.stringify(m));
      localStorage.setItem(USER_KEY, JSON.stringify(rec));
      modal.remove();
      syncPanelCardsWithMembers();
    };
  }
}

// 4. हर कक्ष के अंदर नियम पट्टी और मैसेज पोस्ट स्क्रीन
function openRoomScreen(roomId, title) {
  document.getElementById("ksjp-room")?.remove();

  const ruleText = getRoomRuleNote(roomId);
  const room = document.createElement("div");
  room.id = "ksjp-room";
  room.style.cssText = "position:fixed;inset:0;width:100vw;height:100dvh;background:#f1f5f9;display:flex;flex-direction:column;z-index:9999;";

  const renderList = () => {
    const list = getPosts(roomId);
    const box = document.getElementById("room-list");
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
      <button id="back-btn" style="background:rgba(255,255,255,0.2);border:none;color:#fff;padding:6px 12px;border-radius:999px;font-weight:800;">← वापस</button>
      <div style="font-size:16px;font-weight:800;">${title}</div>
    </header>
    <div style="background:#fef9c3;color:#854d0e;padding:6px 12px;font-size:11.5px;font-weight:700;border-bottom:1px solid #eab308;">⚖️ ${ruleText}</div>
    <main id="room-list" style="flex:1;overflow-y:auto;padding:12px;"></main>
    <footer style="padding:8px 10px;background:#fff;border-top:1px solid #cbd5e1;display:flex;gap:8px;flex-shrink:0;">
      <input id="post-inp" type="text" placeholder="यहाँ संदेश लिखें..." style="flex:1;padding:10px 12px;border:1.5px solid #cbd5e1;border-radius:999px;font-size:14px;" />
      <button id="send-btn" style="padding:10px 16px;background:#0057ff;color:#fff;border:none;border-radius:999px;font-weight:800;">पोस्ट</button>
    </footer>
  `;

  document.body.appendChild(room);
  renderList();
  document.getElementById("back-btn").onclick = () => room.remove();
  document.getElementById("send-btn").onclick = () => {
    const u = getUser();
    if (!u) return openJoinOrProfileModal();
    const inp = document.getElementById("post-inp");
    const txt = inp.value.trim();
    if (!txt) return;
    const all = JSON.parse(localStorage.getItem(POSTS_KEY) || "{}");
    if (!all[roomId]) all[roomId] = [];
    all[roomId].push({ name: u.name, seat: u.seatId.toUpperCase(), photo: u.photo, text: txt, time: new Date().toLocaleString("hi-IN") });
    localStorage.setItem(POSTS_KEY, JSON.stringify(all));
    inp.value = "";
    renderList();
  };
}

// 5. मुख्य प्रारंभिक इंजन
export function initPanelActions() {
  syncPanelCardsWithMembers();
  if (!getUser()) setTimeout(openJoinOrProfileModal, 400);

  document.querySelectorAll(".panel-card").forEach((c) => {
    c.style.cursor = "pointer";
    c.onclick = () => openRoomScreen(c.getAttribute("data-action"), c.querySelector(".card-name").textContent);
  });

  const notifyBtn = document.getElementById("btn-notify");
  const profileBtn = document.getElementById("btn-profile");
  if (notifyBtn) notifyBtn.onclick = () => openRoomScreen("notices", "🔔 पार्टी सूचना केंद्र");
  if (profileBtn) profileBtn.onclick = openJoinOrProfileModal;
}
