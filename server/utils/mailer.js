const db = require('../db');
const SmtpClient = require('./smtp');

/**
 * Branded HTML Email Template Wrapper
 */
function createEmailTemplate({ title, greeting, leadText, buttonText, buttonUrl, noteText }) {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${title}</title>
    </head>
    <body style="margin: 0; padding: 0; background-color: #06070B; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #FFFFFF;">
      <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #06070B; padding: 40px 15px;">
        <tr>
          <td align="center">
            <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 580px; background-color: #0F172A; border: 1px solid rgba(255, 255, 255, 0.12); border-radius: 18px; overflow: hidden; box-shadow: 0 20px 40px rgba(0, 0, 0, 0.5);">
              <!-- Header / Logo -->
              <tr>
                <td style="padding: 32px 36px 20px; border-bottom: 1px solid rgba(255, 255, 255, 0.08);">
                  <table cellpadding="0" cellspacing="0">
                    <tr>
                      <td style="background: linear-gradient(135deg, #3B82F6, #8B5CF6); width: 32px; height: 32px; border-radius: 8px; text-align: center; vertical-align: middle; color: #FFFFFF; font-weight: 900; font-size: 16px;">
                        D
                      </td>
                      <td style="padding-left: 12px; font-size: 20px; font-weight: 800; letter-spacing: -0.5px; color: #FFFFFF;">
                        discova
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>

              <!-- Body Content -->
              <tr>
                <td style="padding: 36px;">
                  <h1 style="font-size: 22px; font-weight: 800; color: #FFFFFF; margin-top: 0; margin-bottom: 16px; letter-spacing: -0.3px;">
                    ${title}
                  </h1>
                  <p style="font-size: 15px; line-height: 1.6; color: #E2E8F0; margin-bottom: 8px;">
                    ${greeting}
                  </p>
                  <p style="font-size: 15px; line-height: 1.6; color: #94A3B8; margin-bottom: 28px;">
                    ${leadText}
                  </p>

                  <!-- CTA Button -->
                  ${buttonText && buttonUrl ? `
                    <div style="margin: 32px 0;">
                      <a href="${buttonUrl}" style="display: inline-block; background: linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%); color: #FFFFFF; font-weight: 700; font-size: 15px; padding: 14px 28px; text-decoration: none; border-radius: 12px; box-shadow: 0 6px 18px rgba(79, 70, 229, 0.35);">
                        ${buttonText}
                      </a>
                    </div>
                    <p style="font-size: 12px; color: #64748B; line-height: 1.5; margin-bottom: 16px;">
                      If button doesn't open, copy and paste this link in your browser:<br>
                      <a href="${buttonUrl}" style="color: #60A5FA; word-break: break-all;">${buttonUrl}</a>
                    </p>
                  ` : ''}

                  ${noteText ? `
                    <div style="background: rgba(255, 255, 255, 0.04); border-left: 3px solid #6366F1; padding: 12px 16px; border-radius: 6px; margin-top: 24px;">
                      <p style="font-size: 13px; color: #94A3B8; margin: 0; line-height: 1.5;">${noteText}</p>
                    </div>
                  ` : ''}
                </td>
              </tr>

              <!-- Footer -->
              <tr>
                <td style="padding: 24px 36px; background-color: rgba(6, 7, 11, 0.5); border-top: 1px solid rgba(255, 255, 255, 0.06); text-align: center;">
                  <p style="font-size: 12px; color: #64748B; margin: 0 0 6px 0;">
                    Discova Africa Tech — Showcasing the future of African digital innovation.
                  </p>
                  <p style="font-size: 11px; color: #475569; margin: 0;">
                    Lagos • Nairobi • Cape Town • Kigali • Accra • Cairo
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
}

class MailerService {
  /**
   * Log an email dispatch record into SQLite
   */
  static logEmail({ recipient, subject, actionType, actionUrl, status, errorMessage }) {
    try {
      db.prepare(`
        INSERT INTO email_logs (recipient, subject, action_type, action_url, status, error_message, sent_at)
        VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
      `).run(recipient, subject, actionType || 'general', actionUrl || null, status, errorMessage || null);
    } catch (err) {
      console.error('[Mailer Log Error]:', err.message);
    }
  }

  /**
   * Dispatch an email via configured SMTP or simulate in development
   */
  static async dispatchMail({ to, subject, html, actionType, actionUrl, customConfig = null }) {
    const smtpEnabled = customConfig
      ? (customConfig.enabled === true || customConfig.enabled === 'true')
      : (db.getSetting('smtp_enabled', 'false') === 'true');

    const config = customConfig || {
      host: db.getSetting('smtp_host', ''),
      port: db.getSetting('smtp_port', '587'),
      secure: db.getSetting('smtp_secure', 'false'),
      user: db.getSetting('smtp_user', ''),
      pass: db.getSetting('smtp_pass', ''),
      fromEmail: db.getSetting('smtp_from_email', 'noreply@discova.africa'),
      fromName: db.getSetting('smtp_from_name', 'Discova Africa Tech')
    };

    // Real SMTP Sending
    if (smtpEnabled && config.host) {
      console.log(`[Mailer] Dispatching real SMTP email to ${to} via ${config.host}:${config.port}...`);
      const client = new SmtpClient(config);
      const res = await client.sendMail({
        to,
        subject,
        html,
        from: `"${config.fromName}" <${config.fromEmail}>`
      });

      if (res.success) {
        MailerService.logEmail({
          recipient: to,
          subject,
          actionType,
          actionUrl,
          status: 'sent',
          errorMessage: null
        });
        return { success: true, mode: 'smtp', messageId: res.messageId, actionUrl };
      } else {
        console.warn(`[Mailer] SMTP failed: ${res.error}. Falling back to simulated outbox log.`);
        MailerService.logEmail({
          recipient: to,
          subject,
          actionType,
          actionUrl,
          status: 'failed',
          errorMessage: res.error
        });
        return { success: false, mode: 'smtp', error: res.error, actionUrl };
      }
    }

    // Simulated / In-App Outbox Mode (Default when SMTP is OFF)
    console.log(`[Mailer] [In-App Outbox] Simulated email to ${to} | Subject: "${subject}" | Action: ${actionUrl}`);
    MailerService.logEmail({
      recipient: to,
      subject,
      actionType,
      actionUrl,
      status: 'simulated',
      errorMessage: null
    });

    return {
      success: true,
      mode: 'simulated',
      message: 'Email logged to In-App Outbox (SMTP delivery is turned OFF in admin settings)',
      actionUrl
    };
  }

  /**
   * Send Account Verification Email
   */
  static async sendVerificationEmail(user, token, origin = 'http://localhost:3000') {
    const actionUrl = `${origin}/verify-email.html?token=${encodeURIComponent(token)}`;
    const html = createEmailTemplate({
      title: 'Verify Your Discova Account',
      greeting: `Hi ${user.name || 'Maker'},`,
      leadText: 'Welcome to Discova! Please confirm your email address to activate your profile, submit African tech products, and cast upvotes.',
      buttonText: 'Verify My Account',
      buttonUrl: actionUrl,
      noteText: 'If you did not register for an account on Discova, please safely ignore this message.'
    });

    return await MailerService.dispatchMail({
      to: user.email,
      subject: 'Verify your Discova Africa account',
      html,
      actionType: 'verification',
      actionUrl
    });
  }

  /**
   * Send Password Reset Email
   */
  static async sendPasswordResetEmail(user, token, origin = 'http://localhost:3000') {
    const actionUrl = `${origin}/reset-password.html?token=${encodeURIComponent(token)}`;
    const html = createEmailTemplate({
      title: 'Reset Your Password',
      greeting: `Hello ${user.name || 'Builder'},`,
      leadText: 'We received a request to reset your password for your Discova account. Click the button below to choose a new password.',
      buttonText: 'Reset Password',
      buttonUrl: actionUrl,
      noteText: 'For security purposes, this password reset link will expire in 1 hour. If you did not request this, your account is safe and no action is required.'
    });

    return await MailerService.dispatchMail({
      to: user.email,
      subject: 'Reset your Discova Africa password',
      html,
      actionType: 'password_reset',
      actionUrl
    });
  }

  /**
   * Diagnostic Test Email
   */
  static async sendTestEmail(targetEmail, customConfig = null) {
    const html = createEmailTemplate({
      title: 'SMTP Diagnostic Test Successful',
      greeting: 'Congratulations!',
      leadText: 'Your SMTP mail server configuration is working correctly. Live emails for account verification and password resets can now be delivered.',
      noteText: `Timestamp: ${new Date().toISOString()}`
    });

    return await MailerService.dispatchMail({
      to: targetEmail,
      subject: 'Discova Africa — SMTP Configuration Test',
      html,
      actionType: 'test',
      actionUrl: null,
      customConfig
    });
  }
}

module.exports = MailerService;
