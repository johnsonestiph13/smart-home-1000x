/**
 * API Client Module
 * Handles all HTTP requests to the backend server with retry logic and error handling
 */

class APIClient {
    constructor() {
        this.baseURL = this.getBaseURL();
        this.timeout = 30000; // 30 seconds
        this.retryAttempts = 3;
        this.retryDelay = 1000; // 1 second
        this.headers = {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        };
        
        this.init();
    }
    
    init() {
        // Load saved server URL
        const savedURL = localStorage.getItem('server_url');
        if (savedURL) {
            this.baseURL = savedURL;
        }
        
        // Add auth token if exists
        this.addAuthToken();
    }
    
    getBaseURL() {
        // Check if running in development or production
        if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
            return `http://${window.location.hostname}:3000/api`;
        }
        return `${window.location.protocol}//${window.location.host}/api`;
    }
    
    addAuthToken() {
        const token = localStorage.getItem('auth_token');
        if (token) {
            this.headers['Authorization'] = `Bearer ${token}`;
        }
    }
    
    setBaseURL(url) {
        this.baseURL = url;
        localStorage.setItem('server_url', url);
    }
    
    async request(endpoint, options = {}) {
        const url = `${this.baseURL}${endpoint}`;
        const config = {
            ...options,
            headers: {
                ...this.headers,
                ...options.headers
            },
            timeout: this.timeout
        };
        
        let lastError = null;
        
        for (let attempt = 1; attempt <= this.retryAttempts; attempt++) {
            try {
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), this.timeout);
                
                const response = await fetch(url, {
                    ...config,
                    signal: controller.signal
                });
                
                clearTimeout(timeoutId);
                
                if (!response.ok) {
                    const errorData = await response.json().catch(() => ({}));
                    throw new APIError(
                        errorData.message || `HTTP ${response.status}`,
                        response.status,
                        errorData
                    );
                }
                
                const data = await response.json();
                return {
                    success: true,
                    data: data,
                    status: response.status
                };
                
            } catch (error) {
                lastError = error;
                console.warn(`API request failed (attempt ${attempt}/${this.retryAttempts}):`, error.message);
                
                if (attempt < this.retryAttempts) {
                    await this.delay(this.retryDelay * attempt);
                    continue;
                }
            }
        }
        
        // Handle error after all retries
        this.handleError(lastError);
        return {
            success: false,
            error: lastError.message,
            status: lastError.status || 500
        };
    }
    
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    
    handleError(error) {
        console.error('API Error:', error);
        
        if (error.status === 401) {
            // Unauthorized - redirect to login
            if (window.showToast) {
                window.showToast('Session expired. Please login again.', 'error');
            }
            // Clear auth token
            localStorage.removeItem('auth_token');
            localStorage.removeItem('auth_user');
            // Redirect to login
            setTimeout(() => {
                window.location.href = '/login.html';
            }, 2000);
        } else if (error.status === 429) {
            if (window.showToast) {
                window.showToast('Too many requests. Please wait a moment.', 'warning');
            }
        } else if (error.status === 503) {
            if (window.showToast) {
                window.showToast('Server unavailable. Please try again later.', 'error');
            }
        }
    }
    
    // ========== Device APIs ==========
    
    async getDevices() {
        return this.request('/devices');
    }
    
    async getDevice(deviceId) {
        return this.request(`/devices/${deviceId}`);
    }
    
    async toggleDevice(deviceId) {
        return this.request(`/devices/${deviceId}/toggle`, {
            method: 'POST'
        });
    }
    
    async setDeviceState(deviceId, state) {
        return this.request(`/devices/${deviceId}/state`, {
            method: 'POST',
            body: JSON.stringify({ state })
        });
    }
    
    async setDeviceAutoMode(deviceId, enabled, conditions = null) {
        return this.request(`/devices/${deviceId}/auto`, {
            method: 'POST',
            body: JSON.stringify({ enabled, conditions })
        });
    }
    
    async masterControl(command) {
        return this.request(`/master/${command}`, {
            method: 'POST'
        });
    }
    
    // ========== Scene APIs ==========
    
    async getScenes() {
        return this.request('/scenes');
    }
    
    async createScene(sceneData) {
        return this.request('/scenes', {
            method: 'POST',
            body: JSON.stringify(sceneData)
        });
    }
    
    async activateScene(sceneId) {
        return this.request(`/scenes/${sceneId}/activate`, {
            method: 'POST'
        });
    }
    
    async deleteScene(sceneId) {
        return this.request(`/scenes/${sceneId}`, {
            method: 'DELETE'
        });
    }
    
    // ========== Automation APIs ==========
    
    async getAutomations() {
        return this.request('/automations');
    }
    
    async createAutomation(ruleData) {
        return this.request('/automations', {
            method: 'POST',
            body: JSON.stringify(ruleData)
        });
    }
    
    async updateAutomation(ruleId, updates) {
        return this.request(`/automations/${ruleId}`, {
            method: 'PUT',
            body: JSON.stringify(updates)
        });
    }
    
    async deleteAutomation(ruleId) {
        return this.request(`/automations/${ruleId}`, {
            method: 'DELETE'
        });
    }
    
    // ========== Schedule APIs ==========
    
    async getSchedules() {
        return this.request('/schedules');
    }
    
    async createSchedule(scheduleData) {
        return this.request('/schedules', {
            method: 'POST',
            body: JSON.stringify(scheduleData)
        });
    }
    
    async updateSchedule(scheduleId, updates) {
        return this.request(`/schedules/${scheduleId}`, {
            method: 'PUT',
            body: JSON.stringify(updates)
        });
    }
    
    async deleteSchedule(scheduleId) {
        return this.request(`/schedules/${scheduleId}`, {
            method: 'DELETE'
        });
    }
    
    // ========== Analytics APIs ==========
    
    async getEnergyStats(period = 'day') {
        return this.request(`/analytics/energy?period=${period}`);
    }
    
    async getDeviceStats(deviceId = null) {
        const endpoint = deviceId ? `/analytics/device/${deviceId}` : '/analytics/devices';
        return this.request(endpoint);
    }
    
    async getActivityLog(limit = 50, type = null) {
        let url = `/analytics/activity?limit=${limit}`;
        if (type) url += `&type=${type}`;
        return this.request(url);
    }
    
    async generateReport(startDate, endDate, metrics) {
        return this.request('/analytics/report', {
            method: 'POST',
            body: JSON.stringify({ startDate, endDate, metrics })
        });
    }
    
    // ========== ESP32 APIs ==========
    
    async registerESP32(espData) {
        return this.request('/esp/register', {
            method: 'POST',
            body: JSON.stringify(espData)
        });
    }
    
    async getESP32Status() {
        return this.request('/esp/status');
    }
    
    async sendESP32Command(espIP, command) {
        return this.request(`/esp/${espIP}/command`, {
            method: 'POST',
            body: JSON.stringify(command)
        });
    }
    
    // ========== User APIs ==========
    
    async login(email, password) {
        const response = await this.request('/auth/login', {
            method: 'POST',
            body: JSON.stringify({ email, password })
        });
        
        if (response.success && response.data.token) {
            localStorage.setItem('auth_token', response.data.token);
            localStorage.setItem('auth_user', JSON.stringify(response.data.user));
            this.addAuthToken();
        }
        
        return response;
    }
    
    async register(userData) {
        return this.request('/auth/register', {
            method: 'POST',
            body: JSON.stringify(userData)
        });
    }
    
    async logout() {
        const response = await this.request('/auth/logout', { method: 'POST' });
        localStorage.removeItem('auth_token');
        localStorage.removeItem('auth_user');
        this.headers['Authorization'] = undefined;
        return response;
    }
    
    async getProfile() {
        return this.request('/auth/profile');
    }
    
    async updateProfile(profileData) {
        return this.request('/auth/profile', {
            method: 'PUT',
            body: JSON.stringify(profileData)
        });
    }
    
    // ========== System APIs ==========
    
    async getSystemStatus() {
        return this.request('/system/status');
    }
    
    async getSystemHealth() {
        return this.request('/system/health');
    }
    
    async getSystemMetrics() {
        return this.request('/system/metrics');
    }
    
    async createBackup() {
        return this.request('/system/backup', {
            method: 'POST'
        });
    }
    
    async restoreBackup(backupId) {
        return this.request(`/system/restore/${backupId}`, {
            method: 'POST'
        });
    }
    
    // ========== Utility Methods ==========
    
    async ping() {
        const start = Date.now();
        const response = await this.request('/ping');
        const latency = Date.now() - start;
        return {
            success: response.success,
            latency: latency
        };
    }
    
    setAuthToken(token) {
        if (token) {
            this.headers['Authorization'] = `Bearer ${token}`;
        } else {
            delete this.headers['Authorization'];
        }
    }
    
    clearAuthToken() {
        delete this.headers['Authorization'];
        localStorage.removeItem('auth_token');
    }
}

// Custom API Error Class
class APIError extends Error {
    constructor(message, status, data) {
        super(message);
        this.name = 'APIError';
        this.status = status;
        this.data = data;
    }
}

// Initialize API Client
window.apiClient = new APIClient();

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = APIClient;
}