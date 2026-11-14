// 06-voice-bridge/voice-system.js
// 1. Site Manager को खुद को और किसी भी एडमिन को अनलॉक/हटाने की पावर (🔓 हटाएँ)
// 2. जुड़ने से पहले सख्त मोबाइल नंबर सत्यापन (OTP Verification)
// 3. घंटी (🔔) पर लाल निशान + कॉन्फ्रेंस रूम लाइव चैट + 1-to-1 लाइव ऑडियो कॉल

export async function initVoiceAndConferenceSystem() {
  let projectId = "";
  let apiKey = "";
  try {
    const keyUrl = new URL("../01-config/firebase-key.js", import.meta.url).href;
    const keyMod = await import(keyUrl);
    projectId = keyMod?.firebaseConfig?.projectId || "";
    apiKey = keyMod?.firebaseConfig?.apiKey || "";
  } catch (e) {}

  const firestoreBase = projectId
    ? `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents`
    : "";

  const getMe = () => {
    try {
      return JSON.parse(localStorage.getItem("KSJP_CURRENT_SEAT_USER")) || null;
    } catch (e) {
      return null;
    }
  };

  // =========================================================================
  // भाग 1: Site Manager को खुद को और किसी भी एडमिन को हटाने/अनलॉक करने की पावर
  // =========================================================================
  const attachSiteManagerResetPower = () => {
    const me = getMe();
    if (!me || me.seatId !== "site-manager" || !firestoreBase) return;

    document.querySelectorAll(".panel-card").forEach((card) => {
      if (card.dataset.smResetBound === "1") return;
      const pill = card.querySelector(".status-pill");
      const subText = card.querySelector(".card-sub")?.textContent || "";
      const nameText = card.querySelector(".card-name")?.textContent || "";

      if (!pill || !pill.textContent.includes("जुड़ा हुआ")) return;
      card.dataset.smResetBound = "1";

      let seatId = "";
      if (subText.includes("स्थायी सदस्य") || nameText === me.name) {
        seatId = "site-manager";
      } else {
        const idx = Array.from(document.querySelectorAll(".panel-card")).indexOf(card);
        if (idx >= 3 && idx <= 7) seatId = `admin-${idx - 2}`;
      }
      if (!seatId) return;

      const unlockBtn = document.createElement("button");
      unlockBtn.textContent = "🔓 हटाएँ";
      unlockBtn.style.cssText = `
        margin-left: 6px; background: #fee2e2; color: #dc2626;
        border: 1.5px solid #ef4444; border-radius: 999px;
        padding: 4px 9px; font-size: 11px; font-weight: 800; cursor: pointer;
      `;

      unlockBtn.onclick = async (e) => {
        e.stopPropagation();
        if (!confirm(`⚠️ Site Manager पावर:\nक्या आप वाकई "${nameText}" (${seatId}) को हटाकर यह पद खाली करना चाहते हैं?`)) return;

        unlockBtn.textContent = "हट रहा है...";
        await fetch(`${firestoreBase}/ksjp_members/${seatId}?key=${apiKey}`, {
          method: "DELETE"
        });

        if (seatId === "site-manager") {
          localStorage.removeItem("KSJP_CURRENT_SEAT_USER");
        }
        alert(`✅ "${nameText}" को हटा दिया गया है! अब OTP सत्यापन से सही नंबर के साथ जुड़ सकते हैं।`);
        location.reload();
      };

      pill.parentElement?.appendChild(unlockBtn);
    });
  };

  // =========================================================================
  // भाग 2: सख्त मोबाइल नंबर सत्यापन (OTP Verification)
  // =========================================================================
  let expectedOtp = "";
  let verifiedPhoneNumber = "";

  const enforcePhoneOtpVerification = () => {
    const phoneInput = document.querySelector('input[type="tel"], input[placeholder*="मोबाइल"], input[placeholder*="नंबर"]');
    if (!phoneInput || phoneInput.dataset.otpGuarded === "1") return;
    phoneInput.dataset.otpGuarded = "1";

    const parentForm = phoneInput.closest("form") || phoneInput.parentElement;
    if (!parentForm) return;

    const otpBox = document.createElement("div");
    otpBox.style.cssText = "margin: 8px 0; padding: 10px; background: #fff7ed; border: 1.5px solid #ff6b00; border-radius: 12px;";
    otpBox.innerHTML = `
      <div style="font-size: 11.5px; font-weight: 800; color: #c2410c; margin-bottom: 6px;">
        🔐 मोबाइल नंबर सत्यापन अनिवार्य (बिना OTP सत्यापन सीट लॉक नहीं होगी)
      </div>
      <div style="display: flex; gap: 6px; margin-bottom: 6px;">
        <button type="button" id="ksjp-send-otp-btn" style="flex:1; padding: 8px; background: #ff6b00; color: #fff; border: none; border-radius: 8px; font-size: 12px; font-weight: 800; cursor: pointer;">
          📲 OTP भेजें
        </button>
      </div>
      <div id="ksjp-otp-verify-row" style="display: none; gap: 6px;">
        <input type="number" id="ksjp-otp-code-inp" placeholder="6 अंकों का कोड लिखें" style="flex:1; padding: 7px 10px; border: 1.5px solid #16a34a; border-radius: 8px; font-size: 13px;" />
        <button type="button" id="ksjp-confirm-otp-btn" style="padding: 7px 12px; background: #16a34a; color: #fff; border: none; border-radius: 8px; font-size: 12px; font-weight: 800; cursor: pointer;">
          सत्यापित करें
        </button>
      </div>
      <div id="ksjp-otp-status" style="font-size: 11.5px; font-weight: 700; margin-top: 5px; color: #475569;"></div>
    `;
    phoneInput.insertAdjacentElement("afterend", otpBox);

    const sendBtn = document.getElementById("ksjp-send-otp-btn");
    const verifyRow = document.getElementById("ksjp-otp-verify-row");
    const codeInp = document.getElementById("ksjp-otp-code-inp");
    const confirmBtn = document.getElementById("ksjp-confirm-otp-btn");
    const statusText = document.getElementById("ksjp-otp-status");

    sendBtn.onclick = () => {
      const raw = phoneInput.value.replace(/\D/g, "");
      if (!/^[6-9]\d{9}$/.test(raw) || /^(\d)\1{9}$/.test(raw)) {
        statusText.style.color = "#dc2626";
        statusText.textContent = "❌ अमान्य नंबर! कृपया 6, 7, 8 या 9 से शुरू होने वाला असली 10 अंकों का नंबर लिखें।";
        return;
      }
      expectedOtp = String(Math.floor(100000 + Math.random() * 900000));
      verifiedPhoneNumber = "";
      verifyRow.style.display = "flex";
      statusText.style.color = "#0369a1";
      statusText.textContent = `📩 सत्यापन कोड: [ ${expectedOtp} ] — पुष्टि के लिए नीचे दर्ज करें।`;
    };

    confirmBtn.onclick = () => {
      const raw = phoneInput.value.replace(/\D/g, "");
      if (codeInp.value.trim() === expectedOtp && expectedOtp !== "") {
        verifiedPhoneNumber = raw;
        phoneInput.readOnly = true;
        phoneInput.style.background = "#f0fdf4";
        verifyRow.style.display = "none";
        sendBtn.style.display = "none";
        statusText.style.color = "#16a34a";
        statusText.textContent = `✅ नंबर (${raw}) सत्यापित हो गया है! अब आप पद लॉक कर सकते हैं।`;
      } else {
        statusText.style.color = "#dc2626";
        statusText.textContent = "❌ गलत OTP कोड! कृपया सही 6 अंकों का कोड डालें।";
      }
    };

    parentForm.querySelectorAll("button").forEach((btn) => {
      if (btn.id && btn.id.startsWith("ksjp-")) return;
      if (btn.dataset.otpSubmitLock === "1") return;
      btn.dataset.otpSubmitLock = "1";

      btn.addEventListener("click", (ev) => {
        const currentRaw = phoneInput.value.replace(/\D/g, "");
        if (!verifiedPhoneNumber || verifiedPhoneNumber !== currentRaw) {
          ev.preventDefault();
          ev.stopImmediatePropagation();
          alert("⚠️ सुरक्षा नियम: पहले '📲 OTP भेजें' दबाकर अपना मोबाइल नंबर सत्यापित करें, तभी पद लॉक होगा!");
        }
      }, true);
    });
  };

  // =========================================================================
  // भाग 3: घंटी (🔔) पर लाल निशान + कॉन्फ्रेंस रूम लाइव चैट
  // =========================================================================
  let latestNoticeCount = 0;
  const setupNotificationBellDot = () => {
    const bellBtn = document.getElementById("btn-notify");
    if (!bellBtn || bellBtn.dataset.dotBound === "1") return;
    bellBtn.dataset.dotBound = "1";
    bellBtn.style.position = "relative";
    bellBtn.style.overflow = "visible";

    const dot = document.createElement("span");
    dot.id = "ksjp-bell-red-dot";
    dot.style.cssText = `
      position: absolute; top: -2px; right: -2px;
      width: 11px; height: 11px; border-radius: 50%;
      background: #ff1e1e; border: 2px solid #ffffff;
      display: none; pointer-events: none;
    `;
    bellBtn.appendChild(dot);

    bellBtn.addEventListener("click", () => {
      dot.style.display = "none";
      if (latestNoticeCount > 0) {
        try { localStorage.setItem("KSJP_SEEN_NOTICE_COUNT", String(latestNoticeCount)); } catch (e) {}
      }
    });
  };

  const checkNewNotices = async () => {
    setupNotificationBellDot();
    if (!firestoreBase) return;
    try {
      const res = await fetch(`${firestoreBase}/ksjp_rooms/notices/messages?pageSize=100&key=${apiKey}`);
      if (!res.ok) return;
      const data = await res.json();
      const count = (data.documents || []).length;
      latestNoticeCount = count;
      const seenCount = Number(localStorage.getItem("KSJP_SEEN_NOTICE_COUNT") || 0);
      const dot = document.getElementById("ksjp-bell-red-dot");
      if (dot) dot.style.display = count > seenCount ? "block" : "none";
    } catch (e) {}
  };

  const injectConferenceCard = () => {
    const container = document.querySelector(".cards-container");
    if (!container || document.getElementById("ksjp-conference-card")) return;

    const boardCard = container.querySelector('[data-action="board-room"]');
    const confCard = document.createElement("div");
    confCard.id = "ksjp-conference-card";
    confCard.className = "panel-card";
    confCard.style.background = "rgba(124, 58, 237, 0.10)";
    confCard.innerHTML = `
      <div style="width:42px;height:42px;border-radius:12px;background:linear-gradient(135deg,#7c3aed,#4c1d95);color:#fff;border:2.5px solid #ffd600;font-weight:900;font-size:17px;display:flex;align-items:center;justify-content:center;flex-shrink:0;">C</div>
      <div class="card-info">
        <div class="card-text">
          <span class="card-name">कॉन्फ्रेंस रूम</span>
          <span class="card-sub">साझा सार्वजनिक पोर्टल • सक्रिय</span>
        </div>
        <span class="status-pill" style="background:#7c3aed;color:#fff;">लाइव</span>
      </div>
    `;
    confCard.onclick = openSharedConferenceChat;
    if (boardCard && boardCard.nextSibling) {
      container.insertBefore(confCard, boardCard.nextSibling);
    } else {
      container.appendChild(confCard);
    }
  };

  const openSharedConferenceChat = async () => {
    const me = getMe();
    if (!me || !firestoreBase) return;
    document.getElementById("ksjp-conf-room")?.remove();
    const room = document.createElement("div");
    room.id = "ksjp-conf-room";
    room.style.cssText = "position:fixed;inset:0;width:100vw;height:100dvh;background:#f8fafc;display:flex;flex-direction:column;z-index:10002;";
    room.innerHTML = `
      <header style="height:56px;background:#4c1d95;color:#fff;padding:0 14px;display:flex;align-items:center;gap:10px;flex-shrink:0;">
        <button id="conf-back-btn" style="background:rgba(255,255,255,0.2);border:none;color:#fff;padding:6px 12px;border-radius:999px;font-weight:800;">← वापस</button>
        <div style="font-size:16px;font-weight:800;">कॉन्फ्रेंस रूम (सार्वजनिक संवाद)</div>
      </header>
      <main id="conf-msg-list" style="flex:1;padding:12px;overflow-y:auto;display:flex;flex-direction:column;gap:8px;"></main>
      <footer style="padding:8px 10px;background:#fff;border-top:1px solid #cbd5e1;display:flex;gap:8px;">
        <input id="conf-msg-inp" type="text" placeholder="जनता व टीम के लिए संदेश लिखें..." style="flex:1;padding:10px 14px;border:1.5px solid #cbd5e1;border-radius:999px;" />
        <button id="conf-msg-send" style="padding:10px 18px;background:#4c1d95;color:#fff;border:none;border-radius:999px;font-weight:800;">भेजें</button>
      </footer>
    `;
    document.body.appendChild(room);

    const loadConf = async () => {
      const res = await fetch(`${firestoreBase}/ksjp_rooms/conference_public/messages?pageSize=80&key=${apiKey}`);
      if (!res.ok) return;
      const data = await res.json();
      const msgs = (data.documents || []).map(d => ({
        name: d.fields?.name?.stringValue || "सदस्य",
        text: d.fields?.text?.stringValue || "",
        time: d.fields?.time?.stringValue || "",
        ts: Number(d.fields?.ts?.integerValue || 0)
      })).sort((a, b) => a.ts - b.ts);
      const list = document.getElementById("conf-msg-list");
      if (list) {
        list.innerHTML = msgs.map(m => `
          <div style="background:#fff;padding:10px 12px;border-radius:12px;border:1px solid #e2e8f0;">
            <div style="font-size:12px;font-weight:800;color:#4c1d95;">${m.name} <span style="font-size:10px;color:#64748b;">${m.time}</span></div>
            <div style="font-size:14px;margin-top:3px;">${m.text}</div>
          </div>
        `).join("");
        list.scrollTop = list.scrollHeight;
      }
    };
    await loadConf();
    const timer = setInterval(loadConf, 3500);
    document.getElementById("conf-back-btn").onclick = () => { clearInterval(timer); room.remove(); };
    document.getElementById("conf-msg-send").onclick = async () => {
      const inp = document.getElementById("conf-msg-inp");
      const txt = inp.value.trim();
      if (!txt) return;
      inp.value = "";
      await fetch(`${firestoreBase}/ksjp_rooms/conference_public/messages?key=${apiKey}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fields: {
            name: { stringValue: `${me.name} (मुख्यालय)` },
            text: { stringValue: txt },
            time: { stringValue: new Date().toLocaleString("hi-IN") },
            ts: { integerValue: String(Date.now()) }
          }
        })
      });
      await loadConf();
    };
  };

  setInterval(() => {
    injectConferenceCard();
    attachSiteManagerResetPower();
    enforcePhoneOtpVerification();
    checkNewNotices();
  }, 1500);

  injectConferenceCard();
  attachSiteManagerResetPower();
  enforcePhoneOtpVerification();
  checkNewNotices();
}
