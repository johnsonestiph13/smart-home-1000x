/**
 * User Model
 * Handles user authentication, profiles, and permissions
 */

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const UserSchema = new mongoose.Schema({
    // Basic Information
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true,
        match: [/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
    },
    password: {
        type: String,
        required: true,
        minlength: 6,
        select: false
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
    
    // User Role and Permissions
    role: {
        type: String,
        enum: ['admin', 'user', 'guest', 'maintenance'],
        default: 'user'
    },
    permissions: [{
        type: String,
        enum: [
            'devices.read', 'devices.write', 'devices.control',
            'automation.read', 'automation.write',
            'schedules.read', 'schedules.write',
            'analytics.read',
            'users.read', 'users.write',
            'settings.read', 'settings.write',
            'admin'
        ]
    }],
    
    // Account Status
    status: {
        type: String,
        enum: ['active', 'inactive', 'suspended', 'pending'],
        default: 'pending'
    },
    emailVerified: {
        type: Boolean,
        default: false
    },
    emailVerificationToken: String,
    emailVerificationExpires: Date,
    
    // Security
    twoFactorEnabled: {
        type: Boolean,
        default: false
    },
    twoFactorSecret: String,
    twoFactorBackupCodes: [String],
    
    // Password Reset
    resetPasswordToken: String,
    resetPasswordExpires: Date,
    
    // Session Management
    tokenVersion: {
        type: Number,
        default: 0
    },
    lastLogin: Date,
    lastLoginIP: String,
    loginCount: {
        type: Number,
        default: 0
    },
    
    // User Preferences
    preferences: {
        language: {
            type: String,
            enum: ['en', 'am'],
            default: 'en'
        },
        theme: {
            type: String,
            enum: ['light', 'dark', 'auto'],
            default: 'light'
        },
        timezone: {
            type: String,
            default: 'Africa/Addis_Ababa'
        },
        temperatureUnit: {
            type: String,
            enum: ['celsius', 'fahrenheit'],
            default: 'celsius'
        },
        notifications: {
            email: { type: Boolean, default: true },
            push: { type: Boolean, default: true },
            sound: { type: Boolean, default: true },
            sms: { type: Boolean, default: false }
        },
        dashboard: {
            defaultView: { type: String, default: 'dashboard' },
            widgets: [String]
        }
    },
    
    // Device Access
    accessibleDevices: [{
        deviceId: { type: Number, ref: 'Device' },
        permissions: [String]
    }],
    
    // Favorite Devices and Scenes
    favorites: {
        devices: [Number],
        scenes: [String],
        automations: [String]
    },
    
    // Activity Tracking
    lastActive: Date,
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Indexes for faster queries
UserSchema.index({ email: 1 });
UserSchema.index({ status: 1 });
UserSchema.index({ role: 1 });
UserSchema.index({ lastLogin: -1 });

// Hash password before saving
UserSchema.pre('save', async function(next) {
    if (!this.isModified('password')) return next();
    
    try {
        const salt = await bcrypt.genSalt(10);
        this.password = await bcrypt.hash(this.password, salt);
        next();
    } catch (error) {
        next(error);
    }
});

// Update timestamps
UserSchema.pre('save', function(next) {
    this.updatedAt = Date.now();
    next();
});

// Compare password method
UserSchema.methods.comparePassword = async function(candidatePassword) {
    return await bcrypt.compare(candidatePassword, this.password);
};

// Generate password reset token
UserSchema.methods.generatePasswordResetToken = function() {
    const crypto = require('crypto');
    const resetToken = crypto.randomBytes(32).toString('hex');
    
    this.resetPasswordToken = crypto
        .createHash('sha256')
        .update(resetToken)
        .digest('hex');
    
    this.resetPasswordExpires = Date.now() + 3600000; // 1 hour
    
    return resetToken;
};

// Generate email verification token
UserSchema.methods.generateEmailVerificationToken = function() {
    const crypto = require('crypto');
    const verificationToken = crypto.randomBytes(32).toString('hex');
    
    this.emailVerificationToken = crypto
        .createHash('sha256')
        .update(verificationToken)
        .digest('hex');
    
    this.emailVerificationExpires = Date.now() + 86400000; // 24 hours
    
    return verificationToken;
};

// Check if user has permission
UserSchema.methods.hasPermission = function(permission) {
    if (this.role === 'admin') return true;
    return this.permissions.includes(permission);
};

// Check if user can access device
UserSchema.methods.canAccessDevice = function(deviceId) {
    if (this.role === 'admin') return true;
    return this.accessibleDevices.some(d => d.deviceId === deviceId);
};

// Increment login count
UserSchema.methods.recordLogin = function(ip) {
    this.loginCount++;
    this.lastLogin = new Date();
    this.lastLoginIP = ip;
    this.tokenVersion++;
    return this.save();
};

// Virtual for full name
UserSchema.virtual('fullName').get(function() {
    return this.name;
});

// Virtual for display name
UserSchema.virtual('displayName').get(function() {
    return this.nameAm || this.name;
});

// Virtual for isAdmin
UserSchema.virtual('isAdmin').get(function() {
    return this.role === 'admin';
});

// Static method to find by email
UserSchema.statics.findByEmail = function(email) {
    return this.findOne({ email: email.toLowerCase() });
};

// Static method to find active users
UserSchema.statics.findActive = function() {
    return this.find({ status: 'active' });
};

module.exports = mongoose.model('User', UserSchema);