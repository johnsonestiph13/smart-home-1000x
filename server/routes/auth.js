/**
 * Authentication Routes
 * Handles user registration, login, and session management
 */

const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');

// Mock user database (replace with real database in production)
const users = [
    {
        id: 1,
        email: 'admin@estifhome.com',
        password: '$2a$10$YourHashedPasswordHere', // In production, this would be hashed
        name: 'Admin User',
        role: 'admin',
        createdAt: new Date(),
        tokenVersion: 1
    }
];

// JWT Secret (should be in environment variables)
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-this';

// Helper function to generate JWT token
const generateToken = (user) => {
    return jwt.sign(
        { 
            userId: user.id, 
            email: user.email, 
            role: user.role,
            tokenVersion: user.tokenVersion 
        },
        JWT_SECRET,
        { expiresIn: '7d' }
    );
};

// Register new user
router.post('/register', [
    body('email').isEmail().normalizeEmail(),
    body('password').isLength({ min: 6 }),
    body('name').notEmpty().trim()
], async (req, res) => {
    // Validate input
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }
    
    const { email, password, name } = req.body;
    
    // Check if user already exists
    if (users.find(u => u.email === email)) {
        return res.status(400).json({ error: 'Email already registered' });
    }
    
    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Create new user
    const newUser = {
        id: users.length + 1,
        email,
        password: hashedPassword,
        name,
        role: 'user',
        createdAt: new Date(),
        tokenVersion: 1
    };
    
    users.push(newUser);
    
    // Generate token
    const token = generateToken(newUser);
    
    // Return user info (without password)
    const { password: _, ...userWithoutPassword } = newUser;
    
    res.status(201).json({
        success: true,
        token,
        user: userWithoutPassword
    });
});

// Login user
router.post('/login', [
    body('email').isEmail().normalizeEmail(),
    body('password').notEmpty()
], async (req, res) => {
    // Validate input
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }
    
    const { email, password } = req.body;
    
    // Find user
    const user = users.find(u => u.email === email);
    if (!user) {
        return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
        return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    // Generate token
    const token = generateToken(user);
    
    // Return user info (without password)
    const { password: _, ...userWithoutPassword } = user;
    
    res.json({
        success: true,
        token,
        user: userWithoutPassword
    });
});

// Logout user
router.post('/logout', (req, res) => {
    // In a stateless JWT system, logout is handled client-side
    // This endpoint exists for completeness
    res.json({ success: true, message: 'Logged out successfully' });
});

// Get current user profile
router.get('/profile', async (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
        return res.status(401).json({ error: 'No token provided' });
    }
    
    const token = authHeader.split(' ')[1];
    
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        const user = users.find(u => u.id === decoded.userId);
        
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        
        const { password: _, ...userWithoutPassword } = user;
        res.json({ user: userWithoutPassword });
    } catch (error) {
        return res.status(401).json({ error: 'Invalid token' });
    }
});

// Update user profile
router.put('/profile', [
    body('name').optional().trim(),
    body('email').optional().isEmail().normalizeEmail()
], async (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
        return res.status(401).json({ error: 'No token provided' });
    }
    
    const token = authHeader.split(' ')[1];
    
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        const user = users.find(u => u.id === decoded.userId);
        
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        
        // Update fields
        if (req.body.name) user.name = req.body.name;
        if (req.body.email) user.email = req.body.email;
        
        // Increment token version to invalidate old tokens
        user.tokenVersion++;
        
        // Generate new token
        const newToken = generateToken(user);
        
        const { password: _, ...userWithoutPassword } = user;
        
        res.json({
            success: true,
            token: newToken,
            user: userWithoutPassword
        });
    } catch (error) {
        return res.status(401).json({ error: 'Invalid token' });
    }
});

// Change password
router.put('/change-password', [
    body('currentPassword').notEmpty(),
    body('newPassword').isLength({ min: 6 })
], async (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
        return res.status(401).json({ error: 'No token provided' });
    }
    
    const token = authHeader.split(' ')[1];
    const { currentPassword, newPassword } = req.body;
    
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        const user = users.find(u => u.id === decoded.userId);
        
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        
        // Verify current password
        const isValid = await bcrypt.compare(currentPassword, user.password);
        if (!isValid) {
            return res.status(401).json({ error: 'Current password is incorrect' });
        }
        
        // Hash new password
        user.password = await bcrypt.hash(newPassword, 10);
        user.tokenVersion++;
        
        // Generate new token
        const newToken = generateToken(user);
        
        res.json({
            success: true,
            token: newToken,
            message: 'Password changed successfully'
        });
    } catch (error) {
        return res.status(401).json({ error: 'Invalid token' });
    }
});

// Forgot password - send reset email
router.post('/forgot-password', [
    body('email').isEmail().normalizeEmail()
], async (req, res) => {
    const { email } = req.body;
    
    const user = users.find(u => u.email === email);
    if (!user) {
        // Don't reveal that user doesn't exist for security
        return res.json({ success: true, message: 'If the email exists, a reset link will be sent' });
    }
    
    // Generate reset token
    const resetToken = jwt.sign(
        { userId: user.id, type: 'password_reset' },
        JWT_SECRET,
        { expiresIn: '1h' }
    );
    
    // In production, send email with reset link
    console.log(`Password reset token for ${email}: ${resetToken}`);
    
    res.json({
        success: true,
        message: 'Password reset email sent'
    });
});

// Reset password
router.post('/reset-password', [
    body('token').notEmpty(),
    body('newPassword').isLength({ min: 6 })
], async (req, res) => {
    const { token, newPassword } = req.body;
    
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        
        if (decoded.type !== 'password_reset') {
            return res.status(400).json({ error: 'Invalid reset token' });
        }
        
        const user = users.find(u => u.id === decoded.userId);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        
        // Update password
        user.password = await bcrypt.hash(newPassword, 10);
        user.tokenVersion++;
        
        res.json({
            success: true,
            message: 'Password reset successfully'
        });
    } catch (error) {
        return res.status(401).json({ error: 'Invalid or expired token' });
    }
});

// Verify token endpoint
router.post('/verify-token', (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
        return res.status(401).json({ valid: false });
    }
    
    const token = authHeader.split(' ')[1];
    
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        const user = users.find(u => u.id === decoded.userId);
        
        if (!user || user.tokenVersion !== decoded.tokenVersion) {
            return res.json({ valid: false });
        }
        
        res.json({ valid: true, userId: decoded.userId });
    } catch (error) {
        res.json({ valid: false });
    }
});

module.exports = router;