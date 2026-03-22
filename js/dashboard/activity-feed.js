/**
 * Activity Feed Module
 * Tracks and displays system activity, user actions, and device events
 */

class ActivityFeed {
    constructor() {
        this.activities = [];
        this.filters = {
            type: 'all', // all, device, system, automation, voice, security
            severity: 'all', // all, info, success, warning, error
            dateRange: null
        };
        this.maxActivities = 200;
        
        this.init();
    }
    
    init() {
        this.loadActivities();
        this.setupActivityTracking();
        this.setupEventListeners();
        this.renderActivityFeed();
        this.startAutoRefresh();
    }
    
    loadActivities() {
        try {
            const saved = localStorage.getItem('activity_feed');
            if (saved) {
                const parsed = JSON.parse(saved);
                this.activities = parsed.map(a => ({
                    ...a,
                    timestamp: new Date(a.timestamp)
                }));
            } else {
                // Add sample activities
                this.addSampleActivities();
            }
        } catch (e) {
            console.error('Failed to load activities:', e);
        }
    }
    
    addSampleActivities() {
        const samples = [
            {
                id: Date.now(),
                type: 'system',
                action: 'startup',
                message: 'System started successfully',
                severity: 'success',
                timestamp: new Date(),
                icon: '🚀',
                user: 'system'
            },
            {
                id: Date.now() - 1000,
                type: 'device',
                action: 'toggle',
                deviceId: 0,
                deviceName: 'Light',
                state: true,
                message: 'Light turned ON',
                severity: 'info',
                timestamp: new Date(Date.now() - 5 * 60 * 1000),
                icon: '💡',
                user: 'Admin'
            },
            {
                id: Date.now() - 2000,
                type: 'automation',
                action: 'schedule',
                ruleId: 'schedule_1',
                message: 'Morning schedule activated: Light ON',
                severity: 'info',
                timestamp: new Date(Date.now() - 30 * 60 * 1000),
                icon: '⏰',
                user: 'automation'
            },
            {
                id: Date.now() - 3000,
                type: 'voice',
                action: 'command',
                command: 'light on',
                message: 'Voice command: "Light on"',
                severity: 'success',
                timestamp: new Date(Date.now() - 1 * 60 * 60 * 1000),
                icon: '🎤',
                user: 'Admin'
            }
        ];
        
        this.activities = samples;
        this.saveActivities();
    }
    
    setupActivityTracking() {
        // Hook into device toggle events
        const originalToggle = window.toggleDevice;
        if (originalToggle) {
            window.toggleDevice = (index) => {
                originalToggle(index);
                const device = window.AppState?.devices[index];
                if (device) {
                    this.addActivity({
                        type: 'device',
                        action: 'toggle',
                        deviceId: index,
                        deviceName: window.AppState?.language === 'en' ? device.nameEn : device.nameAm,
                        state: device.state,
                        message: `${device.nameEn} turned ${device.state ? 'ON' : 'OFF'}`,
                        severity: device.state ? 'success' : 'info',
                        icon: device.icon
                    });
                }
            };
        }
        
        // Hook into master commands
        const originalMasterOn = window.masterAllOn;
        if (originalMasterOn) {
            window.masterAllOn = () => {
                originalMasterOn();
                this.addActivity({
                    type: 'device',
                    action: 'master',
                    message: 'All devices turned ON',
                    severity: 'success',
                    icon: '🔛'
                });
            };
        }
        
        const originalMasterOff = window.masterAllOff;
        if (originalMasterOff) {
            window.masterAllOff = () => {
                originalMasterOff();
                this.addActivity({
                    type: 'device',
                    action: 'master',
                    message: 'All devices turned OFF',
                    severity: 'info',
                    icon: '🔴'
                });
            };
        }
    }
    
    setupEventListeners() {
        // Listen for system events
        window.addEventListener('online', () => {
            this.addActivity({
                type: 'system',
                action: 'network',
                message: 'Network connection restored',
                severity: 'success',
                icon: '🌐'
            });
        });
        
        window.addEventListener('offline', () => {
            this.addActivity({
                type: 'system',
                action: 'network',
                message: 'Network connection lost',
                severity: 'warning',
                icon: '⚠️'
            });
        });
        
        // Listen for ESP32 connection events
        if (window.socket) {
            window.socket.on('esp_status', (data) => {
                this.addActivity({
                    type: 'system',
                    action: 'esp_connection',
                    message: `ESP32 ${data.connected ? 'connected' : 'disconnected'}`,
                    severity: data.connected ? 'success' : 'warning',
                    icon: '📡'
                });
            });
        }
    }
    
    addActivity(activity) {
        const newActivity = {
            id: Date.now(),
            ...activity,
            timestamp: new Date(),
            user: activity.user || (window.AppState?.user?.name || 'Admin')
        };
        
        this.activities.unshift(newActivity);
        
        // Limit activities
        if (this.activities.length > this.maxActivities) {
            this.activities.pop();
        }
        
        this.saveActivities();
        this.renderActivityFeed();
        
        // Auto-hide after 3 seconds if it's a temporary notification
        if (activity.autoHide !== false) {
            setTimeout(() => {
                const element = document.getElementById(`activity-${newActivity.id}`);
                if (element) {
                    element.classList.add('fade-out');
                    setTimeout(() => {
                        if (element.parentElement) element.remove();
                    }, 300);
                }
            }, 5000);
        }
        
        return newActivity;
    }
    
    saveActivities() {
        try {
            localStorage.setItem('activity_feed', JSON.stringify(this.activities));
        } catch (e) {
            console.error('Failed to save activities:', e);
        }
    }
    
    renderActivityFeed() {
        const container = document.getElementById('activityFeed');
        if (!container) return;
        
        let filteredActivities = this.filterActivities();
        
        if (filteredActivities.length === 0) {
            container.innerHTML = `
                <div class="empty-feed">
                    <i class="fas fa-inbox"></i>
                    <p>No activities to display</p>
                </div>
            `;
            return;
        }
        
        container.innerHTML = filteredActivities.map(activity => `
            <div class="activity-item ${activity.severity}" id="activity-${activity.id}" data-type="${activity.type}">
                <div class="activity-icon">
                    ${activity.icon || this.getActivityIcon(activity.type)}
                </div>
                <div class="activity-content">
                    <div class="activity-header">
                        <span class="activity-type">${this.getActivityTypeLabel(activity.type)}</span>
                        <span class="activity-time">${this.formatTime(activity.timestamp)}</span>
                    </div>
                    <div class="activity-message">${activity.message}</div>
                    <div class="activity-footer">
                        <span class="activity-user">
                            <i class="fas fa-user"></i> ${activity.user}
                        </span>
                        ${activity.deviceName ? `
                            <span class="activity-device">
                                <i class="fas fa-microchip"></i> ${activity.deviceName}
                            </span>
                        ` : ''}
                    </div>
                </div>
                <button class="activity-delete" onclick="window.activityFeed.deleteActivity(${activity.id})">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `).join('');
        
        this.updateActivityCount();
    }
    
    filterActivities() {
        let filtered = [...this.activities];
        
        // Filter by type
        if (this.filters.type !== 'all') {
            filtered = filtered.filter(a => a.type === this.filters.type);
        }
        
        // Filter by severity
        if (this.filters.severity !== 'all') {
            filtered = filtered.filter(a => a.severity === this.filters.severity);
        }
        
        // Filter by date range
        if (this.filters.dateRange) {
            const cutoff = new Date();
            switch(this.filters.dateRange) {
                case 'today':
                    cutoff.setHours(0, 0, 0, 0);
                    break;
                case 'week':
                    cutoff.setDate(cutoff.getDate() - 7);
                    break;
                case 'month':
                    cutoff.setMonth(cutoff.getMonth() - 1);
                    break;
            }
            filtered = filtered.filter(a => a.timestamp >= cutoff);
        }
        
        return filtered;
    }
    
    getActivityIcon(type) {
        const icons = {
            device: '🔌',
            system: '⚙️',
            automation: '🤖',
            voice: '🎤',
            security: '🔒',
            schedule: '⏰',
            scene: '🎬'
        };
        return icons[type] || '📋';
    }
    
    getActivityTypeLabel(type) {
        const labels = {
            en: {
                device: 'Device',
                system: 'System',
                automation: 'Automation',
                voice: 'Voice',
                security: 'Security',
                schedule: 'Schedule',
                scene: 'Scene'
            },
            am: {
                device: 'መሳሪያ',
                system: 'ስርዓት',
                automation: 'አውቶሜሽን',
                voice: 'ድምጽ',
                security: 'ደህንነት',
                schedule: 'መርሐግብር',
                scene: 'ሁነታ'
            }
        };
        const currentLang = window.AppState?.language || 'en';
        return labels[currentLang][type] || type;
    }
    
    formatTime(timestamp) {
        const now = new Date();
        const diff = now - timestamp;
        const minutes = Math.floor(diff / 60000);
        const hours = Math.floor(minutes / 60);
        const days = Math.floor(hours / 24);
        
        if (minutes < 1) return 'Just now';
        if (minutes < 60) return `${minutes} min ago`;
        if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
        if (days < 7) return `${days} day${days > 1 ? 's' : ''} ago`;
        
        return timestamp.toLocaleDateString();
    }
    
    deleteActivity(activityId) {
        const index = this.activities.findIndex(a => a.id === activityId);
        if (index !== -1) {
            this.activities.splice(index, 1);
            this.saveActivities();
            this.renderActivityFeed();
            
            if (window.showToast) {
                window.showToast('Activity deleted', 'info');
            }
        }
    }
    
    clearAllActivities() {
        this.activities = [];
        this.saveActivities();
        this.renderActivityFeed();
        
        if (window.showToast) {
            window.showToast('All activities cleared', 'info');
        }
    }
    
    setFilter(type, value) {
        if (this.filters.hasOwnProperty(type)) {
            this.filters[type] = value;
            this.renderActivityFeed();
            
            // Update active filter UI
            document.querySelectorAll(`.filter-${type}`).forEach(el => {
                el.classList.remove('active');
                if (el.dataset.value === value) {
                    el.classList.add('active');
                }
            });
        }
    }
    
    updateActivityCount() {
        const count = this.filterActivities().length;
        const badge = document.getElementById('activityCount');
        if (badge) {
            badge.textContent = count;
        }
    }
    
    startAutoRefresh() {
        // Auto-refresh every 30 seconds
        setInterval(() => {
            this.renderActivityFeed();
        }, 30000);
    }
    
    exportActivities() {
        return JSON.stringify(this.activities, null, 2);
    }
    
    importActivities(jsonData) {
        try {
            const imported = JSON.parse(jsonData);
            if (Array.isArray(imported)) {
                this.activities = [...imported, ...this.activities].slice(0, this.maxActivities);
                this.saveActivities();
                this.renderActivityFeed();
                return true;
            }
        } catch (e) {
            console.error('Failed to import activities:', e);
        }
        return false;
    }
    
    getActivitiesByType(type, limit = 20) {
        return this.activities
            .filter(a => a.type === type)
            .slice(0, limit);
    }
    
    getRecentActivities(limit = 20) {
        return this.activities.slice(0, limit);
    }
    
    getStatistics() {
        const stats = {
            total: this.activities.length,
            byType: {},
            bySeverity: {},
            last24h: 0,
            mostActiveDevice: null,
            deviceActivity: {}
        };
        
        const last24h = Date.now() - 24 * 60 * 60 * 1000;
        
        this.activities.forEach(activity => {
            // Count by type
            stats.byType[activity.type] = (stats.byType[activity.type] || 0) + 1;
            
            // Count by severity
            stats.bySeverity[activity.severity] = (stats.bySeverity[activity.severity] || 0) + 1;
            
            // Count last 24h
            if (activity.timestamp.getTime() >= last24h) {
                stats.last24h++;
            }
            
            // Count device activity
            if (activity.deviceId !== undefined) {
                stats.deviceActivity[activity.deviceId] = (stats.deviceActivity[activity.deviceId] || 0) + 1;
            }
        });
        
        // Find most active device
        let maxCount = 0;
        for (const [deviceId, count] of Object.entries(stats.deviceActivity)) {
            if (count > maxCount) {
                maxCount = count;
                stats.mostActiveDevice = parseInt(deviceId);
            }
        }
        
        return stats;
    }
    
    generateReport() {
        const stats = this.getStatistics();
        const currentLang = window.AppState?.language || 'en';
        
        return {
            generated: new Date().toISOString(),
            totalActivities: stats.total,
            activityBreakdown: stats.byType,
            severityBreakdown: stats.bySeverity,
            last24h: stats.last24h,
            mostActiveDevice: stats.mostActiveDevice !== null ? 
                (window.AppState?.devices[stats.mostActiveDevice]?.nameEn || 'Unknown') : 'None',
            summary: currentLang === 'en' 
                ? `Total ${stats.total} activities recorded. ${stats.last24h} in the last 24 hours.`
                : `ጠቅላላ የተመዘገቡ እንቅስቃሴዎች ${stats.total}. ባለፉት 24 ሰዓታት ውስጥ ${stats.last24h}.`
        };
    }
}

// Initialize Activity Feed
window.activityFeed = new ActivityFeed();

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ActivityFeed;
}