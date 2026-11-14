// 05-new-members/new-members.js
// एडमिन पैनल में 'नए सदस्य' बटन, लाल नोटिफिकेशन बिंदी और केवल एडमिन द्वारा स्वीकृति

export async function initNewMembersApproval() {
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

  // एडमिन पैनल के हेडर में 'नए सदस्य' बटन और लाल बिंदी जोड़ना
  function mountNewMembersButton() {
    const headerActions = document.querySelector(".header-actions");
    if (!headerActions || document.getElementById("btn-new-members-req")) return;

    const btn = document.createElement("div");
    btn.id = "btn-new-members-req";
    btn.title = "नए सदस्य अनुरोध";
    btn.style.cssText = "position:relative;padding:0 10px;height:34px;border-radius:999px;background:#ffd600;color:#0f172a;border:1.5px solid #ffffff;display:flex;align-items:center;justify-content:center;font-size:11.5px;font-weight:900;cursor:pointer;box-shadow:0 2px 6px rgba(0,0,0,0.3);user-select:none;";
    btn.innerHTML = `
      <span>नए सदस्य</span>
      <span id="new-member-red-dot" style="display:none;position:absolute;top:-3px;right:-3px;width:11px;height:11px;border-radius:50%;background:#ff1e1e;border:2px solid #ffffff;"></span>
    `;

    headerActions.insertBefore(btn, headerActions.firstChild);
    btn.onclick = openRequestsDrawer;
  }

  let pendingList = [];

  // डेटाबेस से नए सदस्यों के अनुरोध लाना और लाल बिंदी अपडेट करना
  async function fetchPendingRequests() {
    if (!firestoreBase) return;
    try {
      const res = await fetch(`${firestoreBase}/ksjp_membership_requests?pageSize=200&key=${apiKey}`);
      if (!res.ok) return;
      const data = await res.json();
      pendingList = (data.documents || []).map((doc) => {
        const id = doc.name.split("/").pop();
        const f = doc.fields || {};
        return {
          id,
          name: f.name?.stringValue || "नया सदस्य",
          phone: f.phone?.stringValue || id,
          email: f.email?.stringValue || "",
          address: f.address?.stringValue || "",
          reason: f.reason?.stringValue || "",
          note: f.note?.stringValue || "",
          photo: f.photo?.stringValue || "",
          status: f.status?.stringValue || "pending",
          requestedAt: f.requestedAt?.stringValue || ""
        };
      }).filter((r) => r.status === "pending");

      const dot = document.getElementById("new-member-red-dot");
      if (dot) {
        dot.style.display = pendingList.length > 0 ? "block" : "none";
      }
    } catch (e) {}
  }

  // नए सदस्यों की सूची खोलना और स्वीकृति देना
  async function openRequestsDrawer() {
    const adminUser = getLocalAdmin();
    const validAdminSeats = ["site-manager", "admin-1", "admin-2", "admin-3", "admin-4", "admin-5"];

    if (!adminUser || !validAdminSeats.includes(adminUser.seatId)) {
      alert("🔒 केवल पंजीकृत Site Manager या Admin ही नए सदस्यों को स्वीकृति दे सकते हैं।");
      return;
    }

    await fetchPendingRequests();
    document.getElementById("ksjp-new-members-screen")?.remove();

    const screen = document.createElement("div");
    screen.id = "ksjp-new-members-screen";
    screen.style.cssText = "position:fixed;inset:0;width:100vw;height:100dvh;background:#f1f5f9;display:flex;flex-direction:column;z-index:10005;";

    screen.innerHTML = `
      <header style="height:56px;background:#0057ff;color:#fff;padding:0 14px;display:flex;align-items:center;justify-content:space-between;flex-shrink:0;">
        <div style="display:flex;align-items:center;gap:10px;">
          <button id="nm-back-btn" style="background:rgba(255,255,255,0.2);border:none;color:#fff;padding:6px 12px;border-radius:999px;font-weight:800;cursor:pointer;">← वापस</button>
          <div style="font-size:15.5px;font-weight:800;">नए सदस्य अनुरोध (${pendingList.length})</div>
        </div>
      </header>
      <main id="nm-list-body" style="flex:1;overflow-y:auto;padding:12px;"></main>
    `;

    document.body.appendChild(screen);
    document.getElementById("nm-back-btn").onclick = () => screen.remove();

    const body = document.getElementById("nm-list-body");
    if (pendingList.length === 0) {
      body.innerHTML = `<div style="text-align:center;color:#64748b;margin-top:50px;font-size:14px;">अभी किसी नए सदस्य का अनुरोध लंबित नहीं है।</div>`;
      return;
    }

    body.innerHTML = pendingList.map((u, i) => `
      <div id="req-card-${i}" style="background:#ffffff;border:1.5px solid #cbd5e1;border-radius:16px;padding:12px;margin-bottom:10px;box-shadow:0 2px 6px rgba(0,0,0,0.05);">
        <div style="display:flex;align-items:center;gap:10px;margin-bottom:8px;">
          <div style="width:48px;height:48px;border-radius:50%;background:#0057ff;color:#fff;font-weight:800;display:flex;align-items:center;justify-content:center;overflow:hidden;flex-shrink:0;">
            ${u.photo ? `<img src="${u.photo}" style="width:100%;height:100%;object-fit:cover;" />` : u.name.charAt(0)}
          </div>
          <div>
            <div style="font-size:15.5px;font-weight:800;color:#0f172a;">${u.name}</div>
            <div style="font-size:12px;font-weight:700;color:#0057ff;">📞 ${u.phone} • ✅ ${u.email}</div>
            <div style="font-size:11px;color:#64748b;">समय: ${u.requestedAt}</div>
          </div>
        </div>
        <div style="font-size:12.5px;color:#334155;background:#f8fafc;padding:8px;border-radius:10px;margin-bottom:8px;">
          <div><b>पता:</b> ${u.address}</div>
          <div style="margin-top:3px;"><b>कारण:</b> ${u.reason}</div>
          ${u.note ? `<div style="margin-top:3px;"><b>पर्ची:</b> ${u.note}</div>` : ""}
        </div>
        <button class="approve-nm-btn" data-idx="${i}" style="width:100%;padding:10px;background:#00c853;color:#ffffff;border:none;border-radius:999px;font-size:13.5px;font-weight:800;cursor:pointer;">
          ✅ सदस्यता स्वीकृत करें (भूत मोड हटाएं)
        </button>
      </div>
    `).join("");

    body.querySelectorAll(".approve-nm-btn").forEach((btn) => {
      btn.onclick = async () => {
        const idx = Number(btn.getAttribute("data-idx"));
        const target = pendingList[idx];
        if (!target) return;

        btn.disabled = true;
        btn.textContent = "स्वीकृति दी जा रही है...";

        // 1. ksjp_users में status को 'approved' और role को 'general_member' करना (एडमिन पद के अयोग्य)
        await fetch(`${firestoreBase}/ksjp_users/${target.phone}?updateMask.fieldPaths=membershipStatus&updateMask.fieldPaths=approved&updateMask.fieldPaths=role&updateMask.fieldPaths=approvedBy&key=${apiKey}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            fields: {
              membershipStatus: { stringValue: "approved" },
              approved: { booleanValue: true },
              role: { stringValue: "general_member" },
              approvedBy: { stringValue: adminUser.seatId }
            }
          })
        });

        // 2. रिक्वेस्ट कतार में status को 'approved' करना ताकि लाल बिंदी हट जाए
        await fetch(`${firestoreBase}/ksjp_membership_requests/${target.phone}?updateMask.fieldPaths=status&key=${apiKey}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            fields: {
              status: { stringValue: "approved" }
            }
          })
        });

        document.getElementById(`req-card-${idx}`)?.remove();
        await fetchPendingRequests();
        alert(`✅ ${target.name} को सामान्य सदस्यता दे दी गई है। अब उनका भूत मोड हट गया है (वे एडमिन पद के लिए अयोग्य रहेंगे)।`);
      };
    });
  }

  mountNewMembersButton();
  await fetchPendingRequests();
  setInterval(() => {
    mountNewMembersButton();
    fetchPendingRequests();
  }, 4000);
}