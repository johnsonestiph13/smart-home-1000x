/**
 * Estif Home 1000X - Complete Server with Gemini AI, ESP32 Claiming
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

dotenv.config();

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
    cors: { origin: "*", methods: ["GET", "POST", "PUT", "DELETE"] }
});

// Middleware
app.use(helmet({ contentSecurityPolicy: false }));
app.use(compression());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, '../')));

// Simple authentication middleware (replace with JWT in production)
const authenticate = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: 'No token' });
    const token = authHeader.split(' ')[1];
    // For demo, accept any token and assume user id 1
    req.user = { id: 1 };
    next();
};

// Global state
global.deviceStates = {
    devices: [
        { id:0, name:"Light", gpio:23, state:false, autoMode:false, power:10, ownerId:1 },
        { id:1, name:"Fan", gpio:22, state:false, autoMode:true, power:40, ownerId:1 },
        { id:2, name:"AC", gpio:21, state:false, autoMode:true, power:120, ownerId:1 },
        { id:3, name:"TV", gpio:19, state:false, autoMode:false, power:80, ownerId:1 },
        { id:4, name:"Heater", gpio:18, state:false, autoMode:true, power:1500, ownerId:1 },
        { id:5, name:"Pump", gpio:5, state:false, autoMode:false, power:250, ownerId:1 }
    ],
    systemStats: { temperature:23, humidity:45, energyUsage:0 }
};
global.espDevices = new Map();   // key: MAC address
global.activityLog = [];

function addActivityLog(source, message, type='info') {
    const log = { id: Date.now(), timestamp: new Date(), source, message, type };
    global.activityLog.unshift(log);
    if (global.activityLog.length > 100) global.activityLog.pop();
    io.emit('activity_update', log);
    console.log(`[${source}] ${message}`);
}

// Gemini setup
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
function getSystemContext() {
    const activeDevices = global.deviceStates.devices.filter(d => d.state).length;
    const totalPower = global.deviceStates.devices.reduce((s,d) => s + (d.state ? d.power : 0), 0);
    return {
        temperature: global.deviceStates.systemStats.temperature,
        humidity: global.deviceStates.systemStats.humidity,
        activeDevices, totalPower,
        devices: global.deviceStates.devices.map(d => ({ id:d.id, name:d.name, state:d.state, autoMode:d.autoMode }))
    };
}

// API routes
app.get('/api/health', (req, res) => res.json({ status:'healthy', timestamp:new Date() }));
app.get('/api/status', (req, res) => {
    const active = global.deviceStates.devices.filter(d => d.state).length;
    res.json({
        status:'online', devices:{ total:6, active, autoMode:global.deviceStates.devices.filter(d=>d.autoMode).length },
        espConnected: global.espDevices.size > 0,
        system: global.deviceStates.systemStats
    });
});
app.get('/api/devices', authenticate, (req, res) => {
    res.json({ success:true, devices: global.deviceStates.devices });
});
app.post('/api/device/:id/toggle', authenticate, (req, res) => {
    const id = parseInt(req.params.id);
    const device = global.deviceStates.devices.find(d => d.id === id);
    if (!device) return res.status(404).json({ error:'Device not found' });
    if (device.ownerId !== req.user.id) return res.status(403).json({ error:'Unauthorized' });
    if (device.autoMode) return res.status(400).json({ error:'Device in AUTO mode' });
    device.state = !device.state;
    io.emit('device_update', device);
    addActivityLog('Device', `${device.name} turned ${device.state ? 'ON' : 'OFF'}`, device.state ? 'success' : 'info');
    res.json({ success:true, device });
});
app.post('/api/device/:id/state', authenticate, (req, res) => {
    const id = parseInt(req.params.id);
    const { state } = req.body;
    const device = global.deviceStates.devices.find(d => d.id === id);
    if (!device) return res.status(404).json({ error:'Device not found' });
    if (device.ownerId !== req.user.id) return res.status(403).json({ error:'Unauthorized' });
    if (device.autoMode) return res.status(400).json({ error:'Device in AUTO mode' });
    device.state = state;
    io.emit('device_update', device);
    addActivityLog('Device', `${device.name} turned ${state ? 'ON' : 'OFF'}`, state ? 'success' : 'info');
    res.json({ success:true, device });
});
app.post('/api/device/:id/auto', authenticate, (req, res) => {
    const id = parseInt(req.params.id);
    const { enabled } = req.body;
    const device = global.deviceStates.devices.find(d => d.id === id);
    if (!device) return res.status(404).json({ error:'Device not found' });
    if (device.ownerId !== req.user.id) return res.status(403).json({ error:'Unauthorized' });
    device.autoMode = enabled;
    io.emit('device_update', device);
    addActivityLog('System', `${device.name} auto mode ${enabled ? 'enabled' : 'disabled'}`, 'info');
    res.json({ success:true, device });
});
app.post('/api/master/:command', authenticate, (req, res) => {
    const state = req.params.command === 'on';
    global.deviceStates.devices.forEach(d => {
        if (d.ownerId === req.user.id && !d.autoMode) d.state = state;
    });
    io.emit('master_update', { state });
    addActivityLog('System', `All devices turned ${state ? 'ON' : 'OFF'}`, 'success');
    res.json({ success:true, state });
});

// ESP32 registration (HTTP fallback)
app.post('/api/esp/register', (req, res) => {
    const { ip, name, mac } = req.body;
    if (!ip || !mac) return res.status(400).json({ error:'IP and MAC required' });
    global.espDevices.set(mac, { ip, name: name || `ESP32-${mac.slice(-4)}`, mac, lastSeen: new Date(), ownerId: null });
    io.emit('esp_status', { connected: true, ip, mac });
    addActivityLog('ESP32', `ESP32 registered via HTTP: ${mac}`, 'success');
    res.json({ success: true });
});
app.post('/api/esp/heartbeat', (req, res) => {
    const { mac, sensors, devices } = req.body;
    if (!mac) return res.status(400).json({ error:'MAC required' });
    const esp = global.espDevices.get(mac);
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
                if (device && device.state !== state && !device.autoMode && device.ownerId === esp.ownerId) {
                    device.state = state;
                    io.emit('device_update', device);
                }
            }
        }
    }
    res.json({ success: true });
});

// Activity logs
app.get('/api/logs', (req, res) => {
    const limit = parseInt(req.query.limit) || 50;
    res.json({ success: true, logs: global.activityLog.slice(0, limit) });
});

// ESP32 claiming endpoints
app.get('/api/esp/unclaimed', authenticate, (req, res) => {
    const unclaimed = Array.from(global.espDevices.values())
        .filter(esp => !esp.ownerId)
        .map(esp => ({ mac: esp.mac, name: esp.name, ip: esp.ip }));
    res.json({ success: true, devices: unclaimed });
});
app.post('/api/esp/claim', authenticate, (req, res) => {
    const { mac } = req.body;
    if (!mac) return res.status(400).json({ error:'MAC required' });
    const esp = global.espDevices.get(mac);
    if (!esp) return res.status(404).json({ error:'ESP32 not found' });
    if (esp.ownerId) return res.status(400).json({ error:'Already claimed' });
    esp.ownerId = req.user.id;
    global.espDevices.set(mac, esp);
    addActivityLog('User', `ESP32 ${mac} claimed by user ${req.user.id}`, 'info');
    res.json({ success: true });
});

// Gemini voice command
app.post('/api/voice-command', async (req, res) => {
    try {
        const { text, language } = req.body;
        if (!text) return res.status(400).json({ error:'No text' });
        const context = getSystemContext();
        const prompt = `
You are a home automation assistant. User says: "${text}".
Return JSON action: {"action":"on","deviceId":0} or {"action":"master_on"} or {"action":"query","answer":"..."}.
Devices: 0=light,1=fan,2=ac,3=tv,4=heater,5=pump.
Current: temp ${context.temperature}°C, humidity ${context.humidity}%, active ${context.activeDevices}, states ${context.devices.map(d=>`${d.name}:${d.state?'ON':'OFF'}`).join(',')}
Only return JSON.`;
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        const result = await model.generateContent(prompt);
        const textResp = result.response.text();
        const match = textResp.match(/\{[\s\S]*\}/);
        if (!match) return res.json({ action:"unknown", message:"Sorry, I didn't understand." });
        const action = JSON.parse(match[0]);
        console.log("Gemini interpreted:", action);
        res.json(action);
    } catch (err) {
        console.error("Gemini error:", err);
        res.status(500).json({ error:"AI service failed" });
    }
});

// WebSocket
io.on('connection', (socket) => {
    console.log('Client connected:', socket.id);
    socket.on('register_esp', (data) => {
        const { ip, name, mac } = data;
        if (!mac) return;
        global.espDevices.set(mac, { ip, name: name || `ESP32-${mac.slice(-4)}`, mac, socketId: socket.id, lastSeen: new Date(), ownerId: null });
        io.emit('esp_status', { connected: true, ip, mac });
        addActivityLog('ESP32', `ESP32 connected via WebSocket: ${mac}`, 'success');
    });
    socket.on('device_control', (data) => {
        const { deviceId, state } = data;
        const device = global.deviceStates.devices.find(d => d.id === deviceId);
        if (!device) return;
        if (device.autoMode) return;
        device.state = state;
        io.emit('device_update', device);
        addActivityLog('Device', `${device.name} turned ${state ? 'ON' : 'OFF'}`, state ? 'success' : 'info');
        // Forward to claimed ESP32 if needed
        for (let [mac, esp] of global.espDevices) {
            if (esp.ownerId === device.ownerId && esp.socketId) {
                io.to(esp.socketId).emit('command', { type: 'device', deviceId, state });
            }
        }
    });
    socket.on('master_control', (data) => {
        const { state } = data;
        global.deviceStates.devices.forEach(device => {
            if (!device.autoMode) device.state = state;
        });
        io.emit('master_update', { state });
        addActivityLog('System', `All devices turned ${state ? 'ON' : 'OFF'}`, 'success');
        for (let [mac, esp] of global.espDevices) {
            if (esp.ownerId && esp.socketId) io.to(esp.socketId).emit('command', { type: 'master', state });
        }
    });
    socket.on('esp_status_update', (data) => {
        const { mac, sensors, devices } = data;
        const esp = global.espDevices.get(mac);
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
                    if (device && device.state !== state && !device.autoMode && device.ownerId === esp.ownerId) {
                        device.state = state;
                        io.emit('device_update', device);
                    }
                }
            }
        }
    });
    socket.on('disconnect', () => {
        for (let [mac, esp] of global.espDevices) {
            if (esp.socketId === socket.id) {
                global.espDevices.delete(mac);
                io.emit('esp_status', { connected: false, mac });
                addActivityLog('ESP32', `ESP32 ${mac} disconnected`, 'warning');
                break;
            }
        }
    });
});

// Clean stale ESP32s
setInterval(() => {
    const now = Date.now();
    for (let [mac, esp] of global.espDevices) {
        if (now - esp.lastSeen > 30000) {
            global.espDevices.delete(mac);
            io.emit('esp_status', { connected: false, mac });
        }
    }
}, 10000);

// Serve frontend
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../index.html'));
});

app.use((err, req, res, next) => {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log('\n' + '='.repeat(60));
    console.log('🏠 ESTIF HOME 1000X - Smart Home System');
    console.log('='.repeat(60));
    console.log(`📡 Server running at: http://localhost:${PORT}`);
    console.log(`🔌 WebSocket ready`);
    console.log(`🎤 Gemini AI voice commands enabled`);
    console.log(`🔐 ESP32 claiming endpoints available`);
    console.log('✨ System ready!\n');
});