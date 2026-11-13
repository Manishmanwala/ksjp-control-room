import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { firebaseConfig } from "../../01-config/firebase-key.js";

export function runStartPage(onComplete) {
  const screenEl = document.getElementById("boot-screen");
  const badgeEl = document.getElementById("boot-badge");
  const titleEl = document.getElementById("boot-title");
  const subEl = document.getElementById("boot-sub");
  const statusEl = document.getElementById("status");
  const trackEl = document.getElementById("progress-track");
  const fillEl = document.getElementById("progress-fill");

  // पहले पेज की सारी जानकारी यहाँ से खाली ढाँचे में भरी जा रही है
  badgeEl.textContent = "🔒 गुप्त एडमिन सर्वर";
  titleEl.textContent = "केवट समाज जनशक्ति पार्टी";
  subEl.textContent = "निजी नियंत्रण कक्ष (कंट्रोल रूम)";
  statusEl.textContent = "⏳ अलग कमरे से चाबी उठाकर जुड़ रहा है...";

  try {
    if (!navigator.onLine) {
      throw new Error("इंटरनेट बंद है");
    }

    const app = initializeApp(firebaseConfig);
    if (!app || !app.options || !app.options.projectId) {
      throw new Error("Project ID नहीं मिला");
    }

    statusEl.className = "status-box status-ok";
    statusEl.textContent = `✅ सर्वर (${app.options.projectId}) से जुड़ गया! 3 सेकंड में आगे बढ़ रहा है...`;
    trackEl.style.display = "block";

    requestAnimationFrame(() => {
      fillEl.style.width = "100%";
    });

    setTimeout(() => {
      screenEl.classList.add("fade-out");
      if (typeof onComplete === "function") {
        onComplete(app);
      }
    }, 3000);

  } catch (err) {
    statusEl.className = "status-box status-err";
    statusEl.textContent = "❌ सर्वर से जुड़ नहीं पाया (इंटरनेट कनेक्शन जाँचें)";
  }
}
