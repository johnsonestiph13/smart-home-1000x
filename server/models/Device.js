/**
 * Device Model
 * Represents smart home devices connected to the system
 */

const mongoose = require('mongoose');

const DeviceSchema = new mongoose.Schema({
    // Basic Information
    id: {
        type: Number,
        required: true,
        unique: true
    },
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
    descriptionAm: String,
    
    // Hardware Configuration
    gpio: {
        type: Number,
        required: true,
        min: 0,
        max: 39
    },
    type: {
        type: String,
        enum: ['light', 'fan', 'ac', 'tv', 'heater', 'pump', 'sensor', 'other'],
        required: true
    },
    icon: {
        type: String,
        default: '🔌'
    },
    
    // Electrical Specs
    power: {
        type: Number,
        default: 0,
        min: 0
    }, // Watts
    voltage: {
        type: Number,
        default: 220
    }, // Volts
    current: {
        type: Number,
        default: 0
    }, // Amps
    
    // State Management
    state: {
        type: Boolean,
        default: false
    },
    autoMode: {
        type: Boolean,
        default: false
    },
    autoConditions: {
        type: mongoose.Schema.Types.Mixed,
        default: {}
    },
    
    // Advanced Features
    dimmable: {
        type: Boolean,
        default: false
    },
    dimmer: {
        type: Number,
        min: 0,
        max: 100,
        default: 100
    },
    colorCapable: {
        type: Boolean,
        default: false
    },
    color: {
        type: String,
        default: '#ffffff'
    },
    
    // Location
    room: {
        type: String,
        trim: true
    },
    roomAm: {
        type: String,
        trim: true
    },
    floor: {
        type: Number,
        default: 0
    },
    zone: String,
    
    // Maintenance & Health
    healthScore: {
        type: Number,
        min: 0,
        max: 100,
        default: 100
    },
    lastMaintenance: Date,
    lastError: {
        type: String,
        default: null
    },
    errorCount: {
        type: Number,
        default: 0
    },
    
    // Usage Statistics
    totalRuntime: {
        type: Number,
        default: 0
    }, // Hours
    cycleCount: {
        type: Number,
        default: 0
    },
    lastStateChange: Date,
    energyConsumed: {
        type: Number,
        default: 0
    }, // kWh
    
    // ESP32 Connection
    espIP: String,
    espMAC: String,
    
    // Scheduling
    schedules: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Schedule'
    }],
    
    // Owner
    owner: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    
    // Metadata
    firmwareVersion: {
        type: String,
        default: '1.0.0'
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    },
    isActive: {
        type: Boolean,
        default: true
    }
}, {
    timestamps: true,
    toJSON: { virtuals: true }
});

// Indexes
DeviceSchema.index({ id: 1 });
DeviceSchema.index({ type: 1 });
DeviceSchema.index({ room: 1 });
DeviceSchema.index({ state: 1 });
DeviceSchema.index({ owner: 1 });

// Pre-save middleware
DeviceSchema.pre('save', function(next) {
    this.updatedAt = Date.now();
    
    // Track state changes for cycle count
    if (this.isModified('state')) {
        this.cycleCount++;
        this.lastStateChange = new Date();
        
        // Update energy consumption if turning on
        if (this.state && this.power > 0) {
            // Will be calculated in post-save
        }
    }
    
    next();
});

// Post-save middleware to update energy consumption
DeviceSchema.post('save', async function(doc) {
    if (doc.state && doc.power > 0) {
        const EnergyLog = mongoose.model('EnergyLog');
        
        // Log energy consumption every hour when device is on
        const hourlyEnergy = (doc.power * 1) / 1000; // kWh per hour
        
        await EnergyLog.create({
            deviceId: doc.id,
            deviceName: doc.name,
            energy: hourlyEnergy,
            timestamp: new Date(),
            source: 'device_state'
        });
        
        doc.energyConsumed += hourlyEnergy;
        await doc.save();
    }
});

// Virtual for power consumption
DeviceSchema.virtual('currentPower').get(function() {
    return this.state ? this.power : 0;
});

// Virtual for energy cost
DeviceSchema.virtual('estimatedCost').get(function() {
    const rate = 0.15; // $0.15 per kWh
    return (this.energyConsumed * rate).toFixed(2);
});

// Virtual for health status
DeviceSchema.virtual('healthStatus').get(function() {
    if (this.healthScore >= 90) return 'excellent';
    if (this.healthScore >= 70) return 'good';
    if (this.healthScore >= 50) return 'fair';
    if (this.healthScore >= 30) return 'poor';
    return 'critical';
});

// Method to toggle device
DeviceSchema.methods.toggle = async function() {
    this.state = !this.state;
    await this.save();
    return this.state;
};

// Method to set auto mode
DeviceSchema.methods.setAutoMode = async function(enabled, conditions = {}) {
    this.autoMode = enabled;
    this.autoConditions = conditions;
    await this.save();
    return this;
};

// Method to record error
DeviceSchema.methods.recordError = async function(error) {
    this.errorCount++;
    this.lastError = error;
    this.healthScore = Math.max(0, this.healthScore - 5);
    await this.save();
};

// Method to update health score
DeviceSchema.methods.updateHealthScore = async function(sensorData) {
    let score = 100;
    
    // Temperature impact
    if (sensorData.temperature > 70) {
        score -= (sensorData.temperature - 70) * 2;
    }
    
    // Current impact
    if (sensorData.current > this.current * 1.2) {
        score -= (sensorData.current - this.current) * 5;
    }
    
    // Runtime impact
    const runtimeHours = this.totalRuntime;
    if (runtimeHours > 10000) {
        score -= ((runtimeHours - 10000) / 1000) * 5;
    }
    
    this.healthScore = Math.max(0, Math.min(100, score));
    await this.save();
    
    return this.healthScore;
};

// Static method to get active devices
DeviceSchema.statics.getActiveDevices = function() {
    return this.find({ state: true, isActive: true });
};

// Static method to get devices by type
DeviceSchema.statics.getByType = function(type) {
    return this.find({ type, isActive: true });
};

module.exports = mongoose.model('Device', DeviceSchema);