// auto-loader.js — KSJP ऐप का startup और डायग्नोस्टिक इंजन

import { runStartPage } from "./02-start-page/execution/start.js";
import { showAdminPanel } from "./03-page-panel/execution/panel-logic.js";

async function startApp() {
  const start = () => {
    runStartPage(async () => {
      try {
        await showAdminPanel();

        // panel-logic.js actions.js और kick-member.js को खुद initialize करता है।
        // यहाँ उन्हें दोबारा initialize न करें।

        const { initNewMembersApproval } =
          await import("./05-new-members/new-members.js");

        await initNewMembersApproval();
      } catch (error) {
        console.error("KSJP शुरू नहीं हो सका:", error);

        const status = document.getElementById("status");
        if (status) {
          status.textContent =
            "❌ पैनल शुरू नहीं हो सका। पेज रीलोड करें और Console error देखें।";
        }
      }
    });
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start, { once: true });
  } else {
    start();
  }
}

startApp();
