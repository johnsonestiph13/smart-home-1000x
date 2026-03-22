/**
 * Scene Manager Module
 * Manages smart scenes for different activities and moods
 */

class SceneManager {
    constructor() {
        this.scenes = [];
        this.activeScene = null;
        this.sceneHistory = [];
        this.sceneTemplates = {
            en: {
                'good-morning': {
                    name: 'Good Morning',
                    icon: '🌅',
                    description: 'Start your day with energy',
                    devices: [
                        { id: 0, state: true, delay: 0 },  // Light on
                        { id: 1, state: true, delay: 0 },  // Fan on
                        { id: 2, state: false, delay: 0 }  // AC off
                    ],
                    schedule: { hour: 6, minute: 30, enabled: true },
                    days: [1, 2, 3, 4, 5] // Weekdays
                },
                'good-night': {
                    name: 'Good Night',
                    icon: '🌙',
                    description: 'Prepare for sleep',
                    devices: [
                        { id: 0, state: false, delay: 0 },  // Light off
                        { id: 1, state: false, delay: 0 },  // Fan off
                        { id: 2, state: true, delay: 0 },   // AC on (cool)
                        { id: 4, state: false, delay: 0 }   // Heater off
                    ],
                    schedule: { hour: 22, minute: 0, enabled: true },
                    days: [0, 1, 2, 3, 4, 5, 6] // Every day
                },
                'movie': {
                    name: 'Movie Time',
                    icon: '🎬',
                    description: 'Perfect for watching movies',
                    devices: [
                        { id: 0, state: false, delay: 0 },  // Light off
                        { id: 3, state: true, delay: 0 },   // TV on
                        { id: 1, state: true, delay: 0 },   // Fan on
                        { id: 2, state: true, delay: 0 }    // AC on
                    ]
                },
                'party': {
                    name: 'Party Mode',
                    icon: '🎉',
                    description: 'Get the party started',
                    devices: [
                        { id: 0, state: true, delay: 0 },   // Light on
                        { id: 1, state: true, delay: 0 },   // Fan on
                        { id: 2, state: true, delay: 0 },   // AC on
                        { id: 3, state: true, delay: 0 },   // TV on
                        { id: 5, state: false, delay: 0 }   // Pump off
                    ]
                },
                'away': {
                    name: 'Away Mode',
                    icon: '✈️',
                    description: 'Secure your home while away',
                    devices: [
                        { id: 0, state: false, delay: 0 },  // All off
                        { id: 1, state: false, delay: 0 },
                        { id: 2, state: false, delay: 0 },
                        { id: 3, state: false, delay: 0 },
                        { id: 4, state: false, delay: 0 },
                        { id: 5, state: false, delay: 0 }
                    ],
                    randomize: true, // Randomize some lights for security
                    security: true
                },
                'romantic': {
                    name: 'Romantic',
                    icon: '❤️',
                    description: 'Set the mood',
                    devices: [
                        { id: 0, state: true, dimmer: 30, delay: 0 },  // Light dim
                        { id: 1, state: true, delay: 0 },   // Fan on
                        { id: 2, state: true, delay: 0 },   // AC on
                        { id: 3, state: true, delay: 0 }    // Music/TV on
                    ]
                },
                'reading': {
                    name: 'Reading Mode',
                    icon: '📚',
                    description: 'Perfect for reading',
                    devices: [
                        { id: 0, state: true, dimmer: 70, delay: 0 },  // Light bright
                        { id: 1, state: true, delay: 0 },   // Fan on
                        { id: 2, state: true, delay: 0 }    // AC on
                    ]
                },
                'energy-saver': {
                    name: 'Energy Saver',
                    icon: '💚',
                    description: 'Optimize energy consumption',
                    devices: [
                        { id: 0, state: false, delay: 0 },  // Lights off
                        { id: 1, state: true, delay: 0 },   // Fan on (low power)
                        { id: 2, state: false, delay: 0 },  // AC off
                        { id: 3, state: false, delay: 0 },  // TV off
                        { id: 4, state: false, delay: 0 },  // Heater off
                        { id: 5, state: false, delay: 0 }   // Pump off
                    ]
                }
            },
            am: {
                'good-morning': {
                    name: 'እንደምን አደርክ',
                    icon: '🌅',
                    description: 'ቀንዎን በኃይል ይጀምሩ',
                    devices: [
                        { id: 0, state: true, delay: 0 },
                        { id: 1, state: true, delay: 0 },
                        { id: 2, state: false, delay: 0 }
                    ]
                },
                'good-night': {
                    name: 'መልካም ሌሊት',
                    icon: '🌙',
                    description: 'ለእንቅልፍ ይዘጋጁ',
                    devices: [
                        { id: 0, state: false, delay: 0 },
                        { id: 1, state: false, delay: 0 },
                        { id: 2, state: true, delay: 0 },
                        { id: 4, state: false, delay: 0 }
                    ]
                }
            }
        };
        
        this.init();
    }
    
    init() {
        this.loadScenes();
        this.setupSceneTriggers();
        this.renderScenes();
    }
    
    loadScenes() {
        try {
            const saved = localStorage.getItem('custom_scenes');
            if (saved) {
                this.scenes = JSON.parse(saved);
            } else {
                // Load default scenes
                const currentLang = window.AppState?.language || 'en';
                const templates = this.sceneTemplates[currentLang] || this.sceneTemplates.en;
                this.scenes = Object.entries(templates).map(([id, data]) => ({
                    id: id,
                    ...data,
                    createdAt: Date.now(),
                    usageCount: 0
                }));
            }
        } catch (e) {
            console.error('Failed to load scenes:', e);
        }
    }
    
    setupSceneTriggers() {
        // Check for scheduled scenes every minute
        setInterval(() => {
            this.checkScheduledScenes();
        }, 60000);
        
        // Check for time-based scenes (every minute)
        setInterval(() => {
            this.checkTimeBasedScenes();
        }, 60000);
    }
    
    checkScheduledScenes() {
        const now = new Date();
        const currentHour = now.getHours();
        const currentMinute = now.getMinutes();
        const currentDay = now.getDay();
        
        this.scenes.forEach(scene => {
            if (scene.schedule && scene.schedule.enabled) {
                const { hour, minute } = scene.schedule;
                if (hour === currentHour && minute === currentMinute) {
                    const daysMatch = !scene.days || scene.days.includes(currentDay);
                    if (daysMatch) {
                        this.activateScene(scene.id, 'schedule');
                    }
                }
            }
        });
    }
    
    checkTimeBasedScenes() {
        const now = new Date();
        const hour = now.getHours();
        
        // Auto morning scene (6-8 AM)
        if (hour >= 6 && hour <= 8) {
            const morningScene = this.scenes.find(s => s.id === 'good-morning');
            if (morningScene && !morningScene.lastTriggeredToday) {
                this.activateScene('good-morning', 'time-based');
                morningScene.lastTriggeredToday = true;
                setTimeout(() => {
                    if (morningScene) morningScene.lastTriggeredToday = false;
                }, 24 * 60 * 60 * 1000);
            }
        }
        
        // Auto night scene (10-11 PM)
        if (hour >= 22 || hour <= 1) {
            const nightScene = this.scenes.find(s => s.id === 'good-night');
            if (nightScene && !nightScene.lastTriggeredToday) {
                this.activateScene('good-night', 'time-based');
                nightScene.lastTriggeredToday = true;
                setTimeout(() => {
                    if (nightScene) nightScene.lastTriggeredToday = false;
                }, 24 * 60 * 60 * 1000);
            }
        }
    }
    
    async activateScene(sceneId, trigger = 'manual') {
        const scene = this.scenes.find(s => s.id === sceneId);
        if (!scene) return false;
        
        this.activeScene = sceneId;
        
        // Apply all device states
        for (const deviceConfig of scene.devices) {
            if (window.toggleDevice) {
                const currentDevice = window.AppState?.devices[deviceConfig.id];
                if (currentDevice && currentDevice.state !== deviceConfig.state) {
                    // Apply delay if specified
                    if (deviceConfig.delay && deviceConfig.delay > 0) {
                        setTimeout(() => {
                            window.toggleDevice(deviceConfig.id);
                        }, deviceConfig.delay);
                    } else {
                        window.toggleDevice(deviceConfig.id);
                    }
                }
            }
        }
        
        // Update scene usage
        scene.usageCount = (scene.usageCount || 0) + 1;
        scene.lastTriggered = Date.now();
        scene.lastTriggeredBy = trigger;
        this.saveScenes();
        
        // Add to history
        this.sceneHistory.unshift({
            id: sceneId,
            name: scene.name,
            icon: scene.icon,
            trigger: trigger,
            timestamp: Date.now()
        });
        
        // Keep last 50 scenes
        if (this.sceneHistory.length > 50) {
            this.sceneHistory.pop();
        }
        
        localStorage.setItem('scene_history', JSON.stringify(this.sceneHistory));
        
        // Show notification
        if (window.showToast) {
            window.showToast(`🎬 Scene activated: ${scene.name}`, 'success');
        }
        
        this.renderScenes();
        
        return true;
    }
    
    createScene(name, icon, description, devices, schedule = null) {
        const newScene = {
            id: `scene_${Date.now()}`,
            name: name,
            icon: icon || '🎯',
            description: description || 'Custom scene',
            devices: devices,
            schedule: schedule,
            createdAt: Date.now(),
            usageCount: 0,
            isCustom: true
        };
        
        this.scenes.push(newScene);
        this.saveScenes();
        this.renderScenes();
        
        if (window.showToast) {
            window.showToast(`Scene created: ${name}`, 'success');
        }
        
        return newScene;
    }
    
    updateScene(sceneId, updates) {
        const sceneIndex = this.scenes.findIndex(s => s.id === sceneId);
        if (sceneIndex !== -1) {
            this.scenes[sceneIndex] = { ...this.scenes[sceneIndex], ...updates };
            this.saveScenes();
            this.renderScenes();
            return true;
        }
        return false;
    }
    
    deleteScene(sceneId) {
        const sceneIndex = this.scenes.findIndex(s => s.id === sceneId);
        if (sceneIndex !== -1) {
            const scene = this.scenes[sceneIndex];
            if (scene.isCustom) {
                this.scenes.splice(sceneIndex, 1);
                this.saveScenes();
                this.renderScenes();
                if (window.showToast) {
                    window.showToast(`Scene deleted: ${scene.name}`, 'info');
                }
                return true;
            }
        }
        return false;
    }
    
    saveScenes() {
        try {
            localStorage.setItem('custom_scenes', JSON.stringify(this.scenes));
        } catch (e) {
            console.error('Failed to save scenes:', e);
        }
    }
    
    renderScenes() {
        const container = document.getElementById('scenesGrid');
        if (!container) return;
        
        if (this.scenes.length === 0) {
            container.innerHTML = '<div class="empty-state">No scenes created. Click + to create your first scene!</div>';
            return;
        }
        
        container.innerHTML = this.scenes.map(scene => `
            <div class="scene-card" onclick="window.sceneManager.activateScene('${scene.id}')">
                <div class="scene-icon">${scene.icon}</div>
                <div class="scene-info">
                    <div class="scene-name">${scene.name}</div>
                    <div class="scene-description">${scene.description || ''}</div>
                    ${scene.schedule ? `<div class="scene-schedule">⏰ ${scene.schedule.hour}:${scene.schedule.minute.toString().padStart(2, '0')}</div>` : ''}
                </div>
                <div class="scene-stats">
                    <div class="scene-usage">${scene.usageCount || 0} uses</div>
                    ${scene.isCustom ? `
                        <button class="scene-delete" onclick="event.stopPropagation(); window.sceneManager.deleteScene('${scene.id}')">
                            <i class="fas fa-trash"></i>
                        </button>
                    ` : ''}
                </div>
            </div>
        `).join('');
    }
    
    getSceneHistory(limit = 20) {
        return this.sceneHistory.slice(0, limit);
    }
    
    getMostUsedScenes(limit = 5) {
        return [...this.scenes]
            .sort((a, b) => (b.usageCount || 0) - (a.usageCount || 0))
            .slice(0, limit);
    }
    
    getSceneSuggestions() {
        const suggestions = [];
        const currentHour = new Date().getHours();
        
        if (currentHour >= 5 && currentHour <= 9) {
            suggestions.push('good-morning');
        }
        if (currentHour >= 21 || currentHour <= 1) {
            suggestions.push('good-night');
        }
        
        // Check for movie time (evening)
        if (currentHour >= 19 && currentHour <= 22) {
            suggestions.push('movie');
        }
        
        return suggestions;
    }
    
    async applySceneWithTransition(sceneId, transitionMs = 1000) {
        const scene = this.scenes.find(s => s.id === sceneId);
        if (!scene) return false;
        
        // Apply with gradual transition
        for (const deviceConfig of scene.devices) {
            const targetState = deviceConfig.state;
            const currentDevice = window.AppState?.devices[deviceConfig.id];
            
            if (currentDevice && currentDevice.state !== targetState) {
                // Gradual transition simulation
                const steps = 10;
                const stepDelay = transitionMs / steps;
                
                for (let i = 1; i <= steps; i++) {
                    setTimeout(() => {
                        // Visual feedback only - actual toggle at end
                        if (i === steps) {
                            window.toggleDevice(deviceConfig.id);
                        }
                    }, i * stepDelay);
                }
            }
        }
        
        return true;
    }
    
    exportScenes() {
        return JSON.stringify(this.scenes, null, 2);
    }
    
    importScenes(jsonData) {
        try {
            const imported = JSON.parse(jsonData);
            if (Array.isArray(imported)) {
                this.scenes = [...this.scenes.filter(s => !s.isCustom), ...imported];
                this.saveScenes();
                this.renderScenes();
                return true;
            }
        } catch (e) {
            console.error('Failed to import scenes:', e);
        }
        return false;
    }
}

// Initialize Scene Manager
window.sceneManager = new SceneManager();

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = SceneManager;
}