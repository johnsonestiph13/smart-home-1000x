/**
 * Alert Model
 * Manages system alerts, notifications, and warnings
 */

const mongoose = require('mongoose');

const AlertSchema = new mongoose.Schema({
    // Basic Information
    title: {
        type: String,
        required: true
    },
    titleAm: String,
    message: {
        type: String,
        required: true
    },
    messageAm: String,
    
    // Alert Type
    type: {
        type: String,
        enum: [
            'device', 'system', 'security', 'energy',
            'maintenance', 'automation', 'network', 'user'
        ],
        required: true
    },
    severity: {
        type: String,
        enum: ['info', 'warning', 'error', 'critical'],
        default: 'info'
    },
    
    // Source
    source: {
        type: String,
        enum: ['system', 'device', 'esp32', 'user', 'automation', 'schedule'],
        required: true
    },
    deviceId: {
        type: Number,
        ref: 'Device'
    },
    deviceName: String,
    
    // Alert Data
    data: {
        type: mongoose.Schema.Types.Mixed,
        default: {}
    },
    
    // Status
    status: {
        type: String,
        enum: ['active', 'acknowledged', 'resolved', 'dismissed'],
        default: 'active'
    },
    acknowledgedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    acknowledgedAt: Date,
    resolvedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    resolvedAt: Date,
    resolutionNote: String,
    
    // Actions
    autoActions: [{
        type: {
            type: String,
            enum: ['device', 'notification', 'webhook']
        },
        executed: Boolean,
        result: String,
        timestamp: Date
    }],
    
    // Notifications
    notifications: {
        email: { type: Boolean, default: false },
        push: { type: Boolean, default: false },
        sms: { type: Boolean, default: false },
        sentAt: Date
    },
    
    // Expiration
    expiresAt: Date,
    
    // Owner
    owner: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    
    // Timestamps
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
AlertSchema.index({ status: 1 });
AlertSchema.index({ severity: 1 });
AlertSchema.index({ type: 1 });
AlertSchema.index({ createdAt: -1 });
AlertSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
AlertSchema.index({ owner: 1 });

// Pre-save middleware
AlertSchema.pre('save', function(next) {
    this.updatedAt = Date.now();
    
    // Set expiration if not set
    if (!this.expiresAt) {
        const expiresIn = {
            info: 7 * 24 * 60 * 60 * 1000,    // 7 days
            warning: 30 * 24 * 60 * 60 * 1000,  // 30 days
            error: 90 * 24 * 60 * 60 * 1000,    // 90 days
            critical: 365 * 24 * 60 * 60 * 1000 // 1 year
        };
        this.expiresAt = new Date(Date.now() + expiresIn[this.severity]);
    }
    
    next();
});

// Acknowledge alert
AlertSchema.methods.acknowledge = async function(userId) {
    this.status = 'acknowledged';
    this.acknowledgedBy = userId;
    this.acknowledgedAt = new Date();
    await this.save();
    return this;
};

// Resolve alert
AlertSchema.methods.resolve = async function(userId, note = '') {
    this.status = 'resolved';
    this.resolvedBy = userId;
    this.resolvedAt = new Date();
    this.resolutionNote = note;
    await this.save();
    return this;
};

// Dismiss alert
AlertSchema.methods.dismiss = async function(userId) {
    this.status = 'dismissed';
    await this.save();
    return this;
};

// Check if alert is expired
AlertSchema.methods.isExpired = function() {
    return this.expiresAt && new Date() > this.expiresAt;
};

// Static method to get active alerts
AlertSchema.statics.getActiveAlerts = async function(ownerId) {
    return this.find({
        owner: ownerId,
        status: 'active',
        expiresAt: { $gt: new Date() }
    }).sort({ severity: -1, createdAt: -1 });
};

// Static method to get alerts by severity
AlertSchema.statics.getBySeverity = async function(severity, ownerId) {
    return this.find({
        owner: ownerId,
        severity: severity,
        status: { $ne: 'dismissed' }
    }).sort({ createdAt: -1 });
};

// Static method to get alerts by type
AlertSchema.statics.getByType = async function(type, ownerId, limit = 50) {
    return this.find({
        owner: ownerId,
        type: type,
        status: { $ne: 'dismissed' }
    })
    .sort({ createdAt: -1 })
    .limit(limit);
};

// Static method to get alerts for device
AlertSchema.statics.getDeviceAlerts = async function(deviceId, ownerId, limit = 20) {
    return this.find({
        owner: ownerId,
        deviceId: deviceId,
        status: { $ne: 'dismissed' }
    })
    .sort({ createdAt: -1 })
    .limit(limit);
};

// Static method to create system alert
AlertSchema.statics.createSystemAlert = async function(title, message, severity, data = {}, ownerId) {
    return await this.create({
        title,
        message,
        type: 'system',
        severity,
        source: 'system',
        data,
        owner: ownerId
    });
};

// Static method to create device alert
AlertSchema.statics.createDeviceAlert = async function(deviceId, deviceName, title, message, severity, data = {}, ownerId) {
    return await this.create({
        title,
        message,
        type: 'device',
        severity,
        source: 'device',
        deviceId,
        deviceName,
        data,
        owner: ownerId
    });
};

// Static method to create security alert
AlertSchema.statics.createSecurityAlert = async function(title, message, severity, data = {}, ownerId) {
    return await this.create({
        title,
        message,
        type: 'security',
        severity,
        source: 'system',
        data,
        owner: ownerId
    });
};

// Static method to create maintenance alert
AlertSchema.statics.createMaintenanceAlert = async function(deviceId, deviceName, message, healthScore, ownerId) {
    const severity = healthScore < 30 ? 'critical' : healthScore < 50 ? 'error' : 'warning';
    
    return await this.create({
        title: `Maintenance Required: ${deviceName}`,
        message,
        type: 'maintenance',
        severity,
        source: 'device',
        deviceId,
        deviceName,
        data: { healthScore },
        owner: ownerId
    });
};

// Static method to get alert statistics
AlertSchema.statics.getStatistics = async function(ownerId) {
    const stats = await this.aggregate([
        { $match: { owner: ownerId } },
        {
            $group: {
                _id: null,
                total: { $sum: 1 },
                active: { $sum: { $cond: [{ $eq: ['$status', 'active'] }, 1, 0] } },
                resolved: { $sum: { $cond: [{ $eq: ['$status', 'resolved'] }, 1, 0] } },
                dismissed: { $sum: { $cond: [{ $eq: ['$status', 'dismissed'] }, 1, 0] } },
                bySeverity: {
                    $push: {
                        severity: '$severity',
                        count: 1
                    }
                }
            }
        }
    ]);
    
    if (!stats[0]) return { total: 0, active: 0, resolved: 0, dismissed: 0, bySeverity: {} };
    
    // Aggregate by severity
    const bySeverity = {};
    stats[0].bySeverity.forEach(item => {
        bySeverity[item.severity] = (bySeverity[item.severity] || 0) + 1;
    });
    
    return {
        total: stats[0].total,
        active: stats[0].active,
        resolved: stats[0].resolved,
        dismissed: stats[0].dismissed,
        bySeverity
    };
};

module.exports = mongoose.model('Alert', AlertSchema);