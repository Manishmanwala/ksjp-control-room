// 06-kick-member/kick-member.js
// एडमिन पैनल में सदस्यों और एडमिन सीटों को प्रबंधित करने (हटाने/रीसेट) का सुरक्षित मॉड्यूल

export async function openMembersManager() {
  let projectId = "";
  let apiKey = "";
  try {
    const keyMod = await import("../01-config/firebase-key.js");
    projectId = keyMod?.firebaseConfig?.projectId || "";
    apiKey = keyMod?.firebaseConfig?.apiKey || "";
  } catch (e) {
    console.error("Firebase Key Error:", e);
  }

  const firestoreBase = projectId
    ? `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents`
    : "";

  const getLocalAdmin = () => {
    try { return JSON.parse(localStorage.getItem("KSJP_CURRENT_SEAT_USER")) || null; } catch (e) { return null; }
  };

  const adminUser = getLocalAdmin();

  // सुरक्षा जाँच: यह नियंत्रण केवल मुख्य Site Manager के पास है
  if (!adminUser || adminUser.seatId !== "site-manager") {
    alert("🔒 यह औजार (Tool) केवल मुख्य 'Site Manager' के नियंत्रण में है।");
    return;
  }

  document.getElementById("ksjp-kick-screen")?.remove();
  const screen = document.createElement("div");
  screen.id = "ksjp-kick-screen";
  screen.style.cssText = "position:fixed;inset:0;width:100vw;height:100dvh;background:#f1f5f9;display:flex;flex-direction:column;z-index:10006;";

  screen.innerHTML = `
    <header style="height:56px;background:#dc2626;color:#fff;padding:0 14px;display:flex;align-items:center;gap:10px;flex-shrink:0;">
      <button id="km-back-btn" style="background:rgba(255,255,255,0.2);border:none;color:#fff;padding:6px 12px;border-radius:999px;font-weight:800;cursor:pointer;">← वापस</button>
      <div style="font-size:15.5px;font-weight:800;">औजार कक्ष: सदस्य व एडमिन नियंत्रण</div>
    </header>
    <main id="km-list-body" style="flex:1;overflow-y:auto;padding:12px;">
      <div style="text-align:center;color:#64748b;margin-top:40px;">नियंत्रण डेटा लोड हो रहा है...</div>
    </main>
  `;

  document.body.appendChild(screen);
  document.getElementById("km-back-btn").onclick = () => screen.remove();

  const body = document.getElementById("km-list-body");
  if (!firestoreBase) {
    body.innerHTML = `<div style="text-align:center;color:#dc2626;margin-top:40px;font-weight:700;">⚠️ त्रुटि: फ़ायरबेस कॉन्फ़िगरेशन या प्रोजेक्ट आईडी नहीं मिला!</div>`;
    return;
  }

  try {
    const res = await fetch(`${firestoreBase}/ksjp_users?pageSize=200&key=${apiKey}`);
    if (!res.ok) {
      throw new Error(`Firestore Fetch Failed: HTTP ${res.status}`);
    }
    const data = await res.json();
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

    let adminSeatsList = [];
    for (let i = 1; i <= 5; i++) {
      const seatKey = `admin-${i}`;
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

        if (target.id === "site-manager") {
          alert("🛡️ सुरक्षा नियम: मुख्य 'Site Manager' पद पूरी तरह सुरक्षित है, इसे हटाया नहीं जा सकता!");
          return;
        }

        if (!confirm(`क्या आप वाकई "${target.name}" को हटाना चाहते हैं?`)) return;

        btn.disabled = true;
        btn.textContent = "हट रहा है...";

        try {
          if (target.type === "admin-seat") {
            const delRes = await fetch(`${firestoreBase}/ksjp_members/${target.id}?key=${apiKey}`, { method: "DELETE" });
            if (!delRes.ok) throw new Error("Admin seat delete failed");
          } else {
            await fetch(`${firestoreBase}/ksjp_public_members/${target.phone}?key=${apiKey}`, { method: "DELETE" });
            await fetch(`${firestoreBase}/ksjp_users/${target.phone}?key=${apiKey}`, { method: "DELETE" });
            await fetch(`${firestoreBase}/ksjp_membership_requests/${target.phone}?key=${apiKey}`, { method: "DELETE" });
          }

          document.getElementById(`km-card-${idx}`)?.remove();
          alert(`✅ "${target.name}" को सफलतापूर्वक हटा दिया गया है।`);
        } catch (err) {
          alert(`❌ हटाने में विफल (Error): ${err.message}`);
          btn.disabled = false;
          btn.textContent = "पुनः प्रयास करें";
        }
      };
    });
  } catch (e) {
    body.innerHTML = `
      <div style="background:#ffeeee;border:2px solid #dc2626;padding:14px;border-radius:12px;color:#dc2626;margin-top:20px;font-weight:700;font-size:13.5px;line-height:1.4;">
        ⚠️ स्क्रिप्ट निष्पादन या डेटा लोड करने में त्रुटि (Error) आई है:<br>
        <code style="display:block;margin-top:6px;background:#fff;padding:8px;border-radius:6px;color:#991b1b;font-size:12px;">${e.message || e}</code>
      </div>
    `;
  }
}

export function initKickMemberTool() {
  const adminUser = (() => {
    try {
      return JSON.parse(localStorage.getItem("KSJP_CURRENT_SEAT_USER"));
    } catch {
      return null;
    }
  })();

  if (adminUser?.seatId !== "site-manager") return;

  const headerActions = document.querySelector(".header-actions");
  if (!headerActions || document.getElementById("btn-kick-member")) return;

  const btn = document.createElement("button");
  btn.id = "btn-kick-member";
  btn.type = "button";
  btn.textContent = "सदस्य प्रबंधन";
  btn.title = "सदस्य और एडमिन प्रबंधन";
  btn.style.cssText =
    "height:34px;padding:0 10px;border-radius:999px;background:#dc2626;color:#fff;border:1.5px solid #fff;font-weight:800;cursor:pointer;";

  btn.addEventListener("click", () => openMembersManager());
  headerActions.insertBefore(btn, headerActions.firstChild);
}
}
