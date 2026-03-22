/**
 * Rate Limiter Middleware
 * Prevents abuse by limiting request frequency
 */

const rateLimit = require('express-rate-limit');
const Redis = require('redis');
const NodeCache = require('node-cache');

// In-memory cache for rate limiting (fallback if Redis is not available)
const memoryCache = new NodeCache({ stdTTL: 60, checkperiod: 120 });

// Redis client (optional, for distributed rate limiting)
let redisClient = null;

// Initialize Redis if configured
if (process.env.REDIS_URL) {
    try {
        redisClient = Redis.createClient({
            url: process.env.REDIS_URL
        });
        redisClient.connect().catch(console.error);
    } catch (error) {
        console.warn('Redis connection failed, using memory cache');
        redisClient = null;
    }
}

/**
 * Store for rate limiting
 * Uses Redis if available, otherwise falls back to memory
 */
const store = {
    async increment(key) {
        if (redisClient) {
            const result = await redisClient.incr(key);
            if (result === 1) {
                await redisClient.expire(key, 60);
            }
            return result;
        } else {
            let count = memoryCache.get(key) || 0;
            count++;
            memoryCache.set(key, count, 60);
            return count;
        }
    },
    
    async decrement(key) {
        if (redisClient) {
            await redisClient.decr(key);
        } else {
            let count = memoryCache.get(key) || 0;
            if (count > 0) {
                memoryCache.set(key, count - 1, 60);
            }
        }
    },
    
    async reset(key) {
        if (redisClient) {
            await redisClient.del(key);
        } else {
            memoryCache.del(key);
        }
    }
};

/**
 * Standard API rate limiter
 * Limits requests to 100 per 15 minutes per IP
 */
const standardLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per windowMs
    message: {
        error: 'Too many requests',
        message: 'You have exceeded the request limit. Please try again later.',
        retryAfter: 15 * 60 // seconds
    },
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => {
        // Use IP address or user ID if authenticated
        if (req.user && req.user.userId) {
            return `user:${req.user.userId}`;
        }
        return req.ip;
    },
    skip: (req) => {
        // Skip rate limiting for health checks
        return req.path === '/api/health' || req.path === '/api/ping';
    }
});

/**
 * Strict rate limiter for sensitive endpoints
 * Limits to 10 requests per minute
 */
const strictLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 10,
    message: {
        error: 'Too many requests',
        message: 'Rate limit exceeded for this endpoint. Please wait a moment.',
        retryAfter: 60
    },
    standardHeaders: true,
    legacyHeaders: false
});

/**
 * Authentication rate limiter
 * Limits login attempts to 5 per 15 minutes
 */
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5,
    skipSuccessfulRequests: true, // Don't count successful logins
    message: {
        error: 'Too many login attempts',
        message: 'Please wait 15 minutes before trying again',
        retryAfter: 15 * 60
    },
    keyGenerator: (req) => {
        // Use email if available, otherwise IP
        return req.body.email || req.ip;
    }
});

/**
 * API key rate limiter
 * Different limits for API key users
 */
const apiKeyLimiter = (maxRequests = 1000, windowMs = 60 * 60 * 1000) => {
    return rateLimit({
        windowMs,
        max: maxRequests,
        keyGenerator: (req) => {
            return req.headers['x-api-key'] || req.ip;
        },
        message: {
            error: 'API rate limit exceeded',
            message: 'You have exceeded your API quota'
        }
    });
};

/**
 * WebSocket connection rate limiter
 * Limits number of connections per IP
 */
const wsConnectionLimiter = {
    connections: new Map(),
    
    check(ip) {
        const now = Date.now();
        const windowStart = now - 60000; // 1 minute window
        
        // Clean old connections
        if (this.connections.has(ip)) {
            const timestamps = this.connections.get(ip).filter(t => t > windowStart);
            this.connections.set(ip, timestamps);
            
            if (timestamps.length >= 10) {
                return false;
            }
        } else {
            this.connections.set(ip, []);
        }
        
        // Add new connection
        this.connections.get(ip).push(now);
        return true;
    },
    
    reset(ip) {
        if (ip) {
            this.connections.delete(ip);
        } else {
            this.connections.clear();
        }
    }
};

/**
 * Custom rate limiter with dynamic limits
 * Allows different limits for different endpoints
 */
const createLimiter = (options = {}) => {
    const {
        windowMs = 15 * 60 * 1000,
        max = 100,
        skipSuccessful = false,
        keyGenerator = (req) => req.user?.userId || req.ip,
        message = 'Too many requests'
    } = options;
    
    return rateLimit({
        windowMs,
        max,
        skipSuccessfulRequests: skipSuccessful,
        keyGenerator,
        message: {
            error: 'Rate limit exceeded',
            message: message,
            retryAfter: Math.ceil(windowMs / 1000)
        },
        standardHeaders: true,
        legacyHeaders: false,
        store: redisClient ? undefined : { // Use custom store if no Redis
            async increment(key) {
                const count = await store.increment(key);
                return { totalHits: count };
            },
            async decrement(key) {
                await store.decrement(key);
            },
            async resetKey(key) {
                await store.reset(key);
            }
        }
    });
};

/**
 * IP-based whitelist
 * Allows certain IPs to bypass rate limiting
 */
const ipWhitelist = (ips) => {
    return (req, res, next) => {
        const clientIp = req.ip;
        
        if (ips.includes(clientIp)) {
            // Skip rate limiting for whitelisted IPs
            return next();
        }
        
        // Apply rate limiting for others
        standardLimiter(req, res, next);
    };
};

/**
 * User-based rate limiter with different tiers
 */
const userTierLimiter = (tiers = {}) => {
    return async (req, res, next) => {
        const userId = req.user?.userId;
        
        if (!userId) {
            return standardLimiter(req, res, next);
        }
        
        // Get user tier (from database or token)
        const userTier = req.user?.tier || 'free';
        const limits = tiers[userTier] || tiers.free || { windowMs: 60000, max: 60 };
        
        const limiter = createLimiter({
            windowMs: limits.windowMs,
            max: limits.max,
            keyGenerator: () => `user:${userId}`
        });
        
        limiter(req, res, next);
    };
};

/**
 * Burst protection middleware
 * Prevents sudden spikes in requests
 */
const burstProtection = () => {
    const burstCounts = new Map();
    
    return (req, res, next) => {
        const key = req.user?.userId || req.ip;
        const now = Date.now();
        const windowStart = now - 1000; // 1 second window
        
        // Get recent requests
        let timestamps = burstCounts.get(key) || [];
        timestamps = timestamps.filter(t => t > windowStart);
        
        if (timestamps.length >= 5) { // Max 5 requests per second
            return res.status(429).json({
                error: 'Burst limit exceeded',
                message: 'Too many requests. Please slow down.',
                retryAfter: 1
            });
        }
        
        timestamps.push(now);
        burstCounts.set(key, timestamps);
        
        // Clean up old entries periodically
        if (burstCounts.size > 1000) {
            for (const [k, timestamps] of burstCounts) {
                if (timestamps.length === 0) {
                    burstCounts.delete(k);
                }
            }
        }
        
        next();
    };
};

/**
 * Slow down middleware
 * Gradually slows down repeated requests
 */
const slowDown = require('express-slow-down');

const standardSlowDown = slowDown({
    windowMs: 15 * 60 * 1000, // 15 minutes
    delayAfter: 50, // Allow 50 requests without delay
    delayMs: (hits) => hits * 100, // Add 100ms delay per request after limit
    maxDelayMs: 5000, // Max 5 second delay
    keyGenerator: (req) => req.user?.userId || req.ip
});

module.exports = {
    standardLimiter,
    strictLimiter,
    authLimiter,
    apiKeyLimiter,
    wsConnectionLimiter,
    createLimiter,
    ipWhitelist,
    userTierLimiter,
    burstProtection,
    standardSlowDown,
    store
};