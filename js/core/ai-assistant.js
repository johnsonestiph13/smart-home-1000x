/**
 * AI Assistant Module
 * Provides intelligent voice commands, natural language processing,
 * and smart home automation suggestions
 */

class AIAssistant {
    constructor() {
        this.isListening = false;
        this.wakeWordDetected = false;
        this.recognition = null;
        this.synthesis = window.speechSynthesis;
        this.context = {};
        this.conversationHistory = [];
        this.intentHandlers = {};
        
        // Wake words for different languages
        this.wakeWords = {
            en: ["hey estiph", "hey estif", "estiph", "ok estiph", "wake up estiph", "hello estiph"],
            am: ["ሰላም እስቲፍ", "እስቲፍ", "ሰላም", "አልቃ", "እስቲፍ ሆም", "ሄይ እስቲፍ"]
        };
        
        // Response templates
        this.responses = {
            en: {
                wake: ["Yes?", "I'm listening", "How can I help?", "Yes, sir?", "At your service"],
                confirm: ["Done!", "Command executed", "All set!", "Okay!", "Completed!"],
                error: ["Sorry, I didn't understand", "Could you repeat that?", "Command not recognized"],
                greeting: ["Hello! How can I help you today?", "Hi there! Ready to assist", "Greetings! What can I do for you?"],
                goodbye: ["Goodbye! Have a great day!", "See you later!", "Take care!"],
                help: ["You can say: Light on, Light off, Fan on, All off, What's the temperature?"]
            },
            am: {
                wake: ["አዎ?", "እያዳመጥኩ ነው", "ምን እረዳሃለሁ?", "አዎ አለቃ?", "ትእዛዝዎን ይስጡ"],
                confirm: ["ተሰራ!", "ትእዛዝ ተፈጸመ", "ተዘጋጀ!", "እሺ!", "ተከናውኗል!"],
                error: ["ይቅርታ አልገባኝም", "እባክህ ድገምልኝ", "ትእዛዙ አልታወቀም"],
                greeting: ["ሰላም! እንዴት ልረዳህ?", "ሰላም! ዝግጁ ነኝ", "እንኳን ደህና መጣህ!"],
                goodbye: ["ቻው! መልካም ቀን", "ደህና ሁን!", "ተጠንቀቅ!"],
                help: ["ማለት ትችላለህ: መብራት አብራ, መብራት አጥፋ, ማራገቢያ አብራ, ሁሉንም አጥፋ"]
            }
        };
        
        this.init();
    }
    
    init() {
        // Initialize speech recognition if available
        if ('webkitSpeechRecognition' in window) {
            this.recognition = new webkitSpeechRecognition();
            this.recognition.continuous = true;
            this.recognition.interimResults = true;
            this.setupRecognitionEvents();
        }
        
        // Initialize intent handlers
        this.setupIntentHandlers();
    }
    
    setupRecognitionEvents() {
        this.recognition.onstart = () => {
            this.isListening = true;
            this.updateUI(true);
            this.speakResponse(this.getResponse('wake'));
        };
        
        this.recognition.onresult = (event) => {
            const transcript = Array.from(event.results)
                .map(result => result[0].transcript.toLowerCase())
                .join(' ');
            
            console.log("AI Assistant heard:", transcript);
            this.processInput(transcript);
        };
        
        this.recognition.onerror = (event) => {
            console.error("Speech recognition error:", event.error);
            this.isListening = false;
            this.updateUI(false);
        };
        
        this.recognition.onend = () => {
            if (this.isListening) {
                this.recognition.start();
            }
        };
    }
    
    setupIntentHandlers() {
        // English intents
        this.intentHandlers.en = {
            'light on': () => this.executeCommand('light', true),
            'light off': () => this.executeCommand('light', false),
            'fan on': () => this.executeCommand('fan', true),
            'fan off': () => this.executeCommand('fan', false),
            'ac on': () => this.executeCommand('ac', true),
            'ac off': () => this.executeCommand('ac', false),
            'tv on': () => this.executeCommand('tv', true),
            'tv off': () => this.executeCommand('tv', false),
            'heater on': () => this.executeCommand('heater', true),
            'heater off': () => this.executeCommand('heater', false),
            'pump on': () => this.executeCommand('pump', true),
            'pump off': () => this.executeCommand('pump', false),
            'all on': () => this.executeMasterCommand(true),
            'all off': () => this.executeMasterCommand(false),
            'temperature': () => this.getTemperature(),
            'weather': () => this.getWeather(),
            'time': () => this.getTime(),
            'date': () => this.getDate(),
            'help': () => this.showHelp(),
            'good morning': () => this.executeScene('good-morning'),
            'good night': () => this.executeScene('good-night'),
            'movie time': () => this.executeScene('movie'),
            'party mode': () => this.executeScene('party'),
            'away mode': () => this.executeScene('away')
        };
        
        // Amharic intents
        this.intentHandlers.am = {
            'መብራት አብራ': () => this.executeCommand('light', true),
            'መብራት አጥፋ': () => this.executeCommand('light', false),
            'ማራገቢያ አብራ': () => this.executeCommand('fan', true),
            'ማራገቢያ አጥፋ': () => this.executeCommand('fan', false),
            'አየር ማቀዝቀዣ አብራ': () => this.executeCommand('ac', true),
            'አየር ማቀዝቀዣ አጥፋ': () => this.executeCommand('ac', false),
            'ቴሌቪዥን አብራ': () => this.executeCommand('tv', true),
            'ቴሌቪዥን አጥፋ': () => this.executeCommand('tv', false),
            'ማሞቂያ አብራ': () => this.executeCommand('heater', true),
            'ማሞቂያ አጥፋ': () => this.executeCommand('heater', false),
            'ፓምፕ አብራ': () => this.executeCommand('pump', true),
            'ፓምፕ አጥፋ': () => this.executeCommand('pump', false),
            'ሁሉንም አብራ': () => this.executeMasterCommand(true),
            'ሁሉንም አጥፋ': () => this.executeMasterCommand(false),
            'ሙቀቱ ስንት ነው': () => this.getTemperature(),
            'የአየር ሁኔታ': () => this.getWeather(),
            'ሰዓት ስንት ነው': () => this.getTime(),
            'ቀን ስንት ነው': () => this.getDate(),
            'እርዳታ': () => this.showHelp(),
            'እንደምን አደርክ': () => this.executeScene('good-morning'),
            'መልካም ሌሊት': () => this.executeScene('good-night')
        };
    }
    
    processInput(input) {
        const currentLang = window.AppState?.language || 'en';
        const handlers = this.intentHandlers[currentLang];
        
        // Check for wake word first
        if (!this.wakeWordDetected) {
            const wakeWordsList = this.wakeWords[currentLang];
            for (const wakeWord of wakeWordsList) {
                if (input.includes(wakeWord)) {
                    this.wakeWordDetected = true;
                    this.speakResponse(this.getResponse('wake'));
                    setTimeout(() => {
                        this.wakeWordDetected = false;
                    }, 5000);
                    return;
                }
            }
            return;
        }
        
        // Process command
        for (const [command, handler] of Object.entries(handlers)) {
            if (input.includes(command)) {
                handler();
                this.speakResponse(this.getResponse('confirm'));
                this.addToHistory(input, 'command');
                this.wakeWordDetected = false;
                return;
            }
        }
        
        // No command found
        this.speakResponse(this.getResponse('error'));
        this.addToHistory(input, 'unknown');
    }
    
    executeCommand(deviceName, state) {
        const devices = {
            light: 0,
            fan: 1,
            ac: 2,
            tv: 3,
            heater: 4,
            pump: 5
        };
        
        const deviceId = devices[deviceName];
        if (deviceId !== undefined && window.toggleDevice) {
            window.toggleDevice(deviceId);
            this.logActivity(`AI: Turned ${deviceName} ${state ? 'ON' : 'OFF'}`);
        }
    }
    
    executeMasterCommand(state) {
        if (state && window.masterAllOn) {
            window.masterAllOn();
            this.logActivity('AI: Turned ALL devices ON');
        } else if (!state && window.masterAllOff) {
            window.masterAllOff();
            this.logActivity('AI: Turned ALL devices OFF');
        }
    }
    
    executeScene(sceneName) {
        const scenes = {
            'good-morning': () => {
                this.executeCommand('light', true);
                this.speakResponse('Good morning! Starting your day');
            },
            'good-night': () => {
                this.executeMasterCommand(false);
                this.speakResponse('Good night! All devices turned off');
            },
            'movie': () => {
                this.executeCommand('light', false);
                this.executeCommand('tv', true);
                this.speakResponse('Movie mode activated');
            },
            'party': () => {
                this.executeCommand('light', true);
                this.executeCommand('fan', true);
                this.executeCommand('ac', true);
                this.speakResponse('Party mode activated!');
            },
            'away': () => {
                this.executeMasterCommand(false);
                this.speakResponse('Away mode activated. All devices off');
            }
        };
        
        if (scenes[sceneName]) {
            scenes[sceneName]();
        }
    }
    
    getTemperature() {
        const temp = window.AppState?.systemStats?.temperature || 23;
        const unit = '°C';
        const message = `Current temperature is ${temp}${unit}`;
        const amMessage = `የአሁኑ ሙቀት ${temp} ዲግሪ ነው`;
        
        const currentLang = window.AppState?.language || 'en';
        this.speakResponse(currentLang === 'en' ? message : amMessage);
    }
    
    getWeather() {
        // Fetch weather from API or use cached data
        const weather = window.weatherData || { temp: 24, condition: 'Sunny' };
        const message = `Weather is ${weather.condition}, ${weather.temp} degrees`;
        const amMessage = `የአየር ሁኔታ ${weather.condition === 'Sunny' ? 'ፀሐያማ' : 'ደመናማ'} ነው, ${weather.temp} ዲግሪ`;
        
        const currentLang = window.AppState?.language || 'en';
        this.speakResponse(currentLang === 'en' ? message : amMessage);
    }
    
    getTime() {
        const now = new Date();
        const time = now.toLocaleTimeString();
        const message = `The time is ${time}`;
        const amMessage = `ሰዓቱ ${now.getHours()}:${now.getMinutes().toString().padStart(2, '0')} ነው`;
        
        const currentLang = window.AppState?.language || 'en';
        this.speakResponse(currentLang === 'en' ? message : amMessage);
    }
    
    getDate() {
        const now = new Date();
        const date = now.toLocaleDateString();
        const message = `Today is ${date}`;
        const amMessage = `ዛሬ ${now.getDate()}/${now.getMonth() + 1}/${now.getFullYear()} ነው`;
        
        const currentLang = window.AppState?.language || 'en';
        this.speakResponse(currentLang === 'en' ? message : amMessage);
    }
    
    showHelp() {
        const helpText = this.getResponse('help');
        this.speakResponse(helpText);
        this.logActivity('AI: Help requested');
    }
    
    getResponse(type) {
        const currentLang = window.AppState?.language || 'en';
        const responses = this.responses[currentLang][type];
        return responses[Math.floor(Math.random() * responses.length)];
    }
    
    speakResponse(text) {
        if (this.synthesis) {
            this.synthesis.cancel();
            const utterance = new SpeechSynthesisUtterance(text);
            utterance.lang = window.AppState?.language === 'en' ? 'en-US' : 'am-ET';
            utterance.rate = 0.9;
            utterance.pitch = 1;
            this.synthesis.speak(utterance);
        }
    }
    
    addToHistory(input, type) {
        this.conversationHistory.push({
            timestamp: new Date(),
            input: input,
            type: type
        });
        
        // Keep only last 50 conversations
        if (this.conversationHistory.length > 50) {
            this.conversationHistory.shift();
        }
    }
    
    logActivity(message) {
        if (window.addActivityLog) {
            window.addActivityLog(message);
        }
        console.log(`[AI Assistant] ${message}`);
    }
    
    start() {
        if (this.recognition) {
            this.recognition.start();
            this.isListening = true;
            this.updateUI(true);
            this.logActivity('AI Assistant started');
        }
    }
    
    stop() {
        if (this.recognition) {
            this.recognition.stop();
            this.isListening = false;
            this.wakeWordDetected = false;
            this.updateUI(false);
            this.logActivity('AI Assistant stopped');
        }
    }
    
    updateUI(isListening) {
        const voiceBtn = document.getElementById('voiceBtn');
        const voiceDisplay = document.getElementById('voiceCommandText');
        
        if (voiceBtn) {
            if (isListening) {
                voiceBtn.classList.add('listening');
                voiceBtn.innerHTML = '<i class="fas fa-microphone-alt"></i> Listening...';
            } else {
                voiceBtn.classList.remove('listening');
                voiceBtn.innerHTML = '<i class="fas fa-microphone-alt"></i>';
            }
        }
        
        if (voiceDisplay) {
            voiceDisplay.textContent = isListening ? 'Listening for "Hey Estiph" or "ሰላም እስቲፍ"...' : 'Click microphone to start';
        }
    }
    
    getSuggestions() {
        const currentLang = window.AppState?.language || 'en';
        const suggestions = {
            en: [
                "Turn on living room light",
                "Set temperature to 24 degrees",
                "Good morning scene",
                "What's the weather like?"
            ],
            am: [
                "መብራት አብራ",
                "ሙቀቱን 24 አድርግ",
                "እንደምን አደርክ",
                "የአየር ሁኔታው እንዴት ነው?"
            ]
        };
        
        return suggestions[currentLang];
    }
}

// Initialize AI Assistant globally
window.aiAssistant = new AIAssistant();

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AIAssistant;
}