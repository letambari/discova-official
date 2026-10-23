const net = require('net');
const tls = require('tls');

/**
 * Lightweight RFC 5321 / RFC 5322 Native Node.js SMTP Client
 * Zero external npm dependencies. Supports plain, STARTTLS, SSL/TLS, and AUTH LOGIN.
 */
class SmtpClient {
  constructor(config = {}) {
    this.host = config.host || '';
    this.port = parseInt(config.port, 10) || 587;
    this.secure = config.secure === true || config.secure === 'true' || this.port === 465;
    this.user = config.user || '';
    this.pass = config.pass || '';
    this.fromEmail = config.fromEmail || 'noreply@discova.africa';
    this.fromName = config.fromName || 'Discova Africa Tech';
    this.timeout = config.timeout || 15000;
  }

  /**
   * Send an email over SMTP
   * @param {Object} options { to, subject, html, text, from }
   * @returns {Promise<{success: boolean, messageId?: string, error?: string}>}
   */
  async sendMail(options) {
    if (!this.host) {
      return { success: false, error: 'SMTP host is not configured' };
    }

    const recipient = options.to;
    const subject = options.subject;
    const sender = options.from || `"${this.fromName}" <${this.fromEmail}>`;
    const senderAddress = this.fromEmail;
    const bodyHtml = options.html || options.text || '';
    const logs = [];

    return new Promise((resolve) => {
      let socket = null;
      let upgraded = false;
      let buffer = '';

      const log = (msg) => logs.push(`[${new Date().toISOString().substring(11, 19)}] ${msg}`);

      const cleanup = () => {
        if (socket && !socket.destroyed) {
          socket.destroy();
        }
      };

      const timer = setTimeout(() => {
        cleanup();
        resolve({ success: false, error: 'SMTP connection timed out after 15 seconds', logs });
      }, this.timeout);

      // Read responses by line / code
      const executeStep = (expectedCode, onMatch) => {
        const handler = (data) => {
          buffer += data.toString('utf8');
          const lines = buffer.split('\r\n');
          // If we have at least one complete line
          for (let i = 0; i < lines.length - 1; i++) {
            const line = lines[i];
            log(`<< ${line}`);
            // Check for multiline response: code followed by '-' means continuation, space means final line
            const match = line.match(/^(\d{3})([ -])(.*)$/);
            if (match) {
              const code = parseInt(match[1], 10);
              const isFinal = match[2] === ' ';
              if (isFinal) {
                buffer = lines.slice(i + 1).join('\r\n');
                socket.off('data', handler);
                if (code === expectedCode || (Array.isArray(expectedCode) && expectedCode.includes(code))) {
                  onMatch(code, line);
                } else {
                  cleanup();
                  clearTimeout(timer);
                  resolve({ success: false, error: `SMTP Error: Expected ${expectedCode}, got ${line}`, logs });
                }
                return;
              }
            }
          }
        };
        socket.on('data', handler);
      };

      const sendCmd = (cmd, maskLog) => {
        log(`>> ${maskLog || cmd}`);
        socket.write(cmd + '\r\n');
      };

      const connectSocket = () => {
        log(`Connecting to ${this.host}:${this.port} (secure: ${this.secure})...`);
        if (this.secure) {
          socket = tls.connect({ host: this.host, port: this.port, rejectUnauthorized: false });
        } else {
          socket = net.createConnection({ host: this.host, port: this.port });
        }

        socket.on('error', (err) => {
          cleanup();
          clearTimeout(timer);
          log(`Socket Error: ${err.message}`);
          resolve({ success: false, error: `Socket Connection Error: ${err.message}`, logs });
        });

        // Step 1: Wait for 220 banner
        executeStep(220, () => {
          // Step 2: Send EHLO
          sendCmd('EHLO discova.africa');
          executeStep(250, () => {
            // Step 3: Upgrade with STARTTLS if port 587 and not already secure
            if (!this.secure && this.port === 587 && !upgraded) {
              sendCmd('STARTTLS');
              executeStep(220, () => {
                log('Upgrading plain connection to TLS...');
                upgraded = true;
                const secureSocket = tls.connect({
                  socket,
                  host: this.host,
                  rejectUnauthorized: false
                });
                socket = secureSocket;

                socket.on('error', (err) => {
                  cleanup();
                  clearTimeout(timer);
                  resolve({ success: false, error: `TLS Upgrade Error: ${err.message}`, logs });
                });

                // Re-send EHLO on upgraded TLS connection
                sendCmd('EHLO discova.africa');
                executeStep(250, () => proceedAuth());
              });
            } else {
              proceedAuth();
            }
          });
        });
      };

      const proceedAuth = () => {
        if (this.user && this.pass) {
          log('Initiating AUTH LOGIN...');
          sendCmd('AUTH LOGIN');
          executeStep(334, () => {
            sendCmd(Buffer.from(this.user).toString('base64'), '<base64 username>');
            executeStep(334, () => {
              sendCmd(Buffer.from(this.pass).toString('base64'), '<base64 password>');
              executeStep(235, () => proceedMail());
            });
          });
        } else {
          proceedMail();
        }
      };

      const proceedMail = () => {
        sendCmd(`MAIL FROM:<${senderAddress}>`);
        executeStep(250, () => {
          sendCmd(`RCPT TO:<${recipient}>`);
          executeStep(250, () => {
            sendCmd('DATA');
            executeStep(354, () => {
              const messageId = `<discova-${Date.now()}-${Math.random().toString(36).substring(2, 8)}@${this.host}>`;
              const headers = [
                `From: ${sender}`,
                `To: <${recipient}>`,
                `Subject: ${subject}`,
                `Message-ID: ${messageId}`,
                `Date: ${new Date().toUTCString()}`,
                `MIME-Version: 1.0`,
                `Content-Type: text/html; charset=utf-8`,
                `Content-Transfer-Encoding: 7bit`,
                ``,
                bodyHtml,
                `.`
              ].join('\r\n');

              log('Sending email body payload...');
              socket.write(headers + '\r\n');
              executeStep(250, () => {
                sendCmd('QUIT');
                clearTimeout(timer);
                cleanup();
                log('Email sent successfully!');
                resolve({ success: true, messageId, logs });
              });
            });
          });
        });
      };

      try {
        connectSocket();
      } catch (err) {
        clearTimeout(timer);
        cleanup();
        resolve({ success: false, error: err.message, logs });
      }
    });
  }

  /**
   * Diagnostic test of SMTP connection & authentication
   */
  async testConnection(testRecipient = null) {
    if (!this.host) {
      return { success: false, error: 'Please enter a valid SMTP host' };
    }
    const target = testRecipient || this.fromEmail || 'test@discova.africa';
    return await this.sendMail({
      to: target,
      subject: 'Discova SMTP Configuration Test Successful',
      html: `
        <div style="font-family: sans-serif; padding: 24px; background: #06070B; color: #FFFFFF; border-radius: 12px;">
          <h2 style="color: #4F46E5;">Discova Africa — SMTP Connection Verified!</h2>
          <p>This diagnostic email confirms that your SMTP server <strong>${this.host}:${this.port}</strong> is successfully connected, authenticated, and ready to dispatch live emails.</p>
          <hr style="border: 1px solid rgba(255,255,255,0.1); margin: 20px 0;">
          <p style="font-size: 12px; color: #94A3B8;">Timestamp: ${new Date().toISOString()}</p>
        </div>
      `
    });
  }
}

module.exports = SmtpClient;
