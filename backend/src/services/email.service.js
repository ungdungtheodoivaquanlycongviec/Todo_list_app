/**
 * Email Service using Nodemailer
 * Handles sending password reset codes and other transactional emails
 */

const nodemailer = require('nodemailer');
const env = require('../config/environment');

class EmailService {
    constructor() {
        this.transporter = null;
        this.initialized = false;
    }

    /**
     * Initialize the email transporter
     * Called lazily on first use
     */
    initialize() {
        if (this.initialized) return;

        if (!env.smtp.user || !env.smtp.pass) {
            console.warn('⚠️ SMTP credentials not configured. Email sending will be disabled.');
            this.initialized = true;
            return;
        }

        this.transporter = nodemailer.createTransport({
            host: env.smtp.host,
            port: env.smtp.port,
            secure: env.smtp.secure,
            auth: {
                user: env.smtp.user,
                pass: env.smtp.pass
            }
        });

        this.initialized = true;
        console.log('✅ Email service initialized');
    }

    /**
     * Send a password reset code email
     * @param {string} email - Recipient email address
     * @param {string} code - 6-digit reset code
     * @param {string} name - User's name (optional)
     * @returns {Promise<boolean>} - Success status
     */
    async sendPasswordResetCode(email, code, name = 'User') {
        this.initialize();

        if (!this.transporter) {
            console.warn('Email not sent - SMTP not configured. Code:', code);
            return false;
        }

        const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Password Reset Code</title>
      </head>
      <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f5f5f5;">
        <table role="presentation" style="width: 100%; border-collapse: collapse;">
          <tr>
            <td align="center" style="padding: 40px 0;">
              <table role="presentation" style="width: 100%; max-width: 600px; border-collapse: collapse; background-color: #ffffff; border-radius: 16px; box-shadow: 0 4px 24px rgba(0, 0, 0, 0.08);">
                <!-- Header -->
                <tr>
                  <td style="padding: 40px 40px 20px; text-align: center;">
                    <div style="width: 64px; height: 64px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 16px; margin: 0 auto 20px; display: flex; align-items: center; justify-content: center;">
                      <span style="font-size: 28px;">🔐</span>
                    </div>
                    <h1 style="margin: 0; font-size: 24px; font-weight: 700; color: #1a1a1a;">Password Reset Request</h1>
                  </td>
                </tr>
                
                <!-- Content -->
                <tr>
                  <td style="padding: 0 40px 20px;">
                    <p style="margin: 0 0 20px; font-size: 16px; color: #4a4a4a; line-height: 1.6;">
                      Hi ${name},
                    </p>
                    <p style="margin: 0 0 30px; font-size: 16px; color: #4a4a4a; line-height: 1.6;">
                      We received a request to reset your password. Use the verification code below to complete the process:
                    </p>
                    
                    <!-- Code Box -->
                    <div style="background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%); border-radius: 12px; padding: 30px; text-align: center; margin-bottom: 30px;">
                      <p style="margin: 0 0 10px; font-size: 14px; color: #6c757d; text-transform: uppercase; letter-spacing: 1px;">Your verification code</p>
                      <div style="font-size: 36px; font-weight: 700; letter-spacing: 8px; color: #1a1a1a; font-family: 'Courier New', monospace;">
                        ${code}
                      </div>
                    </div>
                    
                    <p style="margin: 0 0 10px; font-size: 14px; color: #6c757d; text-align: center;">
                      ⏱️ This code will expire in <strong>10 minutes</strong>
                    </p>
                  </td>
                </tr>
                
                <!-- Warning -->
                <tr>
                  <td style="padding: 0 40px 40px;">
                    <div style="background-color: #fff3cd; border-radius: 8px; padding: 16px; border-left: 4px solid #ffc107;">
                      <p style="margin: 0; font-size: 14px; color: #856404;">
                        <strong>⚠️ Security Notice:</strong> If you didn't request this password reset, please ignore this email or contact support if you have concerns.
                      </p>
                    </div>
                  </td>
                </tr>
                
                <!-- Footer -->
                <tr>
                  <td style="padding: 20px 40px; background-color: #f8f9fa; border-radius: 0 0 16px 16px; text-align: center;">
                    <p style="margin: 0; font-size: 12px; color: #6c757d;">
                      This is an automated message. Please do not reply to this email.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `;

        const textContent = `
Password Reset Request

Hi ${name},

We received a request to reset your password. Use the verification code below to complete the process:

Your verification code: ${code}

This code will expire in 10 minutes.

Security Notice: If you didn't request this password reset, please ignore this email or contact support if you have concerns.

This is an automated message. Please do not reply to this email.
    `;

        try {
            await this.transporter.sendMail({
                from: `"Todo App" <${env.smtp.from}>`,
                to: email,
                subject: 'Password Reset Code - Todo App',
                text: textContent,
                html: htmlContent
            });

            console.log(`✉️ Password reset code sent to ${email}`);
            return true;
        } catch (error) {
            console.error('Failed to send password reset email:', error);
            throw new Error('Failed to send password reset email');
        }
    }
}

module.exports = new EmailService();
