/**
 * Automation Routes
 * Handles automation rules, schedules, and triggers
 */

const express = require('express');
const router = express.Router();
const { body, param, validationResult } = require('express-validator');

// In-memory storage for automation rules
let automationRules = [
    {
        id: 'rule_1',
        name: 'Temperature Control - AC',
        nameAm: 'የሙቀት መቆጣጠሪያ - ኤሲ',
        enabled: true,
        trigger: {
            type: 'temperature',
            condition: 'greater_than',
            value: 26
        },
        action: {
            type: 'device',
            deviceId: 2,
            action: 'on'
        },
        cooldown: 300000,
        createdAt: new Date(),
        lastExecuted: null
    },
    {
        id: 'rule_2',
        name: 'Temperature Control - Heater',
        nameAm: 'የሙቀት መቆጣጠሪያ - ማሞቂያ',
        enabled: true,
        trigger: {
            type: 'temperature',
            condition: 'less_than',
            value: 18
        },
        action: {
            type: 'device',
            deviceId: 4,
            action: 'on'
        },
        cooldown: 300000,
        createdAt: new Date(),
        lastExecuted: null
    },
    {
        id: 'rule_3',
        name: 'Morning Light Schedule',
        nameAm: 'የጠዋት መብራት መርሐግብር',
        enabled: true,
        trigger: {
            type: 'time',
            hour: 6,
            minute: 30,
            days: [1, 2, 3, 4, 5]
        },
        action: {
            type: 'device',
            deviceId: 0,
            action: 'on'
        },
        createdAt: new Date(),
        lastExecuted: null
    },
    {
        id: 'rule_4',
        name: 'Night Light Schedule',
        nameAm: 'የማታ መብራት መርሐግብር',
        enabled: true,
        trigger: {
            type: 'time',
            hour: 22,
            minute: 0,
            days: [0, 1, 2, 3, 4, 5, 6]
        },
        action: {
            type: 'device',
            deviceId: 0,
            action: 'off'
        },
        createdAt: new Date(),
        lastExecuted: null
    },
    {
        id: 'rule_5',
        name: 'Fan Morning Schedule',
        nameAm: 'የማራገቢያ ጠዋት መርሐግብር',
        enabled: true,
        trigger: {
            type: 'time',
            hour: 8,
            minute: 0,
            days: [1, 2, 3, 4, 5]
        },
        action: {
            type: 'device',
            deviceId: 1,
            action: 'on'
        },
        createdAt: new Date(),
        lastExecuted: null
    },
    {
        id: 'rule_6',
        name: 'Fan Evening Schedule',
        nameAm: 'የማራገቢያ ማታ መርሐግብር',
        enabled: true,
        trigger: {
            type: 'time',
            hour: 18,
            minute: 0,
            days: [1, 2, 3, 4, 5]
        },
        action: {
            type: 'device',
            deviceId: 1,
            action: 'off'
        },
        createdAt: new Date(),
        lastExecuted: null
    }
];

// In-memory storage for schedules
let schedules = [
    {
        id: 'schedule_1',
        name: 'Morning Light',
        nameAm: 'የጠዋት መብራት',
        enabled: true,
        type: 'device',
        deviceId: 0,
        action: 'on',
        time: { hour: 6, minute: 30 },
        days: [1, 2, 3, 4, 5],
        repeat: 'weekly',
        createdAt: new Date()
    },
    {
        id: 'schedule_2',
        name: 'Night Light',
        nameAm: 'የማታ መብራት',
        enabled: true,
        type: 'device',
        deviceId: 0,
        action: 'off',
        time: { hour: 22, minute: 0 },
        days: [0, 1, 2, 3, 4, 5, 6],
        repeat: 'daily',
        createdAt: new Date()
    },
    {
        id: 'schedule_3',
        name: 'Morning Fan',
        nameAm: 'የጠዋት ማራገቢያ',
        enabled: true,
        type: 'device',
        deviceId: 1,
        action: 'on',
        time: { hour: 8, minute: 0 },
        days: [1, 2, 3, 4, 5],
        repeat: 'weekly',
        createdAt: new Date()
    },
    {
        id: 'schedule_4',
        name: 'Evening Fan',
        nameAm: 'የማታ ማራገቢያ',
        enabled: true,
        type: 'device',
        deviceId: 1,
        action: 'off',
        time: { hour: 18, minute: 0 },
        days: [1, 2, 3, 4, 5],
        repeat: 'weekly',
        createdAt: new Date()
    },
    {
        id: 'schedule_5',
        name: 'Garden Pump',
        nameAm: 'የአትክልት ፓምፕ',
        enabled: true,
        type: 'device',
        deviceId: 5,
        action: 'on',
        time: { hour: 10, minute: 0 },
        days: [0, 1, 2, 3, 4, 5, 6],
        repeat: 'daily',
        createdAt: new Date()
    }
];

// In-memory storage for automation history
let automationHistory = [];

// Get all automation rules
router.get('/rules', (req, res) => {
    res.json({
        success: true,
        rules: automationRules,
        count: automationRules.length
    });
});

// Get single automation rule
router.get('/rules/:id', [
    param('id').isString()
], (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }
    
    const rule = automationRules.find(r => r.id === req.params.id);
    if (!rule) {
        return res.status(404).json({ error: 'Rule not found' });
    }
    
    res.json({ success: true, rule });
});

// Create automation rule
router.post('/rules', [
    body('name').notEmpty().trim(),
    body('trigger').isObject(),
    body('action').isObject(),
    body('enabled').optional().isBoolean(),
    body('cooldown').optional().isInt()
], (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }
    
    const newRule = {
        id: `rule_${Date.now()}`,
        ...req.body,
        enabled: req.body.enabled !== false,
        createdAt: new Date(),
        lastExecuted: null
    };
    
    automationRules.push(newRule);
    
    res.status(201).json({
        success: true,
        rule: newRule,
        message: 'Automation rule created successfully'
    });
});

// Update automation rule
router.put('/rules/:id', [
    param('id').isString()
], (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }
    
    const ruleIndex = automationRules.findIndex(r => r.id === req.params.id);
    if (ruleIndex === -1) {
        return res.status(404).json({ error: 'Rule not found' });
    }
    
    automationRules[ruleIndex] = {
        ...automationRules[ruleIndex],
        ...req.body,
        id: req.params.id,
        updatedAt: new Date()
    };
    
    res.json({
        success: true,
        rule: automationRules[ruleIndex],
        message: 'Automation rule updated successfully'
    });
});

// Delete automation rule
router.delete('/rules/:id', [
    param('id').isString()
], (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }
    
    const ruleIndex = automationRules.findIndex(r => r.id === req.params.id);
    if (ruleIndex === -1) {
        return res.status(404).json({ error: 'Rule not found' });
    }
    
    const deletedRule = automationRules[ruleIndex];
    automationRules.splice(ruleIndex, 1);
    
    res.json({
        success: true,
        rule: deletedRule,
        message: 'Automation rule deleted successfully'
    });
});

// Toggle automation rule
router.patch('/rules/:id/toggle', [
    param('id').isString()
], (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }
    
    const rule = automationRules.find(r => r.id === req.params.id);
    if (!rule) {
        return res.status(404).json({ error: 'Rule not found' });
    }
    
    rule.enabled = !rule.enabled;
    rule.updatedAt = new Date();
    
    res.json({
        success: true,
        rule,
        message: `Rule ${rule.enabled ? 'enabled' : 'disabled'}`
    });
});

// Get all schedules
router.get('/schedules', (req, res) => {
    res.json({
        success: true,
        schedules: schedules,
        count: schedules.length
    });
});

// Get single schedule
router.get('/schedules/:id', [
    param('id').isString()
], (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }
    
    const schedule = schedules.find(s => s.id === req.params.id);
    if (!schedule) {
        return res.status(404).json({ error: 'Schedule not found' });
    }
    
    res.json({ success: true, schedule });
});

// Create schedule
router.post('/schedules', [
    body('name').notEmpty().trim(),
    body('type').isIn(['device', 'device_group', 'scene']),
    body('time').isObject(),
    body('time.hour').isInt({ min: 0, max: 23 }),
    body('time.minute').isInt({ min: 0, max: 59 }),
    body('action').optional().isString(),
    body('deviceId').optional().isInt(),
    body('sceneId').optional().isString(),
    body('days').optional().isArray(),
    body('repeat').optional().isIn(['daily', 'weekly', 'monthly'])
], (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }
    
    const newSchedule = {
        id: `schedule_${Date.now()}`,
        ...req.body,
        enabled: req.body.enabled !== false,
        createdAt: new Date(),
        lastExecuted: null
    };
    
    schedules.push(newSchedule);
    
    res.status(201).json({
        success: true,
        schedule: newSchedule,
        message: 'Schedule created successfully'
    });
});

// Update schedule
router.put('/schedules/:id', [
    param('id').isString()
], (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }
    
    const scheduleIndex = schedules.findIndex(s => s.id === req.params.id);
    if (scheduleIndex === -1) {
        return res.status(404).json({ error: 'Schedule not found' });
    }
    
    schedules[scheduleIndex] = {
        ...schedules[scheduleIndex],
        ...req.body,
        id: req.params.id,
        updatedAt: new Date()
    };
    
    res.json({
        success: true,
        schedule: schedules[scheduleIndex],
        message: 'Schedule updated successfully'
    });
});

// Delete schedule
router.delete('/schedules/:id', [
    param('id').isString()
], (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }
    
    const scheduleIndex = schedules.findIndex(s => s.id === req.params.id);
    if (scheduleIndex === -1) {
        return res.status(404).json({ error: 'Schedule not found' });
    }
    
    const deletedSchedule = schedules[scheduleIndex];
    schedules.splice(scheduleIndex, 1);
    
    res.json({
        success: true,
        schedule: deletedSchedule,
        message: 'Schedule deleted successfully'
    });
});

// Toggle schedule
router.patch('/schedules/:id/toggle', [
    param('id').isString()
], (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }
    
    const schedule = schedules.find(s => s.id === req.params.id);
    if (!schedule) {
        return res.status(404).json({ error: 'Schedule not found' });
    }
    
    schedule.enabled = !schedule.enabled;
    schedule.updatedAt = new Date();
    
    res.json({
        success: true,
        schedule,
        message: `Schedule ${schedule.enabled ? 'enabled' : 'disabled'}`
    });
});

// Get automation history
router.get('/history', [
    query('limit').optional().isInt({ min: 1, max: 500 }),
    query('ruleId').optional().isString()
], (req, res) => {
    const { limit = 100, ruleId } = req.query;
    
    let filtered = [...automationHistory];
    
    if (ruleId) {
        filtered = filtered.filter(h => h.ruleId === ruleId);
    }
    
    filtered.sort((a, b) => b.timestamp - a.timestamp);
    filtered = filtered.slice(0, parseInt(limit));
    
    res.json({
        success: true,
        history: filtered,
        count: filtered.length
    });
});

// Trigger automation rule (internal use)
router.post('/trigger/:ruleId', [
    param('ruleId').isString()
], (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }
    
    const rule = automationRules.find(r => r.id === req.params.ruleId);
    if (!rule) {
        return res.status(404).json({ error: 'Rule not found' });
    }
    
    if (!rule.enabled) {
        return res.status(400).json({ error: 'Rule is disabled' });
    }
    
    // Check cooldown
    if (rule.cooldown && rule.lastExecuted) {
        const timeSince = Date.now() - rule.lastExecuted;
        if (timeSince < rule.cooldown) {
            return res.status(429).json({ error: 'Rule in cooldown' });
        }
    }
    
    // Execute the rule (in production, this would control devices)
    const execution = {
        id: Date.now(),
        ruleId: rule.id,
        ruleName: rule.name,
        timestamp: Date.now(),
        success: true,
        action: rule.action
    };
    
    automationHistory.unshift(execution);
    
    // Keep only last 1000 executions
    if (automationHistory.length > 1000) {
        automationHistory.pop();
    }
    
    rule.lastExecuted = Date.now();
    
    // Broadcast to WebSocket clients
    const io = req.app.get('io');
    if (io) {
        io.emit('automation_triggered', execution);
    }
    
    res.json({
        success: true,
        execution,
        message: `Rule "${rule.name}" executed successfully`
    });
});

// Get available trigger types
router.get('/triggers/types', (req, res) => {
    const triggerTypes = [
        { type: 'time', description: 'Time-based trigger', params: ['hour', 'minute', 'days'] },
        { type: 'temperature', description: 'Temperature-based trigger', params: ['condition', 'value'] },
        { type: 'humidity', description: 'Humidity-based trigger', params: ['condition', 'value'] },
        { type: 'device_state', description: 'Device state trigger', params: ['deviceId', 'state'] },
        { type: 'schedule', description: 'Schedule trigger', params: ['scheduleId'] },
        { type: 'scene', description: 'Scene trigger', params: ['sceneId'] }
    ];
    
    res.json({ success: true, triggers: triggerTypes });
});

// Get available action types
router.get('/actions/types', (req, res) => {
    const actionTypes = [
        { type: 'device', description: 'Control a single device', params: ['deviceId', 'action'] },
        { type: 'device_group', description: 'Control multiple devices', params: ['devices', 'action'] },
        { type: 'scene', description: 'Activate a scene', params: ['sceneId'] },
        { type: 'notification', description: 'Send notification', params: ['message'] },
        { type: 'webhook', description: 'Call webhook URL', params: ['url', 'payload'] }
    ];
    
    res.json({ success: true, actions: actionTypes });
});

module.exports = router;