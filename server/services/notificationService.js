/**
 * Notification Service
 * Handles all notifications across multiple channels
 */

const nodemailer = require('nodemailer');
const twilio = require('twilio');
const fs = require('fs');
const path = require('path');

class NotificationService {
    constructor() {
        this.emailTransporter = null;
        this.twilioClient = null;
        this.webhookEndpoints = new Map();
        this.notificationQueue = [];
        this.isProcessing = false;
        
        this.init();
    }
    
    init() {
        // Initialize email transporter if configured
        if (process.env.SMTP_HOST && process.env.SMTP_USER) {
            this.emailTransporter = nodemailer.createTransport({
                host: process.env.SMTP_HOST,
                port: process.env.SMTP_PORT || 587,
                secure: process.env.SMTP_SECURE === 'true',
                auth: {
                    user: process.env.SMTP_USER,
                    pass: process.env.SMTP_PASS
                }
            });
        }
        
        // Initialize Twilio if configured
        if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
            this.twilioClient = twilio(
                process.env.TWILIO_ACCOUNT_SID,
                process.env.TWILIO_AUTH_TOKEN
            );
        }
        
        // Start processing queue
        setInterval(() => this.processQueue(), 1000);
    }
    
    /**
     * Send notification through multiple channels
     */
    async send(notification, channels = ['push']) {
        const notificationId = Date.now().toString();
        const results = [];
        
        // Store in queue
        this.notificationQueue.push({
            id: notificationId,
            notification,
            channels,
            timestamp: new Date()
        });
        
        // Process immediately if not already processing
        if (!this.isProcessing) {
            this.processQueue();
        }
        
        return {
            id: notificationId,
            status: 'queued',
            channels: channels
        };
    }
    
    /**
     * Process notification queue
     */
    async processQueue() {
        if (this.isProcessing || this.notificationQueue.length === 0) return;
        
        this.isProcessing = true;
        
        while (this.notificationQueue.length > 0) {
            const item = this.notificationQueue.shift();
            const results = [];
            
            for (const channel of item.channels) {
                try {
                    let result;
                    switch (channel) {
                        case 'email':
                            result = await this.sendEmail(item.notification);
                            break;
                        case 'sms':
                            result = await this.sendSMS(item.notification);
                            break;
                        case 'push':
                            result = await this.sendPush(item.notification);
                            break;
                        case 'webhook':
                            result = await this.sendWebhook(item.notification);
                            break;
                        default:
                            result = { error: 'Unknown channel' };
                    }
                    
                    results.push({ channel, success: true, result });
                } catch (error) {
                    results.push({ channel, success: false, error: error.message });
                    console.error(`Failed to send via ${channel}:`, error);
                }
            }
            
            // Log notification
            this.logNotification(item, results);
        }
        
        this.isProcessing = false;
    }
    
    /**
     * Send email notification
     */
    async sendEmail(notification) {
        if (!this.emailTransporter) {
            throw new Error('Email not configured');
        }
        
        const mailOptions = {
            from: process.env.SMTP_FROM || 'noreply@estifhome.com',
            to: notification.recipient.email,
            subject: notification.title,
            html: this.renderEmailTemplate(notification)
        };
        
        return await this.emailTransporter.sendMail(mailOptions);
    }
    
    /**
     * Send SMS notification
     */
    async sendSMS(notification) {
        if (!this.twilioClient) {
            throw new Error('SMS not configured');
        }
        
        const message = `${notification.title}: ${notification.message}`;
        
        return await this.twilioClient.messages.create({
            body: message,
            to: notification.recipient.phone,
            from: process.env.TWILIO_PHONE_NUMBER
        });
    }
    
    /**
     * Send push notification (Firebase Cloud Messaging)
     */
    async sendPush(notification) {
        // Implementation depends on FCM setup
        // This is a placeholder for actual FCM integration
        
        const pushData = {
            title: notification.title,
            body: notification.message,
            icon: notification.icon || '/icon.png',
            data: notification.data || {},
            badge: notification.badge,
            sound: notification.sound || 'default'
        };
        
        // In production, use FCM to send to device tokens
        console.log('Push notification:', pushData);
        
        return { success: true, message: 'Push notification queued' };
    }
    
    /**
     * Send webhook notification
     */
    async sendWebhook(notification) {
        const fetch = require('node-fetch');
        const webhookUrl = notification.webhookUrl;
        
        if (!webhookUrl) {
            throw new Error('Webhook URL not provided');
        }
        
        const response = await fetch(webhookUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Notification-Id': notification.id
            },
            body: JSON.stringify({
                title: notification.title,
                message: notification.message,
                data: notification.data,
                timestamp: new Date().toISOString()
            })
        });
        
        if (!response.ok) {
            throw new Error(`Webhook failed: ${response.status}`);
        }
        
        return await response.json();
    }
    
    /**
     * Register webhook endpoint for a user
     */
    registerWebhook(userId, url, events = ['*']) {
        this.webhookEndpoints.set(userId, {
            url,
            events,
            registeredAt: new Date()
        });
        
        return { success: true };
    }
    
    /**
     * Unregister webhook endpoint
     */
    unregisterWebhook(userId) {
        return this.webhookEndpoints.delete(userId);
    }
    
    /**
     * Render email template
     */
    renderEmailTemplate(notification) {
        return `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <title>${notification.title}</title>
                <style>
                    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                    .header { background: linear-gradient(135deg, #4361ee, #7209b7); color: white; padding: 20px; text-align: center; border-radius: 10px 10px 0 0; }
                    .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
                    .button { display: inline-block; padding: 10px 20px; background: #4361ee; color: white; text-decoration: none; border-radius: 5px; margin-top: 20px; }
                    .footer { margin-top: 20px; text-align: center; color: #666; font-size: 12px; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1>🏠 Estif Home</h1>
                    </div>
                    <div class="content">
                        <h2>${notification.title}</h2>
                        <p>${notification.message}</p>
                        ${notification.data ? `<pre>${JSON.stringify(notification.data, null, 2)}</pre>` : ''}
                        ${notification.actionUrl ? `<a href="${notification.actionUrl}" class="button">${notification.actionText || 'View Details'}</a>` : ''}
                    </div>
                    <div class="footer">
                        <p>Estif Home Smart System | Debre Markos University</p>
                        <p>This is an automated message, please do not reply.</p>
                    </div>
                </div>
            </body>
            </html>
        `;
    }
    
    /**
     * Log notification to database
     */
    async logNotification(item, results) {
        const notificationLog = {
            id: item.id,
            timestamp: item.timestamp,
            notification: {
                title: item.notification.title,
                message: item.notification.message,
                type: item.notification.type
            },
            recipient: item.notification.recipient?.id,
            channels: results,
            status: results.every(r => r.success) ? 'delivered' : 'partial'
        };
        
        // In production, save to database
        console.log('Notification logged:', notificationLog);
        
        // Also write to file for auditing
        const logPath = path.join(__dirname, '../../logs/notifications.log');
        fs.appendFileSync(logPath, JSON.stringify(notificationLog) + '\n');
    }
    
    /**
     * Send system alert to administrators
     */
    async sendSystemAlert(alert, severity = 'warning') {
        const adminEmails = process.env.ADMIN_EMAILS ? process.env.ADMIN_EMAILS.split(',') : [];
        
        if (adminEmails.length === 0) return;
        
        const notification = {
            title: `[${severity.toUpperCase()}] System Alert`,
            message: alert.message,
            type: 'system_alert',
            recipient: {
                email: adminEmails[0]
            },
            data: {
                severity,
                source: alert.source,
                timestamp: new Date().toISOString(),
                details: alert.details
            }
        };
        
        return await this.send(notification, ['email']);
    }
    
    /**
     * Send device status notification
     */
    async sendDeviceNotification(device, action, user) {
        const notification = {
            title: `Device ${action === 'on' ? 'Turned On' : 'Turned Off'}`,
            message: `${device.name} was turned ${action === 'on' ? 'ON' : 'OFF'} by ${user.name}`,
            type: 'device_status',
            recipient: {
                email: user.email,
                phone: user.phone
            },
            data: {
                deviceId: device.id,
                deviceName: device.name,
                action: action,
                userId: user.id,
                timestamp: new Date().toISOString()
            }
        };
        
        const channels = [];
        if (user.preferences?.notifications?.email) channels.push('email');
        if (user.preferences?.notifications?.sms) channels.push('sms');
        if (user.preferences?.notifications?.push) channels.push('push');
        
        if (channels.length > 0) {
            return await this.send(notification, channels);
        }
        
        return { success: false, reason: 'No notification channels enabled' };
    }
    
    /**
     * Send scheduled report
     */
    async sendReport(user, reportData, format = 'html') {
        const notification = {
            title: 'Your Smart Home Report',
            message: `Here's your ${reportData.period} energy usage report`,
            type: 'report',
            recipient: {
                email: user.email
            },
            data: reportData,
            actionUrl: `${process.env.APP_URL}/reports/${reportData.id}`,
            actionText: 'View Full Report'
        };
        
        return await this.send(notification, ['email']);
    }
    
    /**
     * Send maintenance reminder
     */
    async sendMaintenanceReminder(device, user) {
        const notification = {
            title: `Maintenance Reminder: ${device.name}`,
            message: `${device.name} has been running for ${Math.floor(device.totalRuntime)} hours. Recommended maintenance check.`,
            type: 'maintenance',
            recipient: {
                email: user.email,
                phone: user.phone
            },
            data: {
                deviceId: device.id,
                deviceName: device.name,
                runtime: device.totalRuntime,
                healthScore: device.healthScore
            }
        };
        
        return await this.send(notification, ['email', 'push']);
    }
}

module.exports = new NotificationService();