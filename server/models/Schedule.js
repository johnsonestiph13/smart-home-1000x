/**
 * Schedule Model
 * Manages time-based schedules for devices and scenes
 */

const mongoose = require('mongoose');

const ScheduleSchema = new mongoose.Schema({
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
    
    // Schedule Type
    type: {
        type: String,
        enum: ['device', 'device_group', 'scene', 'automation'],
        required: true
    },
    
    // Time Configuration
    time: {
        hour: {
            type: Number,
            required: true,
            min: 0,
            max: 23
        },
        minute: {
            type: Number,
            required: true,
            min: 0,
            max: 59
        }
    },
    
    // Recurrence
    repeat: {
        type: String,
        enum: ['once', 'daily', 'weekly', 'monthly', 'yearly'],
        default: 'daily'
    },
    days: [{
        type: Number,
        min: 0,
        max: 6
    }], // 0 = Sunday, 1 = Monday, etc.
    
    // Date Range (for one-time or date-limited schedules)
    startDate: Date,
    endDate: Date,
    
    // Target
    deviceId: {
        type: Number,
        ref: 'Device'
    },
    deviceIds: [{
        type: Number,
        ref: 'Device'
    }],
    sceneId: String,
    automationId: String,
    
    // Action
    action: {
        type: String,
        enum: ['on', 'off', 'toggle'],
        required: true
    },
    
    // Advanced Settings
    params: {
        type: mongoose.Schema.Types.Mixed,
        default: {}
    }, // For dimmer values, colors, etc.
    
    // Conditional Execution
    conditions: {
        type: mongoose.Schema.Types.Mixed,
        default: {}
    },
    
    // Execution Tracking
    enabled: {
        type: Boolean,
        default: true
    },
    lastExecuted: Date,
    executionCount: {
        type: Number,
        default: 0
    },
    nextExecution: Date,
    
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
    }
}, {
    timestamps: true
});

// Indexes
ScheduleSchema.index({ enabled: 1 });
ScheduleSchema.index({ 'time.hour': 1, 'time.minute': 1 });
ScheduleSchema.index({ owner: 1 });
ScheduleSchema.index({ nextExecution: 1 });

// Pre-save middleware
ScheduleSchema.pre('save', function(next) {
    this.updatedAt = Date.now();
    this.calculateNextExecution();
    next();
});

// Calculate next execution time
ScheduleSchema.methods.calculateNextExecution = function() {
    const now = new Date();
    let nextDate = new Date();
    
    nextDate.setHours(this.time.hour, this.time.minute, 0, 0);
    
    if (nextDate <= now) {
        // Add based on repeat type
        switch(this.repeat) {
            case 'daily':
                nextDate.setDate(nextDate.getDate() + 1);
                break;
            case 'weekly':
                nextDate.setDate(nextDate.getDate() + 7);
                break;
            case 'monthly':
                nextDate.setMonth(nextDate.getMonth() + 1);
                break;
            case 'yearly':
                nextDate.setFullYear(nextDate.getFullYear() + 1);
                break;
            case 'once':
                nextDate = null;
                break;
        }
    }
    
    // Check if schedule should run on specific days
    if (this.days && this.days.length > 0 && nextDate) {
        while (!this.days.includes(nextDate.getDay())) {
            nextDate.setDate(nextDate.getDate() + 1);
        }
    }
    
    // Check date range
    if (nextDate && this.endDate && nextDate > this.endDate) {
        nextDate = null;
    }
    
    if (nextDate && this.startDate && nextDate < this.startDate) {
        nextDate = this.startDate;
        nextDate.setHours(this.time.hour, this.time.minute, 0, 0);
    }
    
    this.nextExecution = nextDate;
    return nextDate;
};

// Execute schedule
ScheduleSchema.methods.execute = async function() {
    if (!this.enabled) return { success: false, reason: 'Schedule disabled' };
    
    // Check date range
    const now = new Date();
    if (this.startDate && now < this.startDate) {
        return { success: false, reason: 'Schedule not started' };
    }
    if (this.endDate && now > this.endDate) {
        return { success: false, reason: 'Schedule expired' };
    }
    
    // Check if it's time
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    
    if (currentHour !== this.time.hour || currentMinute !== this.time.minute) {
        return { success: false, reason: 'Not time yet' };
    }
    
    // Check days
    if (this.days && this.days.length > 0 && !this.days.includes(now.getDay())) {
        return { success: false, reason: 'Not scheduled for today' };
    }
    
    // Execute based on type
    let result = { success: true };
    
    switch(this.type) {
        case 'device':
            const Device = mongoose.model('Device');
            const device = await Device.findOne({ id: this.deviceId });
            if (device) {
                if (this.action === 'toggle') {
                    await device.toggle();
                } else {
                    device.state = this.action === 'on';
                    await device.save();
                }
                result.device = device;
            }
            break;
            
        case 'device_group':
            const DeviceModel = mongoose.model('Device');
            for (const deviceId of this.deviceIds) {
                const dev = await DeviceModel.findOne({ id: deviceId });
                if (dev) {
                    if (this.action === 'toggle') {
                        await dev.toggle();
                    } else {
                        dev.state = this.action === 'on';
                        await dev.save();
                    }
                }
            }
            break;
            
        case 'scene':
            // Activate scene (handled by scene manager)
            result.scene = this.sceneId;
            break;
            
        case 'automation':
            // Trigger automation (handled by automation engine)
            result.automation = this.automationId;
            break;
    }
    
    // Update execution tracking
    this.lastExecuted = now;
    this.executionCount++;
    await this.save();
    
    // Calculate next execution
    this.calculateNextExecution();
    await this.save();
    
    return result;
};

// Check if schedule is due
ScheduleSchema.methods.isDue = function() {
    if (!this.enabled) return false;
    
    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    
    if (currentHour !== this.time.hour || currentMinute !== this.time.minute) {
        return false;
    }
    
    if (this.days && this.days.length > 0 && !this.days.includes(now.getDay())) {
        return false;
    }
    
    if (this.startDate && now < this.startDate) return false;
    if (this.endDate && now > this.endDate) return false;
    
    return true;
};

// Static method to get due schedules
ScheduleSchema.statics.getDueSchedules = async function() {
    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    const currentDay = now.getDay();
    
    return this.find({
        enabled: true,
        'time.hour': currentHour,
        'time.minute': currentMinute,
        $or: [
            { days: { $exists: false } },
            { days: currentDay }
        ],
        $or: [
            { startDate: { $exists: false } },
            { startDate: { $lte: now } }
        ],
        $or: [
            { endDate: { $exists: false } },
            { endDate: { $gte: now } }
        ]
    });
};

module.exports = mongoose.model('Schedule', ScheduleSchema);