const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const db = require('../db');
const MailerService = require('../utils/mailer');

// Cryptographic Password Hashing Utilities (Scrypt derivation)
function hashPassword(password, salt) {
  return crypto.scryptSync(password, salt, 64).toString('hex');
}

function verifyPassword(password, salt, storedHash) {
  try {
    const hash = hashPassword(password, salt);
    return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(storedHash, 'hex'));
  } catch (err) {
    return false;
  }
}

// Seed default demo user and platform administrator if missing
function seedDefaultAccounts() {
  try {
    // 1. Demo Maker User
    const existing = db.prepare('SELECT id FROM users WHERE email = ?').get('robinson@pxxl.app');
    if (!existing) {
      const salt = crypto.randomBytes(16).toString('hex');
      const hash = hashPassword('password123', salt);
      db.prepare(`
        INSERT INTO users (name, email, password_hash, salt, role, avatar_url, is_verified, is_admin)
        VALUES (?, ?, ?, ?, ?, ?, 1, 0)
      `).run(
        'Robinson Honour',
        'robinson@pxxl.app',
        hash,
        salt,
        'Founder, Pxxl',
        'images/founder_robinson.jpg'
      );
    }

    // 2. Platform Administrator
    const existingAdmin = db.prepare('SELECT id FROM users WHERE email = ?').get('admin@discova.africa');
    if (!existingAdmin) {
      const salt = crypto.randomBytes(16).toString('hex');
      const hash = hashPassword('Admin12345!', salt);
      db.prepare(`
        INSERT INTO users (name, email, password_hash, salt, role, avatar_url, is_verified, is_admin)
        VALUES (?, ?, ?, ?, ?, ?, 1, 1)
      `).run(
        'Discova Platform Administrator',
        'admin@discova.africa',
        hash,
        salt,
        'Platform Administrator',
        'https://ui-avatars.com/api/?name=Admin+Discova&background=4F46E5&color=fff&size=128'
      );
    }
  } catch (err) {
    console.warn('[Auth Seed] Notice:', err.message);
  }
}
seedDefaultAccounts();

// Helper to generate a bearer session token
function generateSessionToken(user) {
  const payload = `${user.id}:${user.email}:${Date.now()}`;
  return 'discova_sess_' + Buffer.from(payload).toString('base64');
}

function getReqOrigin(req) {
  if (req.headers && req.headers.origin) return req.headers.origin;
  if (typeof req.get === 'function' && req.protocol && req.get('host')) {
    return `${req.protocol}://${req.get('host')}`;
  }
  return 'http://localhost:3000';
}

// POST /api/auth/register - Create a new user account
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, role } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, error: 'Full name is required' });
    }

    if (!email || !email.trim()) {
      return res.status(400).json({ success: false, error: 'Email address is required' });
    }

    const cleanEmail = email.trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(cleanEmail)) {
      return res.status(400).json({ success: false, error: 'Please provide a valid email address' });
    }

    if (!password || password.length < 6) {
      return res.status(400).json({ success: false, error: 'Password must be at least 6 characters long' });
    }

    // Check if email already registered
    const existingUser = db.prepare('SELECT id FROM users WHERE email = ?').get(cleanEmail);
    if (existingUser) {
      return res.status(409).json({
        success: false,
        error: 'An account with this email address already exists. Please sign in instead.'
      });
    }

    // Check if email verification is globally required by Admin settings
    const requireVerification = db.getSetting('require_email_verification', 'false') === 'true';

    // Salt and hash the password
    const salt = crypto.randomBytes(16).toString('hex');
    const passwordHash = hashPassword(password, salt);
    const userRole = (role && role.trim()) ? role.trim() : 'Maker & Builder';
    const cleanName = name.trim();
    const avatarUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(cleanName)}&background=4F46E5&color=fff&size=128`;

    let isVerified = requireVerification ? 0 : 1;
    let verificationToken = requireVerification ? crypto.randomBytes(32).toString('hex') : null;

    // Insert user into SQLite
    const insertStmt = db.prepare(`
      INSERT INTO users (name, email, password_hash, salt, role, avatar_url, is_verified, verification_token, verification_token_expires_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now', '+24 hours'))
    `);
    const result = insertStmt.run(cleanName, cleanEmail, passwordHash, salt, userRole, avatarUrl, isVerified, verificationToken);

    // Retrieve inserted record
    const createdUser = db.prepare(`
      SELECT id, name, email, role, avatar_url, is_verified, is_admin, created_at FROM users WHERE id = ?
    `).get(result.lastInsertRowid);

    // If verification required, dispatch email via Mailer
    if (requireVerification && verificationToken) {
      const origin = getReqOrigin(req);
      await MailerService.sendVerificationEmail(createdUser, verificationToken, origin);

      return res.status(201).json({
        success: true,
        requiresVerification: true,
        message: 'Account created! A verification link has been dispatched to your email address.',
        email: createdUser.email
      });
    }

    // Otherwise, log in immediately
    const token = generateSessionToken(createdUser);

    res.status(201).json({
      success: true,
      requiresVerification: false,
      message: 'Account created successfully! Welcome to Discova.',
      user: {
        id: createdUser.id,
        name: createdUser.name,
        email: createdUser.email,
        role: createdUser.role,
        avatar_url: createdUser.avatar_url,
        is_admin: createdUser.is_admin === 1,
        token
      }
    });
  } catch (error) {
    console.error('[Auth Register Error]:', error);
    res.status(500).json({ success: false, error: 'Internal server error while creating account: ' + error.message });
  }
});

// POST /api/auth/login - Authenticate existing user
router.post('/login', (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, error: 'Email and password are required' });
    }

    const cleanEmail = email.trim().toLowerCase();

    // Query user by email
    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(cleanEmail);
    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'No account found with this email. Please check your credentials or create a new account.'
      });
    }

    // Verify password hash
    const isValid = verifyPassword(password, user.salt, user.password_hash);
    if (!isValid) {
      return res.status(401).json({
        success: false,
        error: 'Incorrect password. Please try again.'
      });
    }

    // Check email verification status if required
    const requireVerification = db.getSetting('require_email_verification', 'false') === 'true';
    if (requireVerification && user.is_verified === 0 && user.is_admin !== 1) {
      return res.status(403).json({
        success: false,
        requiresVerification: true,
        email: user.email,
        error: 'Your email address is not yet verified. Please verify your account to continue.'
      });
    }

    // Generate session token
    const token = generateSessionToken(user);

    res.json({
      success: true,
      message: 'Signed in successfully!',
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        avatar_url: user.avatar_url,
        is_admin: user.is_admin === 1,
        token
      }
    });
  } catch (error) {
    console.error('[Auth Login Error]:', error);
    res.status(500).json({ success: false, error: 'Internal server error while signing in: ' + error.message });
  }
});

// POST /api/auth/forgot-password - Request password reset link
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email || !email.trim()) {
      return res.status(400).json({ success: false, error: 'Email address is required' });
    }

    const cleanEmail = email.trim().toLowerCase();
    const user = db.prepare('SELECT id, name, email FROM users WHERE email = ?').get(cleanEmail);

    if (user) {
      const resetToken = crypto.randomBytes(32).toString('hex');
      const hours = parseInt(db.getSetting('reset_token_expiry_hours', '1'), 10) || 1;

      db.prepare(`
        UPDATE users
        SET reset_token = ?, reset_token_expires_at = datetime('now', '+' || ? || ' hours')
        WHERE id = ?
      `).run(resetToken, hours, user.id);

      const origin = getReqOrigin(req);
      await MailerService.sendPasswordResetEmail(user, resetToken, origin);
    }

    // Always respond with success to prevent user email enumeration
    res.json({
      success: true,
      message: 'If an account exists with that email, a password reset link has been dispatched to your inbox.'
    });
  } catch (error) {
    console.error('[Auth Forgot Password Error]:', error);
    res.status(500).json({ success: false, error: 'Failed to process password reset: ' + error.message });
  }
});

// GET /api/auth/verify-reset-token - Validate password reset token
router.get('/verify-reset-token', (req, res) => {
  try {
    const { token } = req.query;
    if (!token) {
      return res.status(400).json({ success: false, valid: false, error: 'Reset token is required' });
    }

    const user = db.prepare(`
      SELECT id, name, email FROM users
      WHERE reset_token = ? AND reset_token_expires_at > datetime('now')
    `).get(token);

    if (!user) {
      return res.status(400).json({
        success: false,
        valid: false,
        error: 'This password reset link is invalid or has expired. Please request a new one.'
      });
    }

    res.json({
      success: true,
      valid: true,
      email: user.email,
      name: user.name
    });
  } catch (error) {
    res.status(500).json({ success: false, valid: false, error: error.message });
  }
});

// POST /api/auth/reset-password - Set new password with verified token
router.post('/reset-password', (req, res) => {
  try {
    const { token, newPassword } = req.body;

    if (!token) {
      return res.status(400).json({ success: false, error: 'Reset token is required' });
    }

    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({ success: false, error: 'New password must be at least 6 characters long' });
    }

    const user = db.prepare(`
      SELECT id, email FROM users
      WHERE reset_token = ? AND reset_token_expires_at > datetime('now')
    `).get(token);

    if (!user) {
      return res.status(400).json({
        success: false,
        error: 'Invalid or expired password reset token. Please request a fresh reset link.'
      });
    }

    // Generate fresh salt and new hash
    const salt = crypto.randomBytes(16).toString('hex');
    const passwordHash = hashPassword(newPassword, salt);

    db.prepare(`
      UPDATE users
      SET password_hash = ?, salt = ?, reset_token = NULL, reset_token_expires_at = NULL
      WHERE id = ?
    `).run(passwordHash, salt, user.id);

    res.json({
      success: true,
      message: 'Your password has been reset successfully! You can now sign in with your new password.'
    });
  } catch (error) {
    console.error('[Auth Reset Password Error]:', error);
    res.status(500).json({ success: false, error: 'Failed to reset password: ' + error.message });
  }
});

// GET /api/auth/verify-email - Confirm email verification token
router.get('/verify-email', (req, res) => {
  try {
    const { token } = req.query;
    if (!token) {
      return res.status(400).json({ success: false, error: 'Verification token is required' });
    }

    const user = db.prepare(`
      SELECT id, name, email FROM users WHERE verification_token = ?
    `).get(token);

    if (!user) {
      return res.status(400).json({
        success: false,
        error: 'Invalid or expired verification link. Please request a new verification email.'
      });
    }

    // Mark user as verified
    db.prepare(`
      UPDATE users
      SET is_verified = 1, verification_token = NULL, verification_token_expires_at = NULL
      WHERE id = ?
    `).run(user.id);

    res.json({
      success: true,
      message: 'Email address verified successfully! Your account is now active.',
      email: user.email
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/auth/resend-verification - Resend verification link
router.post('/resend-verification', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email || !email.trim()) {
      return res.status(400).json({ success: false, error: 'Email address is required' });
    }

    const cleanEmail = email.trim().toLowerCase();
    const user = db.prepare('SELECT id, name, email, is_verified FROM users WHERE email = ?').get(cleanEmail);

    if (!user) {
      return res.status(404).json({ success: false, error: 'No account found with this email address' });
    }

    if (user.is_verified === 1) {
      return res.json({ success: true, message: 'This account is already verified. You can sign in immediately.' });
    }

    const newToken = crypto.randomBytes(32).toString('hex');
    db.prepare(`
      UPDATE users
      SET verification_token = ?, verification_token_expires_at = datetime('now', '+24 hours')
      WHERE id = ?
    `).run(newToken, user.id);

    const origin = getReqOrigin(req);
    await MailerService.sendVerificationEmail(user, newToken, origin);

    res.json({
      success: true,
      message: 'A fresh verification link has been dispatched to your email address.'
    });
  } catch (error) {
    console.error('[Auth Resend Verification Error]:', error);
    res.status(500).json({ success: false, error: 'Failed to resend verification link: ' + error.message });
  }
});

// GET /api/auth/me - Check active session token and return user profile
router.get('/me', (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer discova_sess_')) {
      return res.status(401).json({ success: false, authenticated: false, error: 'Not authenticated' });
    }

    const tokenPart = authHeader.replace('Bearer discova_sess_', '');
    const decoded = Buffer.from(tokenPart, 'base64').toString('utf8');
    const [userId, userEmail] = decoded.split(':');

    if (!userId || !userEmail) {
      return res.status(401).json({ success: false, authenticated: false, error: 'Invalid session token' });
    }

    const user = db.prepare('SELECT id, name, email, role, avatar_url, is_verified, is_admin, created_at FROM users WHERE id = ?').get(userId);
    if (!user || user.email !== userEmail) {
      return res.status(401).json({ success: false, authenticated: false, error: 'Session expired or user not found' });
    }

    res.json({
      success: true,
      authenticated: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        avatar_url: user.avatar_url,
        is_verified: user.is_verified === 1,
        is_admin: user.is_admin === 1,
        created_at: user.created_at
      }
    });
  } catch (error) {
    res.status(401).json({ success: false, authenticated: false, error: 'Invalid session: ' + error.message });
  }
});

// POST /api/auth/logout - Sign out
router.post('/logout', (req, res) => {
  res.json({ success: true, message: 'Logged out successfully' });
});

module.exports = router;
