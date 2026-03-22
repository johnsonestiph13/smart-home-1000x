/**
 * Energy Optimizer Module
 * Optimizes energy consumption using machine learning algorithms
 */

class EnergyOptimizer {
    constructor() {
        this.optimizationSuggestions = [];
        this.usagePatterns = {};
        this.efficiencyScore = 0;
        this.optimizationHistory = [];
        
        this.init();
    }
    
    init() {
        this.loadPatterns();
        this.startOptimization();
    }
    
    loadPatterns() {
        try {
            const saved = localStorage.getItem('energy_patterns');
            if (saved) {
                this.usagePatterns = JSON.parse(saved);
            }
        } catch (e) {
            console.error('Failed to load energy patterns:', e);
        }
    }
    
    startOptimization() {
        // Analyze every 5 minutes
        setInterval(() => {
            this.analyzeUsage();
            this.generateOptimizations();
        }, 300000);
        
        // Update efficiency score every minute
        setInterval(() => {
            this.updateEfficiencyScore();
        }, 60000);
    }
    
    analyzeUsage() {
        if (!window.AppState?.devices) return;
        
        const devices = window.AppState.devices;
        const currentTime = new Date();
        const hour = currentTime.getHours();
        const day = currentTime.getDay();
        
        // Track usage patterns
        devices.forEach((device, index) => {
            const key = `${index}_${day}_${hour}`;
            if (!this.usagePatterns[key]) {
                this.usagePatterns[key] = { on: 0, off: 0, total: 0 };
            }
            
            if (device.state) {
                this.usagePatterns[key].on++;
            } else {
                this.usagePatterns[key].off++;
            }
            this.usagePatterns[key].total++;
        });
        
        // Save patterns
        localStorage.setItem('energy_patterns', JSON.stringify(this.usagePatterns));
    }
    
    generateOptimizations() {
        const suggestions = [];
        const devices = window.AppState?.devices || [];
        const currentHour = new Date().getHours();
        const currentDay = new Date().getDay();
        
        devices.forEach((device, index) => {
            const key = `${index}_${currentDay}_${currentHour}`;
            const pattern = this.usagePatterns[key];
            
            if (pattern && pattern.total > 5) {
                const probabilityOn = pattern.on / pattern.total;
                
                // Suggest turning off if device is on but usually off at this time
                if (device.state && probabilityOn < 0.3) {
                    suggestions.push({
                        deviceId: index,
                        deviceName: device.nameEn,
                        action: 'off',
                        reason: `Usually off at this time (${(probabilityOn * 100).toFixed(0)}% of the time)`,
                        savings: device.power * 0.5 // Estimated savings in Wh
                    });
                }
                
                // Suggest turning on if device is off but usually on at this time
                if (!device.state && probabilityOn > 0.7) {
                    suggestions.push({
                        deviceId: index,
                        deviceName: device.nameEn,
                        action: 'on',
                        reason: `Usually on at this time (${(probabilityOn * 100).toFixed(0)}% of the time)`,
                        savings: 0
                    });
                }
            }
        });
        
        // Check for vampire power (devices on when no one is home)
        const isAway = this.detectAwayMode();
        if (isAway) {
            devices.forEach((device, index) => {
                if (device.state && device.power > 50) {
                    suggestions.push({
                        deviceId: index,
                        deviceName: device.nameEn,
                        action: 'off',
                        reason: 'No occupancy detected - vampire power waste',
                        savings: device.power * 8 // Estimated 8 hours away
                    });
                }
            });
        }
        
        // Peak hour optimization
        const isPeakHour = this.isPeakHour(currentHour);
        if (isPeakHour) {
            devices.forEach((device, index) => {
                if (device.state && device.power > 100) {
                    suggestions.push({
                        deviceId: index,
                        deviceName: device.nameEn,
                        action: 'off',
                        reason: 'Peak electricity pricing period',
                        savings: device.power * 0.15 // Estimated cost savings
                    });
                }
            });
        }
        
        this.optimizationSuggestions = suggestions;
        this.displaySuggestions();
        
        // Auto-apply high-confidence suggestions
        this.autoApplySuggestions(suggestions);
    }
    
    detectAwayMode() {
        // Simple occupancy detection based on recent activity
        const recentActivity = JSON.parse(localStorage.getItem('recent_activity') || '[]');
        const lastActivity = recentActivity[0]?.timestamp;
        
        if (!lastActivity) return false;
        
        const minutesSinceActivity = (Date.now() - lastActivity) / 60000;
        return minutesSinceActivity > 60; // Away if no activity for 1 hour
    }
    
    isPeakHour(hour) {
        // Peak hours: 6-9 AM and 5-8 PM
        return (hour >= 6 && hour <= 9) || (hour >= 17 && hour <= 20);
    }
    
    updateEfficiencyScore() {
        const devices = window.AppState?.devices || [];
        const totalPower = devices.reduce((sum, d) => sum + (d.state ? d.power : 0), 0);
        const maxPower = devices.reduce((sum, d) => sum + d.power, 0);
        
        // Base efficiency
        let efficiency = maxPower > 0 ? ((maxPower - totalPower) / maxPower) * 100 : 100;
        
        // Apply pattern optimization bonus
        const optimizedCount = this.optimizationSuggestions.filter(s => s.action === 'off').length;
        efficiency -= optimizedCount * 5;
        
        // Apply peak hour penalty
        if (this.isPeakHour(new Date().getHours())) {
            efficiency -= 10;
        }
        
        this.efficiencyScore = Math.max(0, Math.min(100, efficiency));
        this.displayEfficiencyScore();
        
        return this.efficiencyScore;
    }
    
    displaySuggestions() {
        const container = document.getElementById('optimizationSuggestions');
        if (!container) return;
        
        if (this.optimizationSuggestions.length === 0) {
            container.innerHTML = '<div class="suggestion-placeholder">✨ No optimizations needed. Your home is running efficiently!</div>';
            return;
        }
        
        container.innerHTML = this.optimizationSuggestions.map(suggestion => `
            <div class="suggestion-card">
                <div class="suggestion-icon">💡</div>
                <div class="suggestion-content">
                    <div class="suggestion-title">Turn ${suggestion.action === 'on' ? 'ON' : 'OFF'} ${suggestion.deviceName}</div>
                    <div class="suggestion-reason">${suggestion.reason}</div>
                    ${suggestion.savings > 0 ? `<div class="suggestion-savings">Save ~${suggestion.savings.toFixed(0)} Wh</div>` : ''}
                </div>
                <button class="suggestion-btn" onclick="window.energyOptimizer.applySuggestion(${suggestion.deviceId}, '${suggestion.action}')">
                    Apply
                </button>
            </div>
        `).join('');
    }
    
    displayEfficiencyScore() {
        const container = document.getElementById('efficiencyScore');
        if (!container) return;
        
        const scoreColor = this.efficiencyScore >= 80 ? 'success' : this.efficiencyScore >= 60 ? 'warning' : 'danger';
        
        container.innerHTML = `
            <div class="efficiency-score">
                <div class="score-circle" style="--score: ${this.efficiencyScore}%">
                    <div class="score-value">${Math.round(this.efficiencyScore)}%</div>
                    <div class="score-label">Efficiency</div>
                </div>
                <div class="score-message">
                    ${this.getEfficiencyMessage()}
                </div>
            </div>
        `;
    }
    
    getEfficiencyMessage() {
        if (this.efficiencyScore >= 90) return "Excellent! Your home is highly efficient! 🌟";
        if (this.efficiencyScore >= 70) return "Good efficiency. Small improvements possible 💪";
        if (this.efficiencyScore >= 50) return "Average efficiency. Check suggestions for savings 💡";
        return "High energy waste detected. Apply optimizations now! ⚠️";
    }
    
    applySuggestion(deviceId, action) {
        if (window.toggleDevice) {
            const device = window.AppState?.devices[deviceId];
            if (device) {
                const targetState = action === 'on';
                if (device.state !== targetState) {
                    window.toggleDevice(deviceId);
                    
                    // Log optimization
                    this.optimizationHistory.push({
                        timestamp: Date.now(),
                        deviceId,
                        deviceName: device.nameEn,
                        action,
                        reason: this.optimizationSuggestions.find(s => s.deviceId === deviceId)?.reason
                    });
                    
                    localStorage.setItem('optimization_history', JSON.stringify(this.optimizationHistory));
                    
                    if (window.showToast) {
                        window.showToast(`✨ Applied: Turned ${device.nameEn} ${action === 'on' ? 'ON' : 'OFF'}`, 'success');
                    }
                }
            }
        }
    }
    
    autoApplySuggestions(suggestions) {
        // Only auto-apply high-confidence, non-critical devices
        const autoApplyThreshold = 0.8;
        const nonCriticalDevices = ['fan', 'light']; // Don't auto-apply AC, heater
        
        suggestions.forEach(suggestion => {
            const device = window.AppState?.devices[suggestion.deviceId];
            const isNonCritical = nonCriticalDevices.includes(device?.nameEn?.toLowerCase());
            const confidence = this.calculateConfidence(suggestion);
            
            if (isNonCritical && confidence > autoApplyThreshold) {
                this.applySuggestion(suggestion.deviceId, suggestion.action);
            }
        });
    }
    
    calculateConfidence(suggestion) {
        const deviceId = suggestion.deviceId;
        const currentHour = new Date().getHours();
        const currentDay = new Date().getDay();
        const key = `${deviceId}_${currentDay}_${currentHour}`;
        const pattern = this.usagePatterns[key];
        
        if (pattern && pattern.total > 10) {
            const probability = pattern.on / pattern.total;
            return suggestion.action === 'on' ? probability : 1 - probability;
        }
        
        return 0.5;
    }
    
    getEnergyReport() {
        const totalEnergy = this.calculateTotalEnergy();
        const savedEnergy = this.calculateSavedEnergy();
        const predictedSavings = this.predictMonthlySavings();
        
        return {
            totalEnergy,
            savedEnergy,
            predictedSavings,
            efficiencyScore: this.efficiencyScore,
            suggestionsCount: this.optimizationSuggestions.length,
            topSavings: this.optimizationSuggestions
                .filter(s => s.savings > 0)
                .sort((a, b) => b.savings - a.savings)
                .slice(0, 3)
        };
    }
    
    calculateTotalEnergy() {
        const devices = window.AppState?.devices || [];
        return devices.reduce((sum, d) => sum + (d.state ? d.power : 0), 0);
    }
    
    calculateSavedEnergy() {
        const appliedOptimizations = this.optimizationHistory.filter(h => {
            const age = Date.now() - h.timestamp;
            return age < 24 * 60 * 60 * 1000; // Last 24 hours
        });
        
        return appliedOptimizations.reduce((sum, opt) => sum + (opt.action === 'off' ? 50 : 0), 0);
    }
    
    predictMonthlySavings() {
        const dailyAverage = this.calculateTotalEnergy() / 24;
        const optimizedDaily = dailyAverage * 0.85; // Assume 15% savings
        const monthlySavings = (dailyAverage - optimizedDaily) * 30;
        
        return monthlySavings;
    }
}

// Initialize Energy Optimizer
window.energyOptimizer = new EnergyOptimizer();

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = EnergyOptimizer;
}