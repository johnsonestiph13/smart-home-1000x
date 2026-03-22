/**
 * Migration: 001_initial_schema.js
 * Creates the initial database schema for Estif Home
 * 
 * Run with: node database/migrate.js up
 */

const mongoose = require('mongoose');

module.exports = {
    // Migration version
    version: '001',
    name: 'Initial Schema Creation',
    description: 'Creates all initial collections and indexes for the smart home system',
    
    // Apply migration
    up: async (db) => {
        console.log('📦 Running migration 001: Initial Schema Creation...');
        
        // Create Users collection
        await db.createCollection('users', {
            validator: {
                $jsonSchema: {
                    bsonType: 'object',
                    required: ['email', 'password', 'name', 'role'],
                    properties: {
                        email: {
                            bsonType: 'string',
                            pattern: '^\\w+([\\.-]?\\w+)*@\\w+([\\.-]?\\w+)*(\\.\\w{2,3})+$',
                            description: 'must be a valid email'
                        },
                        password: {
                            bsonType: 'string',
                            minLength: 6,
                            description: 'must be at least 6 characters'
                        },
                        name: {
                            bsonType: 'string',
                            description: 'must be a string'
                        },
                        role: {
                            enum: ['admin', 'user', 'guest', 'maintenance'],
                            description: 'must be a valid role'
                        },
                        status: {
                            enum: ['active', 'inactive', 'suspended', 'pending'],
                            default: 'pending'
                        },
                        preferences: {
                            bsonType: 'object',
                            properties: {
                                language: { enum: ['en', 'am'], default: 'en' },
                                theme: { enum: ['light', 'dark', 'auto'], default: 'light' },
                                timezone: { bsonType: 'string', default: 'Africa/Addis_Ababa' }
                            }
                        }
                    }
                }
            }
        });
        
        // Create Users indexes
        await db.collection('users').createIndex({ email: 1 }, { unique: true });
        await db.collection('users').createIndex({ role: 1 });
        await db.collection('users').createIndex({ status: 1 });
        await db.collection('users').createIndex({ createdAt: -1 });
        
        console.log('✅ Users collection created with indexes');
        
        // Create Devices collection
        await db.createCollection('devices', {
            validator: {
                $jsonSchema: {
                    bsonType: 'object',
                    required: ['id', 'name', 'gpio', 'type', 'owner'],
                    properties: {
                        id: {
                            bsonType: 'int',
                            description: 'must be an integer'
                        },
                        name: {
                            bsonType: 'string',
                            description: 'must be a string'
                        },
                        gpio: {
                            bsonType: 'int',
                            minimum: 0,
                            maximum: 39,
                            description: 'must be a valid GPIO pin'
                        },
                        type: {
                            enum: ['light', 'fan', 'ac', 'tv', 'heater', 'pump', 'sensor', 'other'],
                            description: 'must be a valid device type'
                        },
                        state: {
                            bsonType: 'bool',
                            default: false
                        },
                        autoMode: {
                            bsonType: 'bool',
                            default: false
                        },
                        power: {
                            bsonType: 'int',
                            minimum: 0,
                            default: 0
                        },
                        healthScore: {
                            bsonType: 'int',
                            minimum: 0,
                            maximum: 100,
                            default: 100
                        }
                    }
                }
            }
        });
        
        // Create Devices indexes
        await db.collection('devices').createIndex({ id: 1 }, { unique: true });
        await db.collection('devices').createIndex({ type: 1 });
        await db.collection('devices').createIndex({ room: 1 });
        await db.collection('devices').createIndex({ state: 1 });
        await db.collection('devices').createIndex({ owner: 1 });
        
        console.log('✅ Devices collection created with indexes');
        
        // Create Schedules collection
        await db.createCollection('schedules', {
            validator: {
                $jsonSchema: {
                    bsonType: 'object',
                    required: ['name', 'type', 'time', 'action', 'owner'],
                    properties: {
                        name: { bsonType: 'string' },
                        type: { enum: ['device', 'device_group', 'scene', 'automation'] },
                        time: {
                            bsonType: 'object',
                            required: ['hour', 'minute'],
                            properties: {
                                hour: { bsonType: 'int', minimum: 0, maximum: 23 },
                                minute: { bsonType: 'int', minimum: 0, maximum: 59 }
                            }
                        },
                        repeat: { enum: ['once', 'daily', 'weekly', 'monthly', 'yearly'], default: 'daily' },
                        days: { bsonType: 'array', items: { bsonType: 'int', minimum: 0, maximum: 6 } },
                        enabled: { bsonType: 'bool', default: true }
                    }
                }
            }
        });
        
        // Create Schedules indexes
        await db.collection('schedules').createIndex({ enabled: 1 });
        await db.collection('schedules').createIndex({ 'time.hour': 1, 'time.minute': 1 });
        await db.collection('schedules').createIndex({ owner: 1 });
        await db.collection('schedules').createIndex({ nextExecution: 1 });
        
        console.log('✅ Schedules collection created with indexes');
        
        // Create Automations collection
        await db.createCollection('automations', {
            validator: {
                $jsonSchema: {
                    bsonType: 'object',
                    required: ['name', 'trigger', 'action', 'owner'],
                    properties: {
                        name: { bsonType: 'string' },
                        enabled: { bsonType: 'bool', default: true },
                        priority: { bsonType: 'int', minimum: 0, maximum: 10, default: 5 },
                        trigger: { bsonType: 'object' },
                        action: { bsonType: 'object' },
                        cooldown: { bsonType: 'int', default: 300000 },
                        executionCount: { bsonType: 'int', default: 0 }
                    }
                }
            }
        });
        
        // Create Automations indexes
        await db.collection('automations').createIndex({ enabled: 1 });
        await db.collection('automations').createIndex({ priority: -1 });
        await db.collection('automations').createIndex({ 'trigger.type': 1 });
        await db.collection('automations').createIndex({ owner: 1 });
        
        console.log('✅ Automations collection created with indexes');
        
        // Create EnergyLogs collection
        await db.createCollection('energylogs', {
            validator: {
                $jsonSchema: {
                    bsonType: 'object',
                    required: ['deviceId', 'deviceName', 'energy', 'timestamp', 'owner'],
                    properties: {
                        deviceId: { bsonType: 'int' },
                        deviceName: { bsonType: 'string' },
                        energy: { bsonType: 'double', minimum: 0 },
                        power: { bsonType: 'double', minimum: 0 },
                        timestamp: { bsonType: 'date' },
                        hour: { bsonType: 'int', minimum: 0, maximum: 23 },
                        day: { bsonType: 'int', minimum: 1, maximum: 31 },
                        month: { bsonType: 'int', minimum: 1, maximum: 12 },
                        year: { bsonType: 'int' },
                        cost: { bsonType: 'double', minimum: 0 }
                    }
                }
            }
        });
        
        // Create EnergyLogs indexes
        await db.collection('energylogs').createIndex({ deviceId: 1 });
        await db.collection('energylogs').createIndex({ timestamp: -1 });
        await db.collection('energylogs').createIndex({ hour: 1, day: 1, month: 1, year: 1 });
        await db.collection('energylogs').createIndex({ owner: 1 });
        
        // Create compound index for time-based queries
        await db.collection('energylogs').createIndex({ 
            timestamp: -1, 
            deviceId: 1 
        });
        
        console.log('✅ EnergyLogs collection created with indexes');
        
        // Create Alerts collection
        await db.createCollection('alerts', {
            validator: {
                $jsonSchema: {
                    bsonType: 'object',
                    required: ['title', 'message', 'type', 'severity', 'source', 'owner'],
                    properties: {
                        title: { bsonType: 'string' },
                        message: { bsonType: 'string' },
                        type: { enum: ['device', 'system', 'security', 'energy', 'maintenance', 'automation', 'network', 'user'] },
                        severity: { enum: ['info', 'warning', 'error', 'critical'], default: 'info' },
                        source: { enum: ['system', 'device', 'esp32', 'user', 'automation', 'schedule'] },
                        status: { enum: ['active', 'acknowledged', 'resolved', 'dismissed'], default: 'active' },
                        expiresAt: { bsonType: 'date' }
                    }
                }
            }
        });
        
        // Create Alerts indexes
        await db.collection('alerts').createIndex({ status: 1 });
        await db.collection('alerts').createIndex({ severity: 1 });
        await db.collection('alerts').createIndex({ type: 1 });
        await db.collection('alerts').createIndex({ createdAt: -1 });
        await db.collection('alerts').createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });
        await db.collection('alerts').createIndex({ owner: 1 });
        
        console.log('✅ Alerts collection created with indexes');
        
        // Create Sessions collection
        await db.createCollection('sessions', {
            validator: {
                $jsonSchema: {
                    bsonType: 'object',
                    required: ['token', 'userId', 'expiresAt'],
                    properties: {
                        token: { bsonType: 'string' },
                        userId: { bsonType: 'objectId' },
                        ip: { bsonType: 'string' },
                        userAgent: { bsonType: 'string' },
                        expiresAt: { bsonType: 'date' }
                    }
                }
            }
        });
        
        // Create Sessions indexes
        await db.collection('sessions').createIndex({ token: 1 }, { unique: true });
        await db.collection('sessions').createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });
        
        console.log('✅ Sessions collection created with indexes');
        
        // Create SystemLogs collection (capped for performance)
        await db.createCollection('systemlogs', {
            capped: true,
            size: 10485760, // 10MB
            max: 10000, // Maximum 10,000 documents
            validator: {
                $jsonSchema: {
                    bsonType: 'object',
                    required: ['timestamp', 'level', 'message'],
                    properties: {
                        timestamp: { bsonType: 'date' },
                        level: { enum: ['info', 'warn', 'error', 'debug'] },
                        message: { bsonType: 'string' },
                        source: { bsonType: 'string' },
                        userId: { bsonType: 'objectId' },
                        requestId: { bsonType: 'string' }
                    }
                }
            }
        });
        
        // Create SystemLogs indexes
        await db.collection('systemlogs').createIndex({ timestamp: -1 });
        await db.collection('systemlogs').createIndex({ level: 1 });
        
        console.log('✅ SystemLogs capped collection created with indexes');
        
        // Create version tracking collection
        await db.createCollection('migrations', {
            validator: {
                $jsonSchema: {
                    bsonType: 'object',
                    required: ['version', 'name', 'appliedAt'],
                    properties: {
                        version: { bsonType: 'string' },
                        name: { bsonType: 'string' },
                        appliedAt: { bsonType: 'date' },
                        appliedBy: { bsonType: 'string' }
                    }
                }
            }
        });
        
        await db.collection('migrations').createIndex({ version: 1 }, { unique: true });
        
        console.log('✅ Migrations tracking collection created');
        
        // Record this migration
        await db.collection('migrations').insertOne({
            version: '001',
            name: 'Initial Schema Creation',
            appliedAt: new Date(),
            appliedBy: process.env.USER || 'system'
        });
        
        console.log('🎉 Migration 001 completed successfully!');
        return { success: true, collections: 8, indexes: 18 };
    },
    
    // Rollback migration
    down: async (db) => {
        console.log('⬇️ Rolling back migration 001...');
        
        const collections = [
            'users',
            'devices',
            'schedules',
            'automations',
            'energylogs',
            'alerts',
            'sessions',
            'systemlogs',
            'migrations'
        ];
        
        for (const collection of collections) {
            try {
                await db.collection(collection).drop();
                console.log(`✅ Dropped collection: ${collection}`);
            } catch (error) {
                console.log(`⚠️ Collection ${collection} does not exist or could not be dropped`);
            }
        }
        
        console.log('⬇️ Migration 001 rolled back successfully');
        return { success: true, dropped: collections.length };
    }
};