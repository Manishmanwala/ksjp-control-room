// 08-reset-tool/reset-master.js
// ऑटो-वन-टाइम रिसेट + प्रोफाइल मेनू में मास्टर हार्ड रीसेट बटन

export async function initMasterResetTool() {
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

  if (!firestoreBase) return;

  const RESET_FLAG_KEY = "KSJP_AUTO_RESET_DONE_V1";

  // फंक्शन: डेटाबेस को पूरी तरह साफ़ करने वाला कोर लॉजिक
  async function executeHardReset(btnElement = null) {
    const confirmCode = prompt("⚠️ चेतावनी:\nयह बटन दबाते ही साइट मैनेजर सहित सभी एडमिन और सदस्यों के पद हमेशा के लिए डिलीट हो जाएंगे और सबको दोबारा जुड़ना पड़ेगा।\n\nपुष्टि करने के लिए 'RESET' लिखें:");
    if (confirmCode !== "RESET") {
      alert("रीसेट रद्द कर दिया गया।");
      return false;
    }

    if (btnElement) {
      btnElement.disabled = true;
      btnElement.textContent = "सफ़ाई हो रही है...";
    }

    try {
      const seats = ["site-manager", "admin-1", "admin-2", "admin-3", "admin-4", "admin-5"];
      for (const seat of seats) {
        await fetch(`${firestoreBase}/ksjp_members/${seat}?key=${apiKey}`, {
          method: "DELETE"
        });
      }

      localStorage.removeItem("KSJP_CURRENT_SEAT_USER");
      localStorage.removeItem("KSJP_SEEN_NOTICE_COUNT");
      localStorage.removeItem(RESET_FLAG_KEY); // फ्लैग साफ़ ताकि अगली बार फिर कंट्रोल रहे

      alert("✅ हार्ड रीसेट सफल रहा! नियंत्रण कक्ष खाली कर दिया गया है। अब पेज रीलोड होगा।");
      location.reload();
      return true;
    } catch (err) {
      alert("त्रुटि: रीसेट करने में समस्या आई।");
      if (btnElement) {
        btnElement.disabled = false;
        btnElement.textContent = "⚠️ मास्टर हार्ड रीसेट";
      }
      return false;
    }
  }

  // 1. ऑटो-रन: यह सिर्फ एक बार चलेगा और उसके बाद जिंदगी में कभी दोबारा अपने आप नहीं चलेगा
  const alreadyDone = localStorage.getItem(RESET_FLAG_KEY);
  if (!alreadyDone) {
    try {
      const seats = ["site-manager", "admin-1", "admin-2", "admin-3", "admin-4", "admin-5"];
      for (const seat of seats) {
        await fetch(`${firestoreBase}/ksjp_members/${seat}?key=${apiKey}`, {
          method: "DELETE"
        });
      }
      localStorage.removeItem("KSJP_CURRENT_SEAT_USER");
      localStorage.setItem(RESET_FLAG_KEY, "true"); // फ्लैग सेट ताकि दोबारा ऑटो-रन न हो
      console.log("KSJP: One-time auto reset executed successfully.");
    } catch (e) {}
  }

  // 2. प्रोफाइल बटन (P) पर क्लिक करने पर दिखने वाला हार्ड रीसेट ऑप्शन जोड़ना
  const attachProfileResetListener = () => {
    const profileBtn = document.getElementById("btn-profile");
    if (!profileBtn || profileBtn.dataset.resetListenerBound === "1") return;
    profileBtn.dataset.resetListenerBound = "1";

    // जब भी कोई ऊपर वाले प्रोफाइल बटन पर क्लिक करेगा, हम एक छोटा सा एक्शन बॉक्स दिखा देंगे
    const originalClickHandler = profileBtn.onclick;
    
    profileBtn.addEventListener("click", (e) => {
      // थोड़ा समय देकर मॉडल या मेनू खुलने के बाद उसमें रीसेट बटन जोड़ना
      setTimeout(() => {
        const modal = document.getElementById("ksjp-modal");
        if (modal && !document.getElementById("profile-hard-reset-btn")) {
          const resetContainer = document.createElement("div");
          resetContainer.style.cssText = "margin-top: 14px; padding-top: 10px; border-top: 1.5px dashed #ef4444;";
          
          const hrBtn = document.createElement("button");
          hrBtn.id = "profile-hard-reset-btn";
          hrBtn.type = "button";
          hrBtn.textContent = "⚠️ मास्टर हार्ड रीसेट (सभी को हटाएं)";
          hrBtn.style.cssText = "width: 100%; padding: 9px; background: #fee2e2; color: #dc2626; border: 1.5px solid #ef4444; border-radius: 999px; font-size: 12px; font-weight: 800; cursor: pointer;";
          
          hrBtn.onclick = async () => {
            await executeHardReset(hrBtn);
          };

          resetContainer.appendChild(hrBtn);
          modal.querySelector("div")?.appendChild(resetContainer);
        }
      }, 200);
    }, true);
  };

  setInterval(attachProfileResetListener, 1000);
  attachProfileResetListener();
}
