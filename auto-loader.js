// auto-loader.js - क्रमानुसार ऑटो-स्कैनर और डायग्नोस्टिक डैशबोर्ड इंजन

const MODULE_LIST = [
  { id: "01-config", path: "./01-config/config.js", name: "Config & Keys" },
  { id: "02-start-page", path: "./02-start-page/start.js", name: "Start Page" },
  { id: "03-page-panel", path: "./03-page-panel/panel.js", name: "Page Panel" },
  { id: "04-execution", path: "./04-execution/exec.js", name: "Execution Engine" },
  { id: "05-new-members", path: "./05-new-members/members.js", name: "New Members" },
  { id: "06-kick-member", path: "./06-kick-member/kick-member.js", name: "Kick Member" },
  { id: "07-security", path: "./07-security/e2e-shield.js", name: "E2E Security Shield" },
  { id: "08-voice-bridge", path: "./08-voice-bridge/voice-system.js", name: "Voice Bridge" },
  { id: "09-reset-tool", path: "./09-reset-tool/reset-master.js", name: "Reset Master Tool" }
];

// डायग्नोस्टिक स्टेटस रिकॉर्ड
window.KSJP_Diagnostics = {
  success: [],
  failed: [],
  pending: [...MODULE_LIST] // शुरुआत में सभी पेंडिंग हैं
};

// ऑटो-लोडर फंक्शन जो एक-एक करके मॉड्यूल्स को रन करेगा
async function runAutoLoader() {
  console.log("🚀 KSJP Auto-Loader शुरू हो रहा है...");

  for (let i = 0; i < MODULE_LIST.length; i++) {
    let mod = MODULE_LIST[i];
    
    // पेंडिंग से हटाकर करंट प्रोसेस में डालना
    window.KSJP_Diagnostics.pending = window.KSJP_Diagnostics.pending.filter(m => m.id !== mod.id);

    try {
      // डायनेमिक इम्पोर्ट के जरिए फोल्डर की फाइल लोड करना
      await import(mod.path);
      
      // सफलतापूर्वक रन हुआ
      window.KSJP_Diagnostics.success.push({
        ...mod,
        time: new Date().toLocaleTimeString()
      });
      console.log(`✅ [सफल]: ${mod.name} (${mod.id})`);

    } catch (err) {
      // रन होने में फेल हुआ
      window.KSJP_Diagnostics.failed.push({
        ...mod,
        error: err.message || "Unknown Error",
        time: new Date().toLocaleTimeString()
      });
      console.error(`❌ [फेल]: ${mod.name} - एरर:`, err);
    }
  }

  // लोडिंग पूरी होने पर डैशबोर्ड UI अपडेट करना
  updateDiagnosticDashboardUI();
}

// एडमिन पैनल पर 'Website Running Status' दिखाने का UI जेनरेटर
function updateDiagnosticDashboardUI() {
  let dashboardContainer = document.getElementById("ksjp-running-status-panel");
  if (!dashboardContainer) return;

  const { success, failed, pending } = window.KSJP_Diagnostics;

  dashboardContainer.innerHTML = `
    <div style="font-family: monospace; background: #0f172a; color: #f8fafc; padding: 15px; border-radius: 8px;">
      <h2>📊 Website Running Status (Live Health)</h2>
      
      <!-- 1. ग्रीन जोन: सफलतापूर्वक रन हुए -->
      <div style="margin-bottom: 15px; border-left: 4px solid #22c55e; padding-left: 10px;">
        <h3 style="color: #22c55e; margin: 0;">🟢 सफलतापूर्वक रन हुए (${success.length})</h3>
        <ul>
          ${success.map(m => `<li>${m.id}: ${m.name} <span style="font-size:11px; color:#94a3b8;">(${m.time})</span></li>`).join('')}
        </ul>
      </div>

      <!-- 2. रेड जोन: फेल हुए मॉड्यूल -->
      <div style="margin-bottom: 15px; border-left: 4px solid #ef4444; padding-left: 10px;">
        <h3 style="color: #ef4444; margin: 0;">🔴 रन होने में फेल हुए (${failed.length})</h3>
        <ul>
          ${failed.length > 0 ? failed.map(m => `<li style="color:#fca5a5;">${m.id}: ${m.name} - <b>[एरर: ${m.error}]</b></li>`).join('') : '<li style="color:#94a3b8;">कोई एरर नहीं (सब ठीक है)</li>'}
        </ul>
      </div>

      <!-- 3. येलो/ग्रे जोन: पेंडिंग -->
      <div style="border-left: 4px solid #eab308; padding-left: 10px;">
        <h3 style="color: #eab308; margin: 0;">🟡 प्रतीक्षारत / पेंडिंग (${pending.length})</h3>
        <ul>
          ${pending.map(m => `<li>${m.id}: ${m.name}</li>`).join('')}
        </ul>
      </div>
    </div>
  `;
}

// ऑटोमैटिक ट्रिगर
window.addEventListener("DOMContentLoaded", () => {
  runAutoLoader();
});
