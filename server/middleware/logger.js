/**
 * Logger Middleware
 * Handles request/response logging and error tracking
 */

const winston = require('winston');
const morgan = require('morgan');
const fs = require('fs');
const path = require('path');

// Create logs directory if it doesn't exist
const logsDir = path.join(__dirname, '../../logs');
if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
}

/**
 * Winston logger configuration
 * Structured logging with multiple transports
 */
const winstonLogger = winston.createLogger({
    level: process.env.LOG_LEVEL || 'info',
    format: winston.format.combine(
        winston.format.timestamp({
            format: 'YYYY-MM-DD HH:mm:ss'
        }),
        winston.format.errors({ stack: true }),
        winston.format.splat(),
        winston.format.json(),
        winston.format.printf(({ timestamp, level, message, ...meta }) => {
            return `${timestamp} [${level.toUpperCase()}]: ${message} ${Object.keys(meta).length ? JSON.stringify(meta) : ''}`;
        })
    ),
    transports: [
        // Error log file
        new winston.transports.File({
            filename: path.join(logsDir, 'error.log'),
            level: 'error',
            maxsize: 10485760, // 10MB
            maxFiles: 5
        }),
        // Combined log file
        new winston.transports.File({
            filename: path.join(logsDir, 'combined.log'),
            maxsize: 10485760,
            maxFiles: 5
        }),
        // Console output (only in development)
        new winston.transports.Console({
            format: winston.format.combine(
                winston.format.colorize(),
                winston.format.simple()
            ),
            level: process.env.NODE_ENV === 'development' ? 'debug' : 'info'
        })
    ]
});

/**
 * Morgan configuration for HTTP request logging
 */
const morganFormat = process.env.NODE_ENV === 'production' 
    ? 'combined' 
    : 'dev';

// Morgan stream for Winston
const morganStream = {
    write: (message) => {
        winstonLogger.info(message.trim());
    }
};

// Create Morgan middleware with custom format
const httpLogger = morgan(morganFormat, { stream: morganStream });

/**
 * Custom request logger
 * Logs detailed request information
 */
const requestLogger = (req, res, next) => {
    const start = Date.now();
    
    // Log request
    winstonLogger.debug('Incoming request', {
        method: req.method,
        url: req.url,
        ip: req.ip,
        userAgent: req.get('user-agent'),
        body: req.method !== 'GET' ? req.body : undefined,
        query: req.query,
        params: req.params
    });
    
    // Capture response
    const oldJson = res.json;
    res.json = function(data) {
        const duration = Date.now() - start;
        
        // Log response
        winstonLogger.info('Request completed', {
            method: req.method,
            url: req.url,
            statusCode: res.statusCode,
            duration: `${duration}ms`,
            userId: req.user?.userId,
            responseSize: res.get('Content-Length')
        });
        
        // Log errors
        if (res.statusCode >= 400) {
            winstonLogger.error('Request error', {
                method: req.method,
                url: req.url,
                statusCode: res.statusCode,
                error: data.error || data.message,
                duration: `${duration}ms`
            });
        }
        
        oldJson.call(this, data);
    };
    
    next();
};

/**
 * Error logger
 * Logs errors with stack traces
 */
const errorLogger = (err, req, res, next) => {
    winstonLogger.error('Unhandled error', {
        error: err.message,
        stack: err.stack,
        method: req.method,
        url: req.url,
        ip: req.ip,
        userId: req.user?.userId,
        body: req.body
    });
    
    next(err);
};

/**
 * Database query logger
 * Logs slow database queries
 */
const dbQueryLogger = (query, duration) => {
    if (duration > 100) { // Log queries taking longer than 100ms
        winstonLogger.warn('Slow database query', {
            query: query,
            duration: `${duration}ms`
        });
    }
    
    winstonLogger.debug('Database query', {
        query: query,
        duration: `${duration}ms`
    });
};

/**
 * WebSocket event logger
 * Logs WebSocket connections and events
 */
const wsLogger = (event, data, socketId) => {
    winstonLogger.debug('WebSocket event', {
        event,
        socketId,
        data: typeof data === 'object' ? JSON.stringify(data).slice(0, 500) : data
    });
};

/**
 * API performance logger
 * Logs API performance metrics
 */
const performanceLogger = (req, res, next) => {
    const start = Date.now();
    
    res.on('finish', () => {
        const duration = Date.now() - start;
        
        // Log slow requests
        if (duration > 1000) {
            winstonLogger.warn('Slow request', {
                method: req.method,
                url: req.url,
                duration: `${duration}ms`,
                statusCode: res.statusCode
            });
        }
        
        // Store metrics (could be sent to monitoring system)
        if (global.performanceMetrics) {
            if (!global.performanceMetrics[req.url]) {
                global.performanceMetrics[req.url] = {
                    count: 0,
                    totalDuration: 0,
                    maxDuration: 0
                };
            }
            
            const metrics = global.performanceMetrics[req.url];
            metrics.count++;
            metrics.totalDuration += duration;
            metrics.maxDuration = Math.max(metrics.maxDuration, duration);
        }
    });
    
    next();
};

/**
 * Activity logger for user actions
 * Logs important user actions for audit
 */
const activityLogger = (action, details = {}) => {
    winstonLogger.info('User activity', {
        action,
        userId: details.userId,
        ip: details.ip,
        userAgent: details.userAgent,
        timestamp: new Date().toISOString(),
        ...details
    });
};

/**
 * Security event logger
 * Logs security-related events
 */
const securityLogger = (event, details = {}) => {
    winstonLogger.warn('Security event', {
        event,
        ...details,
        timestamp: new Date().toISOString()
    });
};

/**
 * System event logger
 * Logs system events and status changes
 */
const systemLogger = (event, details = {}) => {
    winstonLogger.info('System event', {
        event,
        ...details,
        timestamp: new Date().toISOString()
    });
};

/**
 * Create a child logger for specific module
 */
const createModuleLogger = (moduleName) => {
    return {
        debug: (message, meta = {}) => winstonLogger.debug(message, { module: moduleName, ...meta }),
        info: (message, meta = {}) => winstonLogger.info(message, { module: moduleName, ...meta }),
        warn: (message, meta = {}) => winstonLogger.warn(message, { module: moduleName, ...meta }),
        error: (message, meta = {}) => winstonLogger.error(message, { module: moduleName, ...meta })
    };
};

/**
 * Request ID middleware
 * Adds a unique ID to each request for tracing
 */
const requestIdMiddleware = (req, res, next) => {
    const requestId = req.headers['x-request-id'] || 
                      req.headers['x-correlation-id'] || 
                      `req-${Date.now()}-${Math.random().toString(36).substring(2, 10)}`;
    
    req.requestId = requestId;
    res.setHeader('X-Request-Id', requestId);
    
    // Add request ID to all logs
    const oldInfo = winstonLogger.info;
    const oldError = winstonLogger.error;
    const oldDebug = winstonLogger.debug;
    
    winstonLogger.info = (message, meta = {}) => {
        oldInfo(message, { requestId, ...meta });
    };
    
    winstonLogger.error = (message, meta = {}) => {
        oldError(message, { requestId, ...meta });
    };
    
    winstonLogger.debug = (message, meta = {}) => {
        oldDebug(message, { requestId, ...meta });
    };
    
    next();
};

/**
 * Response time header middleware
 * Adds X-Response-Time header
 */
const responseTimeMiddleware = (req, res, next) => {
    const start = Date.now();
    
    res.on('finish', () => {
        const duration = Date.now() - start;
        res.setHeader('X-Response-Time', `${duration}ms`);
    });
    
    next();
};

module.exports = {
    winstonLogger,
    httpLogger,
    requestLogger,
    errorLogger,
    dbQueryLogger,
    wsLogger,
    performanceLogger,
    activityLogger,
    securityLogger,
    systemLogger,
    createModuleLogger,
    requestIdMiddleware,
    responseTimeMiddleware
};