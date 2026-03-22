/**
 * Formatters Module
 * Provides formatting utilities for dates, numbers, strings, and more
 */

class Formatters {
    constructor() {
        this.locale = 'en-US';
        this.timezone = 'Africa/Addis_Ababa';
        
        this.init();
    }
    
    init() {
        // Load saved preferences
        const savedLocale = localStorage.getItem('locale');
        if (savedLocale) {
            this.locale = savedLocale;
        }
        
        const savedTimezone = localStorage.getItem('timezone');
        if (savedTimezone) {
            this.timezone = savedTimezone;
        }
    }
    
    setLocale(locale) {
        this.locale = locale;
        localStorage.setItem('locale', locale);
    }
    
    setTimezone(timezone) {
        this.timezone = timezone;
        localStorage.setItem('timezone', timezone);
    }
    
    // ========== Date Formatters ==========
    
    formatDate(date, format = 'short') {
        const d = new Date(date);
        
        const formats = {
            short: { year: 'numeric', month: 'short', day: 'numeric' },
            long: { year: 'numeric', month: 'long', day: 'numeric' },
            full: { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' },
            iso: { year: 'numeric', month: '2-digit', day: '2-digit' }
        };
        
        const options = formats[format] || formats.short;
        return d.toLocaleDateString(this.locale, options);
    }
    
    formatTime(date, includeSeconds = false) {
        const d = new Date(date);
        const options = {
            hour: '2-digit',
            minute: '2-digit',
            ...(includeSeconds && { second: '2-digit' })
        };
        return d.toLocaleTimeString(this.locale, options);
    }
    
    formatDateTime(date, format = 'short') {
        return `${this.formatDate(date, format)} ${this.formatTime(date)}`;
    }
    
    formatRelativeTime(date) {
        const now = new Date();
        const diff = now - new Date(date);
        const seconds = Math.floor(diff / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);
        const days = Math.floor(hours / 24);
        const weeks = Math.floor(days / 7);
        const months = Math.floor(days / 30);
        const years = Math.floor(days / 365);
        
        if (seconds < 60) return this.getText('just_now');
        if (minutes < 60) return this.getText('minutes_ago', minutes);
        if (hours < 24) return this.getText('hours_ago', hours);
        if (days < 7) return this.getText('days_ago', days);
        if (weeks < 4) return this.getText('weeks_ago', weeks);
        if (months < 12) return this.getText('months_ago', months);
        return this.getText('years_ago', years);
    }
    
    // ========== Number Formatters ==========
    
    formatNumber(number, decimals = 0) {
        return new Intl.NumberFormat(this.locale, {
            minimumFractionDigits: decimals,
            maximumFractionDigits: decimals
        }).format(number);
    }
    
    formatCurrency(amount, currency = 'USD') {
        return new Intl.NumberFormat(this.locale, {
            style: 'currency',
            currency: currency,
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }).format(amount);
    }
    
    formatPercentage(value, decimals = 1) {
        return new Intl.NumberFormat(this.locale, {
            style: 'percent',
            minimumFractionDigits: decimals,
            maximumFractionDigits: decimals
        }).format(value / 100);
    }
    
    formatPower(watts, decimals = 1) {
        if (watts < 1000) {
            return `${this.formatNumber(watts, decimals)} W`;
        } else if (watts < 1000000) {
            return `${this.formatNumber(watts / 1000, decimals)} kW`;
        } else {
            return `${this.formatNumber(watts / 1000000, decimals)} MW`;
        }
    }
    
    formatEnergy(wh, decimals = 1) {
        if (wh < 1000) {
            return `${this.formatNumber(wh, decimals)} Wh`;
        } else if (wh < 1000000) {
            return `${this.formatNumber(wh / 1000, decimals)} kWh`;
        } else {
            return `${this.formatNumber(wh / 1000000, decimals)} MWh`;
        }
    }
    
    formatTemperature(temp, unit = 'c') {
        if (unit === 'c') {
            return `${this.formatNumber(temp, 1)}°C`;
        } else {
            const fahrenheit = (temp * 9/5) + 32;
            return `${this.formatNumber(fahrenheit, 1)}°F`;
        }
    }
    
    // ========== Duration Formatters ==========
    
    formatDuration(seconds) {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = seconds % 60;
        
        if (hours > 0) {
            return `${hours}h ${minutes}m`;
        } else if (minutes > 0) {
            return `${minutes}m ${secs}s`;
        } else {
            return `${secs}s`;
        }
    }
    
    formatRuntime(minutes) {
        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;
        
        if (hours > 0) {
            return `${hours}h ${mins}m`;
        } else {
            return `${mins}m`;
        }
    }
    
    // ========== String Formatters ==========
    
    capitalize(str) {
        return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
    }
    
    titleCase(str) {
        return str.replace(/\w\S*/g, txt => {
            return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
        });
    }
    
    truncate(str, length = 50, suffix = '...') {
        if (str.length <= length) return str;
        return str.substring(0, length) + suffix;
    }
    
    slugify(str) {
        return str
            .toLowerCase()
            .replace(/[^\w\s-]/g, '')
            .replace(/[\s_-]+/g, '-')
            .replace(/^-+|-+$/g, '');
    }
    
    // ========== Device Formatters ==========
    
    formatDeviceName(device, language = 'en') {
        if (language === 'am' && device.nameAm) {
            return device.nameAm;
        }
        return device.nameEn || device.name;
    }
    
    formatDeviceState(state, language = 'en') {
        if (language === 'am') {
            return state ? 'በርቷል' : 'ጠፍቷል';
        }
        return state ? 'ON' : 'OFF';
    }
    
    formatDeviceRoom(device, language = 'en') {
        if (language === 'am' && device.roomAm) {
            return device.roomAm;
        }
        return device.roomEn || device.room;
    }
    
    // ========== Network Formatters ==========
    
    formatBytes(bytes, decimals = 2) {
        if (bytes === 0) return '0 Bytes';
        
        const k = 1024;
        const dm = decimals < 0 ? 0 : decimals;
        const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        
        return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
    }
    
    formatSpeed(bps, decimals = 1) {
        if (bps < 1000) {
            return `${this.formatNumber(bps, decimals)} bps`;
        } else if (bps < 1000000) {
            return `${this.formatNumber(bps / 1000, decimals)} Kbps`;
        } else {
            return `${this.formatNumber(bps / 1000000, decimals)} Mbps`;
        }
    }
    
    // ========== Status Formatters ==========
    
    formatConnectionStatus(connected, language = 'en') {
        if (language === 'am') {
            return connected ? 'ተገናኝቷል' : 'አልተገናኘም';
        }
        return connected ? 'Connected' : 'Disconnected';
    }
    
    formatHealthStatus(score) {
        if (score >= 90) return { text: 'Excellent', color: '#06d6a0', icon: '✅' };
        if (score >= 70) return { text: 'Good', color: '#4cc9f0', icon: '👍' };
        if (score >= 50) return { text: 'Fair', color: '#ffd166', icon: '⚠️' };
        if (score >= 30) return { text: 'Poor', color: '#ef476f', icon: '🔴' };
        return { text: 'Critical', color: '#d9042b', icon: '💀' };
    }
    
    // ========== JSON Formatters ==========
    
    prettyJSON(obj) {
        return JSON.stringify(obj, null, 2);
    }
    
    minifyJSON(obj) {
        return JSON.stringify(obj);
    }
    
    // ========== Helper Methods ==========
    
    getText(key, value = null) {
        const texts = {
            en: {
                just_now: 'Just now',
                minutes_ago: (n) => `${n} minute${n !== 1 ? 's' : ''} ago`,
                hours_ago: (n) => `${n} hour${n !== 1 ? 's' : ''} ago`,
                days_ago: (n) => `${n} day${n !== 1 ? 's' : ''} ago`,
                weeks_ago: (n) => `${n} week${n !== 1 ? 's' : ''} ago`,
                months_ago: (n) => `${n} month${n !== 1 ? 's' : ''} ago`,
                years_ago: (n) => `${n} year${n !== 1 ? 's' : ''} ago`
            },
            am: {
                just_now: 'አሁን',
                minutes_ago: (n) => `ከ${n} ደቂቃ በፊት`,
                hours_ago: (n) => `ከ${n} ሰዓት በፊት`,
                days_ago: (n) => `ከ${n} ቀን በፊት`,
                weeks_ago: (n) => `ከ${n} ሳምንት በፊት`,
                months_ago: (n) => `ከ${n} ወር በፊት`,
                years_ago: (n) => `ከ${n} ዓመት በፊት`
            }
        };
        
        const lang = this.locale === 'am-ET' ? 'am' : 'en';
        const textMap = texts[lang][key];
        
        if (typeof textMap === 'function') {
            return textMap(value);
        }
        return textMap;
    }
    
    // ========== Chart Formatters ==========
    
    formatChartLabel(value, type = 'number') {
        switch(type) {
            case 'power':
                return this.formatPower(value);
            case 'energy':
                return this.formatEnergy(value);
            case 'temperature':
                return this.formatTemperature(value);
            case 'percentage':
                return this.formatPercentage(value);
            default:
                return this.formatNumber(value);
        }
    }
    
    // ========== File Size Formatters ==========
    
    formatFileSize(bytes) {
        const units = ['B', 'KB', 'MB', 'GB', 'TB'];
        let size = bytes;
        let unitIndex = 0;
        
        while (size >= 1024 && unitIndex < units.length - 1) {
            size /= 1024;
            unitIndex++;
        }
        
        return `${this.formatNumber(size, 1)} ${units[unitIndex]}`;
    }
    
    // ========== Timezone Helpers ==========
    
    getTimezoneOffset() {
        const offset = new Date().getTimezoneOffset();
        const hours = Math.abs(Math.floor(offset / 60));
        const minutes = Math.abs(offset % 60);
        const sign = offset <= 0 ? '+' : '-';
        
        return `${sign}${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
    }
    
    formatInTimezone(date, timezone, format = 'short') {
        try {
            return new Date(date).toLocaleString(this.locale, {
                timeZone: timezone,
                ...(format === 'short' && { dateStyle: 'short', timeStyle: 'short' }),
                ...(format === 'long' && { dateStyle: 'full', timeStyle: 'long' })
            });
        } catch (e) {
            return this.formatDateTime(date, format);
        }
    }
}

// Initialize Formatters
window.formatters = new Formatters();

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Formatters;
}