/**
 * Automation Engine Module
 * Handles IF-THEN automation rules and conditional logic
 */

class AutomationEngine {
    constructor() {
        this.rules = [];
        this.ruleHistory = [];
        this.conditions = {};
        this.triggers = {};
        this.activeRules = new Set();
        
        this.init();
    }
    
    init() {
        this.loadRules();
        this.setupTriggers();
        this.startMonitoring();
    }
    
    loadRules() {
        try {
            const saved = localStorage.getItem('automation_rules');
            if (saved) {
                this.rules = JSON.parse(saved);
            } else {
                // Load default rules
                this.rules = this.getDefaultRules();
            }
        } catch (e) {
            console.error('Failed to load automation rules:', e);
        }
    }
    
    getDefaultRules() {
        return [
            {
                id: 'rule_1',
                name: 'Temperature Control - AC',
                nameAm: 'የሙቀት መቆጣጠሪያ - ኤሲ',
                enabled: true,
                trigger: {
                    type: 'temperature',
                    condition: 'greater_than',
                    value: 26
                },
                action: {
                    type: 'device',
                    deviceId: 2,
                    action: 'on'
                },
                cooldown: 300000 // 5 minutes
            },
            {
                id: 'rule_2',
                name: 'Temperature Control - Heater',
                nameAm: 'የሙቀት መቆጣጠሪያ - ማሞቂያ',
                enabled: true,
                trigger: {
                    type: 'temperature',
                    condition: 'less_than',
                    value: 18
                },
                action: {
                    type: 'device',
                    deviceId: 4,
                    action: 'on'
                },
                cooldown: 300000
            },
            {
                id: 'rule_3',
                name: 'Light Schedule - Morning',
                nameAm: 'የመብራት መርሐግብር - ጠዋት',
                enabled: true,
                trigger: {
                    type: 'time',
                    hour: 6,
                    minute: 30,
                    days: [1, 2, 3, 4, 5]
                },
                action: {
                    type: 'device',
                    deviceId: 0,
                    action: 'on'
                }
            },
            {
                id: 'rule_4',
                name: 'Light Schedule - Night',
                nameAm: 'የመብራት መርሐግብር - ማታ',
                enabled: true,
                trigger: {
                    type: 'time',
                    hour: 22,
                    minute: 0,
                    days: [0, 1, 2, 3, 4, 5, 6]
                },
                action: {
                    type: 'device',
                    deviceId: 0,
                    action: 'off'
                }
            },
            {
                id: 'rule_5',
                name: 'Fan Schedule - Weekdays',
                nameAm: 'የማራገቢያ መርሐግብር - ሳምንት',
                enabled: true,
                trigger: {
                    type: 'time',
                    hour: 8,
                    minute: 0,
                    days: [1, 2, 3, 4, 5]
                },
                action: {
                    type: 'device',
                    deviceId: 1,
                    action: 'on'
                }
            },
            {
                id: 'rule_6',
                name: 'Fan Schedule - Evening',
                nameAm: 'የማራገቢያ መርሐግብር - ማታ',
                enabled: true,
                trigger: {
                    type: 'time',
                    hour: 18,
                    minute: 0,
                    days: [1, 2, 3, 4, 5]
                },
                action: {
                    type: 'device',
                    deviceId: 1,
                    action: 'off'
                }
            },
            {
                id: 'rule_7',
                name: 'Energy Saver - Peak Hours',
                nameAm: 'የኃይል ቁጠባ - ከፍተኛ ሰዓት',
                enabled: false,
                trigger: {
                    type: 'time_range',
                    startHour: 17,
                    startMinute: 0,
                    endHour: 20,
                    endMinute: 0
                },
                action: {
                    type: 'device_group',
                    devices: [0, 3, 5],
                    action: 'off'
                },
                condition: {
                    type: 'energy_usage',
                    operator: 'greater_than',
                    value: 500
                }
            },
            {
                id: 'rule_8',
                name: 'Security - Away Mode',
                nameAm: 'ደህንነት - ከቤት ውጪ',
                enabled: false,
                trigger: {
                    type: 'mode',
                    mode: 'away'
                },
                action: {
                    type: 'scene',
                    sceneId: 'away'
                }
            }
        ];
    }
    
    setupTriggers() {
        // Time-based triggers check every minute
        setInterval(() => {
            this.checkTimeTriggers();
        }, 60000);
        
        // Temperature check every 30 seconds
        setInterval(() => {
            this.checkTemperatureTriggers();
        }, 30000);
        
        // Device state change monitoring
        if (window.AppState) {
            // Monitor device state changes
            const originalToggle = window.toggleDevice;
            if (originalToggle) {
                window.toggleDevice = (index) => {
                    originalToggle(index);
                    setTimeout(() => {
                        this.checkDeviceTriggers(index);
                    }, 100);
                };
            }
        }
    }
    
    startMonitoring() {
        // Monitor energy usage
        setInterval(() => {
            this.checkEnergyTriggers();
        }, 60000);
        
        // Monitor mode changes
        setInterval(() => {
            this.checkModeTriggers();
        }, 1000);
    }
    
    checkTimeTriggers() {
        const now = new Date();
        const currentHour = now.getHours();
        const currentMinute = now.getMinutes();
        const currentDay = now.getDay();
        
        this.rules.forEach(rule => {
            if (!rule.enabled) return;
            
            const trigger = rule.trigger;
            if (trigger.type === 'time') {
                if (trigger.hour === currentHour && trigger.minute === currentMinute) {
                    if (!trigger.days || trigger.days.includes(currentDay)) {
                        this.executeRule(rule, 'time');
                    }
                }
            } else if (trigger.type === 'time_range') {
                const currentTotal = currentHour * 60 + currentMinute;
                const startTotal = trigger.startHour * 60 + trigger.startMinute;
                const endTotal = trigger.endHour * 60 + trigger.endMinute;
                
                if (currentTotal >= startTotal && currentTotal <= endTotal) {
                    if (!this.isRuleExecutedRecently(rule)) {
                        this.executeRule(rule, 'time_range');
                    }
                }
            }
        });
    }
    
    checkTemperatureTriggers() {
        const currentTemp = window.AppState?.systemStats?.temperature || 23;
        
        this.rules.forEach(rule => {
            if (!rule.enabled) return;
            
            const trigger = rule.trigger;
            if (trigger.type === 'temperature') {
                let shouldTrigger = false;
                
                switch(trigger.condition) {
                    case 'greater_than':
                        shouldTrigger = currentTemp > trigger.value;
                        break;
                    case 'less_than':
                        shouldTrigger = currentTemp < trigger.value;
                        break;
                    case 'equals':
                        shouldTrigger = Math.abs(currentTemp - trigger.value) < 0.5;
                        break;
                }
                
                if (shouldTrigger && !this.isRuleExecutedRecently(rule)) {
                    this.executeRule(rule, 'temperature');
                }
            }
        });
    }
    
    checkDeviceTriggers(deviceId) {
        const device = window.AppState?.devices[deviceId];
        if (!device) return;
        
        this.rules.forEach(rule => {
            if (!rule.enabled) return;
            
            const trigger = rule.trigger;
            if (trigger.type === 'device_state') {
                if (trigger.deviceId === deviceId) {
                    if (trigger.state === device.state) {
                        this.executeRule(rule, 'device_state');
                    }
                }
            }
        });
    }
    
    checkEnergyTriggers() {
        const totalEnergy = window.AppState?.devices?.reduce((sum, d) => sum + (d.state ? d.power : 0), 0) || 0;
        
        this.rules.forEach(rule => {
            if (!rule.enabled) return;
            
            if (rule.condition && rule.condition.type === 'energy_usage') {
                const { operator, value } = rule.condition;
                let shouldTrigger = false;
                
                switch(operator) {
                    case 'greater_than':
                        shouldTrigger = totalEnergy > value;
                        break;
                    case 'less_than':
                        shouldTrigger = totalEnergy < value;
                        break;
                }
                
                if (shouldTrigger && !this.isRuleExecutedRecently(rule)) {
                    this.executeRule(rule, 'energy');
                }
            }
        });
    }
    
    checkModeTriggers() {
        const currentMode = localStorage.getItem('current_mode') || 'home';
        
        this.rules.forEach(rule => {
            if (!rule.enabled) return;
            
            const trigger = rule.trigger;
            if (trigger.type === 'mode') {
                if (trigger.mode === currentMode) {
                    this.executeRule(rule, 'mode');
                }
            }
        });
    }
    
    async executeRule(rule, triggerType) {
        // Check cooldown
        if (this.isRuleExecutedRecently(rule)) return;
        
        // Execute action
        const action = rule.action;
        
        switch(action.type) {
            case 'device':
                if (window.toggleDevice) {
                    const device = window.AppState?.devices[action.deviceId];
                    const targetState = action.action === 'on';
                    if (device && device.state !== targetState) {
                        window.toggleDevice(action.deviceId);
                    }
                }
                break;
                
            case 'device_group':
                action.devices.forEach(deviceId => {
                    if (window.toggleDevice) {
                        const device = window.AppState?.devices[deviceId];
                        const targetState = action.action === 'on';
                        if (device && device.state !== targetState) {
                            window.toggleDevice(deviceId);
                        }
                    }
                });
                break;
                
            case 'scene':
                if (window.sceneManager) {
                    window.sceneManager.activateScene(action.sceneId, 'automation');
                }
                break;
                
            case 'notification':
                if (window.showToast) {
                    window.showToast(action.message, 'info');
                }
                break;
        }
        
        // Log rule execution
        this.ruleHistory.unshift({
            id: rule.id,
            name: rule.name,
            trigger: triggerType,
            timestamp: Date.now(),
            action: action
        });
        
        // Keep last 100 executions
        if (this.ruleHistory.length > 100) {
            this.ruleHistory.pop();
        }
        
        localStorage.setItem('rule_history', JSON.stringify(this.ruleHistory));
        
        // Record last execution time
        rule.lastExecuted = Date.now();
        this.saveRules();
        
        if (window.showToast) {
            window.showToast(`⚙️ Automation: ${rule.name}`, 'info');
        }
    }
    
    isRuleExecutedRecently(rule) {
        if (!rule.cooldown) return false;
        if (!rule.lastExecuted) return false;
        
        const timeSince = Date.now() - rule.lastExecuted;
        return timeSince < rule.cooldown;
    }
    
    createRule(ruleData) {
        const newRule = {
            id: `rule_${Date.now()}`,
            ...ruleData,
            createdAt: Date.now(),
            lastExecuted: null,
            enabled: true
        };
        
        this.rules.push(newRule);
        this.saveRules();
        this.renderRules();
        
        if (window.showToast) {
            window.showToast(`Automation rule created: ${newRule.name}`, 'success');
        }
        
        return newRule;
    }
    
    updateRule(ruleId, updates) {
        const ruleIndex = this.rules.findIndex(r => r.id === ruleId);
        if (ruleIndex !== -1) {
            this.rules[ruleIndex] = { ...this.rules[ruleIndex], ...updates };
            this.saveRules();
            this.renderRules();
            return true;
        }
        return false;
    }
    
    deleteRule(ruleId) {
        const ruleIndex = this.rules.findIndex(r => r.id === ruleId);
        if (ruleIndex !== -1) {
            const rule = this.rules[ruleIndex];
            this.rules.splice(ruleIndex, 1);
            this.saveRules();
            this.renderRules();
            if (window.showToast) {
                window.showToast(`Automation rule deleted: ${rule.name}`, 'info');
            }
            return true;
        }
        return false;
    }
    
    toggleRule(ruleId) {
        const rule = this.rules.find(r => r.id === ruleId);
        if (rule) {
            rule.enabled = !rule.enabled;
            this.saveRules();
            this.renderRules();
            if (window.showToast) {
                window.showToast(`${rule.name} ${rule.enabled ? 'enabled' : 'disabled'}`, 'info');
            }
            return true;
        }
        return false;
    }
    
    saveRules() {
        try {
            localStorage.setItem('automation_rules', JSON.stringify(this.rules));
        } catch (e) {
            console.error('Failed to save automation rules:', e);
        }
    }
    
    renderRules() {
        const container = document.getElementById('automationGrid');
        if (!container) return;
        
        const currentLang = window.AppState?.language || 'en';
        
        if (this.rules.length === 0) {
            container.innerHTML = '<div class="empty-state">No automation rules. Click + to create your first rule!</div>';
            return;
        }
        
        container.innerHTML = this.rules.map(rule => `
            <div class="rule-card ${rule.enabled ? 'enabled' : 'disabled'}">
                <div class="rule-header">
                    <div class="rule-icon">⚙️</div>
                    <div class="rule-info">
                        <div class="rule-name">${currentLang === 'am' && rule.nameAm ? rule.nameAm : rule.name}</div>
                        <div class="rule-trigger">
                            <i class="fas fa-bolt"></i> 
                            ${this.formatTrigger(rule.trigger, currentLang)}
                        </div>
                    </div>
                    <label class="rule-toggle">
                        <input type="checkbox" ${rule.enabled ? 'checked' : ''} onchange="window.automationEngine.toggleRule('${rule.id}')">
                        <span class="slider"></span>
                    </label>
                </div>
                <div class="rule-action">
                    <i class="fas fa-arrow-right"></i>
                    <span>${this.formatAction(rule.action, currentLang)}</span>
                </div>
                <div class="rule-footer">
                    ${rule.lastExecuted ? `<span>Last run: ${new Date(rule.lastExecuted).toLocaleTimeString()}</span>` : ''}
                    <button class="rule-delete" onclick="window.automationEngine.deleteRule('${rule.id}')">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        `).join('');
    }
    
    formatTrigger(trigger, lang) {
        if (trigger.type === 'time') {
            return `${trigger.hour.toString().padStart(2, '0')}:${trigger.minute.toString().padStart(2, '0')} ${lang === 'en' ? 'daily' : 'በየቀኑ'}`;
        }
        if (trigger.type === 'temperature') {
            const condition = trigger.condition === 'greater_than' ? '>' : '<';
            return `${lang === 'en' ? 'Temperature' : 'ሙቀት'} ${condition} ${trigger.value}°C`;
        }
        if (trigger.type === 'device_state') {
            return `${lang === 'en' ? 'Device' : 'መሳሪያ'} ${trigger.deviceId} ${trigger.state ? 'ON' : 'OFF'}`;
        }
        return trigger.type;
    }
    
    formatAction(action, lang) {
        if (action.type === 'device') {
            return `${lang === 'en' ? 'Turn' : 'አድርግ'} ${action.action === 'on' ? 'ON' : 'OFF'} ${lang === 'en' ? 'Device' : 'መሳሪያ'} ${action.deviceId}`;
        }
        if (action.type === 'scene') {
            return `${lang === 'en' ? 'Activate scene' : 'ሁነታ አንቃ'} ${action.sceneId}`;
        }
        return action.type;
    }
    
    getRuleHistory(limit = 50) {
        return this.ruleHistory.slice(0, limit);
    }
    
    getActiveRules() {
        return this.rules.filter(r => r.enabled);
    }
    
    exportRules() {
        return JSON.stringify(this.rules, null, 2);
    }
    
    importRules(jsonData) {
        try {
            const imported = JSON.parse(jsonData);
            if (Array.isArray(imported)) {
                this.rules = imported;
                this.saveRules();
                this.renderRules();
                return true;
            }
        } catch (e) {
            console.error('Failed to import rules:', e);
        }
        return false;
    }
}

// Initialize Automation Engine
window.automationEngine = new AutomationEngine();

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AutomationEngine;
}