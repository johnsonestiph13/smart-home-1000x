/**
 * Device Routes
 * Handles device management and control operations
 */

const express = require('express');
const router = express.Router();
const { body, param, validationResult } = require('express-validator');

// Global device state (in production, this would be in a database)
const deviceStates = {
    devices: [
        { id: 0, name: "Light", nameAm: "መብራት", gpio: 23, state: false, autoMode: false, power: 10, room: "Living Room", roomAm: "ሳሎን" },
        { id: 1, name: "Fan", nameAm: "ማራገቢያ", gpio: 22, state: false, autoMode: true, power: 40, room: "Bedroom", roomAm: "መኝታ" },
        { id: 2, name: "AC", nameAm: "አየር ማቀዝቀዣ", gpio: 21, state: false, autoMode: true, power: 120, room: "Master", roomAm: "ዋና" },
        { id: 3, name: "TV", nameAm: "ቴሌቪዥን", gpio: 19, state: false, autoMode: false, power: 80, room: "Entertainment", roomAm: "መዝናኛ" },
        { id: 4, name: "Heater", nameAm: "ማሞቂያ", gpio: 18, state: false, autoMode: true, power: 1500, room: "Bathroom", roomAm: "መታጠቢያ" },
        { id: 5, name: "Pump", nameAm: "ፓምፕ", gpio: 5, state: false, autoMode: false, power: 250, room: "Garden", roomAm: "አትክልት" }
    ],
    lastUpdated: new Date()
};

// Helper to broadcast device updates to connected clients
const broadcastDeviceUpdate = (io, device) => {
    if (io) {
        io.emit('device_update', device);
        io.emit('device_state_change', { deviceId: device.id, state: device.state });
    }
};

// Get all devices
router.get('/', (req, res) => {
    res.json({
        success: true,
        devices: deviceStates.devices,
        count: deviceStates.devices.length,
        lastUpdated: deviceStates.lastUpdated
    });
});

// Get single device
router.get('/:id', [
    param('id').isInt({ min: 0, max: 5 })
], (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }
    
    const deviceId = parseInt(req.params.id);
    const device = deviceStates.devices.find(d => d.id === deviceId);
    
    if (!device) {
        return res.status(404).json({ error: 'Device not found' });
    }
    
    res.json({ success: true, device });
});

// Toggle device
router.post('/:id/toggle', [
    param('id').isInt({ min: 0, max: 5 })
], (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }
    
    const deviceId = parseInt(req.params.id);
    const device = deviceStates.devices.find(d => d.id === deviceId);
    
    if (!device) {
        return res.status(404).json({ error: 'Device not found' });
    }
    
    // If in auto mode, prevent manual control
    if (device.autoMode) {
        return res.status(400).json({ 
            error: 'Device is in AUTO mode. Please disable auto mode first.',
            autoMode: true
        });
    }
    
    // Toggle state
    device.state = !device.state;
    deviceStates.lastUpdated = new Date();
    
    // Broadcast update to all connected clients
    const io = req.app.get('io');
    if (io) {
        broadcastDeviceUpdate(io, device);
    }
    
    // In production, send command to ESP32 here
    console.log(`Device ${device.name} toggled to ${device.state ? 'ON' : 'OFF'}`);
    
    res.json({
        success: true,
        device: device,
        message: `Device ${device.state ? 'turned on' : 'turned off'} successfully`
    });
});

// Set device state
router.post('/:id/state', [
    param('id').isInt({ min: 0, max: 5 }),
    body('state').isBoolean()
], (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }
    
    const deviceId = parseInt(req.params.id);
    const { state } = req.body;
    const device = deviceStates.devices.find(d => d.id === deviceId);
    
    if (!device) {
        return res.status(404).json({ error: 'Device not found' });
    }
    
    // If in auto mode, prevent manual control
    if (device.autoMode) {
        return res.status(400).json({ 
            error: 'Device is in AUTO mode. Please disable auto mode first.',
            autoMode: true
        });
    }
    
    device.state = state;
    deviceStates.lastUpdated = new Date();
    
    // Broadcast update
    const io = req.app.get('io');
    if (io) {
        broadcastDeviceUpdate(io, device);
    }
    
    res.json({
        success: true,
        device: device,
        message: `Device turned ${state ? 'ON' : 'OFF'} successfully`
    });
});

// Set device auto mode
router.post('/:id/auto', [
    param('id').isInt({ min: 0, max: 5 }),
    body('enabled').isBoolean(),
    body('conditions').optional().isObject()
], (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }
    
    const deviceId = parseInt(req.params.id);
    const { enabled, conditions } = req.body;
    const device = deviceStates.devices.find(d => d.id === deviceId);
    
    if (!device) {
        return res.status(404).json({ error: 'Device not found' });
    }
    
    device.autoMode = enabled;
    if (conditions) {
        device.autoConditions = conditions;
    }
    deviceStates.lastUpdated = new Date();
    
    // Broadcast update
    const io = req.app.get('io');
    if (io) {
        io.emit('device_auto_update', { deviceId: device.id, autoMode: enabled });
    }
    
    res.json({
        success: true,
        device: device,
        message: `Auto mode ${enabled ? 'enabled' : 'disabled'} for ${device.name}`
    });
});

// Master control - all devices
router.post('/master/:command', [
    param('command').isIn(['on', 'off'])
], (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }
    
    const command = req.params.command;
    const newState = command === 'on';
    
    // Only control devices not in auto mode
    const affectedDevices = [];
    deviceStates.devices.forEach(device => {
        if (!device.autoMode) {
            device.state = newState;
            affectedDevices.push(device);
        }
    });
    
    deviceStates.lastUpdated = new Date();
    
    // Broadcast updates
    const io = req.app.get('io');
    if (io) {
        io.emit('master_update', { state: newState, affectedDevices });
        affectedDevices.forEach(device => {
            io.emit('device_update', device);
        });
    }
    
    res.json({
        success: true,
        state: newState,
        affectedDevices: affectedDevices.length,
        message: `All devices turned ${newState ? 'ON' : 'OFF'} (auto mode devices unaffected)`
    });
});

// Get device statistics
router.get('/stats/summary', (req, res) => {
    const devices = deviceStates.devices;
    const activeCount = devices.filter(d => d.state).length;
    const autoCount = devices.filter(d => d.autoMode).length;
    const totalPower = devices.reduce((sum, d) => sum + (d.state ? d.power : 0), 0);
    
    res.json({
        success: true,
        stats: {
            total: devices.length,
            active: activeCount,
            autoMode: autoCount,
            manualMode: devices.length - autoCount,
            totalPower: totalPower,
            lastUpdated: deviceStates.lastUpdated
        }
    });
});

// ESP32 registration endpoint
router.post('/esp/register', (req, res) => {
    const { ip, name, mac, gpio_pins } = req.body;
    
    if (!ip) {
        return res.status(400).json({ error: 'IP address required' });
    }
    
    // Store ESP32 info in global state
    if (!global.espDevices) {
        global.espDevices = new Map();
    }
    
    global.espDevices.set(ip, {
        ip,
        name: name || `ESP32-${ip}`,
        mac,
        gpio_pins,
        lastSeen: new Date()
    });
    
    console.log(`ESP32 registered: ${ip} - ${name}`);
    
    // Broadcast to all clients
    const io = req.app.get('io');
    if (io) {
        io.emit('esp_registered', { ip, name });
    }
    
    res.json({
        success: true,
        message: 'ESP32 registered successfully',
        espCount: global.espDevices.size
    });
});

// ESP32 heartbeat endpoint
router.post('/esp/heartbeat', (req, res) => {
    const { ip, sensors, devices } = req.body;
    
    if (!ip || !global.espDevices?.has(ip)) {
        return res.status(404).json({ error: 'ESP32 not registered' });
    }
    
    const esp = global.espDevices.get(ip);
    esp.lastSeen = new Date();
    
    // Update sensor data
    if (sensors) {
        if (!global.systemStats) global.systemStats = {};
        if (sensors.temperature) global.systemStats.temperature = sensors.temperature;
        if (sensors.humidity) global.systemStats.humidity = sensors.humidity;
        if (sensors.energy) global.systemStats.energyUsage = sensors.energy;
        
        // Broadcast sensor update
        const io = req.app.get('io');
        if (io) {
            io.emit('sensor_update', sensors);
        }
    }
    
    // Update device states from ESP32
    if (devices) {
        for (const [deviceId, state] of Object.entries(devices)) {
            const device = deviceStates.devices.find(d => d.id === parseInt(deviceId));
            if (device && device.state !== state && !device.autoMode) {
                device.state = state;
                
                const io = req.app.get('io');
                if (io) {
                    io.emit('device_update', device);
                }
            }
        }
    }
    
    res.json({ success: true });
});

// Get ESP32 devices
router.get('/esp/devices', (req, res) => {
    if (!global.espDevices) {
        return res.json({ devices: [] });
    }
    
    const devices = Array.from(global.espDevices.values()).map(esp => ({
        ip: esp.ip,
        name: esp.name,
        mac: esp.mac,
        lastSeen: esp.lastSeen,
        status: (Date.now() - esp.lastSeen) < 30000 ? 'online' : 'offline'
    }));
    
    res.json({ devices });
});

module.exports = router;