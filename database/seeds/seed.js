/**
 * Seed: Initial Data for Estif Home
 * 
 * Run with: node database/seeds/seed.js
 */

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// Default device configuration
const defaultDevices = [
    { id: 0, name: "Light", nameAm: "መብራት", gpio: 23, type: "light", power: 10, room: "Living Room", roomAm: "ሳሎን", icon: "💡", autoMode: false, state: false },
    { id: 1, name: "Fan", nameAm: "ማራገቢያ", gpio: 22, type: "fan", power: 40, room: "Bedroom", roomAm: "መኝታ", icon: "🌀", autoMode: true, state: false },
    { id: 2, name: "AC", nameAm: "አየር ማቀዝቀዣ", gpio: 21, type: "ac", power: 120, room: "Master", roomAm: "ዋና", icon: "❄️", autoMode: true, state: false, targetTemp: 24 },
    { id: 3, name: "TV", nameAm: "ቴሌቪዥን", gpio: 19, type: "tv", power: 80, room: "Entertainment", roomAm: "መዝናኛ", icon: "📺", autoMode: false, state: false },
    { id: 4, name: "Heater", nameAm: "ማሞቂያ", gpio: 18, type: "heater", power: 1500, room: "Bathroom", roomAm: "መታጠቢያ", icon: "🔥", autoMode: true, state: false },
    { id: 5, name: "Pump", nameAm: "ፓምፕ", gpio: 5, type: "pump", power: 250, room: "Garden", roomAm: "አትክልት", icon: "💧", autoMode: false, state: false }
];

// Default schedules
const defaultSchedules = [
    { name: "Morning Light", nameAm: "የጠዋት መብራት", type: "device", deviceId: 0, action: "on", time: { hour: 6, minute: 30 }, days: [1,2,3,4,5], repeat: "weekly", enabled: true },
    { name: "Night Light", nameAm: "የማታ መብራት", type: "device", deviceId: 0, action: "off", time: { hour: 22, minute: 0 }, days: [0,1,2,3,4,5,6], repeat: "daily", enabled: true },
    { name: "Morning Fan", nameAm: "የጠዋት ማራገቢያ", type: "device", deviceId: 1, action: "on", time: { hour: 8, minute: 0 }, days: [1,2,3,4,5], repeat: "weekly", enabled: true },
    { name: "Evening Fan", nameAm: "የማታ ማራገቢያ", type: "device", deviceId: 1, action: "off", time: { hour: 18, minute: 0 }, days: [1,2,3,4,5], repeat: "weekly", enabled: true },
    { name: "Garden Pump", nameAm: "የአትክልት ፓምፕ", type: "device", deviceId: 5, action: "on", time: { hour: 10, minute: 0 }, days: [0,1,2,3,4,5,6], repeat: "daily", enabled: true },
    { name: "Garden Pump Off", nameAm: "የአትክልት ፓምፕ አጥፋ", type: "device", deviceId: 5, action: "off", time: { hour: 16, minute: 0 }, days: [0,1,2,3,4,5,6], repeat: "daily", enabled: true }
];

// Default automation rules
const defaultAutomations = [
    {
        name: "Temperature Control - AC",
        nameAm: "የሙቀት መቆጣጠሪያ - ኤሲ",
        enabled: true,
        priority: 8,
        trigger: { type: "temperature", condition: "greater_than", value: 26 },
        action: { type: "device", deviceId: 2, action: "on" },
        cooldown: 300000
    },
    {
        name: "Temperature Control - Heater",
        nameAm: "የሙቀት መቆጣጠሪያ - ማሞቂያ",
        enabled: true,
        priority: 8,
        trigger: { type: "temperature", condition: "less_than", value: 18 },
        action: { type: "device", deviceId: 4, action: "on" },
        cooldown: 300000
    }
];

// Create admin user
const createAdminUser = async (db) => {
    const hashedPassword = await bcrypt.hash('admin123', 10);
    
    const adminUser = {
        email: 'admin@estifhome.com',
        password: hashedPassword,
        name: 'Admin User',
        role: 'admin',
        status: 'active',
        emailVerified: true,
        preferences: {
            language: 'en',
            theme: 'light',
            timezone: 'Africa/Addis_Ababa',
            temperatureUnit: 'celsius',
            notifications: {
                email: true,
                push: true,
                sound: true,
                sms: false
            }
        },
        createdAt: new Date(),
        updatedAt: new Date()
    };
    
    const result = await db.collection('users').updateOne(
        { email: adminUser.email },
        { $setOnInsert: adminUser },
        { upsert: true }
    );
    
    if (result.upsertedCount > 0) {
        console.log('✅ Admin user created');
    } else {
        console.log('ℹ️ Admin user already exists');
    }
    
    return adminUser;
};

// Seed devices
const seedDevices = async (db, userId) => {
    for (const device of defaultDevices) {
        const result = await db.collection('devices').updateOne(
            { id: device.id },
            {
                $setOnInsert: {
                    ...device,
                    owner: userId,
                    createdAt: new Date(),
                    healthScore: 100,
                    totalRuntime: 0,
                    cycleCount: 0,
                    errorCount: 0
                }
            },
            { upsert: true }
        );
        
        if (result.upsertedCount > 0) {
            console.log(`✅ Device created: ${device.name}`);
        }
    }
};

// Seed schedules
const seedSchedules = async (db, userId) => {
    for (const schedule of defaultSchedules) {
        const result = await db.collection('schedules').updateOne(
            { name: schedule.name, owner: userId },
            {
                $setOnInsert: {
                    ...schedule,
                    owner: userId,
                    createdAt: new Date(),
                    lastExecuted: null,
                    executionCount: 0
                }
            },
            { upsert: true }
        );
        
        if (result.upsertedCount > 0) {
            console.log(`✅ Schedule created: ${schedule.name}`);
        }
    }
};

// Seed automations
const seedAutomations = async (db, userId) => {
    for (const automation of defaultAutomations) {
        const result = await db.collection('automations').updateOne(
            { name: automation.name, owner: userId },
            {
                $setOnInsert: {
                    ...automation,
                    owner: userId,
                    createdAt: new Date(),
                    lastExecuted: null,
                    executionCount: 0,
                    successCount: 0,
                    failCount: 0
                }
            },
            { upsert: true }
        );
        
        if (result.upsertedCount > 0) {
            console.log(`✅ Automation created: ${automation.name}`);
        }
    }
};

// Main seed function
module.exports = {
    name: 'Initial Data Seed',
    description: 'Seeds the database with initial users, devices, schedules, and automations',
    
    run: async (db) => {
        console.log('🌱 Seeding database...\n');
        
        // Create admin user
        const adminUser = await createAdminUser(db);
        const userId = adminUser._id || (await db.collection('users').findOne({ email: 'admin@estifhome.com' }))._id;
        
        // Seed devices
        await seedDevices(db, userId);
        
        // Seed schedules
        await seedSchedules(db, userId);
        
        // Seed automations
        await seedAutomations(db, userId);
        
        // Record seed
        await db.collection('seeds').updateOne(
            { name: 'initial_data' },
            {
                $set: {
                    name: 'initial_data',
                    appliedAt: new Date(),
                    appliedBy: process.env.USER || 'system',
                    version: '1.0.0'
                }
            },
            { upsert: true }
        );
        
        console.log('\n🎉 Database seeding completed successfully!');
        return { success: true };
    },
    
    // Clean seed data
    clean: async (db) => {
        console.log('🧹 Cleaning seeded data...');
        
        await db.collection('devices').deleteMany({});
        await db.collection('schedules').deleteMany({});
        await db.collection('automations').deleteMany({});
        await db.collection('seeds').deleteOne({ name: 'initial_data' });
        
        console.log('🧹 Seeded data cleaned');
        return { success: true };
    }
};

// Run directly if called from command line
if (require.main === module) {
    const mongoose = require('mongoose');
    const dotenv = require('dotenv');
    dotenv.config();
    
    const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/estif-home';
    
    mongoose.connect(mongoURI).then(async () => {
        console.log('Connected to MongoDB');
        await module.exports.run(mongoose.connection.db);
        await mongoose.disconnect();
        console.log('Disconnected from MongoDB');
        process.exit(0);
    }).catch(error => {
        console.error('Seed failed:', error);
        process.exit(1);
    });
}