// 05-rules/auth-lock.js
// स्थायी सदस्यता लॉक और प्रोफ़ाइल (नाम + फ़ोटो) इंजन

const STORAGE_KEY = "KSJP_PERMANENT_MEMBERS_V1";
const CURRENT_USER_KEY = "KSJP_LOGGED_IN_USER_V1";

export function getAllMembers() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};
  } catch (e) {
    return {};
  }
}

export function getCurrentUser() {
  try {
    return JSON.parse(localStorage.getItem(CURRENT_USER_KEY)) || null;
  } catch (e) {
    return null;
  }
}

// नया सदस्य जोड़ना और सीट को स्थायी रूप से लॉक करना
export function registerAndLockMember({ seatId, name, phone, photoDataUrl }) {
  const members = getAllMembers();

  // नियम: अगर सीट पहले से किसी और के नाम लॉक है, तो बदली नहीं जा सकती
  if (members[seatId] && members[seatId].locked) {
    return {
      ok: false,
      message: "यह पद पहले से लॉक है! इसे खाली नहीं किया जा सकता।"
    };
  }

  const cleanPhone = String(phone || "").replace(/\D/g, "");
  if (cleanPhone.length !== 10) {
    return { ok: false, message: "कृपया सही 10 अंकों का मोबाइल नंबर डालें।" };
  }
  if (!name || name.trim().length < 2) {
    return { ok: false, message: "कृपया अपना पूरा नाम लिखें।" };
  }

  const memberRecord = {
    seatId,
    name: name.trim(),
    phone: cleanPhone,
    photo: photoDataUrl || "",
    locked: true, // एक बार जुड़ने के बाद खुद से नहीं हट सकता
    joinedAt: new Date().toLocaleString("hi-IN")
  };

  members[seatId] = memberRecord;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(members));
  localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(memberRecord));

  return { ok: true, member: memberRecord };
}

// नाम या प्रोफ़ाइल फ़ोटो अपडेट करना (बिना सीट छोड़े)
export function updateMemberProfile({ name, photoDataUrl }) {
  const user = getCurrentUser();
  if (!user) return { ok: false, message: "पहले किसी पद से जुड़ें।" };

  const members = getAllMembers();
  if (name && name.trim().length >= 2) {
    user.name = name.trim();
  }
  if (photoDataUrl) {
    user.photo = photoDataUrl;
  }

  members[user.seatId] = user;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(members));
  localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(user));

  return { ok: true, member: user };
}

// लॉगिन / जॉइनिंग फ़ॉर्म पॉपअप दिखाना
export function openJoinOrProfileModal(onSuccessCallback) {
  const existingUser = getCurrentUser();
  const members = getAllMembers();

  let old = document.getElementById("ksjp-auth-modal");
  if (old) old.remove();

  const modal = document.createElement("div");
  modal.id = "ksjp-auth-modal";
  modal.style.cssText = `
    position: fixed; inset: 0; background: rgba(15, 23, 42, 0.72);
    display: flex; align-items: center; justify-content: center;
    padding: 16px; z-index: 10000;
  `;

  if (existingUser) {
    // अगर पहले से जुड़ा है तो उसकी लॉक प्रोफ़ाइल और फ़ोटो/नाम अपडेट दिखाएँ
    modal.innerHTML = `
      <div style="width:100%;max-width:370px;background:#fff;border-radius:18px;border:2px solid #0057ff;padding:18px;box-shadow:0 15px 35px rgba(0,0,0,0.35);">
        <div style="display:flex;align-items:center;gap:12px;margin-bottom:12px;">
          <img id="prof-preview" src="${existingUser.photo || ""}" style="width:56px;height:56px;border-radius:50%;object-fit:cover;background:#e2e8f0;border:2px solid #0057ff;" />
          <div>
            <div style="font-size:16px;font-weight:800;color:#0f172a;">${existingUser.name}</div>
            <div style="font-size:12px;color:#0057ff;font-weight:700;">पद: ${existingUser.seatId.toUpperCase()} 🔒 (स्थायी लॉक)</div>
            <div style="font-size:11.5px;color:#475569;">मोबाइल: ${existingUser.phone}</div>
          </div>
        </div>
        <div style="background:#fef9c3;border:1px solid #eab308;color:#854d0e;padding:7px 10px;border-radius:10px;font-size:11.5px;font-weight:700;margin-bottom:12px;">
          🔒 नियम: आपकी सदस्यता स्थायी रूप से लॉक है। आप खुद से नहीं हट सकते।
        </div>
        <label style="font-size:12px;font-weight:700;color:#334155;display:block;margin-bottom:4px;">नाम बदलें:</label>
        <input id="upd-name" type="text" value="${existingUser.name}" style="width:100%;padding:9px;border:1.5px solid #cbd5e1;border-radius:10px;margin-bottom:10px;font-size:14px;" />
        <label style="font-size:12px;font-weight:700;color:#334155;display:block;margin-bottom:4px;">प्रोफ़ाइल फ़ोटो बदलें:</label>
        <input id="upd-photo" type="file" accept="image/*" style="width:100%;font-size:12px;margin-bottom:14px;" />
        <div style="display:flex;gap:8px;">
          <button id="btn-save-prof" style="flex:1;padding:10px;background:#0057ff;color:#fff;border:none;border-radius:999px;font-weight:700;cursor:pointer;">सुरक्षित करें</button>
          <button id="btn-close-auth" style="padding:10px 16px;background:#e2e8f0;color:#0f172a;border:none;border-radius:999px;font-weight:700;cursor:pointer;">बंद</button>
        </div>
      </div>
    `;
  } else {
    // नया जुड़ने वाला फ़ॉर्म
    const seatOptions = [
      { id: "site-manager", label: "Site Manager (मुख्य संचालक)" },
      { id: "admin-1", label: "एडमिन 1" },
      { id: "admin-2", label: "एडमिन 2" },
      { id: "admin-3", label: "एडमिन 3" },
      { id: "admin-4", label: "एडमिन 4" },
      { id: "admin-5", label: "एडमिन 5" }
    ].map((s) => {
      const isTaken = members[s.id]?.locked;
      return `<option value="${s.id}" ${isTaken ? "disabled" : ""}>${s.label} ${isTaken ? "(पहले से लॉक)" : "(खाली)"}</option>`;
    }).join("");

    modal.innerHTML = `
      <div style="width:100%;max-width:370px;background:#fff;border-radius:18px;border:2px solid #0057ff;padding:18px;box-shadow:0 15px 35px rgba(0,0,0,0.35);">
        <h3 style="font-size:17px;font-weight:800;color:#0057ff;margin-bottom:4px;">KSJP एडमिन पंजीकरण</h3>
        <p style="font-size:12px;color:#475569;margin-bottom:12px;">एक बार जुड़ने के बाद पद स्थायी रूप से लॉक हो जाएगा।</p>
        
        <label style="font-size:12px;font-weight:700;display:block;margin-bottom:3px;">अपना पद चुनें:</label>
        <select id="join-seat" style="width:100%;padding:9px;border:1.5px solid #cbd5e1;border-radius:10px;margin-bottom:9px;font-size:13.5px;">
          ${seatOptions}
        </select>

        <label style="font-size:12px;font-weight:700;display:block;margin-bottom:3px;">पूरा नाम:</label>
        <input id="join-name" type="text" placeholder="अपना नाम लिखें" style="width:100%;padding:9px;border:1.5px solid #cbd5e1;border-radius:10px;margin-bottom:9px;font-size:14px;" />

        <label style="font-size:12px;font-weight:700;display:block;margin-bottom:3px;">मोबाइल नंबर (10 अंक):</label>
        <input id="join-phone" type="tel" maxlength="10" placeholder="98XXXXXXXX" style="width:100%;padding:9px;border:1.5px solid #cbd5e1;border-radius:10px;margin-bottom:9px;font-size:14px;" />

        <label style="font-size:12px;font-weight:700;display:block;margin-bottom:3px;">प्रोफ़ाइल फ़ोटो चुनें:</label>
        <input id="join-photo" type="file" accept="image/*" style="width:100%;font-size:12px;margin-bottom:14px;" />

        <div style="display:flex;gap:8px;">
          <button id="btn-submit-join" style="flex:1;padding:10px;background:#00c853;color:#fff;border:none;border-radius:999px;font-weight:800;cursor:pointer;">जुड़ें और लॉक करें</button>
          <button id="btn-close-auth" style="padding:10px 14px;background:#e2e8f0;color:#0f172a;border:none;border-radius:999px;font-weight:700;cursor:pointer;">रद्द</button>
        </div>
      </div>
    `;
  }

  document.body.appendChild(modal);
  document.getElementById("btn-close-auth").onclick = () => modal.remove();

  // फ़ोटो को छोटे आकार में बदलने वाला हेल्पर
  const readPhoto = (fileInput) => new Promise((resolve) => {
    const file = fileInput?.files?.[0];
    if (!file) return resolve("");
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.readAsDataURL(file);
  });

  if (existingUser) {
    document.getElementById("btn-save-prof").onclick = async () => {
      const newName = document.getElementById("upd-name").value;
      const newPhoto = await readPhoto(document.getElementById("upd-photo"));
      updateMemberProfile({ name: newName, photoDataUrl: newPhoto });
      modal.remove();
      if (onSuccessCallback) onSuccessCallback();
    };
  } else {
    document.getElementById("btn-submit-join").onclick = async () => {
      const seatId = document.getElementById("join-seat").value;
      const name = document.getElementById("join-name").value;
      const phone = document.getElementById("join-phone").value;
      const photoDataUrl = await readPhoto(document.getElementById("join-photo"));

      const res = registerAndLockMember({ seatId, name, phone, photoDataUrl });
      if (!res.ok) {
        alert(res.message);
        return;
      }
      modal.remove();
      if (onSuccessCallback) onSuccessCallback();
    };
  }
}
