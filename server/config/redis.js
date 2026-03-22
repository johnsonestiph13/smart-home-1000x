/**
 * Redis Configuration
 * Handles Redis connection, caching, and session management
 */

const Redis = require('redis');
const NodeCache = require('node-cache');

class RedisConfig {
    constructor() {
        this.client = null;
        this.isConnected = false;
        this.memoryCache = new NodeCache({ stdTTL: 3600, checkperiod: 120 });
        this.useMemoryFallback = false;
        this.retryCount = 0;
        this.maxRetries = 5;
        
        this.init();
    }
    
    init() {
        this.connect();
    }
    
    /**
     * Connect to Redis
     */
    async connect() {
        const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
        
        try {
            console.log('Connecting to Redis...');
            
            this.client = Redis.createClient({
                url: redisUrl,
                socket: {
                    reconnectStrategy: (retries) => {
                        if (retries > this.maxRetries) {
                            console.error('Max Redis reconnection attempts reached');
                            this.useMemoryFallback = true;
                            return false;
                        }
                        return Math.min(retries * 100, 3000);
                    }
                }
            });
            
            this.client.on('connect', () => {
                console.log('✅ Redis connected successfully');
                this.isConnected = true;
                this.retryCount = 0;
                this.useMemoryFallback = false;
            });
            
            this.client.on('error', (err) => {
                console.error('Redis connection error:', err.message);
                this.isConnected = false;
                
                if (!this.useMemoryFallback) {
                    console.log('⚠️ Falling back to in-memory cache');
                    this.useMemoryFallback = true;
                }
            });
            
            this.client.on('reconnecting', () => {
                console.log('Redis reconnecting...');
            });
            
            await this.client.connect();
            
        } catch (error) {
            console.error('❌ Failed to connect to Redis:', error.message);
            this.isConnected = false;
            this.useMemoryFallback = true;
            console.log('⚠️ Using in-memory cache fallback');
        }
    }
    
    /**
     * Disconnect from Redis
     */
    async disconnect() {
        if (this.client && this.isConnected) {
            await this.client.quit();
            console.log('Redis disconnected');
            this.isConnected = false;
        }
    }
    
    /**
     * Set value in cache
     */
    async set(key, value, ttl = 3600) {
        const serialized = typeof value === 'object' ? JSON.stringify(value) : String(value);
        
        if (this.isConnected && !this.useMemoryFallback) {
            try {
                await this.client.setEx(key, ttl, serialized);
                return true;
            } catch (error) {
                console.error('Redis set error:', error);
                // Fallback to memory cache
                this.memoryCache.set(key, value, ttl);
                return false;
            }
        } else {
            // Use memory cache fallback
            this.memoryCache.set(key, value, ttl);
            return true;
        }
    }
    
    /**
     * Get value from cache
     */
    async get(key) {
        if (this.isConnected && !this.useMemoryFallback) {
            try {
                const value = await this.client.get(key);
                if (value === null) return null;
                
                // Try to parse JSON
                try {
                    return JSON.parse(value);
                } catch {
                    return value;
                }
            } catch (error) {
                console.error('Redis get error:', error);
                // Fallback to memory cache
                return this.memoryCache.get(key);
            }
        } else {
            // Use memory cache fallback
            return this.memoryCache.get(key);
        }
    }
    
    /**
     * Delete value from cache
     */
    async del(key) {
        if (this.isConnected && !this.useMemoryFallback) {
            try {
                await this.client.del(key);
            } catch (error) {
                console.error('Redis del error:', error);
            }
        }
        
        // Also delete from memory cache
        this.memoryCache.del(key);
        return true;
    }
    
    /**
     * Check if key exists
     */
    async exists(key) {
        if (this.isConnected && !this.useMemoryFallback) {
            try {
                return await this.client.exists(key) === 1;
            } catch (error) {
                console.error('Redis exists error:', error);
                return this.memoryCache.has(key);
            }
        } else {
            return this.memoryCache.has(key);
        }
    }
    
    /**
     * Set hash field
     */
    async hset(key, field, value) {
        const serialized = typeof value === 'object' ? JSON.stringify(value) : String(value);
        
        if (this.isConnected && !this.useMemoryFallback) {
            try {
                await this.client.hSet(key, field, serialized);
                return true;
            } catch (error) {
                console.error('Redis hset error:', error);
                return false;
            }
        } else {
            // Memory fallback
            let hash = this.memoryCache.get(key) || {};
            hash[field] = value;
            this.memoryCache.set(key, hash);
            return true;
        }
    }
    
    /**
     * Get hash field
     */
    async hget(key, field) {
        if (this.isConnected && !this.useMemoryFallback) {
            try {
                const value = await this.client.hGet(key, field);
                if (value === null) return null;
                
                try {
                    return JSON.parse(value);
                } catch {
                    return value;
                }
            } catch (error) {
                console.error('Redis hget error:', error);
                const hash = this.memoryCache.get(key);
                return hash ? hash[field] : null;
            }
        } else {
            const hash = this.memoryCache.get(key);
            return hash ? hash[field] : null;
        }
    }
    
    /**
     * Get all hash fields
     */
    async hgetall(key) {
        if (this.isConnected && !this.useMemoryFallback) {
            try {
                const hash = await this.client.hGetAll(key);
                const result = {};
                
                for (const [field, value] of Object.entries(hash)) {
                    try {
                        result[field] = JSON.parse(value);
                    } catch {
                        result[field] = value;
                    }
                }
                
                return result;
            } catch (error) {
                console.error('Redis hgetall error:', error);
                return this.memoryCache.get(key) || {};
            }
        } else {
            return this.memoryCache.get(key) || {};
        }
    }
    
    /**
     * Set with expiration
     */
    async setex(key, ttl, value) {
        return this.set(key, value, ttl);
    }
    
    /**
     * Increment value
     */
    async incr(key) {
        if (this.isConnected && !this.useMemoryFallback) {
            try {
                return await this.client.incr(key);
            } catch (error) {
                console.error('Redis incr error:', error);
                let value = this.memoryCache.get(key) || 0;
                value++;
                this.memoryCache.set(key, value);
                return value;
            }
        } else {
            let value = this.memoryCache.get(key) || 0;
            value++;
            this.memoryCache.set(key, value);
            return value;
        }
    }
    
    /**
     * Decrement value
     */
    async decr(key) {
        if (this.isConnected && !this.useMemoryFallback) {
            try {
                return await this.client.decr(key);
            } catch (error) {
                console.error('Redis decr error:', error);
                let value = this.memoryCache.get(key) || 0;
                value--;
                this.memoryCache.set(key, value);
                return value;
            }
        } else {
            let value = this.memoryCache.get(key) || 0;
            value--;
            this.memoryCache.set(key, value);
            return value;
        }
    }
    
    /**
     * Add to set
     */
    async sadd(key, member) {
        if (this.isConnected && !this.useMemoryFallback) {
            try {
                return await this.client.sAdd(key, member);
            } catch (error) {
                console.error('Redis sadd error:', error);
                let set = this.memoryCache.get(key) || new Set();
                set.add(member);
                this.memoryCache.set(key, Array.from(set));
                return 1;
            }
        } else {
            let set = this.memoryCache.get(key) || [];
            if (!set.includes(member)) {
                set.push(member);
                this.memoryCache.set(key, set);
                return 1;
            }
            return 0;
        }
    }
    
    /**
     * Get set members
     */
    async smembers(key) {
        if (this.isConnected && !this.useMemoryFallback) {
            try {
                return await this.client.sMembers(key);
            } catch (error) {
                console.error('Redis smembers error:', error);
                return this.memoryCache.get(key) || [];
            }
        } else {
            return this.memoryCache.get(key) || [];
        }
    }
    
    /**
     * Remove from set
     */
    async srem(key, member) {
        if (this.isConnected && !this.useMemoryFallback) {
            try {
                return await this.client.sRem(key, member);
            } catch (error) {
                console.error('Redis srem error:', error);
                let set = this.memoryCache.get(key) || [];
                const index = set.indexOf(member);
                if (index !== -1) {
                    set.splice(index, 1);
                    this.memoryCache.set(key, set);
                    return 1;
                }
                return 0;
            }
        } else {
            let set = this.memoryCache.get(key) || [];
            const index = set.indexOf(member);
            if (index !== -1) {
                set.splice(index, 1);
                this.memoryCache.set(key, set);
                return 1;
            }
            return 0;
        }
    }
    
    /**
     * Set key expiration
     */
    async expire(key, ttl) {
        if (this.isConnected && !this.useMemoryFallback) {
            try {
                await this.client.expire(key, ttl);
                return true;
            } catch (error) {
                console.error('Redis expire error:', error);
                return false;
            }
        } else {
            // Memory cache handles TTL automatically
            return true;
        }
    }
    
    /**
     * Get remaining TTL
     */
    async ttl(key) {
        if (this.isConnected && !this.useMemoryFallback) {
            try {
                return await this.client.ttl(key);
            } catch (error) {
                console.error('Redis ttl error:', error);
                return -1;
            }
        } else {
            return this.memoryCache.getTtl(key) || -1;
        }
    }
    
    /**
     * Clear all cache
     */
    async flush() {
        if (this.isConnected && !this.useMemoryFallback) {
            try {
                await this.client.flushAll();
            } catch (error) {
                console.error('Redis flush error:', error);
            }
        }
        
        this.memoryCache.flushAll();
        return true;
    }
    
    /**
     * Get cache keys matching pattern
     */
    async keys(pattern) {
        if (this.isConnected && !this.useMemoryFallback) {
            try {
                return await this.client.keys(pattern);
            } catch (error) {
                console.error('Redis keys error:', error);
                return [];
            }
        } else {
            const allKeys = this.memoryCache.keys();
            const regex = new RegExp(pattern.replace(/\*/g, '.*'));
            return allKeys.filter(key => regex.test(key));
        }
    }
    
    /**
     * Get cache statistics
     */
    async getStats() {
        if (this.isConnected && !this.useMemoryFallback) {
            try {
                const info = await this.client.info();
                const memory = await this.client.info('memory');
                
                return {
                    connected: true,
                    mode: 'redis',
                    keys: await this.client.dbsize(),
                    memory: this.parseRedisInfo(memory, 'used_memory'),
                    info: info.substring(0, 500)
                };
            } catch (error) {
                console.error('Failed to get Redis stats:', error);
                return this.getMemoryStats();
            }
        } else {
            return this.getMemoryStats();
        }
    }
    
    /**
     * Get memory cache statistics
     */
    getMemoryStats() {
        const stats = this.memoryCache.getStats();
        return {
            connected: false,
            mode: 'memory_fallback',
            keys: this.memoryCache.keys().length,
            hits: stats.hits,
            misses: stats.misses,
            hitRate: stats.hits / (stats.hits + stats.misses) || 0
        };
    }
    
    /**
     * Parse Redis INFO output
     */
    parseRedisInfo(info, key) {
        const lines = info.split('\n');
        for (const line of lines) {
            if (line.startsWith(key)) {
                return line.split(':')[1];
            }
        }
        return null;
    }
    
    /**
     * Health check
     */
    async healthCheck() {
        if (this.isConnected && !this.useMemoryFallback) {
            try {
                await this.client.ping();
                return {
                    status: 'healthy',
                    mode: 'redis',
                    timestamp: new Date()
                };
            } catch (error) {
                return {
                    status: 'degraded',
                    mode: 'memory_fallback',
                    error: error.message,
                    timestamp: new Date()
                };
            }
        } else {
            return {
                status: 'degraded',
                mode: 'memory_fallback',
                timestamp: new Date()
            };
        }
    }
    
    /**
     * Get cache value with fallback function
     */
    async remember(key, ttl, callback) {
        let cached = await this.get(key);
        
        if (cached !== null) {
            return cached;
        }
        
        const value = await callback();
        await this.set(key, value, ttl);
        return value;
    }
    
    /**
     * Batch operations
     */
    async mset(items, ttl = 3600) {
        const results = [];
        
        for (const [key, value] of Object.entries(items)) {
            results.push(await this.set(key, value, ttl));
        }
        
        return results.every(r => r === true);
    }
    
    /**
     * Batch get operations
     */
    async mget(keys) {
        const results = {};
        
        for (const key of keys) {
            results[key] = await this.get(key);
        }
        
        return results;
    }
}

// Export singleton instance
module.exports = new RedisConfig();