// KSJP नियंत्रण कक्ष के कड़े नियम और संचालन कानून
export const KSJP_RULES = {
  maxAdmins: 5,
  allowPublicSignup: false, // बाहर का कोई भी व्यक्ति खुद से एडमिन नहीं बन सकता
  siteManagerOnlyActions: [
    "add-admin",
    "remove-admin",
    "change-party-rules",
    "delete-messages"
  ],
  boardRoomRules: {
    whoCanPost: ["site-manager", "admin-1", "admin-2", "admin-3", "admin-4", "admin-5"],
    emptySeatCanEnter: false // जब तक पद खाली है, उस सीट से कोई अंदर नहीं जा सकता
  }
};

// किसी भी बटन या कक्ष को खोलने से पहले नियम जाँचने वाला इंजन
export function checkAccessRule(actionType, seatStatus) {
  if (actionType === "site-manager") {
    return {
      allowed: true,
      level: "MASTER",
      ruleNote: "नियम 1: मुख्य नियंत्रक कक्ष केवल अधिकृत संचालक के लिए सुरक्षित है।"
    };
  }

  if (actionType === "board-room") {
    return {
      allowed: true,
      level: "GROUP",
      ruleNote: "नियम 2: बोर्ड रूम में केवल सक्रिय पदाधिकारी ही संवाद कर सकेंगे।"
    };
  }

  if (actionType && actionType.startsWith("admin-")) {
    if (seatStatus === "पद खाली") {
      return {
        allowed: false,
        level: "LOCKED",
        ruleNote: "नियम 3: यह पद अभी खाली है। बिना Site Manager की अनुमति के नया एडमिन नहीं जुड़ सकता।"
      };
    }
    return {
      allowed: true,
      level: "ADMIN",
      ruleNote: "नियम 4: सक्रिय पदाधिकारी कक्ष।"
    };
  }

  return {
    allowed: true,
    level: "INFO",
    ruleNote: "नियम 5: सामान्य सूचना कक्ष।"
  };
}
