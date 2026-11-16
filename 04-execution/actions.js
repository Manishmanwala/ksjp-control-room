export async function initPanelActions() {
  try {
    const shield = await import("../07-security/e2e-shield.js");
    if (shield && shield.activateE2EEShield) {
      await shield.activateE2EEShield();
    }
  } catch (e) {}

  try {
    const voiceMod = await import("../08-voice-bridge/voice-system.js");
    if (voiceMod && voiceMod.initVoiceAndConferenceSystem) {
      await voiceMod.initVoiceAndConferenceSystem();
    }
  } catch (e) {}
}

