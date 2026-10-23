const express = require('express');
const router = express.Router();
const db = require('../db');

// POST /api/newsletter/subscribe - subscribe an email
router.post('/subscribe', (req, res) => {
  try {
    const { email, sourcePage = 'footer' } = req.body;

    if (!email || !email.includes('@') || !email.includes('.')) {
      return res.status(400).json({ success: false, error: 'Please provide a valid email address' });
    }

    const cleanEmail = email.trim().toLowerCase();

    // Check if already subscribed
    const existing = db.prepare('SELECT id FROM newsletter_subscribers WHERE email = ?').get(cleanEmail);
    if (existing) {
      return res.json({
        success: true,
        message: 'You are already subscribed to the Discova Africa Tech digest!'
      });
    }

    db.prepare('INSERT INTO newsletter_subscribers (email, source_page) VALUES (?, ?)').run(cleanEmail, sourcePage);

    res.json({
      success: true,
      message: 'Welcome aboard! You will receive the weekly African tech showcase every Friday.'
    });
  } catch (error) {
    console.error('Error subscribing to newsletter:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/newsletter/count - get count of subscribers
router.get('/count', (req, res) => {
  try {
    const row = db.prepare('SELECT COUNT(*) AS total FROM newsletter_subscribers').get();
    res.json({ success: true, count: row.total + 18420 }); // Base ecosystem community + real new subscribers
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
