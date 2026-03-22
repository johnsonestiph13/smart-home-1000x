/**
 * Notification System Module
 * Handles push notifications, alerts, and system messages
 */

class NotificationSystem {
    constructor() {
        this.notifications = [];
        this.unreadCount = 0;
        this.channels = {
            toast: true,
            sound: true,
            badge: true,
            push: false
        };
        
        this.soundEnabled = true;
        this.audioContext = null;
        
        this.init();
    }
    
    init() {
        this.loadNotifications();
        this.loadSettings();
        this.setupAudio();
        this.setupNotificationPermissions();
        this.startNotificationChecker();
    }
    
    loadNotifications() {
        try {
            const saved = localStorage.getItem('notifications');
            if (saved) {
                this.notifications = JSON.parse(saved);
                this.updateUnreadCount();
            } else {
                // Add sample notifications
                this.addSampleNotifications();
            }
        } catch (e) {
            console.error('Failed to load notifications:', e);
        }
    }
    
    addSampleNotifications() {
        const samples = [
            {
                id: Date.now(),
                title: 'Welcome to Estif Home!',
                message: 'Your smart home system is ready. Start controlling your devices.',
                type: 'info',
                timestamp: Date.now(),
                read: false,
                icon: '🏠'
            },
            {
                id: Date.now() + 1,
                title: 'System Update Available',
                message: 'New firmware version 2.0 is available for ESP32.',
                type: 'info',
                timestamp: Date.now() - 3600000,
                read: false,
                icon: '🔄'
            },
            {
                id: Date.now() + 2,
                title: 'Energy Saving Tip',
                message: 'Turn off lights when not in use to save 15% energy.',
                type: 'tip',
                timestamp: Date.now() - 7200000,
                read: false,
                icon: '💡'
            }
        ];
        
        this.notifications = samples;
        this.updateUnreadCount();
        this.saveNotifications();
    }
    
    setupAudio() {
        // Create audio context for sound effects
        try {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        } catch (e) {
            console.log('Web Audio API not supported');
        }
    }
    
    setupNotificationPermissions() {
        if ('Notification' in window && Notification.permission !== 'granted') {
            // Don't ask immediately, wait for user interaction
            document.addEventListener('click', () => {
                if (Notification.permission === 'default') {
                    Notification.requestPermission();
                }
            }, { once: true });
        }
    }
    
    startNotificationChecker() {
        // Check for system notifications every minute
        setInterval(() => {
            this.checkSystemNotifications();
        }, 60000);
        
        // Check for device events
        this.monitorDeviceEvents();
    }
    
    monitorDeviceEvents() {
        // Monitor device state changes
        const originalToggle = window.toggleDevice;
        if (originalToggle) {
            window.toggleDevice = (index) => {
                originalToggle(index);
                const device = window.AppState?.devices[index];
                if (device) {
                    this.addDeviceNotification(index, device.state);
                }
            };
        }
        
        // Monitor temperature changes
        setInterval(() => {
            const temp = window.AppState?.systemStats?.temperature;
            if (temp) {
                this.checkTemperatureAlert(temp);
            }
        }, 60000);
    }
    
    checkSystemNotifications() {
        // Check for ESP32 connection status
        if (window.AppState) {
            const espConnected = window.AppState.espConnected;
            if (espConnected === false && !this.lastConnectionAlert) {
                this.addNotification({
                    title: 'ESP32 Disconnected',
                    message: 'Lost connection to ESP32. Please check WiFi.',
                    type: 'warning',
                    icon: '⚠️',
                    autoClose: false
                });
                this.lastConnectionAlert = true;
            } else if (espConnected === true && this.lastConnectionAlert) {
                this.addNotification({
                    title: 'ESP32 Connected',
                    message: 'Connection restored to ESP32.',
                    type: 'success',
                    icon: '✅',
                    autoClose: true
                });
                this.lastConnectionAlert = false;
            }
        }
        
        // Check for high energy usage
        const totalPower = window.AppState?.devices?.reduce((sum, d) => sum + (d.state ? d.power : 0), 0) || 0;
        if (totalPower > 500 && !this.lastHighEnergyAlert) {
            this.addNotification({
                title: 'High Energy Usage',
                message: `Current power consumption: ${totalPower}W. Consider turning off unused devices.`,
                type: 'warning',
                icon: '⚡',
                autoClose: false
            });
            this.lastHighEnergyAlert = true;
        } else if (totalPower < 200 && this.lastHighEnergyAlert) {
            this.lastHighEnergyAlert = false;
        }
    }
    
    checkTemperatureAlert(temperature) {
        if (temperature > 30 && !this.lastHighTempAlert) {
            this.addNotification({
                title: 'High Temperature',
                message: `Temperature reached ${temperature}°C. AC recommended.`,
                type: 'warning',
                icon: '🌡️',
                autoClose: false
            });
            this.lastHighTempAlert = true;
        } else if (temperature < 25 && this.lastHighTempAlert) {
            this.lastHighTempAlert = false;
        }
        
        if (temperature < 15 && !this.lastLowTempAlert) {
            this.addNotification({
                title: 'Low Temperature',
                message: `Temperature dropped to ${temperature}°C. Heater recommended.`,
                type: 'info',
                icon: '❄️',
                autoClose: false
            });
            this.lastLowTempAlert = true;
        } else if (temperature > 18 && this.lastLowTempAlert) {
            this.lastLowTempAlert = false;
        }
    }
    
    addDeviceNotification(deviceId, state) {
        const device = window.AppState?.devices[deviceId];
        if (!device) return;
        
        const deviceName = window.AppState?.language === 'en' ? device.nameEn : device.nameAm;
        
        this.addNotification({
            title: `${deviceName} ${state ? 'ON' : 'OFF'}`,
            message: `${deviceName} was turned ${state ? 'on' : 'off'} ${state ? 'manually' : 'automatically'}.`,
            type: state ? 'success' : 'info',
            icon: device.icon,
            autoClose: true,
            deviceId: deviceId
        });
    }
    
    addNotification(notification) {
        const newNotification = {
            id: Date.now(),
            ...notification,
            timestamp: Date.now(),
            read: false
        };
        
        this.notifications.unshift(newNotification);
        this.updateUnreadCount();
        this.saveNotifications();
        
        // Show based on channel settings
        this.showNotification(newNotification);
        
        // Auto-close if specified
        if (notification.autoClose !== false) {
            setTimeout(() => {
                const index = this.notifications.findIndex(n => n.id === newNotification.id);
                if (index !== -1 && this.notifications[index].read === false) {
                    this.markAsRead(newNotification.id);
                }
            }, 5000);
        }
        
        return newNotification;
    }
    
    showNotification(notification) {
        // Toast notification
        if (this.channels.toast && window.showToast) {
            window.showToast(notification.message, notification.type);
        }
        
        // Sound notification
        if (this.channels.sound && this.soundEnabled) {
            this.playSound(notification.type);
        }
        
        // Browser notification
        if (this.channels.push && Notification.permission === 'granted') {
            new Notification(notification.title, {
                body: notification.message,
                icon: `/assets/icons/icon-192.png`
            });
        }
        
        // Update badge count
        if (this.channels.badge) {
            this.updateBadgeCount();
        }
        
        // Add to activity log
        if (window.addActivityLog) {
            window.addActivityLog(`[Notification] ${notification.title}: ${notification.message}`);
        }
    }
    
    playSound(type) {
        if (!this.audioContext) return;
        
        // Create simple beep sound
        const oscillator = this.audioContext.createOscillator();
        const gain = this.audioContext.createGain();
        
        oscillator.connect(gain);
        gain.connect(this.audioContext.destination);
        
        // Set frequency based on type
        switch(type) {
            case 'success':
                oscillator.frequency.value = 880;
                gain.gain.value = 0.3;
                break;
            case 'warning':
                oscillator.frequency.value = 440;
                gain.gain.value = 0.4;
                break;
            case 'error':
                oscillator.frequency.value = 220;
                gain.gain.value = 0.4;
                break;
            default:
                oscillator.frequency.value = 660;
                gain.gain.value = 0.2;
        }
        
        oscillator.start();
        gain.gain.exponentialRampToValueAtTime(0.00001, this.audioContext.currentTime + 0.5);
        oscillator.stop(this.audioContext.currentTime + 0.5);
        
        // Resume audio context if suspended
        if (this.audioContext.state === 'suspended') {
            this.audioContext.resume();
        }
    }
    
    markAsRead(notificationId) {
        const notification = this.notifications.find(n => n.id === notificationId);
        if (notification && !notification.read) {
            notification.read = true;
            this.updateUnreadCount();
            this.saveNotifications();
            this.renderNotifications();
            return true;
        }
        return false;
    }
    
    markAllAsRead() {
        this.notifications.forEach(n => n.read = true);
        this.unreadCount = 0;
        this.saveNotifications();
        this.renderNotifications();
        this.updateBadgeCount();
    }
    
    deleteNotification(notificationId) {
        const index = this.notifications.findIndex(n => n.id === notificationId);
        if (index !== -1) {
            this.notifications.splice(index, 1);
            this.updateUnreadCount();
            this.saveNotifications();
            this.renderNotifications();
            return true;
        }
        return false;
    }
    
    clearAll() {
        this.notifications = [];
        this.unreadCount = 0;
        this.saveNotifications();
        this.renderNotifications();
        this.updateBadgeCount();
    }
    
    updateUnreadCount() {
        this.unreadCount = this.notifications.filter(n => !n.read).length;
        this.updateBadgeCount();
    }
    
    updateBadgeCount() {
        const badge = document.getElementById('notificationBadge');
        if (badge) {
            if (this.unreadCount > 0) {
                badge.textContent = this.unreadCount > 99 ? '99+' : this.unreadCount;
                badge.style.display = 'inline-block';
            } else {
                badge.style.display = 'none';
            }
        }
    }
    
    saveNotifications() {
        try {
            // Keep only last 100 notifications
            const toSave = this.notifications.slice(0, 100);
            localStorage.setItem('notifications', JSON.stringify(toSave));
        } catch (e) {
            console.error('Failed to save notifications:', e);
        }
    }
    
    loadSettings() {
        try {
            const saved = localStorage.getItem('notification_settings');
            if (saved) {
                this.channels = JSON.parse(saved);
            }
        } catch (e) {
            console.error('Failed to load notification settings:', e);
        }
    }
    
    saveSettings() {
        try {
            localStorage.setItem('notification_settings', JSON.stringify(this.channels));
        } catch (e) {
            console.error('Failed to save notification settings:', e);
        }
    }
    
    updateSettings(channel, enabled) {
        if (this.channels.hasOwnProperty(channel)) {
            this.channels[channel] = enabled;
            this.saveSettings();
            
            if (window.showToast) {
                window.showToast(`${channel} notifications ${enabled ? 'enabled' : 'disabled'}`, 'info');
            }
            return true;
        }
        return false;
    }
    
    toggleSound() {
        this.soundEnabled = !this.soundEnabled;
        localStorage.setItem('sound_enabled', this.soundEnabled);
        
        if (this.soundEnabled && this.audioContext && this.audioContext.state === 'suspended') {
            this.audioContext.resume();
        }
        
        if (window.showToast) {
            window.showToast(`Sound ${this.soundEnabled ? 'enabled' : 'disabled'}`, 'info');
        }
        
        return this.soundEnabled;
    }
    
    renderNotifications() {
        const container = document.getElementById('notificationsList');
        if (!container) return;
        
        if (this.notifications.length === 0) {
            container.innerHTML = '<div class="empty-notifications">No notifications yet</div>';
            return;
        }
        
        container.innerHTML = this.notifications.map(notification => `
            <div class="notification-item ${notification.read ? 'read' : 'unread'}">
                <div class="notification-icon">${notification.icon || this.getTypeIcon(notification.type)}</div>
                <div class="notification-content">
                    <div class="notification-title">${notification.title}</div>
                    <div class="notification-message">${notification.message}</div>
                    <div class="notification-time">${this.formatTime(notification.timestamp)}</div>
                </div>
                <div class="notification-actions">
                    ${!notification.read ? `
                        <button class="notification-btn" onclick="window.notificationSystem.markAsRead(${notification.id})">
                            <i class="fas fa-check"></i>
                        </button>
                    ` : ''}
                    <button class="notification-btn delete" onclick="window.notificationSystem.deleteNotification(${notification.id})">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
            </div>
        `).join('');
    }
    
    getTypeIcon(type) {
        const icons = {
            success: '✅',
            error: '❌',
            warning: '⚠️',
            info: 'ℹ️',
            tip: '💡'
        };
        return icons[type] || '📢';
    }
    
    formatTime(timestamp) {
        const diff = Date.now() - timestamp;
        const minutes = Math.floor(diff / 60000);
        const hours = Math.floor(minutes / 60);
        const days = Math.floor(hours / 24);
        
        if (minutes < 1) return 'Just now';
        if (minutes < 60) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
        if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
        if (days < 7) return `${days} day${days > 1 ? 's' : ''} ago`;
        
        return new Date(timestamp).toLocaleDateString();
    }
    
    getNotifications(filter = 'all', limit = 50) {
        let filtered = this.notifications;
        
        switch(filter) {
            case 'unread':
                filtered = filtered.filter(n => !n.read);
                break;
            case 'read':
                filtered = filtered.filter(n => n.read);
                break;
        }
        
        return filtered.slice(0, limit);
    }
    
    getUnreadCount() {
        return this.unreadCount;
    }
    
    exportNotifications() {
        return JSON.stringify(this.notifications, null, 2);
    }
}

// Initialize Notification System
window.notificationSystem = new NotificationSystem();

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = NotificationSystem;
}