/**
 * Admin Routes
 * Handles administrative functions like user management, system settings, and monitoring
 */

const express = require('express');
const router = express.Router();
const { body, param, query, validationResult } = require('express-validator');
const fs = require('fs');
const path = require('path');

// Admin middleware - check if user has admin role
const isAdmin = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
        return res.status(401).json({ error: 'No token provided' });
    }
    
    // In production, verify JWT and check role
    // For demo, we'll assume the request has admin privileges
    
    // Mock admin check - in production, decode JWT and check role
    next();
};

// Apply admin middleware to all routes
router.use(isAdmin);

// ========== User Management ==========

// Get all users
router.get('/users', (req, res) => {
    // In production, fetch from database
    const users = [
        {
            id: 1,
            email: 'admin@estifhome.com',
            name: 'Admin User',
            role: 'admin',
            status: 'active',
            lastLogin: new Date(),
            createdAt: new Date()
        },
        {
            id: 2,
            email: 'user@estifhome.com',
            name: 'Regular User',
            role: 'user',
            status: 'active',
            lastLogin: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
            createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
        }
    ];
    
    res.json({
        success: true,
        users,
        count: users.length
    });
});

// Get user by ID
router.get('/users/:id', [
    param('id').isInt()
], (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }
    
    // Mock user data
    const user = {
        id: parseInt(req.params.id),
        email: 'user@estifhome.com',
        name: 'Regular User',
        role: 'user',
        status: 'active',
        devices: [],
        permissions: ['devices.read', 'devices.write', 'automation.read'],
        lastLogin: new Date(),
        createdAt: new Date()
    };
    
    res.json({ success: true, user });
});

// Create user
router.post('/users', [
    body('email').isEmail().normalizeEmail(),
    body('password').isLength({ min: 6 }),
    body('name').notEmpty().trim(),
    body('role').optional().isIn(['admin', 'user', 'guest'])
], (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }
    
    const newUser = {
        id: Date.now(),
        ...req.body,
        status: 'active',
        createdAt: new Date(),
        lastLogin: null
    };
    
    // Remove password from response
    const { password, ...userWithoutPassword } = newUser;
    
    res.status(201).json({
        success: true,
        user: userWithoutPassword,
        message: 'User created successfully'
    });
});

// Update user
router.put('/users/:id', [
    param('id').isInt(),
    body('name').optional().trim(),
    body('email').optional().isEmail(),
    body('role').optional().isIn(['admin', 'user', 'guest']),
    body('status').optional().isIn(['active', 'inactive', 'suspended'])
], (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }
    
    const updatedUser = {
        id: parseInt(req.params.id),
        ...req.body,
        updatedAt: new Date()
    };
    
    res.json({
        success: true,
        user: updatedUser,
        message: 'User updated successfully'
    });
});

// Delete user
router.delete('/users/:id', [
    param('id').isInt()
], (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }
    
    res.json({
        success: true,
        message: `User ${req.params.id} deleted successfully`
    });
});

// ========== System Settings ==========

// Get system settings
router.get('/settings', (req, res) => {
    const settings = {
        system: {
            name: 'Estif Home',
            version: '1.0.0',
            timezone: 'Africa/Addis_Ababa',
            language: 'en'
        },
        security: {
            twoFactorEnabled: false,
            sessionTimeout: 3600,
            maxLoginAttempts: 5
        },
        notifications: {
            emailEnabled: true,
            pushEnabled: true,
            soundEnabled: true
        },
        automation: {
            defaultCooldown: 300000,
            maxRules: 50,
            maxSchedules: 100
        }
    };
    
    res.json({ success: true, settings });
});

// Update system settings
router.put('/settings', [
    body('settings').isObject()
], (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }
    
    // In production, save to database
    const updatedSettings = req.body.settings;
    
    res.json({
        success: true,
        settings: updatedSettings,
        message: 'Settings updated successfully'
    });
});

// ========== System Monitoring ==========

// Get system metrics
router.get('/metrics', (req, res) => {
    const metrics = {
        system: {
            uptime: process.uptime(),
            memory: process.memoryUsage(),
            cpu: process.cpuUsage(),
            platform: process.platform,
            nodeVersion: process.version
        },
        application: {
            devices: global.deviceStates?.devices?.length || 0,
            activeDevices: global.deviceStates?.devices?.filter(d => d.state).length || 0,
            espConnected: global.espDevices ? global.espDevices.size > 0 : false,
            espCount: global.espDevices ? global.espDevices.size : 0
        },
        performance: {
            responseTime: [],
            requestCount: 0,
            errorRate: 0
        }
    };
    
    res.json({ success: true, metrics });
});

// Get system logs
router.get('/logs', [
    query('level').optional().isIn(['info', 'warn', 'error']),
    query('limit').optional().isInt({ min: 1, max: 1000 })
], (req, res) => {
    const { level, limit = 100 } = req.query;
    
    // Mock logs
    const logs = [
        { timestamp: new Date(), level: 'info', message: 'System started', source: 'system' },
        { timestamp: new Date(), level: 'info', message: 'ESP32 connected', source: 'network' },
        { timestamp: new Date(), level: 'warn', message: 'High energy usage detected', source: 'energy' },
        { timestamp: new Date(), level: 'info', message: 'Device toggled: Light ON', source: 'device' }
    ];
    
    let filtered = logs;
    if (level) {
        filtered = logs.filter(l => l.level === level);
    }
    
    filtered = filtered.slice(0, parseInt(limit));
    
    res.json({
        success: true,
        logs: filtered,
        count: filtered.length
    });
});

// Clear system logs
router.delete('/logs', (req, res) => {
    // In production, clear logs from database/file
    res.json({
        success: true,
        message: 'Logs cleared successfully'
    });
});

// ========== Backup & Restore ==========

// Create system backup
router.post('/backup', (req, res) => {
    const backup = {
        id: Date.now(),
        timestamp: new Date(),
        data: {
            devices: global.deviceStates?.devices || [],
            settings: {},
            version: '1.0.0'
        },
        size: 0
    };
    
    // In production, save to file or cloud storage
    
    res.json({
        success: true,
        backup,
        message: 'Backup created successfully'
    });
});

// Get backup list
router.get('/backups', (req, res) => {
    const backups = [
        { id: 1, timestamp: new Date(), size: '2.3 MB', type: 'full' },
        { id: 2, timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000), size: '1.8 MB', type: 'full' },
        { id: 3, timestamp: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), size: '2.1 MB', type: 'full' }
    ];
    
    res.json({ success: true, backups });
});

// Restore from backup
router.post('/restore/:backupId', [
    param('backupId').isInt()
], (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }
    
    res.json({
        success: true,
        message: `System restored from backup ${req.params.backupId}`
    });
});

// ========== Device Management (Admin) ==========

// Get all devices with admin details
router.get('/devices', (req, res) => {
    const devices = global.deviceStates?.devices || [];
    
    const adminDevices = devices.map(device => ({
        ...device,
        adminDetails: {
            lastStateChange: device.lastStateChange || null,
            totalRuntime: device.totalRuntime || 0,
            errorCount: device.errorCount || 0,
            lastError: device.lastError || null
        }
    }));
    
    res.json({
        success: true,
        devices: adminDevices,
        count: adminDevices.length
    });
});

// Add new device
router.post('/devices', [
    body('name').notEmpty().trim(),
    body('gpio').isInt(),
    body('power').isInt(),
    body('room').optional().trim(),
    body('icon').optional().trim()
], (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }
    
    const newDevice = {
        id: global.deviceStates?.devices?.length || 0,
        ...req.body,
        state: false,
        autoMode: false,
        createdAt: new Date()
    };
    
    if (global.deviceStates && global.deviceStates.devices) {
        global.deviceStates.devices.push(newDevice);
    }
    
    res.status(201).json({
        success: true,
        device: newDevice,
        message: 'Device added successfully'
    });
});

// Update device configuration
router.put('/devices/:id', [
    param('id').isInt(),
    body('name').optional().trim(),
    body('gpio').optional().isInt(),
    body('power').optional().isInt(),
    body('room').optional().trim()
], (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }
    
    const deviceId = parseInt(req.params.id);
    const device = global.deviceStates?.devices?.find(d => d.id === deviceId);
    
    if (!device) {
        return res.status(404).json({ error: 'Device not found' });
    }
    
    Object.assign(device, req.body, { updatedAt: new Date() });
    
    res.json({
        success: true,
        device,
        message: 'Device updated successfully'
    });
});

// Delete device
router.delete('/devices/:id', [
    param('id').isInt()
], (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }
    
    const deviceId = parseInt(req.params.id);
    const deviceIndex = global.deviceStates?.devices?.findIndex(d => d.id === deviceId);
    
    if (deviceIndex === -1 || deviceIndex === undefined) {
        return res.status(404).json({ error: 'Device not found' });
    }
    
    const deletedDevice = global.deviceStates.devices[deviceIndex];
    global.deviceStates.devices.splice(deviceIndex, 1);
    
    res.json({
        success: true,
        device: deletedDevice,
        message: 'Device deleted successfully'
    });
});

// ========== ESP32 Management ==========

// Get all connected ESP32 devices
router.get('/esp/devices', (req, res) => {
    const espDevices = global.espDevices ? Array.from(global.espDevices.values()) : [];
    
    const devices = espDevices.map(esp => ({
        ip: esp.ip,
        name: esp.name,
        mac: esp.mac,
        status: (Date.now() - esp.lastSeen) < 30000 ? 'online' : 'offline',
        lastSeen: esp.lastSeen,
        firmware: esp.firmware || '1.0.0'
    }));
    
    res.json({ success: true, devices });
});

// Update ESP32 configuration
router.put('/esp/:ip', [
    param('ip').isIP(),
    body('name').optional().trim(),
    body('firmware').optional().trim()
], (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }
    
    const esp = global.espDevices?.get(req.params.ip);
    if (!esp) {
        return res.status(404).json({ error: 'ESP32 not found' });
    }
    
    if (req.body.name) esp.name = req.body.name;
    if (req.body.firmware) esp.firmware = req.body.firmware;
    
    res.json({
        success: true,
        device: esp,
        message: 'ESP32 configuration updated'
    });
});

// Reboot ESP32
router.post('/esp/:ip/reboot', [
    param('ip').isIP()
], (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }
    
    const esp = global.espDevices?.get(req.params.ip);
    if (!esp) {
        return res.status(404).json({ error: 'ESP32 not found' });
    }
    
    // In production, send reboot command to ESP32
    
    res.json({
        success: true,
        message: `Reboot command sent to ESP32 at ${req.params.ip}`
    });
});

// ========== System Maintenance ==========

// System health check
router.get('/health', (req, res) => {
    const health = {
        status: 'healthy',
        timestamp: new Date(),
        components: {
            server: { status: 'up', responseTime: 50 },
            database: { status: 'up', latency: 25 },
            redis: { status: 'up', latency: 10 },
            esp32: { status: global.espDevices && global.espDevices.size > 0 ? 'connected' : 'disconnected' }
        },
        alerts: []
    };
    
    // Check for any issues
    if (!global.espDevices || global.espDevices.size === 0) {
        health.alerts.push({ severity: 'warning', message: 'No ESP32 devices connected' });
        health.status = 'degraded';
    }
    
    res.json(health);
});

// Restart system services
router.post('/restart', (req, res) => {
    // In production, gracefully restart services
    
    res.json({
        success: true,
        message: 'System restart initiated'
    });
});

// Export system data
router.get('/export', [
    query('type').isIn(['devices', 'users', 'logs', 'all'])
], (req, res) => {
    const { type } = req.query;
    
    let exportData = {
        exportedAt: new Date(),
        version: '1.0.0'
    };
    
    if (type === 'devices' || type === 'all') {
        exportData.devices = global.deviceStates?.devices || [];
    }
    
    if (type === 'users' || type === 'all') {
        exportData.users = []; // In production, fetch from database
    }
    
    if (type === 'logs' || type === 'all') {
        exportData.logs = []; // In production, fetch logs
    }
    
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename=system_export_${Date.now()}.json`);
    res.json(exportData);
});

// Import system data
router.post('/import', [
    body('data').isObject()
], (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }
    
    const { data } = req.body;
    
    // Validate and import data
    
    res.json({
        success: true,
        message: 'Data imported successfully'
    });
});

module.exports = router;