export async function showAdminPanel() {
  const bootEl = document.getElementById("boot-screen");
  const panelEl = document.getElementById("panel-screen");

  if (bootEl) bootEl.style.display = "none";

  // ग्राफ़िक्स, रंग-रूप और डिज़ाइन (CSS) सीधे इसी एकलौती फ़ाइल में लॉक
  if (!document.getElementById("ksjp-panel-styles")) {
    const style = document.createElement("style");
    style.id = "ksjp-panel-styles";
    style.textContent = `
      * { box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
      html, body { background: #0057ff !important; color: #0f172a !important; height: 100%; width: 100%; overflow: hidden; }
      .panel-screen {
        width: 100%; max-width: 480px; height: 100%; margin: 0 auto; background-color: #ffffff;
        background-image: url("data:image/svg+xml,%3Csvg width='120' height='120' viewBox='0 0 120 120' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' stroke='%2394a3b8' stroke-width='1.5' stroke-opacity='0.24'%3E%3Ccircle cx='22' cy='24' r='8'/%3E%3Cpath d='M75 18l10 16H65z'/%3E%3Crect x='20' y='74' width='16' height='12' rx='3'/%3E%3Cpath d='M82 76a9 9 0 1 0 9 9'/%3E%3Cpath d='M52 46l5 5 10-10'/%3E%3Ccircle cx='98' cy='52' r='4'/%3E%3Cpath d='M14 52h12M20 46v12'/%3E%3C/g%3E%3C/svg%3E");
        display: flex; flex-direction: column; overflow: hidden;
      }
      .top-header { height: 58px; padding: 0 14px; background: #0057ff; color: #ffffff; display: flex; align-items: center; justify-content: space-between; flex-shrink: 0; box-shadow: 0 2px 10px rgba(0, 87, 255, 0.25); }
      .brand-box { display: flex; align-items: center; gap: 10px; }
      .brand-logo { width: 42px; height: 42px; border-radius: 50%; background: #ffffff; border: 2.5px solid #ffd600; overflow: hidden; flex-shrink: 0; display: flex; align-items: center; justify-content: center; }
      .brand-logo img { width: 100%; height: 100%; object-fit: cover; display: block; }
      .brand-title { font-size: 17px; font-weight: 800; color: #ffffff; }
      .header-actions { display: flex; align-items: center; gap: 10px; }
      .icon-btn { width: 32px; height: 32px; border-radius: 50%; background: rgba(255, 255, 255, 0.2); color: #ffffff; display: flex; align-items: center; justify-content: center; font-size: 15px; font-weight: 800; user-select: none; }
      .icon-btn.profile-p { background: #ffd600; color: #0057ff; border: 2px solid #ffffff; font-size: 14px; }
      .cards-container { flex: 1; min-height: 0; display: flex; flex-direction: column; overflow: hidden; }
      .panel-card { flex: 1; min-height: 0; padding: 0 14px; display: flex; align-items: center; gap: 12px; user-select: none; }
      .card-manager { background: rgba(255, 214, 0, 0.16); }
      .avatar-manager { width: 50px; height: 50px; border-radius: 50%; background: linear-gradient(135deg, #ff1e1e, #991b1b); color: #ffd600; border: 2.5px solid #ffd600; box-shadow: 0 0 0 2.5px #ff1e1e; font-weight: 900; font-size: 20px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
      .card-board { background: rgba(0, 200, 83, 0.11); }
      .avatar-board { width: 44px; height: 44px; border-radius: 12px; background: linear-gradient(135deg, #00c853, #007e33); color: #ffffff; border: 2.5px solid #0057ff; font-weight: 900; font-size: 18px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
      .avatar-member { width: 36px; height: 36px; border-radius: 50%; background: #0066ff; color: #ffffff; border: 2px solid #93c5fd; font-weight: 800; font-size: 14px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; margin-left: 5px; }
      .card-info { flex: 1; height: 100%; border-bottom: 1px solid #e2e8f0; display: flex; align-items: center; justify-content: space-between; }
      .panel-card:last-child .card-info { border-bottom: none; }
      .card-text { display: flex; flex-direction: column; gap: 1px; }
      .card-name { font-size: 15px; font-weight: 700; color: #0f172a; }
      .card-sub { font-size: 12px; color: #475569; font-weight: 500; }
      .status-pill { font-size: 11px; padding: 3px 10px; border-radius: 999px; font-weight: 700; }
      .pill-red { background: #ff1e1e; color: #ffffff; }
      .pill-green { background: #00c853; color: #ffffff; }
      .pill-yellow { background: #ffd600; color: #0f172a; border: 1px solid #eab308; }
      .bottom-bar { padding: 8px 12px 12px 12px; background: #ffffff; border-top: 1px solid #cbd5e1; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
      .moral-capsule { width: 100%; padding: 7px 12px; background: #ffd600; color: #0f172a; border: 1.5px solid #ff1e1e; border-radius: 16px; display: flex; align-items: center; justify-content: center; text-align: center; font-size: 11px; line-height: 1.3; font-weight: 800; }
    `;
    document.head.appendChild(style);
  }

  panelEl.style.display = "flex";

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

  // चौथे फ़ोल्डर (04-execution/actions.js) को सक्रिय करना
  try {
    const execModule = await import("../../04-execution/actions.js");
    if (execModule && execModule.initPanelActions) {
      execModule.initPanelActions();
    }
  } catch (e) {}
}
