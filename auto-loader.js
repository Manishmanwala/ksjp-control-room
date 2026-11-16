// auto-loader.js — KSJP ऐप का ऑटो-स्कैनर, डैशबोर्ड और स्टार्टअप इंजन

// 1. सभी मॉड्यूल्स की क्रमानुसार सूची (यहाँ से तू नए मॉड्यूल जोड़ या हटा सकता है)
const MODULE_LIST = [
  { id: "01-config", path: "./01-config/firebase-key.js", name: "Config & Keys" },
  { id: "02-start-page", path: "./02-start-page/execution/start.js", name: "Start Page" },
  { id: "03-page-panel", path: "./03-page-panel/execution/panel-logic.js", name: "Page Panel" },
  { id: "04-execution", path: "./04-execution/actions.js", name: "Execution Engine" },
  { id: "05-new-members", path: "./05-new-members/new-members.js", name: "New Members" },
  { id: "06-kick-member", path: "./06-kick-member/kick-member.js", name: "Kick Member" },
  { id: "07-security", path: "./07-security/e2e-shield.js", name: "E2E Security Shield" },
  { id: "08-voice-bridge", path: "./08-voice-bridge/voice-system.js", name: "Voice Bridge" },
  { id: "09-reset-tool", path: "./09-reset-tool/reset-master.js", name: "Reset Master Tool" },
  { id: "10-admin-profile", path: "./10-admin-profile/admin-profile.js", name: "Admin Profile" },
];

// डायग्नोस्टिक स्टेटस रिकॉर्ड
window.KSJP_Diagnostics = {
  success: [],
  failed: [],
  pending: [...MODULE_LIST]
};

// 2. ऑटो-लोडर जो एक-एक करके सभी फाइलों को स्कैन करेगा और डैशबोर्ड अपडेट करेगा
async function runAutoLoader() {
  console.log("🚀 KSJP Auto-Loader शुरू हो रहा है...");

  for (let i = 0; i < MODULE_LIST.length; i++) {
    let mod = MODULE_LIST[i];
    
    window.KSJP_Diagnostics.pending = window.KSJP_Diagnostics.pending.filter(m => m.id !== mod.id);

    try {
      await import(mod.path);
      
      window.KSJP_Diagnostics.success.push({
        ...mod,
        time: new Date().toLocaleTimeString()
      });
      console.log(`✅ [सफल]: ${mod.name} (${mod.id})`);

    } catch (err) {
      window.KSJP_Diagnostics.failed.push({
        ...mod,
        error: err.message || "Unknown Error",
        time: new Date().toLocaleTimeString()
      });
      console.error(`❌ [फेल]: ${mod.name} - एरर:`, err);
    }
  }

  // डैशबोर्ड UI अपडेट करें
  updateDiagnosticDashboardUI();
  
  // लोडिंग पूरी होने के बाद ऐप/पैनल को बूट करें
  startAdminApp();
}

// 3. एडमिन पैनल और बूट स्क्रीन को शुरू करने वाला मास्टर फंक्शन
async function startAdminApp() {
  const start = async () => {
    try {
      const { runStartPage } = await import("./02-start-page/execution/start.js");
      const { showAdminPanel } = await import("./03-page-panel/execution/panel-logic.js");

      runStartPage(async () => {
        try {
          await showAdminPanel();

          const { initNewMembersApproval } = await import("./05-new-members/new-members.js");
          if (initNewMembersApproval) {
            await initNewMembersApproval();
          }
        } catch (innerErr) {
          console.error("पैनल के अंदरूनी मॉड्यूल्स में एरर:", innerErr);
        }
      });
    } catch (error) {
      console.error("KSJP शुरू नहीं हो सका:", error);
      const status = document.getElementById("status");
      if (status) {
        status.textContent = "❌ पैनल शुरू नहीं हो सका। पेज रीलोड करें और Console error देखें।";
      }
    }
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start, { once: true });
  } else {
    start();
  }
}

// 4. वेबसाइट के अंदर लाइव हेल्थ स्टेटस दिखाने का UI जेनरेटर
function updateDiagnosticDashboardUI() {
  let dashboardContainer = document.getElementById("ksjp-running-status-panel");
  if (!dashboardContainer) return;

  const { success, failed, pending } = window.KSJP_Diagnostics;

  dashboardContainer.innerHTML = `
    <div style="font-family: monospace; background: #0f172a; color: #f8fafc; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
      <h2>📊 Website Running Status (Live Health)</h2>
      
      <div style="margin-bottom: 15px; border-left: 4px solid #22c55e; padding-left: 10px;">
        <h3 style="color: #22c55e; margin: 0;">🟢 सफलतापूर्वक रन हुए (${success.length})</h3>
        <ul>
          ${success.map(m => `<li>${m.id}: ${m.name} <span style="font-size:11px; color:#94a3b8;">(${m.time})</span></li>`).join('')}
        </ul>
      </div>

      <div style="margin-bottom: 15px; border-left: 4px solid #ef4444; padding-left: 10px;">
        <h3 style="color: #ef4444; margin: 0;">🔴 रन होने में फेल हुए (${failed.length})</h3>
        <ul>
          ${failed.length > 0 ? failed.map(m => `<li style="color:#fca5a5;">${m.id}: ${m.name} - <b>[एरर: ${m.error}]</b></li>`).join('') : '<li style="color:#94a3b8;">कोई एरर नहीं (सब ठीक है)</li>'}
        </ul>
      </div>

      <div style="border-left: 4px solid #eab308; padding-left: 10px;">
        <h3 style="color: #eab308; margin: 0;">🟡 प्रतीक्षारत / पेंडिंग (${pending.length})</h3>
        <ul>
          ${pending.map(m => `<li>${m.id}: ${m.name}</li>`).join('')}
        </ul>
      </div>
    </div>
  `;
}

// ऑटोमैटिक ट्रिगर (जैसे ही पेज लोड हो, ऑटो-लोडर दौड़ पड़े)
window.addEventListener("DOMContentLoaded", () => {
  runAutoLoader();
});
