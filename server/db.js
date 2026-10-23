const fs = require('fs');
const path = require('path');
const { DatabaseSync } = require('node:sqlite');

const defaultDbPath = path.join(__dirname, '..', 'discova.db');
const dbPath = process.env.DB_PATH || defaultDbPath;

// Ensure database directory exists (e.g., persistent directory on cPanel outside git repo)
const dbDir = path.dirname(dbPath);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const db = new DatabaseSync(dbPath);
db.dbPath = dbPath;

// Enable WAL mode and foreign keys for durability and performance
db.exec('PRAGMA foreign_keys = ON;');
try {
  db.exec('PRAGMA journal_mode = WAL;');
} catch (_) {}

function initSchema() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS categories (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      icon TEXT NOT NULL,
      color TEXT NOT NULL,
      description TEXT
    );

    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      slug TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      tagline TEXT NOT NULL,
      description TEXT,
      category_id TEXT,
      city TEXT,
      country TEXT,
      logo_url TEXT,
      banner_class TEXT,
      website_url TEXT,
      github_url TEXT,
      twitter_url TEXT,
      votes_count INTEGER DEFAULT 0,
      is_featured INTEGER DEFAULT 0,
      is_trending INTEGER DEFAULT 1,
      maker_name TEXT,
      maker_avatar TEXT,
      maker_role TEXT,
      pricing_type TEXT DEFAULT 'Free & Open Source',
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS launches (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      product_id INTEGER NOT NULL,
      launch_date TEXT NOT NULL,
      day_rank INTEGER DEFAULT 1,
      votes_at_launch INTEGER DEFAULT 0,
      FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS stories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      slug TEXT UNIQUE NOT NULL,
      founder_name TEXT NOT NULL,
      founder_role TEXT NOT NULL,
      founder_avatar TEXT,
      company_name TEXT NOT NULL,
      company_slug TEXT,
      headline TEXT NOT NULL,
      quote TEXT NOT NULL,
      story_body TEXT NOT NULL,
      video_url TEXT,
      video_duration TEXT,
      location TEXT,
      category_id TEXT,
      type TEXT DEFAULT 'video',
      transcript_json TEXT,
      is_featured INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS submissions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      product_name TEXT NOT NULL,
      tagline TEXT NOT NULL,
      description TEXT NOT NULL,
      category TEXT NOT NULL,
      pricing_type TEXT,
      website_url TEXT,
      github_url TEXT,
      logo_url TEXT,
      maker_name TEXT NOT NULL,
      maker_email TEXT NOT NULL,
      maker_role TEXT,
      status TEXT DEFAULT 'pending',
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS votes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      product_id INTEGER NOT NULL,
      voter_token TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      UNIQUE(product_id, voter_token),
      FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS reviews (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      product_id INTEGER NOT NULL,
      author_name TEXT NOT NULL,
      author_role TEXT,
      author_avatar TEXT,
      rating INTEGER DEFAULT 5,
      content TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS newsletter_subscribers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      source_page TEXT DEFAULT 'footer',
      subscribed_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      salt TEXT NOT NULL,
      role TEXT DEFAULT 'Maker & Builder',
      avatar_url TEXT,
      is_verified INTEGER DEFAULT 1,
      verification_token TEXT,
      verification_token_expires_at TEXT,
      reset_token TEXT,
      reset_token_expires_at TEXT,
      is_admin INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS system_settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS email_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      recipient TEXT NOT NULL,
      subject TEXT NOT NULL,
      action_type TEXT DEFAULT 'general',
      action_url TEXT,
      status TEXT DEFAULT 'simulated',
      error_message TEXT,
      sent_at TEXT DEFAULT (datetime('now'))
    );
  `);

  // Safely migrate existing users table if columns are missing
  const userColumns = db.prepare('PRAGMA table_info(users)').all();
  const existingColNames = userColumns.map(c => c.name);

  function addCol(name, def) {
    if (!existingColNames.includes(name)) {
      db.exec(`ALTER TABLE users ADD COLUMN ${name} ${def};`);
    }
  }

  addCol('is_verified', 'INTEGER DEFAULT 1');
  addCol('verification_token', 'TEXT');
  addCol('verification_token_expires_at', 'TEXT');
  addCol('reset_token', 'TEXT');
  addCol('reset_token_expires_at', 'TEXT');
  addCol('is_admin', 'INTEGER DEFAULT 0');

  // Seed default settings if not already present
  const defaultSettings = [
    { key: 'require_email_verification', value: 'false' },
    { key: 'smtp_enabled', value: 'false' },
    { key: 'smtp_host', value: '' },
    { key: 'smtp_port', value: '587' },
    { key: 'smtp_secure', value: 'false' },
    { key: 'smtp_user', value: '' },
    { key: 'smtp_pass', value: '' },
    { key: 'smtp_from_email', value: 'noreply@discova.africa' },
    { key: 'smtp_from_name', value: 'Discova Africa Tech' },
    { key: 'reset_token_expiry_hours', value: '1' }
  ];

  const insertSettingStmt = db.prepare(`
    INSERT OR IGNORE INTO system_settings (key, value) VALUES (?, ?)
  `);

  for (const s of defaultSettings) {
    insertSettingStmt.run(s.key, s.value);
  }
}

initSchema();

// Settings Helper Methods
db.getSetting = function(key, defaultValue = null) {
  try {
    const row = db.prepare('SELECT value FROM system_settings WHERE key = ?').get(key);
    return row ? row.value : defaultValue;
  } catch (err) {
    return defaultValue;
  }
};

db.setSetting = function(key, value) {
  try {
    db.prepare(`
      INSERT INTO system_settings (key, value, updated_at)
      VALUES (?, ?, datetime('now'))
      ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = datetime('now')
    `).run(key, String(value));
    return true;
  } catch (err) {
    console.error(`[DB] Error setting ${key}:`, err.message);
    return false;
  }
};

db.getAllSettings = function() {
  try {
    const rows = db.prepare('SELECT key, value FROM system_settings').all();
    const settings = {};
    for (const r of rows) {
      settings[r.key] = r.value;
    }
    return settings;
  } catch (err) {
    return {};
  }
};

// Non-destructive Schema Migration Helper for Future Updates
db.ensureColumnExists = function(table, column, definition) {
  try {
    const columns = db.prepare(`PRAGMA table_info(${table})`).all();
    const exists = columns.some(c => c.name.toLowerCase() === column.toLowerCase());
    if (!exists) {
      db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition};`);
      console.log(`[DB Migration] Safely added column "${column}" to table "${table}"`);
      return true;
    }
    return false;
  } catch (err) {
    console.warn(`[DB Migration] Could not verify/add column "${column}" on "${table}":`, err.message);
    return false;
  }
};

module.exports = db;
