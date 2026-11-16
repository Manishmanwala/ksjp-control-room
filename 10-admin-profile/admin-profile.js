// 10-admin-profile/admin-profile.js
// Admin Profile Page Controller (Continuing with existing core structure)

export function showAdminProfilePage() {
    // अगर पहले से पेज बना है तो उसे दोबारा न बनाएँ
    if (document.getElementById("admin-profile-container")) return;

    const container = document.createElement("div");
    container.id = "admin-profile-container";
    container.className = "admin-profile-page";

    container.innerHTML = `
        <div class="profile-top-bar">
            <button class="profile-back-btn" id="close-profile-btn">⬅ वापस</button>
            <h2 class="ap-header-title">एडमिन प्रोफाइल</h2>
        </div>

        <div class="profile-content-body">
            <!-- Banner & Profile Section -->
            <div class="ap-banner-section">
                <div class="ap-banner-bg"></div>
                <div class="ap-profile-card-center">
                    <div class="ap-avatar-ring">
                        <img src="https://via.placeholder.com/120" alt="Admin Avatar">
                    </div>
                    <h3 class="ap-admin-name">मनीष कश्यप</h3>
                    <p class="ap-admin-role">मुख्य एडमिन • KSJP Control Room</p>
                </div>
            </div>

            <!-- Navigation Tabs Section -->
            <div class="ap-tabs-wrapper">
                <div class="ap-tab-buttons">
                    <button class="ap-tab-btn active" data-target="tab-profile">प्रोफ़ाइल</button>
                    <button class="ap-tab-btn" data-target="tab-tools">औजार</button>
                    <button class="ap-tab-btn" data-target="tab-settings">सेटिंग्स</button>
                </div>

                <div class="ap-tab-content-area">
                    <!-- Tab 1: Profile -->
                    <div id="tab-profile" class="ap-tab-pane active">
                        <div class="ap-info-group">
                            <label>मोबाईल नंबर</label>
                            <p>+91 7828095670</p>
                        </div>
                        <div class="ap-info-group">
                            <label>स्थायी सदस्यता</label>
                            <p>सक्रिय (Verified)</p>
                        </div>
                        <div class="ap-info-group">
                            <label>गाँव / क्षेत्र</label>
                            <p>हमीरपुर, बमोरी, गुना (म.प्र.)</p>
                        </div>
                    </div>

                    <!-- Tab 2: Tools -->
                    <div id="tab-tools" class="ap-tab-pane">
                        <div class="ap-tool-item">
                            <span>सुरक्षा शील्ड (E2E)</span>
                            <span class="ap-badge-green">सक्रिय</span>
                        </div>
                        <div class="ap-tool-item">
                            <span>वाइस ब्रिज कनेक्शन</span>
                            <span class="ap-badge-green">ऑनलाइन</span>
                        </div>
                        <div class="ap-tool-item">
                            <span>मास्टर रीसेट टूल</span>
                            <span class="ap-badge-orange">नियंत्रित</span>
                        </div>
                    </div>

                    <!-- Tab 3: Settings -->
                    <div id="tab-settings" class="ap-tab-pane">
                        <div class="ap-setting-row">
                            <span>डार्क / लाइट मोड</span>
                            <button id="ap-toggle-theme" class="ap-action-sub-btn">बदलें</button>
                        </div>
                        <div class="ap-setting-row">
                            <span>वॉलपेपर सेटिंग्स</span>
                            <button id="ap-wallpaper-btn" class="ap-action-sub-btn">चुनें</button>
                        </div>
                        <div class="ap-setting-row">
                            <span>अबाउट दिस वेब/ऐप</span>
                            <button id="ap-about-btn" class="ap-action-sub-btn">देखें</button>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Remove / Delete Action Box -->
            <div class="ap-danger-zone">
                <button id="ap-remove-profile-btn" class="ap-danger-btn">हटाएं (Remove Profile Data)</button>
            </div>
        </div>
    `;

    document.body.appendChild(container);

    // बैक बटन दबाने पर यह पेज बंद होकर वापस मुख्य पैनल पर ले आएगा (कंटिन्यूटी बरकरार)
    document.getElementById("close-profile-btn").addEventListener("click", () => {
        container.remove();
    });

    // Tab Switching Logic
    const tabBtns = container.querySelectorAll('.ap-tab-btn');
    const tabPanes = container.querySelectorAll('.ap-tab-pane');

    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            tabBtns.forEach(b => b.classList.remove('active'));
            tabPanes.forEach(p => p.classList.remove('active'));

            btn.classList.add('active');
            const targetId = btn.getAttribute('data-target');
            container.querySelector(`#${targetId}`).classList.add('active');
        });
    });

    // Button Actions
    container.querySelector('#ap-toggle-theme').addEventListener('click', () => {
        alert('डार्क/लाइट मोड जल्द सक्रिय होगा!');
    });

    container.querySelector('#ap-about-btn').addEventListener('click', () => {
        alert('KSJP Control Room - Developed by Manish Kashyap.');
    });
}
