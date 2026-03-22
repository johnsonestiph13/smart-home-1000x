/**
 * Security Manager Module
 * Handles authentication, encryption, and security monitoring
 */

class SecurityManager {
    constructor() {
        this.isAuthenticated = false;
        this.user = null;
        this.token = null;
        this.loginAttempts = new Map();
        this.blockedIPs = new Set();
        this.securityLogs = [];
        this.twoFactorEnabled = false;
        this.twoFactorSecret = null;
        
        this.init();
    }
    
    init() {
        this.loadFromStorage();
        this.setupSecurityEvents();
        this.startMonitoring();
    }
    
    loadFromStorage() {
        try {
            const savedToken = localStorage.getItem('auth_token');
            const savedUser = localStorage.getItem('auth_user');
            
            if (savedToken && savedUser) {
                this.token = savedToken;
                this.user = JSON.parse(savedUser);
                this.isAuthenticated = true;
                this.validateToken();
            }
        } catch (e) {
            console.error('Failed to load auth data:', e);
        }
    }
    
    async login(email, password, twoFactorCode = null) {
        const ip = await this.getClientIP();
        
        // Check if IP is blocked
        if (this.blockedIPs.has(ip)) {
            this.logSecurityEvent('blocked_ip_attempt', { ip, email });
            return { success: false, error: 'IP address blocked' };
        }
        
        // Track login attempts
        const attempts = this.loginAttempts.get(ip) || 0;
        if (attempts >= 5) {
            this.blockedIPs.add(ip);
            this.logSecurityEvent('ip_blocked', { ip, email });
            return { success: false, error: 'Too many failed attempts. IP blocked.' };
        }
        
        // Validate credentials (mock for demo)
        if (email === 'admin@estifhome.com' && password === 'admin123') {
            if (this.twoFactorEnabled && twoFactorCode) {
                const isValid = this.verifyTwoFactor(twoFactorCode);
                if (!isValid) {
                    this.loginAttempts.set(ip, attempts + 1);
                    return { success: false, error: 'Invalid 2FA code' };
                }
            } else if (this.twoFactorEnabled && !twoFactorCode) {
                return { success: false, requires2FA: true };
            }
            
            // Generate token
            this.token = this.generateToken();
            this.user = { email, name: 'Admin User', role: 'admin' };
            this.isAuthenticated = true;
            
            // Save to storage
            localStorage.setItem('auth_token', this.token);
            localStorage.setItem('auth_user', JSON.stringify(this.user));
            
            // Clear login attempts
            this.loginAttempts.delete(ip);
            
            this.logSecurityEvent('successful_login', { ip, email });
            return { success: true, user: this.user, token: this.token };
        }
        
        // Failed login
        this.loginAttempts.set(ip, attempts + 1);
        this.logSecurityEvent('failed_login', { ip, email });
        
        return { success: false, error: 'Invalid credentials' };
    }
    
    logout() {
        this.logSecurityEvent('logout', { user: this.user?.email });
        this.isAuthenticated = false;
        this.user = null;
        this.token = null;
        localStorage.removeItem('auth_token');
        localStorage.removeItem('auth_user');
    }
    
    generateToken() {
        const payload = {
            user: this.user?.email,
            timestamp: Date.now(),
            random: Math.random().toString(36).substring(2)
        };
        return btoa(JSON.stringify(payload));
    }
    
    async validateToken() {
        if (!this.token) return false;
        
        try {
            const payload = JSON.parse(atob(this.token));
            const age = Date.now() - payload.timestamp;
            
            // Token expires after 24 hours
            if (age > 24 * 60 * 60 * 1000) {
                this.logout();
                return false;
            }
            
            return true;
        } catch (e) {
            this.logout();
            return false;
        }
    }
    
    setupTwoFactor() {
        const secret = this.generateSecret();
        this.twoFactorSecret = secret;
        this.twoFactorEnabled = true;
        
        // Generate QR code URL
        const otpauth = `otpauth://totp/EstifHome:${this.user?.email}?secret=${secret}&issuer=EstifHome`;
        
        this.logSecurityEvent('2fa_enabled', { user: this.user?.email });
        return { secret, otpauth };
    }
    
    generateSecret() {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
        let secret = '';
        for (let i = 0; i < 16; i++) {
            secret += chars[Math.floor(Math.random() * chars.length)];
        }
        return secret;
    }
    
    verifyTwoFactor(code) {
        // Simple TOTP verification (for demo)
        const expected = this.generateTOTP(this.twoFactorSecret);
        return code === expected;
    }
    
    generateTOTP(secret) {
        // Simplified TOTP for demo
        const time = Math.floor(Date.now() / 30000);
        const hash = this.simpleHash(secret + time);
        return hash.toString().slice(-6);
    }
    
    simpleHash(str) {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            hash = ((hash << 5) - hash) + str.charCodeAt(i);
            hash |= 0;
        }
        return Math.abs(hash);
    }
    
    async getClientIP() {
        try {
            const response = await fetch('https://api.ipify.org?format=json');
            const data = await response.json();
            return data.ip;
        } catch (e) {
            return '127.0.0.1';
        }
    }
    
    logSecurityEvent(event, details) {
        const log = {
            id: Date.now(),
            timestamp: new Date().toISOString(),
            event,
            details,
            userAgent: navigator.userAgent
        };
        
        this.securityLogs.unshift(log);
        
        // Keep only last 100 logs
        if (this.securityLogs.length > 100) {
            this.securityLogs.pop();
        }
        
        // Save to localStorage
        localStorage.setItem('security_logs', JSON.stringify(this.securityLogs));
        
        // Trigger alert for critical events
        if (event === 'blocked_ip_attempt' || event === 'failed_login' && this.loginAttempts.size > 3) {
            this.triggerSecurityAlert(log);
        }
        
        console.log('[Security]', event, details);
    }
    
    triggerSecurityAlert(log) {
        const alert = {
            type: 'security',
            severity: 'high',
            message: `Security event: ${log.event}`,
            details: log.details,
            timestamp: log.timestamp
        };
        
        // Show notification
        if (window.showToast) {
            window.showToast(`⚠️ Security Alert: ${log.event}`, 'warning');
        }
        
        // Save alert
        const alerts = JSON.parse(localStorage.getItem('security_alerts') || '[]');
        alerts.unshift(alert);
        localStorage.setItem('security_alerts', JSON.stringify(alerts.slice(0, 50)));
    }
    
    startMonitoring() {
        // Monitor for suspicious activity
        setInterval(() => {
            this.checkForSuspiciousActivity();
        }, 60000);
        
        // Clean old logs
        setInterval(() => {
            this.cleanOldLogs();
        }, 24 * 60 * 60 * 1000);
    }
    
    checkForSuspiciousActivity() {
        const recentLogs = this.securityLogs.slice(0, 10);
        const failedAttempts = recentLogs.filter(l => l.event === 'failed_login').length;
        
        if (failedAttempts >= 5) {
            this.triggerSecurityAlert({
                event: 'multiple_failures',
                details: { count: failedAttempts, period: 'last hour' }
            });
        }
    }
    
    cleanOldLogs() {
        const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000; // 30 days
        this.securityLogs = this.securityLogs.filter(l => l.timestamp > cutoff);
        localStorage.setItem('security_logs', JSON.stringify(this.securityLogs));
    }
    
    getSecurityLogs(limit = 50) {
        return this.securityLogs.slice(0, limit);
    }
    
    getSecurityAlerts() {
        return JSON.parse(localStorage.getItem('security_alerts') || '[]');
    }
    
    blockIP(ip) {
        this.blockedIPs.add(ip);
        this.logSecurityEvent('manual_ip_block', { ip });
        return true;
    }
    
    unblockIP(ip) {
        this.blockedIPs.delete(ip);
        this.logSecurityEvent('manual_ip_unblock', { ip });
        return true;
    }
    
    getBlockedIPs() {
        return Array.from(this.blockedIPs);
    }
    
    changePassword(oldPassword, newPassword) {
        // In production, verify old password and hash new password
        this.logSecurityEvent('password_changed', { user: this.user?.email });
        return true;
    }
    
    requireTwoFactor() {
        if (!this.twoFactorEnabled) {
            return this.setupTwoFactor();
        }
        return { enabled: true };
    }
    
    isAuthorized(requiredRole) {
        if (!this.isAuthenticated) return false;
        
        const roles = {
            admin: ['admin'],
            user: ['admin', 'user'],
            guest: ['admin', 'user', 'guest']
        };
        
        return roles[requiredRole]?.includes(this.user?.role) || false;
    }
}

// Initialize Security Manager
window.securityManager = new SecurityManager();

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = SecurityManager;
}