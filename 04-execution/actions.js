// 04-execution/actions.js
import { getAllMembers, getCurrentUser, openJoinOrProfileModal } from "../05-rules/auth-lock.js";

if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("./sw.js").catch(() => {});
}

const POSTS_STORAGE_KEY = "KSJP_ROOM_POSTS_V1";

function getRoomPosts(roomId) {
  try {
    const all = JSON.parse(localStorage.getItem(POSTS_STORAGE_KEY)) || {};
    return all[roomId] || [];
  } catch (e) {
    return [];
  }
}

function saveRoomPost(roomId, postObj) {
  try {
    const all = JSON.parse(localStorage.getItem(POSTS_STORAGE_KEY)) || {};
    if (!all[roomId]) all[roomId] = [];
    all[roomId].push(postObj);
    localStorage.setItem(POSTS_STORAGE_KEY, JSON.stringify(all));
  } catch (e) {}
}

// जुड़े हुए एडमिन के नाम और फ़ोटो को मुख्य कार्डों पर अपडेट करना
export function syncPanelCardsWithMembers() {
  const members = getAllMembers();
  const cards = document.querySelectorAll(".panel-card");

  cards.forEach((card) => {
    const action = card.getAttribute("data-action");
    if (members[action]) {
      const m = members[action];
      const nameEl = card.querySelector(".card-name");
      const subEl = card.querySelector(".card-sub");
      const pillEl = card.querySelector(".status-pill");
      const avatarEl = card.querySelector(".avatar-manager, .avatar-member");

      if (nameEl) nameEl.textContent = m.name;
      if (subEl) subEl.textContent = `मो. ${m.phone} • स्थायी सदस्य`;
      if (pillEl) {
        pillEl.textContent = "जुड़ा हुआ 🔒";
        pillEl.style.background = "#00c853";
        pillEl.style.color = "#ffffff";
      }
      if (avatarEl && m.photo) {
        avatarEl.innerHTML = `<img src="${m.photo}" style="width:100%;height:100%;border-radius:50%;object-fit:cover;" />`;
      }
    }
  });
}

export function initPanelActions() {
  syncPanelCardsWithMembers();

  // अगर कोई पहली बार आया है, तो उसे जुड़ने का विकल्प दें
  if (!getCurrentUser()) {
    setTimeout(() => {
      openJoinOrProfileModal(() => syncPanelCardsWithMembers());
    }, 600);
  }

  const cards = document.querySelectorAll(".panel-card");
  cards.forEach((card) => {
    card.style.cursor = "pointer";
    card.addEventListener("click", () => {
      const title = card.querySelector(".card-name")?.textContent || "कक्ष";
      const roomId = card.getAttribute("data-action") || "general";
      openRoomPostScreen(roomId, title);
    });
  });

  const notifyBtn = document.getElementById("btn-notify");
  const profileBtn = document.getElementById("btn-profile");

  if (notifyBtn) {
    notifyBtn.style.cursor = "pointer";
    notifyBtn.addEventListener("click", () => {
      openRoomPostScreen("official-notices", "🔔 पार्टी सूचना केंद्र");
    });
  }

  if (profileBtn) {
    profileBtn.style.cursor = "pointer";
    profileBtn.addEventListener("click", () => {
      openJoinOrProfileModal(() => syncPanelCardsWithMembers());
    });
  }
}

// हर कक्ष के अंदर मैसेज पोस्ट करने और पढ़ने की स्क्रीन
function openRoomPostScreen(roomId, roomTitle) {
  let old = document.getElementById("ksjp-room-screen");
  if (old) old.remove();

  const user = getCurrentUser();
  const screen = document.createElement("div");
  screen.id = "ksjp-room-screen";
  screen.style.cssText = `
    position: fixed; inset: 0; width: 100vw; height: 100dvh;
    background: #f1f5f9; display: flex; flex-direction: column; z-index: 9999;
  `;

  const renderPostsList = () => {
    const posts = getRoomPosts(roomId);
    const listBox = document.getElementById("ksjp-posts-list");
    if (!listBox) return;

    if (posts.length === 0) {
      listBox.innerHTML = `<div style="text-align:center;color:#64748b;margin-top:40px;font-size:13.5px;">अभी इस कक्ष में कोई पोस्ट नहीं है।<br/>नीचे से पहला संदेश पोस्ट करें!</div>`;
      return;
    }

    listBox.innerHTML = posts.map((p) => `
      <div style="background:#ffffff;border-radius:14px;padding:10px 12px;margin-bottom:10px;border:1px solid #cbd5e1;box-shadow:0 1px 3px rgba(0,0,0,0.06);">
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;">
          <img src="${p.authorPhoto || ""}" style="width:28px;height:28px;border-radius:50%;object-fit:cover;background:#0057ff;" />
          <div style="flex:1;">
            <div style="font-size:13px;font-weight:800;color:#0057ff;">${p.authorName} <span style="font-size:10.5px;color:#475569;font-weight:600;">(${p.authorSeat})</span></div>
            <div style="font-size:10px;color:#64748b;">${p.time}</div>
          </div>
        </div>
        <div style="font-size:14px;color:#0f172a;line-height:1.45;white-space:pre-wrap;">${p.text}</div>
      </div>
    `).join("");
    listBox.scrollTop = listBox.scrollHeight;
  };

  screen.innerHTML = `
    <header style="height:56px;background:#0057ff;color:#fff;padding:0 14px;display:flex;align-items:center;justify-content:space-between;flex-shrink:0;">
      <div style="display:flex;align-items:center;gap:10px;">
        <button id="close-room-btn" style="background:rgba(255,255,255,0.2);border:none;color:#fff;padding:6px 12px;border-radius:999px;font-weight:800;cursor:pointer;">← वापस</button>
        <div style="font-size:16px;font-weight:800;">${roomTitle}</div>
      </div>
    </header>

    <main id="ksjp-posts-list" style="flex:1;overflow-y:auto;padding:12px;"></main>

    <footer style="padding:8px 10px;background:#ffffff;border-top:1px solid #cbd5e1;display:flex;gap:8px;align-items:center;flex-shrink:0;">
      <input id="ksjp-post-input" type="text" placeholder="${user ? "यहाँ संदेश लिखें..." : "संदेश लिखने के लिए पहले P से जुड़ें"}" style="flex:1;padding:10px 12px;border:1.5px solid #cbd5e1;border-radius:999px;font-size:14px;outline:none;" />
      <button id="ksjp-send-post" style="padding:10px 16px;background:#0057ff;color:#fff;border:none;border-radius:999px;font-weight:800;cursor:pointer;">पोस्ट</button>
    </footer>
  `;

  document.body.appendChild(screen);
  renderPostsList();

  document.getElementById("close-room-btn").onclick = () => screen.remove();

  document.getElementById("ksjp-send-post").onclick = () => {
    const activeUser = getCurrentUser();
    if (!activeUser) {
      openJoinOrProfileModal(() => syncPanelCardsWithMembers());
      return;
    }
    const input = document.getElementById("ksjp-post-input");
    const text = input.value.trim();
    if (!text) return;

    saveRoomPost(roomId, {
      authorName: activeUser.name,
      authorSeat: activeUser.seatId.toUpperCase(),
      authorPhoto: activeUser.photo,
      text,
      time: new Date().toLocaleString("hi-IN")
    });

    input.value = "";
    renderPostsList();
  };
}
