/**
 * Main API Routes
 * Central API router that combines all other routes
 */

const express = require('express');
const router = express.Router();

// Import sub-routers
const authRoutes = require('./auth');
const deviceRoutes = require('./devices');
const analyticsRoutes = require('./analytics');
const automationRoutes = require('./automation');
const adminRoutes = require('./admin');

// Import middleware
const authMiddleware = require('../middleware/auth');
const rateLimiter = require('../middleware/rateLimiter');
const logger = require('../middleware/logger');

// Apply global middleware to all API routes
router.use(logger);
router.use(rateLimiter);

// Health check endpoint
router.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        version: '1.0.0'
    });
});

// System status endpoint
router.get('/status', async (req, res) => {
    try {
        const status = {
            server: 'online',
            timestamp: new Date().toISOString(),
            uptime: process.uptime(),
            memory: process.memoryUsage(),
            version: '1.0.0'
        };
        
        // Check ESP32 connection status from global state
        const espConnected = global.espDevices ? global.espDevices.size > 0 : false;
        status.esp32 = {
            connected: espConnected,
            devices: espConnected ? Array.from(global.espDevices.keys()) : []
        };
        
        // Get device stats from global state
        const devices = global.deviceStates?.devices || [];
        const activeDevices = devices.filter(d => d.state).length;
        
        status.devices = {
            total: devices.length,
            active: activeDevices,
            autoMode: devices.filter(d => d.autoMode).length
        };
        
        // Get system stats
        status.system = global.systemStats || {
            temperature: 23,
            humidity: 45,
            energyUsage: 0
        };
        
        res.json(status);
    } catch (error) {
        console.error('Status check error:', error);
        res.status(500).json({ error: 'Failed to get system status' });
    }
});

// Ping endpoint for connectivity testing
router.get('/ping', (req, res) => {
    res.json({
        pong: true,
        timestamp: Date.now(),
        clientIp: req.ip
    });
});

// Mount sub-routers
router.use('/auth', authRoutes);
router.use('/devices', deviceRoutes);
router.use('/analytics', analyticsRoutes);
router.use('/automation', automationRoutes);
router.use('/admin', adminRoutes);

// 404 handler for undefined API routes
router.use('*', (req, res) => {
    res.status(404).json({
        error: 'API endpoint not found',
        path: req.originalUrl,
        method: req.method
    });
});

module.exports = router;