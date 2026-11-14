// 06-voice-bridge/voice-system.js
// 1. बिना SMS OTP के 10 अंकों के वैध भारतीय मोबाइल नंबर की अनिवार्य जाँच
// 2. Site Manager (मनीष कश्यप) को खुद को या किसी भी एडमिन को हटाने/अनलॉक करने की पावर
// 3. सामान्य सदस्यों को हटाने/ब्लॉक करने का डैशबोर्ड (Kick/Delete tool)

export async function initVoiceAndConferenceSystem() {
  let firebaseConfig = null;
  try {
    const keyUrl = new URL("../01-config/firebase-key.js", import.meta.url).href;
    const keyMod = await import(keyUrl);
    firebaseConfig = keyMod?.firebaseConfig || null;
  } catch (e) {}

  const projectId = firebaseConfig?.projectId || "";
  const apiKey = firebaseConfig?.apiKey || "";
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

  // वैध भारतीय मोबाइल नंबर की कड़ी जाँच
  function isGenuineIndianMobile(num) {
    if (!/^[6-9]\d{9}$/.test(num)) return false;
    if (/^(\d)\1{9}$/.test(num)) return false;
    if (/^(\d\d)\1{4}$/.test(num)) return false;
    const fakeList = [
      "1234567890", "9876543210", "6789012345",
      "7890123456", "8901234567", "9012345678", "6543210987"
    ];
    if (fakeList.includes(num)) return false;
    return true;
  }

  // =========================================================================
  // भाग 1: Site Manager को खुद को और किसी भी एडमिन को हटाने की पावर
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
        alert(`✅ "${nameText}" को हटा दिया गया है! अब नए सदस्य जुड़ सकते हैं।`);
        location.reload();
      };

      pill.parentElement?.appendChild(unlockBtn);
    });
  };

  // =========================================================================
  // भाग 2: सामान्य सदस्य प्रबंधन (Kick / Delete Tool) - तैरता हुआ बटन
  // =========================================================================
  const mountKickButton = () => {
    if (document.getElementById("btn-kick-members-panel")) return;

    const btn = document.createElement("button");
    btn.id = "btn-kick-members-panel";
    btn.title = "सामान्य सदस्य प्रबंधन / हटाएं";
    btn.style.cssText = `
      position: fixed; bottom: 20px; right: 20px; z-index: 9999;
      padding: 10px 16px; border-radius: 999px; background: #dc2626;
      color: #ffffff; border: 2px solid #ffffff; display: flex;
      align-items: center; justify-content: center; font-size: 13px;
      font-weight: 900; cursor: pointer; box-shadow: 0 4px 12px rgba(220,38,38,0.4);
    `;
    btn.innerHTML = "🗑️ सदस्य प्रबंधन";

    document.body.appendChild(btn);
    btn.onclick = openMembersManager;
  };

  async function openMembersManager() {
    const adminUser = getMe();
    const validAdminSeats = ["site-manager", "admin-1", "admin-2", "admin-3", "admin-4", "admin-5"];

    if (!adminUser || !validAdminSeats.includes(adminUser.seatId)) {
      alert("🔒 केवल Site Manager या Admin ही सदस्यों को प्रबंधित कर सकते हैं।");
      return;
    }

    document.getElementById("ksjp-kick-screen")?.remove();
    const screen = document.createElement("div");
    screen.id = "ksjp-kick-screen";
    screen.style.cssText = "position:fixed;inset:0;width:100vw;height:100dvh;background:#f1f5f9;display:flex;flex-direction:column;z-index:10006;";

    screen.innerHTML = `
      <header style="height:56px;background:#dc2626;color:#fff;padding:0 14px;display:flex;align-items:center;gap:10px;flex-shrink:0;">
        <button id="km-back-btn" style="background:rgba(255,255,255,0.2);border:none;color:#fff;padding:6px 12px;border-radius:999px;font-weight:800;cursor:pointer;">← वापस</button>
        <div style="font-size:15.5px;font-weight:800;">सामान्य सदस्य प्रबंधन (हटाएं / ब्लॉक)</div>
      </header>
      <main id="km-list-body" style="flex:1;overflow-y:auto;padding:12px;">
        <div style="text-align:center;color:#64748b;margin-top:40px;">सदस्यों की सूची लोड हो रही है...</div>
      </main>
    `;

    document.body.appendChild(screen);
    document.getElementById("km-back-btn").onclick = () => screen.remove();

    const body = document.getElementById("km-list-body");
    if (!firestoreBase) return;

    try {
      const res = await fetch(`${firestoreBase}/ksjp_users?pageSize=200&key=${apiKey}`);
      const data = res.ok ? await res.json() : { documents: [] };
      const members = (data.documents || []).map((doc) => {
        const id = doc.name.split("/").pop();
        const f = doc.fields || {};
        return {
          id,
          name: f.name?.stringValue || "सदस्य",
          phone: f.phone?.stringValue || id,
          address: f.address?.stringValue || f.village?.stringValue || "",
          photo: f.photo?.stringValue || "",
          status: f.membershipStatus?.stringValue || "ghost"
        };
      });

      if (members.length === 0) {
        body.innerHTML = `<div style="text-align:center;color:#64748b;margin-top:50px;">अभी कोई सामान्य सदस्य मौजूद नहीं है।</div>`;
        return;
      }

      body.innerHTML = members.map((m, i) => `
        <div id="km-card-${i}" style="background:#ffffff;border:1.5px solid #cbd5e1;border-radius:14px;padding:11px;margin-bottom:9px;display:flex;align-items:center;justify-content:space-between;gap:10px;">
          <div style="display:flex;align-items:center;gap:10px;min-width:0;">
            <div style="width:42px;height:42px;border-radius:50%;background:#0f172a;color:#fff;font-weight:800;display:flex;align-items:center;justify-content:center;overflow:hidden;flex-shrink:0;">
              ${m.photo ? `<img src="${m.photo}" style="width:100%;height:100%;object-fit:cover;" />` : m.name.charAt(0)}
            </div>
            <div style="min-width:0;">
              <div style="font-size:14.5px;font-weight:800;color:#0f172a;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${m.name}</div>
              <div style="font-size:11.5px;color:#475569;">📞 ${m.phone} • ${m.status === "approved" ? "✅ स्वीकृत" : "👻 भूत मोड"}</div>
            </div>
          </div>
          <button class="do-kick-btn" data-idx="${i}" style="padding:7px 12px;background:#ef4444;color:#fff;border:none;border-radius:999px;font-size:12px;font-weight:800;cursor:pointer;flex-shrink:0;">
            ❌ हटाएं
          </button>
        </div>
      `).join("");

      body.querySelectorAll(".do-kick-btn").forEach((btn) => {
        btn.onclick = async () => {
          const idx = Number(btn.getAttribute("data-idx"));
          const target = members[idx];
          if (!target) return;

          if (!confirm(`क्या आप वाकई "${target.name}" (${target.phone}) को पार्टी की सदस्यता से हटाना चाहते हैं?`)) return;

          btn.disabled = true;
          btn.textContent = "हट रहा है...";

          await fetch(`${firestoreBase}/ksjp_public_members/${target.phone}?key=${apiKey}`, { method: "DELETE" });
          await fetch(`${firestoreBase}/ksjp_users/${target.phone}?key=${apiKey}`, { method: "DELETE" });
          await fetch(`${firestoreBase}/ksjp_membership_requests/${target.phone}?key=${apiKey}`, { method: "DELETE" });

          document.getElementById(`km-card-${idx}`)?.remove();
          alert(`✅ ${target.name} को सफलतापूर्वक हटा दिया गया है।`);
        };
      });
    } catch (e) {
      body.innerHTML = `<div style="text-align:center;color:#dc2626;margin-top:40px;">सूची लोड करने में समस्या हुई।</div>`;
    }
  }

  // =========================================================================
  // भाग 3: अनिवार्य 10-अंक भारतीय मोबाइल नंबर जाँच (बिना SMS OTP के)
  // =========================================================================
  const enforceCompulsoryValidMobile = () => {
    const phoneInput = document.querySelector('input[type="tel"], input[placeholder*="मोबाइल"], input[placeholder*="नंबर"]');
    if (!phoneInput || phoneInput.dataset.mobileRuleBound === "1") return;
    phoneInput.dataset.mobileRuleBound = "1";
    phoneInput.setAttribute("maxlength", "10");
    phoneInput.setAttribute("required", "true");

    const parentForm = phoneInput.closest("form") || phoneInput.parentElement;
    if (!parentForm) return;

    const hintBox = document.createElement("div");
    hintBox.id = "ksjp-mobile-status-hint";
    hintBox.style.cssText = "font-size: 11.5px; font-weight: 700; margin: 4px 0 6px 2px; color: #0369a1;";
    hintBox.textContent = "📱 10 अंकों का वैध भारतीय मोबाइल नंबर अनिवार्य है";
    phoneInput.insertAdjacentElement("afterend", hintBox);

    phoneInput.addEventListener("input", () => {
      const digits = phoneInput.value.replace(/\D/g, "").slice(0, 10);
      phoneInput.value = digits;
      if (digits.length === 0) {
        hintBox.style.color = "#0369a1";
        hintBox.textContent = "📱 10 अंकों का वैध भारतीय मोबाइल नंबर अनिवार्य है";
      } else if (digits.length < 10) {
        hintBox.style.color = "#b45309";
        hintBox.textContent = `⏳ ${digits.length}/10 अंक दर्ज किए गए हैं...`;
      } else if (isGenuineIndianMobile(digits)) {
        hintBox.style.color = "#16a34a";
        hintBox.textContent = `✅ वैध 10-अंक मोबाइल नंबर (+91 ${digits})`;
      } else {
        hintBox.style.color = "#dc2626";
        hintBox.textContent = "❌ अमान्य या फ़र्ज़ी नंबर!";
      }
    });

    parentForm.querySelectorAll("button").forEach((btn) => {
      if (btn.id === "close-mod" || (btn.id && btn.id.startsWith("btn-"))) return;
      if (btn.dataset.mobileSubmitLock === "1") return;
      btn.dataset.mobileSubmitLock = "1";

      btn.addEventListener("click", (ev) => {
        const currentRaw = phoneInput.value.replace(/\D/g, "");
        if (!currentRaw || !isGenuineIndianMobile(currentRaw)) {
          ev.preventDefault();
          ev.stopImmediatePropagation();
          alert("⚠️ कृपया 10 अंकों का सही और असली भारतीय मोबाइल नंबर दर्ज करें।");
          phoneInput.focus();
        }
      }, true);
    });
  };

  setInterval(() => {
    attachSiteManagerResetPower();
    mountKickButton();
    enforceCompulsoryValidMobile();
  }, 2000);

  attachSiteManagerResetPower();
  mountKickButton();
  enforceCompulsoryValidMobile();
}
