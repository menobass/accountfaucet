const nodemailer = require('nodemailer');

class EmailService {
    constructor() {
        this.transporter = null;
        this.isConfigured = false;
        this.initializeTransporter();
    }

    initializeTransporter() {
        if (!process.env.EMAIL_USER || !process.env.EMAIL_APP_PASSWORD) {
            console.log('⚠️  Email service not configured - credentials will only be logged');
            return;
        }

        try {
            this.transporter = nodemailer.createTransport({
                service: 'gmail',
                auth: {
                    user: process.env.EMAIL_USER,
                    pass: process.env.EMAIL_APP_PASSWORD
                }
            });

            this.isConfigured = true;
            console.log('📧 Email service initialized successfully');
        } catch (error) {
            console.error('❌ Failed to initialize email service:', error);
        }
    }

    async sendAccountCredentials(userEmail, accountData) {
        const { username, ownerKey, activeKey, postingKey, memoKey, requester } = accountData;

        const mailOptions = {
            from: '"Hive Account Faucet" <do-not-reply@hivefaucet.service>',
            to: userEmail,
            subject: '🔐 Your Hive Account Credentials - DO NOT REPLY',
            text: `
⚠️  THIS IS AN AUTOMATED MESSAGE - DO NOT REPLY ⚠️

🎉 Your Hive Account Has Been Created!

Username: ${username}
Owner Key: ${ownerKey}
Active Key: ${activeKey}
Posting Key: ${postingKey}
Memo Key: ${memoKey}

IMPORTANT: Save these keys securely!
Created by: @${requester}
Contact: @meno on Hive

⚠️  DO NOT REPLY TO THIS EMAIL ⚠️
            `
        };

        try {
            if (this.isConfigured) {
                console.log(`📧 Sending credentials to: ${userEmail}`);
                const result = await this.transporter.sendMail(mailOptions);
                console.log('✅ Email sent successfully');
                return { success: true, messageId: result.messageId };
            } else {
                console.log('⚠️  Email not configured - logging credentials:');
                console.log(`To: ${userEmail}`);
                console.log(mailOptions.text);
                return { success: false, reason: 'Email not configured' };
            }
        } catch (error) {
            console.error('❌ Failed to send email:', error);
            return { success: false, error: error.message };
        }
    }

    async testConnection() {
        if (!this.isConfigured) {
            return { success: false, message: 'Email service not configured' };
        }

        try {
            await this.transporter.verify();
            console.log('✅ Email connection verified');
            return { success: true, message: 'Connection verified' };
        } catch (error) {
            console.error('❌ Email connection failed:', error);
            return { success: false, error: error.message };
        }
    }
}

module.exports = EmailService;
