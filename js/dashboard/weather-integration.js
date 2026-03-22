/**
 * Weather Integration Module
 * Fetches and displays weather data, provides weather-based automation
 */

class WeatherIntegration {
    constructor() {
        this.weatherData = null;
        this.forecast = [];
        this.updateInterval = null;
        this.apiKey = null;
        this.units = 'metric'; // metric or imperial
        
        // Weather cache
        this.cache = {
            data: null,
            timestamp: null,
            duration: 30 * 60 * 1000 // 30 minutes cache
        };
        
        // Weather conditions mapping
        this.conditions = {
            en: {
                'clear': 'Clear Sky',
                'clouds': 'Cloudy',
                'rain': 'Rainy',
                'snow': 'Snowy',
                'thunderstorm': 'Thunderstorm',
                'drizzle': 'Drizzle',
                'mist': 'Misty',
                'fog': 'Foggy'
            },
            am: {
                'clear': 'ጥርት ያለ ሰማይ',
                'clouds': 'ደመናማ',
                'rain': 'ዝናባማ',
                'snow': 'በረዷማ',
                'thunderstorm': 'ነጎድጓዳማ',
                'drizzle': 'ቀስተኛ ዝናብ',
                'mist': 'ጭጋጋማ',
                'fog': 'ጭጋጋማ'
            }
        };
        
        this.init();
    }
    
    init() {
        this.loadApiKey();
        this.setupWeatherWidget();
        this.startWeatherUpdates();
        this.setupWeatherBasedAutomation();
    }
    
    loadApiKey() {
        try {
            const saved = localStorage.getItem('weather_api_key');
            if (saved) {
                this.apiKey = saved;
            } else {
                // Use free API or demo mode
                this.apiKey = null;
                console.log('Weather API key not set. Using demo mode.');
            }
        } catch (e) {
            console.error('Failed to load weather API key:', e);
        }
    }
    
    setupWeatherWidget() {
        const widget = document.getElementById('weatherWidget');
        if (widget) {
            widget.addEventListener('click', () => this.showWeatherDetails());
        }
        
        // Create weather display in sidebar
        this.createWeatherDisplay();
    }
    
    createWeatherDisplay() {
        const statusBar = document.querySelector('.system-status');
        if (statusBar && !document.getElementById('weatherDisplay')) {
            const weatherDiv = document.createElement('div');
            weatherDiv.id = 'weatherDisplay';
            weatherDiv.className = 'weather-display';
            weatherDiv.innerHTML = `
                <i class="fas fa-cloud-sun"></i>
                <span class="weather-temp">--°C</span>
                <span class="weather-condition">Loading...</span>
            `;
            statusBar.appendChild(weatherDiv);
        }
    }
    
    startWeatherUpdates() {
        // Update weather every 30 minutes
        this.updateWeather();
        this.updateInterval = setInterval(() => {
            this.updateWeather();
        }, 30 * 60 * 1000);
        
        // Update forecast every hour
        setInterval(() => {
            this.updateForecast();
        }, 60 * 60 * 1000);
    }
    
    async updateWeather() {
        // Check cache first
        if (this.cache.data && this.cache.timestamp && (Date.now() - this.cache.timestamp) < this.cache.duration) {
            this.weatherData = this.cache.data;
            this.updateDisplay();
            return;
        }
        
        // Get user's location or use default
        const location = await this.getLocation();
        
        if (this.apiKey) {
            await this.fetchWeatherFromAPI(location);
        } else {
            // Use demo weather data
            this.useDemoWeather();
        }
        
        // Update cache
        this.cache.data = this.weatherData;
        this.cache.timestamp = Date.now();
        
        this.updateDisplay();
        this.triggerWeatherAutomation();
    }
    
    async fetchWeatherFromAPI(location) {
        try {
            const response = await fetch(
                `https://api.openweathermap.org/data/2.5/weather?lat=${location.lat}&lon=${location.lon}&units=${this.units}&appid=${this.apiKey}`
            );
            
            if (!response.ok) throw new Error('Weather API request failed');
            
            const data = await response.json();
            
            this.weatherData = {
                temp: Math.round(data.main.temp),
                feelsLike: Math.round(data.main.feels_like),
                humidity: data.main.humidity,
                pressure: data.main.pressure,
                condition: data.weather[0].main.toLowerCase(),
                description: data.weather[0].description,
                icon: data.weather[0].icon,
                windSpeed: data.wind.speed,
                windDirection: data.wind.deg,
                sunrise: data.sys.sunrise,
                sunset: data.sys.sunset,
                city: data.name,
                country: data.sys.country
            };
        } catch (error) {
            console.error('Weather fetch error:', error);
            this.useDemoWeather();
        }
    }
    
    useDemoWeather() {
        // Generate realistic demo weather
        const seasons = ['clear', 'clouds', 'rain'];
        const condition = seasons[Math.floor(Math.random() * seasons.length)];
        const temp = Math.floor(Math.random() * 20) + 15; // 15-35°C
        
        this.weatherData = {
            temp: temp,
            feelsLike: temp + Math.floor(Math.random() * 3) - 1,
            humidity: Math.floor(Math.random() * 40) + 40, // 40-80%
            pressure: Math.floor(Math.random() * 30) + 1000,
            condition: condition,
            description: condition === 'clear' ? 'clear sky' : condition === 'clouds' ? 'scattered clouds' : 'light rain',
            icon: condition === 'clear' ? '01d' : condition === 'clouds' ? '03d' : '10d',
            windSpeed: Math.floor(Math.random() * 15) + 5,
            city: 'Addis Ababa',
            country: 'ET'
        };
    }
    
    async updateForecast() {
        const location = await this.getLocation();
        
        if (this.apiKey) {
            try {
                const response = await fetch(
                    `https://api.openweathermap.org/data/2.5/forecast?lat=${location.lat}&lon=${location.lon}&units=${this.units}&appid=${this.apiKey}`
                );
                
                if (response.ok) {
                    const data = await response.json();
                    this.forecast = data.list.filter((_, i) => i % 8 === 0).slice(0, 5); // One per day, 5 days
                    this.updateForecastDisplay();
                }
            } catch (error) {
                console.error('Forecast fetch error:', error);
                this.useDemoForecast();
            }
        } else {
            this.useDemoForecast();
        }
    }
    
    useDemoForecast() {
        this.forecast = [];
        const conditions = ['clear', 'clouds', 'rain', 'clear', 'clouds'];
        const temps = [24, 22, 20, 23, 25];
        
        for (let i = 0; i < 5; i++) {
            this.forecast.push({
                dt: Date.now() + (i + 1) * 24 * 60 * 60 * 1000,
                main: { temp: temps[i] },
                weather: [{ main: conditions[i], description: conditions[i] + ' sky' }]
            });
        }
    }
    
    async getLocation() {
        return new Promise((resolve) => {
            if (navigator.geolocation) {
                navigator.geolocation.getCurrentPosition(
                    (position) => {
                        resolve({
                            lat: position.coords.latitude,
                            lon: position.coords.longitude
                        });
                    },
                    () => {
                        // Default to Addis Ababa
                        resolve({ lat: 9.03, lon: 38.74 });
                    }
                );
            } else {
                resolve({ lat: 9.03, lon: 38.74 });
            }
        });
    }
    
    updateDisplay() {
        if (!this.weatherData) return;
        
        const currentLang = window.AppState?.language || 'en';
        const conditionText = this.conditions[currentLang][this.weatherData.condition] || this.weatherData.description;
        
        // Update main widget
        const widget = document.getElementById('weatherWidget');
        if (widget) {
            widget.innerHTML = `
                <i class="fas ${this.getWeatherIcon(this.weatherData.condition)}"></i>
                <span>${this.weatherData.temp}°${this.units === 'metric' ? 'C' : 'F'}</span>
            `;
        }
        
        // Update sidebar display
        const weatherDisplay = document.getElementById('weatherDisplay');
        if (weatherDisplay) {
            weatherDisplay.innerHTML = `
                <i class="fas ${this.getWeatherIcon(this.weatherData.condition)}"></i>
                <span class="weather-temp">${this.weatherData.temp}°${this.units === 'metric' ? 'C' : 'F'}</span>
                <span class="weather-condition">${conditionText}</span>
            `;
        }
        
        // Update detailed weather panel if visible
        this.updateDetailedPanel();
    }
    
    updateForecastDisplay() {
        const container = document.getElementById('weatherForecast');
        if (!container) return;
        
        const currentLang = window.AppState?.language || 'en';
        const days = currentLang === 'en' 
            ? ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
            : ['እሑድ', 'ሰኞ', 'ማክሰኞ', 'ረቡዕ', 'ሐሙስ', 'አርብ', 'ቅዳሜ'];
        
        container.innerHTML = this.forecast.map(day => {
            const date = new Date(day.dt);
            const dayName = days[date.getDay()];
            const condition = day.weather[0].main.toLowerCase();
            
            return `
                <div class="forecast-day">
                    <div class="forecast-day-name">${dayName}</div>
                    <i class="fas ${this.getWeatherIcon(condition)}"></i>
                    <div class="forecast-temp">${Math.round(day.main.temp)}°</div>
                </div>
            `;
        }).join('');
    }
    
    updateDetailedPanel() {
        const panel = document.getElementById('weatherDetails');
        if (!panel || !this.weatherData) return;
        
        const currentLang = window.AppState?.language || 'en';
        const conditionText = this.conditions[currentLang][this.weatherData.condition] || this.weatherData.description;
        
        panel.innerHTML = `
            <div class="weather-main">
                <div class="weather-temp-large">${this.weatherData.temp}°${this.units === 'metric' ? 'C' : 'F'}</div>
                <div class="weather-condition-large">${conditionText}</div>
                <div class="weather-feels">${currentLang === 'en' ? 'Feels like' : 'የሚሰማው'} ${this.weatherData.feelsLike}°</div>
            </div>
            <div class="weather-details-grid">
                <div class="weather-detail">
                    <i class="fas fa-tint"></i>
                    <span>${currentLang === 'en' ? 'Humidity' : 'እርጥበት'}</span>
                    <strong>${this.weatherData.humidity}%</strong>
                </div>
                <div class="weather-detail">
                    <i class="fas fa-wind"></i>
                    <span>${currentLang === 'en' ? 'Wind' : 'ነፋስ'}</span>
                    <strong>${this.weatherData.windSpeed} ${this.units === 'metric' ? 'm/s' : 'mph'}</strong>
                </div>
                <div class="weather-detail">
                    <i class="fas fa-tachometer-alt"></i>
                    <span>${currentLang === 'en' ? 'Pressure' : 'ግፊት'}</span>
                    <strong>${this.weatherData.pressure} hPa</strong>
                </div>
                <div class="weather-detail">
                    <i class="fas fa-map-marker-alt"></i>
                    <span>${currentLang === 'en' ? 'Location' : 'ቦታ'}</span>
                    <strong>${this.weatherData.city}</strong>
                </div>
            </div>
        `;
    }
    
    getWeatherIcon(condition) {
        const icons = {
            'clear': 'fa-sun',
            'clouds': 'fa-cloud',
            'rain': 'fa-cloud-rain',
            'snow': 'fa-snowflake',
            'thunderstorm': 'fa-bolt',
            'drizzle': 'fa-cloud-rain',
            'mist': 'fa-smog',
            'fog': 'fa-smog'
        };
        return icons[condition] || 'fa-cloud-sun';
    }
    
    triggerWeatherAutomation() {
        if (!this.weatherData) return;
        
        const condition = this.weatherData.condition;
        const temp = this.weatherData.temp;
        
        // Weather-based automation rules
        const automations = [];
        
        // AC automation based on temperature
        if (temp > 28 && window.AppState?.devices[2]) {
            automations.push({
                deviceId: 2,
                action: 'on',
                reason: 'High temperature detected'
            });
        } else if (temp < 18 && window.AppState?.devices[4]) {
            automations.push({
                deviceId: 4,
                action: 'on',
                reason: 'Low temperature detected'
            });
        }
        
        // Light automation based on cloud cover
        if (condition === 'clouds' || condition === 'rain') {
            automations.push({
                deviceId: 0,
                action: 'on',
                reason: 'Dark outside due to weather'
            });
        }
        
        // Pump automation based on rain
        if (condition === 'rain' && window.AppState?.devices[5]?.state) {
            automations.push({
                deviceId: 5,
                action: 'off',
                reason: 'Raining, pump not needed'
            });
        }
        
        // Apply automations if auto mode is enabled
        automations.forEach(auto => {
            if (window.AppState?.devices[auto.deviceId]?.autoMode) {
                if (window.toggleDevice && window.AppState.devices[auto.deviceId].state !== (auto.action === 'on')) {
                    window.toggleDevice(auto.deviceId);
                    if (window.showToast) {
                        window.showToast(`Weather automation: ${auto.reason}`, 'info');
                    }
                }
            }
        });
    }
    
    setupWeatherBasedAutomation() {
        // Check weather conditions every 15 minutes
        setInterval(() => {
            this.triggerWeatherAutomation();
        }, 15 * 60 * 1000);
    }
    
    showWeatherDetails() {
        const modal = document.getElementById('weatherModal');
        if (!modal) {
            this.createWeatherModal();
        } else {
            modal.style.display = 'flex';
            this.updateDetailedPanel();
            this.updateForecastDisplay();
        }
    }
    
    createWeatherModal() {
        const modal = document.createElement('div');
        modal.id = 'weatherModal';
        modal.className = 'modal-overlay';
        modal.innerHTML = `
            <div class="modal weather-modal">
                <div class="modal-header">
                    <h3><i class="fas fa-cloud-sun"></i> Weather Forecast</h3>
                    <button class="modal-close" onclick="this.closest('.modal-overlay').style.display='none'">&times;</button>
                </div>
                <div class="modal-body">
                    <div id="weatherDetails"></div>
                    <div class="forecast-title">5-Day Forecast</div>
                    <div id="weatherForecast" class="weather-forecast"></div>
                </div>
                <div class="modal-footer">
                    <button class="btn-secondary" onclick="this.closest('.modal-overlay').style.display='none'">Close</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        this.updateDetailedPanel();
        this.updateForecastDisplay();
    }
    
    setUnits(units) {
        this.units = units;
        this.updateWeather();
        localStorage.setItem('weather_units', units);
    }
    
    getWeatherAdvice() {
        if (!this.weatherData) return null;
        
        const currentLang = window.AppState?.language || 'en';
        const temp = this.weatherData.temp;
        const condition = this.weatherData.condition;
        
        const advice = {
            en: [],
            am: []
        };
        
        if (temp > 30) {
            advice.en.push('It\'s very hot. Consider using AC and staying hydrated.');
            advice.am.push('ሙቀቱ በጣም ከፍተኛ ነው። ኤሲ ይጠቀሙ እና ብዙ ውሃ ይጠጡ።');
        } else if (temp < 10) {
            advice.en.push('It\'s cold. Wear warm clothes and use heater.');
            advice.am.push('ቀዝቃዛ ነው። ሙቅ ልብስ ይልበሱ እና ማሞቂያ ይጠቀሙ።');
        }
        
        if (condition === 'rain') {
            advice.en.push('It\'s raining. Take an umbrella and be careful on the road.');
            advice.am.push('ዝናብ እየዘነበ ነው። ጃንጥላ ይያዙ እና በመንገድ ላይ ይጠንቀቁ።');
        }
        
        return advice[currentLang][0] || (currentLang === 'en' ? 'Weather is pleasant. Enjoy your day!' : 'የአየር ሁኔታው ጥሩ ነው። ቀንዎን ይደሰቱበት!');
    }
    
    exportWeatherData() {
        return {
            current: this.weatherData,
            forecast: this.forecast,
            timestamp: new Date().toISOString(),
            units: this.units
        };
    }
    
    destroy() {
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
        }
    }
}

// Initialize Weather Integration
window.weatherIntegration = new WeatherIntegration();

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = WeatherIntegration;
}