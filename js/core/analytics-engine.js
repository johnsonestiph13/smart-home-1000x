/**
 * Analytics Engine Module
 * Provides data collection, visualization, and predictive analytics
 */

class AnalyticsEngine {
    constructor() {
        this.dataPoints = [];
        this.charts = {};
        this.insights = [];
        this.predictions = {};
        this.isCollecting = true;
        
        this.init();
    }
    
    init() {
        this.startDataCollection();
        this.setupChartInstances();
    }
    
    startDataCollection() {
        // Collect data every 5 seconds
        setInterval(() => {
            if (this.isCollecting) {
                this.collectDataPoint();
            }
        }, 5000);
        
        // Process analytics every minute
        setInterval(() => {
            this.processAnalytics();
        }, 60000);
        
        // Update predictions every 5 minutes
        setInterval(() => {
            this.updatePredictions();
        }, 300000);
    }
    
    collectDataPoint() {
        const dataPoint = {
            timestamp: new Date(),
            devices: this.getDeviceStates(),
            energy: this.calculateTotalEnergy(),
            temperature: this.getCurrentTemperature(),
            humidity: this.getCurrentHumidity(),
            activeDevices: this.getActiveDeviceCount()
        };
        
        this.dataPoints.push(dataPoint);
        
        // Keep only last 1000 data points
        if (this.dataPoints.length > 1000) {
            this.dataPoints.shift();
        }
        
        // Store in localStorage for persistence
        this.saveToLocalStorage();
        
        // Update real-time charts
        this.updateRealtimeChart(dataPoint);
    }
    
    getDeviceStates() {
        if (window.AppState && window.AppState.devices) {
            return window.AppState.devices.map(d => d.state);
        }
        return Array(6).fill(false);
    }
    
    calculateTotalEnergy() {
        if (window.AppState && window.AppState.devices) {
            const powerValues = [10, 40, 120, 80, 1500, 250];
            return window.AppState.devices.reduce((sum, device, i) => {
                return sum + (device.state ? powerValues[i] : 0);
            }, 0);
        }
        return 0;
    }
    
    getCurrentTemperature() {
        return window.AppState?.systemStats?.temperature || 23;
    }
    
    getCurrentHumidity() {
        return window.AppState?.systemStats?.humidity || 45;
    }
    
    getActiveDeviceCount() {
        if (window.AppState && window.AppState.devices) {
            return window.AppState.devices.filter(d => d.state).length;
        }
        return 0;
    }
    
    setupChartInstances() {
        // Setup energy trend chart
        const energyCtx = document.getElementById('energyTrendChart');
        if (energyCtx) {
            this.charts.energy = new Chart(energyCtx, {
                type: 'line',
                data: {
                    labels: [],
                    datasets: [{
                        label: 'Energy Usage (W)',
                        data: [],
                        borderColor: '#4361ee',
                        backgroundColor: 'rgba(67, 97, 238, 0.1)',
                        fill: true,
                        tension: 0.4
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { position: 'top' },
                        tooltip: { mode: 'index', intersect: false }
                    },
                    scales: {
                        y: { beginAtZero: true, title: { display: true, text: 'Watts' } },
                        x: { title: { display: true, text: 'Time' } }
                    }
                }
            });
        }
        
        // Setup device usage chart
        const deviceCtx = document.getElementById('deviceChart');
        if (deviceCtx) {
            this.charts.devices = new Chart(deviceCtx, {
                type: 'doughnut',
                data: {
                    labels: ['Light', 'Fan', 'AC', 'TV', 'Heater', 'Pump'],
                    datasets: [{
                        data: [0, 0, 0, 0, 0, 0],
                        backgroundColor: ['#4361ee', '#7209b7', '#b5179e', '#f48c06', '#ef476f', '#06d6a0']
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { position: 'bottom' }
                    }
                }
            });
        }
    }
    
    updateRealtimeChart(dataPoint) {
        if (this.charts.energy) {
            const time = dataPoint.timestamp.toLocaleTimeString();
            this.charts.energy.data.labels.push(time);
            this.charts.energy.data.datasets[0].data.push(dataPoint.energy);
            
            // Keep last 20 points
            if (this.charts.energy.data.labels.length > 20) {
                this.charts.energy.data.labels.shift();
                this.charts.energy.data.datasets[0].data.shift();
            }
            
            this.charts.energy.update();
        }
        
        if (this.charts.devices && window.AppState?.devices) {
            const deviceStates = window.AppState.devices;
            const powerValues = [10, 40, 120, 80, 1500, 250];
            const usageData = deviceStates.map((d, i) => d.state ? powerValues[i] : 0);
            this.charts.devices.data.datasets[0].data = usageData;
            this.charts.devices.update();
        }
    }
    
    processAnalytics() {
        if (this.dataPoints.length < 10) return;
        
        const recentData = this.dataPoints.slice(-24); // Last 24 data points
        const insights = [];
        
        // Calculate peak usage times
        const peakHours = this.calculatePeakHours(recentData);
        if (peakHours.length > 0) {
            insights.push({
                type: 'peak_hours',
                message: `Peak energy usage between ${peakHours[0]}:00 - ${peakHours[peakHours.length - 1]}:00`,
                severity: 'info'
            });
        }
        
        // Detect anomalies
        const anomalies = this.detectAnomalies(recentData);
        if (anomalies.length > 0) {
            insights.push({
                type: 'anomaly',
                message: `Detected ${anomalies.length} unusual energy usage patterns`,
                severity: 'warning'
            });
        }
        
        // Calculate trends
        const trend = this.calculateTrend(recentData);
        if (Math.abs(trend) > 10) {
            insights.push({
                type: 'trend',
                message: `Energy usage ${trend > 0 ? 'increasing' : 'decreasing'} by ${Math.abs(trend).toFixed(1)}%`,
                severity: trend > 0 ? 'warning' : 'success'
            });
        }
        
        // Generate savings suggestions
        const savings = this.calculatePotentialSavings(recentData);
        if (savings > 0) {
            insights.push({
                type: 'savings',
                message: `Potential savings of ${savings.toFixed(0)}W by optimizing usage`,
                severity: 'success'
            });
        }
        
        this.insights = insights;
        this.displayInsights();
    }
    
    calculatePeakHours(data) {
        const hourlyUsage = Array(24).fill(0);
        data.forEach(point => {
            const hour = point.timestamp.getHours();
            hourlyUsage[hour] += point.energy;
        });
        
        const threshold = Math.max(...hourlyUsage) * 0.8;
        const peakHours = [];
        hourlyUsage.forEach((usage, hour) => {
            if (usage >= threshold) {
                peakHours.push(hour);
            }
        });
        
        return peakHours;
    }
    
    detectAnomalies(data) {
        const values = data.map(d => d.energy);
        const mean = values.reduce((a, b) => a + b, 0) / values.length;
        const stdDev = Math.sqrt(values.reduce((sq, n) => sq + Math.pow(n - mean, 2), 0) / values.length);
        
        const anomalies = [];
        values.forEach((value, index) => {
            if (Math.abs(value - mean) > 2 * stdDev) {
                anomalies.push({ index, value, deviation: (value - mean) / stdDev });
            }
        });
        
        return anomalies;
    }
    
    calculateTrend(data) {
        if (data.length < 2) return 0;
        
        const firstHalf = data.slice(0, Math.floor(data.length / 2));
        const secondHalf = data.slice(Math.floor(data.length / 2));
        
        const firstAvg = firstHalf.reduce((a, b) => a + b.energy, 0) / firstHalf.length;
        const secondAvg = secondHalf.reduce((a, b) => a + b.energy, 0) / secondHalf.length;
        
        return ((secondAvg - firstAvg) / firstAvg) * 100;
    }
    
    calculatePotentialSavings(data) {
        const currentAvg = data.reduce((a, b) => a + b.energy, 0) / data.length;
        const optimalAvg = this.calculateOptimalUsage(data);
        
        return Math.max(0, currentAvg - optimalAvg);
    }
    
    calculateOptimalUsage(data) {
        // Simple optimization: use minimum of last 3 days at same time
        const hours = data.map(d => d.timestamp.getHours());
        const uniqueHours = [...new Set(hours)];
        
        let totalOptimal = 0;
        uniqueHours.forEach(hour => {
            const hourData = data.filter(d => d.timestamp.getHours() === hour);
            const minUsage = Math.min(...hourData.map(d => d.energy));
            totalOptimal += minUsage;
        });
        
        return totalOptimal / uniqueHours.length;
    }
    
    updatePredictions() {
        if (this.dataPoints.length < 50) return;
        
        const predictions = {
            next24h: this.predictNext24Hours(),
            nextWeek: this.predictNextWeek(),
            nextMonth: this.predictNextMonth(),
            confidence: 0.85
        };
        
        this.predictions = predictions;
        this.displayPredictions();
    }
    
    predictNext24Hours() {
        const recentData = this.dataPoints.slice(-24);
        const hourlyPattern = Array(24).fill(0);
        
        recentData.forEach(point => {
            const hour = point.timestamp.getHours();
            hourlyPattern[hour] += point.energy;
        });
        
        // Average the pattern
        const daysCount = Math.ceil(recentData.length / 24);
        const averagePattern = hourlyPattern.map(h => h / daysCount);
        
        return averagePattern;
    }
    
    predictNextWeek() {
        const dailyAverages = [];
        for (let i = 0; i < 7; i++) {
            const dayData = this.dataPoints.filter(d => d.timestamp.getDay() === i);
            if (dayData.length > 0) {
                const avg = dayData.reduce((a, b) => a + b.energy, 0) / dayData.length;
                dailyAverages.push(avg);
            } else {
                dailyAverages.push(0);
            }
        }
        return dailyAverages;
    }
    
    predictNextMonth() {
        const weeklyPattern = this.predictNextWeek();
        // Repeat weekly pattern for 4 weeks
        return [...weeklyPattern, ...weeklyPattern, ...weeklyPattern, ...weeklyPattern];
    }
    
    displayInsights() {
        const insightsContainer = document.getElementById('smartInsights');
        if (!insightsContainer) return;
        
        if (this.insights.length === 0) {
            insightsContainer.innerHTML = '<div class="insight-card">No insights yet. Collecting data...</div>';
            return;
        }
        
        insightsContainer.innerHTML = this.insights.map(insight => `
            <div class="insight-card ${insight.severity}">
                <div class="insight-icon">
                    ${insight.type === 'peak_hours' ? '📊' : insight.type === 'anomaly' ? '⚠️' : '💡'}
                </div>
                <div class="insight-content">
                    <div class="insight-message">${insight.message}</div>
                </div>
            </div>
        `).join('');
    }
    
    displayPredictions() {
        const predictionsContainer = document.getElementById('predictionCards');
        if (!predictionsContainer) return;
        
        predictionsContainer.innerHTML = `
            <div class="prediction-card">
                <div class="prediction-title">Next 24 Hours</div>
                <div class="prediction-value">${Math.round(this.predictions.next24h?.reduce((a,b) => a + b, 0) || 0)} Wh</div>
                <div class="prediction-confidence">Confidence: ${(this.predictions.confidence * 100)}%</div>
            </div>
            <div class="prediction-card">
                <div class="prediction-title">Next Week</div>
                <div class="prediction-value">${Math.round((this.predictions.nextWeek?.reduce((a,b) => a + b, 0) || 0) / 7)} Wh/day</div>
            </div>
            <div class="prediction-card">
                <div class="prediction-title">Next Month</div>
                <div class="prediction-value">${Math.round((this.predictions.nextMonth?.reduce((a,b) => a + b, 0) || 0) / 30)} Wh/day</div>
            </div>
        `;
    }
    
    saveToLocalStorage() {
        try {
            const toSave = this.dataPoints.slice(-500); // Save last 500 points
            localStorage.setItem('analytics_data', JSON.stringify(toSave));
        } catch (e) {
            console.error('Failed to save analytics data:', e);
        }
    }
    
    loadFromLocalStorage() {
        try {
            const saved = localStorage.getItem('analytics_data');
            if (saved) {
                const parsed = JSON.parse(saved);
                this.dataPoints = parsed.map(p => ({
                    ...p,
                    timestamp: new Date(p.timestamp)
                }));
                console.log(`Loaded ${this.dataPoints.length} analytics data points`);
            }
        } catch (e) {
            console.error('Failed to load analytics data:', e);
        }
    }
    
    generateReport(startDate, endDate) {
        const filteredData = this.dataPoints.filter(d => 
            d.timestamp >= startDate && d.timestamp <= endDate
        );
        
        const totalEnergy = filteredData.reduce((a, b) => a + b.energy, 0);
        const avgEnergy = totalEnergy / filteredData.length;
        const peakEnergy = Math.max(...filteredData.map(d => d.energy));
        const offPeak = Math.min(...filteredData.map(d => d.energy));
        
        return {
            period: { startDate, endDate },
            totalEnergy: totalEnergy,
            averageEnergy: avgEnergy,
            peakEnergy: peakEnergy,
            offPeakEnergy: offPeak,
            dataPoints: filteredData.length,
            insights: this.insights,
            predictions: this.predictions
        };
    }
}

// Initialize Analytics Engine
window.analyticsEngine = new AnalyticsEngine();
window.analyticsEngine.loadFromLocalStorage();

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AnalyticsEngine;
}