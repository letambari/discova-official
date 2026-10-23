const path = require('path');
const express = require('express');
const cors = require('cors');

// Ensure database and schema are initialized
require('./db');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging in development
app.use((req, res, next) => {
  if (req.path.startsWith('/api')) {
    console.log(`[API] ${req.method} ${req.path}`);
  }
  next();
});

// API Routes
app.use('/api/products', require('./routes/products'));
app.use('/api/categories', require('./routes/categories'));
app.use('/api/launches', require('./routes/launches'));
app.use('/api/stories', require('./routes/stories'));
app.use('/api/submissions', require('./routes/submissions'));
app.use('/api/newsletter', require('./routes/newsletter'));
app.use('/api/auth', require('./routes/auth'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/stats', require('./routes/stats'));

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    platform: 'Discova Africa Tech Leaderboard'
  });
});

// Serve static frontend assets from project root
const publicDir = path.join(__dirname, '..');
app.use(express.static(publicDir));

// Fallback for SPA/direct navigation (if needed)
app.get('/', (req, res) => {
  res.sendFile(path.join(publicDir, 'index.html'));
});

// 404 for unmatched API routes
app.all('/api/*', (req, res) => {
  res.status(404).json({ success: false, error: `Endpoint ${req.path} not found` });
});

// Start Server
app.listen(PORT, () => {
  console.log(`
🚀 =======================================================
   DISCOVA AFRICA TECH — UNIFIED BACKEND SERVER READY
   =======================================================
   🌐 Server running at: http://localhost:${PORT}
   📦 Database:         SQLite (discova.db)
   
   Available API Endpoints:
   - GET  /api/health
   - GET  /api/products           (supports ?category, ?search, ?sort)
   - GET  /api/products/:slug
   - POST /api/products/:id/vote
   - POST /api/products/:id/review
   - GET  /api/categories
   - GET  /api/launches
   - GET  /api/stories            (supports ?type, ?category)
   - GET  /api/stories/:slug
   - POST /api/stories
   - POST /api/submissions
   - GET  /api/submissions
   - POST /api/newsletter/subscribe
   - POST /api/auth/register          (User account creation)
   - POST /api/auth/login             (User authentication)
   - POST /api/auth/forgot-password   (Request password reset)
   - POST /api/auth/reset-password    (Update password with token)
   - GET  /api/auth/verify-email      (Account email activation)
   - POST /api/auth/resend-verification (Resend verification token)
   - GET  /api/auth/me                (User profile validation)
   - POST /api/auth/logout            (Sign out)
   - GET  /api/stats                  (Public platform metrics & countries)
   - GET  /api/admin/stats            (Platform metrics)
   - GET  /api/admin/users            (User directory & moderation)
   - PUT  /api/admin/settings         (SMTP & Email verification toggle)
   - POST /api/admin/smtp/test        (SMTP diagnostic connection test)
   - GET  /api/admin/emails           (In-App Outbox & audit logs)
=======================================================
  `);
});

module.exports = app;
