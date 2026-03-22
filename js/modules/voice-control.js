/**
 * Voice Control Module
 * Handles voice recognition, wake word detection, and voice commands
 */

class VoiceControl {
    constructor() {
        this.isListening = false;
        this.isSpeaking = false;
        this.recognition = null;
        this.synthesis = window.speechSynthesis;
        this.wakeWordDetected = false;
        this.wakeWordTimer = null;
        this.commandHistory = [];
        this.supportedLanguages = ['en-US', 'am-ET'];
        
        // Wake words for different languages
        this.wakeWords = {
            en: ['hey estiph', 'hey estif', 'estiph', 'ok estiph', 'wake up estiph', 'hello estiph', 'hi estiph'],
            am: ['ሰላም እስቲፍ', 'እስቲፍ', 'ሰላም', 'አልቃ', 'እስቲፍ ሆም', 'ሄይ እስቲፍ', 'ሰላም አለቃ']
        };
        
        // Command patterns
        this.commandPatterns = {
            en: {
                device: {
                    light: ['light', 'lamp', 'bulb', 'መብራት'],
                    fan: ['fan', 'blower', 'ማራገቢያ'],
                    ac: ['ac', 'air conditioner', 'cooler', 'አየር ማቀዝቀዣ'],
                    tv: ['tv', 'television', 'ቴሌቪዥን'],
                    heater: ['heater', 'warmer', 'ማሞቂያ'],
                    pump: ['pump', 'water pump', 'ፓምፕ']
                },
                action: {
                    on: ['on', 'turn on', 'switch on', 'activate', 'start', 'አብራ'],
                    off: ['off', 'turn off', 'switch off', 'deactivate', 'stop', 'አጥፋ']
                },
                scene: {
                    'good morning': ['good morning', 'morning', 'wake up', 'እንደምን አደርክ'],
                    'good night': ['good night', 'night', 'sleep', 'መልካም ሌሊት'],
                    'movie': ['movie', 'cinema', 'watch movie', 'ፊልም'],
                    'party': ['party', 'celebration', 'fun', 'ፓርቲ'],
                    'away': ['away', 'leave', 'vacation', 'ጉዞ']
                }
            },
            am: {
                device: {
                    light: ['መብራት', 'ማብሪያ', 'ብርሃን'],
                    fan: ['ማራገቢያ', 'ፋን', 'አየር ማራገቢያ'],
                    ac: ['አየር ማቀዝቀዣ', 'ኤሲ', 'ማቀዝቀዣ'],
                    tv: ['ቴሌቪዥን', 'ቲቪ', 'ምስል'],
                    heater: ['ማሞቂያ', 'ሙቀት', 'ማሞቂያ'],
                    pump: ['ፓምፕ', 'ውሃ ፓምፕ', 'ውሃ አስገቢ']
                },
                action: {
                    on: ['አብራ', 'ክፈት', 'ጀምር', 'አብራው'],
                    off: ['አጥፋ', 'ዝጋ', 'አቁም', 'አጥፋው']
                }
            }
        };
        
        this.init();
    }
    
    init() {
        this.setupRecognition();
        this.addVoiceButton();
        this.loadCommandHistory();
    }
    
    setupRecognition() {
        if ('webkitSpeechRecognition' in window) {
            this.recognition = new webkitSpeechRecognition();
            this.recognition.continuous = true;
            this.recognition.interimResults = true;
            this.recognition.maxAlternatives = 1;
            
            this.recognition.onstart = () => {
                this.isListening = true;
                this.updateUI(true);
                this.addToHistory('system', 'Voice recognition started');
                if (window.showToast) {
                    window.showToast('🎤 Listening for voice commands...', 'info');
                }
            };
            
            this.recognition.onresult = (event) => {
                const transcript = Array.from(event.results)
                    .map(result => result[0].transcript.toLowerCase())
                    .join(' ');
                
                const isFinal = event.results[0].isFinal;
                this.processTranscript(transcript, isFinal);
            };
            
            this.recognition.onerror = (event) => {
                console.error('Voice recognition error:', event.error);
                this.addToHistory('error', `Recognition error: ${event.error}`);
                if (window.showToast) {
                    window.showToast(`Voice error: ${event.error}`, 'error');
                }
            };
            
            this.recognition.onend = () => {
                if (this.isListening) {
                    // Auto-restart if still listening
                    this.recognition.start();
                } else {
                    this.updateUI(false);
                }
            };
        } else {
            console.warn('Speech recognition not supported');
            this.addToHistory('error', 'Speech recognition not supported in this browser');
        }
    }
    
    processTranscript(transcript, isFinal) {
        const currentLang = window.AppState?.language || 'en';
        const langCode = currentLang === 'en' ? 'en-US' : 'am-ET';
        
        // Update display
        this.updateVoiceDisplay(transcript);
        
        // Check for wake word if not already detected
        if (!this.wakeWordDetected) {
            const wakeWordsList = this.wakeWords[currentLang];
            for (const wakeWord of wakeWordsList) {
                if (transcript.includes(wakeWord)) {
                    this.wakeWordDetected = true;
                    this.activateWakeWord();
                    this.speakResponse(this.getWakeResponse());
                    
                    // Reset wake word after 5 seconds of inactivity
                    if (this.wakeWordTimer) clearTimeout(this.wakeWordTimer);
                    this.wakeWordTimer = setTimeout(() => {
                        this.wakeWordDetected = false;
                    }, 5000);
                    return;
                }
            }
            return;
        }
        
        // Process command
        if (isFinal || transcript.length > 10) {
            this.parseAndExecuteCommand(transcript);
        }
    }
    
    parseAndExecuteCommand(transcript) {
        const currentLang = window.AppState?.language || 'en';
        const patterns = this.commandPatterns[currentLang];
        
        // Check for scene commands
        for (const [scene, keywords] of Object.entries(patterns.scene || {})) {
            for (const keyword of keywords) {
                if (transcript.includes(keyword)) {
                    this.executeScene(scene);
                    this.speakResponse(this.getConfirmationResponse());
                    this.addToHistory('command', `Scene: ${scene}`);
                    return;
                }
            }
        }
        
        // Check for device commands
        for (const [deviceType, deviceKeywords] of Object.entries(patterns.device)) {
            for (const deviceKeyword of deviceKeywords) {
                if (transcript.includes(deviceKeyword)) {
                    // Check for action
                    for (const [action, actionKeywords] of Object.entries(patterns.action)) {
                        for (const actionKeyword of actionKeywords) {
                            if (transcript.includes(actionKeyword)) {
                                this.executeDeviceCommand(deviceType, action === 'on');
                                this.speakResponse(this.getConfirmationResponse());
                                this.addToHistory('command', `${deviceType} ${action}`);
                                return;
                            }
                        }
                    }
                    
                    // Toggle if no action specified
                    this.executeDeviceCommand(deviceType, null);
                    return;
                }
            }
        }
        
        // Check for master commands
        if (transcript.includes('all on') || transcript.includes('ሁሉንም አብራ')) {
            this.executeMasterCommand(true);
            this.speakResponse(this.getConfirmationResponse());
            return;
        }
        
        if (transcript.includes('all off') || transcript.includes('ሁሉንም አጥፋ')) {
            this.executeMasterCommand(false);
            this.speakResponse(this.getConfirmationResponse());
            return;
        }
        
        // Check for temperature query
        if (transcript.includes('temperature') || transcript.includes('ሙቀት')) {
            this.getTemperature();
            return;
        }
        
        // Check for time query
        if (transcript.includes('time') || transcript.includes('ሰዓት')) {
            this.getTime();
            return;
        }
        
        // Check for help
        if (transcript.includes('help') || transcript.includes('እርዳታ')) {
            this.showHelp();
            return;
        }
        
        // No command recognized
        if (this.wakeWordDetected) {
            this.speakResponse(this.getNotFoundResponse());
        }
    }
    
    executeDeviceCommand(deviceType, state) {
        const deviceMap = {
            light: 0,
            fan: 1,
            ac: 2,
            tv: 3,
            heater: 4,
            pump: 5
        };
        
        const deviceId = deviceMap[deviceType];
        if (deviceId !== undefined && window.toggleDevice) {
            if (state === null) {
                // Toggle
                window.toggleDevice(deviceId);
            } else {
                // Set specific state
                const currentDevice = window.AppState?.devices[deviceId];
                if (currentDevice && currentDevice.state !== state) {
                    window.toggleDevice(deviceId);
                }
            }
            this.addToHistory('executed', `${deviceType} turned ${state ? 'ON' : 'OFF'}`);
        }
    }
    
    executeMasterCommand(state) {
        if (state && window.masterAllOn) {
            window.masterAllOn();
        } else if (!state && window.masterAllOff) {
            window.masterAllOff();
        }
    }
    
    executeScene(sceneName) {
        switch(sceneName) {
            case 'good morning':
                if (window.masterAllOn) window.masterAllOn();
                this.speakResponse('Good morning! Starting your day');
                break;
            case 'good night':
                if (window.masterAllOff) window.masterAllOff();
                this.speakResponse('Good night! All devices off');
                break;
            case 'movie':
                if (window.toggleDevice) {
                    window.toggleDevice(3); // TV on
                    window.toggleDevice(0); // Light off
                }
                this.speakResponse('Movie mode activated');
                break;
            case 'party':
                if (window.masterAllOn) window.masterAllOn();
                this.speakResponse('Party mode activated!');
                break;
            case 'away':
                if (window.masterAllOff) window.masterAllOff();
                this.speakResponse('Away mode activated');
                break;
        }
    }
    
    getTemperature() {
        const temp = window.AppState?.systemStats?.temperature || 23;
        const message = `Current temperature is ${temp} degrees Celsius`;
        const amMessage = `የአሁኑ ሙቀት ${temp} ዲግሪ ነው`;
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
    
    showHelp() {
        const currentLang = window.AppState?.language || 'en';
        const helpText = currentLang === 'en' 
            ? 'You can say: Light on, Light off, Fan on, All on, All off, Good morning, Good night, What\'s the temperature?'
            : 'ማለት ትችላለህ: መብራት አብራ, መብራት አጥፋ, ማራገቢያ አብራ, ሁሉንም አብራ, ሁሉንም አጥፋ, እንደምን አደርክ, ሙቀቱ ስንት ነው';
        this.speakResponse(helpText);
        this.updateVoiceDisplay(helpText);
    }
    
    getWakeResponse() {
        const responses = {
            en: ['Yes?', 'I\'m listening', 'How can I help?', 'Yes, sir?', 'At your service', 'Go ahead'],
            am: ['አዎ?', 'እያዳመጥኩ ነው', 'ምን እረዳሃለሁ?', 'አዎ አለቃ?', 'ትእዛዝዎን ይስጡ', 'ንገሩኝ']
        };
        const currentLang = window.AppState?.language || 'en';
        const responsesList = responses[currentLang];
        return responsesList[Math.floor(Math.random() * responsesList.length)];
    }
    
    getConfirmationResponse() {
        const responses = {
            en: ['Done!', 'Command executed', 'All set!', 'Okay!', 'Completed!', 'Task completed'],
            am: ['ተሰራ!', 'ትእዛዝ ተፈጸመ', 'ተዘጋጀ!', 'እሺ!', 'ተከናውኗል!', 'ተጠናቋል!']
        };
        const currentLang = window.AppState?.language || 'en';
        const responsesList = responses[currentLang];
        return responsesList[Math.floor(Math.random() * responsesList.length)];
    }
    
    getNotFoundResponse() {
        const responses = {
            en: ['Sorry, I didn\'t understand', 'Could you repeat that?', 'Command not recognized', 'I didn\'t get that'],
            am: ['ይቅርታ አልገባኝም', 'እባክህ ድገምልኝ', 'ትእዛዙ አልታወቀም', 'አልረዳሁትም']
        };
        const currentLang = window.AppState?.language || 'en';
        const responsesList = responses[currentLang];
        return responsesList[Math.floor(Math.random() * responsesList.length)];
    }
    
    speakResponse(text) {
        if (this.synthesis && text) {
            this.isSpeaking = true;
            this.synthesis.cancel();
            
            const utterance = new SpeechSynthesisUtterance(text);
            utterance.lang = window.AppState?.language === 'en' ? 'en-US' : 'am-ET';
            utterance.rate = 0.9;
            utterance.pitch = 1;
            utterance.onend = () => {
                this.isSpeaking = false;
            };
            
            this.synthesis.speak(utterance);
            this.updateVoiceDisplay(`🤖: ${text}`);
        }
    }
    
    activateWakeWord() {
        const voiceDisplay = document.getElementById('voiceCommandText');
        if (voiceDisplay) {
            voiceDisplay.style.animation = 'pulse 0.5s';
            setTimeout(() => {
                voiceDisplay.style.animation = '';
            }, 500);
        }
        
        // Add visual feedback
        const voiceBtn = document.getElementById('voiceBtn');
        if (voiceBtn) {
            voiceBtn.classList.add('wake-active');
            setTimeout(() => {
                voiceBtn.classList.remove('wake-active');
            }, 1000);
        }
    }
    
    updateUI(isListening) {
        const voiceBtn = document.getElementById('voiceBtn');
        const voiceDisplay = document.getElementById('voiceCommandText');
        
        if (voiceBtn) {
            if (isListening) {
                voiceBtn.classList.add('listening');
                voiceBtn.innerHTML = '<i class="fas fa-microphone-alt"></i><span class="pulse-ring"></span>';
            } else {
                voiceBtn.classList.remove('listening');
                voiceBtn.innerHTML = '<i class="fas fa-microphone-alt"></i>';
            }
        }
        
        if (voiceDisplay) {
            const currentLang = window.AppState?.language || 'en';
            voiceDisplay.textContent = isListening 
                ? (currentLang === 'en' 
                    ? '🎤 Listening for "Hey Estiph" or commands...' 
                    : '🎤 "ሰላም እስቲፍ" እየጠበቅኩ ነው...')
                : (currentLang === 'en' 
                    ? 'Click microphone to start voice control'
                    : 'ድምጽ ለመጠቀም ማይክሮፎኑን ይጫኑ');
        }
    }
    
    updateVoiceDisplay(text) {
        const voiceDisplay = document.getElementById('voiceCommandText');
        if (voiceDisplay) {
            voiceDisplay.textContent = text;
            voiceDisplay.classList.add('active');
            setTimeout(() => {
                voiceDisplay.classList.remove('active');
            }, 2000);
        }
    }
    
    addVoiceButton() {
        // Button is already in HTML, just add event listener
        const voiceBtn = document.getElementById('voiceBtn');
        if (voiceBtn) {
            voiceBtn.addEventListener('click', () => this.toggle());
        }
    }
    
    toggle() {
        if (this.isListening) {
            this.stop();
        } else {
            this.start();
        }
    }
    
    start() {
        if (this.recognition) {
            try {
                const currentLang = window.AppState?.language || 'en';
                this.recognition.lang = currentLang === 'en' ? 'en-US' : 'am-ET';
                this.recognition.start();
                this.isListening = true;
                this.addToHistory('system', 'Voice control started');
            } catch (e) {
                console.error('Failed to start recognition:', e);
                if (window.showToast) {
                    window.showToast('Failed to start voice recognition', 'error');
                }
            }
        }
    }
    
    stop() {
        if (this.recognition) {
            this.recognition.stop();
            this.isListening = false;
            this.wakeWordDetected = false;
            this.updateUI(false);
            this.addToHistory('system', 'Voice control stopped');
            if (window.showToast) {
                window.showToast('Voice control stopped', 'info');
            }
        }
    }
    
    addToHistory(type, message) {
        this.commandHistory.unshift({
            timestamp: Date.now(),
            type: type,
            message: message
        });
        
        // Keep last 50 commands
        if (this.commandHistory.length > 50) {
            this.commandHistory.pop();
        }
        
        localStorage.setItem('voice_history', JSON.stringify(this.commandHistory));
    }
    
    loadCommandHistory() {
        try {
            const saved = localStorage.getItem('voice_history');
            if (saved) {
                this.commandHistory = JSON.parse(saved);
            }
        } catch (e) {
            console.error('Failed to load voice history:', e);
        }
    }
    
    getCommandHistory(limit = 20) {
        return this.commandHistory.slice(0, limit);
    }
}

// Initialize Voice Control
window.voiceControl = new VoiceControl();

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = VoiceControl;
}