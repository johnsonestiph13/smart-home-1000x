/**
 * Real-time Charts Module
 * Handles dynamic chart rendering and real-time data visualization
 */

class RealtimeCharts {
    constructor() {
        this.charts = {};
        this.dataPoints = [];
        this.updateInterval = null;
        this.maxDataPoints = 60; // Keep last 60 points (5 minutes at 5s intervals)
        
        // Chart configurations
        this.configs = {
            energy: {
                element: 'realtimeEnergyChart',
                type: 'line',
                label: 'Energy Usage (W)',
                color: '#4361ee',
                backgroundColor: 'rgba(67, 97, 238, 0.1)',
                unit: 'W'
            },
            temperature: {
                element: 'temperatureChart',
                type: 'line',
                label: 'Temperature (°C)',
                color: '#ef476f',
                backgroundColor: 'rgba(239, 71, 111, 0.1)',
                unit: '°C'
            },
            humidity: {
                element: 'humidityChart',
                type: 'line',
                label: 'Humidity (%)',
                color: '#06d6a0',
                backgroundColor: 'rgba(6, 214, 160, 0.1)',
                unit: '%'
            },
            deviceUsage: {
                element: 'deviceUsageChart',
                type: 'doughnut',
                label: 'Device Usage',
                color: ['#4361ee', '#7209b7', '#b5179e', '#f48c06', '#ef476f', '#06d6a0'],
                unit: '%'
            }
        };
        
        this.init();
    }
    
    init() {
        this.setupCharts();
        this.startDataCollection();
        this.setupResizeHandler();
    }
    
    setupCharts() {
        // Energy Chart
        const energyCtx = document.getElementById(this.configs.energy.element);
        if (energyCtx) {
            this.charts.energy = new Chart(energyCtx, {
                type: this.configs.energy.type,
                data: {
                    labels: [],
                    datasets: [{
                        label: this.configs.energy.label,
                        data: [],
                        borderColor: this.configs.energy.color,
                        backgroundColor: this.configs.energy.backgroundColor,
                        borderWidth: 2,
                        fill: true,
                        tension: 0.4,
                        pointRadius: 3,
                        pointHoverRadius: 6,
                        pointBackgroundColor: this.configs.energy.color
                    }]
                },
                options: this.getChartOptions('Energy Usage (Watts)')
            });
        }
        
        // Temperature Chart
        const tempCtx = document.getElementById(this.configs.temperature.element);
        if (tempCtx) {
            this.charts.temperature = new Chart(tempCtx, {
                type: this.configs.temperature.type,
                data: {
                    labels: [],
                    datasets: [{
                        label: this.configs.temperature.label,
                        data: [],
                        borderColor: this.configs.temperature.color,
                        backgroundColor: this.configs.temperature.backgroundColor,
                        borderWidth: 2,
                        fill: true,
                        tension: 0.4,
                        pointRadius: 3
                    }]
                },
                options: this.getChartOptions('Temperature (°C)')
            });
        }
        
        // Humidity Chart
        const humidityCtx = document.getElementById(this.configs.humidity.element);
        if (humidityCtx) {
            this.charts.humidity = new Chart(humidityCtx, {
                type: this.configs.humidity.type,
                data: {
                    labels: [],
                    datasets: [{
                        label: this.configs.humidity.label,
                        data: [],
                        borderColor: this.configs.humidity.color,
                        backgroundColor: this.configs.humidity.backgroundColor,
                        borderWidth: 2,
                        fill: true,
                        tension: 0.4,
                        pointRadius: 3
                    }]
                },
                options: this.getChartOptions('Humidity (%)')
            });
        }
        
        // Device Usage Chart
        const deviceCtx = document.getElementById(this.configs.deviceUsage.element);
        if (deviceCtx) {
            this.charts.deviceUsage = new Chart(deviceCtx, {
                type: this.configs.deviceUsage.type,
                data: {
                    labels: ['Light', 'Fan', 'AC', 'TV', 'Heater', 'Pump'],
                    datasets: [{
                        data: [0, 0, 0, 0, 0, 0],
                        backgroundColor: this.configs.deviceUsage.color,
                        borderWidth: 0,
                        hoverOffset: 10
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            position: 'bottom',
                            labels: {
                                font: { size: 12 },
                                padding: 10
                            }
                        },
                        tooltip: {
                            callbacks: {
                                label: (context) => {
                                    const label = context.label || '';
                                    const value = context.raw || 0;
                                    const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                    const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : 0;
                                    return `${label}: ${value}W (${percentage}%)`;
                                }
                            }
                        }
                    },
                    cutout: '60%'
                }
            });
        }
    }
    
    getChartOptions(yAxisLabel) {
        return {
            responsive: true,
            maintainAspectRatio: false,
            animation: {
                duration: 500,
                easing: 'easeInOutQuart'
            },
            plugins: {
                legend: {
                    position: 'top',
                    labels: {
                        font: { size: 12, weight: 'bold' },
                        usePointStyle: true,
                        boxWidth: 8
                    }
                },
                tooltip: {
                    mode: 'index',
                    intersect: false,
                    backgroundColor: 'rgba(0,0,0,0.8)',
                    titleColor: '#fff',
                    bodyColor: '#ddd',
                    borderColor: '#4361ee',
                    borderWidth: 1,
                    callbacks: {
                        label: (context) => {
                            return `${context.dataset.label}: ${context.raw.toFixed(1)} ${this.getUnit(context.dataset.label)}`;
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: yAxisLabel,
                        font: { size: 12, weight: 'bold' }
                    },
                    grid: {
                        color: 'rgba(0,0,0,0.05)',
                        drawBorder: true
                    },
                    ticks: {
                        callback: (value) => `${value} ${this.getUnit(yAxisLabel)}`
                    }
                },
                x: {
                    title: {
                        display: true,
                        text: 'Time',
                        font: { size: 12, weight: 'bold' }
                    },
                    grid: {
                        display: false
                    },
                    ticks: {
                        maxRotation: 45,
                        minRotation: 45,
                        autoSkip: true,
                        maxTicksLimit: 10
                    }
                }
            },
            interaction: {
                mode: 'nearest',
                axis: 'x',
                intersect: false
            },
            elements: {
                line: {
                    borderJoin: 'round',
                    borderCap: 'round'
                },
                point: {
                    hoverRadius: 6,
                    hoverBorderWidth: 2
                }
            }
        };
    }
    
    getUnit(label) {
        if (label.includes('Energy')) return 'W';
        if (label.includes('Temperature')) return '°C';
        if (label.includes('Humidity')) return '%';
        return '';
    }
    
    startDataCollection() {
        // Collect data every 5 seconds
        this.updateInterval = setInterval(() => {
            this.collectData();
        }, 5000);
        
        // Also collect on device state changes
        this.setupDeviceListeners();
    }
    
    setupDeviceListeners() {
        // Hook into device toggle events
        const originalToggle = window.toggleDevice;
        if (originalToggle) {
            window.toggleDevice = (index) => {
                originalToggle(index);
                setTimeout(() => this.collectData(), 100);
            };
        }
        
        // Monitor temperature updates
        setInterval(() => {
            if (window.AppState?.systemStats?.temperature) {
                this.updateTemperatureChart();
            }
        }, 10000);
    }
    
    collectData() {
        const now = new Date();
        const timeLabel = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        
        // Calculate current energy usage
        const totalPower = window.AppState?.devices?.reduce((sum, d) => sum + (d.state ? d.power : 0), 0) || 0;
        
        // Update energy chart
        if (this.charts.energy) {
            this.addDataPoint(this.charts.energy, timeLabel, totalPower);
        }
        
        // Update temperature chart
        this.updateTemperatureChart();
        
        // Update humidity chart
        this.updateHumidityChart();
        
        // Update device usage chart
        this.updateDeviceUsageChart();
        
        // Store data point
        this.dataPoints.push({
            timestamp: now,
            energy: totalPower,
            temperature: window.AppState?.systemStats?.temperature || 23,
            humidity: window.AppState?.systemStats?.humidity || 45,
            activeDevices: window.AppState?.devices?.filter(d => d.state).length || 0
        });
        
        // Limit data points
        if (this.dataPoints.length > this.maxDataPoints) {
            this.dataPoints.shift();
        }
        
        // Save to localStorage for persistence
        this.saveDataPoints();
    }
    
    addDataPoint(chart, label, value) {
        // Add new data point
        chart.data.labels.push(label);
        chart.data.datasets[0].data.push(value);
        
        // Remove old data points (keep last 20 for better visibility)
        if (chart.data.labels.length > 20) {
            chart.data.labels.shift();
            chart.data.datasets[0].data.shift();
        }
        
        // Update chart
        chart.update('none'); // 'none' for performance, change to 'active' for animation
    }
    
    updateTemperatureChart() {
        if (!this.charts.temperature) return;
        
        const temp = window.AppState?.systemStats?.temperature || 23;
        const timeLabel = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        
        this.addDataPoint(this.charts.temperature, timeLabel, temp);
    }
    
    updateHumidityChart() {
        if (!this.charts.humidity) return;
        
        const humidity = window.AppState?.systemStats?.humidity || 45;
        const timeLabel = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        
        this.addDataPoint(this.charts.humidity, timeLabel, humidity);
    }
    
    updateDeviceUsageChart() {
        if (!this.charts.deviceUsage) return;
        
        const devices = window.AppState?.devices || [];
        const powerValues = [10, 40, 120, 80, 1500, 250];
        const usageData = devices.map((device, i) => device.state ? powerValues[i] : 0);
        
        this.charts.deviceUsage.data.datasets[0].data = usageData;
        this.charts.deviceUsage.update('none');
    }
    
    saveDataPoints() {
        try {
            const toSave = this.dataPoints.slice(-100); // Save last 100 points
            localStorage.setItem('chart_data', JSON.stringify(toSave));
        } catch (e) {
            console.error('Failed to save chart data:', e);
        }
    }
    
    loadDataPoints() {
        try {
            const saved = localStorage.getItem('chart_data');
            if (saved) {
                const parsed = JSON.parse(saved);
                this.dataPoints = parsed.map(p => ({
                    ...p,
                    timestamp: new Date(p.timestamp)
                }));
                
                // Replay data to charts
                this.dataPoints.forEach(point => {
                    const timeLabel = point.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
                    if (this.charts.energy) {
                        this.addDataPoint(this.charts.energy, timeLabel, point.energy);
                    }
                    if (this.charts.temperature) {
                        this.addDataPoint(this.charts.temperature, timeLabel, point.temperature);
                    }
                });
            }
        } catch (e) {
            console.error('Failed to load chart data:', e);
        }
    }
    
    setPeriod(period) {
        // Change chart time period (hour, day, week, month)
        const now = new Date();
        let startTime;
        
        switch(period) {
            case 'hour':
                startTime = new Date(now.getTime() - 60 * 60 * 1000);
                break;
            case 'day':
                startTime = new Date(now.getTime() - 24 * 60 * 60 * 1000);
                break;
            case 'week':
                startTime = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
                break;
            case 'month':
                startTime = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
                break;
            default:
                return;
        }
        
        const filteredData = this.dataPoints.filter(p => p.timestamp >= startTime);
        
        // Clear and reload charts
        this.clearCharts();
        filteredData.forEach(point => {
            const timeLabel = point.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            if (this.charts.energy) {
                this.addDataPoint(this.charts.energy, timeLabel, point.energy);
            }
        });
        
        // Update UI to show active period
        document.querySelectorAll('.period-btn').forEach(btn => btn.classList.remove('active'));
        document.querySelector(`.period-btn[data-period="${period}"]`)?.classList.add('active');
    }
    
    clearCharts() {
        if (this.charts.energy) {
            this.charts.energy.data.labels = [];
            this.charts.energy.data.datasets[0].data = [];
            this.charts.energy.update();
        }
        if (this.charts.temperature) {
            this.charts.temperature.data.labels = [];
            this.charts.temperature.data.datasets[0].data = [];
            this.charts.temperature.update();
        }
    }
    
    setupResizeHandler() {
        // Handle window resize
        let resizeTimer;
        window.addEventListener('resize', () => {
            clearTimeout(resizeTimer);
            resizeTimer = setTimeout(() => {
                Object.values(this.charts).forEach(chart => {
                    if (chart && chart.resize) chart.resize();
                });
            }, 250);
        });
    }
    
    getEnergyStats() {
        const last24h = this.dataPoints.slice(-288); // 5 sec * 288 = 24 hours
        if (last24h.length === 0) return { avg: 0, peak: 0, min: 0, total: 0 };
        
        const values = last24h.map(p => p.energy);
        const avg = values.reduce((a, b) => a + b, 0) / values.length;
        const peak = Math.max(...values);
        const min = Math.min(...values);
        const total = values.reduce((a, b) => a + b, 0) / 1000; // kWh estimate
        
        return { avg: avg.toFixed(1), peak: peak.toFixed(1), min: min.toFixed(1), total: total.toFixed(2) };
    }
    
    getTemperatureStats() {
        const last24h = this.dataPoints.slice(-288);
        if (last24h.length === 0) return { avg: 0, max: 0, min: 0 };
        
        const values = last24h.map(p => p.temperature);
        const avg = values.reduce((a, b) => a + b, 0) / values.length;
        const max = Math.max(...values);
        const min = Math.min(...values);
        
        return { avg: avg.toFixed(1), max: max.toFixed(1), min: min.toFixed(1) };
    }
    
    exportChartData() {
        return {
            energyData: this.dataPoints.map(p => ({
                timestamp: p.timestamp.toISOString(),
                value: p.energy
            })),
            temperatureData: this.dataPoints.map(p => ({
                timestamp: p.timestamp.toISOString(),
                value: p.temperature
            })),
            metadata: {
                generated: new Date().toISOString(),
                totalPoints: this.dataPoints.length,
                deviceCount: window.AppState?.devices?.length || 0
            }
        };
    }
    
    destroy() {
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
        }
        Object.values(this.charts).forEach(chart => {
            if (chart && chart.destroy) chart.destroy();
        });
        this.charts = {};
    }
}

// Initialize Realtime Charts
window.realtimeCharts = new RealtimeCharts();

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = RealtimeCharts;
}