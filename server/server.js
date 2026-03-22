/**
 * Estif Home 1000X - Simplified Server
 * No TensorFlow required
 */

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const path = require('path');
const http = require('http');
const socketIo = require('socket.io');
const dotenv = require('dotenv');

dotenv.config();

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
    cors: { origin: "*", methods: ["GET", "POST"] }
});

// Middleware
app.use(helmet({ contentSecurityPolicy: false }));
app.use(compression());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, '../')));

// Global State
global.deviceStates = {
    devices: [
        { id: 0, name: "Light", gpio: 23, state: false, autoMode: false, power: 10 },
        { id: 1, name: "Fan", gpio: 22, state: false, autoMode: true, power: 40 },
        { id: 2, name: "AC", gpio: 21, state: false, autoMode: true, power: 120 },
        { id: 3, name: "TV", gpio: 19, state: false, autoMode: false, power: 80 },
        { id: 4, name: "Heater", gpio: 18, state: false, autoMode: true, power: 1500 },
        { id: 5, name: "Pump", gpio: 5, state: false, autoMode: false, power: 250 }
    ],
    systemStats: { temperature: 23, humidity: 45, energyUsage: 0 }
};

global.espDevices = new Map();
global.activityLog = [];

// Helper
function addLog(source, message, type = 'info') {
    const log = { id: Date.now(), timestamp: new Date(), source, message, type };
    global.activityLog.unshift(log);
    if (global.activityLog.length > 100) global.activityLog.pop();
    io.emit('activity_update', log);
    console.log(`[${source}] ${message}`);
}

// API Routes
app.get('/api/health', (req, res) => {
    res.json({ status: 'healthy', timestamp: new Date(), uptime: process.uptime() });
});

app.get('/api/status', (req, res) => {
    const active = global.deviceStates.devices.filter(d => d.state).length;
    res.json({
        status: 'online',
        devices: { total: 6, active, autoMode: global.deviceStates.devices.filter(d => d.autoMode).length },
        espConnected: global.espDevices.size > 0,
        system: global.deviceStates.systemStats
    });
});

app.get('/api/devices', (req, res) => {
    res.json({ success: true, devices: global.deviceStates.devices });
});

app.post('/api/device/:id/toggle', (req, res) => {
    const id = parseInt(req.params.id);
    const device = global.deviceStates.devices.find(d => d.id === id);
    if (!device) return res.status(404).json({ error: 'Device not found' });
    if (device.autoMode) return res.status(400).json({ error: 'Device in AUTO mode' });
    
    device.state = !device.state;
    io.emit('device_update', device);
    addLog('Device', `${device.name} turned ${device.state ? 'ON' : 'OFF'}`, device.state ? 'success' : 'info');
    res.json({ success: true, device });
});

app.post('/api/device/:id/auto', (req, res) => {
    const id = parseInt(req.params.id);
    const { enabled } = req.body;
    const device = global.deviceStates.devices.find(d => d.id === id);
    if (!device) return res.status(404).json({ error: 'Device not found' });
    device.autoMode = enabled;
    io.emit('device_update', device);
    addLog('System', `${device.name} auto mode ${enabled ? 'enabled' : 'disabled'}`, 'info');
    res.json({ success: true, device });
});

app.post('/api/master/:command', (req, res) => {
    const state = req.params.command === 'on';
    global.deviceStates.devices.forEach(d => { if (!d.autoMode) d.state = state; });
    io.emit('master_update', { state });
    addLog('System', `All devices turned ${state ? 'ON' : 'OFF'}`, 'success');
    res.json({ success: true, state });
});

app.post('/api/esp/register', (req, res) => {
    const { ip, name, mac } = req.body;
    if (!ip) return res.status(400).json({ error: 'IP required' });
    global.espDevices.set(ip, { ip, name: name || `ESP32-${ip}`, mac, lastSeen: new Date() });
    io.emit('esp_status', { connected: true, ip, count: global.espDevices.size });
    addLog('ESP32', `ESP32 registered at ${ip}`, 'success');
    res.json({ success: true });
});

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

app.get('/api/logs', (req, res) => {
    const limit = parseInt(req.query.limit) || 50;
    res.json({ success: true, logs: global.activityLog.slice(0, limit) });
});

// WebSocket
io.on('connection', (socket) => {
    console.log('Client connected:', socket.id);
    socket.emit('initial_data', { devices: global.deviceStates.devices, stats: global.deviceStates.systemStats, espConnected: global.espDevices.size > 0 });
    
    socket.on('register_esp', (data) => {
        const { ip, name, mac } = data;
        global.espDevices.set(ip, { ip, name: name || `ESP32-${ip}`, mac, socketId: socket.id, lastSeen: new Date() });
        io.emit('esp_status', { connected: true, ip, count: global.espDevices.size });
        addLog('ESP32', `ESP32 connected: ${ip}`, 'success');
    });
    
    socket.on('device_control', (data) => {
        const device = global.deviceStates.devices.find(d => d.id === data.deviceId);
        if (device && !device.autoMode) {
            device.state = data.state;
            io.emit('device_update', device);
            addLog('Device', `${device.name} turned ${data.state ? 'ON' : 'OFF'}`, data.state ? 'success' : 'info');
        }
    });
    
    socket.on('disconnect', () => {
        for (const [ip, esp] of global.espDevices) {
            if (esp.socketId === socket.id) {
                global.espDevices.delete(ip);
                io.emit('esp_status', { connected: false, ip, count: global.espDevices.size });
                addLog('ESP32', `ESP32 at ${ip} disconnected`, 'warning');
                break;
            }
        }
    });
});

// Cleanup stale connections
setInterval(() => {
    const now = Date.now();
    for (const [ip, esp] of global.espDevices) {
        if (now - esp.lastSeen > 30000) {
            global.espDevices.delete(ip);
            io.emit('esp_status', { connected: false, ip, count: global.espDevices.size });
        }
    }
}, 10000);

// Frontend
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../index.html'));
});

// Start server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log('\n' + '='.repeat(60));
    console.log('🏠 ESTIF HOME 1000X - Smart Home System');
    console.log('='.repeat(60));
    console.log(`📡 Server running at: http://localhost:${PORT}`);
    console.log(`🔌 WebSocket ready for real-time communication`);
    console.log(`📱 Mobile responsive interface available`);
    console.log(`🎤 Voice control ready (English & Amharic)`);
    console.log('\n✨ System ready! Open your browser to get started.\n');
    console.log('='.repeat(60) + '\n');
});