export function initPanelActions() {
  // हर कार्ड को क्लिक करने योग्य बनाना
  const cards = document.querySelectorAll(".panel-card");
  cards.forEach((card) => {
    card.style.cursor = "pointer";
    card.addEventListener("click", () => {
      const title = card.querySelector(".card-name")?.textContent || "कक्ष";
      const sub = card.querySelector(".card-sub")?.textContent || "";
      const actionType = card.getAttribute("data-action");

      openActionModal(title, sub, actionType);
    });
  });

  // ऊपर वाले घंटी (🔔) और प्रोफ़ाइल (P) बटन
  const notifyBtn = document.getElementById("btn-notify");
  const profileBtn = document.getElementById("btn-profile");

  if (notifyBtn) {
    notifyBtn.style.cursor = "pointer";
    notifyBtn.addEventListener("click", () => {
      openActionModal("🔔 पार्टी सूचना केंद्र", "अभी कोई नई आपातकालीन सूचना नहीं है।", "notify");
    });
  }

  if (profileBtn) {
    profileBtn.style.cursor = "pointer";
    profileBtn.addEventListener("click", () => {
      openActionModal("👤 प्रोफ़ाइल (P)", "KSJP नियंत्रण कक्ष संचालक • स्थिति: ऑनलाइन", "profile");
    });
  }
}

function openActionModal(title, subtitle, actionType) {
  let oldModal = document.getElementById("ksjp-action-modal");
  if (oldModal) oldModal.remove();

  let bodyMessage = "यह कक्ष सक्रिय है। यहाँ से आगे का संचालन किया जाएगा।";
  if (actionType === "site-manager") {
    bodyMessage = "🔐 मुख्य नियंत्रक कक्ष: केवल अधिकृत संचालक के लिए सुरक्षित नियंत्रण क्षेत्र।";
  } else if (actionType === "board-room") {
    bodyMessage = "💬 सामूहिक चर्चा कक्ष: सभी सक्रिय एडमिन यहाँ बैठक और संवाद कर सकेंगे।";
  } else if (actionType && actionType.startsWith("admin-")) {
    bodyMessage = "➕ यह पद अभी खाली है। जल्द ही यहाँ नया पदाधिकारी जोड़ा जा सकेगा।";
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
      <h3 style="font-size: 18px; font-weight: 800; color: #0057ff; margin-bottom: 6px;">${title}</h3>
      <p style="font-size: 12.5px; color: #475569; margin-bottom: 12px; font-weight: 600;">${subtitle}</p>
      <div style="
        background: #f1f5f9; border-left: 4px solid #ffd600; padding: 12px;
        border-radius: 10px; font-size: 13.5px; line-height: 1.45; margin-bottom: 16px;
      ">${bodyMessage}</div>
      <button id="close-ksjp-modal" style="
        width: 100%; padding: 10px; background: #0057ff; color: #ffffff;
        border: none; border-radius: 999px; font-size: 14px; font-weight: 700; cursor: pointer;
      ">बंद करें</button>
    </div>
  `;

  document.body.appendChild(modal);
  document.getElementById("close-ksjp-modal").addEventListener("click", () => modal.remove());
  modal.addEventListener("click", (e) => {
    if (e.target === modal) modal.remove();
  });
}
