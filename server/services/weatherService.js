/**
 * Weather Service
 * Fetches and manages weather data from multiple sources
 */

const axios = require('axios');
const NodeCache = require('node-cache');

class WeatherService {
    constructor() {
        this.apiKey = process.env.OPENWEATHER_API_KEY;
        this.cache = new NodeCache({ stdTTL: 1800 }); // 30 minutes cache
        this.currentWeather = null;
        this.forecast = [];
        
        this.init();
    }
    
    init() {
        // Start periodic weather updates
        setInterval(() => this.updateWeather(), 30 * 60 * 1000); // Every 30 minutes
        setInterval(() => this.updateForecast(), 60 * 60 * 1000); // Every hour
        
        // Initial update
        this.updateWeather();
        this.updateForecast();
    }
    
    /**
     * Get current weather for location
     */
    async getCurrentWeather(lat, lon) {
        const cacheKey = `weather_${lat}_${lon}`;
        const cached = this.cache.get(cacheKey);
        
        if (cached) {
            return cached;
        }
        
        try {
            let weatherData;
            
            if (this.apiKey) {
                const response = await axios.get('https://api.openweathermap.org/data/2.5/weather', {
                    params: {
                        lat,
                        lon,
                        units: 'metric',
                        appid: this.apiKey
                    }
                });
                weatherData = this.parseWeatherData(response.data);
            } else {
                // Use demo data if no API key
                weatherData = this.getDemoWeather();
            }
            
            this.cache.set(cacheKey, weatherData);
            this.currentWeather = weatherData;
            
            return weatherData;
        } catch (error) {
            console.error('Failed to fetch weather:', error);
            return this.getDemoWeather();
        }
    }
    
    /**
     * Get weather forecast
     */
    async getForecast(lat, lon, days = 5) {
        const cacheKey = `forecast_${lat}_${lon}_${days}`;
        const cached = this.cache.get(cacheKey);
        
        if (cached) {
            return cached;
        }
        
        try {
            let forecastData;
            
            if (this.apiKey) {
                const response = await axios.get('https://api.openweathermap.org/data/2.5/forecast', {
                    params: {
                        lat,
                        lon,
                        units: 'metric',
                        cnt: days * 8, // 3-hour intervals
                        appid: this.apiKey
                    }
                });
                forecastData = this.parseForecastData(response.data, days);
            } else {
                forecastData = this.getDemoForecast(days);
            }
            
            this.cache.set(cacheKey, forecastData);
            this.forecast = forecastData;
            
            return forecastData;
        } catch (error) {
            console.error('Failed to fetch forecast:', error);
            return this.getDemoForecast(days);
        }
    }
    
    /**
     * Parse OpenWeatherMap weather data
     */
    parseWeatherData(data) {
        return {
            location: {
                name: data.name,
                country: data.sys.country,
                lat: data.coord.lat,
                lon: data.coord.lon
            },
            temperature: {
                current: Math.round(data.main.temp),
                feelsLike: Math.round(data.main.feels_like),
                min: Math.round(data.main.temp_min),
                max: Math.round(data.main.temp_max)
            },
            humidity: data.main.humidity,
            pressure: data.main.pressure,
            condition: {
                main: data.weather[0].main.toLowerCase(),
                description: data.weather[0].description,
                icon: data.weather[0].icon
            },
            wind: {
                speed: data.wind.speed,
                direction: data.wind.deg
            },
            clouds: data.clouds.all,
            visibility: data.visibility,
            sunrise: new Date(data.sys.sunrise * 1000),
            sunset: new Date(data.sys.sunset * 1000),
            timestamp: new Date(data.dt * 1000)
        };
    }
    
    /**
     * Parse forecast data
     */
    parseForecastData(data, days) {
        const dailyForecasts = [];
        const dailyData = {};
        
        // Group by day
        data.list.forEach(item => {
            const date = new Date(item.dt * 1000);
            const dayKey = date.toDateString();
            
            if (!dailyData[dayKey]) {
                dailyData[dayKey] = {
                    date: date,
                    temps: [],
                    conditions: [],
                    humidity: [],
                    wind: []
                };
            }
            
            dailyData[dayKey].temps.push(item.main.temp);
            dailyData[dayKey].conditions.push(item.weather[0].main.toLowerCase());
            dailyData[dayKey].humidity.push(item.main.humidity);
            dailyData[dayKey].wind.push(item.wind.speed);
        });
        
        // Aggregate daily data
        for (const [key, day] of Object.entries(dailyData)) {
            if (dailyForecasts.length >= days) break;
            
            const mostCommonCondition = this.getMostCommon(day.conditions);
            
            dailyForecasts.push({
                date: day.date,
                temperature: {
                    min: Math.round(Math.min(...day.temps)),
                    max: Math.round(Math.max(...day.temps)),
                    avg: Math.round(day.temps.reduce((a, b) => a + b, 0) / day.temps.length)
                },
                condition: mostCommonCondition,
                conditionDescription: this.getConditionDescription(mostCommonCondition),
                humidity: Math.round(day.humidity.reduce((a, b) => a + b, 0) / day.humidity.length),
                windSpeed: Math.round(day.wind.reduce((a, b) => a + b, 0) / day.wind.length),
                icon: this.getWeatherIcon(mostCommonCondition)
            });
        }
        
        return dailyForecasts;
    }
    
    /**
     * Get demo weather data (fallback)
     */
    getDemoWeather() {
        return {
            location: {
                name: 'Addis Ababa',
                country: 'ET',
                lat: 9.03,
                lon: 38.74
            },
            temperature: {
                current: 23,
                feelsLike: 22,
                min: 18,
                max: 26
            },
            humidity: 45,
            pressure: 1015,
            condition: {
                main: 'clear',
                description: 'clear sky',
                icon: '01d'
            },
            wind: {
                speed: 3.5,
                direction: 120
            },
            clouds: 10,
            visibility: 10000,
            sunrise: new Date(),
            sunset: new Date(),
            timestamp: new Date()
        };
    }
    
    /**
     * Get demo forecast
     */
    getDemoForecast(days) {
        const conditions = ['clear', 'clouds', 'rain', 'clear', 'clouds'];
        const temps = [24, 22, 20, 23, 25];
        
        const forecasts = [];
        const now = new Date();
        
        for (let i = 1; i <= days; i++) {
            const date = new Date(now);
            date.setDate(date.getDate() + i);
            
            forecasts.push({
                date: date,
                temperature: {
                    min: temps[i - 1] - 3,
                    max: temps[i - 1],
                    avg: temps[i - 1] - 1
                },
                condition: conditions[i - 1],
                conditionDescription: this.getConditionDescription(conditions[i - 1]),
                humidity: 45 + Math.floor(Math.random() * 20),
                windSpeed: 3 + Math.random() * 4,
                icon: this.getWeatherIcon(conditions[i - 1])
            });
        }
        
        return forecasts;
    }
    
    /**
     * Update current weather
     */
    async updateWeather() {
        try {
            const location = await this.getLocation();
            const weather = await this.getCurrentWeather(location.lat, location.lon);
            
            // Emit weather update via WebSocket
            const io = global.io;
            if (io) {
                io.emit('weather_update', weather);
            }
            
            return weather;
        } catch (error) {
            console.error('Weather update failed:', error);
            return null;
        }
    }
    
    /**
     * Update forecast
     */
    async updateForecast() {
        try {
            const location = await this.getLocation();
            const forecast = await this.getForecast(location.lat, location.lon);
            
            // Emit forecast update
            const io = global.io;
            if (io) {
                io.emit('forecast_update', forecast);
            }
            
            return forecast;
        } catch (error) {
            console.error('Forecast update failed:', error);
            return null;
        }
    }
    
    /**
     * Get user location (with fallback)
     */
    async getLocation() {
        // In production, get from user preferences or IP geolocation
        return {
            lat: 9.03,
            lon: 38.74
        };
    }
    
    /**
     * Get weather-based automation suggestions
     */
    async getAutomationSuggestions(weather) {
        const suggestions = [];
        
        if (!weather) return suggestions;
        
        // Temperature-based suggestions
        if (weather.temperature.current > 28) {
            suggestions.push({
                type: 'temperature',
                device: 'ac',
                action: 'on',
                reason: 'High temperature detected',
                priority: 'high'
            });
        } else if (weather.temperature.current < 18) {
            suggestions.push({
                type: 'temperature',
                device: 'heater',
                action: 'on',
                reason: 'Low temperature detected',
                priority: 'high'
            });
        }
        
        // Rain-based suggestions
        if (weather.condition.main === 'rain') {
            suggestions.push({
                type: 'weather',
                device: 'pump',
                action: 'off',
                reason: 'Raining, pump not needed',
                priority: 'medium'
            });
        }
        
        // Cloud cover suggestions
        if (weather.clouds > 70) {
            suggestions.push({
                type: 'lighting',
                device: 'light',
                action: 'on',
                reason: 'Dark outside due to clouds',
                priority: 'low'
            });
        }
        
        // Wind suggestions
        if (weather.wind.speed > 10) {
            suggestions.push({
                type: 'safety',
                device: 'fan',
                action: 'off',
                reason: 'High winds detected',
                priority: 'medium'
            });
        }
        
        return suggestions;
    }
    
    /**
     * Get energy-saving suggestions based on weather
     */
    async getEnergySuggestions(weather) {
        const suggestions = [];
        
        if (!weather) return suggestions;
        
        // Solar potential
        const solarPotential = this.calculateSolarPotential(weather);
        if (solarPotential > 0.7) {
            suggestions.push({
                type: 'energy',
                message: 'High solar potential today. Consider using solar-powered devices.',
                savings: '15-25%',
                priority: 'medium'
            });
        }
        
        // Natural cooling/heating
        if (weather.temperature.current < 22 && weather.wind.speed > 3) {
            suggestions.push({
                type: 'energy',
                message: 'Natural ventilation available. Consider opening windows instead of AC.',
                savings: '20-30%',
                priority: 'medium'
            });
        }
        
        return suggestions;
    }
    
    /**
     * Calculate solar energy potential
     */
    calculateSolarPotential(weather) {
        let score = 0.5; // Base score
        
        // Clear skies increase potential
        if (weather.condition.main === 'clear') score += 0.3;
        if (weather.condition.main === 'clouds') score -= 0.2;
        if (weather.condition.main === 'rain') score -= 0.4;
        
        // Time of day factor
        const hour = new Date().getHours();
        if (hour >= 10 && hour <= 14) score += 0.2;
        
        return Math.min(1, Math.max(0, score));
    }
    
    /**
     * Get condition description in user's language
     */
    getConditionDescription(condition, language = 'en') {
        const descriptions = {
            en: {
                clear: 'Clear Sky',
                clouds: 'Cloudy',
                rain: 'Rainy',
                snow: 'Snowy',
                thunderstorm: 'Thunderstorm',
                drizzle: 'Drizzle',
                mist: 'Misty',
                fog: 'Foggy'
            },
            am: {
                clear: 'ጥርት ያለ ሰማይ',
                clouds: 'ደመናማ',
                rain: 'ዝናባማ',
                snow: 'በረዷማ',
                thunderstorm: 'ነጎድጓዳማ',
                drizzle: 'ቀስተኛ ዝናብ',
                mist: 'ጭጋጋማ',
                fog: 'ጭጋጋማ'
            }
        };
        
        return descriptions[language][condition] || condition;
    }
    
    /**
     * Get weather icon
     */
    getWeatherIcon(condition) {
        const icons = {
            clear: '☀️',
            clouds: '☁️',
            rain: '🌧️',
            snow: '❄️',
            thunderstorm: '⛈️',
            drizzle: '🌦️',
            mist: '🌫️',
            fog: '🌫️'
        };
        return icons[condition] || '🌤️';
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
     * Get weather alert if any
     */
    async getWeatherAlerts(lat, lon) {
        try {
            if (!this.apiKey) return [];
            
            const response = await axios.get('https://api.openweathermap.org/data/2.5/onecall', {
                params: {
                    lat,
                    lon,
                    exclude: 'current,minutely,hourly,daily',
                    appid: this.apiKey
                }
            });
            
            const alerts = response.data.alerts || [];
            return alerts.map(alert => ({
                title: alert.title,
                description: alert.description,
                start: new Date(alert.start * 1000),
                end: new Date(alert.end * 1000),
                severity: this.parseAlertSeverity(alert.tags)
            }));
        } catch (error) {
            console.error('Failed to fetch weather alerts:', error);
            return [];
        }
    }
    
    /**
     * Parse alert severity
     */
    parseAlertSeverity(tags) {
        if (tags.includes('extreme')) return 'critical';
        if (tags.includes('severe')) return 'high';
        if (tags.includes('moderate')) return 'medium';
        return 'low';
    }
    
    /**
     * Get weather summary for voice assistant
     */
    getWeatherSummary(weather, language = 'en') {
        if (!weather) return 'Weather data unavailable';
        
        const condition = this.getConditionDescription(weather.condition.main, language);
        const temp = weather.temperature.current;
        
        if (language === 'am') {
            return `የአየር ሁኔታው ${condition} ነው። ሙቀቱ ${temp} ዲግሪ ነው።`;
        }
        
        return `The weather is ${condition} with a temperature of ${temp} degrees Celsius.`;
    }
}

module.exports = new WeatherService();