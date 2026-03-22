/**
 * Schedule Manager Module
 * Manages time-based schedules for devices and scenes
 */

class ScheduleManager {
    constructor() {
        this.schedules = [];
        this.scheduleHistory = [];
        this.activeSchedules = new Set();
        
        this.init();
    }
    
    init() {
        this.loadSchedules();
        this.setupScheduleChecker();
        this.renderSchedules();
    }
    
    loadSchedules() {
        try {
            const saved = localStorage.getItem('schedules');
            if (saved) {
                this.schedules = JSON.parse(saved);
            } else {
                // Load default schedules
                this.schedules = this.getDefaultSchedules();
            }
        } catch (e) {
            console.error('Failed to load schedules:', e);
        }
    }
    
    getDefaultSchedules() {
        return [
            {
                id: 'schedule_1',
                name: 'Morning Light',
                nameAm: 'የጠዋት መብራት',
                enabled: true,
                type: 'device',
                deviceId: 0,
                action: 'on',
                time: { hour: 6, minute: 30 },
                days: [1, 2, 3, 4, 5], // Weekdays
                repeat: 'weekly',
                createdAt: Date.now()
            },
            {
                id: 'schedule_2',
                name: 'Night Light',
                nameAm: 'የማታ መብራት',
                enabled: true,
                type: 'device',
                deviceId: 0,
                action: 'off',
                time: { hour: 22, minute: 0 },
                days: [0, 1, 2, 3, 4, 5, 6], // Every day
                repeat: 'daily',
                createdAt: Date.now()
            },
            {
                id: 'schedule_3',
                name: 'Morning Fan',
                nameAm: 'የጠዋት ማራገቢያ',
                enabled: true,
                type: 'device',
                deviceId: 1,
                action: 'on',
                time: { hour: 8, minute: 0 },
                days: [1, 2, 3, 4, 5],
                repeat: 'weekly',
                createdAt: Date.now()
            },
            {
                id: 'schedule_4',
                name: 'Evening Fan',
                nameAm: 'የማታ ማራገቢያ',
                enabled: true,
                type: 'device',
                deviceId: 1,
                action: 'off',
                time: { hour: 18, minute: 0 },
                days: [1, 2, 3, 4, 5],
                repeat: 'weekly',
                createdAt: Date.now()
            },
            {
                id: 'schedule_5',
                name: 'Garden Pump',
                nameAm: 'የአትክልት ፓምፕ',
                enabled: true,
                type: 'device',
                deviceId: 5,
                action: 'on',
                time: { hour: 10, minute: 0 },
                days: [0, 1, 2, 3, 4, 5, 6],
                repeat: 'daily',
                createdAt: Date.now()
            },
            {
                id: 'schedule_6',
                name: 'Garden Pump Off',
                nameAm: 'የአትክልት ፓምፕ አጥፋ',
                enabled: true,
                type: 'device',
                deviceId: 5,
                action: 'off',
                time: { hour: 16, minute: 0 },
                days: [0, 1, 2, 3, 4, 5, 6],
                repeat: 'daily',
                createdAt: Date.now()
            },
            {
                id: 'schedule_7',
                name: 'Weekend Morning Routine',
                nameAm: 'የሳምንት መጨረሻ ጠዋት',
                enabled: true,
                type: 'scene',
                sceneId: 'good-morning',
                time: { hour: 8, minute: 0 },
                days: [0, 6], // Saturday and Sunday
                repeat: 'weekly',
                createdAt: Date.now()
            },
            {
                id: 'schedule_8',
                name: 'Energy Saver - Night',
                nameAm: 'የኃይል ቁጠባ - ማታ',
                enabled: false,
                type: 'device_group',
                devices: [0, 3, 5],
                action: 'off',
                time: { hour: 23, minute: 0 },
                days: [0, 1, 2, 3, 4, 5, 6],
                repeat: 'daily',
                createdAt: Date.now()
            }
        ];
    }
    
    setupScheduleChecker() {
        // Check schedules every minute
        setInterval(() => {
            this.checkSchedules();
        }, 60000);
        
        // Check for missed schedules on page load
        setTimeout(() => {
            this.checkMissedSchedules();
        }, 5000);
    }
    
    checkSchedules() {
        const now = new Date();
        const currentHour = now.getHours();
        const currentMinute = now.getMinutes();
        const currentDay = now.getDay();
        
        this.schedules.forEach(schedule => {
            if (!schedule.enabled) return;
            
            const { hour, minute } = schedule.time;
            
            // Check if it's time for this schedule
            if (hour === currentHour && minute === currentMinute) {
                // Check if schedule should run today
                const shouldRun = !schedule.days || schedule.days.includes(currentDay);
                
                if (shouldRun) {
                    this.executeSchedule(schedule);
                }
            }
        });
    }
    
    checkMissedSchedules() {
        const now = new Date();
        const lastCheck = localStorage.getItem('last_schedule_check');
        
        if (lastCheck) {
            const lastCheckTime = new Date(parseInt(lastCheck));
            const hoursSince = (now - lastCheckTime) / (1000 * 60 * 60);
            
            // If more than 2 hours since last check, check for missed schedules
            if (hoursSince > 2) {
                this.replayMissedSchedules(lastCheckTime, now);
            }
        }
        
        localStorage.setItem('last_schedule_check', now.getTime().toString());
    }
    
    replayMissedSchedules(fromTime, toTime) {
        const missedSchedules = [];
        
        for (let time = new Date(fromTime); time <= toTime; time = new Date(time.getTime() + 60000)) {
            const hour = time.getHours();
            const minute = time.getMinutes();
            const day = time.getDay();
            
            this.schedules.forEach(schedule => {
                if (!schedule.enabled) return;
                
                const { hour: sHour, minute: sMinute } = schedule.time;
                
                if (sHour === hour && sMinute === minute) {
                    const shouldRun = !schedule.days || schedule.days.includes(day);
                    if (shouldRun && !this.wasScheduleExecuted(schedule.id, time)) {
                        missedSchedules.push(schedule);
                    }
                }
            });
        }
        
        // Execute missed schedules (up to 5 most recent)
        missedSchedules.slice(-5).forEach(schedule => {
            this.executeSchedule(schedule, true);
        });
    }
    
    wasScheduleExecuted(scheduleId, time) {
        const executed = this.scheduleHistory.find(h => 
            h.scheduleId === scheduleId && 
            Math.abs(h.timestamp - time.getTime()) < 60000
        );
        return !!executed;
    }
    
    async executeSchedule(schedule, isMissed = false) {
        const currentLang = window.AppState?.language || 'en';
        
        // Execute based on schedule type
        switch(schedule.type) {
            case 'device':
                if (window.toggleDevice) {
                    const device = window.AppState?.devices[schedule.deviceId];
                    const targetState = schedule.action === 'on';
                    if (device && device.state !== targetState) {
                        window.toggleDevice(schedule.deviceId);
                    }
                }
                break;
                
            case 'device_group':
                schedule.devices.forEach(deviceId => {
                    if (window.toggleDevice) {
                        const device = window.AppState?.devices[deviceId];
                        const targetState = schedule.action === 'on';
                        if (device && device.state !== targetState) {
                            window.toggleDevice(deviceId);
                        }
                    }
                });
                break;
                
            case 'scene':
                if (window.sceneManager) {
                    window.sceneManager.activateScene(schedule.sceneId, 'schedule');
                }
                break;
        }
        
        // Log schedule execution
        this.scheduleHistory.unshift({
            id: Date.now(),
            scheduleId: schedule.id,
            name: currentLang === 'am' && schedule.nameAm ? schedule.nameAm : schedule.name,
            timestamp: Date.now(),
            isMissed: isMissed,
            action: schedule.action
        });
        
        // Keep last 100 executions
        if (this.scheduleHistory.length > 100) {
            this.scheduleHistory.pop();
        }
        
        localStorage.setItem('schedule_history', JSON.stringify(this.scheduleHistory));
        
        // Update last execution time
        schedule.lastExecuted = Date.now();
        this.saveSchedules();
        
        // Show notification
        if (window.showToast) {
            const scheduleName = currentLang === 'am' && schedule.nameAm ? schedule.nameAm : schedule.name;
            window.showToast(`⏰ Schedule: ${scheduleName} ${schedule.action === 'on' ? 'ON' : 'OFF'}`, 'info');
        }
    }
    
    createSchedule(scheduleData) {
        const newSchedule = {
            id: `schedule_${Date.now()}`,
            ...scheduleData,
            enabled: true,
            createdAt: Date.now(),
            lastExecuted: null
        };
        
        this.schedules.push(newSchedule);
        this.saveSchedules();
        this.renderSchedules();
        
        if (window.showToast) {
            window.showToast(`Schedule created: ${newSchedule.name}`, 'success');
        }
        
        return newSchedule;
    }
    
    updateSchedule(scheduleId, updates) {
        const scheduleIndex = this.schedules.findIndex(s => s.id === scheduleId);
        if (scheduleIndex !== -1) {
            this.schedules[scheduleIndex] = { ...this.schedules[scheduleIndex], ...updates };
            this.saveSchedules();
            this.renderSchedules();
            return true;
        }
        return false;
    }
    
    deleteSchedule(scheduleId) {
        const scheduleIndex = this.schedules.findIndex(s => s.id === scheduleId);
        if (scheduleIndex !== -1) {
            const schedule = this.schedules[scheduleIndex];
            this.schedules.splice(scheduleIndex, 1);
            this.saveSchedules();
            this.renderSchedules();
            if (window.showToast) {
                window.showToast(`Schedule deleted: ${schedule.name}`, 'info');
            }
            return true;
        }
        return false;
    }
    
    toggleSchedule(scheduleId) {
        const schedule = this.schedules.find(s => s.id === scheduleId);
        if (schedule) {
            schedule.enabled = !schedule.enabled;
            this.saveSchedules();
            this.renderSchedules();
            if (window.showToast) {
                window.showToast(`${schedule.name} ${schedule.enabled ? 'enabled' : 'disabled'}`, 'info');
            }
            return true;
        }
        return false;
    }
    
    saveSchedules() {
        try {
            localStorage.setItem('schedules', JSON.stringify(this.schedules));
        } catch (e) {
            console.error('Failed to save schedules:', e);
        }
    }
    
    renderSchedules() {
        const container = document.getElementById('scheduleList');
        if (!container) return;
        
        const currentLang = window.AppState?.language || 'en';
        const sortedSchedules = [...this.schedules].sort((a, b) => {
            if (a.time.hour !== b.time.hour) return a.time.hour - b.time.hour;
            return a.time.minute - b.time.minute;
        });
        
        if (sortedSchedules.length === 0) {
            container.innerHTML = '<div class="empty-state">No schedules created. Click + to add a schedule!</div>';
            return;
        }
        
        container.innerHTML = sortedSchedules.map(schedule => `
            <div class="schedule-item ${schedule.enabled ? 'enabled' : 'disabled'}">
                <div class="schedule-time">
                    ${schedule.time.hour.toString().padStart(2, '0')}:${schedule.time.minute.toString().padStart(2, '0')}
                </div>
                <div class="schedule-info">
                    <div class="schedule-name">${currentLang === 'am' && schedule.nameAm ? schedule.nameAm : schedule.name}</div>
                    <div class="schedule-details">
                        ${this.formatScheduleDetails(schedule, currentLang)}
                    </div>
                </div>
                <div class="schedule-actions">
                    <label class="schedule-toggle">
                        <input type="checkbox" ${schedule.enabled ? 'checked' : ''} onchange="window.scheduleManager.toggleSchedule('${schedule.id}')">
                        <span class="slider"></span>
                    </label>
                    <button class="schedule-delete" onclick="window.scheduleManager.deleteSchedule('${schedule.id}')">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        `).join('');
    }
    
    formatScheduleDetails(schedule, lang) {
        const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        const daysAm = ['እሑድ', 'ሰኞ', 'ማክሰኞ', 'ረቡዕ', 'ሐሙስ', 'አርብ', 'ቅዳሜ'];
        
        if (schedule.days) {
            if (schedule.days.length === 7) {
                return lang === 'en' ? 'Every day' : 'በየቀኑ';
            }
            const dayNames = lang === 'en' ? days : daysAm;
            const selectedDays = schedule.days.map(d => dayNames[d]).join(', ');
            return selectedDays;
        }
        
        if (schedule.repeat === 'daily') {
            return lang === 'en' ? 'Daily' : 'በየቀኑ';
        }
        
        if (schedule.repeat === 'weekly') {
            return lang === 'en' ? 'Weekly' : 'በየሳምንቱ';
        }
        
        return '';
    }
    
    getUpcomingSchedules(limit = 5) {
        const now = new Date();
        const currentHour = now.getHours();
        const currentMinute = now.getMinutes();
        const currentDay = now.getDay();
        
        const upcoming = [];
        
        this.schedules.forEach(schedule => {
            if (!schedule.enabled) return;
            
            const { hour, minute } = schedule.time;
            
            // Calculate next occurrence
            let nextDay = currentDay;
            let nextHour = hour;
            let nextMinute = minute;
            
            if (hour < currentHour || (hour === currentHour && minute <= currentMinute)) {
                // Find next day
                let daysToAdd = 1;
                while (schedule.days && !schedule.days.includes((nextDay + daysToAdd) % 7)) {
                    daysToAdd++;
                }
                nextDay = (nextDay + daysToAdd) % 7;
            } else if (schedule.days && !schedule.days.includes(nextDay)) {
                // Find next valid day
                let daysToAdd = 1;
                while (!schedule.days.includes((nextDay + daysToAdd) % 7)) {
                    daysToAdd++;
                }
                nextDay = (nextDay + daysToAdd) % 7;
            }
            
            upcoming.push({
                ...schedule,
                nextDay,
                nextHour,
                nextMinute
            });
        });
        
        // Sort by next occurrence
        upcoming.sort((a, b) => {
            if (a.nextDay !== b.nextDay) return a.nextDay - b.nextDay;
            if (a.nextHour !== b.nextHour) return a.nextHour - b.nextHour;
            return a.nextMinute - b.nextMinute;
        });
        
        return upcoming.slice(0, limit);
    }
    
    getScheduleHistory(limit = 50) {
        return this.scheduleHistory.slice(0, limit);
    }
    
    exportSchedules() {
        return JSON.stringify(this.schedules, null, 2);
    }
    
    importSchedules(jsonData) {
        try {
            const imported = JSON.parse(jsonData);
            if (Array.isArray(imported)) {
                this.schedules = imported;
                this.saveSchedules();
                this.renderSchedules();
                return true;
            }
        } catch (e) {
            console.error('Failed to import schedules:', e);
        }
        return false;
    }
}

// Initialize Schedule Manager
window.scheduleManager = new ScheduleManager();

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ScheduleManager;
}