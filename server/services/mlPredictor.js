/**
 * Machine Learning Predictor Service
 * Provides predictive analytics using TensorFlow.js
 */

const tf = require('@tensorflow/tfjs-node');
const fs = require('fs');
const path = require('path');

class MLPredictor {
    constructor() {
        this.models = {
            energy: null,
            deviceFailure: null,
            occupancy: null
        };
        this.isLoaded = false;
        this.trainingData = [];
        
        this.init();
    }
    
    async init() {
        try {
            await this.loadModels();
            this.isLoaded = true;
            console.log('ML Predictor initialized');
        } catch (error) {
            console.error('ML Predictor initialization failed:', error);
        }
    }
    
    async loadModels() {
        // Load pre-trained models from disk if they exist
        const modelPaths = {
            energy: path.join(__dirname, '../../models/energy_model.json'),
            deviceFailure: path.join(__dirname, '../../models/failure_model.json'),
            occupancy: path.join(__dirname, '../../models/occupancy_model.json')
        };
        
        for (const [name, modelPath] of Object.entries(modelPaths)) {
            if (fs.existsSync(modelPath)) {
                try {
                    this.models[name] = await tf.loadLayersModel(`file://${modelPath}`);
                    console.log(`Loaded ${name} model`);
                } catch (error) {
                    console.log(`Failed to load ${name} model, will train new one`);
                }
            }
        }
    }
    
    /**
     * Predict energy consumption for next 24 hours
     */
    async predictEnergyConsumption(historicalData, weatherForecast) {
        if (!this.models.energy && historicalData.length < 168) { // Need at least 1 week
            return this.simpleEnergyPrediction(historicalData);
        }
        
        try {
            // Prepare input features
            const features = this.prepareEnergyFeatures(historicalData, weatherForecast);
            const inputTensor = tf.tensor2d([features]);
            
            let prediction;
            if (this.models.energy) {
                prediction = await this.models.energy.predict(inputTensor);
            } else {
                // Use simple LSTM-like prediction
                prediction = this.lstmPrediction(historicalData);
            }
            
            const values = await prediction.data();
            
            return {
                predictions: Array.from(values),
                confidence: 0.85,
                method: this.models.energy ? 'neural_network' : 'lstm',
                timestamp: new Date()
            };
        } catch (error) {
            console.error('Energy prediction failed:', error);
            return this.simpleEnergyPrediction(historicalData);
        }
    }
    
    /**
     * Predict device failure probability
     */
    async predictDeviceFailure(deviceData, historicalMetrics) {
        const features = this.prepareFailureFeatures(deviceData, historicalMetrics);
        
        let probability = 0.5;
        
        if (this.models.deviceFailure) {
            const inputTensor = tf.tensor2d([features]);
            const output = await this.models.deviceFailure.predict(inputTensor);
            probability = (await output.data())[0];
        } else {
            // Rule-based fallback
            probability = this.calculateFailureProbability(deviceData, historicalMetrics);
        }
        
        const estimatedDays = this.estimateTimeToFailure(probability, deviceData);
        
        return {
            deviceId: deviceData.id,
            deviceName: deviceData.name,
            failureProbability: probability,
            riskLevel: probability > 0.7 ? 'high' : probability > 0.4 ? 'medium' : 'low',
            estimatedDaysToFailure: estimatedDays,
            recommendedAction: this.getRecommendedAction(probability),
            confidence: 0.8,
            timestamp: new Date()
        };
    }
    
    /**
     * Predict occupancy patterns
     */
    async predictOccupancy(historicalOccupancy, timeOfDay, dayOfWeek) {
        if (this.models.occupancy && historicalOccupancy.length > 100) {
            const features = [timeOfDay, dayOfWeek, ...this.getRecentOccupancy(historicalOccupancy, 24)];
            const inputTensor = tf.tensor2d([features]);
            const output = await this.models.occupancy.predict(inputTensor);
            const probability = (await output.data())[0];
            
            return {
                probability,
                isOccupied: probability > 0.5,
                confidence: 0.75,
                timestamp: new Date()
            };
        }
        
        // Simple pattern-based prediction
        const hourPatterns = this.calculateHourlyPattern(historicalOccupancy);
        const probability = hourPatterns[timeOfDay] || 0.3;
        
        return {
            probability,
            isOccupied: probability > 0.5,
            confidence: 0.6,
            method: 'pattern_matching',
            timestamp: new Date()
        };
    }
    
    /**
     * Train energy prediction model
     */
    async trainEnergyModel(trainingData) {
        const features = [];
        const labels = [];
        
        trainingData.forEach(day => {
            for (let i = 0; i < day.values.length - 24; i++) {
                features.push(day.values.slice(i, i + 24));
                labels.push(day.values.slice(i + 24, i + 48));
            }
        });
        
        const inputTensor = tf.tensor3d(features, [features.length, 24, 1]);
        const labelTensor = tf.tensor2d(labels);
        
        const model = tf.sequential();
        model.add(tf.layers.lstm({ units: 50, returnSequences: true, inputShape: [24, 1] }));
        model.add(tf.layers.dropout({ rate: 0.2 }));
        model.add(tf.layers.lstm({ units: 50, returnSequences: false }));
        model.add(tf.layers.dense({ units: 24 }));
        
        model.compile({ optimizer: 'adam', loss: 'meanSquaredError' });
        
        await model.fit(inputTensor, labelTensor, {
            epochs: 50,
            batchSize: 32,
            validationSplit: 0.2
        });
        
        this.models.energy = model;
        
        // Save model
        await model.save(`file://${path.join(__dirname, '../../models/energy_model')}`);
        
        return { success: true, epochs: 50 };
    }
    
    /**
     * Simple energy prediction using moving average
     */
    simpleEnergyPrediction(historicalData) {
        const predictions = [];
        const windowSize = Math.min(24, historicalData.length);
        
        for (let i = 0; i < 24; i++) {
            const window = historicalData.slice(-windowSize).map(d => d.value);
            const avg = window.reduce((a, b) => a + b, 0) / window.length;
            predictions.push(avg);
        }
        
        return {
            predictions,
            confidence: 0.6,
            method: 'moving_average',
            timestamp: new Date()
        };
    }
    
    /**
     * LSTM-style prediction using simple RNN
     */
    lstmPrediction(historicalData) {
        const values = historicalData.map(d => d.value);
        const predictions = [];
        
        // Simple autoregressive prediction
        for (let i = 0; i < 24; i++) {
            const weights = [0.5, 0.3, 0.2];
            let prediction = 0;
            
            for (let j = 0; j < weights.length; j++) {
                const idx = values.length - (j + 1);
                if (idx >= 0) {
                    prediction += values[idx] * weights[j];
                }
            }
            
            predictions.push(prediction);
            values.push(prediction);
        }
        
        return tf.tensor2d([predictions]);
    }
    
    /**
     * Prepare features for energy prediction
     */
    prepareEnergyFeatures(historicalData, weatherForecast) {
        const features = [];
        
        // Last 24 hours of energy data
        const last24h = historicalData.slice(-24).map(d => d.value);
        features.push(...last24h);
        
        // Time features
        const now = new Date();
        features.push(now.getHours());
        features.push(now.getDay());
        features.push(now.getMonth());
        
        // Weather features if available
        if (weatherForecast) {
            features.push(weatherForecast.temperature);
            features.push(weatherForecast.humidity);
            features.push(weatherForecast.cloudCover);
        }
        
        return features;
    }
    
    /**
     * Prepare features for failure prediction
     */
    prepareFailureFeatures(deviceData, historicalMetrics) {
        return [
            deviceData.healthScore,
            deviceData.totalRuntime,
            deviceData.cycleCount,
            deviceData.errorCount,
            historicalMetrics.avgTemperature,
            historicalMetrics.maxTemperature,
            historicalMetrics.avgCurrent,
            historicalMetrics.maxCurrent,
            historicalMetrics.avgVibration
        ];
    }
    
    /**
     * Calculate failure probability using rule-based logic
     */
    calculateFailureProbability(deviceData, historicalMetrics) {
        let probability = 0;
        
        // Health score factor
        probability += (100 - deviceData.healthScore) / 100 * 0.4;
        
        // Runtime factor
        const maxLifespan = 10000; // hours
        probability += (deviceData.totalRuntime / maxLifespan) * 0.3;
        
        // Temperature factor
        const avgTemp = historicalMetrics.avgTemperature || 30;
        if (avgTemp > 60) {
            probability += ((avgTemp - 60) / 40) * 0.2;
        }
        
        // Error count factor
        probability += Math.min(deviceData.errorCount / 10, 0.2);
        
        return Math.min(probability, 0.95);
    }
    
    /**
     * Estimate time to failure based on probability
     */
    estimateTimeToFailure(probability, deviceData) {
        const baseLifespan = 10000; // hours
        const currentUsage = deviceData.totalRuntime;
        const remainingLifespan = baseLifespan - currentUsage;
        
        const probabilityFactor = 1 - probability;
        const estimatedDays = (remainingLifespan * probabilityFactor) / 24;
        
        return Math.max(1, Math.floor(estimatedDays));
    }
    
    /**
     * Get recommended action based on failure probability
     */
    getRecommendedAction(probability) {
        if (probability > 0.8) {
            return 'Immediate replacement required';
        }
        if (probability > 0.6) {
            return 'Schedule maintenance within 7 days';
        }
        if (probability > 0.4) {
            return 'Inspect device and monitor closely';
        }
        if (probability > 0.2) {
            return 'Routine maintenance recommended';
        }
        return 'Device operating normally';
    }
    
    /**
     * Calculate hourly occupancy pattern
     */
    calculateHourlyPattern(historicalOccupancy) {
        const pattern = Array(24).fill(0);
        let total = 0;
        
        historicalOccupancy.forEach(entry => {
            const hour = new Date(entry.timestamp).getHours();
            if (entry.isOccupied) {
                pattern[hour]++;
            }
            total++;
        });
        
        return pattern.map(count => count / total);
    }
    
    /**
     * Get recent occupancy values
     */
    getRecentOccupancy(historicalOccupancy, hours) {
        const recent = historicalOccupancy.slice(-hours);
        return recent.map(entry => entry.isOccupied ? 1 : 0);
    }
    
    /**
     * Detect anomalies in time series data
     */
    detectAnomalies(data, threshold = 2) {
        const values = data.map(d => d.value);
        const mean = values.reduce((a, b) => a + b, 0) / values.length;
        const stdDev = Math.sqrt(values.reduce((sq, n) => sq + Math.pow(n - mean, 2), 0) / values.length);
        
        const anomalies = [];
        data.forEach((point, index) => {
            const zScore = Math.abs((point.value - mean) / stdDev);
            if (zScore > threshold) {
                anomalies.push({
                    index,
                    timestamp: point.timestamp,
                    value: point.value,
                    expected: mean,
                    deviation: zScore,
                    severity: zScore > 3 ? 'high' : 'medium'
                });
            }
        });
        
        return anomalies;
    }
    
    /**
     * Forecast energy consumption using exponential smoothing
     */
    exponentialSmoothing(data, alpha = 0.3, forecastHorizon = 24) {
        const smoothed = [data[0].value];
        
        for (let i = 1; i < data.length; i++) {
            smoothed.push(alpha * data[i].value + (1 - alpha) * smoothed[i - 1]);
        }
        
        const forecasts = [];
        let lastSmoothed = smoothed[smoothed.length - 1];
        
        for (let i = 0; i < forecastHorizon; i++) {
            forecasts.push(lastSmoothed);
        }
        
        return forecasts;
    }
}

module.exports = new MLPredictor();