/**
 * Automation Model
 * Defines IF-THEN automation rules for smart home
 */

const mongoose = require('mongoose');

const AutomationSchema = new mongoose.Schema({
    // Basic Information
    name: {
        type: String,
        required: true,
        trim: true
    },
    nameAm: {
        type: String,
        trim: true
    },
    description: String,
    
    // Rule Status
    enabled: {
        type: Boolean,
        default: true
    },
    priority: {
        type: Number,
        min: 0,
        max: 10,
        default: 5
    },
    
    // Trigger Configuration
    trigger: {
        type: {
            type: String,
            enum: [
                'time', 'temperature', 'humidity', 'device_state',
                'schedule', 'scene', 'weather', 'occupancy',
                'energy', 'manual', 'sensor', 'webhook'
            ],
            required: true
        },
        conditions: {
            type: mongoose.Schema.Types.Mixed,
            default: {}
        },
        // For time triggers
        time: {
            hour: Number,
            minute: Number,
            days: [Number]
        },
        // For temperature/humidity triggers
        threshold: {
            operator: {
                type: String,
                enum: ['>', '<', '>=', '<=', '==']
            },
            value: Number
        },
        // For device state triggers
        deviceId: Number,
        deviceState: Boolean,
        // For weather triggers
        weatherCondition: String,
        // For occupancy triggers
        occupancyState: {
            type: String,
            enum: ['present', 'away', 'unknown']
        }
    },
    
    // Action Configuration
    action: {
        type: {
            type: String,
            enum: [
                'device', 'device_group', 'scene', 'notification',
                'webhook', 'delay', 'condition', 'loop'
            ],
            required: true
        },
        // For device actions
        deviceId: Number,
        deviceIds: [Number],
        actionType: {
            type: String,
            enum: ['on', 'off', 'toggle']
        },
        params: {
            type: mongoose.Schema.Types.Mixed,
            default: {}
        },
        // For scene actions
        sceneId: String,
        // For notifications
        notification: {
            title: String,
            message: String,
            channels: [String]
        },
        // For webhook
        webhookUrl: String,
        webhookMethod: {
            type: String,
            enum: ['GET', 'POST', 'PUT'],
            default: 'POST'
        },
        // For delay
        delayMs: Number
    },
    
    // Conditions (AND/OR logic)
    conditions: [{
        type: {
            type: String,
            enum: [
                'time_range', 'temperature', 'device_state',
                'day_of_week', 'occupancy', 'energy_usage'
            ]
        },
        operator: {
            type: String,
            enum: ['>', '<', '>=', '<=', '==', '!=']
        },
        value: mongoose.Schema.Types.Mixed,
        deviceId: Number
    }],
    conditionLogic: {
        type: String,
        enum: ['AND', 'OR'],
        default: 'AND'
    },
    
    // Advanced Settings
    cooldown: {
        type: Number,
        default: 300000 // 5 minutes in milliseconds
    }, // Minimum time between executions
    maxExecutions: {
        type: Number,
        default: 0 // 0 = unlimited
    },
    
    // Execution Tracking
    lastExecuted: Date,
    executionCount: {
        type: Number,
        default: 0
    },
    lastError: String,
    successCount: {
        type: Number,
        default: 0
    },
    failCount: {
        type: Number,
        default: 0
    },
    
    // Owner
    owner: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    
    // Metadata
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    },
    tags: [String]
}, {
    timestamps: true
});

// Indexes
AutomationSchema.index({ enabled: 1 });
AutomationSchema.index({ priority: -1 });
AutomationSchema.index({ owner: 1 });
AutomationSchema.index({ 'trigger.type': 1 });

// Pre-save middleware
AutomationSchema.pre('save', function(next) {
    this.updatedAt = Date.now();
    next();
});

// Check if rule should execute based on trigger
AutomationSchema.methods.checkTrigger = async function(context) {
    if (!this.enabled) return false;
    
    // Check cooldown
    if (this.cooldown && this.lastExecuted) {
        const timeSince = Date.now() - this.lastExecuted;
        if (timeSince < this.cooldown) return false;
    }
    
    // Check max executions
    if (this.maxExecutions > 0 && this.executionCount >= this.maxExecutions) {
        return false;
    }
    
    // Evaluate trigger conditions
    switch(this.trigger.type) {
        case 'temperature':
            return this.evaluateTemperatureTrigger(context.temperature);
        case 'humidity':
            return this.evaluateHumidityTrigger(context.humidity);
        case 'device_state':
            return this.evaluateDeviceTrigger(context.deviceStates);
        case 'time':
            return this.evaluateTimeTrigger();
        case 'weather':
            return this.evaluateWeatherTrigger(context.weather);
        case 'occupancy':
            return this.evaluateOccupancyTrigger(context.occupancy);
        default:
            return true;
    }
};

// Evaluate temperature trigger
AutomationSchema.methods.evaluateTemperatureTrigger = function(temperature) {
    const { operator, value } = this.trigger.threshold;
    
    switch(operator) {
        case '>': return temperature > value;
        case '<': return temperature < value;
        case '>=': return temperature >= value;
        case '<=': return temperature <= value;
        case '==': return Math.abs(temperature - value) < 0.5;
        default: return false;
    }
};

// Evaluate time trigger
AutomationSchema.methods.evaluateTimeTrigger = function() {
    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    const currentDay = now.getDay();
    
    if (this.trigger.time.hour !== currentHour) return false;
    if (this.trigger.time.minute !== currentMinute) return false;
    if (this.trigger.time.days && !this.trigger.time.days.includes(currentDay)) return false;
    
    return true;
};

// Evaluate all conditions
AutomationSchema.methods.evaluateConditions = async function(context) {
    if (!this.conditions || this.conditions.length === 0) return true;
    
    const results = [];
    
    for (const condition of this.conditions) {
        let result = false;
        
        switch(condition.type) {
            case 'temperature':
                result = this.evaluateComparison(context.temperature, condition.operator, condition.value);
                break;
            case 'device_state':
                const deviceState = context.deviceStates?.[condition.deviceId];
                result = deviceState === condition.value;
                break;
            case 'time_range':
                result = this.evaluateTimeRange(condition);
                break;
            case 'day_of_week':
                result = condition.value.includes(new Date().getDay());
                break;
            case 'energy_usage':
                result = this.evaluateComparison(context.energyUsage, condition.operator, condition.value);
                break;
        }
        
        results.push(result);
    }
    
    if (this.conditionLogic === 'AND') {
        return results.every(r => r === true);
    } else {
        return results.some(r => r === true);
    }
};

// Evaluate comparison
AutomationSchema.methods.evaluateComparison = function(value, operator, target) {
    switch(operator) {
        case '>': return value > target;
        case '<': return value < target;
        case '>=': return value >= target;
        case '<=': return value <= target;
        case '==': return value === target;
        case '!=': return value !== target;
        default: return false;
    }
};

// Evaluate time range
AutomationSchema.methods.evaluateTimeRange = function(condition) {
    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    const startMinutes = condition.value.startHour * 60 + condition.value.startMinute;
    const endMinutes = condition.value.endHour * 60 + condition.value.endMinute;
    
    return currentMinutes >= startMinutes && currentMinutes <= endMinutes;
};

// Execute automation action
AutomationSchema.methods.execute = async function() {
    const Device = mongoose.model('Device');
    let result = { success: true, action: this.action.type };
    
    try {
        switch(this.action.type) {
            case 'device':
                const device = await Device.findOne({ id: this.action.deviceId });
                if (device) {
                    if (this.action.actionType === 'toggle') {
                        await device.toggle();
                    } else {
                        device.state = this.action.actionType === 'on';
                        await device.save();
                    }
                    result.device = device;
                }
                break;
                
            case 'device_group':
                for (const deviceId of this.action.deviceIds) {
                    const dev = await Device.findOne({ id: deviceId });
                    if (dev) {
                        if (this.action.actionType === 'toggle') {
                            await dev.toggle();
                        } else {
                            dev.state = this.action.actionType === 'on';
                            await dev.save();
                        }
                    }
                }
                break;
                
            case 'scene':
                // Activate scene
                result.scene = this.action.sceneId;
                break;
                
            case 'notification':
                // Send notification
                result.notification = this.action.notification;
                break;
                
            case 'webhook':
                // Call webhook
                const fetch = require('node-fetch');
                const response = await fetch(this.action.webhookUrl, {
                    method: this.action.webhookMethod,
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(this.action.params)
                });
                result.webhookResponse = await response.json();
                break;
                
            case 'delay':
                await new Promise(resolve => setTimeout(resolve, this.action.delayMs));
                break;
        }
        
        // Update execution tracking
        this.lastExecuted = new Date();
        this.executionCount++;
        this.successCount++;
        await this.save();
        
        result.executionId = this._id;
        
    } catch (error) {
        this.lastError = error.message;
        this.failCount++;
        await this.save();
        
        result.success = false;
        result.error = error.message;
    }
    
    return result;
};

// Static method to get active rules
AutomationSchema.statics.getActiveRules = function() {
    return this.find({ enabled: true }).sort({ priority: -1 });
};

// Static method to get rules by trigger type
AutomationSchema.statics.getByTriggerType = function(triggerType) {
    return this.find({ 'trigger.type': triggerType, enabled: true });
};

module.exports = mongoose.model('Automation', AutomationSchema);