/**
 * Predictive Maintenance Module
 * Predicts device failures and suggests maintenance before issues occur
 */

class PredictiveMaintenance {
    constructor() {
        this.deviceHealth = {};
        this.maintenanceAlerts = [];
        this.failurePredictions = [];
        this.maintenanceHistory = [];
        
        // Health thresholds
        this.thresholds = {
            temperature: 75, // °C
            current: 12, // Amps
            runtime: 5000, // Hours
            cycles: 10000, // On/off cycles
            age: 365 // Days
        };
        
        // Device specific baselines
        this.deviceBaselines = {
            0: { name: 'Light', maxTemp: 50, maxCurrent: 0.5, lifespan: 20000 },
            1: { name: 'Fan', maxTemp: 60, maxCurrent: 0.8, lifespan: 15000 },
            2: { name: 'AC', maxTemp: 70, maxCurrent: 8, lifespan: 10000 },
            3: { name: 'TV', maxTemp: 55, maxCurrent: 1.5, lifespan: 20000 },
            4: { name: 'Heater', maxTemp: 80, maxCurrent: 10, lifespan: 5000 },
            5: { name: 'Pump', maxTemp: 65, maxCurrent: 2, lifespan: 8000 }
        };
        
        this.init();
    }
    
    init() {
        this.loadDeviceHealth();
        this.startMonitoring();
        this.loadHistory();
    }
    
    loadDeviceHealth() {
        try {
            const saved = localStorage.getItem('device_health');
            if (saved) {
                this.deviceHealth = JSON.parse(saved);
            } else {
                // Initialize health for all devices
                for (let i = 0; i < 6; i++) {
                    this.deviceHealth[i] = {
                        healthScore: 100,
                        runtime: 0,
                        cycles: 0,
                        lastMaintenance: Date.now(),
                        alerts: [],
                        metrics: {
                            temperature: [],
                            current: [],
                            vibrations: []
                        }
                    };
                }
            }
        } catch (e) {
            console.error('Failed to load device health:', e);
        }
    }
    
    startMonitoring() {
        // Monitor devices every 30 seconds
        setInterval(() => {
            this.monitorDevices();
        }, 30000);
        
        // Analyze and predict every 5 minutes
        setInterval(() => {
            this.analyzeHealth();
            this.predictFailures();
        }, 300000);
        
        // Generate weekly report
        setInterval(() => {
            this.generateWeeklyReport();
        }, 7 * 24 * 60 * 60 * 1000);
    }
    
    monitorDevices() {
        if (!window.AppState?.devices) return;
        
        const devices = window.AppState.devices;
        const now = Date.now();
        
        devices.forEach((device, index) => {
            const health = this.deviceHealth[index];
            if (!health) return;
            
            // Update runtime
            if (device.state) {
                const lastUpdate = health.lastStateChange || now;
                health.runtime += (now - lastUpdate) / (1000 * 60 * 60); // Hours
            }
            health.lastStateChange = now;
            
            // Update cycles
            if (device.state !== health.lastState) {
                health.cycles++;
                health.lastState = device.state;
            }
            
            // Simulate metrics based on device usage
            const metrics = this.simulateMetrics(device, index);
            health.metrics.temperature.push(metrics.temperature);
            health.metrics.current.push(metrics.current);
            health.metrics.vibrations.push(metrics.vibrations);
            
            // Keep last 100 metrics
            if (health.metrics.temperature.length > 100) health.metrics.temperature.shift();
            if (health.metrics.current.length > 100) health.metrics.current.shift();
            if (health.metrics.vibrations.length > 100) health.metrics.vibrations.shift();
            
            // Calculate health score
            health.healthScore = this.calculateHealthScore(health, device, index);
            
            this.deviceHealth[index] = health;
        });
        
        this.saveDeviceHealth();
    }
    
    simulateMetrics(device, index) {
        const baseline = this.deviceBaselines[index];
        const baseTemp = device.state ? 30 + (device.power / 10) : 25;
        const baseCurrent = device.state ? device.power / 12 : 0;
        
        return {
            temperature: baseTemp + (Math.random() * 10 - 5),
            current: baseCurrent + (Math.random() * 0.5 - 0.25),
            vibrations: device.state ? Math.random() * 0.5 : 0
        };
    }
    
    calculateHealthScore(health, device, index) {
        let score = 100;
        const baseline = this.deviceBaselines[index];
        
        // Temperature impact
        const avgTemp = health.metrics.temperature.reduce((a, b) => a + b, 0) / health.metrics.temperature.length || 25;
        if (avgTemp > baseline.maxTemp) {
            score -= (avgTemp - baseline.maxTemp) * 2;
        }
        
        // Runtime impact
        const runtimeRatio = health.runtime / baseline.lifespan;
        score -= runtimeRatio * 20;
        
        // Cycle count impact
        const cycleRatio = health.cycles / this.thresholds.cycles;
        score -= cycleRatio * 15;
        
        // Age impact
        const ageDays = (Date.now() - health.lastMaintenance) / (1000 * 60 * 60 * 24);
        const ageRatio = ageDays / this.thresholds.age;
        score -= ageRatio * 10;
        
        // Current spikes impact
        const avgCurrent = health.metrics.current.reduce((a, b) => a + b, 0) / health.metrics.current.length || 0;
        if (avgCurrent > baseline.maxCurrent) {
            score -= (avgCurrent - baseline.maxCurrent) * 5;
        }
        
        return Math.max(0, Math.min(100, score));
    }
    
    analyzeHealth() {
        const alerts = [];
        
        for (const [deviceId, health] of Object.entries(this.deviceHealth)) {
            const baseline = this.deviceBaselines[deviceId];
            
            if (health.healthScore < 30) {
                alerts.push({
                    deviceId: parseInt(deviceId),
                    deviceName: baseline.name,
                    severity: 'critical',
                    message: `Device health critical (${Math.round(health.healthScore)}%). Immediate maintenance required!`,
                    actions: ['Replace device', 'Check wiring', 'Inspect for damage']
                });
            } else if (health.healthScore < 50) {
                alerts.push({
                    deviceId: parseInt(deviceId),
                    deviceName: baseline.name,
                    severity: 'warning',
                    message: `Device health degraded (${Math.round(health.healthScore)}%). Schedule maintenance soon.`,
                    actions: ['Clean device', 'Check connections', 'Monitor performance']
                });
            } else if (health.healthScore < 70) {
                alerts.push({
                    deviceId: parseInt(deviceId),
                    deviceName: baseline.name,
                    severity: 'info',
                    message: `Device health fair (${Math.round(health.healthScore)}%). Regular maintenance recommended.`,
                    actions: ['Inspect device', 'Check for wear', 'Update firmware']
                });
            }
            
            // Check for specific issues
            const avgTemp = health.metrics.temperature.reduce((a, b) => a + b, 0) / health.metrics.temperature.length || 25;
            if (avgTemp > baseline.maxTemp + 10) {
                alerts.push({
                    deviceId: parseInt(deviceId),
                    deviceName: baseline.name,
                    severity: 'warning',
                    message: `Overheating detected (${Math.round(avgTemp)}°C)`,
                    actions: ['Check ventilation', 'Clean dust', 'Reduce usage']
                });
            }
        }
        
        this.maintenanceAlerts = alerts;
        this.displayAlerts();
    }
    
    predictFailures() {
        const predictions = [];
        
        for (const [deviceId, health] of Object.entries(this.deviceHealth)) {
            const baseline = this.deviceBaselines[deviceId];
            
            if (health.healthScore > 0) {
                const degradationRate = (100 - health.healthScore) / (health.runtime || 1);
                const hoursToFailure = health.healthScore / degradationRate;
                const daysToFailure = hoursToFailure / 24;
                
                predictions.push({
                    deviceId: parseInt(deviceId),
                    deviceName: baseline.name,
                    probability: (100 - health.healthScore) / 100,
                    estimatedDays: Math.round(daysToFailure),
                    confidence: this.calculateConfidence(health),
                    recommendedAction: this.getRecommendedAction(health.healthScore)
                });
            }
        }
        
        this.failurePredictions = predictions;
        this.displayPredictions();
    }
    
    calculateConfidence(health) {
        // Higher confidence with more data points
        const dataPoints = health.metrics.temperature.length;
        const baseConfidence = Math.min(0.9, dataPoints / 100);
        const healthFactor = health.healthScore / 100;
        
        return Math.min(0.95, baseConfidence * (1 - healthFactor * 0.2));
    }
    
    getRecommendedAction(healthScore) {
        if (healthScore < 30) return 'Immediate replacement required';
        if (healthScore < 50) return 'Schedule maintenance within 7 days';
        if (healthScore < 70) return 'Inspect and clean device';
        return 'Routine check recommended';
    }
    
    displayAlerts() {
        const container = document.getElementById('maintenanceAlerts');
        if (!container) return;
        
        if (this.maintenanceAlerts.length === 0) {
            container.innerHTML = '<div class="alert-placeholder">✅ All devices in good health</div>';
            return;
        }
        
        container.innerHTML = this.maintenanceAlerts.map(alert => `
            <div class="alert-card ${alert.severity}">
                <div class="alert-icon">
                    ${alert.severity === 'critical' ? '🔴' : alert.severity === 'warning' ? '🟡' : '🔵'}
                </div>
                <div class="alert-content">
                    <div class="alert-title">${alert.deviceName}</div>
                    <div class="alert-message">${alert.message}</div>
                    <div class="alert-actions">
                        ${alert.actions.map(action => `<span class="action-tag">${action}</span>`).join('')}
                    </div>
                </div>
            </div>
        `).join('');
    }
    
    displayPredictions() {
        const container = document.getElementById('failurePredictions');
        if (!container) return;
        
        const criticalPredictions = this.failurePredictions
            .filter(p => p.probability > 0.3)
            .sort((a, b) => b.probability - a.probability)
            .slice(0, 3);
        
        if (criticalPredictions.length === 0) {
            container.innerHTML = '<div class="prediction-placeholder">📊 No failure predictions at this time</div>';
            return;
        }
        
        container.innerHTML = criticalPredictions.map(pred => `
            <div class="prediction-card">
                <div class="prediction-header">
                    <span class="device-name">${pred.deviceName}</span>
                    <span class="risk-level ${pred.probability > 0.7 ? 'high' : pred.probability > 0.4 ? 'medium' : 'low'}">
                        ${pred.probability > 0.7 ? 'High Risk' : pred.probability > 0.4 ? 'Medium Risk' : 'Low Risk'}
                    </span>
                </div>
                <div class="prediction-details">
                    <div class="detail">Failure probability: ${(pred.probability * 100).toFixed(0)}%</div>
                    <div class="detail">Estimated: ${pred.estimatedDays} days</div>
                    <div class="detail">Confidence: ${(pred.confidence * 100).toFixed(0)}%</div>
                </div>
                <div class="prediction-action">${pred.recommendedAction}</div>
            </div>
        `).join('');
    }
    
    generateWeeklyReport() {
        const report = {
            generated: new Date().toISOString(),
            devices: Object.entries(this.deviceHealth).map(([id, health]) => ({
                deviceId: parseInt(id),
                deviceName: this.deviceBaselines[id].name,
                healthScore: health.healthScore,
                runtime: health.runtime,
                cycles: health.cycles,
                alerts: health.alerts.length
            })),
            alerts: this.maintenanceAlerts,
            predictions: this.failurePredictions,
            recommendations: this.generateRecommendations()
        };
        
        // Save report
        const reports = JSON.parse(localStorage.getItem('maintenance_reports') || '[]');
        reports.unshift(report);
        localStorage.setItem('maintenance_reports', JSON.stringify(reports.slice(0, 10)));
        
        // Notify if critical issues
        const criticalDevices = report.devices.filter(d => d.healthScore < 40);
        if (criticalDevices.length > 0 && window.showToast) {
            window.showToast(`⚠️ ${criticalDevices.length} device(s) require immediate attention`, 'warning');
        }
        
        console.log('Maintenance report generated:', report);
    }
    
    generateRecommendations() {
        const recommendations = [];
        
        for (const [id, health] of Object.entries(this.deviceHealth)) {
            const baseline = this.deviceBaselines[id];
            
            if (health.healthScore < 50) {
                recommendations.push({
                    deviceId: parseInt(id),
                    deviceName: baseline.name,
                    priority: health.healthScore < 30 ? 'high' : 'medium',
                    recommendation: this.getDetailedRecommendation(health, baseline)
                });
            }
        }
        
        return recommendations;
    }
    
    getDetailedRecommendation(health, baseline) {
        const issues = [];
        
        const avgTemp = health.metrics.temperature.reduce((a, b) => a + b, 0) / health.metrics.temperature.length || 25;
        if (avgTemp > baseline.maxTemp) {
            issues.push('overheating');
        }
        
        if (health.runtime > baseline.lifespan * 0.8) {
            issues.push('end of lifespan');
        }
        
        if (health.cycles > this.thresholds.cycles * 0.8) {
            issues.push('excessive cycling');
        }
        
        if (issues.length === 0) return 'Routine inspection recommended';
        if (issues.includes('overheating')) return 'Check ventilation and clean dust filters';
        if (issues.includes('end of lifespan')) return 'Consider replacement soon';
        return 'Schedule professional inspection';
    }
    
    saveDeviceHealth() {
        try {
            localStorage.setItem('device_health', JSON.stringify(this.deviceHealth));
        } catch (e) {
            console.error('Failed to save device health:', e);
        }
    }
    
    loadHistory() {
        try {
            const saved = localStorage.getItem('maintenance_history');
            if (saved) {
                this.maintenanceHistory = JSON.parse(saved);
            }
        } catch (e) {
            console.error('Failed to load maintenance history:', e);
        }
    }
    
    recordMaintenance(deviceId, action, notes) {
        const record = {
            id: Date.now(),
            timestamp: new Date().toISOString(),
            deviceId,
            deviceName: this.deviceBaselines[deviceId]?.name,
            action,
            notes,
            previousHealth: this.deviceHealth[deviceId]?.healthScore
        };
        
        this.maintenanceHistory.unshift(record);
        localStorage.setItem('maintenance_history', JSON.stringify(this.maintenanceHistory.slice(0, 50)));
        
        // Reset health after maintenance
        if (this.deviceHealth[deviceId]) {
            this.deviceHealth[deviceId].healthScore = Math.min(100, (this.deviceHealth[deviceId].healthScore + 50));
            this.deviceHealth[deviceId].lastMaintenance = Date.now();
            this.saveDeviceHealth();
        }
        
        if (window.showToast) {
            window.showToast(`✅ Maintenance recorded for ${this.deviceBaselines[deviceId]?.name}`, 'success');
        }
    }
    
    getDeviceHealth(deviceId) {
        return this.deviceHealth[deviceId] || null;
    }
    
    getMaintenanceHistory(limit = 20) {
        return this.maintenanceHistory.slice(0, limit);
    }
}

// Initialize Predictive Maintenance
window.predictiveMaintenance = new PredictiveMaintenance();

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = PredictiveMaintenance;
}