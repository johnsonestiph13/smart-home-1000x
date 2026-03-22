/**
 * Storage Manager Module
 * Handles localStorage, sessionStorage, and IndexedDB operations
 */

class StorageManager {
    constructor() {
        this.prefix = 'estif_home_';
        this.defaultTTL = 7 * 24 * 60 * 60 * 1000; // 7 days
        this.dbName = 'EstifHomeDB';
        this.dbVersion = 1;
        this.db = null;
        
        this.init();
    }
    
    async init() {
        await this.initIndexedDB();
        this.cleanExpired();
        
        // Clean expired items every hour
        setInterval(() => this.cleanExpired(), 60 * 60 * 1000);
    }
    
    // ========== Local Storage Methods ==========
    
    set(key, value, ttl = null) {
        const item = {
            value: value,
            timestamp: Date.now(),
            ttl: ttl || this.defaultTTL
        };
        
        try {
            localStorage.setItem(this.getKey(key), JSON.stringify(item));
            return true;
        } catch (error) {
            console.error('Failed to save to localStorage:', error);
            
            // If quota exceeded, clean old items
            if (error.name === 'QuotaExceededError') {
                this.cleanOldItems();
                try {
                    localStorage.setItem(this.getKey(key), JSON.stringify(item));
                    return true;
                } catch (retryError) {
                    console.error('Still failed after cleanup:', retryError);
                }
            }
            return false;
        }
    }
    
    get(key, defaultValue = null) {
        try {
            const item = localStorage.getItem(this.getKey(key));
            if (!item) return defaultValue;
            
            const data = JSON.parse(item);
            
            // Check if expired
            if (this.isExpired(data)) {
                this.remove(key);
                return defaultValue;
            }
            
            return data.value;
        } catch (error) {
            console.error('Failed to get from localStorage:', error);
            return defaultValue;
        }
    }
    
    remove(key) {
        localStorage.removeItem(this.getKey(key));
    }
    
    clear() {
        const keys = Object.keys(localStorage);
        keys.forEach(key => {
            if (key.startsWith(this.prefix)) {
                localStorage.removeItem(key);
            }
        });
    }
    
    // ========== Session Storage Methods ==========
    
    setSession(key, value) {
        try {
            sessionStorage.setItem(this.getKey(key), JSON.stringify(value));
            return true;
        } catch (error) {
            console.error('Failed to save to sessionStorage:', error);
            return false;
        }
    }
    
    getSession(key, defaultValue = null) {
        try {
            const item = sessionStorage.getItem(this.getKey(key));
            if (!item) return defaultValue;
            return JSON.parse(item);
        } catch (error) {
            console.error('Failed to get from sessionStorage:', error);
            return defaultValue;
        }
    }
    
    removeSession(key) {
        sessionStorage.removeItem(this.getKey(key));
    }
    
    clearSession() {
        const keys = Object.keys(sessionStorage);
        keys.forEach(key => {
            if (key.startsWith(this.prefix)) {
                sessionStorage.removeItem(key);
            }
        });
    }
    
    // ========== IndexedDB Methods ==========
    
    async initIndexedDB() {
        return new Promise((resolve, reject) => {
            if (!window.indexedDB) {
                console.warn('IndexedDB not supported');
                reject(new Error('IndexedDB not supported'));
                return;
            }
            
            const request = indexedDB.open(this.dbName, this.dbVersion);
            
            request.onerror = () => {
                console.error('Failed to open IndexedDB');
                reject(request.error);
            };
            
            request.onsuccess = () => {
                this.db = request.result;
                resolve(this.db);
            };
            
            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                
                // Create stores
                if (!db.objectStoreNames.contains('activities')) {
                    const activityStore = db.createObjectStore('activities', { keyPath: 'id', autoIncrement: true });
                    activityStore.createIndex('timestamp', 'timestamp', { unique: false });
                    activityStore.createIndex('type', 'type', { unique: false });
                }
                
                if (!db.objectStoreNames.contains('cache')) {
                    const cacheStore = db.createObjectStore('cache', { keyPath: 'key' });
                    cacheStore.createIndex('expiry', 'expiry', { unique: false });
                }
                
                if (!db.objectStoreNames.contains('offline_data')) {
                    db.createObjectStore('offline_data', { keyPath: 'id' });
                }
            };
        });
    }
    
    async saveToIndexedDB(storeName, data) {
        if (!this.db) await this.initIndexedDB();
        
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([storeName], 'readwrite');
            const store = transaction.objectStore(storeName);
            const request = store.put(data);
            
            request.onsuccess = () => resolve(true);
            request.onerror = () => reject(request.error);
        });
    }
    
    async getFromIndexedDB(storeName, key) {
        if (!this.db) await this.initIndexedDB();
        
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([storeName], 'readonly');
            const store = transaction.objectStore(storeName);
            const request = store.get(key);
            
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }
    
    async getAllFromIndexedDB(storeName, indexName = null, value = null) {
        if (!this.db) await this.initIndexedDB();
        
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([storeName], 'readonly');
            const store = transaction.objectStore(storeName);
            let request;
            
            if (indexName && value !== null) {
                const index = store.index(indexName);
                request = index.getAll(value);
            } else {
                request = store.getAll();
            }
            
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }
    
    async deleteFromIndexedDB(storeName, key) {
        if (!this.db) await this.initIndexedDB();
        
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([storeName], 'readwrite');
            const store = transaction.objectStore(storeName);
            const request = store.delete(key);
            
            request.onsuccess = () => resolve(true);
            request.onerror = () => reject(request.error);
        });
    }
    
    async clearIndexedDB(storeName) {
        if (!this.db) await this.initIndexedDB();
        
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([storeName], 'readwrite');
            const store = transaction.objectStore(storeName);
            const request = store.clear();
            
            request.onsuccess = () => resolve(true);
            request.onerror = () => reject(request.error);
        });
    }
    
    // ========== Cache Methods ==========
    
    async setCache(key, value, ttl = 3600000) { // Default 1 hour
        const cacheItem = {
            key: key,
            value: value,
            expiry: Date.now() + ttl
        };
        
        await this.saveToIndexedDB('cache', cacheItem);
        return true;
    }
    
    async getCache(key) {
        const item = await this.getFromIndexedDB('cache', key);
        if (!item) return null;
        
        if (item.expiry < Date.now()) {
            await this.deleteFromIndexedDB('cache', key);
            return null;
        }
        
        return item.value;
    }
    
    async clearCache() {
        await this.clearIndexedDB('cache');
    }
    
    // ========== Activity Log Methods ==========
    
    async logActivity(activity) {
        const activityItem = {
            ...activity,
            timestamp: Date.now()
        };
        
        await this.saveToIndexedDB('activities', activityItem);
        
        // Keep only last 1000 activities
        const allActivities = await this.getAllFromIndexedDB('activities');
        if (allActivities.length > 1000) {
            const toDelete = allActivities.slice(0, allActivities.length - 1000);
            for (const item of toDelete) {
                await this.deleteFromIndexedDB('activities', item.id);
            }
        }
        
        return true;
    }
    
    async getActivities(limit = 100, type = null) {
        let activities = await this.getAllFromIndexedDB('activities', 'timestamp');
        
        if (type) {
            activities = activities.filter(a => a.type === type);
        }
        
        return activities.slice(0, limit);
    }
    
    async clearActivities() {
        await this.clearIndexedDB('activities');
    }
    
    // ========== Offline Data Methods ==========
    
    async saveOfflineData(key, data) {
        const offlineItem = {
            id: key,
            data: data,
            timestamp: Date.now(),
            synced: false
        };
        
        await this.saveToIndexedDB('offline_data', offlineItem);
        return true;
    }
    
    async getOfflineData(key) {
        const item = await this.getFromIndexedDB('offline_data', key);
        return item ? item.data : null;
    }
    
    async getUnsyncedData() {
        const allData = await this.getAllFromIndexedDB('offline_data');
        return allData.filter(item => !item.synced);
    }
    
    async markSynced(key) {
        const item = await this.getFromIndexedDB('offline_data', key);
        if (item) {
            item.synced = true;
            await this.saveToIndexedDB('offline_data', item);
        }
    }
    
    // ========== Utility Methods ==========
    
    getKey(key) {
        return `${this.prefix}${key}`;
    }
    
    isExpired(item) {
        if (!item.ttl) return false;
        return Date.now() - item.timestamp > item.ttl;
    }
    
    cleanExpired() {
        const keys = Object.keys(localStorage);
        keys.forEach(key => {
            if (key.startsWith(this.prefix)) {
                try {
                    const item = JSON.parse(localStorage.getItem(key));
                    if (this.isExpired(item)) {
                        localStorage.removeItem(key);
                    }
                } catch (e) {
                    // Invalid JSON, remove it
                    localStorage.removeItem(key);
                }
            }
        });
    }
    
    cleanOldItems() {
        const items = [];
        const keys = Object.keys(localStorage);
        
        keys.forEach(key => {
            if (key.startsWith(this.prefix)) {
                try {
                    const item = JSON.parse(localStorage.getItem(key));
                    items.push({
                        key: key,
                        timestamp: item.timestamp || 0
                    });
                } catch (e) {
                    items.push({ key: key, timestamp: 0 });
                }
            }
        });
        
        // Sort by timestamp (oldest first)
        items.sort((a, b) => a.timestamp - b.timestamp);
        
        // Remove oldest 20% to free space
        const toRemove = Math.ceil(items.length * 0.2);
        for (let i = 0; i < toRemove; i++) {
            localStorage.removeItem(items[i].key);
        }
    }
    
    getStorageInfo() {
        let total = 0;
        let used = 0;
        
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            const value = localStorage.getItem(key);
            used += (key.length + value.length) * 2; // Approximate size in bytes
        }
        
        // Estimate total (usually 5-10MB for localStorage)
        total = 5 * 1024 * 1024; // 5MB estimate
        
        return {
            used: used,
            total: total,
            percentage: (used / total * 100).toFixed(2),
            itemCount: localStorage.length,
            indexedDB: !!this.db
        };
    }
    
    exportData() {
        const data = {};
        const keys = Object.keys(localStorage);
        
        keys.forEach(key => {
            if (key.startsWith(this.prefix)) {
                try {
                    data[key] = JSON.parse(localStorage.getItem(key));
                } catch (e) {
                    data[key] = localStorage.getItem(key);
                }
            }
        });
        
        return JSON.stringify(data, null, 2);
    }
    
    importData(jsonData) {
        try {
            const data = JSON.parse(jsonData);
            Object.entries(data).forEach(([key, value]) => {
                if (key.startsWith(this.prefix)) {
                    localStorage.setItem(key, JSON.stringify(value));
                }
            });
            return true;
        } catch (error) {
            console.error('Failed to import data:', error);
            return false;
        }
    }
}

// Initialize Storage Manager
window.storageManager = new StorageManager();

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = StorageManager;
}