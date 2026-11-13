// 06-voice-bridge/voice-system.js
// 1. 1-to-1 प्राइवेट लाइव ऑडियो कॉल (WebRTC + Firestore Signaling)
// 2. बोर्ड रूम सामूहिक कॉल अलर्ट / रिंग
// 3. कॉन्फ्रेंस रूम (भविष्य के अपडेट के लिए तैयार सादा लेआउट)

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

  // मोबाइल में हल्की रिंगटोन बजाने का इनबिल्ट जनरेटर (बिना बाहरी ऑडियो फ़ाइल के)
  let ringInterval = null;
  const startRingtone = () => {
    if (ringInterval) return;
    const beep = () => {
      try {
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(660, ctx.currentTime);
        osc.frequency.setValueAtTime(880, ctx.currentTime + 0.18);
        gain.gain.setValueAtTime(0.18, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.45);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.46);
      } catch (e) {}
    };
    beep();
    ringInterval = setInterval(beep, 1800);
  };

  const stopRingtone = () => {
    if (ringInterval) {
      clearInterval(ringInterval);
      ringInterval = null;
    }
  };

  // =========================================================================
  // भाग A: पैनल में "कॉन्फ्रेंस रूम" का सादा लेआउट कार्ड जोड़ना (बिना मुख्य फ़ाइल छुए)
  // =========================================================================
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
          <span class="card-sub">साझा सार्वजनिक पोर्टल • जल्द आ रहा है</span>
        </div>
        <span class="status-pill" style="background:#7c3aed;color:#fff;">आगामी</span>
      </div>
    `;

    confCard.onclick = openConferenceRoomPreview;
    if (boardCard && boardCard.nextSibling) {
      container.insertBefore(confCard, boardCard.nextSibling);
    } else {
      container.appendChild(confCard);
    }
  };

  // कॉन्फ्रेंस रूम खोलने पर दिखने वाला तैयार लेआउट (बिना माइक व चैट बॉक्स के)
  const openConferenceRoomPreview = async () => {
    document.getElementById("ksjp-conf-room")?.remove();
    const room = document.createElement("div");
    room.id = "ksjp-conf-room";
    room.style.cssText = "position:fixed;inset:0;width:100vw;height:100dvh;background:#f8fafc;display:flex;flex-direction:column;z-index:10002;";

    // क्लाउड से जुड़े हुए सदस्यों की प्रोफ़ाइल फ़ोटो लाना
    let members = [];
    if (firestoreBase) {
      try {
        const res = await fetch(`${firestoreBase}/ksjp_members?key=${apiKey}`);
        if (res.ok) {
          const data = await res.json();
          members = (data.documents || []).map((d) => ({
            name: d.fields?.name?.stringValue || "सदस्य",
            photo: d.fields?.photo?.stringValue || ""
          }));
        }
      } catch (e) {}
    }

    const avatarsHtml = members.length
      ? members.map((m) => `
          <div style="display:flex;flex-direction:column;align-items:center;gap:4px;width:68px;">
            <img src="${m.photo || ""}" style="width:48px;height:48px;border-radius:50%;object-fit:cover;background:#7c3aed;border:2px solid #7c3aed;" />
            <span style="font-size:11px;font-weight:700;color:#1e293b;text-align:center;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;width:100%;">${m.name}</span>
          </div>
        `).join("")
      : `<div style="font-size:12px;color:#64748b;">सदस्यों की सूची लोड हो रही है...</div>`;

    room.innerHTML = `
      <header style="height:56px;background:#4c1d95;color:#fff;padding:0 14px;display:flex;align-items:center;gap:10px;flex-shrink:0;">
        <button id="conf-back-btn" style="background:rgba(255,255,255,0.2);border:none;color:#fff;padding:6px 12px;border-radius:999px;font-weight:800;cursor:pointer;">← वापस</button>
        <div style="font-size:16px;font-weight:800;">कॉन्फ्रेंस रूम (साझा पोर्टल)</div>
      </header>

      <div style="padding:14px;background:#fff;border-bottom:1px solid #e2e8f0;">
        <div style="font-size:12px;font-weight:800;color:#4c1d95;margin-bottom:10px;">पैनल से जुड़े प्रमुख सदस्य:</div>
        <div style="display:flex;flex-wrap:wrap;gap:10px;">${avatarsHtml}</div>
      </div>

      <main style="flex:1;display:flex;align-items:center;justify-content:center;padding:24px;">
        <div style="max-width:340px;width:100%;background:#fff;border:2px dashed #7c3aed;border-radius:20px;padding:24px 18px;text-align:center;box-shadow:0 6px 20px rgba(124,58,237,0.08);">
          <div style="font-size:38px;margin-bottom:10px;">🚧</div>
          <div style="font-size:16px;font-weight:800;color:#1e293b;margin-bottom:8px;">माफ़ करें, यह फ़ीचर इस समय मौजूद नहीं है</div>
          <p style="font-size:13px;color:#475569;line-height:1.5;">
            अभी दूसरी वेबसाइट से जुड़ाव पूरा नहीं हुआ है। जैसे ही दोनों वेबसाइटें आपस में जुड़ेंगी, हम जल्द ही इस लाइव वॉइस और इमोजी चैट फ़ीचर के साथ लौटेंगे!
          </p>
        </div>
      </main>
    `;

    document.body.appendChild(room);
    document.getElementById("conf-back-btn").onclick = () => room.remove();
  };

  // =========================================================================
  // भाग B: चैट रूम के अंदर "📞 1-to-1 कॉल" और बोर्ड रूम में "🎙️ बातचीत करें" बटन जोड़ना
  // =========================================================================
  const attachRoomCallButtons = () => {
    const roomEl = document.getElementById("ksjp-room");
    if (!roomEl || roomEl.dataset.callReady === "1") return;
    roomEl.dataset.callReady = "1";

    const header = roomEl.querySelector("header");
    const titleEl = header?.querySelector("div");
    const roomTitle = titleEl?.textContent?.trim() || "";
    const me = getMe();
    if (!header || !me) return;

    const callBtn = document.createElement("button");
    callBtn.style.cssText = "margin-left:auto;background:#00c853;color:#fff;border:none;padding:6px 12px;border-radius:999px;font-size:12.5px;font-weight:800;cursor:pointer;box-shadow:0 2px 6px rgba(0,0,0,0.25);";

    if (roomTitle === "बोर्ड रूम") {
      // बोर्ड रूम: सभी एडमिन + Site Manager को एक साथ रिंग भेजने वाला बटन
      callBtn.textContent = "🎙️ बातचीत करें";
      callBtn.onclick = async () => {
        if (!firestoreBase) return;
        callBtn.textContent = "🔔 रिंग भेजी जा रही है...";
        await fetch(`${firestoreBase}/ksjp_calls/board_ring?key=${apiKey}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            fields: {
              callerName: { stringValue: me.name },
              callerSeat: { stringValue: me.seatId },
              ts: { integerValue: String(Date.now()) }
            }
          })
        });
        setTimeout(() => { callBtn.textContent = "🎙️ बातचीत करें"; }, 2500);
        alert("🔔 सभी बोर्ड मेंबर्स और Site Manager के मोबाइल पर बातचीत के लिए रिंग भेज दी गई है!");
      };
      header.appendChild(callBtn);
    } else if (roomTitle !== "🔔 पार्टी सूचना केंद्र") {
      // 1-to-1 निजी चैट: केवल सामने वाले एक व्यक्ति को लाइव ऑडियो कॉल
      callBtn.textContent = "📞 कॉल";
      callBtn.onclick = () => startDirectWebRTCCall(roomTitle);
      header.appendChild(callBtn);
    }
  };

  // =========================================================================
  // भाग C: असली 1-to-1 लाइव ऑडियो कॉल (WebRTC Peer-to-Peer)
  // =========================================================================
  let activePC = null;
  let localStream = null;

  const endActiveCall = async (callDocId) => {
    stopRingtone();
    document.getElementById("ksjp-call-overlay")?.remove();
    if (localStream) {
      localStream.getTracks().forEach((t) => t.stop());
      localStream = null;
    }
    if (activePC) {
      activePC.close();
      activePC = null;
    }
    if (callDocId && firestoreBase) {
      await fetch(`${firestoreBase}/ksjp_calls/${callDocId}?key=${apiKey}`, { method: "DELETE" }).catch(() => {});
    }
  };

  const showCallScreen = (peerName, statusText, callDocId, isIncoming = false, onAccept = null) => {
    document.getElementById("ksjp-call-overlay")?.remove();
    const box = document.createElement("div");
    box.id = "ksjp-call-overlay";
    box.style.cssText = "position:fixed;inset:0;background:rgba(15,23,42,0.92);color:#fff;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:24px;z-index:10010;text-align:center;";

    box.innerHTML = `
      <div style="width:76px;height:76px;border-radius:50%;background:#0057ff;border:3px solid #ffd600;display:flex;align-items:center;justify-content:center;font-size:32px;margin-bottom:14px;">📞</div>
      <div style="font-size:20px;font-weight:800;margin-bottom:6px;">${peerName}</div>
      <div id="ksjp-call-status" style="font-size:14px;color:#93c5fd;margin-bottom:28px;">${statusText}</div>
      <div style="display:flex;gap:18px;">
        ${isIncoming ? `<button id="ksjp-call-accept" style="padding:12px 24px;background:#00c853;color:#fff;border:none;border-radius:999px;font-size:15px;font-weight:800;cursor:pointer;">उठाएँ</button>` : ""}
        <button id="ksjp-call-hangup" style="padding:12px 24px;background:#ff1e1e;color:#fff;border:none;border-radius:999px;font-size:15px;font-weight:800;cursor:pointer;">कॉल काटें</button>
      </div>
      <audio id="ksjp-remote-audio" autoplay playsinline></audio>
    `;
    document.body.appendChild(box);

    document.getElementById("ksjp-call-hangup").onclick = () => endActiveCall(callDocId);
    if (isIncoming && onAccept) {
      document.getElementById("ksjp-call-accept").onclick = onAccept;
    }
  };

  // कॉल लगाने वाला (Caller)
  const startDirectWebRTCCall = async (targetTitle) => {
    const me = getMe();
    if (!me || !firestoreBase) return;

    // सभी सदस्यों में से नाम मिलाकर लक्ष्य सीट पहचानना
    let targetSeat = "";
    try {
      const mRes = await fetch(`${firestoreBase}/ksjp_members?key=${apiKey}`);
      const mData = await mRes.json();
      (mData.documents || []).forEach((d) => {
        const sId = d.name.split("/").pop();
        const nm = d.fields?.name?.stringValue || "";
        if (nm === targetTitle || sId === targetTitle.toLowerCase().replace(/\s+/g, "-")) {
          targetSeat = sId;
        }
      });
    } catch (e) {}

    if (!targetSeat) {
      const map = { "Site Manager": "site-manager", "एडमिन 1": "admin-1", "एडमिन 2": "admin-2", "एडमिन 3": "admin-3", "एडमिन 4": "admin-4", "एडमिन 5": "admin-5" };
      targetSeat = map[targetTitle] || "";
    }
    if (!targetSeat || targetSeat === me.seatId) return;

    const callDocId = `direct_${targetSeat}`;
    showCallScreen(targetTitle, "माइक्रोफ़ोन जुड़ रहा है...", callDocId, false);

    try {
      localStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      activePC = new RTCPeerConnection({ iceServers: [{ urls: "stun:stun.l.google.com:19302" }] });
      localStream.getTracks().forEach((track) => activePC.addTrack(track, localStream));

      activePC.ontrack = (ev) => {
        const audioEl = document.getElementById("ksjp-remote-audio");
        if (audioEl) audioEl.srcObject = ev.streams[0];
      };

      const offer = await activePC.createOffer();
      await activePC.setLocalDescription(offer);

      await new Promise((r) => setTimeout(r, 900)); // ICE उम्मीदवारों के लिए हल्का इंतज़ार

      await fetch(`${firestoreBase}/ksjp_calls/${callDocId}?key=${apiKey}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fields: {
            callerName: { stringValue: me.name },
            callerSeat: { stringValue: me.seatId },
            targetSeat: { stringValue: targetSeat },
            offerSdp: { stringValue: JSON.stringify(activePC.localDescription) },
            answerSdp: { stringValue: "" },
            ts: { integerValue: String(Date.now()) }
          }
        })
      });

      const statusEl = document.getElementById("ksjp-call-status");
      if (statusEl) statusEl.textContent = "🔔 रिंग जा रही है...";

      const waitAnswer = setInterval(async () => {
        if (!activePC) return clearInterval(waitAnswer);
        const res = await fetch(`${firestoreBase}/ksjp_calls/${callDocId}?key=${apiKey}`);
        if (!res.ok) {
          clearInterval(waitAnswer);
          endActiveCall(null);
          return;
        }
        const doc = await res.json();
        const ansStr = doc?.fields?.answerSdp?.stringValue;
        if (ansStr && !activePC.currentRemoteDescription) {
          await activePC.setRemoteDescription(new RTCSessionDescription(JSON.parse(ansStr)));
          const st = document.getElementById("ksjp-call-status");
          if (st) st.textContent = "🟢 कॉल जुड़ी हुई है (लाइव बातचीत)";
          clearInterval(waitAnswer);
        }
      }, 2000);
    } catch (err) {
      alert("माइक्रोफ़ोन की अनुमति नहीं मिली या कॉल शुरू नहीं हो सकी।");
      endActiveCall(callDocId);
    }
  };

  // =========================================================================
  // भाग D: आने वाली 1-to-1 कॉल और बोर्ड रूम रिंग की जाँच (हर 3 सेकंड में)
  // =========================================================================
  let lastBoardRingTs = Date.now();
  setInterval(async () => {
    injectConferenceCard();
    attachRoomCallButtons();

    const me = getMe();
    if (!me || !firestoreBase) return;

    // 1. 1-to-1 आने वाली कॉल जाँचना
    if (!activePC && !document.getElementById("ksjp-call-overlay")) {
      const callDocId = `direct_${me.seatId}`;
      try {
        const res = await fetch(`${firestoreBase}/ksjp_calls/${callDocId}?key=${apiKey}`);
        if (res.ok) {
          const doc = await res.json();
          const f = doc?.fields || {};
          const offerStr = f.offerSdp?.stringValue;
          const ts = Number(f.ts?.integerValue || 0);
          if (offerStr && Date.now() - ts < 45000 && !f.answerSdp?.stringValue) {
            startRingtone();
            showCallScreen(
              f.callerName?.stringValue || "एडमिन सदस्य",
              "📲 निजी 1-to-1 ऑडियो कॉल आ रही है...",
              callDocId,
              true,
              async () => {
                stopRingtone();
                const btn = document.getElementById("ksjp-call-accept");
                if (btn) btn.remove();
                const st = document.getElementById("ksjp-call-status");
                if (st) st.textContent = "जुड़ रहा है...";

                localStream = await navigator.mediaDevices.getUserMedia({ audio: true });
                activePC = new RTCPeerConnection({ iceServers: [{ urls: "stun:stun.l.google.com:19302" }] });
                localStream.getTracks().forEach((t) => activePC.addTrack(t, localStream));
                activePC.ontrack = (ev) => {
                  const audioEl = document.getElementById("ksjp-remote-audio");
                  if (audioEl) audioEl.srcObject = ev.streams[0];
                };

                await activePC.setRemoteDescription(new RTCSessionDescription(JSON.parse(offerStr)));
                const answer = await activePC.createAnswer();
                await activePC.setLocalDescription(answer);
                await new Promise((r) => setTimeout(r, 800));

                await fetch(`${firestoreBase}/ksjp_calls/${callDocId}?key=${apiKey}`, {
                  method: "PATCH",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    fields: {
                      ...f,
                      answerSdp: { stringValue: JSON.stringify(activePC.localDescription) }
                    }
                  })
                });
                if (st) st.textContent = "🟢 कॉल जुड़ी हुई है (लाइव बातचीत)";
              }
            );
          }
        }
      } catch (e) {}
    }

    // 2. बोर्ड रूम सामूहिक रिंग जाँचना
    try {
      const bRes = await fetch(`${firestoreBase}/ksjp_calls/board_ring?key=${apiKey}`);
      if (bRes.ok) {
        const bDoc = await bRes.json();
        const bf = bDoc?.fields || {};
        const bTs = Number(bf.ts?.integerValue || 0);
        if (bTs > lastBoardRingTs && bf.callerSeat?.stringValue !== me.seatId) {
          lastBoardRingTs = bTs;
          startRingtone();
          setTimeout(stopRingtone, 4500);
          alert(`🔔 ${bf.callerName?.stringValue || "सदस्य"} ने बोर्ड रूम में सामूहिक बातचीत शुरू की है! कृपया बोर्ड रूम खोलें।`);
        }
      }
    } catch (e) {}
  }, 3000);

  injectConferenceCard();
}
