/**
 * Estif Home 1000X - ADVANCED MULTI-USER SMART HOME CONTROLLER
 * Features:
 * - Secure User Registration & Login
 * - Password Hashing (simulated for demo)
 * - Session Management
 * - User Profiles
 * - Device Ownership per User
 * - Role-Based Access Control
 * - Cloud Sync Ready
 * - Enhanced Security
 */

// ==================== USER DATABASE ====================
// In production, this would be a backend database
// For demo, we use localStorage with encryption simulation

class UserManager {
    constructor() {
        this.users = this.loadUsers();
        this.sessions = new Map();
        this.currentUser = null;
    }
    
    loadUsers() {
        // Load from localStorage or initialize with demo users
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
                password: this.hashPassword(''),
                name: 'Estiph Johnson',
                nameAm: 'እስቲፍ ጆንሰን',
                role: 'admin',
                avatar: '👨',
                createdAt: new Date().toISOString(),
                lastLogin: null,
                devices: [0, 1, 2, 3, 4, 5], // Device IDs this user owns
                settings: {
                    language: 'en',
                    theme: 'light',
                    notifications: true,
                    twoFactorEnabled: false
                }
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
                devices: [0, 1, 2, 3], // Limited devices
                settings: {
                    language: 'en',
                    theme: 'light',
                    notifications: true,
                    twoFactorEnabled: false
                }
            }
        ];
    }
    
    hashPassword(password) {
        // Simple hash for demo (in production, use bcrypt on server)
        let hash = 0;
        for (let i = 0; i < password.length; i++) {
            hash = ((hash << 5) - hash) + password.charCodeAt(i);
            hash |= 0;
        }
        return hash.toString();
    }
    
    verifyPassword(password, hash) {
        return this.hashPassword(password) === hash;
    }
    
    saveUsers() {
        localStorage.setItem('estif_users', JSON.stringify(this.users));
    }
    
    register(email, password, name) {
        // Check if email exists
        if (this.users.find(u => u.email === email)) {
            return { success: false, error: 'email_exists' };
        }
        
        // Create new user
        const newUser = {
            id: this.users.length + 1,
            email: email,
            password: this.hashPassword(password),
            name: name,
            nameAm: name,
            role: 'user',
            avatar: '👤',
            createdAt: new Date().toISOString(),
            lastLogin: null,
            devices: [0, 1, 2], // Default devices for new users
            settings: {
                language: 'en',
                theme: 'light',
                notifications: true,
                twoFactorEnabled: false
            }
        };
        
        this.users.push(newUser);
        this.saveUsers();
        
        return { success: true, user: this.sanitizeUser(newUser) };
    }
    
    login(email, password) {
        const user = this.users.find(u => u.email === email);
        
        if (!user) {
            return { success: false, error: 'user_not_found' };
        }
        
        if (!this.verifyPassword(password, user.password)) {
            return { success: false, error: 'invalid_password' };
        }
        
        // Update last login
        user.lastLogin = new Date().toISOString();
        this.saveUsers();
        
        // Create session
        const sessionToken = this.generateSessionToken();
        this.sessions.set(sessionToken, user.id);
        
        return { 
            success: true, 
            user: this.sanitizeUser(user),
            token: sessionToken
        };
    }
    
    logout(token) {
        this.sessions.delete(token);
        return { success: true };
    }
    
    validateSession(token) {
        return this.sessions.has(token);
    }
    
    getUserById(id) {
        const user = this.users.find(u => u.id === id);
        return user ? this.sanitizeUser(user) : null;
    }
    
    getUserByToken(token) {
        const userId = this.sessions.get(token);
        if (!userId) return null;
        return this.getUserById(userId);
    }
    
    sanitizeUser(user) {
        const { password, ...sanitized } = user;
        return sanitized;
    }
    
    generateSessionToken() {
        return 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 16);
    }
    
    updateUserSettings(userId, settings) {
        const user = this.users.find(u => u.id === userId);
        if (user) {
            user.settings = { ...user.settings, ...settings };
            this.saveUsers();
            return { success: true, settings: user.settings };
        }
        return { success: false };
    }
    
    updateUserProfile(userId, updates) {
        const user = this.users.find(u => u.id === userId);
        if (user) {
            Object.assign(user, updates);
            this.saveUsers();
            return { success: true, user: this.sanitizeUser(user) };
        }
        return { success: false };
    }
    
    changePassword(userId, oldPassword, newPassword) {
        const user = this.users.find(u => u.id === userId);
        if (!user) return { success: false, error: 'user_not_found' };
        
        if (!this.verifyPassword(oldPassword, user.password)) {
            return { success: false, error: 'invalid_password' };
        }
        
        user.password = this.hashPassword(newPassword);
        this.saveUsers();
        return { success: true };
    }
    
    getAllUsers() {
        return this.users.map(u => this.sanitizeUser(u));
    }
    
    deleteUser(userId, requesterRole) {
        if (requesterRole !== 'admin') {
            return { success: false, error: 'unauthorized' };
        }
        
        const index = this.users.findIndex(u => u.id === userId);
        if (index === -1) return { success: false, error: 'user_not_found' };
        
        this.users.splice(index, 1);
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
            { id: 0, icon: "💡", nameEn: "Light", nameAm: "መብራት", roomEn: "Living Room", roomAm: "ሳሎን", gpio: 23, power: 10, state: false, autoMode: false, ownerId: 1 },
            { id: 1, icon: "🌀", nameEn: "Fan", nameAm: "ማራገቢያ", roomEn: "Bedroom", roomAm: "መኝታ", gpio: 22, power: 40, state: false, autoMode: true, ownerId: 1 },
            { id: 2, icon: "❄️", nameEn: "AC", nameAm: "አየር ማቀዝቀዣ", roomEn: "Master", roomAm: "ዋና", gpio: 21, power: 120, state: false, autoMode: true, ownerId: 1 },
            { id: 3, icon: "📺", nameEn: "TV", nameAm: "ቴሌቪዥን", roomEn: "Entertainment", roomAm: "መዝናኛ", gpio: 19, power: 80, state: false, autoMode: false, ownerId: 1 },
            { id: 4, icon: "🔥", nameEn: "Heater", nameAm: "ማሞቂያ", roomEn: "Bathroom", roomAm: "መታጠቢያ", gpio: 18, power: 1500, state: false, autoMode: true, ownerId: 1 },
            { id: 5, icon: "💧", nameEn: "Pump", nameAm: "ፓምፕ", roomEn: "Garden", roomAm: "አትክልት", gpio: 5, power: 250, state: false, autoMode: false, ownerId: 1 }
        ];
    }
    
    getDevicesForUser(userId) {
        return this.allDevices.filter(device => device.ownerId === userId || userId === 1);
    }
    
    toggleDevice(deviceId, userId) {
        const device = this.allDevices.find(d => d.id === deviceId);
        if (!device) return { success: false, error: 'device_not_found' };
        
        // Check ownership
        if (device.ownerId !== userId && userId !== 1) {
            return { success: false, error: 'unauthorized' };
        }
        
        // Check auto mode
        if (device.autoMode) {
            return { success: false, error: 'auto_mode_active', device };
        }
        
        device.state = !device.state;
        return { success: true, device };
    }
    
    setAutoMode(deviceId, enabled, userId) {
        const device = this.allDevices.find(d => d.id === deviceId);
        if (!device) return { success: false, error: 'device_not_found' };
        
        if (device.ownerId !== userId && userId !== 1) {
            return { success: false, error: 'unauthorized' };
        }
        
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
    
    addDevice(deviceData, userId) {
        const newId = this.allDevices.length;
        const newDevice = {
            id: newId,
            ...deviceData,
            state: false,
            autoMode: false,
            ownerId: userId
        };
        
        this.allDevices.push(newDevice);
        return { success: true, device: newDevice };
    }
    
    removeDevice(deviceId, userId) {
        const index = this.allDevices.findIndex(d => d.id === deviceId);
        if (index === -1) return { success: false, error: 'device_not_found' };
        
        if (this.allDevices[index].ownerId !== userId && userId !== 1) {
            return { success: false, error: 'unauthorized' };
        }
        
        this.allDevices.splice(index, 1);
        return { success: true };
    }
}

// ==================== APPLICATION STATE ====================

const AppState = {
    currentUser: null,
    sessionToken: null,
    isLoggedIn: false,
    
    language: localStorage.getItem('language') || 'en',
    theme: localStorage.getItem('theme') || 'light',
    currentPage: 'dashboard',
    
    serverConnected: false,
    wsConnected: false,
    socket: null,
    
    devices: [],
    systemStats: {
        temperature: 23,
        humidity: 45,
        energyUsage: 0,
        activeDevices: 0
    },
    
    isListening: false,
    wakeWordDetected: false,
    recognition: null,
    
    isLoading: false,
    autoRefresh: true
};

// ==================== INITIALIZE MANAGERS ====================

const userManager = new UserManager();
const deviceManager = new DeviceManager();

// ==================== TRANSLATIONS (Same as before) ====================
const Translations = {
    en: {
        login: "Login",
        register: "Register",
        email: "Email",
        password: "Password",
        confirmPassword: "Confirm Password",
        fullName: "Full Name",
        noAccount: "Don't have an account?",
        hasAccount: "Already have an account?",
        dashboard: "Dashboard",
        analytics: "Analytics",
        devices: "Devices",
        automation: "Automation",
        settings: "Settings",
        logout: "Logout",
        welcome: "Welcome back",
        activeDevices: "Active Devices",
        temperature: "Temperature",
        allOn: "ALL ON",
        allOff: "ALL OFF",
        autoMode: "Auto Mode",
        manualMode: "Manual Mode",
        on: "ON",
        off: "OFF",
        connected: "Connected",
        disconnected: "Disconnected",
        voiceAssistant: "Voice Assistant",
        wakeWord: "Say 'Hey Estiph' or 'ሰላም እስቲፍ'",
        loginSuccess: "Login successful! Welcome",
        loginFailed: "Invalid email or password",
        logoutSuccess: "Logged out successfully",
        registerSuccess: "Account created successfully! Please login",
        emailExists: "Email already registered",
        passwordMismatch: "Passwords do not match",
        autoModeBlock: "Device in AUTO mode. Disable auto mode first.",
        deviceNotFound: "Device not found",
        unauthorized: "You don't have permission for this action",
        admin: "Administrator",
        user: "User",
        guest: "Guest"
    },
    am: {
        login: "ግባ",
        register: "ተመዝገብ",
        email: "ኢሜይል",
        password: "የይለፍ ቃል",
        confirmPassword: "የይለፍ ቃል አረጋግጥ",
        fullName: "ሙሉ ስም",
        noAccount: "መለያ የለህም?",
        hasAccount: "መለያ አለህ?",
        dashboard: "ዳሽቦርድ",
        analytics: "ትንተና",
        devices: "መሳሪያዎች",
        automation: "አውቶሜሽን",
        settings: "ቅንብሮች",
        logout: "ውጣ",
        welcome: "እንኳን ደህና መጡ",
        activeDevices: "የሚሰሩ መሳሪያዎች",
        temperature: "ሙቀት",
        allOn: "ሁሉንም አብራ",
        allOff: "ሁሉንም አጥፋ",
        autoMode: "አውቶማቲክ",
        manualMode: "እጅ",
        on: "በርቷል",
        off: "ጠፍቷል",
        connected: "ተገናኝቷል",
        disconnected: "አልተገናኘም",
        voiceAssistant: "የድምጽ ረዳት",
        wakeWord: "'ሰላም እስቲፍ' ወይም 'Hey Estiph' ይበሉ",
        loginSuccess: "ግባት ተሳክቷል! እንኳን ደህና መጡ",
        loginFailed: "የኢሜይል ወይም የይለፍ ቃል ስህተት ነው",
        logoutSuccess: "በስኬት ወጥተሃል",
        registerSuccess: "መለያ ተፈጥሯል! እባክህ ግባ",
        emailExists: "ኢሜይል ቀድሞ ተመዝግቧል",
        passwordMismatch: "የይለፍ ቃሎች አይዛመዱም",
        autoModeBlock: "መሳሪያው በአውቶማቲክ ሁነታ ላይ ነው። በመጀመሪያ አውቶማቲክን ያጥፉ።",
        deviceNotFound: "መሳሪያ አልተገኘም",
        unauthorized: "ለዚህ ተግባር ፈቃድ የለህም",
        admin: "አስተዳዳሪ",
        user: "ተጠቃሚ",
        guest: "እንግዳ"
    }
};

// ==================== AUTHENTICATION FUNCTIONS ====================

function checkAuth() {
    const savedToken = localStorage.getItem('sessionToken');
    const savedUser = localStorage.getItem('currentUser');
    
    if (savedToken && savedUser) {
        try {
            const isValid = userManager.validateSession(savedToken);
            if (isValid) {
                AppState.sessionToken = savedToken;
                AppState.currentUser = JSON.parse(savedUser);
                AppState.isLoggedIn = true;
                
                // Load user's devices
                loadUserDevices();
                showDashboardPage();
                updateUserProfile();
                return;
            }
        } catch(e) {
            console.log('Session invalid');
        }
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
        
        // Load user's devices
        loadUserDevices();
        
        showToast(`${t.loginSuccess} ${result.user.name}!`, 'success');
        showDashboardPage();
        updateUserProfile();
        
        if (result.user.settings?.language) {
            setLanguage(result.user.settings.language);
        }
    } else {
        let errorMsg = t.loginFailed;
        if (result.error === 'user_not_found') errorMsg = 'Email not found';
        if (result.error === 'invalid_password') errorMsg = 'Incorrect password';
        showToast(errorMsg, 'error');
    }
}

function handleRegister(event) {
    event.preventDefault();
    
    const name = document.getElementById('regName').value;
    const email = document.getElementById('regEmail').value;
    const password = document.getElementById('regPassword').value;
    const confirmPassword = document.getElementById('regConfirmPassword').value;
    const t = Translations[AppState.language];
    
    if (password !== confirmPassword) {
        showToast(t.passwordMismatch, 'error');
        return;
    }
    
    if (password.length < 6) {
        showToast('Password must be at least 6 characters', 'error');
        return;
    }
    
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
    if (AppState.sessionToken) {
        userManager.logout(AppState.sessionToken);
    }
    
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
        const name = AppState.language === 'am' && AppState.currentUser.nameAm 
            ? AppState.currentUser.nameAm 
            : AppState.currentUser.name;
        userNameEl.textContent = name;
    }
    
    if (userRoleEl) {
        const roleKey = AppState.currentUser.role;
        userRoleEl.textContent = t[roleKey] || roleKey;
    }
    
    if (userAvatarEl) {
        userAvatarEl.textContent = AppState.currentUser.avatar || 
            AppState.currentUser.name.charAt(0).toUpperCase();
    }
}

// ==================== DEVICE MANAGEMENT (UPDATED) ====================

function toggleDevice(deviceId) {
    if (!AppState.isLoggedIn) return;
    
    const result = deviceManager.toggleDevice(deviceId, AppState.currentUser.id);
    const t = Translations[AppState.language];
    
    if (!result.success) {
        if (result.error === 'auto_mode_active') {
            showToast(t.autoModeBlock, 'warning');
        } else if (result.error === 'unauthorized') {
            showToast(t.unauthorized, 'error');
        } else {
            showToast(t.deviceNotFound, 'error');
        }
        return;
    }
    
    // Update local state
    const deviceIndex = AppState.devices.findIndex(d => d.id === deviceId);
    if (deviceIndex !== -1) {
        AppState.devices[deviceIndex] = result.device;
    }
    
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
    
    if (!result.success) {
        showToast(t.unauthorized, 'error');
        return;
    }
    
    // Update local state
    const deviceIndex = AppState.devices.findIndex(d => d.id === deviceId);
    if (deviceIndex !== -1) {
        AppState.devices[deviceIndex] = result.device;
    }
    
    renderDeviceGrid();
    
    const deviceName = AppState.language === 'en' ? result.device.nameEn : result.device.nameAm;
    showToast(`${deviceName} ${result.device.autoMode ? t.autoModeEnabled : t.autoModeDisabled}`, 'info');
    sendAutoModeCommand(deviceId, result.device.autoMode);
}

function masterAllOn() {
    if (!AppState.isLoggedIn) return;
    
    const result = deviceManager.masterControl(true, AppState.currentUser.id);
    const t = Translations[AppState.language];
    
    // Update local state
    result.affected.forEach(updatedDevice => {
        const index = AppState.devices.findIndex(d => d.id === updatedDevice.id);
        if (index !== -1) {
            AppState.devices[index] = updatedDevice;
        }
    });
    
    renderDeviceGrid();
    updateStatistics();
    
    showToast(t.allOn, 'success');
    addActivityLog('All devices turned ON', 'system');
    
    result.affected.forEach(device => {
        sendDeviceCommand(device.id, true);
    });
}

function masterAllOff() {
    if (!AppState.isLoggedIn) return;
    
    const result = deviceManager.masterControl(false, AppState.currentUser.id);
    const t = Translations[AppState.language];
    
    // Update local state
    result.affected.forEach(updatedDevice => {
        const index = AppState.devices.findIndex(d => d.id === updatedDevice.id);
        if (index !== -1) {
            AppState.devices[index] = updatedDevice;
        }
    });
    
    renderDeviceGrid();
    updateStatistics();
    
    showToast(t.allOff, 'info');
    addActivityLog('All devices turned OFF', 'system');
    
    result.affected.forEach(device => {
        sendDeviceCommand(device.id, false);
    });
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
                <div class="auto-badge ${device.autoMode ? 'auto-on' : 'auto-off'}" 
                     onclick="event.stopPropagation(); toggleAutoMode(${device.id})">
                    ${mode}
                </div>
                <div class="device-icon">${device.icon}</div>
                <div class="device-name">${escapeHtml(name)}</div>
                <div class="device-room">${escapeHtml(room)}</div>
                <div class="device-state">${state}</div>
                <div class="device-power">${device.power}W</div>
                <button class="auto-toggle" onclick="event.stopPropagation(); toggleAutoMode(${device.id})" 
                        title="${t.autoMode}">
                    <i class="fas ${device.autoMode ? 'fa-robot' : 'fa-hand-paper'}"></i>
                </button>
            </div>
        `;
    });
    
    grid.innerHTML = html;
    updateDeviceCount();
}

// ==================== SETTINGS MANAGEMENT ====================

function updateUserSettings(settings) {
    if (!AppState.currentUser) return;
    
    const result = userManager.updateUserSettings(AppState.currentUser.id, settings);
    if (result.success) {
        AppState.currentUser.settings = result.settings;
        localStorage.setItem('currentUser', JSON.stringify(AppState.currentUser));
        showToast('Settings updated', 'success');
    }
}

function changePassword(oldPassword, newPassword) {
    if (!AppState.currentUser) return;
    
    const result = userManager.changePassword(AppState.currentUser.id, oldPassword, newPassword);
    if (result.success) {
        showToast('Password changed successfully', 'success');
    } else {
        showToast('Current password is incorrect', 'error');
    }
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
    
    document.querySelectorAll('.page-container').forEach(container => {
        container.classList.remove('active');
    });
    
    const targetPage = document.getElementById(`${page}-page`);
    if (targetPage) targetPage.classList.add('active');
    
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
        if (item.getAttribute('onclick') === `navigateTo('${page}')`) {
            item.classList.add('active');
        }
    });
    
    const t = Translations[AppState.language];
    const pageTitle = document.getElementById('pageTitle');
    if (pageTitle && t[page]) pageTitle.textContent = t[page];
    
    if (window.innerWidth <= 768) {
        const sidebar = document.getElementById('sidebar');
        if (sidebar) sidebar.classList.remove('open');
    }
}

// ==================== MOBILE MENU ====================

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
            if (!sidebar.contains(e.target) && e.target !== menuToggle) {
                sidebar.classList.remove('open');
            }
        }
    });
}

// ==================== VOICE RECOGNITION WITH WAKE WORDS ====================

// Voice state
let voiceState = {
    isListening: false,
    wakeWordDetected: false,
    recognition: null,
    isSpeaking: false,
    wakeWordTimer: null,
    lastTranscript: ''
};

// Wake words for different languages
const WAKE_WORDS = {
    en: ['hey estiph', 'hey estif', 'estiph', 'ok estiph', 'hello estiph', 'wake up estiph'],
    am: ['ሰላም እስቲፍ', 'እስቲፍ', 'ሰላም', 'አልቃ', 'ሄይ እስቲፍ']
};

// Voice responses
const VOICE_RESPONSES = {
    en: {
        wake: ['Yes?', 'I\'m listening', 'How can I help?', 'Yes, sir?', 'Go ahead', 'At your service'],
        confirm: ['Done!', 'Command executed', 'All set!', 'Okay!', 'Completed!'],
        error: ['Sorry, I didn\'t understand', 'Could you repeat that?', 'Command not recognized'],
        greeting: ['Hello! How can I help you?', 'Hi there! Ready to assist'],
        help: ['You can say: Light on, Light off, Fan on, All on, All off, What\'s the temperature?']
    },
    am: {
        wake: ['አዎ?', 'እያዳመጥኩ ነው', 'ምን እረዳሃለሁ?', 'አዎ አለቃ?', 'ንገሩኝ', 'ትእዛዝዎን ይስጡ'],
        confirm: ['ተሰራ!', 'ትእዛዝ ተፈጸመ', 'ተዘጋጀ!', 'እሺ!', 'ተከናውኗል!'],
        error: ['ይቅርታ አልገባኝም', 'እባክህ ድገምልኝ', 'ትእዛዙ አልታወቀም'],
        greeting: ['ሰላም! እንዴት ልረዳህ?', 'ሰላም! ዝግጁ ነኝ'],
        help: ['ማለት ትችላለህ: መብራት አብራ, መብራት አጥፋ, ማራገቢያ አብራ, ሁሉንም አብራ, ሙቀቱ ስንት ነው']
    }
};

// Initialize voice recognition
function initVoiceRecognition() {
    // Check browser support
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
        console.log('Voice recognition not supported');
        showToast('Voice recognition not supported. Please use Chrome or Edge.', 'error');
        return false;
    }
    
    // Create recognition instance
    const SpeechRecognition = window.webkitSpeechRecognition || window.SpeechRecognition;
    voiceState.recognition = new SpeechRecognition();
    voiceState.recognition.continuous = true;
    voiceState.recognition.interimResults = true;
    voiceState.recognition.maxAlternatives = 1;
    
    // Set language based on current app language
    updateVoiceLanguage();
    
    // Set up event handlers
    voiceState.recognition.onstart = () => {
        console.log('🎤 Voice recognition started - listening for wake word');
        voiceState.isListening = true;
        updateVoiceUI(true);
        
        const t = Translations[AppState.language];
        showToast(t.listening || 'Listening for wake word...', 'info');
    };
    
    voiceState.recognition.onend = () => {
        console.log('🎤 Voice recognition ended');
        // Auto-restart if we should still be listening
        if (voiceState.isListening) {
            try {
                voiceState.recognition.start();
            } catch (e) {
                console.log('Could not restart recognition:', e);
            }
        } else {
            updateVoiceUI(false);
        }
    };
    
    voiceState.recognition.onerror = (event) => {
        console.error('Voice recognition error:', event.error);
        
        if (event.error === 'not-allowed') {
            showToast('Microphone access denied. Please allow microphone access.', 'error');
            stopVoiceRecognition();
        } else if (event.error === 'network') {
            showToast('Network error. Check your internet connection.', 'error');
        } else if (event.error === 'no-speech') {
            // Silent error - just continue
        } else {
            showToast('Voice error: ' + event.error, 'error');
        }
    };
    
    voiceState.recognition.onresult = (event) => {
        const transcript = Array.from(event.results)
            .map(result => result[0].transcript.toLowerCase().trim())
            .join(' ');
        
        if (transcript && transcript !== voiceState.lastTranscript) {
            voiceState.lastTranscript = transcript;
            console.log('🎤 Heard:', transcript);
            processVoiceInput(transcript);
        }
    };
    
    return true;
}

function updateVoiceLanguage() {
    if (voiceState.recognition) {
        voiceState.recognition.lang = AppState.language === 'en' ? 'en-US' : 'am-ET';
        console.log('Voice language set to:', voiceState.recognition.lang);
    }
}

function startVoiceRecognition() {
    if (!voiceState.recognition) {
        const initialized = initVoiceRecognition();
        if (!initialized) return;
    }
    
    try {
        updateVoiceLanguage();
        voiceState.recognition.start();
        voiceState.isListening = true;
        updateVoiceUI(true);
        console.log('🎤 Voice started - listening for wake word');
        
        // Show indicator in voice display
        const voiceDisplay = document.getElementById('voiceCommandText');
        if (voiceDisplay) {
            const t = Translations[AppState.language];
            voiceDisplay.textContent = t.listening || '🎤 Listening for "Hey Estiph" or "ሰላም እስቲፍ"...';
        }
    } catch (e) {
        console.error('Failed to start voice:', e);
        showToast('Could not start voice recognition', 'error');
    }
}

function stopVoiceRecognition() {
    if (voiceState.recognition) {
        try {
            voiceState.recognition.stop();
        } catch (e) {
            console.log('Error stopping:', e);
        }
    }
    voiceState.isListening = false;
    voiceState.wakeWordDetected = false;
    if (voiceState.wakeWordTimer) {
        clearTimeout(voiceState.wakeWordTimer);
    }
    updateVoiceUI(false);
    console.log('🎤 Voice stopped');
    
    const voiceDisplay = document.getElementById('voiceCommandText');
    if (voiceDisplay) {
        const t = Translations[AppState.language];
        voiceDisplay.textContent = t.wakeWord || 'Say "Hey Estiph" or "ሰላም እስቲፍ"';
    }
}

function toggleVoiceRecognition() {
    console.log('Toggle voice, current state:', voiceState.isListening);
    
    if (voiceState.isListening) {
        stopVoiceRecognition();
        showToast('Voice stopped', 'info');
    } else {
        startVoiceRecognition();
    }
}

function updateVoiceUI(isListening) {
    const voiceBtn = document.getElementById('voiceBtn');
    
    if (voiceBtn) {
        if (isListening) {
            voiceBtn.classList.add('listening');
            voiceBtn.innerHTML = '<i class="fas fa-microphone-alt"></i><span class="pulse-ring"></span>';
            voiceBtn.style.background = 'var(--danger)';
            voiceBtn.style.color = 'white';
            voiceBtn.title = 'Listening for wake word...';
        } else {
            voiceBtn.classList.remove('listening');
            voiceBtn.innerHTML = '<i class="fas fa-microphone-alt"></i>';
            voiceBtn.style.background = '';
            voiceBtn.style.color = '';
            voiceBtn.title = 'Start voice control';
        }
    }
}

function processVoiceInput(transcript) {
    const currentLang = AppState.language;
    const wakeWordsList = WAKE_WORDS[currentLang];
    
    // Check for wake word
    if (!voiceState.wakeWordDetected) {
        for (const wake of wakeWordsList) {
            if (transcript.includes(wake)) {
                console.log('🎤 Wake word detected:', wake);
                voiceState.wakeWordDetected = true;
                
                // Get random wake response
                const responses = VOICE_RESPONSES[currentLang].wake;
                const response = responses[Math.floor(Math.random() * responses.length)];
                speakResponse(response);
                
                // Show visual feedback
                const voiceDisplay = document.getElementById('voiceCommandText');
                if (voiceDisplay) {
                    voiceDisplay.textContent = `🎤 ${response}`;
                    voiceDisplay.style.background = 'rgba(0,0,0,0.4)';
                    setTimeout(() => {
                        if (voiceState.isListening) {
                            voiceDisplay.textContent = '🎤 Listening for command...';
                        }
                    }, 2000);
                }
                
                // Reset wake word after 8 seconds of inactivity
                if (voiceState.wakeWordTimer) clearTimeout(voiceState.wakeWordTimer);
                voiceState.wakeWordTimer = setTimeout(() => {
                    voiceState.wakeWordDetected = false;
                    console.log('🎤 Wake word timeout - listening for wake word again');
                    const voiceDisplay = document.getElementById('voiceCommandText');
                    if (voiceDisplay && voiceState.isListening) {
                        const t = Translations[AppState.language];
                        voiceDisplay.textContent = t.listening || '🎤 Listening for "Hey Estiph" or "ሰላም እስቲፍ"...';
                    }
                }, 8000);
                return;
            }
        }
        return;
    }
    
    // Process command after wake word detected
    const commands = {
        en: {
            'light on': () => toggleDevice(0),
            'light off': () => toggleDevice(0),
            'fan on': () => toggleDevice(1),
            'fan off': () => toggleDevice(1),
            'ac on': () => toggleDevice(2),
            'ac off': () => toggleDevice(2),
            'tv on': () => toggleDevice(3),
            'tv off': () => toggleDevice(3),
            'heater on': () => toggleDevice(4),
            'heater off': () => toggleDevice(4),
            'pump on': () => toggleDevice(5),
            'pump off': () => toggleDevice(5),
            'all on': () => masterAllOn(),
            'all off': () => masterAllOff(),
            'temperature': () => speakResponse(`Temperature is ${AppState.systemStats.temperature} degrees Celsius`),
            'help': () => speakResponse(VOICE_RESPONSES.en.help[0]),
            'stop': () => stopVoiceRecognition()
        },
        am: {
            'መብራት አብራ': () => toggleDevice(0),
            'መብራት አጥፋ': () => toggleDevice(0),
            'ማራገቢያ አብራ': () => toggleDevice(1),
            'ማራገቢያ አጥፋ': () => toggleDevice(1),
            'አየር ማቀዝቀዣ አብራ': () => toggleDevice(2),
            'አየር ማቀዝቀዣ አጥፋ': () => toggleDevice(2),
            'ቴሌቪዥን አብራ': () => toggleDevice(3),
            'ቴሌቪዥን አጥፋ': () => toggleDevice(3),
            'ማሞቂያ አብራ': () => toggleDevice(4),
            'ማሞቂያ አጥፋ': () => toggleDevice(4),
            'ፓምፕ አብራ': () => toggleDevice(5),
            'ፓምፕ አጥፋ': () => toggleDevice(5),
            'ሁሉንም አብራ': () => masterAllOn(),
            'ሁሉንም አጥፋ': () => masterAllOff(),
            'ሙቀቱ ስንት ነው': () => speakResponse(`ሙቀቱ ${AppState.systemStats.temperature} ዲግሪ ነው`),
            'እርዳታ': () => speakResponse(VOICE_RESPONSES.am.help[0]),
            'አቁም': () => stopVoiceRecognition()
        }
    };
    
    const currentCommands = commands[currentLang];
    for (const [cmd, action] of Object.entries(currentCommands)) {
        if (transcript.includes(cmd)) {
            console.log('🎤 Command executed:', cmd);
            action();
            
            // Get confirmation response
            const responses = VOICE_RESPONSES[currentLang].confirm;
            const response = responses[Math.floor(Math.random() * responses.length)];
            speakResponse(response);
            
            // Reset wake word after command
            voiceState.wakeWordDetected = false;
            if (voiceState.wakeWordTimer) clearTimeout(voiceState.wakeWordTimer);
            
            // Update voice display
            const voiceDisplay = document.getElementById('voiceCommandText');
            if (voiceDisplay && voiceState.isListening) {
                const t = Translations[AppState.language];
                voiceDisplay.textContent = t.listening || '🎤 Listening for "Hey Estiph" or "ሰላም እስቲፍ"...';
            }
            return;
        }
    }
    
    // No command found
    console.log('🎤 No command matched:', transcript);
    if (voiceState.wakeWordDetected) {
        const responses = VOICE_RESPONSES[currentLang].error;
        const response = responses[Math.floor(Math.random() * responses.length)];
        speakResponse(response);
    }
}

function speakResponse(text) {
    if (voiceState.isSpeaking) {
        window.speechSynthesis.cancel();
    }
    
    if ('speechSynthesis' in window) {
        voiceState.isSpeaking = true;
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = AppState.language === 'en' ? 'en-US' : 'am-ET';
        utterance.rate = 0.9;
        utterance.pitch = 1;
        utterance.onend = () => {
            voiceState.isSpeaking = false;
        };
        utterance.onerror = () => {
            voiceState.isSpeaking = false;
        };
        window.speechSynthesis.speak(utterance);
        console.log('🎤 Speaking:', text);
    }
}

// ==================== UI HELPERS ====================

function updateStatistics() {
    const activeCount = AppState.devices.filter(d => d.state).length;
    const autoCount = AppState.devices.filter(d => d.autoMode).length;
    const totalPower = AppState.devices.reduce((sum, d) => sum + (d.state ? d.power : 0), 0);
    const maxPower = AppState.devices.reduce((sum, d) => sum + d.power, 0);
    const savings = maxPower > 0 ? Math.round((1 - totalPower / maxPower) * 100) : 0;
    
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
    const activeCount = AppState.devices.filter(d => d.state).length;
    const badge = document.getElementById('deviceCount');
    if (badge) badge.textContent = activeCount;
}

function updateConnectionStatus(connected) {
    const statusDot = document.getElementById('statusDot');
    const connectionText = document.getElementById('connectionText');
    const t = Translations[AppState.language];
    
    if (statusDot) {
        if (connected) {
            statusDot.style.background = 'var(--success)';
            statusDot.style.animation = 'pulse 2s infinite';
        } else {
            statusDot.style.background = 'var(--danger)';
            statusDot.style.animation = 'none';
        }
    }
    
    if (connectionText) {
        connectionText.textContent = connected ? t.connected : t.disconnected;
    }
}

function addActivityLog(message, source = 'system') {
    const logContainer = document.getElementById('activityLog');
    if (!logContainer) return;
    
    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const logEntry = document.createElement('div');
    logEntry.className = 'log-entry';
    logEntry.innerHTML = `
        <span class="log-time">${time}</span>
        <span class="log-message">${escapeHtml(message)}</span>
        <span class="log-source">${source}</span>
    `;
    
    logContainer.insertBefore(logEntry, logContainer.firstChild);
    
    while (logContainer.children.length > 20) {
        logContainer.removeChild(logContainer.lastChild);
    }
}

function showToast(message, type = 'info') {
    const container = document.getElementById('toastContainer');
    if (!container) return;
    
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    const icons = { success: '✅', error: '❌', warning: '⚠️', info: 'ℹ️' };
    
    toast.innerHTML = `
        <span class="toast-icon">${icons[type] || 'ℹ️'}</span>
        <div class="toast-content">${escapeHtml(message)}</div>
        <button class="toast-close" onclick="this.parentElement.remove()">×</button>
    `;
    
    container.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function setupWebSocket() {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}`;
    
    AppState.socket = io(wsUrl);
    
    AppState.socket.on('connect', () => {
        AppState.wsConnected = true;
        updateConnectionStatus(true);
        showToast('Real-time connection established', 'success');
    });
    
    AppState.socket.on('disconnect', () => {
        AppState.wsConnected = false;
        updateConnectionStatus(false);
        showToast('Real-time connection lost', 'warning');
    });
    
    AppState.socket.on('device_update', (device) => {
        const localDevice = AppState.devices.find(d => d.id === device.id);
        if (localDevice) {
            localDevice.state = device.state;
            localDevice.autoMode = device.autoMode;
            renderDeviceGrid();
            updateStatistics();
        }
    });
    
    AppState.socket.on('sensor_update', (data) => {
        if (data.temperature) AppState.systemStats.temperature = data.temperature;
        if (data.humidity) AppState.systemStats.humidity = data.humidity;
        updateStatistics();
    });
    
    AppState.socket.on('esp_status', (data) => {
        updateConnectionStatus(data.connected);
    });
}

function sendDeviceCommand(deviceId, state) {
    if (AppState.socket && AppState.wsConnected) {
        AppState.socket.emit('device_control', { deviceId, state });
    }
}

function sendAutoModeCommand(deviceId, enabled) {
    if (AppState.socket && AppState.wsConnected) {
        AppState.socket.emit('auto_mode', { deviceId, enabled });
    }
}

// ==================== THEME & LANGUAGE ====================

function applyTheme() {
    const html = document.documentElement;
    if (AppState.theme === 'dark') {
        html.setAttribute('data-theme', 'dark');
        const themeIcon = document.getElementById('themeIcon');
        if (themeIcon) themeIcon.className = 'fas fa-sun';
    } else {
        html.removeAttribute('data-theme');
        const themeIcon = document.getElementById('themeIcon');
        if (themeIcon) themeIcon.className = 'fas fa-moon';
    }
}

function toggleTheme() {
    AppState.theme = AppState.theme === 'light' ? 'dark' : 'light';
    localStorage.setItem('theme', AppState.theme);
    applyTheme();
    
    if (AppState.currentUser) {
        updateUserSettings({ theme: AppState.theme });
    }
    
    showToast(`${AppState.theme === 'light' ? 'Light' : 'Dark'} mode enabled`, 'info');
}

function setLanguage(lang) {
    AppState.language = lang;
    localStorage.setItem('language', lang);
    
    updateUILanguage();
    renderDeviceGrid();
    updateLanguageButtons();
    updateUserProfile();
    
    if (AppState.recognition) {
        AppState.recognition.lang = lang === 'en' ? 'en-US' : 'am-ET';
    }
    
    if (AppState.currentUser) {
        updateUserSettings({ language: lang });
    }
    
    showToast(`Language: ${lang === 'en' ? 'English' : 'Amharic'}`, 'success');
}

function updateUILanguage() {
    const t = Translations[AppState.language];
    
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        if (t[key]) el.textContent = t[key];
    });
    
    const pageTitle = document.getElementById('pageTitle');
    if (pageTitle && t[AppState.currentPage]) {
        pageTitle.textContent = t[AppState.currentPage];
    }
    
    const voiceDisplay = document.getElementById('voiceCommandText');
    if (voiceDisplay) voiceDisplay.textContent = t.wakeWord;
    
    updateUserProfile();
}

function updateLanguageButtons() {
    document.querySelectorAll('.lang-btn').forEach(btn => {
        btn.classList.remove('active');
        if ((AppState.language === 'en' && btn.textContent === 'EN') ||
            (AppState.language === 'am' && btn.textContent === 'አማ')) {
            btn.classList.add('active');
        }
    });
}

function loadSettings() {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme) AppState.theme = savedTheme;
    
    const savedLang = localStorage.getItem('language');
    if (savedLang) AppState.language = savedLang;
}

function startAutoRefresh() {
    setInterval(() => {
        if (AppState.autoRefresh && AppState.isLoggedIn) {
            updateStatistics();
        }
    }, 5000);
}

function setupEventListeners() {
    // Event listeners handled in other functions
}

function showUserMenu() {
    const modal = document.getElementById('userModal');
    if (modal) modal.style.display = 'flex';
}

function closeModal() {
    const modal = document.getElementById('userModal');
    if (modal) modal.style.display = 'none';
}

function editProfile() {
    showToast('Edit profile feature coming soon', 'info');
    closeModal();
}

// ==================== INITIALIZATION ====================

document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 Estif Home 1000X Advanced Multi-User System Initializing...');
    
    loadSettings();
    setupEventListeners();
    setupMobileMenu();
    checkAuth();
    setupWebSocket();
    setupVoiceRecognition();
    startAutoRefresh();
    applyTheme();
    
    console.log('✅ Application Ready');
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