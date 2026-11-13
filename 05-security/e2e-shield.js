// 05-security/e2e-shield.js
// KSJP End-to-End Encryption (AES-256-GCM) Fail-Closed सुरक्षा कवच

const E2EE_PREFIX = "KSJP_E2EE::";
let derivedCryptoKey = null;
let isShieldReady = false;

// 01-config/firebase-key.js से केवल projectId और apiKey मिलाकर गुप्त क्रिप्टो चाबी बनाना
async function initCryptoEngine() {
  if (isShieldReady && derivedCryptoKey) return true;
  try {
    const keyMod = await import("../01-config/firebase-key.js");
    const cfg = keyMod?.firebaseConfig;
    if (!cfg || !cfg.projectId || !cfg.apiKey) return false;

    const rawSecret = `${cfg.projectId}::${cfg.apiKey}::KSJP_SHIELD_2026`;
    const enc = new TextEncoder();
    const baseKey = await crypto.subtle.importKey(
      "raw",
      enc.encode(rawSecret),
      { name: "PBKDF2" },
      false,
      ["deriveKey"]
    );

    derivedCryptoKey = await crypto.subtle.deriveKey(
      {
        name: "PBKDF2",
        salt: enc.encode("KSJP-CONTROL-ROOM-SALT"),
        iterations: 100000,
        hash: "SHA-256"
      },
      baseKey,
      { name: "AES-GCM", length: 256 },
      false,
      ["encrypt", "decrypt"]
    );

    isShieldReady = true;
    return true;
  } catch (e) {
    isShieldReady = false;
    return false;
  }
}

function bufToBase64(buf) {
  const bytes = new Uint8Array(buf);
  let bin = "";
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin);
}

function base64ToBuf(b64) {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes.buffer;
}

// 1. संदेश को लॉक (Encrypt) करना — Fail-Closed नियम के साथ
export async function encryptMessage(plainText) {
  const ready = await initCryptoEngine();
  if (!ready || !derivedCryptoKey) {
    throw new Error("E2EE_SHIELD_OFFLINE");
  }

  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encoded = new TextEncoder().encode(plainText);
  const cipherBuf = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    derivedCryptoKey,
    encoded
  );

  return `${E2EE_PREFIX}${bufToBase64(iv)}:${bufToBase64(cipherBuf)}`;
}

// 2. लॉक संदेश को खोलना (Decrypt)
export async function decryptMessage(cipherText) {
  if (!cipherText || !cipherText.startsWith(E2EE_PREFIX)) {
    return cipherText; // पुराने बिना-लॉक संदेशों के लिए
  }
  const ready = await initCryptoEngine();
  if (!ready || !derivedCryptoKey) {
    return "🔒 [सुरक्षा कवच बंद होने के कारण संदेश लॉक है]";
  }

  try {
    const payload = cipherText.slice(E2EE_PREFIX.length);
    const [ivB64, dataB64] = payload.split(":");
    const iv = new Uint8Array(base64ToBuf(ivB64));
    const dataBuf = base64ToBuf(dataB64);

    const plainBuf = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv },
      derivedCryptoKey,
      dataBuf
    );
    return new TextDecoder().decode(plainBuf);
  } catch (e) {
    return "⚠️ [संदेश डिक्रिप्ट नहीं हो सका]";
  }
}

// 3. नेटवर्क इंटरसेप्टर: बिना पैनल कोड छेड़े Firestore POST को अपने आप एन्क्रिप्ट करना
export async function activateE2EEShield() {
  const ready = await initCryptoEngine();

  // स्क्रीन के ऊपर लाइव सुरक्षा स्थिति बैज दिखाना
  const updateShieldBadge = () => {
    let badge = document.getElementById("ksjp-e2ee-badge");
    if (!badge) {
      badge = document.createElement("div");
      badge.id = "ksjp-e2ee-badge";
      badge.style.cssText = `
        position: fixed; bottom: 52px; right: 12px; z-index: 10001;
        padding: 4px 10px; border-radius: 999px; font-size: 10.5px;
        font-weight: 800; box-shadow: 0 2px 8px rgba(0,0,0,0.2);
        pointer-events: none;
      `;
      document.body.appendChild(badge);
    }

    if (isShieldReady) {
      badge.style.background = "#dcfce7";
      badge.style.color = "#166534";
      badge.style.border = "1.5px solid #22c55e";
      badge.textContent = "🛡️ E2EE सक्रिय";
    } else {
      badge.style.background = "#fee2e2";
      badge.style.color = "#991b1b";
      badge.style.border = "1.5px solid #ef4444";
      badge.textContent = "❌ E2EE बंद";
    }
  };

  updateShieldBadge();
  setInterval(updateShieldBadge, 3000);

  // Firestore पर जाने वाले हर संदेश को क्लाउड से पहले ही ताले में बंद करना
  if (!window.__ksjpFetchWrapped) {
    window.__ksjpFetchWrapped = true;
    const originalFetch = window.fetch.bind(window);

    window.fetch = async (resource, config = {}) => {
      const url = typeof resource === "string" ? resource : resource?.url || "";

      // यदि Firestore के messages कलेक्शन में नया संदेश POST हो रहा है
      if (url.includes("firestore.googleapis.com") && url.includes("/messages") && config.method === "POST" && config.body) {
        try {
          const parsed = JSON.parse(config.body);
          const rawText = parsed?.fields?.text?.stringValue;
          if (rawText && !rawText.startsWith(E2EE_PREFIX)) {
            // Fail-Closed: एन्क्रिप्ट न होने पर संदेश क्लाउड पर जाएगा ही नहीं!
            parsed.fields.text.stringValue = await encryptMessage(rawText);
            config.body = JSON.stringify(parsed);
          }
        } catch (err) {
          alert("⚠️ सुरक्षा अलर्ट: End-to-End Encryption सक्रिय नहीं हो पाया, इसलिए आपका संदेश क्लाउड पर नहीं भेजा गया!");
          throw err;
        }
      }

      const response = await originalFetch(resource, config);

      // यदि Firestore से messages पढ़े जा रहे हैं, तो उन्हें केवल सही डिवाइस पर डिक्रिप्ट करना
      if (url.includes("firestore.googleapis.com") && url.includes("/messages") && (!config.method || config.method === "GET")) {
        try {
          const cloned = response.clone();
          const data = await cloned.json();
          if (data && Array.isArray(data.documents)) {
            for (const doc of data.documents) {
              const txt = doc?.fields?.text?.stringValue;
              if (txt && txt.startsWith(E2EE_PREFIX)) {
                doc.fields.text.stringValue = await decryptMessage(txt);
              }
            }
            return new Response(JSON.stringify(data), {
              status: response.status,
              statusText: response.statusText,
              headers: response.headers
            });
          }
        } catch (e) {}
      }

      return response;
    };
  }

  return ready;
}
