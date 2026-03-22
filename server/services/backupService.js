/**
 * Backup Service
 * Handles system backups, restores, and data export
 */

const fs = require('fs');
const path = require('path');
const archiver = require('archiver');
const crypto = require('crypto');

class BackupService {
    constructor() {
        this.backupDir = path.join(__dirname, '../../database/backups');
        this.maxBackups = 10;
        this.encryptionKey = process.env.ENCRYPTION_KEY;
        
        this.ensureBackupDir();
    }
    
    ensureBackupDir() {
        if (!fs.existsSync(this.backupDir)) {
            fs.mkdirSync(this.backupDir, { recursive: true });
        }
    }
    
    /**
     * Create a full system backup
     */
    async createBackup(userId, options = {}) {
        const backupId = `backup_${Date.now()}_${userId}`;
        const backupPath = path.join(this.backupDir, backupId);
        const timestamp = new Date();
        
        // Create backup directory
        fs.mkdirSync(backupPath);
        
        try {
            // Backup device states
            await this.backupDeviceStates(backupPath);
            
            // Backup user data
            await this.backupUserData(backupPath, userId);
            
            // Backup automation rules
            await this.backupAutomationData(backupPath);
            
            // Backup schedules
            await this.backupSchedules(backupPath);
            
            // Backup settings
            await this.backupSettings(backupPath);
            
            // Create metadata
            const metadata = {
                id: backupId,
                timestamp,
                userId,
                type: 'full',
                version: '1.0.0',
                files: fs.readdirSync(backupPath),
                size: this.getDirectorySize(backupPath)
            };
            
            fs.writeFileSync(
                path.join(backupPath, 'metadata.json'),
                JSON.stringify(metadata, null, 2)
            );
            
            // Create archive
            const archivePath = await this.createArchive(backupPath, backupId);
            
            // Clean up temporary directory
            fs.rmSync(backupPath, { recursive: true, force: true });
            
            // Clean old backups
            await this.cleanOldBackups();
            
            return {
                success: true,
                backupId,
                path: archivePath,
                size: metadata.size,
                timestamp
            };
        } catch (error) {
            console.error('Backup creation failed:', error);
            // Clean up on failure
            if (fs.existsSync(backupPath)) {
                fs.rmSync(backupPath, { recursive: true, force: true });
            }
            throw error;
        }
    }
    
    /**
     * Backup device states
     */
    async backupDeviceStates(backupPath) {
        const devices = global.deviceStates?.devices || [];
        const deviceData = {
            devices,
            systemStats: global.deviceStates?.systemStats,
            lastUpdated: new Date(),
            version: '1.0.0'
        };
        
        fs.writeFileSync(
            path.join(backupPath, 'devices.json'),
            JSON.stringify(deviceData, null, 2)
        );
    }
    
    /**
     * Backup user data
     */
    async backupUserData(backupPath, userId) {
        // In production, fetch from database
        const userData = {
            users: [
                {
                    id: userId,
                    email: 'admin@estifhome.com',
                    name: 'Admin User',
                    role: 'admin',
                    preferences: {
                        language: 'en',
                        theme: 'light',
                        timezone: 'Africa/Addis_Ababa'
                    }
                }
            ],
            timestamp: new Date()
        };
        
        fs.writeFileSync(
            path.join(backupPath, 'users.json'),
            JSON.stringify(userData, null, 2)
        );
    }
    
    /**
     * Backup automation data
     */
    async backupAutomationData(backupPath) {
        const automationData = {
            rules: global.automationRules || [],
            history: [],
            timestamp: new Date()
        };
        
        fs.writeFileSync(
            path.join(backupPath, 'automation.json'),
            JSON.stringify(automationData, null, 2)
        );
    }
    
    /**
     * Backup schedules
     */
    async backupSchedules(backupPath) {
        const scheduleData = {
            schedules: global.schedules || [],
            timestamp: new Date()
        };
        
        fs.writeFileSync(
            path.join(backupPath, 'schedules.json'),
            JSON.stringify(scheduleData, null, 2)
        );
    }
    
    /**
     * Backup system settings
     */
    async backupSettings(backupPath) {
        const settings = {
            system: {
                name: 'Estif Home',
                version: '1.0.0',
                timezone: 'Africa/Addis_Ababa'
            },
            security: {
                twoFactorEnabled: false,
                sessionTimeout: 3600
            },
            timestamp: new Date()
        };
        
        fs.writeFileSync(
            path.join(backupPath, 'settings.json'),
            JSON.stringify(settings, null, 2)
        );
    }
    
    /**
     * Create encrypted archive of backup
     */
    async createArchive(backupPath, backupId) {
        const archivePath = path.join(this.backupDir, `${backupId}.zip`);
        const output = fs.createWriteStream(archivePath);
        const archive = archiver('zip', { zlib: { level: 9 } });
        
        return new Promise((resolve, reject) => {
            output.on('close', () => resolve(archivePath));
            archive.on('error', reject);
            
            archive.pipe(output);
            archive.directory(backupPath, false);
            archive.finalize();
        });
    }
    
    /**
     * Restore from backup
     */
    async restoreBackup(backupId, userId) {
        const archivePath = path.join(this.backupDir, `${backupId}.zip`);
        
        if (!fs.existsSync(archivePath)) {
            throw new Error('Backup file not found');
        }
        
        const extractPath = path.join(this.backupDir, `restore_${backupId}`);
        
        // Extract archive
        await this.extractArchive(archivePath, extractPath);
        
        try {
            // Validate backup
            const metadata = JSON.parse(
                fs.readFileSync(path.join(extractPath, 'metadata.json'), 'utf8')
            );
            
            // Restore devices
            const devicesData = JSON.parse(
                fs.readFileSync(path.join(extractPath, 'devices.json'), 'utf8')
            );
            
            if (global.deviceStates) {
                global.deviceStates.devices = devicesData.devices;
                global.deviceStates.systemStats = devicesData.systemStats;
            }
            
            // Restore automation
            const automationData = JSON.parse(
                fs.readFileSync(path.join(extractPath, 'automation.json'), 'utf8')
            );
            
            if (global.automationRules) {
                global.automationRules = automationData.rules;
            }
            
            // Restore schedules
            const scheduleData = JSON.parse(
                fs.readFileSync(path.join(extractPath, 'schedules.json'), 'utf8')
            );
            
            if (global.schedules) {
                global.schedules = scheduleData.schedules;
            }
            
            // Log restore
            console.log(`Restored from backup ${backupId} at ${new Date().toISOString()}`);
            
            return {
                success: true,
                backupId,
                restoredAt: new Date(),
                metadata
            };
        } finally {
            // Clean up extraction directory
            if (fs.existsSync(extractPath)) {
                fs.rmSync(extractPath, { recursive: true, force: true });
            }
        }
    }
    
    /**
     * Extract zip archive
     */
    async extractArchive(archivePath, extractPath) {
        const AdmZip = require('adm-zip');
        const zip = new AdmZip(archivePath);
        zip.extractAllTo(extractPath, true);
    }
    
    /**
     * List available backups
     */
    async listBackups() {
        const backups = [];
        const files = fs.readdirSync(this.backupDir);
        
        for (const file of files) {
            if (file.endsWith('.zip')) {
                const backupId = file.replace('.zip', '');
                const stats = fs.statSync(path.join(this.backupDir, file));
                
                // Try to read metadata
                let metadata = null;
                try {
                    const metadataPath = path.join(this.backupDir, backupId, 'metadata.json');
                    if (fs.existsSync(metadataPath)) {
                        metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf8'));
                    }
                } catch (e) {
                    // Ignore
                }
                
                backups.push({
                    id: backupId,
                    filename: file,
                    size: stats.size,
                    created: stats.birthtime,
                    metadata
                });
            }
        }
        
        // Sort by date (newest first)
        backups.sort((a, b) => b.created - a.created);
        
        return backups;
    }
    
    /**
     * Clean old backups
     */
    async cleanOldBackups() {
        const backups = await this.listBackups();
        
        if (backups.length > this.maxBackups) {
            const toDelete = backups.slice(this.maxBackups);
            
            for (const backup of toDelete) {
                const backupPath = path.join(this.backupDir, backup.filename);
                fs.unlinkSync(backupPath);
                console.log(`Deleted old backup: ${backup.id}`);
            }
        }
    }
    
    /**
     * Export data in specific format
     */
    async exportData(dataType, format = 'json', userId) {
        let data;
        
        switch(dataType) {
            case 'devices':
                data = global.deviceStates?.devices || [];
                break;
            case 'energy':
                data = global.energyLogs || [];
                break;
            case 'activity':
                data = global.activityLog || [];
                break;
            case 'users':
                data = await this.getUserData(userId);
                break;
            case 'all':
                data = {
                    devices: global.deviceStates?.devices || [],
                    energy: global.energyLogs || [],
                    activity: global.activityLog || [],
                    timestamp: new Date()
                };
                break;
            default:
                throw new Error(`Unknown data type: ${dataType}`);
        }
        
        if (format === 'csv') {
            return this.convertToCSV(data);
        }
        
        return JSON.stringify(data, null, 2);
    }
    
    /**
     * Convert data to CSV format
     */
    convertToCSV(data) {
        if (!data || data.length === 0) return '';
        
        const headers = Object.keys(data[0]);
        const rows = data.map(obj => headers.map(header => JSON.stringify(obj[header] || '')).join(','));
        
        return [headers.join(','), ...rows].join('\n');
    }
    
    /**
     * Get user data for export
     */
    async getUserData(userId) {
        // In production, fetch from database
        return {
            user: {
                id: userId,
                email: 'admin@estifhome.com',
                name: 'Admin User',
                preferences: {
                    language: 'en',
                    theme: 'light'
                }
            },
            devices: global.deviceStates?.devices || [],
            timestamp: new Date()
        };
    }
    
    /**
     * Schedule automatic backups
     */
    scheduleBackup(interval = 'daily', userId) {
        const cron = require('node-cron');
        
        let cronExpression;
        switch(interval) {
            case 'daily':
                cronExpression = '0 3 * * *'; // 3 AM daily
                break;
            case 'weekly':
                cronExpression = '0 3 * * 0'; // 3 AM Sunday
                break;
            case 'monthly':
                cronExpression = '0 3 1 * *'; // 3 AM 1st of month
                break;
            default:
                throw new Error(`Unknown interval: ${interval}`);
        }
        
        const task = cron.schedule(cronExpression, async () => {
            console.log(`Running scheduled ${interval} backup...`);
            await this.createBackup(userId);
        });
        
        return {
            scheduled: true,
            interval,
            nextRun: task.nextDates().toDate()
        };
    }
    
    /**
     * Calculate directory size
     */
    getDirectorySize(dirPath) {
        let size = 0;
        const files = fs.readdirSync(dirPath);
        
        for (const file of files) {
            const filePath = path.join(dirPath, file);
            const stats = fs.statSync(filePath);
            
            if (stats.isDirectory()) {
                size += this.getDirectorySize(filePath);
            } else {
                size += stats.size;
            }
        }
        
        return size;
    }
    
    /**
     * Encrypt data (optional)
     */
    encrypt(data, key = this.encryptionKey) {
        if (!key) return data;
        
        const iv = crypto.randomBytes(16);
        const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(key, 'hex'), iv);
        
        let encrypted = cipher.update(JSON.stringify(data), 'utf8', 'hex');
        encrypted += cipher.final('hex');
        
        return {
            iv: iv.toString('hex'),
            data: encrypted
        };
    }
    
    /**
     * Decrypt data
     */
    decrypt(encryptedData, key = this.encryptionKey) {
        if (!key) return encryptedData;
        
        const decipher = crypto.createDecipheriv(
            'aes-256-cbc',
            Buffer.from(key, 'hex'),
            Buffer.from(encryptedData.iv, 'hex')
        );
        
        let decrypted = decipher.update(encryptedData.data, 'hex', 'utf8');
        decrypted += decipher.final('utf8');
        
        return JSON.parse(decrypted);
    }
}

module.exports = new BackupService();