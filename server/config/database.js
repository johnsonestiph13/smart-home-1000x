/**
 * Database Configuration
 * Handles MongoDB connection, models, and database operations
 */

const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

class DatabaseConfig {
    constructor() {
        this.isConnected = false;
        this.connection = null;
        this.retryCount = 0;
        this.maxRetries = 5;
        this.retryDelay = 5000; // 5 seconds
        
        // MongoDB connection options
        this.options = {
            useNewUrlParser: true,
            useUnifiedTopology: true,
            serverSelectionTimeoutMS: 5000,
            socketTimeoutMS: 45000,
            family: 4, // Use IPv4, skip trying IPv6
            maxPoolSize: 10,
            minPoolSize: 2,
            maxIdleTimeMS: 10000,
            waitQueueTimeoutMS: 10000
        };
    }
    
    /**
     * Connect to MongoDB database
     */
    async connect() {
        const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/estif-home';
        
        try {
            console.log('Connecting to MongoDB...');
            
            this.connection = await mongoose.connect(mongoURI, this.options);
            this.isConnected = true;
            this.retryCount = 0;
            
            console.log('✅ MongoDB connected successfully');
            console.log(`   Database: ${this.connection.connection.name}`);
            console.log(`   Host: ${this.connection.connection.host}`);
            console.log(`   Port: ${this.connection.connection.port}`);
            
            // Setup event listeners
            this.setupEventListeners();
            
            return this.connection;
        } catch (error) {
            console.error('❌ MongoDB connection error:', error.message);
            this.isConnected = false;
            
            // Retry connection
            if (this.retryCount < this.maxRetries) {
                this.retryCount++;
                console.log(`Retrying connection (${this.retryCount}/${this.maxRetries}) in ${this.retryDelay/1000}s...`);
                setTimeout(() => this.connect(), this.retryDelay);
            } else {
                console.error('Max retries reached. Failed to connect to MongoDB.');
                console.log('Starting server without database...');
            }
            
            return null;
        }
    }
    
    /**
     * Setup mongoose event listeners
     */
    setupEventListeners() {
        mongoose.connection.on('error', (err) => {
            console.error('MongoDB connection error:', err);
            this.isConnected = false;
        });
        
        mongoose.connection.on('disconnected', () => {
            console.log('MongoDB disconnected');
            this.isConnected = false;
            
            // Attempt to reconnect
            setTimeout(() => this.connect(), this.retryDelay);
        });
        
        mongoose.connection.on('reconnected', () => {
            console.log('MongoDB reconnected');
            this.isConnected = true;
        });
        
        // Graceful shutdown
        process.on('SIGINT', async () => {
            await this.disconnect();
            process.exit(0);
        });
        
        process.on('SIGTERM', async () => {
            await this.disconnect();
            process.exit(0);
        });
    }
    
    /**
     * Disconnect from database
     */
    async disconnect() {
        if (this.isConnected) {
            await mongoose.disconnect();
            console.log('MongoDB disconnected gracefully');
            this.isConnected = false;
        }
    }
    
    /**
     * Check database health
     */
    async healthCheck() {
        if (!this.isConnected) {
            return { status: 'disconnected', timestamp: new Date() };
        }
        
        try {
            await mongoose.connection.db.admin().ping();
            return {
                status: 'healthy',
                timestamp: new Date(),
                database: mongoose.connection.name,
                host: mongoose.connection.host,
                models: Object.keys(mongoose.models).length
            };
        } catch (error) {
            return {
                status: 'unhealthy',
                error: error.message,
                timestamp: new Date()
            };
        }
    }
    
    /**
     * Get database statistics
     */
    async getStats() {
        if (!this.isConnected) return null;
        
        try {
            const stats = await mongoose.connection.db.stats();
            const collections = await mongoose.connection.db.listCollections().toArray();
            
            return {
                database: mongoose.connection.name,
                collections: collections.length,
                indexes: stats.indexes,
                dataSize: stats.dataSize,
                storageSize: stats.storageSize,
                avgObjSize: stats.avgObjSize,
                objects: stats.objects,
                ok: stats.ok
            };
        } catch (error) {
            console.error('Failed to get database stats:', error);
            return null;
        }
    }
    
    /**
     * Create database backup
     */
    async createBackup() {
        if (!this.isConnected) return null;
        
        const backupDir = path.join(__dirname, '../../database/backups');
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const backupPath = path.join(backupDir, `mongodb_backup_${timestamp}.json`);
        
        // Ensure backup directory exists
        if (!fs.existsSync(backupDir)) {
            fs.mkdirSync(backupDir, { recursive: true });
        }
        
        try {
            const collections = await mongoose.connection.db.listCollections().toArray();
            const backup = {};
            
            for (const collection of collections) {
                const data = await mongoose.connection.db.collection(collection.name).find({}).toArray();
                backup[collection.name] = data;
            }
            
            fs.writeFileSync(backupPath, JSON.stringify(backup, null, 2));
            console.log(`Database backup created: ${backupPath}`);
            
            return {
                success: true,
                path: backupPath,
                size: fs.statSync(backupPath).size,
                timestamp: new Date(),
                collections: Object.keys(backup).length
            };
        } catch (error) {
            console.error('Failed to create backup:', error);
            return { success: false, error: error.message };
        }
    }
    
    /**
     * Restore database from backup
     */
    async restoreBackup(backupPath) {
        if (!this.isConnected) return null;
        
        try {
            const backup = JSON.parse(fs.readFileSync(backupPath, 'utf8'));
            
            for (const [collectionName, data] of Object.entries(backup)) {
                const collection = mongoose.connection.db.collection(collectionName);
                
                // Clear existing data
                await collection.deleteMany({});
                
                // Insert backup data
                if (data.length > 0) {
                    await collection.insertMany(data);
                }
            }
            
            console.log(`Database restored from: ${backupPath}`);
            
            return {
                success: true,
                timestamp: new Date(),
                collections: Object.keys(backup).length,
                documents: Object.values(backup).reduce((sum, arr) => sum + arr.length, 0)
            };
        } catch (error) {
            console.error('Failed to restore backup:', error);
            return { success: false, error: error.message };
        }
    }
    
    /**
     * Run database migrations
     */
    async runMigrations() {
        const migrationsDir = path.join(__dirname, '../../database/migrations');
        
        if (!fs.existsSync(migrationsDir)) {
            console.log('No migrations directory found');
            return [];
        }
        
        const migrations = fs.readdirSync(migrationsDir)
            .filter(file => file.endsWith('.js'))
            .sort();
        
        const results = [];
        
        for (const migration of migrations) {
            try {
                const migrationModule = require(path.join(migrationsDir, migration));
                const result = await migrationModule.up(mongoose.connection.db);
                
                results.push({
                    migration,
                    success: true,
                    result
                });
                
                console.log(`✅ Migration completed: ${migration}`);
            } catch (error) {
                console.error(`❌ Migration failed: ${migration}`, error);
                results.push({
                    migration,
                    success: false,
                    error: error.message
                });
            }
        }
        
        return results;
    }
    
    /**
     * Seed database with initial data
     */
    async seedDatabase() {
        const seedsDir = path.join(__dirname, '../../database/seeds');
        
        if (!fs.existsSync(seedsDir)) {
            console.log('No seeds directory found');
            return [];
        }
        
        const seeds = fs.readdirSync(seedsDir)
            .filter(file => file.endsWith('.js'))
            .sort();
        
        const results = [];
        
        for (const seed of seeds) {
            try {
                const seedModule = require(path.join(seedsDir, seed));
                const result = await seedModule.run(mongoose.connection.db);
                
                results.push({
                    seed,
                    success: true,
                    result
                });
                
                console.log(`✅ Seed completed: ${seed}`);
            } catch (error) {
                console.error(`❌ Seed failed: ${seed}`, error);
                results.push({
                    seed,
                    success: false,
                    error: error.message
                });
            }
        }
        
        return results;
    }
    
    /**
     * Create database indexes
     */
    async createIndexes() {
        const models = mongoose.models;
        const results = [];
        
        for (const [name, model] of Object.entries(models)) {
            try {
                const indexes = await model.schema.indexes();
                const created = [];
                
                for (const [fields, options] of indexes) {
                    const indexName = await model.collection.createIndex(fields, options);
                    created.push(indexName);
                }
                
                results.push({
                    model: name,
                    indexes: created.length,
                    created
                });
                
                console.log(`✅ Indexes created for ${name}: ${created.length}`);
            } catch (error) {
                console.error(`❌ Failed to create indexes for ${name}:`, error);
                results.push({
                    model: name,
                    error: error.message
                });
            }
        }
        
        return results;
    }
    
    /**
     * Get model instance
     */
    getModel(modelName) {
        return mongoose.model(modelName);
    }
    
    /**
     * Check if model exists
     */
    hasModel(modelName) {
        return mongoose.models.hasOwnProperty(modelName);
    }
    
    /**
     * Get all models
     */
    getModels() {
        return Object.keys(mongoose.models);
    }
    
    /**
     * Execute transaction
     */
    async transaction(callback) {
        const session = await mongoose.startSession();
        session.startTransaction();
        
        try {
            const result = await callback(session);
            await session.commitTransaction();
            return result;
        } catch (error) {
            await session.abortTransaction();
            throw error;
        } finally {
            session.endSession();
        }
    }
}

// Export singleton instance
module.exports = new DatabaseConfig();