/**
 * Energy Log Model
 * Tracks energy consumption data for analytics
 */

const mongoose = require('mongoose');

const EnergyLogSchema = new mongoose.Schema({
    // Device Information
    deviceId: {
        type: Number,
        ref: 'Device',
        required: true
    },
    deviceName: {
        type: String,
        required: true
    },
    
    // Energy Data
    energy: {
        type: Number,
        required: true
    }, // kWh
    power: {
        type: Number,
        default: 0
    }, // Watts (instantaneous)
    voltage: {
        type: Number,
        default: 220
    }, // Volts
    current: {
        type: Number,
        default: 0
    }, // Amps
    
    // Time Information
    timestamp: {
        type: Date,
        default: Date.now,
        required: true
    },
    hour: Number,
    day: Number,
    week: Number,
    month: Number,
    year: Number,
    
    // Additional Context
    source: {
        type: String,
        enum: ['device_state', 'sensor', 'manual', 'automation', 'schedule'],
        default: 'device_state'
    },
    autoMode: {
        type: Boolean,
        default: false
    },
    
    // Environmental Data
    temperature: Number,
    humidity: Number,
    
    // Cost Calculation
    cost: {
        type: Number,
        default: 0
    }, // Estimated cost in USD
    
    // Owner
    owner: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    }
}, {
    timestamps: true
});

// Indexes for faster queries
EnergyLogSchema.index({ deviceId: 1 });
EnergyLogSchema.index({ timestamp: -1 });
EnergyLogSchema.index({ hour: 1, day: 1, month: 1, year: 1 });
EnergyLogSchema.index({ owner: 1 });

// Pre-save middleware
EnergyLogSchema.pre('save', function(next) {
    // Extract time components
    const date = this.timestamp || new Date();
    this.hour = date.getHours();
    this.day = date.getDate();
    this.week = Math.ceil(date.getDate() / 7);
    this.month = date.getMonth() + 1;
    this.year = date.getFullYear();
    
    // Calculate cost (assuming $0.15 per kWh)
    this.cost = this.energy * 0.15;
    
    next();
});

// Static method to get total energy for a period
EnergyLogSchema.statics.getTotalEnergy = async function(deviceId, startDate, endDate) {
    const result = await this.aggregate([
        {
            $match: {
                deviceId: deviceId,
                timestamp: { $gte: startDate, $lte: endDate }
            }
        },
        {
            $group: {
                _id: null,
                total: { $sum: '$energy' },
                avg: { $avg: '$energy' },
                max: { $max: '$energy' },
                min: { $min: '$energy' },
                count: { $sum: 1 }
            }
        }
    ]);
    
    return result[0] || { total: 0, avg: 0, max: 0, min: 0, count: 0 };
};

// Static method to get hourly usage for a day
EnergyLogSchema.statics.getHourlyUsage = async function(deviceId, date) {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);
    
    const result = await this.aggregate([
        {
            $match: {
                deviceId: deviceId,
                timestamp: { $gte: startOfDay, $lte: endOfDay }
            }
        },
        {
            $group: {
                _id: '$hour',
                total: { $sum: '$energy' },
                avg: { $avg: '$energy' },
                count: { $sum: 1 }
            }
        },
        { $sort: { _id: 1 } }
    ]);
    
    // Fill missing hours with zero
    const hourlyData = Array(24).fill(0);
    result.forEach(item => {
        hourlyData[item._id] = item.total;
    });
    
    return hourlyData;
};

// Static method to get weekly usage
EnergyLogSchema.statics.getWeeklyUsage = async function(deviceId, weekStart) {
    const startOfWeek = new Date(weekStart);
    startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
    startOfWeek.setHours(0, 0, 0, 0);
    
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(endOfWeek.getDate() + 6);
    endOfWeek.setHours(23, 59, 59, 999);
    
    const result = await this.aggregate([
        {
            $match: {
                deviceId: deviceId,
                timestamp: { $gte: startOfWeek, $lte: endOfWeek }
            }
        },
        {
            $group: {
                _id: { $dayOfWeek: '$timestamp' },
                total: { $sum: '$energy' },
                avg: { $avg: '$energy' },
                count: { $sum: 1 }
            }
        },
        { $sort: { _id: 1 } }
    ]);
    
    // Fill missing days with zero
    const weeklyData = Array(7).fill(0);
    result.forEach(item => {
        weeklyData[item._id - 1] = item.total;
    });
    
    return weeklyData;
};

// Static method to get monthly usage
EnergyLogSchema.statics.getMonthlyUsage = async function(deviceId, year, month) {
    const startOfMonth = new Date(year, month - 1, 1);
    const endOfMonth = new Date(year, month, 0, 23, 59, 59, 999);
    
    const result = await this.aggregate([
        {
            $match: {
                deviceId: deviceId,
                timestamp: { $gte: startOfMonth, $lte: endOfMonth }
            }
        },
        {
            $group: {
                _id: { $dayOfMonth: '$timestamp' },
                total: { $sum: '$energy' },
                avg: { $avg: '$energy' },
                count: { $sum: 1 }
            }
        },
        { $sort: { _id: 1 } }
    ]);
    
    // Fill missing days with zero
    const daysInMonth = new Date(year, month, 0).getDate();
    const monthlyData = Array(daysInMonth).fill(0);
    result.forEach(item => {
        monthlyData[item._id - 1] = item.total;
    });
    
    return monthlyData;
};

// Static method to get device comparison
EnergyLogSchema.statics.getDeviceComparison = async function(startDate, endDate, ownerId) {
    return await this.aggregate([
        {
            $match: {
                owner: ownerId,
                timestamp: { $gte: startDate, $lte: endDate }
            }
        },
        {
            $group: {
                _id: '$deviceId',
                deviceName: { $first: '$deviceName' },
                total: { $sum: '$energy' },
                avg: { $avg: '$energy' },
                max: { $max: '$energy' },
                count: { $sum: 1 }
            }
        },
        { $sort: { total: -1 } }
    ]);
};

// Static method to get peak usage hours
EnergyLogSchema.statics.getPeakHours = async function(startDate, endDate, ownerId) {
    return await this.aggregate([
        {
            $match: {
                owner: ownerId,
                timestamp: { $gte: startDate, $lte: endDate }
            }
        },
        {
            $group: {
                _id: '$hour',
                total: { $sum: '$energy' },
                avg: { $avg: '$energy' },
                count: { $sum: 1 }
            }
        },
        { $sort: { total: -1 } },
        { $limit: 5 }
    ]);
};

module.exports = mongoose.model('EnergyLog', EnergyLogSchema);