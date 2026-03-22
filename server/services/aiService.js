/**
 * AI Service
 * Provides AI-powered features like natural language processing,
 * pattern recognition, and intelligent recommendations
 */

const natural = require('natural');
const { pipeline } = require('stream');
const tf = require('@tensorflow/tfjs-node');

class AIService {
    constructor() {
        this.tokenizer = new natural.WordTokenizer();
        this.stemmer = natural.PorterStemmer;
        this.classifier = null;
        this.intentModel = null;
        this.isInitialized = false;
        
        this.intents = {
            device_control: ['turn', 'switch', 'control', 'change'],
            query: ['what', 'how', 'when', 'where', 'tell', 'show'],
            schedule: ['schedule', 'set', 'remind', 'timer'],
            scene: ['scene', 'mode', 'activate', 'start'],
            automation: ['automate', 'auto', 'if', 'when'],
            help: ['help', 'guide', 'assist', 'support']
        };
        
        this.init();
    }
    
    async init() {
        try {
            await this.loadModel();
            this.trainClassifier();
            this.isInitialized = true;
            console.log('AI Service initialized successfully');
        } catch (error) {
            console.error('AI Service initialization failed:', error);
        }
    }
    
    async loadModel() {
        // Load pre-trained model or create new one
        try {
            // For production, load from file
            // this.intentModel = await tf.loadLayersModel('file://models/intent/model.json');
        } catch (error) {
            console.log('No pre-trained model found, using fallback');
        }
    }
    
    trainClassifier() {
        this.classifier = new natural.BayesClassifier();
        
        // Train with sample data
        const trainingData = [
            { text: 'turn on living room light', intent: 'device_control', device: 'light', action: 'on' },
            { text: 'switch off the fan', intent: 'device_control', device: 'fan', action: 'off' },
            { text: 'set temperature to 24 degrees', intent: 'device_control', device: 'ac', action: 'set' },
            { text: 'what is the temperature', intent: 'query', queryType: 'temperature' },
            { text: 'show me energy usage', intent: 'query', queryType: 'energy' },
            { text: 'schedule light to turn on at 7am', intent: 'schedule', device: 'light', action: 'on', time: '7am' },
            { text: 'activate movie mode', intent: 'scene', scene: 'movie' },
            { text: 'good morning scene', intent: 'scene', scene: 'good_morning' },
            { text: 'turn off all devices when I leave', intent: 'automation', condition: 'away', action: 'off' }
        ];
        
        trainingData.forEach(data => {
            this.classifier.addDocument(data.text, data.intent);
        });
        
        this.classifier.train();
    }
    
    /**
     * Process natural language input and extract intent and entities
     */
    async processNaturalLanguage(input, language = 'en') {
        const lowerInput = input.toLowerCase();
        
        // Get intent using classifier
        const intent = this.classifier.classify(lowerInput);
        
        // Extract entities
        const entities = await this.extractEntities(lowerInput, intent);
        
        return {
            original: input,
            intent: intent,
            entities: entities,
            confidence: this.classifier.getClassifications(lowerInput)[0]?.value || 0,
            timestamp: new Date()
        };
    }
    
    /**
     * Extract entities from text based on intent
     */
    async extractEntities(text, intent) {
        const entities = {};
        
        // Device detection
        const devices = ['light', 'fan', 'ac', 'tv', 'heater', 'pump'];
        for (const device of devices) {
            if (text.includes(device)) {
                entities.device = device;
                break;
            }
        }
        
        // Action detection
        if (text.includes('on') || text.includes('turn on') || text.includes('switch on')) {
            entities.action = 'on';
        } else if (text.includes('off') || text.includes('turn off') || text.includes('switch off')) {
            entities.action = 'off';
        } else if (text.includes('toggle')) {
            entities.action = 'toggle';
        }
        
        // Temperature detection
        const tempMatch = text.match(/(\d+)\s*degrees?\s*(?:celsius|centigrade|c)/i);
        if (tempMatch) {
            entities.temperature = parseInt(tempMatch[1]);
        }
        
        // Time detection
        const timeMatch = text.match(/(\d{1,2})\s*(?::|at)?\s*(\d{2})?\s*(am|pm)?/i);
        if (timeMatch) {
            let hour = parseInt(timeMatch[1]);
            const minute = timeMatch[2] ? parseInt(timeMatch[2]) : 0;
            const period = timeMatch[3]?.toLowerCase();
            
            if (period === 'pm' && hour < 12) hour += 12;
            if (period === 'am' && hour === 12) hour = 0;
            
            entities.time = { hour, minute };
        }
        
        // Scene detection
        const scenes = ['movie', 'party', 'good morning', 'good night', 'away', 'romantic', 'reading'];
        for (const scene of scenes) {
            if (text.includes(scene)) {
                entities.scene = scene.replace(/\s+/g, '_');
                break;
            }
        }
        
        return entities;
    }
    
    /**
     * Generate smart recommendations based on usage patterns
     */
    async generateRecommendations(usageData, deviceStates, weatherData) {
        const recommendations = [];
        
        // Energy saving recommendations
        const activeDevices = deviceStates.filter(d => d.state);
        const highPowerDevices = activeDevices.filter(d => d.power > 100);
        
        if (highPowerDevices.length > 0 && this.isPeakHour()) {
            recommendations.push({
                type: 'energy',
                title: 'Peak Hour Energy Saving',
                message: `High power devices (${highPowerDevices.map(d => d.name).join(', ')}) are running during peak hours. Consider scheduling them for off-peak times.`,
                estimatedSavings: '15-20%',
                priority: 'medium'
            });
        }
        
        // Temperature-based recommendations
        if (weatherData && deviceStates.find(d => d.type === 'ac')) {
            const ac = deviceStates.find(d => d.type === 'ac');
            if (ac.state && Math.abs(weatherData.temp - ac.targetTemp) < 2) {
                recommendations.push({
                    type: 'comfort',
                    title: 'Temperature Optimization',
                    message: `AC is set to ${ac.targetTemp}°C while outside is ${weatherData.temp}°C. Consider adjusting for optimal comfort.`,
                    priority: 'low'
                });
            }
        }
        
        // Routine detection
        const routines = this.detectRoutines(usageData);
        if (routines.length > 0) {
            recommendations.push({
                type: 'automation',
                title: 'Routine Detected',
                message: `I noticed you turn ${routines[0].device} ${routines[0].action} around ${routines[0].time}. Would you like to automate this?`,
                priority: 'low',
                suggestedAutomation: routines[0]
            });
        }
        
        // Maintenance recommendations
        const devicesNeedingMaintenance = deviceStates.filter(d => d.healthScore < 70);
        if (devicesNeedingMaintenance.length > 0) {
            recommendations.push({
                type: 'maintenance',
                title: 'Device Health Check',
                message: `${devicesNeedingMaintenance.length} device(s) need attention: ${devicesNeedingMaintenance.map(d => d.name).join(', ')}`,
                priority: 'high'
            });
        }
        
        return recommendations;
    }
    
    /**
     * Detect usage patterns and routines
     */
    detectRoutines(usageData) {
        const routines = [];
        const patterns = {};
        
        usageData.forEach(entry => {
            const key = `${entry.deviceId}_${entry.hour}`;
            if (!patterns[key]) {
                patterns[key] = { count: 0, actions: [] };
            }
            patterns[key].count++;
            patterns[key].actions.push(entry.action);
        });
        
        for (const [key, data] of Object.entries(patterns)) {
            if (data.count > 5) { // At least 5 occurrences
                const [deviceId, hour] = key.split('_');
                const mostCommonAction = this.getMostCommon(data.actions);
                
                routines.push({
                    deviceId: parseInt(deviceId),
                    action: mostCommonAction,
                    time: `${hour}:00`,
                    confidence: data.count / data.actions.length
                });
            }
        }
        
        return routines;
    }
    
    /**
     * Analyze sentiment from user feedback
     */
    analyzeSentiment(text) {
        const analyzer = new natural.SentimentAnalyzer('English', natural.PorterStemmer, 'afinn');
        const tokenized = this.tokenizer.tokenize(text);
        const score = analyzer.getSentiment(tokenized);
        
        let sentiment = 'neutral';
        if (score > 0.2) sentiment = 'positive';
        if (score < -0.2) sentiment = 'negative';
        
        return {
            score,
            sentiment,
            text
        };
    }
    
    /**
     * Predict future usage patterns
     */
    async predictUsage(historicalData, period = 'hour') {
        if (historicalData.length < 24) {
            return { error: 'Insufficient data for prediction' };
        }
        
        // Simple moving average for prediction
        const values = historicalData.map(d => d.value);
        const windowSize = period === 'hour' ? 6 : 24;
        
        const predictions = [];
        for (let i = 0; i < windowSize; i++) {
            const window = values.slice(-windowSize + i, -windowSize + i + windowSize);
            const avg = window.reduce((a, b) => a + b, 0) / window.length;
            predictions.push({
                period: i + 1,
                predicted: avg,
                confidence: 0.8
            });
        }
        
        return {
            predictions,
            method: 'moving_average',
            confidence: 0.8,
            timestamp: new Date()
        };
    }
    
    /**
     * Detect anomalies in device behavior
     */
    detectAnomalies(sensorData, historicalData) {
        const anomalies = [];
        const mean = historicalData.reduce((a, b) => a + b, 0) / historicalData.length;
        const stdDev = Math.sqrt(historicalData.reduce((sq, n) => sq + Math.pow(n - mean, 2), 0) / historicalData.length);
        
        sensorData.forEach(data => {
            const zScore = Math.abs((data.value - mean) / stdDev);
            if (zScore > 2) {
                anomalies.push({
                    deviceId: data.deviceId,
                    metric: data.metric,
                    value: data.value,
                    expected: mean,
                    deviation: zScore,
                    severity: zScore > 3 ? 'high' : 'medium'
                });
            }
        });
        
        return anomalies;
    }
    
    /**
     * Generate natural language response
     */
    generateResponse(intent, entities, context = {}) {
        const responses = {
            device_control: {
                on: `Turning ${entities.device} on.`,
                off: `Turning ${entities.device} off.`,
                set: `Setting ${entities.device} to ${entities.temperature}°C.`
            },
            query: {
                temperature: `Current temperature is ${context.temperature}°C.`,
                energy: `Current energy usage is ${context.energyUsage}W.`
            },
            schedule: `Schedule set for ${entities.device} to turn ${entities.action} at ${entities.time?.hour}:${entities.time?.minute}.`,
            scene: `Activating ${entities.scene} scene.`,
            help: `I can help you control devices, answer questions, set schedules, and more. Try saying "turn on light" or "what's the temperature?"`
        };
        
        const intentResponses = responses[intent];
        if (!intentResponses) {
            return "I'm not sure how to help with that. Try saying 'help' for available commands.";
        }
        
        if (entities.action && intentResponses[entities.action]) {
            return intentResponses[entities.action];
        }
        
        if (entities.queryType && intentResponses[entities.queryType]) {
            return intentResponses[entities.queryType];
        }
        
        return intentResponses.default || "Command received. Processing...";
    }
    
    /**
     * Helper: Get most common item in array
     */
    getMostCommon(arr) {
        return arr.sort((a, b) =>
            arr.filter(v => v === a).length - arr.filter(v => v === b).length
        ).pop();
    }
    
    /**
     * Helper: Check if current time is peak hour
     */
    isPeakHour() {
        const hour = new Date().getHours();
        return (hour >= 17 && hour <= 20) || (hour >= 6 && hour <= 9);
    }
    
    /**
     * Natural language understanding for Amharic
     * Basic implementation - can be extended with Amharic NLP
     */
    processAmharicInput(text) {
        const amharicCommands = {
            'መብራት አብራ': { device: 'light', action: 'on' },
            'መብራት አጥፋ': { device: 'light', action: 'off' },
            'ማራገቢያ አብራ': { device: 'fan', action: 'on' },
            'ማራገቢያ አጥፋ': { device: 'fan', action: 'off' },
            'አየር ማቀዝቀዣ አብራ': { device: 'ac', action: 'on' },
            'ሁሉንም አብራ': { device: 'all', action: 'on' },
            'ሁሉንም አጥፋ': { device: 'all', action: 'off' },
            'ሙቀቱ ስንት ነው': { intent: 'query', queryType: 'temperature' }
        };
        
        for (const [command, result] of Object.entries(amharicCommands)) {
            if (text.includes(command)) {
                return {
                    original: text,
                    intent: 'device_control',
                    entities: result,
                    language: 'am'
                };
            }
        }
        
        return {
            original: text,
            intent: 'unknown',
            entities: {},
            language: 'am'
        };
    }
}

module.exports = new AIService();