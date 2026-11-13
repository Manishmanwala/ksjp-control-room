if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("./sw.js").catch(() => {});
}

export function initPanelActions() {
  const cards = document.querySelectorAll(".panel-card");
  cards.forEach((card) => {
    card.style.cursor = "pointer";
    card.addEventListener("click", async () => {
      const title = card.querySelector(".card-name")?.textContent || "कक्ष";
      const sub = card.querySelector(".card-sub")?.textContent || "";
      const seatStatus = card.querySelector(".status-pill")?.textContent?.trim() || "";
      const actionType = card.getAttribute("data-action");

      let ruleNote = "नियम सामान्य है।";
      try {
        const rulesMod = await import("../05-rules/rules.js");
        if (rulesMod && rulesMod.checkAccessRule) {
          const check = rulesMod.checkAccessRule(actionType, seatStatus);
          ruleNote = check.ruleNote;
        }
      } catch (e) {}

      openActionModal(title, sub, actionType, ruleNote);
    });
  });

  const notifyBtn = document.getElementById("btn-notify");
  const profileBtn = document.getElementById("btn-profile");

  if (notifyBtn) {
    notifyBtn.style.cursor = "pointer";
    notifyBtn.addEventListener("click", () => {
      openActionModal("🔔 पार्टी सूचना केंद्र", "आपातकालीन व आधिकारिक संदेश", "notify", "नियम: केवल आधिकारिक घोषणाएँ यहाँ दिखेंगी।");
    });
  }

  if (profileBtn) {
    profileBtn.style.cursor = "pointer";
    profileBtn.addEventListener("click", () => {
      openActionModal("👤 प्रोफ़ाइल (P)", "KSJP नियंत्रण कक्ष संचालक", "profile", "नियम: एक समय में एक ही मुख्य संचालक सक्रिय रहेगा।");
    });
  }
}

function openActionModal(title, subtitle, actionType, ruleNote) {
  let oldModal = document.getElementById("ksjp-action-modal");
  if (oldModal) oldModal.remove();

  let bodyMessage = "यह कक्ष सक्रिय है। यहाँ से आगे का संचालन किया जाएगा।";
  if (actionType === "site-manager") {
    bodyMessage = "🔐 मुख्य नियंत्रक कक्ष: यहाँ से नए एडमिन जोड़े और हटाए जाएंगे।";
  } else if (actionType === "board-room") {
    bodyMessage = "💬 सामूहिक चर्चा कक्ष: सभी सक्रिय एडमिन यहाँ बैठक और संवाद कर सकेंगे।";
  } else if (actionType && actionType.startsWith("admin-")) {
    bodyMessage = "➕ यह पद अभी खाली है। Site Manager द्वारा नियुक्ति के बाद यह कक्ष खुलेगा।";
  }

  const modal = document.createElement("div");
  modal.id = "ksjp-action-modal";
  modal.style.cssText = `
    position: fixed; inset: 0; background: rgba(15, 23, 42, 0.65);
    display: flex; align-items: center; justify-content: center;
    padding: 20px; z-index: 9999;
  `;

  modal.innerHTML = `
    <div style="
      width: 100%; max-width: 360px; background: #ffffff; border-radius: 18px;
      border: 2px solid #0057ff; padding: 20px; text-align: center;
      box-shadow: 0 15px 35px rgba(0,0,0,0.35); color: #0f172a;
    ">
      <h3 style="font-size: 18px; font-weight: 800; color: #0057ff; margin-bottom: 4px;">${title}</h3>
      <p style="font-size: 12.5px; color: #475569; margin-bottom: 12px; font-weight: 600;">${subtitle}</p>
      <div style="
        background: #f1f5f9; border-left: 4px solid #0057ff; padding: 10px 12px;
        border-radius: 10px; font-size: 13.5px; line-height: 1.45; margin-bottom: 10px;
      ">${bodyMessage}</div>
      <div style="
        background: #fef9c3; border: 1px solid #eab308; color: #854d0e;
        padding: 8px 10px; border-radius: 10px; font-size: 12px; font-weight: 700; margin-bottom: 16px;
      ">⚖️ ${ruleNote}</div>
      <button id="close-ksjp-modal" style="
        width: 100%; padding: 10px; background: #0057ff; color: #ffffff;
        border: none; border-radius: 999px; font-size: 14px; font-weight: 700; cursor: pointer;
      ">ठीक है</button>
    </div>
  `;

  document.body.appendChild(modal);
  document.getElementById("close-ksjp-modal").addEventListener("click", () => modal.remove());
  modal.addEventListener("click", (e) => {
    if (e.target === modal) modal.remove();
  });
}
