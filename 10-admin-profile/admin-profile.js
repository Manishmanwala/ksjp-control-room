export function showAdminProfilePage() {
  // अगर पहले से पेज बना है तो उसे दोबारा न बनाएँ
  if (document.getElementById("admin-profile-container")) return;

  const container = document.createElement("div");
  container.id = "admin-profile-container";
  container.className = "admin-profile-page";

  container.innerHTML = `
    <div class="profile-top-bar">
      <button class="profile-back-btn" id="close-profile-btn">⬅ वापस</button>
    </div>
    <div class="profile-content-body">
      <p>खाली प्रोफ़ाइल पेज (ग्रे पैटर्न के साथ)</p>
    </div>
  `;

  document.body.appendChild(container);

  // बैक बटन दबाने पर यह पेज बंद होकर वापस मुख्य पैनल पर ले आएगा
  document.getElementById("close-profile-btn").addEventListener("click", () => {
    container.remove();
  });
}