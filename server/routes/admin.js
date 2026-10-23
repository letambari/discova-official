const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const db = require('../db');
const MailerService = require('../utils/mailer');
const SmtpClient = require('../utils/smtp');

// Admin Authentication Middleware
function requireAdmin(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer discova_sess_')) {
      return res.status(401).json({ success: false, error: 'Unauthorized: Admin session required' });
    }

    const tokenPart = authHeader.replace('Bearer discova_sess_', '');
    const decoded = Buffer.from(tokenPart, 'base64').toString('utf8');
    const [userId, userEmail] = decoded.split(':');

    if (!userId || !userEmail) {
      return res.status(401).json({ success: false, error: 'Invalid session token' });
    }

    const user = db.prepare('SELECT id, email, is_admin FROM users WHERE id = ?').get(userId);
    if (!user || user.email !== userEmail || user.is_admin !== 1) {
      return res.status(403).json({ success: false, error: 'Forbidden: Platform Administrator access required' });
    }

    req.adminUser = user;
    next();
  } catch (err) {
    return res.status(401).json({ success: false, error: 'Authentication failed: ' + err.message });
  }
}

// Apply admin auth to all endpoints
router.use(requireAdmin);

// GET /api/admin/stats - High level metrics
router.get('/stats', (req, res) => {
  try {
    const totalUsers = db.prepare('SELECT COUNT(*) as count FROM users').get().count;
    const verifiedUsers = db.prepare('SELECT COUNT(*) as count FROM users WHERE is_verified = 1').get().count;
    const unverifiedUsers = db.prepare('SELECT COUNT(*) as count FROM users WHERE is_verified = 0').get().count;
    const totalProducts = db.prepare('SELECT COUNT(*) as count FROM products').get().count;
    const featuredProducts = db.prepare('SELECT COUNT(*) as count FROM products WHERE is_featured = 1').get().count;
    const pendingSubmissions = db.prepare("SELECT COUNT(*) as count FROM submissions WHERE status = 'pending'").get().count;
    const totalEmails = db.prepare('SELECT COUNT(*) as count FROM email_logs').get().count;

    const smtpEnabled = db.getSetting('smtp_enabled', 'false') === 'true';
    const requireEmailVerification = db.getSetting('require_email_verification', 'false') === 'true';

    res.json({
      success: true,
      stats: {
        totalUsers,
        verifiedUsers,
        unverifiedUsers,
        totalProducts,
        featuredProducts,
        pendingSubmissions,
        totalEmails,
        smtpEnabled,
        requireEmailVerification
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/admin/users - User directory with filtering
router.get('/users', (req, res) => {
  try {
    const { search, filter } = req.query;

    let query = `
      SELECT id, name, email, role, avatar_url, is_verified, is_admin, reset_token, created_at
      FROM users
      WHERE 1=1
    `;
    const params = [];

    if (search && search.trim()) {
      query += ` AND (name LIKE ? OR email LIKE ? OR role LIKE ?)`;
      const term = `%${search.trim()}%`;
      params.push(term, term, term);
    }

    if (filter === 'verified') {
      query += ` AND is_verified = 1`;
    } else if (filter === 'unverified') {
      query += ` AND is_verified = 0`;
    } else if (filter === 'admin') {
      query += ` AND is_admin = 1`;
    }

    query += ` ORDER BY id DESC LIMIT 100`;

    const users = db.prepare(query).all(...params);

    res.json({
      success: true,
      users: users.map(u => ({
        ...u,
        is_verified: u.is_verified === 1,
        is_admin: u.is_admin === 1
      }))
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/admin/users/:id/toggle-verify - Manual verification toggle
router.post('/users/:id/toggle-verify', (req, res) => {
  try {
    const userId = req.params.id;
    const user = db.prepare('SELECT id, is_verified FROM users WHERE id = ?').get(userId);

    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    const nextState = user.is_verified === 1 ? 0 : 1;
    db.prepare('UPDATE users SET is_verified = ? WHERE id = ?').run(nextState, userId);

    res.json({
      success: true,
      message: `User ${nextState === 1 ? 'marked as Verified' : 'marked as Unverified'}`,
      is_verified: nextState === 1
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/admin/users/:id/generate-reset - Generate instant reset link
router.post('/users/:id/generate-reset', (req, res) => {
  try {
    const userId = req.params.id;
    const user = db.prepare('SELECT id, name, email FROM users WHERE id = ?').get(userId);

    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    db.prepare(`
      UPDATE users
      SET reset_token = ?, reset_token_expires_at = datetime('now', '+24 hours')
      WHERE id = ?
    `).run(resetToken, userId);

    const origin = (req.headers && req.headers.origin) || (typeof req.get === 'function' && req.protocol && req.get('host') ? `${req.protocol}://${req.get('host')}` : 'http://localhost:3000');
    const resetUrl = `${origin}/reset-password.html?token=${resetToken}`;

    // Also log this direct admin generation in email logs
    MailerService.logEmail({
      recipient: user.email,
      subject: 'Admin Generated Password Reset Link',
      actionType: 'password_reset',
      actionUrl: resetUrl,
      status: 'simulated',
      errorMessage: null
    });

    res.json({
      success: true,
      message: 'Password reset link generated successfully',
      resetToken,
      resetUrl,
      userEmail: user.email
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// DELETE /api/admin/users/:id - Delete a user
router.delete('/users/:id', (req, res) => {
  try {
    const userId = parseInt(req.params.id, 10);
    const user = db.prepare('SELECT id, email, is_admin FROM users WHERE id = ?').get(userId);

    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    if (user.email === 'admin@discova.africa' || user.id === req.adminUser.id) {
      return res.status(400).json({ success: false, error: 'Cannot delete the active platform administrator' });
    }

    db.prepare('DELETE FROM users WHERE id = ?').run(userId);

    res.json({
      success: true,
      message: `User ${user.email} removed successfully`
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/admin/settings - Read system settings
router.get('/settings', (req, res) => {
  try {
    const settings = db.getAllSettings();
    // Mask password in response if present
    const maskedSettings = { ...settings };
    if (maskedSettings.smtp_pass) {
      maskedSettings.smtp_pass_set = true;
      maskedSettings.smtp_pass = '••••••••••••';
    } else {
      maskedSettings.smtp_pass_set = false;
    }

    res.json({
      success: true,
      settings: maskedSettings
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// PUT /api/admin/settings - Update settings (SMTP, Email Verification toggle)
router.put('/settings', (req, res) => {
  try {
    const {
      require_email_verification,
      smtp_enabled,
      smtp_host,
      smtp_port,
      smtp_secure,
      smtp_user,
      smtp_pass,
      smtp_from_email,
      smtp_from_name,
      reset_token_expiry_hours
    } = req.body;

    if (require_email_verification !== undefined) {
      db.setSetting('require_email_verification', require_email_verification === true || require_email_verification === 'true' ? 'true' : 'false');
    }

    if (smtp_enabled !== undefined) {
      db.setSetting('smtp_enabled', smtp_enabled === true || smtp_enabled === 'true' ? 'true' : 'false');
    }

    if (smtp_host !== undefined) db.setSetting('smtp_host', smtp_host.trim());
    if (smtp_port !== undefined) db.setSetting('smtp_port', String(smtp_port).trim());
    if (smtp_secure !== undefined) {
      db.setSetting('smtp_secure', smtp_secure === true || smtp_secure === 'true' ? 'true' : 'false');
    }
    if (smtp_user !== undefined) db.setSetting('smtp_user', smtp_user.trim());
    // Only update password if user passed a real new password (not masked bullets)
    if (smtp_pass !== undefined && !smtp_pass.includes('••••')) {
      db.setSetting('smtp_pass', smtp_pass);
    }
    if (smtp_from_email !== undefined) db.setSetting('smtp_from_email', smtp_from_email.trim());
    if (smtp_from_name !== undefined) db.setSetting('smtp_from_name', smtp_from_name.trim());
    if (reset_token_expiry_hours !== undefined) db.setSetting('reset_token_expiry_hours', String(reset_token_expiry_hours));

    res.json({
      success: true,
      message: 'System settings updated successfully',
      settings: db.getAllSettings()
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/admin/smtp/test - Diagnostic SMTP test
router.post('/smtp/test', async (req, res) => {
  try {
    const { host, port, secure, user, pass, fromEmail, fromName, testRecipient } = req.body;

    const testConfig = {
      host: host || db.getSetting('smtp_host', ''),
      port: port || db.getSetting('smtp_port', '587'),
      secure: secure !== undefined ? secure : db.getSetting('smtp_secure', 'false'),
      user: user !== undefined ? user : db.getSetting('smtp_user', ''),
      pass: (pass && !pass.includes('••••')) ? pass : db.getSetting('smtp_pass', ''),
      fromEmail: fromEmail || db.getSetting('smtp_from_email', 'noreply@discova.africa'),
      fromName: fromName || db.getSetting('smtp_from_name', 'Discova Africa Tech')
    };

    if (!testConfig.host) {
      return res.status(400).json({ success: false, error: 'Please enter a valid SMTP host' });
    }

    const client = new SmtpClient(testConfig);
    const result = await client.testConnection(testRecipient);

    // Record test in email logs
    MailerService.logEmail({
      recipient: testRecipient || testConfig.fromEmail,
      subject: 'SMTP Diagnostic Test Execution',
      actionType: 'test',
      actionUrl: null,
      status: result.success ? 'sent' : 'failed',
      errorMessage: result.error || null
    });

    res.json({
      success: result.success,
      message: result.success
        ? `SMTP Connection Test Succeeded! Diagnostic email delivered.`
        : `SMTP Connection Test Failed: ${result.error}`,
      logs: result.logs || []
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/admin/emails - Email logs and in-app outbox
router.get('/emails', (req, res) => {
  try {
    const { status, limit = 50 } = req.query;
    let query = 'SELECT * FROM email_logs WHERE 1=1';
    const params = [];

    if (status && status !== 'all') {
      query += ' AND status = ?';
      params.push(status);
    }

    query += ' ORDER BY id DESC LIMIT ?';
    params.push(parseInt(limit, 10) || 50);

    const logs = db.prepare(query).all(...params);

    res.json({
      success: true,
      count: logs.length,
      emails: logs
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ==========================================
// PRODUCTS MANAGEMENT
// ==========================================

// GET /api/admin/products - List all products with category info, search & filtering
router.get('/products', (req, res) => {
  try {
    const { search, category, sort = 'newest' } = req.query;

    let sql = `
      SELECT 
        p.*,
        c.name AS category_name,
        c.icon AS category_icon,
        c.color AS category_color
      FROM products p
      LEFT JOIN categories c ON c.id = p.category_id
      WHERE 1=1
    `;
    const params = [];

    if (category && category !== 'all') {
      const catId = category === 'health' ? 'healthtech' : category;
      sql += ' AND p.category_id = ?';
      params.push(catId);
    }

    if (search && search.trim()) {
      sql += ' AND (p.name LIKE ? OR p.tagline LIKE ? OR p.maker_name LIKE ? OR p.city LIKE ? OR p.country LIKE ?)';
      const term = `%${search.trim()}%`;
      params.push(term, term, term, term, term);
    }

    if (sort === 'votes') {
      sql += ' ORDER BY p.votes_count DESC, p.id DESC';
    } else if (sort === 'trending') {
      sql += ' ORDER BY p.is_trending DESC, p.votes_count DESC, p.id DESC';
    } else {
      sql += ' ORDER BY p.id DESC';
    }

    const products = db.prepare(sql).all(...params);

    res.json({
      success: true,
      count: products.length,
      products
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/admin/products/:id - Single product details
router.get('/products/:id', (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const product = db.prepare(`
      SELECT p.*, c.name AS category_name, c.icon AS category_icon, c.color AS category_color
      FROM products p
      LEFT JOIN categories c ON c.id = p.category_id
      WHERE p.id = ?
    `).get(id);

    if (!product) {
      return res.status(404).json({ success: false, error: 'Product not found' });
    }

    res.json({ success: true, product });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/admin/products - Create a new product directly
router.post('/products', (req, res) => {
  try {
    const {
      name, tagline, description, category_id, city, country,
      website_url, github_url, twitter_url, maker_name, maker_role,
      pricing_type, is_featured, is_trending
    } = req.body;

    if (!name || !tagline) {
      return res.status(400).json({ success: false, error: 'Product name and tagline are required' });
    }

    let baseSlug = (req.body.slug && req.body.slug.trim())
      ? req.body.slug.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-')
      : name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-');

    // Ensure unique slug
    let slug = baseSlug;
    let counter = 1;
    while (db.prepare('SELECT id FROM products WHERE slug = ?').get(slug)) {
      slug = `${baseSlug}-${counter++}`;
    }

    const bannerClasses = ['banner-doux', 'banner-pxxl', 'banner-powbeam', 'banner-kudaplus', 'banner-chowdeck', 'banner-default'];
    const bannerClass = req.body.banner_class || bannerClasses[Math.floor(Math.random() * bannerClasses.length)];

    const insert = db.prepare(`
      INSERT INTO products (
        slug, name, tagline, description, category_id, city, country,
        banner_class, website_url, github_url, twitter_url,
        votes_count, is_featured, is_trending,
        maker_name, maker_role, pricing_type
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const result = insert.run(
      slug,
      name.trim(),
      tagline.trim(),
      (description || tagline).trim(),
      category_id || 'devtools',
      city || 'Lagos',
      country || 'Nigeria',
      bannerClass,
      website_url || '',
      github_url || '',
      twitter_url || '',
      parseInt(req.body.votes_count, 10) || 1,
      is_featured ? 1 : 0,
      is_trending !== undefined ? (is_trending ? 1 : 0) : 1,
      maker_name || 'African Maker',
      maker_role || 'Founder',
      pricing_type || 'Free & Open Source'
    );

    const productId = result.lastInsertRowid;

    // Create launch record
    const todayStr = new Date().toISOString().split('T')[0];
    db.prepare(`
      INSERT INTO launches (product_id, launch_date, day_rank, votes_at_launch)
      VALUES (?, ?, 1, 1)
    `).run(productId, todayStr);

    res.json({
      success: true,
      message: `Product "${name}" created successfully`,
      product: { id: productId, slug, name }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// PUT /api/admin/products/:id - Update product
router.put('/products/:id', (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const existing = db.prepare('SELECT * FROM products WHERE id = ?').get(id);

    if (!existing) {
      return res.status(404).json({ success: false, error: 'Product not found' });
    }

    const {
      name, slug, tagline, description, category_id, city, country,
      website_url, github_url, twitter_url, maker_name, maker_role,
      pricing_type, is_featured, is_trending, votes_count, banner_class
    } = req.body;

    let targetSlug = existing.slug;
    if (slug && slug.trim() && slug.trim() !== existing.slug) {
      const cleanSlug = slug.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-');
      const conflict = db.prepare('SELECT id FROM products WHERE slug = ? AND id != ?').get(cleanSlug, id);
      if (!conflict) targetSlug = cleanSlug;
    }

    db.prepare(`
      UPDATE products SET
        name = ?,
        slug = ?,
        tagline = ?,
        description = ?,
        category_id = ?,
        city = ?,
        country = ?,
        website_url = ?,
        github_url = ?,
        twitter_url = ?,
        maker_name = ?,
        maker_role = ?,
        pricing_type = ?,
        is_featured = ?,
        is_trending = ?,
        votes_count = ?,
        banner_class = ?
      WHERE id = ?
    `).run(
      name !== undefined ? name.trim() : existing.name,
      targetSlug,
      tagline !== undefined ? tagline.trim() : existing.tagline,
      description !== undefined ? description.trim() : existing.description,
      category_id !== undefined ? category_id : existing.category_id,
      city !== undefined ? city.trim() : existing.city,
      country !== undefined ? country.trim() : existing.country,
      website_url !== undefined ? website_url.trim() : existing.website_url,
      github_url !== undefined ? github_url.trim() : existing.github_url,
      twitter_url !== undefined ? twitter_url.trim() : existing.twitter_url,
      maker_name !== undefined ? maker_name.trim() : existing.maker_name,
      maker_role !== undefined ? maker_role.trim() : existing.maker_role,
      pricing_type !== undefined ? pricing_type : existing.pricing_type,
      is_featured !== undefined ? (is_featured ? 1 : 0) : existing.is_featured,
      is_trending !== undefined ? (is_trending ? 1 : 0) : existing.is_trending,
      votes_count !== undefined ? parseInt(votes_count, 10) : existing.votes_count,
      banner_class !== undefined ? banner_class : existing.banner_class,
      id
    );

    res.json({
      success: true,
      message: `Product updated successfully`
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// DELETE /api/admin/products/:id - Delete a product
router.delete('/products/:id', (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const existing = db.prepare('SELECT id, name FROM products WHERE id = ?').get(id);

    if (!existing) {
      return res.status(404).json({ success: false, error: 'Product not found' });
    }

    db.prepare('DELETE FROM launches WHERE product_id = ?').run(id);
    db.prepare('DELETE FROM votes WHERE product_id = ?').run(id);
    db.prepare('DELETE FROM reviews WHERE product_id = ?').run(id);
    db.prepare('DELETE FROM products WHERE id = ?').run(id);

    res.json({
      success: true,
      message: `Product "${existing.name}" deleted successfully`
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/admin/products/:id/toggle-featured - Toggle featured status
router.post('/products/:id/toggle-featured', (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const product = db.prepare('SELECT id, name, is_featured FROM products WHERE id = ?').get(id);

    if (!product) {
      return res.status(404).json({ success: false, error: 'Product not found' });
    }

    const nextState = product.is_featured === 1 ? 0 : 1;
    db.prepare('UPDATE products SET is_featured = ? WHERE id = ?').run(nextState, id);

    res.json({
      success: true,
      message: `"${product.name}" is now ${nextState === 1 ? 'Featured' : 'Standard'}`,
      is_featured: nextState === 1
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/admin/products/:id/toggle-trending - Toggle trending status
router.post('/products/:id/toggle-trending', (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const product = db.prepare('SELECT id, name, is_trending FROM products WHERE id = ?').get(id);

    if (!product) {
      return res.status(404).json({ success: false, error: 'Product not found' });
    }

    const nextState = product.is_trending === 1 ? 0 : 1;
    db.prepare('UPDATE products SET is_trending = ? WHERE id = ?').run(nextState, id);

    res.json({
      success: true,
      message: `"${product.name}" is now ${nextState === 1 ? 'Trending' : 'Standard'}`,
      is_trending: nextState === 1
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/admin/products/clear-demo - Clear all demo products
router.post('/products/clear-demo', (req, res) => {
  try {
    db.exec(`
      DELETE FROM reviews;
      DELETE FROM votes;
      DELETE FROM launches;
      DELETE FROM products;
    `);

    res.json({
      success: true,
      message: 'All demo products, launches, and votes have been cleared. Catalog is now clean!'
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ==========================================
// MAKER SUBMISSIONS MANAGEMENT
// ==========================================

// GET /api/admin/submissions - List submissions with filtering
router.get('/submissions', (req, res) => {
  try {
    const { status } = req.query;
    let sql = 'SELECT * FROM submissions WHERE 1=1';
    const params = [];

    if (status && status !== 'all') {
      sql += ' AND status = ?';
      params.push(status);
    }

    sql += ' ORDER BY id DESC';

    const submissions = db.prepare(sql).all(...params);
    res.json({
      success: true,
      count: submissions.length,
      submissions
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/admin/submissions/:id/approve - Approve maker submission & publish
router.post('/submissions/:id/approve', (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const sub = db.prepare('SELECT * FROM submissions WHERE id = ?').get(id);

    if (!sub) {
      return res.status(404).json({ success: false, error: 'Submission not found' });
    }

    let baseSlug = sub.product_name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    let slug = baseSlug;
    let counter = 1;
    while (db.prepare('SELECT id FROM products WHERE slug = ?').get(slug)) {
      slug = `${baseSlug}-${counter++}`;
    }

    const bannerClasses = ['banner-doux', 'banner-pxxl', 'banner-powbeam', 'banner-kudaplus', 'banner-chowdeck', 'banner-default'];
    const bannerClass = bannerClasses[Math.floor(Math.random() * bannerClasses.length)];

    const insertProd = db.prepare(`
      INSERT INTO products (
        slug, name, tagline, description, category_id, city, country,
        banner_class, website_url, github_url, votes_count, is_featured, is_trending,
        maker_name, maker_role, pricing_type
      ) VALUES (?, ?, ?, ?, ?, 'Lagos', 'Nigeria', ?, ?, ?, 1, 0, 1, ?, ?, ?)
    `);

    const prodResult = insertProd.run(
      slug,
      sub.product_name,
      sub.tagline,
      sub.description || sub.tagline,
      sub.category || 'devtools',
      bannerClass,
      sub.website_url || '',
      sub.github_url || '',
      sub.maker_name || 'Maker',
      sub.maker_role || 'Founder',
      sub.pricing_type || 'Free & Open Source'
    );

    const todayStr = new Date().toISOString().split('T')[0];
    db.prepare(`
      INSERT INTO launches (product_id, launch_date, day_rank, votes_at_launch)
      VALUES (?, ?, 1, 1)
    `).run(prodResult.lastInsertRowid, todayStr);

    db.prepare("UPDATE submissions SET status = 'approved' WHERE id = ?").run(id);

    res.json({
      success: true,
      message: `Submission "${sub.product_name}" approved and published live to directory!`,
      slug,
      productId: prodResult.lastInsertRowid
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/admin/submissions/:id/reject - Reject maker submission
router.post('/submissions/:id/reject', (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const sub = db.prepare('SELECT id, product_name FROM submissions WHERE id = ?').get(id);

    if (!sub) {
      return res.status(404).json({ success: false, error: 'Submission not found' });
    }

    db.prepare("UPDATE submissions SET status = 'rejected' WHERE id = ?").run(id);

    res.json({
      success: true,
      message: `Submission "${sub.product_name}" rejected`
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// DELETE /api/admin/submissions/:id - Delete maker submission
router.delete('/submissions/:id', (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const sub = db.prepare('SELECT id, product_name FROM submissions WHERE id = ?').get(id);

    if (!sub) {
      return res.status(404).json({ success: false, error: 'Submission not found' });
    }

    db.prepare('DELETE FROM submissions WHERE id = ?').run(id);

    res.json({
      success: true,
      message: `Submission record deleted`
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
