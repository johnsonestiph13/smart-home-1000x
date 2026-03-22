/**
 * Estif Home 1000X - Complete Smart Home Controller
 * With Login Page, User Authentication, Bilingual Support, Voice Control, Auto Mode
 * Fixed: Mobile Hamburger Menu, Auto Mode Toggle
 */

// ==================== USER DATABASE ====================

const Users = [
    {
        id: 1,
        email: 'admin@estifhome.com',
        password: 'admin123',
        name: 'Admin User',
        nameAm: 'አስተዳዳሪ',
        role: 'admin',
        avatar: '👨',
        createdAt: new Date()
    },
    {
        id: 2,
        email: 'family@estifhome.com',
        password: 'family123',
        name: 'Family Member',
        nameAm: 'የቤተሰብ አባል',
        role: 'user',
        avatar: '👩',
        createdAt: new Date()
    },
    {
        id: 3,
        email: 'guest@estifhome.com',
        password: 'guest123',
        name: 'Guest User',
        nameAm: 'እንግዳ',
        role: 'guest',
        avatar: '👤',
        createdAt: new Date()
    }
];

// ==================== APPLICATION STATE ====================

const AppState = {
    // User
    currentUser: null,
    isLoggedIn: false,
    
    // Settings
    language: localStorage.getItem('language') || 'en',
    theme: localStorage.getItem('theme') || 'light',
    currentPage: 'dashboard',
    
    // Connection
    serverConnected: false,
    wsConnected: false,
    socket: null,
    
    // Device Data
    devices: [],
    systemStats: {
        temperature: 23,
        humidity: 45,
        energyUsage: 0,
        activeDevices: 0
    },
    
    // Voice Control
    isListening: false,
    wakeWordDetected: false,
    recognition: null,
    
    // UI State
    isLoading: false,
    autoRefresh: true,
    
    // Analytics
    energyData: [],
    predictions: null,
    insights: []
};

// ==================== TRANSLATIONS ====================

const Translations = {
    en: {
        // Auth
        login: "Login",
        register: "Register",
        email: "Email",
        password: "Password",
        confirmPassword: "Confirm Password",
        fullName: "Full Name",
        forgotPassword: "Forgot Password?",
        noAccount: "Don't have an account?",
        hasAccount: "Already have an account?",
        
        // Navigation
        dashboard: "Dashboard",
        analytics: "Analytics",
        devices: "Devices",
        automation: "Automation",
        settings: "Settings",
        help: "Help",
        profile: "Profile",
        logout: "Logout",
        
        // Dashboard
        welcome: "Welcome back",
        activeDevices: "Active Devices",
        temperature: "Temperature",
        humidity: "Humidity",
        energy: "Energy",
        quickControls: "Quick Controls",
        allOn: "ALL ON",
        allOff: "ALL OFF",
        autoMode: "Auto Mode",
        manualMode: "Manual Mode",
        
        // Device States
        on: "ON",
        off: "OFF",
        connected: "Connected",
        disconnected: "Disconnected",
        
        // Voice
        voiceAssistant: "Voice Assistant",
        startListening: "Start Listening",
        listening: "Listening...",
        wakeWord: "Say 'Hey Estiph' or 'ሰላም እስቲፍ'",
        
        // Analytics
        energyConsumption: "Energy Consumption",
        deviceBreakdown: "Device Breakdown",
        usageStats: "Usage Statistics",
        peakHours: "Peak Hours",
        efficiency: "Efficiency",
        costAnalysis: "Cost Analysis",
        
        // Auto Mode
        autoModeEnabled: "Auto Mode Enabled",
        autoModeDisabled: "Auto Mode Disabled",
        temperatureControl: "Temperature Control",
        scheduleControl: "Schedule Control",
        
        // Notifications
        success: "Success",
        error: "Error",
        warning: "Warning",
        info: "Info",
        loginSuccess: "Login successful! Welcome",
        loginFailed: "Invalid email or password",
        logoutSuccess: "Logged out successfully",
        registerSuccess: "Account created successfully! Please login",
        
        // Errors
        connectionError: "Connection Error",
        deviceNotFound: "Device not found",
        autoModeBlock: "Device in AUTO mode. Disable auto mode first.",
        passwordMismatch: "Passwords do not match",
        emailExists: "Email already registered",
        
        // Time
        justNow: "Just now",
        minutesAgo: "minutes ago",
        hoursAgo: "hours ago",
        daysAgo: "days ago",
        
        // Roles
        admin: "Administrator",
        user: "User",
        guest: "Guest"
    },
    
    am: {
        // Auth
        login: "ግባ",
        register: "ተመዝገብ",
        email: "ኢሜይል",
        password: "የይለፍ ቃል",
        confirmPassword: "የይለፍ ቃል አረጋግጥ",
        fullName: "ሙሉ ስም",
        forgotPassword: "የይለፍ ቃል ረሳሁ?",
        noAccount: "መለያ የለህም?",
        hasAccount: "መለያ አለህ?",
        
        // Navigation
        dashboard: "ዳሽቦርድ",
        analytics: "ትንተና",
        devices: "መሳሪያዎች",
        automation: "አውቶሜሽን",
        settings: "ቅንብሮች",
        help: "እገዛ",
        profile: "መገለጫ",
        logout: "ውጣ",
        
        // Dashboard
        welcome: "እንኳን ደህና መጡ",
        activeDevices: "የሚሰሩ መሳሪያዎች",
        temperature: "ሙቀት",
        humidity: "እርጥበት",
        energy: "ኃይል",
        quickControls: "ፈጣን መቆጣጠሪያ",
        allOn: "ሁሉንም አብራ",
        allOff: "ሁሉንም አጥፋ",
        autoMode: "አውቶማቲክ",
        manualMode: "እጅ",
        
        // Device States
        on: "በርቷል",
        off: "ጠፍቷል",
        connected: "ተገናኝቷል",
        disconnected: "አልተገናኘም",
        
        // Voice
        voiceAssistant: "የድምጽ ረዳት",
        startListening: "ማዳመጥ ጀምር",
        listening: "እያዳመጥኩ ነው...",
        wakeWord: "'ሰላም እስቲፍ' ወይም 'Hey Estiph' ይበሉ",
        
        // Analytics
        energyConsumption: "የኃይል ፍጆታ",
        deviceBreakdown: "የመሳሪያ ክፍፍል",
        usageStats: "የአጠቃቀም ስታቲስቲክስ",
        peakHours: "ከፍተኛ ሰዓታት",
        efficiency: "ውጤታማነት",
        costAnalysis: "የዋጋ ትንተና",
        
        // Auto Mode
        autoModeEnabled: "አውቶማቲክ ነው",
        autoModeDisabled: "እጅ ነው",
        temperatureControl: "የሙቀት መቆጣጠሪያ",
        scheduleControl: "የጊዜ መርሐግብር",
        
        // Notifications
        success: "ተሳክቷል",
        error: "ስህተት",
        warning: "ማስጠንቀቂያ",
        info: "መረጃ",
        loginSuccess: "ግባት ተሳክቷል! እንኳን ደህና መጡ",
        loginFailed: "የኢሜይል ወይም የይለፍ ቃል ስህተት ነው",
        logoutSuccess: "በስኬት ወጥተሃል",
        registerSuccess: "መለያ ተፈጥሯል! እባክህ ግባ",
        
        // Errors
        connectionError: "የግንኙነት ስህተት",
        deviceNotFound: "መሳሪያ አልተገኘም",
        autoModeBlock: "መሳሪያው በአውቶማቲክ ሁነታ ላይ ነው። በመጀመሪያ አውቶማቲክን ያጥፉ።",
        passwordMismatch: "የይለፍ ቃሎች አይዛመዱም",
        emailExists: "ኢሜይል ቀድሞ ተመዝግቧል",
        
        // Time
        justNow: "አሁን",
        minutesAgo: "ደቂቃ በፊት",
        hoursAgo: "ሰዓት በፊት",
        daysAgo: "ቀን በፊት",
        
        // Roles
        admin: "አስተዳዳሪ",
        user: "ተጠቃሚ",
        guest: "እንግዳ"
    }
};

// ==================== DEVICE DATA ====================

const DevicesData = [
    { id: 0, icon: "💡", nameEn: "Light", nameAm: "መብራት", roomEn: "Living Room", roomAm: "ሳሎን", gpio: 23, power: 10, state: false, autoMode: false },
    { id: 1, icon: "🌀", nameEn: "Fan", nameAm: "ማራገቢያ", roomEn: "Bedroom", roomAm: "መኝታ", gpio: 22, power: 40, state: false, autoMode: true },
    { id: 2, icon: "❄️", nameEn: "AC", nameAm: "አየር ማቀዝቀዣ", roomEn: "Master", roomAm: "ዋና", gpio: 21, power: 120, state: false, autoMode: true },
    { id: 3, icon: "📺", nameEn: "TV", nameAm: "ቴሌቪዥን", roomEn: "Entertainment", roomAm: "መዝናኛ", gpio: 19, power: 80, state: false, autoMode: false },
    { id: 4, icon: "🔥", nameEn: "Heater", nameAm: "ማሞቂያ", roomEn: "Bathroom", roomAm: "መታጠቢያ", gpio: 18, power: 1500, state: false, autoMode: true },
    { id: 5, icon: "💧", nameEn: "Pump", nameAm: "ፓምፕ", roomEn: "Garden", roomAm: "አትክልት", gpio: 5, power: 250, state: false, autoMode: false }
];

// ==================== INITIALIZATION ====================

document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 Estif Home 1000X Initializing...');
    
    // Load settings
    loadSettings();
    
    // Initialize devices
    AppState.devices = [...DevicesData];
    
    // Setup event listeners
    setupEventListeners();
    
    // Setup mobile menu
    setupMobileMenu();
    
    // Check authentication
    checkAuth();
    
    // Setup WebSocket
    setupWebSocket();
    
    // Setup Voice Recognition
    setupVoiceRecognition();
    
    // Start auto refresh
    startAutoRefresh();
    
    // Apply theme
    applyTheme();
    
    console.log('✅ Application Ready');
});

// ==================== MOBILE MENU ====================

function setupMobileMenu() {
    const menuToggle = document.getElementById('menuToggle');
    const sidebar = document.getElementById('sidebar');
    
    if (menuToggle) {
        menuToggle.addEventListener('click', (e) => {
            e.stopPropagation();
            if (sidebar) {
                sidebar.classList.toggle('open');
            }
        });
    }
    
    // Close sidebar when clicking outside on mobile
    document.addEventListener('click', (e) => {
        const sidebar = document.getElementById('sidebar');
        const menuToggle = document.getElementById('menuToggle');
        
        if (window.innerWidth <= 768 && sidebar && sidebar.classList.contains('open')) {
            if (!sidebar.contains(e.target) && e.target !== menuToggle && !menuToggle?.contains(e.target)) {
                sidebar.classList.remove('open');
            }
        }
    });
    
    // Close sidebar on window resize if screen becomes larger
    window.addEventListener('resize', () => {
        const sidebar = document.getElementById('sidebar');
        if (window.innerWidth > 768 && sidebar) {
            sidebar.classList.remove('open');
        }
    });
}

// ==================== AUTHENTICATION ====================

function checkAuth() {
    const savedUser = localStorage.getItem('currentUser');
    
    if (savedUser) {
        try {
            AppState.currentUser = JSON.parse(savedUser);
            AppState.isLoggedIn = true;
            showDashboardPage();
            updateUserProfile();
        } catch (e) {
            showLoginPage();
        }
    } else {
        showLoginPage();
    }
}

function showLoginPage() {
    document.querySelectorAll('.page-container').forEach(p => p.classList.remove('active'));
    const loginPage = document.getElementById('login-page');
    if (loginPage) loginPage.classList.add('active');
    
    // Hide sidebar and top bar
    const sidebar = document.querySelector('.sidebar');
    const topBar = document.querySelector('.top-bar');
    if (sidebar) sidebar.style.display = 'none';
    if (topBar) topBar.style.display = 'none';
}

function showDashboardPage() {
    document.querySelectorAll('.page-container').forEach(p => p.classList.remove('active'));
    const dashboardPage = document.getElementById('dashboard-page');
    if (dashboardPage) dashboardPage.classList.add('active');
    
    // Show sidebar and top bar
    const sidebar = document.querySelector('.sidebar');
    const topBar = document.querySelector('.top-bar');
    if (sidebar) sidebar.style.display = 'flex';
    if (topBar) topBar.style.display = 'flex';
    
    // Initialize UI
    renderDeviceGrid();
    updateStatistics();
    updateUILanguage();
    
    // Set current page
    AppState.currentPage = 'dashboard';
    const t = Translations[AppState.language];
    const pageTitle = document.getElementById('pageTitle');
    if (pageTitle) pageTitle.textContent = t.dashboard;
}

function handleLogin(event) {
    event.preventDefault();
    
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;
    const t = Translations[AppState.language];
    
    const user = Users.find(u => u.email === email && u.password === password);
    
    if (user) {
        AppState.currentUser = user;
        AppState.isLoggedIn = true;
        
        localStorage.setItem('currentUser', JSON.stringify(user));
        
        showToast(`${t.loginSuccess} ${user.name}!`, 'success');
        showDashboardPage();
        updateUserProfile();
        
        // Update UI language based on user preference
        if (user.language) {
            setLanguage(user.language);
        }
    } else {
        showToast(t.loginFailed, 'error');
    }
}

function handleRegister(event) {
    event.preventDefault();
    
    const name = document.getElementById('regName').value;
    const email = document.getElementById('regEmail').value;
    const password = document.getElementById('regPassword').value;
    const confirmPassword = document.getElementById('regConfirmPassword').value;
    const t = Translations[AppState.language];
    
    // Check if passwords match
    if (password !== confirmPassword) {
        showToast(t.passwordMismatch, 'error');
        return;
    }
    
    // Check if email exists
    if (Users.find(u => u.email === email)) {
        showToast(t.emailExists, 'error');
        return;
    }
    
    // Create new user
    const newUser = {
        id: Users.length + 1,
        email: email,
        password: password,
        name: name,
        nameAm: name,
        role: 'user',
        avatar: '👤',
        createdAt: new Date()
    };
    
    Users.push(newUser);
    
    showToast(t.registerSuccess, 'success');
    
    // Switch to login page
    showLoginOnly();
    
    // Clear form
    document.getElementById('registerForm').reset();
}

function showLoginOnly() {
    document.getElementById('loginForm').reset();
    document.getElementById('registerForm').style.display = 'none';
    document.getElementById('loginForm').style.display = 'block';
    const switchForm = document.querySelector('.switch-form');
    if (switchForm) {
        switchForm.innerHTML = `
            <p>${Translations[AppState.language].noAccount} <a href="#" onclick="showRegisterOnly()">${Translations[AppState.language].register}</a></p>
        `;
    }
}

function showRegisterOnly() {
    document.getElementById('registerForm').reset();
    document.getElementById('loginForm').style.display = 'none';
    document.getElementById('registerForm').style.display = 'block';
    const switchForm = document.querySelector('.switch-form');
    if (switchForm) {
        switchForm.innerHTML = `
            <p>${Translations[AppState.language].hasAccount} <a href="#" onclick="showLoginOnly()">${Translations[AppState.language].login}</a></p>
        `;
    }
}

function logout() {
    localStorage.removeItem('currentUser');
    AppState.currentUser = null;
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

// ==================== SETTINGS MANAGEMENT ====================

function loadSettings() {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme) AppState.theme = savedTheme;
    
    const savedLang = localStorage.getItem('language');
    if (savedLang) AppState.language = savedLang;
}

function saveSettings() {
    localStorage.setItem('theme', AppState.theme);
    localStorage.setItem('language', AppState.language);
}

// ==================== THEME MANAGEMENT ====================

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
    applyTheme();
    saveSettings();
    const t = Translations[AppState.language];
    showToast(`${AppState.theme === 'light' ? 'Light' : 'Dark'} mode enabled`, 'info');
}

// ==================== LANGUAGE MANAGEMENT ====================

function setLanguage(lang) {
    AppState.language = lang;
    saveSettings();
    
    updateUILanguage();
    renderDeviceGrid();
    updateLanguageButtons();
    updateUserProfile();
    
    if (AppState.recognition) {
        AppState.recognition.lang = lang === 'en' ? 'en-US' : 'am-ET';
    }
    
    const t = Translations[AppState.language];
    showToast(`Language: ${lang === 'en' ? 'English' : 'Amharic'}`, 'success');
}

function updateUILanguage() {
    const t = Translations[AppState.language];
    
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        if (t[key]) el.textContent = t[key];
    });
    
    document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
        const key = el.getAttribute('data-i18n-placeholder');
        if (t[key]) el.placeholder = t[key];
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

// ==================== NAVIGATION ====================

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
    
    // Close sidebar on mobile after navigation
    if (window.innerWidth <= 768) {
        const sidebar = document.getElementById('sidebar');
        if (sidebar) sidebar.classList.remove('open');
    }
}

// ==================== DEVICE MANAGEMENT ====================

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

function toggleDevice(deviceId) {
    const device = AppState.devices.find(d => d.id === deviceId);
    if (!device) return;
    
    // Check if device is in auto mode
    if (device.autoMode) {
        const t = Translations[AppState.language];
        showToast(t.autoModeBlock, 'warning');
        return;
    }
    
    // Toggle device state
    device.state = !device.state;
    renderDeviceGrid();
    updateStatistics();
    
    // Send to server
    sendDeviceCommand(deviceId, device.state);
    
    // Log activity
    const t = Translations[AppState.language];
    const deviceName = AppState.language === 'en' ? device.nameEn : device.nameAm;
    addActivityLog(`${deviceName} turned ${device.state ? 'ON' : 'OFF'}`, 'device');
}

function toggleAutoMode(deviceId) {
    const device = AppState.devices.find(d => d.id === deviceId);
    if (!device) return;
    
    device.autoMode = !device.autoMode;
    renderDeviceGrid();
    
    const t = Translations[AppState.language];
    const deviceName = AppState.language === 'en' ? device.nameEn : device.nameAm;
    showToast(`${deviceName} ${device.autoMode ? t.autoModeEnabled : t.autoModeDisabled}`, 'info');
    
    // Send to server
    sendAutoModeCommand(deviceId, device.autoMode);
}

function masterAllOn() {
    if (!AppState.isLoggedIn) return;
    
    AppState.devices.forEach(device => {
        if (!device.autoMode) {
            device.state = true;
            sendDeviceCommand(device.id, true);
        }
    });
    renderDeviceGrid();
    updateStatistics();
    
    const t = Translations[AppState.language];
    showToast(t.allOn, 'success');
    addActivityLog('All devices turned ON', 'system');
}

function masterAllOff() {
    if (!AppState.isLoggedIn) return;
    
    AppState.devices.forEach(device => {
        if (!device.autoMode) {
            device.state = false;
            sendDeviceCommand(device.id, false);
        }
    });
    renderDeviceGrid();
    updateStatistics();
    
    const t = Translations[AppState.language];
    showToast(t.allOff, 'info');
    addActivityLog('All devices turned OFF', 'system');
}

// ==================== API COMMUNICATION ====================

function sendDeviceCommand(deviceId, state) {
    if (AppState.socket && AppState.wsConnected) {
        AppState.socket.emit('device_control', { deviceId, state });
    } else {
        fetch(`/api/device/${deviceId}/state`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ state })
        }).catch(console.error);
    }
}

function sendAutoModeCommand(deviceId, enabled) {
    if (AppState.socket && AppState.wsConnected) {
        AppState.socket.emit('auto_mode', { deviceId, enabled });
    } else {
        fetch(`/api/device/${deviceId}/auto`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ enabled })
        }).catch(console.error);
    }
}

// ==================== STATISTICS ====================

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

// ==================== WEB SOCKET ====================

function setupWebSocket() {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}`;
    
    AppState.socket = io(wsUrl);
    
    AppState.socket.on('connect', () => {
        AppState.wsConnected = true;
        updateConnectionStatus(true);
        const t = Translations[AppState.language];
        showToast('Real-time connection established', 'success');
    });
    
    AppState.socket.on('disconnect', () => {
        AppState.wsConnected = false;
        updateConnectionStatus(false);
        const t = Translations[AppState.language];
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

// ==================== VOICE RECOGNITION ====================

function setupVoiceRecognition() {
    if (!('webkitSpeechRecognition' in window)) return;
    
    AppState.recognition = new webkitSpeechRecognition();
    AppState.recognition.continuous = true;
    AppState.recognition.interimResults = true;
    AppState.recognition.lang = AppState.language === 'en' ? 'en-US' : 'am-ET';
    
    AppState.recognition.onstart = () => {
        AppState.isListening = true;
        updateVoiceUI(true);
        const t = Translations[AppState.language];
        showToast('Listening for wake word...', 'info');
    };
    
    AppState.recognition.onresult = (event) => {
        const transcript = Array.from(event.results)
            .map(result => result[0].transcript.toLowerCase())
            .join(' ');
        processVoiceInput(transcript);
    };
    
    AppState.recognition.onerror = () => stopVoiceRecognition();
    AppState.recognition.onend = () => {
        if (AppState.isListening) AppState.recognition.start();
    };
}

function toggleVoiceRecognition() {
    if (AppState.isListening) {
        stopVoiceRecognition();
    } else {
        startVoiceRecognition();
    }
}

function startVoiceRecognition() {
    if (AppState.recognition) {
        AppState.recognition.lang = AppState.language === 'en' ? 'en-US' : 'am-ET';
        AppState.recognition.start();
        AppState.isListening = true;
        updateVoiceUI(true);
    }
}

function stopVoiceRecognition() {
    if (AppState.recognition) {
        AppState.recognition.stop();
        AppState.isListening = false;
        AppState.wakeWordDetected = false;
        updateVoiceUI(false);
    }
}

function processVoiceInput(transcript) {
    const wakeWords = {
        en: ['hey estiph', 'hey estif', 'estiph', 'ok estiph'],
        am: ['ሰላም እስቲፍ', 'እስቲፍ', 'ሰላም']
    };
    
    if (!AppState.wakeWordDetected) {
        const currentWakeWords = wakeWords[AppState.language];
        for (const wake of currentWakeWords) {
            if (transcript.includes(wake)) {
                AppState.wakeWordDetected = true;
                speakResponse(getWakeResponse());
                setTimeout(() => { AppState.wakeWordDetected = false; }, 5000);
                return;
            }
        }
        return;
    }
    
    const commands = {
        en: {
            'light on': () => toggleDevice(0),
            'light off': () => toggleDevice(0),
            'fan on': () => toggleDevice(1),
            'fan off': () => toggleDevice(1),
            'ac on': () => toggleDevice(2),
            'ac off': () => toggleDevice(2),
            'all on': () => masterAllOn(),
            'all off': () => masterAllOff(),
            'temperature': () => speakResponse(`Temperature is ${AppState.systemStats.temperature} degrees`)
        },
        am: {
            'መብራት አብራ': () => toggleDevice(0),
            'መብራት አጥፋ': () => toggleDevice(0),
            'ማራገቢያ አብራ': () => toggleDevice(1),
            'ማራገቢያ አጥፋ': () => toggleDevice(1),
            'ሁሉንም አብራ': () => masterAllOn(),
            'ሁሉንም አጥፋ': () => masterAllOff(),
            'ሙቀቱ ስንት ነው': () => speakResponse(`ሙቀቱ ${AppState.systemStats.temperature} ዲግሪ ነው`)
        }
    };
    
    const currentCommands = commands[AppState.language];
    for (const [cmd, action] of Object.entries(currentCommands)) {
        if (transcript.includes(cmd.toLowerCase())) {
            action();
            speakResponse(getConfirmationResponse());
            AppState.wakeWordDetected = false;
            return;
        }
    }
    
    speakResponse(getNotFoundResponse());
}

function speakResponse(text) {
    if ('speechSynthesis' in window) {
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = AppState.language === 'en' ? 'en-US' : 'am-ET';
        utterance.rate = 0.9;
        window.speechSynthesis.cancel();
        window.speechSynthesis.speak(utterance);
    }
}

function getWakeResponse() {
    const responses = {
        en: ['Yes?', 'I\'m listening', 'How can I help?'],
        am: ['አዎ?', 'እያዳመጥኩ ነው', 'ምን እረዳሃለሁ?']
    };
    const list = responses[AppState.language];
    return list[Math.floor(Math.random() * list.length)];
}

function getConfirmationResponse() {
    const responses = {
        en: ['Done!', 'Command executed', 'All set!'],
        am: ['ተሰራ!', 'ትእዛዝ ተፈጸመ', 'ተዘጋጀ!']
    };
    const list = responses[AppState.language];
    return list[Math.floor(Math.random() * list.length)];
}

function getNotFoundResponse() {
    const responses = {
        en: ['Sorry, I didn\'t understand', 'Could you repeat that?'],
        am: ['ይቅርታ አልገባኝም', 'እባክህ ድገምልኝ']
    };
    const list = responses[AppState.language];
    return list[Math.floor(Math.random() * list.length)];
}

function updateVoiceUI(isListening) {
    const voiceBtn = document.getElementById('voiceBtn');
    const voiceDisplay = document.getElementById('voiceCommandText');
    const t = Translations[AppState.language];
    
    if (voiceBtn) {
        if (isListening) {
            voiceBtn.classList.add('listening');
            voiceBtn.innerHTML = '<i class="fas fa-microphone-alt"></i>';
        } else {
            voiceBtn.classList.remove('listening');
            voiceBtn.innerHTML = '<i class="fas fa-microphone-alt"></i>';
        }
    }
    
    if (voiceDisplay) {
        voiceDisplay.textContent = isListening ? t.listening : t.wakeWord;
    }
}

// ==================== ACTIVITY LOG ====================

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

// ==================== CONNECTION STATUS ====================

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

// ==================== UI HELPERS ====================

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

function startAutoRefresh() {
    setInterval(() => {
        if (AppState.autoRefresh && AppState.isLoggedIn) {
            updateStatistics();
        }
    }, 5000);
}

// ==================== EVENT LISTENERS ====================

function setupEventListeners() {
    // Close sidebar when clicking outside on mobile (handled in setupMobileMenu)
    
    // Handle window resize (handled in setupMobileMenu)
}

// ==================== MODAL FUNCTIONS ====================

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