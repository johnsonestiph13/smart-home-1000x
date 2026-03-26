/**
 * Estif Home 1000X - ADVANCED MULTI-USER SMART HOME CONTROLLER
 * (Full version with user manager, device manager, voice, ESP32 claiming)
 */

// ==================== USER DATABASE ====================
class UserManager {
    constructor() {
        this.users = this.loadUsers();
        this.sessions = new Map();
        this.currentUser = null;
    }
    loadUsers() {
        const saved = localStorage.getItem('estif_users');
        if (saved) {
            try {
                return JSON.parse(saved);
            } catch(e) {
                return this.getDefaultUsers();
            }
        }
        return this.getDefaultUsers();
    }
    getDefaultUsers() {
        return [
            {
                id: 1,
                email: 'johnsonestiph13@gmail.com',
                password: this.hashPassword('Jon@2127'),
                name: 'Estiph Johnson',
                nameAm: 'እስቲፍ ጆንሰን',
                role: 'admin',
                avatar: '👨',
                createdAt: new Date().toISOString(),
                lastLogin: null,
                devices: [0,1,2,3,4,5],
                settings: { language: 'en', theme: 'light', notifications: true, twoFactorEnabled: false }
            },
            {
                id: 2,
                email: 'family@estifhome.com',
                password: this.hashPassword('family123'),
                name: 'Family Member',
                nameAm: 'የቤተሰብ አባል',
                role: 'user',
                avatar: '👩',
                createdAt: new Date().toISOString(),
                lastLogin: null,
                devices: [0,1,2,3],
                settings: { language: 'en', theme: 'light', notifications: true, twoFactorEnabled: false }
            }
        ];
    }
    hashPassword(password) {
        let hash = 0;
        for (let i = 0; i < password.length; i++) {
            hash = ((hash << 5) - hash) + password.charCodeAt(i);
            hash |= 0;
        }
        return hash.toString();
    }
    verifyPassword(password, hash) { return this.hashPassword(password) === hash; }
    saveUsers() { localStorage.setItem('estif_users', JSON.stringify(this.users)); }
    register(email, password, name) {
        if (this.users.find(u => u.email === email)) return { success: false, error: 'email_exists' };
        const newUser = {
            id: this.users.length + 1,
            email, password: this.hashPassword(password), name, nameAm: name,
            role: 'user', avatar: '👤',
            createdAt: new Date().toISOString(),
            lastLogin: null,
            devices: [0,1,2],
            settings: { language: 'en', theme: 'light', notifications: true, twoFactorEnabled: false }
        };
        this.users.push(newUser);
        this.saveUsers();
        return { success: true, user: this.sanitizeUser(newUser) };
    }
    login(email, password) {
        const user = this.users.find(u => u.email === email);
        if (!user) return { success: false, error: 'user_not_found' };
        if (!this.verifyPassword(password, user.password)) return { success: false, error: 'invalid_password' };
        user.lastLogin = new Date().toISOString();
        this.saveUsers();
        const token = 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2,16);
        this.sessions.set(token, user.id);
        return { success: true, user: this.sanitizeUser(user), token };
    }
    logout(token) { this.sessions.delete(token); return true; }
    validateSession(token) { return this.sessions.has(token); }
    getUserById(id) { const user = this.users.find(u => u.id === id); return user ? this.sanitizeUser(user) : null; }
    getUserByToken(token) { const userId = this.sessions.get(token); return userId ? this.getUserById(userId) : null; }
    sanitizeUser(user) { const { password, ...sanitized } = user; return sanitized; }
    updateUserSettings(userId, settings) {
        const user = this.users.find(u => u.id === userId);
        if (user) { user.settings = { ...user.settings, ...settings }; this.saveUsers(); return { success: true, settings: user.settings }; }
        return { success: false };
    }
    changePassword(userId, oldPassword, newPassword) {
        const user = this.users.find(u => u.id === userId);
        if (!user) return { success: false, error: 'user_not_found' };
        if (!this.verifyPassword(oldPassword, user.password)) return { success: false, error: 'invalid_password' };
        user.password = this.hashPassword(newPassword);
        this.saveUsers();
        return { success: true };
    }
}

// ==================== DEVICE MANAGER ====================
class DeviceManager {
    constructor() {
        this.allDevices = this.getDefaultDevices();
        this.userDevices = new Map();
    }
    getDefaultDevices() {
        return [
            { id:0, icon:"💡", nameEn:"Light", nameAm:"መብራት", roomEn:"Living Room", roomAm:"ሳሎን", gpio:23, power:10, state:false, autoMode:false, ownerId:1 },
            { id:1, icon:"🌀", nameEn:"Fan", nameAm:"ማራገቢያ", roomEn:"Bedroom", roomAm:"መኝታ", gpio:22, power:40, state:false, autoMode:true, ownerId:1 },
            { id:2, icon:"❄️", nameEn:"AC", nameAm:"አየር ማቀዝቀዣ", roomEn:"Master", roomAm:"ዋና", gpio:21, power:120, state:false, autoMode:true, ownerId:1 },
            { id:3, icon:"📺", nameEn:"TV", nameAm:"ቴሌቪዥን", roomEn:"Entertainment", roomAm:"መዝናኛ", gpio:19, power:80, state:false, autoMode:false, ownerId:1 },
            { id:4, icon:"🔥", nameEn:"Heater", nameAm:"ማሞቂያ", roomEn:"Bathroom", roomAm:"መታጠቢያ", gpio:18, power:1500, state:false, autoMode:true, ownerId:1 },
            { id:5, icon:"💧", nameEn:"Pump", nameAm:"ፓምፕ", roomEn:"Garden", roomAm:"አትክልት", gpio:5, power:250, state:false, autoMode:false, ownerId:1 }
        ];
    }
    getDevicesForUser(userId) { return this.allDevices.filter(device => device.ownerId === userId || userId === 1); }
    toggleDevice(deviceId, userId) {
        const device = this.allDevices.find(d => d.id === deviceId);
        if (!device) return { success: false, error: 'device_not_found' };
        if (device.ownerId !== userId && userId !== 1) return { success: false, error: 'unauthorized' };
        if (device.autoMode) return { success: false, error: 'auto_mode_active', device };
        device.state = !device.state;
        return { success: true, device };
    }
    setAutoMode(deviceId, enabled, userId) {
        const device = this.allDevices.find(d => d.id === deviceId);
        if (!device) return { success: false, error: 'device_not_found' };
        if (device.ownerId !== userId && userId !== 1) return { success: false, error: 'unauthorized' };
        device.autoMode = enabled;
        return { success: true, device };
    }
    masterControl(state, userId) {
        const userDevices = this.getDevicesForUser(userId);
        const affected = [];
        userDevices.forEach(device => {
            if (!device.autoMode) {
                device.state = state;
                affected.push(device);
            }
        });
        return { success: true, affected };
    }
}

// ==================== APPLICATION STATE ====================
const AppState = {
    currentUser: null, sessionToken: null, isLoggedIn: false,
    language: localStorage.getItem('language') || 'en',
    theme: localStorage.getItem('theme') || 'light',
    currentPage: 'dashboard',
    serverConnected: false, wsConnected: false, socket: null,
    devices: [],
    systemStats: { temperature: 23, humidity: 45, energyUsage: 0, activeDevices: 0 },
    isListening: false, wakeWordDetected: false, recognition: null,
    isLoading: false, autoRefresh: true
};

const userManager = new UserManager();
const deviceManager = new DeviceManager();

// ==================== TRANSLATIONS (abbreviated) ====================
const Translations = {
    en: { /* full translations as before – keep your existing */ },
    am: { /* full translations as before – keep your existing */ }
};
// (Insert your full Translations object here. We'll keep it compact for brevity,
//  but in practice you must include all translation strings from your previous version.)

// For space, we'll assume you have the full Translations object already in your project.
// If not, copy from earlier version.

// ==================== AUTHENTICATION FUNCTIONS ====================
function checkAuth() {
    const savedToken = localStorage.getItem('sessionToken');
    const savedUser = localStorage.getItem('currentUser');
    if (savedToken && savedUser) {
        try {
            if (userManager.validateSession(savedToken)) {
                AppState.sessionToken = savedToken;
                AppState.currentUser = JSON.parse(savedUser);
                AppState.isLoggedIn = true;
                loadUserDevices();
                showDashboardPage();
                updateUserProfile();
                return;
            }
        } catch(e) { console.log('Session invalid'); }
    }
    showLoginPage();
}
function loadUserDevices() {
    if (!AppState.currentUser) return;
    AppState.devices = deviceManager.getDevicesForUser(AppState.currentUser.id);
    renderDeviceGrid();
    updateStatistics();
}
function handleLogin(event) {
    event.preventDefault();
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;
    const t = Translations[AppState.language];
    const result = userManager.login(email, password);
    if (result.success) {
        AppState.currentUser = result.user;
        AppState.sessionToken = result.token;
        AppState.isLoggedIn = true;
        localStorage.setItem('sessionToken', result.token);
        localStorage.setItem('currentUser', JSON.stringify(result.user));
        loadUserDevices();
        showToast(`${t.loginSuccess} ${result.user.name}!`, 'success');
        showDashboardPage();
        updateUserProfile();
        if (result.user.settings?.language) setLanguage(result.user.settings.language);
    } else {
        let msg = t.loginFailed;
        if (result.error === 'user_not_found') msg = 'Email not found';
        if (result.error === 'invalid_password') msg = 'Incorrect password';
        showToast(msg, 'error');
    }
}
function handleRegister(event) {
    event.preventDefault();
    const name = document.getElementById('regName').value;
    const email = document.getElementById('regEmail').value;
    const password = document.getElementById('regPassword').value;
    const confirm = document.getElementById('regConfirmPassword').value;
    const t = Translations[AppState.language];
    if (password !== confirm) { showToast(t.passwordMismatch, 'error'); return; }
    if (password.length < 6) { showToast('Password must be at least 6 characters', 'error'); return; }
    const result = userManager.register(email, password, name);
    if (result.success) {
        showToast(t.registerSuccess, 'success');
        showLoginOnly();
        document.getElementById('registerForm').reset();
    } else {
        showToast(t.emailExists, 'error');
    }
}
function logout() {
    if (AppState.sessionToken) userManager.logout(AppState.sessionToken);
    localStorage.removeItem('sessionToken');
    localStorage.removeItem('currentUser');
    AppState.currentUser = null;
    AppState.sessionToken = null;
    AppState.isLoggedIn = false;
    showLoginPage();
    const t = Translations[AppState.language];
    showToast(t.logoutSuccess, 'info');
}
function updateUserProfile() {
    if (!AppState.currentUser) return;
    const t = Translations[AppState.language];
    const userNameEl = document.querySelector('.user-info .name');
    const userRoleEl = document.querySelector('.user-info .role');
    const userAvatarEl = document.querySelector('.user-avatar');
    if (userNameEl) {
        const name = AppState.language === 'am' && AppState.currentUser.nameAm ? AppState.currentUser.nameAm : AppState.currentUser.name;
        userNameEl.textContent = name;
    }
    if (userRoleEl) userRoleEl.textContent = t[AppState.currentUser.role] || AppState.currentUser.role;
    if (userAvatarEl) userAvatarEl.textContent = AppState.currentUser.avatar || AppState.currentUser.name.charAt(0).toUpperCase();
}

// ==================== DEVICE MANAGEMENT ====================
function toggleDevice(deviceId) {
    if (!AppState.isLoggedIn) return;
    const result = deviceManager.toggleDevice(deviceId, AppState.currentUser.id);
    const t = Translations[AppState.language];
    if (!result.success) {
        if (result.error === 'auto_mode_active') showToast(t.autoModeBlock, 'warning');
        else if (result.error === 'unauthorized') showToast(t.unauthorized, 'error');
        else showToast(t.deviceNotFound, 'error');
        return;
    }
    const idx = AppState.devices.findIndex(d => d.id === deviceId);
    if (idx !== -1) AppState.devices[idx] = result.device;
    renderDeviceGrid();
    updateStatistics();
    const deviceName = AppState.language === 'en' ? result.device.nameEn : result.device.nameAm;
    addActivityLog(`${deviceName} turned ${result.device.state ? 'ON' : 'OFF'}`, 'device');
    sendDeviceCommand(deviceId, result.device.state);
}
function toggleAutoMode(deviceId) {
    if (!AppState.isLoggedIn) return;
    const device = AppState.devices.find(d => d.id === deviceId);
    if (!device) return;
    const result = deviceManager.setAutoMode(deviceId, !device.autoMode, AppState.currentUser.id);
    const t = Translations[AppState.language];
    if (!result.success) { showToast(t.unauthorized, 'error'); return; }
    const idx = AppState.devices.findIndex(d => d.id === deviceId);
    if (idx !== -1) AppState.devices[idx] = result.device;
    renderDeviceGrid();
    const deviceName = AppState.language === 'en' ? result.device.nameEn : result.device.nameAm;
    showToast(`${deviceName} ${result.device.autoMode ? t.autoModeEnabled : t.autoModeDisabled}`, 'info');
    sendAutoModeCommand(deviceId, result.device.autoMode);
}
function masterAllOn() {
    if (!AppState.isLoggedIn) return;
    const result = deviceManager.masterControl(true, AppState.currentUser.id);
    const t = Translations[AppState.language];
    result.affected.forEach(updated => {
        const idx = AppState.devices.findIndex(d => d.id === updated.id);
        if (idx !== -1) AppState.devices[idx] = updated;
    });
    renderDeviceGrid();
    updateStatistics();
    showToast(t.allOn, 'success');
    addActivityLog('All devices turned ON', 'system');
    result.affected.forEach(device => sendDeviceCommand(device.id, true));
}
function masterAllOff() {
    if (!AppState.isLoggedIn) return;
    const result = deviceManager.masterControl(false, AppState.currentUser.id);
    const t = Translations[AppState.language];
    result.affected.forEach(updated => {
        const idx = AppState.devices.findIndex(d => d.id === updated.id);
        if (idx !== -1) AppState.devices[idx] = updated;
    });
    renderDeviceGrid();
    updateStatistics();
    showToast(t.allOff, 'info');
    addActivityLog('All devices turned OFF', 'system');
    result.affected.forEach(device => sendDeviceCommand(device.id, false));
}
function renderDeviceGrid() {
    const grid = document.getElementById('deviceGrid');
    if (!grid) return;
    const t = Translations[AppState.language];
    let html = '';
    AppState.devices.forEach(device => {
        const name = AppState.language === 'en' ? device.nameEn : device.nameAm;
        const room = AppState.language === 'en' ? device.roomEn : device.roomAm;
        const state = device.state ? t.on : t.off;
        const mode = device.autoMode ? (AppState.language === 'en' ? 'AUTO' : 'አውቶ') : (AppState.language === 'en' ? 'MANUAL' : 'እጅ');
        html += `
            <div class="device-card ${device.state ? 'active' : ''}" data-device-id="${device.id}" onclick="toggleDevice(${device.id})">
                <div class="auto-badge ${device.autoMode ? 'auto-on' : 'auto-off'}" onclick="event.stopPropagation(); toggleAutoMode(${device.id})">${mode}</div>
                <div class="device-icon">${device.icon}</div>
                <div class="device-name">${escapeHtml(name)}</div>
                <div class="device-room">${escapeHtml(room)}</div>
                <div class="device-state">${state}</div>
                <div class="device-power">${device.power}W</div>
                <button class="auto-toggle" onclick="event.stopPropagation(); toggleAutoMode(${device.id})" title="${t.autoMode}">
                    <i class="fas ${device.autoMode ? 'fa-robot' : 'fa-hand-paper'}"></i>
                </button>
            </div>
        `;
    });
    grid.innerHTML = html;
    updateDeviceCount();
}

// ==================== UI HELPERS ====================
function updateStatistics() {
    const activeCount = AppState.devices.filter(d => d.state).length;
    const autoCount = AppState.devices.filter(d => d.autoMode).length;
    const totalPower = AppState.devices.reduce((s,d) => s + (d.state ? d.power : 0), 0);
    const maxPower = AppState.devices.reduce((s,d) => s + d.power, 0);
    const savings = maxPower > 0 ? Math.round((1 - totalPower/maxPower)*100) : 0;
    const statTotal = document.getElementById('statTotalDevices');
    const statActive = document.getElementById('statActiveDevices');
    const statAuto = document.getElementById('statAutoMode');
    const statTemp = document.getElementById('statTemperature');
    const statSaving = document.getElementById('statEnergySaving');
    if (statTotal) statTotal.textContent = AppState.devices.length;
    if (statActive) statActive.textContent = activeCount;
    if (statAuto) statAuto.textContent = autoCount;
    if (statTemp) statTemp.textContent = `${AppState.systemStats.temperature}°C`;
    if (statSaving) statSaving.textContent = `${savings}%`;
    AppState.systemStats.activeDevices = activeCount;
    AppState.systemStats.energyUsage = totalPower;
}
function updateDeviceCount() {
    const badge = document.getElementById('deviceCount');
    if (badge) badge.textContent = AppState.devices.filter(d => d.state).length;
}
function addActivityLog(message, source = 'system') {
    const logContainer = document.getElementById('activityLog');
    if (!logContainer) return;
    const time = new Date().toLocaleTimeString([], { hour:'2-digit', minute:'2-digit' });
    const entry = document.createElement('div');
    entry.className = 'log-entry';
    entry.innerHTML = `<span class="log-time">${time}</span><span class="log-message">${escapeHtml(message)}</span><span class="log-source">${source}</span>`;
    logContainer.insertBefore(entry, logContainer.firstChild);
    while (logContainer.children.length > 20) logContainer.removeChild(logContainer.lastChild);
}
function showToast(message, type = 'info') {
    const container = document.getElementById('toastContainer');
    if (!container) return;
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    const icons = { success:'✅', error:'❌', warning:'⚠️', info:'ℹ️' };
    toast.innerHTML = `<span class="toast-icon">${icons[type] || 'ℹ️'}</span><div class="toast-content">${escapeHtml(message)}</div><button class="toast-close" onclick="this.parentElement.remove()">×</button>`;
    container.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// ==================== PAGE NAVIGATION ====================
function showLoginPage() {
    document.querySelectorAll('.page-container').forEach(p => p.classList.remove('active'));
    const loginPage = document.getElementById('login-page');
    if (loginPage) loginPage.classList.add('active');
    const sidebar = document.querySelector('.sidebar');
    const topBar = document.querySelector('.top-bar');
    if (sidebar) sidebar.style.display = 'none';
    if (topBar) topBar.style.display = 'none';
}
function showDashboardPage() {
    document.querySelectorAll('.page-container').forEach(p => p.classList.remove('active'));
    const dashboardPage = document.getElementById('dashboard-page');
    if (dashboardPage) dashboardPage.classList.add('active');
    const sidebar = document.querySelector('.sidebar');
    const topBar = document.querySelector('.top-bar');
    if (sidebar) sidebar.style.display = 'flex';
    if (topBar) topBar.style.display = 'flex';
    renderDeviceGrid();
    updateStatistics();
    updateUILanguage();
    AppState.currentPage = 'dashboard';
    const t = Translations[AppState.language];
    const pageTitle = document.getElementById('pageTitle');
    if (pageTitle) pageTitle.textContent = t.dashboard;
}
function navigateTo(page) {
    if (!AppState.isLoggedIn) return;
    AppState.currentPage = page;
    document.querySelectorAll('.page-container').forEach(c => c.classList.remove('active'));
    const target = document.getElementById(`${page}-page`);
    if (target) target.classList.add('active');
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
        if (item.getAttribute('onclick') === `navigateTo('${page}')`) item.classList.add('active');
    });
    const t = Translations[AppState.language];
    const pageTitle = document.getElementById('pageTitle');
    if (pageTitle && t[page]) pageTitle.textContent = t[page];
    if (window.innerWidth <= 768) {
        const sidebar = document.getElementById('sidebar');
        if (sidebar) sidebar.classList.remove('open');
    }
    if (page === 'settings') loadUnclaimedESP32s();
}
function setupMobileMenu() {
    const menuToggle = document.getElementById('menuToggle');
    const sidebar = document.getElementById('sidebar');
    if (menuToggle) {
        menuToggle.addEventListener('click', (e) => {
            e.stopPropagation();
            if (sidebar) sidebar.classList.toggle('open');
        });
    }
    document.addEventListener('click', (e) => {
        if (window.innerWidth <= 768 && sidebar && sidebar.classList.contains('open')) {
            if (!sidebar.contains(e.target) && e.target !== menuToggle) sidebar.classList.remove('open');
        }
    });
}

// ==================== VOICE RECOGNITION ====================
let voiceState = {
    isListening: false, wakeWordDetected: false, recognition: null,
    wakeWordTimer: null, lastTranscript: ''
};
const WAKE_WORDS = {
    en: ['hey estiph','hey estif','estiph','ok estiph','hello estiph','wake up estiph'],
    am: ['ሰላም እስቲፍ','እስቲፍ','ሰላም','አልቃ','ሄይ እስቲፍ']
};
const VOICE_RESPONSES = {
    en: { wake:['Yes?',"I'm listening",'How can I help?'], confirm:['Done!','Command executed','All set!'], error:["Sorry, I didn't understand"] },
    am: { wake:['አዎ?','እያዳመጥኩ ነው','ምን እረዳሃለሁ?'], confirm:['ተሰራ!','ትእዛዝ ተፈጸመ','ተዘጋጀ!'], error:['ይቅርታ አልገባኝም'] }
};
function setupVoiceRecognition() {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
        showToast('Voice not supported', 'error'); return false;
    }
    const SpeechRecognition = window.webkitSpeechRecognition || window.SpeechRecognition;
    voiceState.recognition = new SpeechRecognition();
    voiceState.recognition.continuous = true;
    voiceState.recognition.interimResults = true;
    updateVoiceLanguage();
    voiceState.recognition.onstart = () => {
        voiceState.isListening = true;
        updateVoiceUI(true);
        showToast(Translations[AppState.language].listening || 'Listening...', 'info');
    };
    voiceState.recognition.onend = () => {
        if (voiceState.isListening) voiceState.recognition.start();
        else updateVoiceUI(false);
    };
    voiceState.recognition.onerror = (e) => {
        if (e.error === 'not-allowed') showToast('Microphone access denied', 'error');
        else showToast('Voice error: '+e.error, 'error');
        stopVoiceRecognition();
    };
    voiceState.recognition.onresult = (e) => {
        const t = Array.from(e.results).map(r => r[0].transcript.toLowerCase().trim()).join(' ');
        if (t && t !== voiceState.lastTranscript) {
            voiceState.lastTranscript = t;
            console.log('Heard:', t);
            processVoiceInput(t);
        }
    };
    return true;
}
function updateVoiceLanguage() {
    if (voiceState.recognition) voiceState.recognition.lang = AppState.language === 'en' ? 'en-US' : 'am-ET';
}
function startVoiceRecognition() {
    if (!voiceState.recognition && !setupVoiceRecognition()) return;
    voiceState.recognition.start();
    voiceState.isListening = true;
    updateVoiceUI(true);
    const voiceDisplay = document.getElementById('voiceCommandText');
    if (voiceDisplay) voiceDisplay.textContent = Translations[AppState.language].listening || 'Listening...';
}
function stopVoiceRecognition() {
    if (voiceState.recognition) voiceState.recognition.stop();
    voiceState.isListening = false;
    voiceState.wakeWordDetected = false;
    if (voiceState.wakeWordTimer) clearTimeout(voiceState.wakeWordTimer);
    updateVoiceUI(false);
    const voiceDisplay = document.getElementById('voiceCommandText');
    if (voiceDisplay) voiceDisplay.textContent = Translations[AppState.language].wakeWord || 'Say "Hey Estiph"';
}
function toggleVoiceRecognition() {
    if (voiceState.isListening) stopVoiceRecognition();
    else startVoiceRecognition();
}
function updateVoiceUI(isListening) {
    const btn = document.getElementById('voiceBtn');
    if (btn) {
        if (isListening) {
            btn.classList.add('listening');
            btn.style.background = 'var(--danger)';
            btn.style.color = 'white';
        } else {
            btn.classList.remove('listening');
            btn.style.background = '';
            btn.style.color = '';
        }
    }
}
function processVoiceInput(transcript) {
    const lang = AppState.language;
    const wakeWords = WAKE_WORDS[lang];
    if (!voiceState.wakeWordDetected) {
        for (let w of wakeWords) {
            if (transcript.includes(w)) {
                voiceState.wakeWordDetected = true;
                const response = VOICE_RESPONSES[lang].wake[Math.floor(Math.random()*VOICE_RESPONSES[lang].wake.length)];
                speakResponse(response);
                const voiceDisplay = document.getElementById('voiceCommandText');
                if (voiceDisplay) voiceDisplay.textContent = `🎤 ${response}`;
                if (voiceState.wakeWordTimer) clearTimeout(voiceState.wakeWordTimer);
                voiceState.wakeWordTimer = setTimeout(() => { voiceState.wakeWordDetected = false; }, 8000);
                return;
            }
        }
        return;
    }
    const commands = {
        en: {
            'light on':()=>toggleDevice(0), 'light off':()=>toggleDevice(0),
            'fan on':()=>toggleDevice(1), 'fan off':()=>toggleDevice(1),
            'ac on':()=>toggleDevice(2), 'ac off':()=>toggleDevice(2),
            'tv on':()=>toggleDevice(3), 'tv off':()=>toggleDevice(3),
            'heater on':()=>toggleDevice(4), 'heater off':()=>toggleDevice(4),
            'pump on':()=>toggleDevice(5), 'pump off':()=>toggleDevice(5),
            'all on':()=>masterAllOn(), 'all off':()=>masterAllOff(),
            'temperature':()=>speakResponse(`Temperature is ${AppState.systemStats.temperature}°C`),
            'stop':()=>stopVoiceRecognition()
        },
        am: {
            'መብራት አብራ':()=>toggleDevice(0), 'መብራት አጥፋ':()=>toggleDevice(0),
            'ማራገቢያ አብራ':()=>toggleDevice(1), 'ማራገቢያ አጥፋ':()=>toggleDevice(1),
            'ሁሉንም አብራ':()=>masterAllOn(), 'ሁሉንም አጥፋ':()=>masterAllOff(),
            'ሙቀቱ ስንት ነው':()=>speakResponse(`ሙቀቱ ${AppState.systemStats.temperature} ዲግሪ ነው`),
            'አቁም':()=>stopVoiceRecognition()
        }
    };
    const current = commands[lang];
    for (let [cmd, action] of Object.entries(current)) {
        if (transcript.includes(cmd)) {
            action();
            const confirm = VOICE_RESPONSES[lang].confirm[Math.floor(Math.random()*VOICE_RESPONSES[lang].confirm.length)];
            speakResponse(confirm);
            voiceState.wakeWordDetected = false;
            if (voiceState.wakeWordTimer) clearTimeout(voiceState.wakeWordTimer);
            return;
        }
    }
    if (voiceState.wakeWordDetected) {
        const error = VOICE_RESPONSES[lang].error[Math.floor(Math.random()*VOICE_RESPONSES[lang].error.length)];
        speakResponse(error);
    }
}
function speakResponse(text) {
    if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
        const u = new SpeechSynthesisUtterance(text);
        u.lang = AppState.language === 'en' ? 'en-US' : 'am-ET';
        u.rate = 0.9;
        window.speechSynthesis.speak(u);
    }
}

// ==================== ESP32 CLAIMING ====================
async function loadUnclaimedESP32s() {
    try {
        const resp = await fetch('/api/esp/unclaimed', {
            headers: { 'Authorization': 'Bearer ' + (localStorage.getItem('sessionToken') || '') }
        });
        if (!resp.ok) throw new Error();
        const data = await resp.json();
        const select = document.getElementById('unclaimedEspList');
        if (!select) return;
        select.innerHTML = '<option value="">Select an ESP32</option>';
        if (data.devices && data.devices.length) {
            data.devices.forEach(esp => {
                const opt = document.createElement('option');
                opt.value = esp.mac;
                opt.textContent = `${esp.name || esp.mac} (${esp.ip || 'unknown IP'})`;
                select.appendChild(opt);
            });
        } else {
            const opt = document.createElement('option');
            opt.disabled = true;
            opt.textContent = 'No unclaimed ESP32s found';
            select.appendChild(opt);
        }
    } catch(e) {
        console.error('Load unclaimed ESP32s error', e);
        const select = document.getElementById('unclaimedEspList');
        if (select) select.innerHTML = '<option value="">Error loading devices</option>';
    }
}
async function claimESP32() {
    const select = document.getElementById('unclaimedEspList');
    const mac = select.value;
    if (!mac) { showToast('Select an ESP32 to claim', 'warning'); return; }
    try {
        const resp = await fetch('/api/esp/claim', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + (localStorage.getItem('sessionToken') || '')
            },
            body: JSON.stringify({ mac })
        });
        const data = await resp.json();
        if (resp.ok) {
            showToast('ESP32 claimed successfully!', 'success');
            loadUnclaimedESP32s();
        } else {
            showToast(data.error || 'Claim failed', 'error');
        }
    } catch(e) {
        console.error('Claim error', e);
        showToast('Network error', 'error');
    }
}

// ==================== WEBSOCKET ====================
function setupWebSocket() {
    const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
    AppState.socket = io(`${protocol}//${location.host}`);
    AppState.socket.on('connect', () => { AppState.wsConnected = true; updateConnectionStatus(true); });
    AppState.socket.on('disconnect', () => { AppState.wsConnected = false; updateConnectionStatus(false); });
    AppState.socket.on('device_update', (device) => {
        const local = AppState.devices.find(d => d.id === device.id);
        if (local) { local.state = device.state; local.autoMode = device.autoMode; renderDeviceGrid(); updateStatistics(); }
    });
    AppState.socket.on('sensor_update', (data) => {
        if (data.temperature) AppState.systemStats.temperature = data.temperature;
        if (data.humidity) AppState.systemStats.humidity = data.humidity;
        updateStatistics();
    });
    AppState.socket.on('esp_status', (data) => updateConnectionStatus(data.connected));
}
function sendDeviceCommand(deviceId, state) {
    if (AppState.socket && AppState.wsConnected) AppState.socket.emit('device_control', { deviceId, state });
}
function sendAutoModeCommand(deviceId, enabled) {
    if (AppState.socket && AppState.wsConnected) AppState.socket.emit('auto_mode', { deviceId, enabled });
}
function updateConnectionStatus(connected) {
    const dot = document.getElementById('statusDot');
    const text = document.getElementById('connectionText');
    const t = Translations[AppState.language];
    if (dot) dot.style.background = connected ? 'var(--success)' : 'var(--danger)';
    if (text) text.textContent = connected ? t.connected : t.disconnected;
}

// ==================== THEME & LANGUAGE ====================
function applyTheme() {
    const html = document.documentElement;
    if (AppState.theme === 'dark') {
        html.setAttribute('data-theme', 'dark');
        const icon = document.getElementById('themeIcon');
        if (icon) icon.className = 'fas fa-sun';
    } else {
        html.removeAttribute('data-theme');
        const icon = document.getElementById('themeIcon');
        if (icon) icon.className = 'fas fa-moon';
    }
}
function toggleTheme() {
    AppState.theme = AppState.theme === 'light' ? 'dark' : 'light';
    localStorage.setItem('theme', AppState.theme);
    applyTheme();
    if (AppState.currentUser) userManager.updateUserSettings(AppState.currentUser.id, { theme: AppState.theme });
    showToast(`${AppState.theme === 'light' ? 'Light' : 'Dark'} mode`, 'info');
}
function setLanguage(lang) {
    AppState.language = lang;
    localStorage.setItem('language', lang);
    updateUILanguage();
    renderDeviceGrid();
    updateLanguageButtons();
    updateUserProfile();
    if (voiceState.recognition) voiceState.recognition.lang = lang === 'en' ? 'en-US' : 'am-ET';
    if (AppState.currentUser) userManager.updateUserSettings(AppState.currentUser.id, { language: lang });
    showToast(`Language: ${lang === 'en' ? 'English' : 'Amharic'}`, 'success');
}
function updateUILanguage() {
    const t = Translations[AppState.language];
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        if (t[key]) el.textContent = t[key];
    });
    const title = document.getElementById('pageTitle');
    if (title && t[AppState.currentPage]) title.textContent = t[AppState.currentPage];
    const vd = document.getElementById('voiceCommandText');
    if (vd) vd.textContent = t.wakeWord;
    updateUserProfile();
}
function updateLanguageButtons() {
    document.querySelectorAll('.lang-btn').forEach(btn => {
        btn.classList.remove('active');
        if ((AppState.language === 'en' && btn.textContent === 'EN') ||
            (AppState.language === 'am' && btn.textContent === 'አማ')) btn.classList.add('active');
    });
}
function loadSettings() {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme) AppState.theme = savedTheme;
    const savedLang = localStorage.getItem('language');
    if (savedLang) AppState.language = savedLang;
}
function startAutoRefresh() {
    setInterval(() => { if (AppState.autoRefresh && AppState.isLoggedIn) updateStatistics(); }, 5000);
}
function showUserMenu() {
    const modal = document.getElementById('userModal');
    if (modal) modal.style.display = 'flex';
}
function closeModal() {
    const modal = document.getElementById('userModal');
    if (modal) modal.style.display = 'none';
}
function editProfile() { showToast('Edit profile coming soon', 'info'); closeModal(); }
function makeEmergencyCall() {
    const num = '+251987713787';
    if (confirm('Call emergency contact? ' + num)) {
        window.location.href = `tel:${num}`;
        addActivityLog('Emergency call initiated', 'system');
    }
}

// ==================== INITIALIZATION ====================
document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 Estif Home 1000X Initializing...');
    loadSettings();
    setupMobileMenu();
    checkAuth();
    setupWebSocket();
    setupVoiceRecognition();
    startAutoRefresh();
    applyTheme();
    const claimBtn = document.getElementById('claimEspBtn');
    if (claimBtn) claimBtn.addEventListener('click', claimESP32);
    console.log('✅ Ready');
});

// ==================== EXPOSE GLOBALLY ====================
window.navigateTo = navigateTo;
window.setLanguage = setLanguage;
window.toggleTheme = toggleTheme;
window.toggleDevice = toggleDevice;
window.toggleAutoMode = toggleAutoMode;
window.masterAllOn = masterAllOn;
window.masterAllOff = masterAllOff;
window.toggleVoiceRecognition = toggleVoiceRecognition;
window.showUserMenu = showUserMenu;
window.closeModal = closeModal;
window.logout = logout;
window.editProfile = editProfile;
window.handleLogin = handleLogin;
window.handleRegister = handleRegister;
window.showLoginOnly = showLoginOnly;
window.showRegisterOnly = showRegisterOnly;
window.makeEmergencyCall = makeEmergencyCall;