/**
 * Estif Home 1000X - Complete Server with Gemini AI
 * 
 * Features:
 * - Express server with WebSocket (Socket.IO)
 * - Device state management (6 devices, GPIO mapping)
 * - REST API for devices, master control, ESP32 registration
 * - Gemini AI integration for natural language voice commands
 * - Real-time updates via WebSocket
 */

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const path = require('path');
const http = require('http');
const socketIo = require('socket.io');
const dotenv = require('dotenv');
const { GoogleGenerativeAI } = require('@google/generative-ai');

// Load environment variables
dotenv.config();

// Initialize Express
const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST", "PUT", "DELETE"]
    }
});

// ==================== MIDDLEWARE ====================
app.use(helmet({
    contentSecurityPolicy: false
}));
app.use(compression());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, '../')));

// ==================== GLOBAL STATE ====================
// Device states (GPIO: 23,22,21,19,18,5)
global.deviceStates = {
    devices: [
        { id: 0, name: "Light", gpio: 23, state: false, autoMode: false, power: 10 },
        { id: 1, name: "Fan", gpio: 22, state: false, autoMode: true, power: 40 },
        { id: 2, name: "AC", gpio: 21, state: false, autoMode: true, power: 120 },
        { id: 3, name: "TV", gpio: 19, state: false, autoMode: false, power: 80 },
        { id: 4, name: "Heater", gpio: 18, state: false, autoMode: true, power: 1500 },
        { id: 5, name: "Pump", gpio: 5, state: false, autoMode: false, power: 250 }
    ],
    systemStats: {
        temperature: 23,
        humidity: 45,
        energyUsage: 0
    }
};

// Connected ESP32 devices
global.espDevices = new Map();

// Activity log
global.activityLog = [];

// ==================== HELPER FUNCTIONS ====================
function addActivityLog(source, message, type = 'info') {
    const log = {
        id: Date.now(),
        timestamp: new Date(),
        source,
        message,
        type
    };
    global.activityLog.unshift(log);
    if (global.activityLog.length > 100) global.activityLog.pop();
    io.emit('activity_update', log);
    console.log(`[${source}] ${message}`);
}

// ==================== GEMINI AI SETUP ====================
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Helper to get current system state for context
function getSystemContext() {
    const activeDevices = global.deviceStates.devices.filter(d => d.state).length;
    const totalPower = global.deviceStates.devices.reduce((sum, d) => sum + (d.state ? d.power : 0), 0);
    return {
        temperature: global.deviceStates.systemStats.temperature,
        humidity: global.deviceStates.systemStats.humidity,
        activeDevices,
        totalPower,
        devices: global.deviceStates.devices.map(d => ({ id: d.id, name: d.name, state: d.state, autoMode: d.autoMode }))
    };
}

// ==================== API ROUTES ====================

// Health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'healthy', timestamp: new Date(), uptime: process.uptime() });
});

// System status
app.get('/api/status', (req, res) => {
    const activeDevices = global.deviceStates.devices.filter(d => d.state).length;
    res.json({
        status: 'online',
        devices: {
            total: global.deviceStates.devices.length,
            active: activeDevices,
            autoMode: global.deviceStates.devices.filter(d => d.autoMode).length
        },
        espConnected: global.espDevices.size > 0,
        system: global.deviceStates.systemStats
    });
});

// Get all devices
app.get('/api/devices', (req, res) => {
    res.json({ success: true, devices: global.deviceStates.devices });
});

// Toggle device
app.post('/api/device/:id/toggle', (req, res) => {
    const id = parseInt(req.params.id);
    const device = global.deviceStates.devices.find(d => d.id === id);
    if (!device) return res.status(404).json({ error: 'Device not found' });
    if (device.autoMode) return res.status(400).json({ error: 'Device in AUTO mode' });

    device.state = !device.state;
    io.emit('device_update', device);
    addActivityLog('Device', `${device.name} turned ${device.state ? 'ON' : 'OFF'}`, device.state ? 'success' : 'info');
    res.json({ success: true, device });
});

// Set device state
app.post('/api/device/:id/state', (req, res) => {
    const id = parseInt(req.params.id);
    const { state } = req.body;
    const device = global.deviceStates.devices.find(d => d.id === id);
    if (!device) return res.status(404).json({ error: 'Device not found' });
    if (device.autoMode) return res.status(400).json({ error: 'Device in AUTO mode' });

    device.state = state;
    io.emit('device_update', device);
    addActivityLog('Device', `${device.name} turned ${state ? 'ON' : 'OFF'}`, state ? 'success' : 'info');
    res.json({ success: true, device });
});

// Set auto mode
app.post('/api/device/:id/auto', (req, res) => {
    const id = parseInt(req.params.id);
    const { enabled } = req.body;
    const device = global.deviceStates.devices.find(d => d.id === id);
    if (!device) return res.status(404).json({ error: 'Device not found' });

    device.autoMode = enabled;
    io.emit('device_update', device);
    addActivityLog('System', `${device.name} auto mode ${enabled ? 'enabled' : 'disabled'}`, 'info');
    res.json({ success: true, device });
});

// Master control
app.post('/api/master/:command', (req, res) => {
    const state = req.params.command === 'on';
    global.deviceStates.devices.forEach(d => {
        if (!d.autoMode) d.state = state;
    });
    io.emit('master_update', { state });
    addActivityLog('System', `All devices turned ${state ? 'ON' : 'OFF'}`, 'success');
    res.json({ success: true, state });
});

// ESP32 registration
app.post('/api/esp/register', (req, res) => {
    const { ip, name, mac } = req.body;
    if (!ip) return res.status(400).json({ error: 'IP required' });
    global.espDevices.set(ip, { ip, name: name || `ESP32-${ip}`, mac, lastSeen: new Date() });
    io.emit('esp_status', { connected: true, ip, count: global.espDevices.size });
    addActivityLog('ESP32', `ESP32 registered at ${ip}`, 'success');
    res.json({ success: true });
});

// ESP32 heartbeat
app.post('/api/esp/heartbeat', (req, res) => {
    const { ip, sensors, devices } = req.body;
    const esp = global.espDevices.get(ip);
    if (esp) {
        esp.lastSeen = new Date();
        if (sensors) {
            if (sensors.temperature) global.deviceStates.systemStats.temperature = sensors.temperature;
            if (sensors.humidity) global.deviceStates.systemStats.humidity = sensors.humidity;
            io.emit('sensor_update', sensors);
        }
        if (devices) {
            for (const [id, state] of Object.entries(devices)) {
                const device = global.deviceStates.devices.find(d => d.id === parseInt(id));
                if (device && device.state !== state && !device.autoMode) {
                    device.state = state;
                    io.emit('device_update', device);
                }
            }
        }
    }
    res.json({ success: true });
});

// Get activity logs
app.get('/api/logs', (req, res) => {
    const limit = parseInt(req.query.limit) || 50;
    res.json({ success: true, logs: global.activityLog.slice(0, limit) });
});

// ==================== GEMINI VOICE COMMAND ENDPOINT ====================
app.post('/api/voice-command', async (req, res) => {
    try {
        const { text, language } = req.body;
        if (!text) {
            return res.status(400).json({ error: 'No text provided' });
        }

        // Get current system context
        const context = getSystemContext();

        // Build prompt for Gemini
        const prompt = `
You are a home automation assistant. The user says: "${text}".

Your job is to interpret the command and return a JSON object with the action to perform.

Possible actions:
- "on" : turn a device on
- "off" : turn a device off
- "toggle" : toggle a device (if state not specified)
- "master_on" : turn all devices on
- "master_off" : turn all devices off
- "query" : answer a question (like temperature, time, etc.)

Devices are identified by ID:
0: light, 1: fan, 2: ac, 3: tv, 4: heater, 5: pump

Current system state:
- Temperature: ${context.temperature}°C
- Humidity: ${context.humidity}%
- Active devices: ${context.activeDevices}
- Device states: ${context.devices.map(d => `${d.name}: ${d.state ? 'ON' : 'OFF'}`).join(', ')}

Only return valid JSON. Do not include any extra text.
Examples:
{"action":"on","deviceId":0}
{"action":"master_on"}
{"action":"query","answer":"The temperature is ${context.temperature}°C."}
`;

        // Call Gemini
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        const result = await model.generateContent(prompt);
        const responseText = result.response.text();

        // Extract JSON from response (Gemini may wrap with markdown)
        let jsonMatch = responseText.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
            return res.json({ action: "unknown", message: "Sorry, I didn't understand." });
        }

        let action = JSON.parse(jsonMatch[0]);

        // Validate action
        if (!action.action) {
            return res.json({ action: "unknown", message: "Could not determine action." });
        }

        // Log the interpreted action
        console.log("Gemini interpreted:", action);

        res.json(action);
    } catch (error) {
        console.error("Gemini API error:", error);
        res.status(500).json({ error: "AI service failed" });
    }
});

// ==================== WEBSOCKET ====================
io.on('connection', (socket) => {
    console.log('Client connected:', socket.id);
    socket.emit('initial_data', {
        devices: global.deviceStates.devices,
        stats: global.deviceStates.systemStats,
        espConnected: global.espDevices.size > 0
    });

    socket.on('register_esp', (data) => {
        const { ip, name, mac } = data;
        global.espDevices.set(ip, { ip, name: name || `ESP32-${ip}`, mac, socketId: socket.id, lastSeen: new Date() });
        io.emit('esp_status', { connected: true, ip, count: global.espDevices.size });
        addActivityLog('ESP32', `ESP32 connected: ${ip}`, 'success');
    });

    socket.on('device_control', (data) => {
        const device = global.deviceStates.devices.find(d => d.id === data.deviceId);
        if (device && !device.autoMode) {
            device.state = data.state;
            io.emit('device_update', device);
            addActivityLog('Device', `${device.name} turned ${data.state ? 'ON' : 'OFF'}`, data.state ? 'success' : 'info');
        }
    });

    socket.on('master_control', (data) => {
        const { state } = data;
        global.deviceStates.devices.forEach(d => {
            if (!d.autoMode) d.state = state;
        });
        io.emit('master_update', { state });
        addActivityLog('System', `All devices turned ${state ? 'ON' : 'OFF'}`, 'success');
    });

    socket.on('esp_status_update', (data) => {
        const { ip, sensors, devices } = data;
        const esp = global.espDevices.get(ip);
        if (esp) {
            esp.lastSeen = new Date();
            if (sensors) {
                if (sensors.temperature) global.deviceStates.systemStats.temperature = sensors.temperature;
                if (sensors.humidity) global.deviceStates.systemStats.humidity = sensors.humidity;
                io.emit('sensor_update', sensors);
            }
            if (devices) {
                for (const [id, state] of Object.entries(devices)) {
                    const device = global.deviceStates.devices.find(d => d.id === parseInt(id));
                    if (device && device.state !== state && !device.autoMode) {
                        device.state = state;
                        io.emit('device_update', device);
                    }
                }
            }
        }
    });

    socket.on('disconnect', () => {
        console.log('Client disconnected:', socket.id);
        for (const [ip, esp] of global.espDevices) {
            if (esp.socketId === socket.id) {
                global.espDevices.delete(ip);
                io.emit('esp_status', { connected: false, ip, count: global.espDevices.size });
                addActivityLog('ESP32', `ESP32 at ${ip} disconnected`, 'warning');
                break;
            }
        }
    });
});

// Clean up stale ESP32 connections
setInterval(() => {
    const now = Date.now();
    for (const [ip, esp] of global.espDevices) {
        if (now - esp.lastSeen > 30000) {
            global.espDevices.delete(ip);
            io.emit('esp_status', { connected: false, ip, count: global.espDevices.size });
        }
    }
}, 10000);

// ==================== FRONTEND ====================
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../index.html'));
});

// ==================== ERROR HANDLING ====================
app.use((err, req, res, next) => {
    console.error('Server error:', err);
    res.status(500).json({ error: 'Internal server error' });
});

// ==================== START SERVER ====================
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log('\n' + '='.repeat(60));
    console.log('🏠 ESTIF HOME 1000X - Smart Home System');
    console.log('='.repeat(60));
    console.log(`📡 Server running at: http://localhost:${PORT}`);
    console.log(`🔌 WebSocket ready for real-time communication`);
    console.log(`🎤 Gemini AI voice commands enabled`);
    console.log('\n✨ System ready! Open your browser to get started.\n');
});