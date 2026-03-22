/**
 * Authentication Middleware
 * Verifies JWT tokens and checks user permissions
 */

const jwt = require('jsonwebtoken');
const { promisify } = require('util');

// JWT Secret from environment
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-this-in-production';

/**
 * Main authentication middleware
 * Verifies the JWT token and attaches user to request
 */
const authMiddleware = async (req, res, next) => {
    try {
        // Get token from header
        let token = req.headers.authorization;
        
        if (!token) {
            return res.status(401).json({
                error: 'Authentication required',
                message: 'No token provided'
            });
        }
        
        // Remove 'Bearer ' prefix if present
        if (token.startsWith('Bearer ')) {
            token = token.slice(7, token.length);
        }
        
        // Verify token
        const decoded = await promisify(jwt.verify)(token, JWT_SECRET);
        
        // Attach user to request
        req.user = decoded;
        
        // Check if token is expired (handled by jwt.verify)
        
        next();
    } catch (error) {
        if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({
                error: 'Invalid token',
                message: 'Authentication failed'
            });
        }
        
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({
                error: 'Token expired',
                message: 'Please login again'
            });
        }
        
        console.error('Auth middleware error:', error);
        return res.status(500).json({
            error: 'Authentication error',
            message: 'Internal server error'
        });
    }
};

/**
 * Optional authentication middleware
 * Tries to verify token but continues even if no token
 */
const optionalAuthMiddleware = async (req, res, next) => {
    try {
        let token = req.headers.authorization;
        
        if (token && token.startsWith('Bearer ')) {
            token = token.slice(7, token.length);
            const decoded = await promisify(jwt.verify)(token, JWT_SECRET);
            req.user = decoded;
        }
        
        next();
    } catch (error) {
        // Continue even if token is invalid
        next();
    }
};

/**
 * Role-based authorization middleware
 * Checks if user has required role
 */
const requireRole = (...roles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({
                error: 'Authentication required',
                message: 'Please login first'
            });
        }
        
        if (!roles.includes(req.user.role)) {
            return res.status(403).json({
                error: 'Insufficient permissions',
                message: `Role '${req.user.role}' does not have access to this resource`,
                requiredRoles: roles
            });
        }
        
        next();
    };
};

/**
 * Permission-based authorization middleware
 * Checks if user has required permission
 */
const requirePermission = (permission) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({
                error: 'Authentication required',
                message: 'Please login first'
            });
        }
        
        // Admin has all permissions
        if (req.user.role === 'admin') {
            return next();
        }
        
        // Check if user has the required permission
        if (!req.user.permissions || !req.user.permissions.includes(permission)) {
            return res.status(403).json({
                error: 'Insufficient permissions',
                message: `Missing required permission: ${permission}`
            });
        }
        
        next();
    };
};

/**
 * Device access middleware
 * Checks if user can access specific device
 */
const requireDeviceAccess = (deviceIdParam = 'deviceId') => {
    return async (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({
                error: 'Authentication required',
                message: 'Please login first'
            });
        }
        
        // Admin has access to all devices
        if (req.user.role === 'admin') {
            return next();
        }
        
        const deviceId = req.params[deviceIdParam] || req.body.deviceId;
        
        if (!deviceId) {
            return res.status(400).json({
                error: 'Device ID required',
                message: 'Missing device identifier'
            });
        }
        
        // Check if user has access to this device
        const hasAccess = req.user.accessibleDevices?.some(
            device => device.deviceId === parseInt(deviceId)
        );
        
        if (!hasAccess) {
            return res.status(403).json({
                error: 'Device access denied',
                message: `You do not have access to device ${deviceId}`
            });
        }
        
        next();
    };
};

/**
 * API Key authentication middleware
 * For service-to-service communication
 */
const apiKeyAuthMiddleware = (req, res, next) => {
    const apiKey = req.headers['x-api-key'];
    const validApiKey = process.env.API_KEY;
    
    if (!apiKey || apiKey !== validApiKey) {
        return res.status(401).json({
            error: 'Invalid API key',
            message: 'Valid API key required'
        });
    }
    
    next();
};

/**
 * WebSocket authentication helper
 * For Socket.IO connections
 */
const authenticateSocket = async (socket, next) => {
    try {
        const token = socket.handshake.auth.token;
        
        if (!token) {
            return next(new Error('Authentication required'));
        }
        
        const decoded = await promisify(jwt.verify)(token, JWT_SECRET);
        socket.user = decoded;
        next();
    } catch (error) {
        next(new Error('Invalid token'));
    }
};

/**
 * Refresh token validation
 * Checks if refresh token is valid
 */
const validateRefreshToken = (req, res, next) => {
    const { refreshToken } = req.body;
    
    if (!refreshToken) {
        return res.status(400).json({
            error: 'Refresh token required'
        });
    }
    
    try {
        const decoded = jwt.verify(refreshToken, JWT_SECRET);
        
        if (decoded.type !== 'refresh') {
            return res.status(401).json({
                error: 'Invalid token type'
            });
        }
        
        req.refreshUser = decoded;
        next();
    } catch (error) {
        return res.status(401).json({
            error: 'Invalid refresh token'
        });
    }
};

/**
 * CSRF Protection middleware
 * Validates CSRF token for state-changing requests
 */
const csrfProtection = (req, res, next) => {
    // Skip for GET, HEAD, OPTIONS requests
    if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
        return next();
    }
    
    const csrfToken = req.headers['x-csrf-token'];
    const sessionToken = req.session?.csrfToken;
    
    if (!csrfToken || !sessionToken || csrfToken !== sessionToken) {
        return res.status(403).json({
            error: 'Invalid CSRF token'
        });
    }
    
    next();
};

/**
 * Session validation middleware
 * Checks if session is still valid
 */
const validateSession = async (req, res, next) => {
    if (!req.user) {
        return next();
    }
    
    // Check if token version matches (for logout all devices)
    const User = require('../models/User');
    const user = await User.findById(req.user.userId);
    
    if (!user || user.tokenVersion !== req.user.tokenVersion) {
        return res.status(401).json({
            error: 'Session expired',
            message: 'Please login again'
        });
    }
    
    next();
};

module.exports = {
    authMiddleware,
    optionalAuthMiddleware,
    requireRole,
    requirePermission,
    requireDeviceAccess,
    apiKeyAuthMiddleware,
    authenticateSocket,
    validateRefreshToken,
    csrfProtection,
    validateSession
};