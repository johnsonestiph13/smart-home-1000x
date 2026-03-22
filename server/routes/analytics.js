/**
 * Analytics Routes
 * Handles data analytics, reporting, and statistics
 */

const express = require('express');
const router = express.Router();
const { body, query, validationResult } = require('express-validator');

// In-memory storage for analytics data (replace with database in production)
let energyLogs = [];
let activityLogs = [];
let deviceStats = {};

// Initialize with sample data
const initSampleData = () => {
    const now = Date.now();
    for (let i = 0; i < 24; i++) {
        energyLogs.push({
            id: i,
            timestamp: now - (i * 3600000),
            value: Math.floor(Math.random() * 500) + 100,
            type: 'energy'
        });
    }
    
    for (let i = 0; i < 100; i++) {
        activityLogs.push({
            id: i,
            timestamp: now - (i * 60000),
            type: ['device', 'system', 'automation', 'voice'][Math.floor(Math.random() * 4)],
            action: ['toggle', 'schedule', 'command', 'update'][Math.floor(Math.random() * 4)],
            message: `Activity ${i}`,
            severity: ['info', 'success', 'warning'][Math.floor(Math.random() * 3)]
        });
    }
};

initSampleData();

// Get energy analytics
router.get('/energy', [
    query('period').optional().isIn(['hour', 'day', 'week', 'month', 'year']),
    query('startDate').optional().isISO8601(),
    query('endDate').optional().isISO8601()
], (req, res) => {
    const { period, startDate, endDate } = req.query;
    
    let filteredLogs = [...energyLogs];
    
    // Filter by date range
    if (startDate && endDate) {
        const start = new Date(startDate).getTime();
        const end = new Date(endDate).getTime();
        filteredLogs = filteredLogs.filter(log => log.timestamp >= start && log.timestamp <= end);
    }
    
    // Aggregate by period
    let aggregated = [];
    if (period === 'hour') {
        const hourly = Array(24).fill(0);
        filteredLogs.forEach(log => {
            const hour = new Date(log.timestamp).getHours();
            hourly[hour] += log.value;
        });
        aggregated = hourly.map((value, hour) => ({ hour, value }));
    } else if (period === 'day') {
        const daily = {};
        filteredLogs.forEach(log => {
            const date = new Date(log.timestamp).toDateString();
            daily[date] = (daily[date] || 0) + log.value;
        });
        aggregated = Object.entries(daily).map(([date, value]) => ({ date, value }));
    } else {
        aggregated = filteredLogs.map(log => ({
            timestamp: log.timestamp,
            value: log.value
        }));
    }
    
    // Calculate statistics
    const values = filteredLogs.map(l => l.value);
    const total = values.reduce((a, b) => a + b, 0);
    const average = values.length > 0 ? total / values.length : 0;
    const peak = Math.max(...values, 0);
    const min = Math.min(...values, Infinity);
    
    res.json({
        success: true,
        period,
        data: aggregated,
        stats: {
            total: total.toFixed(2),
            average: average.toFixed(2),
            peak: peak.toFixed(2),
            min: min === Infinity ? 0 : min.toFixed(2),
            dataPoints: filteredLogs.length
        }
    });
});

// Get device analytics
router.get('/devices', (req, res) => {
    const devices = global.deviceStates?.devices || [];
    
    const deviceAnalytics = devices.map(device => ({
        id: device.id,
        name: device.name,
        nameAm: device.nameAm,
        state: device.state,
        autoMode: device.autoMode,
        power: device.power,
        usageCount: deviceStats[device.id]?.count || 0,
        totalRuntime: deviceStats[device.id]?.runtime || 0,
        lastUsed: deviceStats[device.id]?.lastUsed || null
    }));
    
    const summary = {
        totalDevices: devices.length,
        activeDevices: devices.filter(d => d.state).length,
        autoModeDevices: devices.filter(d => d.autoMode).length,
        totalPower: devices.reduce((sum, d) => sum + (d.state ? d.power : 0), 0),
        maxPower: Math.max(...devices.map(d => d.power), 0),
        efficiency: devices.filter(d => d.state && !d.autoMode).length / (devices.filter(d => d.state).length || 1) * 100
    };
    
    res.json({
        success: true,
        devices: deviceAnalytics,
        summary
    });
});

// Get device specific analytics
router.get('/device/:id', [
    query('period').optional().isIn(['day', 'week', 'month'])
], (req, res) => {
    const deviceId = parseInt(req.params.id);
    const { period = 'day' } = req.query;
    
    const device = global.deviceStates?.devices?.find(d => d.id === deviceId);
    if (!device) {
        return res.status(404).json({ error: 'Device not found' });
    }
    
    // Get device usage history (simulated)
    const history = [];
    const now = Date.now();
    const periods = {
        day: 24 * 60 * 60 * 1000,
        week: 7 * 24 * 60 * 60 * 1000,
        month: 30 * 24 * 60 * 60 * 1000
    };
    
    const timeRange = periods[period];
    const points = period === 'day' ? 24 : period === 'week' ? 7 : 30;
    
    for (let i = 0; i < points; i++) {
        const timestamp = now - (i * (timeRange / points));
        history.unshift({
            timestamp,
            state: Math.random() > 0.5,
            power: device.state ? device.power : 0
        });
    }
    
    // Calculate statistics
    const activePeriods = history.filter(h => h.state).length;
    const usagePercentage = (activePeriods / history.length) * 100;
    const totalEnergy = history.reduce((sum, h) => sum + (h.state ? device.power : 0), 0);
    
    res.json({
        success: true,
        device: {
            id: device.id,
            name: device.name,
            nameAm: device.nameAm,
            state: device.state,
            autoMode: device.autoMode,
            power: device.power,
            gpio: device.gpio
        },
        analytics: {
            period,
            history,
            usagePercentage: usagePercentage.toFixed(1),
            totalEnergy: totalEnergy.toFixed(2),
            averagePower: (totalEnergy / history.length).toFixed(2),
            estimatedCost: (totalEnergy / 1000 * 0.15).toFixed(2) // $0.15 per kWh
        }
    });
});

// Get activity logs
router.get('/activity', [
    query('limit').optional().isInt({ min: 1, max: 500 }),
    query('type').optional().isString(),
    query('severity').optional().isIn(['info', 'success', 'warning', 'error'])
], (req, res) => {
    const { limit = 100, type, severity } = req.query;
    
    let filtered = [...activityLogs];
    
    if (type) {
        filtered = filtered.filter(log => log.type === type);
    }
    
    if (severity) {
        filtered = filtered.filter(log => log.severity === severity);
    }
    
    filtered.sort((a, b) => b.timestamp - a.timestamp);
    filtered = filtered.slice(0, parseInt(limit));
    
    res.json({
        success: true,
        logs: filtered,
        count: filtered.length,
        total: activityLogs.length
    });
});

// Add activity log (internal use)
router.post('/activity', [
    body('type').isString(),
    body('action').isString(),
    body('message').isString(),
    body('severity').optional().isIn(['info', 'success', 'warning', 'error'])
], (req, res) => {
    const { type, action, message, severity = 'info' } = req.body;
    
    const newLog = {
        id: activityLogs.length + 1,
        timestamp: Date.now(),
        type,
        action,
        message,
        severity
    };
    
    activityLogs.unshift(newLog);
    
    // Keep only last 1000 logs
    if (activityLogs.length > 1000) {
        activityLogs.pop();
    }
    
    res.json({
        success: true,
        log: newLog
    });
});

// Generate report
router.post('/report', [
    body('startDate').isISO8601(),
    body('endDate').isISO8601(),
    body('metrics').isArray()
], (req, res) => {
    const { startDate, endDate, metrics, format = 'json' } = req.body;
    
    const start = new Date(startDate).getTime();
    const end = new Date(endDate).getTime();
    
    const report = {
        generated: new Date().toISOString(),
        period: { startDate, endDate },
        metrics: {}
    };
    
    // Energy metrics
    if (metrics.includes('energy')) {
        const energyData = energyLogs.filter(log => log.timestamp >= start && log.timestamp <= end);
        const totalEnergy = energyData.reduce((sum, l) => sum + l.value, 0);
        report.metrics.energy = {
            total: totalEnergy,
            average: energyData.length > 0 ? totalEnergy / energyData.length : 0,
            peak: Math.max(...energyData.map(l => l.value), 0),
            dataPoints: energyData.length
        };
    }
    
    // Device metrics
    if (metrics.includes('devices')) {
        const devices = global.deviceStates?.devices || [];
        report.metrics.devices = {
            total: devices.length,
            active: devices.filter(d => d.state).length,
            autoMode: devices.filter(d => d.autoMode).length,
            devices: devices.map(d => ({
                id: d.id,
                name: d.name,
                state: d.state,
                autoMode: d.autoMode
            }))
        };
    }
    
    // Activity metrics
    if (metrics.includes('activity')) {
        const activityData = activityLogs.filter(log => log.timestamp >= start && log.timestamp <= end);
        const byType = {};
        activityData.forEach(log => {
            byType[log.type] = (byType[log.type] || 0) + 1;
        });
        
        report.metrics.activity = {
            total: activityData.length,
            byType,
            recent: activityData.slice(0, 10)
        };
    }
    
    // Efficiency metrics
    if (metrics.includes('efficiency')) {
        const devices = global.deviceStates?.devices || [];
        const activeDevices = devices.filter(d => d.state);
        const totalPower = activeDevices.reduce((sum, d) => sum + d.power, 0);
        const maxPower = devices.reduce((sum, d) => sum + d.power, 0);
        
        report.metrics.efficiency = {
            score: maxPower > 0 ? ((maxPower - totalPower) / maxPower * 100).toFixed(1) : 100,
            totalPower,
            maxPower,
            savings: maxPower - totalPower
        };
    }
    
    // Cost metrics
    if (metrics.includes('cost')) {
        const energyData = energyLogs.filter(log => log.timestamp >= start && log.timestamp <= end);
        const totalEnergy = energyData.reduce((sum, l) => sum + l.value, 0);
        const ratePerKwh = 0.15; // $0.15 per kWh
        
        report.metrics.cost = {
            totalEnergy: totalEnergy,
            estimatedCost: (totalEnergy / 1000 * ratePerKwh).toFixed(2),
            ratePerKwh
        };
    }
    
    res.json({
        success: true,
        report
    });
});

// Get system performance metrics
router.get('/performance', (req, res) => {
    const performance = {
        server: {
            uptime: process.uptime(),
            memory: process.memoryUsage(),
            cpu: process.cpuUsage()
        },
        system: global.systemStats || {
            temperature: 23,
            humidity: 45,
            energyUsage: 0
        },
        network: {
            espConnected: global.espDevices ? global.espDevices.size > 0 : false,
            espCount: global.espDevices ? global.espDevices.size : 0
        }
    };
    
    res.json({
        success: true,
        performance
    });
});

// Export data
router.get('/export', [
    query('type').isIn(['energy', 'activity', 'devices', 'all'])
], (req, res) => {
    const { type } = req.query;
    
    let exportData = {};
    
    if (type === 'energy' || type === 'all') {
        exportData.energy = energyLogs;
    }
    
    if (type === 'activity' || type === 'all') {
        exportData.activity = activityLogs;
    }
    
    if (type === 'devices' || type === 'all') {
        exportData.devices = global.deviceStates?.devices || [];
    }
    
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename=analytics_export_${Date.now()}.json`);
    res.json(exportData);
});

module.exports = router;