/**
 * WebSocket Handler Module
 * Manages real-time WebSocket connections for live updates
 */

class WebSocketHandler {
    constructor() {
        this.socket = null;
        this.isConnected = false;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 10;
        this.reconnectDelay = 3000;
        this.eventHandlers = new Map();
        this.messageQueue = [];
        this.pingInterval = null;
        
        this.init();
    }
    
    init() {
        this.setupEventHandlers();
        this.connect();
        
        // Handle page visibility
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                this.pauseHeartbeat();
            } else {
                this.resumeHeartbeat();
                if (!this.isConnected) {
                    this.connect();
                }
            }
        });
        
        // Handle before unload
        window.addEventListener('beforeunload', () => {
            this.disconnect();
        });
    }
    
    connect() {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsUrl = `${protocol}//${window.location.host}`;
        
        try {
            this.socket = new WebSocket(wsUrl);
            
            this.socket.onopen = () => {
                this.onOpen();
            };
            
            this.socket.onmessage = (event) => {
                this.onMessage(event);
            };
            
            this.socket.onerror = (error) => {
                this.onError(error);
            };
            
            this.socket.onclose = () => {
                this.onClose();
            };
        } catch (error) {
            console.error('WebSocket connection error:', error);
            this.scheduleReconnect();
        }
    }
    
    onOpen() {
        console.log('WebSocket connected');
        this.isConnected = true;
        this.reconnectAttempts = 0;
        
        // Process queued messages
        this.processQueue();
        
        // Start heartbeat
        this.startHeartbeat();
        
        // Emit connection event
        this.emit('connected', { timestamp: Date.now() });
        
        if (window.showToast) {
            window.showToast('Real-time connection established', 'success');
        }
        
        // Send authentication if token exists
        const token = localStorage.getItem('auth_token');
        if (token) {
            this.send('authenticate', { token });
        }
    }
    
    onMessage(event) {
        try {
            const data = JSON.parse(event.data);
            const { type, payload } = data;
            
            // Handle heartbeat
            if (type === 'pong') {
                return;
            }
            
            // Emit to registered handlers
            this.emit(type, payload);
            
        } catch (error) {
            console.error('Failed to parse WebSocket message:', error);
        }
    }
    
    onError(error) {
        console.error('WebSocket error:', error);
        this.emit('error', { error: error.message });
    }
    
    onClose() {
        console.log('WebSocket disconnected');
        this.isConnected = false;
        this.stopHeartbeat();
        
        this.emit('disconnected', { timestamp: Date.now() });
        
        if (window.showToast) {
            window.showToast('Real-time connection lost. Reconnecting...', 'warning');
        }
        
        this.scheduleReconnect();
    }
    
    scheduleReconnect() {
        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
            console.error('Max reconnection attempts reached');
            this.emit('reconnect_failed', { attempts: this.reconnectAttempts });
            return;
        }
        
        this.reconnectAttempts++;
        const delay = this.reconnectDelay * Math.pow(1.5, this.reconnectAttempts - 1);
        
        console.log(`Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
        
        setTimeout(() => {
            this.connect();
        }, delay);
    }
    
    send(type, payload = {}) {
        const message = JSON.stringify({ type, payload });
        
        if (this.isConnected && this.socket.readyState === WebSocket.OPEN) {
            this.socket.send(message);
            return true;
        } else {
            // Queue message for later
            this.messageQueue.push({ type, payload, timestamp: Date.now() });
            
            // Limit queue size
            if (this.messageQueue.length > 100) {
                this.messageQueue.shift();
            }
            
            return false;
        }
    }
    
    processQueue() {
        while (this.messageQueue.length > 0) {
            const message = this.messageQueue.shift();
            this.send(message.type, message.payload);
        }
    }
    
    startHeartbeat() {
        this.pingInterval = setInterval(() => {
            if (this.isConnected) {
                this.send('ping', { timestamp: Date.now() });
            }
        }, 30000); // Send ping every 30 seconds
    }
    
    stopHeartbeat() {
        if (this.pingInterval) {
            clearInterval(this.pingInterval);
            this.pingInterval = null;
        }
    }
    
    pauseHeartbeat() {
        this.stopHeartbeat();
    }
    
    resumeHeartbeat() {
        if (this.isConnected) {
            this.startHeartbeat();
        }
    }
    
    on(event, handler) {
        if (!this.eventHandlers.has(event)) {
            this.eventHandlers.set(event, []);
        }
        this.eventHandlers.get(event).push(handler);
    }
    
    off(event, handler) {
        if (this.eventHandlers.has(event)) {
            const handlers = this.eventHandlers.get(event);
            const index = handlers.indexOf(handler);
            if (index !== -1) {
                handlers.splice(index, 1);
            }
        }
    }
    
    emit(event, data) {
        if (this.eventHandlers.has(event)) {
            this.eventHandlers.get(event).forEach(handler => {
                try {
                    handler(data);
                } catch (error) {
                    console.error(`Error in WebSocket handler for ${event}:`, error);
                }
            });
        }
    }
    
    disconnect() {
        this.stopHeartbeat();
        if (this.socket) {
            this.socket.close();
        }
        this.isConnected = false;
    }
    
    // ========== Device Event Handlers ==========
    
    onDeviceUpdate(callback) {
        this.on('device_update', callback);
    }
    
    onDeviceStateChange(callback) {
        this.on('device_state', callback);
    }
    
    onESPStatus(callback) {
        this.on('esp_status', callback);
    }
    
    onSensorUpdate(callback) {
        this.on('sensor_update', callback);
    }
    
    onAlert(callback) {
        this.on('alert', callback);
    }
    
    onActivityUpdate(callback) {
        this.on('activity_update', callback);
    }
    
    // ========== Send Commands ==========
    
    controlDevice(deviceId, state) {
        return this.send('device_control', { deviceId, state });
    }
    
    masterControl(state) {
        return this.send('master_control', { state });
    }
    
    activateScene(sceneId) {
        return this.send('scene_activate', { sceneId });
    }
    
    sendCommand(command, params = {}) {
        return this.send('command', { command, params });
    }
    
    getStatus() {
        return this.send('get_status');
    }
}

// Initialize WebSocket Handler
window.wsHandler = new WebSocketHandler();

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = WebSocketHandler;
}