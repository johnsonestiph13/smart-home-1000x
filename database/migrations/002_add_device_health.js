/**
 * Migration: 002_add_device_health.js
 * Adds device health monitoring fields and indexes
 */

module.exports = {
    version: '002',
    name: 'Add Device Health Monitoring',
    description: 'Adds health tracking fields to devices collection',
    
    up: async (db) => {
        console.log('📦 Running migration 002: Add Device Health Monitoring...');
        
        // Update devices collection with new health fields
        await db.collection('devices').updateMany(
            {},
            {
                $set: {
                    healthScore: 100,
                    lastMaintenance: null,
                    lastError: null,
                    errorCount: 0,
                    totalRuntime: 0,
                    cycleCount: 0,
                    lastStateChange: null,
                    energyConsumed: 0,
                    firmwareVersion: '1.0.0'
                }
            }
        );
        
        // Add health tracking indexes
        await db.collection('devices').createIndex({ healthScore: 1 });
        await db.collection('devices').createIndex({ lastMaintenance: 1 });
        await db.collection('devices').createIndex({ errorCount: 1 });
        
        console.log('✅ Device health fields added');
        
        // Record migration
        await db.collection('migrations').insertOne({
            version: '002',
            name: 'Add Device Health Monitoring',
            appliedAt: new Date(),
            appliedBy: process.env.USER || 'system'
        });
        
        return { success: true };
    },
    
    down: async (db) => {
        console.log('⬇️ Rolling back migration 002...');
        
        await db.collection('devices').updateMany(
            {},
            {
                $unset: {
                    healthScore: '',
                    lastMaintenance: '',
                    lastError: '',
                    errorCount: '',
                    totalRuntime: '',
                    cycleCount: '',
                    lastStateChange: '',
                    energyConsumed: '',
                    firmwareVersion: ''
                }
            }
        );
        
        await db.collection('devices').dropIndex('healthScore_1');
        await db.collection('devices').dropIndex('lastMaintenance_1');
        await db.collection('devices').dropIndex('errorCount_1');
        
        console.log('⬇️ Migration 002 rolled back');
        return { success: true };
    }
};