export async function showAdminPanel() {
  const bootEl = document.getElementById("boot-screen");
  const panelEl = document.getElementById("panel-screen");

  if (bootEl) bootEl.style.display = "none";
  panelEl.style.display = "flex";

  // ग्राफ़िक्स और जानकारी एक ही जगह लॉक
  panelEl.innerHTML = `
    <header class="top-header">
      <div class="brand-box">
        <div class="brand-logo">
          <img id="ksjp-logo-img" src="" alt="KSJP Logo" />
        </div>
        <div class="brand-title">KSJP एडमिन पैनल</div>
      </div>
      <div class="header-actions">
        <div class="icon-btn" id="btn-notify" title="सूचनाएं">🔔</div>
        <div class="icon-btn profile-p" id="btn-profile" title="प्रोफ़ाइल">P</div>
      </div>
    </header>

    <main class="cards-container">
      <div class="panel-card card-manager" data-action="site-manager">
        <div class="avatar-manager">S</div>
        <div class="card-info">
          <div class="card-text">
            <span class="card-name">Site Manager</span>
            <span class="card-sub">मुख्य नियंत्रक कक्ष</span>
          </div>
          <span class="status-pill pill-red">सक्रिय</span>
        </div>
      </div>

      <div class="panel-card card-board" data-action="board-room">
        <div class="avatar-board">B</div>
        <div class="card-info">
          <div class="card-text">
            <span class="card-name">बोर्ड रूम</span>
            <span class="card-sub">सामूहिक चर्चा कक्ष</span>
          </div>
          <span class="status-pill pill-green">समूह</span>
        </div>
      </div>

      ${[1, 2, 3, 4, 5].map((num) => `
        <div class="panel-card" data-action="admin-${num}">
          <div class="avatar-member">${num}</div>
          <div class="card-info">
            <div class="card-text">
              <span class="card-name">एडमिन ${num}</span>
              <span class="card-sub">कोई जुड़ा नहीं है</span>
            </div>
            <span class="status-pill pill-yellow">पद खाली</span>
          </div>
        </div>
      `).join("")}
    </main>

    <footer class="bottom-bar">
      <div class="moral-capsule">समाज की पहचान उसके व्यक्तियों से होती है और व्यक्ति को उसकी पहचान खुद बनाना पड़ता है</div>
    </footer>
  `;

  // रिपॉज़िटरी से अपलोड की गई Screenshot फ़ोटो को अपने आप गोल लोगो में लगाना
  const logoImg = document.getElementById("ksjp-logo-img");
  try {
    const res = await fetch("https://api.github.com/repos/Manishmanwala/ksjp-control-room/contents/");
    if (res.ok) {
      const files = await res.json();
      const foundLogo = files.find((f) =>
        f.type === "file" &&
        (f.name.startsWith("Screenshot_") || /\.(jpg|jpeg|png|webp)$/i.test(f.name))
      );
      if (foundLogo && foundLogo.download_url) {
        logoImg.src = foundLogo.download_url;
      }
    }
  } catch (e) {}

  // अब बिना HTML बदले सीधे नए फ़ोल्डर (04-execution/actions.js) को सक्रिय करना
  try {
    const execModule = await import("../../04-execution/actions.js");
    if (execModule && execModule.initPanelActions) {
      execModule.initPanelActions();
    }
  } catch (e) {
    // जब तक 04-execution/actions.js न बने, तब तक पैनल बिना रुके चलता रहेगा
  }
}
