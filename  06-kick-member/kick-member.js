// 06-kick-member/kick-member.js
// एडमिन पैनल में सदस्यों और एडमिन सीटों को प्रबंधित करने (हटाने/रीसेट) का मॉड्यूल

export async function initKickMemberTool() {
  let projectId = "";
  let apiKey = "";
  try {
    const keyMod = await import("../01-config/firebase-key.js");
    projectId = keyMod?.firebaseConfig?.projectId || "";
    apiKey = keyMod?.firebaseConfig?.apiKey || "";
  } catch (e) {}

  const firestoreBase = projectId
    ? `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents`
    : "";

  const getLocalAdmin = () => {
    try { return JSON.parse(localStorage.getItem("KSJP_CURRENT_SEAT_USER")) || null; } catch (e) { return null; }
  };

  function mountKickButton() {
    if (document.getElementById("btn-kick-members-panel")) return;

    const btn = document.createElement("button");
    btn.id = "btn-kick-members-panel";
    btn.title = "सदस्य व एडमिन प्रबंधन / हटाएं";
    btn.style.cssText = "position:fixed;bottom:20px;right:20px;z-index:9999;padding:10px 16px;border-radius:999px;background:#dc2626;color:#ffffff;border:2px solid #ffffff;display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:900;cursor:pointer;box-shadow:0 4px 12px rgba(220,38,38,0.4);user-select:none;";
    btn.innerHTML = "🗑️ सदस्य व एडमिन प्रबंधन";

    document.body.appendChild(btn);
    btn.onclick = openMembersManager;
  }

  async function openMembersManager() {
    const adminUser = getLocalAdmin();
    const validAdminSeats = ["site-manager", "admin-1", "admin-2", "admin-3", "admin-4", "admin-5"];

    if (!adminUser || !validAdminSeats.includes(adminUser.seatId)) {
      alert("🔒 केवल अधिकृत एडमिन या Site Manager ही सदस्यों को प्रबंधित कर सकते हैं।");
      return;
    }

    document.getElementById("ksjp-kick-screen")?.remove();
    const screen = document.createElement("div");
    screen.id = "ksjp-kick-screen";
    screen.style.cssText = "position:fixed;inset:0;width:100vw;height:100dvh;background:#f1f5f9;display:flex;flex-direction:column;z-index:10006;";

    screen.innerHTML = `
      <header style="height:56px;background:#dc2626;color:#fff;padding:0 14px;display:flex;align-items:center;gap:10px;flex-shrink:0;">
        <button id="km-back-btn" style="background:rgba(255,255,255,0.2);border:none;color:#fff;padding:6px 12px;border-radius:999px;font-weight:800;cursor:pointer;">← वापस</button>
        <div style="font-size:15.5px;font-weight:800;">सदस्य व एडमिन नियंत्रण कक्ष</div>
      </header>
      <main id="km-list-body" style="flex:1;overflow-y:auto;padding:12px;">
        <div style="text-align:center;color:#64748b;margin-top:40px;">डेटा लोड हो रहा है...</div>
      </main>
    `;

    document.body.appendChild(screen);
    document.getElementById("km-back-btn").onclick = () => screen.remove();

    const body = document.getElementById("km-list-body");
    if (!firestoreBase) {
      body.innerHTML = `<div style="text-align:center;color:#dc2626;margin-top:40px;">फ़ायरबेस कॉन्फ़िगरेशन नहीं मिला।</div>`;
      return;
    }

    try {
      // 1. सामान्य सदस्य लोड करना
      const res = await fetch(`${firestoreBase}/ksjp_users?pageSize=200&key=${apiKey}`);
      const data = res.ok ? await res.json() : { documents: [] };
      const members = (data.documents || []).map((doc) => {
        const id = doc.name.split("/").pop();
        const f = doc.fields || {};
        return {
          id,
          type: "user",
          name: f.name?.stringValue || "सदस्य",
          phone: f.phone?.stringValue || id,
          address: f.address?.stringValue || f.village?.stringValue || "",
          photo: f.photo?.stringValue || "",
          status: f.membershipStatus?.stringValue || "ghost"
        };
      });

      // 2. सभी एडमिन सीटों (admin-1 से admin-5 और site-manager) को सूची में जोड़ना ताकि कोई भी एडमिन किसी भी सीट को मैनेज कर सके
      let adminSeatsList = [];
      for (let i = 1; i <= 5; i++) {
        const seatKey = `admin-${i}`;
        // खुद की सीट को हटाने से बचाने के लिए या मैनेज करने के लिए यहाँ सभी दिखेंगे
        try {
          const seatRes = await fetch(`${firestoreBase}/ksjp_members/${seatKey}?key=${apiKey}`);
          if (seatRes.ok) {
            const seatJson = await seatRes.json();
            const f = seatJson.fields || {};
            adminSeatsList.push({
              id: seatKey,
              type: "admin-seat",
              name: f.name?.stringValue || `Admin ${i}`,
              phone: f.phone?.stringValue || seatKey,
              address: `पद: एडमिन ${i} (हटाने योग्य)`,
              photo: "",
              status: "approved"
            });
          }
        } catch (e) {}
      }

      // Site Manager को भी सूची में जोड़ना (ताकि अगर जरूरत हो तो दिखे)
      try {
        const smRes = await fetch(`${firestoreBase}/ksjp_members/site-manager?key=${apiKey}`);
        if (smRes.ok) {
          const smJson = await smRes.json();
          const f = smJson.fields || {};
          adminSeatsList.push({
            id: "site-manager",
            type: "admin-seat",
            name: f.name?.stringValue || "Site Manager",
            phone: f.phone?.stringValue || "site-manager",
            address: "पद: मुख्य संचालक (सुरक्षित)",
            photo: "",
            status: "approved"
          });
        }
      } catch (e) {}

      const allItems = [...adminSeatsList, ...members];

      if (allItems.length === 0) {
        body.innerHTML = `<div style="text-align:center;color:#64748b;margin-top:50px;">कोई सदस्य या एडमिन मौजूद नहीं है।</div>`;
        return;
      }

      body.innerHTML = allItems.map((m, i) => `
        <div id="km-card-${i}" style="background:#ffffff;border:1.5px solid ${m.type === 'admin-seat' ? '#dc2626' : '#cbd5e1'};border-radius:14px;padding:11px;margin-bottom:9px;display:flex;align-items:center;justify-content:space-between;gap:10px;">
          <div style="display:flex;align-items:center;gap:10px;min-width:0;">
            <div style="width:42px;height:42px;border-radius:50%;background:${m.type === 'admin-seat' ? '#dc2626' : '#0f172a'};color:#fff;font-weight:800;display:flex;align-items:center;justify-content:center;overflow:hidden;flex-shrink:0;">
              ${m.photo ? `<img src="${m.photo}" style="width:100%;height:100%;object-fit:cover;" />` : m.name.charAt(0)}
            </div>
            <div style="min-width:0;">
              <div style="font-size:14.5px;font-weight:800;color:#0f172a;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${m.name} ${m.type === 'admin-seat' ? '👑 (एडमिन सीट)' : ''}</div>
              <div style="font-size:11.5px;color:#475569;">📞 ${m.phone} • ${m.address || (m.status === "approved" ? "✅ स्वीकृत" : "👻 भूत मोड")}</div>
            </div>
          </div>
          <button class="do-kick-btn" data-idx="${i}" style="padding:7px 12px;background:#ef4444;color:#fff;border:none;border-radius:999px;font-size:12px;font-weight:800;cursor:pointer;flex-shrink:0;">
            ${m.type === 'admin-seat' ? '🔓 एडमिन पद हटाएं' : '❌ हटाएं'}
          </button>
        </div>
      `).join("");

      body.querySelectorAll(".do-kick-btn").forEach((btn) => {
        btn.onclick = async () => {
          const idx = Number(btn.getAttribute("data-idx"));
          const target = allItems[idx];
          if (!target) return;

          // केवल मुख्य 'Site Manager' सीट को ही सुरक्षा के लिए डिलीट होने से रोकेंगे, बाकी किसी भी एडमिन या खुद को हटाया जा सकता है[span_2](start_span)[span_2](end_span)
          if (target.id === "site-manager") {
            alert("🛡️ सुरक्षा नियम: मुख्य 'Site Manager' पद सुरक्षित है, इसे हटाया नहीं जा सकता!");
            return;
          }

          if (!confirm(`क्या आप वाकई "${target.name}" (${target.id === 'admin-seat' ? 'एडमिन पद' : target.phone}) को हटाना चाहते हैं?`)) return;

          btn.disabled = true;
          btn.textContent = "हट रहा है...";

          if (target.type === "admin-seat") {
            // एडमिन सीट को फायरबेस से डिलीट करना
            await fetch(`${firestoreBase}/ksjp_members/${target.id}?key=${apiKey}`, { method: "DELETE" });
          } else {
            // सामान्य सदस्य को सभी जगहों से हटाना
            await fetch(`${firestoreBase}/ksjp_public_members/${target.phone}?key=${apiKey}`, { method: "DELETE" });
            await fetch(`${firestoreBase}/ksjp_users/${target.phone}?key=${apiKey}`, { method: "DELETE" });
            await fetch(`${firestoreBase}/ksjp_membership_requests/${target.phone}?key=${apiKey}`, { method: "DELETE" });
          }

          document.getElementById(`km-card-${idx}`)?.remove();
          alert(`✅ "${target.name}" को सफलतापूर्वक हटा दिया गया है।`);
        };
      });
    } catch (e) {
      body.innerHTML = `<div style="text-align:center;color:#dc2626;margin-top:40px;">सूची लोड करने में समस्या हुई।</div>`;
    }
  }

  mountKickButton();
  setInterval(mountKickButton, 3000);
}