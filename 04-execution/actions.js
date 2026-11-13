export async function initPanelActions() {
  const shield = await import("../05-security/e2e-shield.js");
  if (shield && shield.activateE2EEShield) {
    await shield.activateE2EEShield();
  }
}
