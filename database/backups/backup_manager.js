/**
 * Backup Manager
 * Handles database backups and restores
 */

const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);

class BackupManager {
    constructor() {
        this.backupDir = path.join(__dirname, 'backups');
        this.mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/estif-home';
        this.dbName = 'estif-home';
        
        // Ensure backup directory exists
        if (!fs.existsSync(this.backupDir)) {
            fs.mkdirSync(this.backupDir, { recursive: true });
        }
    }
    
    /**
     * Create a full database backup
     */
    async createBackup() {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const backupName = `backup_${timestamp}`;
        const backupPath = path.join(this.backupDir, backupName);
        
        console.log(`📦 Creating backup: ${backupName}`);
        
        try {
            // Create backup directory
            fs.mkdirSync(backupPath, { recursive: true });
            
            // Get all collections
            const collections = await this.getCollections();
            
            // Backup each collection
            for (const collection of collections) {
                await this.backupCollection(collection, backupPath);
            }
            
            // Create metadata file
            const metadata = {
                name: backupName,
                timestamp: new Date(),
                collections: collections,
                version: '1.0.0',
                database: this.dbName
            };
            
            fs.writeFileSync(
                path.join(backupPath, 'metadata.json'),
                JSON.stringify(metadata, null, 2)
            );
            
            // Create archive
            await this.createArchive(backupPath, backupName);
            
            // Clean up temporary directory
            fs.rmSync(backupPath, { recursive: true, force: true });
            
            // Clean old backups (keep last 10)
            await this.cleanOldBackups();
            
            console.log(`✅ Backup created: ${backupName}.zip`);
            return { success: true, name: backupName, path: `${backupName}.zip` };
            
        } catch (error) {
            console.error('❌ Backup failed:', error);
            return { success: false, error: error.message };
        }
    }
    
    /**
     * Backup a single collection
     */
    async backupCollection(collectionName, backupPath) {
        const mongoose = require('mongoose');
        const db = mongoose.connection.db;
        
        const data = await db.collection(collectionName).find({}).toArray();
        const filePath = path.join(backupPath, `${collectionName}.json`);
        
        fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
        console.log(`  ✅ Backed up: ${collectionName} (${data.length} documents)`);
        
        return { collection: collectionName, count: data.length };
    }
    
    /**
     * Get all collection names
     */
    async getCollections() {
        const mongoose = require('mongoose');
        const db = mongoose.connection.db;
        
        const collections = await db.listCollections().toArray();
        return collections.map(c => c.name).filter(name => !name.startsWith('system.'));
    }
    
    /**
     * Create zip archive of backup
     */
    async createArchive(backupPath, backupName) {
        const archiver = require('archiver');
        const archivePath = path.join(this.backupDir, `${backupName}.zip`);
        const output = fs.createWriteStream(archivePath);
        const archive = archiver('zip', { zlib: { level: 9 } });
        
        return new Promise((resolve, reject) => {
            output.on('close', () => {
                console.log(`  📦 Archive created: ${archivePath} (${archive.pointer()} bytes)`);
                resolve(archivePath);
            });
            
            archive.on('error', reject);
            archive.pipe(output);
            archive.directory(backupPath, false);
            archive.finalize();
        });
    }
    
    /**
     * Restore from backup
     */
    async restoreBackup(backupName) {
        const archivePath = path.join(this.backupDir, `${backupName}.zip`);
        
        if (!fs.existsSync(archivePath)) {
            throw new Error(`Backup not found: ${backupName}`);
        }
        
        console.log(`📦 Restoring backup: ${backupName}`);
        
        const extractPath = path.join(this.backupDir, `restore_${Date.now()}`);
        
        try {
            // Extract archive
            await this.extractArchive(archivePath, extractPath);
            
            // Read metadata
            const metadata = JSON.parse(
                fs.readFileSync(path.join(extractPath, 'metadata.json'), 'utf8')
            );
            
            // Restore each collection
            const mongoose = require('mongoose');
            const db = mongoose.connection.db;
            
            for (const collection of metadata.collections) {
                await this.restoreCollection(collection, extractPath, db);
            }
            
            // Clean up
            fs.rmSync(extractPath, { recursive: true, force: true });
            
            console.log(`✅ Backup restored: ${backupName}`);
            return { success: true, name: backupName, collections: metadata.collections };
            
        } catch (error) {
            console.error('❌ Restore failed:', error);
            
            // Clean up on error
            if (fs.existsSync(extractPath)) {
                fs.rmSync(extractPath, { recursive: true, force: true });
            }
            
            return { success: false, error: error.message };
        }
    }
    
    /**
     * Restore a single collection
     */
    async restoreCollection(collectionName, extractPath, db) {
        const filePath = path.join(extractPath, `${collectionName}.json`);
        
        if (!fs.existsSync(filePath)) {
            console.log(`  ⚠️ No data file for: ${collectionName}`);
            return;
        }
        
        const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        
        if (data.length > 0) {
            // Clear existing data
            await db.collection(collectionName).deleteMany({});
            
            // Insert backup data
            await db.collection(collectionName).insertMany(data);
            
            console.log(`  ✅ Restored: ${collectionName} (${data.length} documents)`);
        } else {
            console.log(`  ℹ️ Empty collection: ${collectionName}`);
        }
    }
    
    /**
     * Extract zip archive
     */
    async extractArchive(archivePath, extractPath) {
        const AdmZip = require('adm-zip');
        const zip = new AdmZip(archivePath);
        zip.extractAllTo(extractPath, true);
        console.log(`  📦 Extracted to: ${extractPath}`);
    }
    
    /**
     * List available backups
     */
    async listBackups() {
        const files = fs.readdirSync(this.backupDir);
        const backups = [];
        
        for (const file of files) {
            if (file.endsWith('.zip')) {
                const stats = fs.statSync(path.join(this.backupDir, file));
                backups.push({
                    name: file.replace('.zip', ''),
                    filename: file,
                    size: stats.size,
                    created: stats.birthtime,
                    sizeFormatted: this.formatBytes(stats.size)
                });
            }
        }
        
        backups.sort((a, b) => b.created - a.created);
        return backups;
    }
    
    /**
     * Clean old backups (keep last 10)
     */
    async cleanOldBackups() {
        const backups = await this.listBackups();
        
        if (backups.length > 10) {
            const toDelete = backups.slice(10);
            
            for (const backup of toDelete) {
                const backupPath = path.join(this.backupDir, backup.filename);
                fs.unlinkSync(backupPath);
                console.log(`  🗑️ Deleted old backup: ${backup.name}`);
            }
        }
    }
    
    /**
     * Export data to CSV
     */
    async exportToCSV(collectionName) {
        const mongoose = require('mongoose');
        const db = mongoose.connection.db;
        
        const data = await db.collection(collectionName).find({}).toArray();
        
        if (data.length === 0) {
            return null;
        }
        
        const headers = Object.keys(data[0]);
        const rows = data.map(obj => headers.map(header => JSON.stringify(obj[header] || '')).join(','));
        
        const csv = [headers.join(','), ...rows].join('\n');
        const filename = `${collectionName}_export_${Date.now()}.csv`;
        const filepath = path.join(this.backupDir, filename);
        
        fs.writeFileSync(filepath, csv);
        
        return { filename, path: filepath, count: data.length };
    }
    
    /**
     * Format bytes to human readable
     */
    formatBytes(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }
    
    /**
     * Get backup statistics
     */
    async getStats() {
        const backups = await this.listBackups();
        const totalSize = backups.reduce((sum, b) => sum + b.size, 0);
        
        return {
            totalBackups: backups.length,
            totalSize: totalSize,
            totalSizeFormatted: this.formatBytes(totalSize),
            latestBackup: backups[0] || null,
            oldestBackup: backups[backups.length - 1] || null,
            backupDir: this.backupDir
        };
    }
}

// Export singleton instance
module.exports = new BackupManager();

// Run if called directly
if (require.main === module) {
    const mongoose = require('mongoose');
    const dotenv = require('dotenv');
    dotenv.config();
    
    const command = process.argv[2];
    const backupName = process.argv[3];
    
    const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/estif-home';
    
    mongoose.connect(mongoURI).then(async () => {
        console.log('Connected to MongoDB\n');
        
        switch(command) {
            case 'create':
                await module.exports.createBackup();
                break;
            case 'restore':
                if (!backupName) {
                    console.error('Please specify backup name');
                    process.exit(1);
                }
                await module.exports.restoreBackup(backupName);
                break;
            case 'list':
                const backups = await module.exports.listBackups();
                console.log('Available backups:');
                backups.forEach(b => {
                    console.log(`  📁 ${b.name} - ${b.sizeFormatted} - ${b.created}`);
                });
                break;
            case 'stats':
                const stats = await module.exports.getStats();
                console.log('Backup Statistics:');
                console.log(`  Total backups: ${stats.totalBackups}`);
                console.log(`  Total size: ${stats.totalSizeFormatted}`);
                if (stats.latestBackup) {
                    console.log(`  Latest: ${stats.latestBackup.name} (${stats.latestBackup.sizeFormatted})`);
                }
                break;
            default:
                console.log(`
Backup Manager Usage:
  node backup_manager.js create    - Create a new backup
  node backup_manager.js list      - List all backups
  node backup_manager.js restore <name> - Restore a backup
  node backup_manager.js stats     - Show backup statistics
                `);
        }
        
        await mongoose.disconnect();
        process.exit(0);
    }).catch(error => {
        console.error('Error:', error);
        process.exit(1);
    });
}