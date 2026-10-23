const express = require('express');
const router = express.Router();
const db = require('../db');

// POST /api/submissions - handle product submission from wizard
router.post('/', (req, res) => {
  try {
    const {
      productName, tagline, description, category,
      pricingType, websiteUrl, githubUrl, logoUrl,
      makerName, makerEmail, makerRole
    } = req.body;

    if (!productName || !tagline || !makerEmail) {
      return res.status(400).json({
        success: false,
        error: 'Product name, tagline, and maker email are required'
      });
    }

    const insert = db.prepare(`
      INSERT INTO submissions (
        product_name, tagline, description, category, pricing_type,
        website_url, github_url, logo_url, maker_name, maker_email, maker_role, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')
    `);

    const result = insert.run(
      productName.trim(),
      tagline.trim(),
      (description || tagline).trim(),
      category || 'devtools',
      pricingType || 'Free & Open Source',
      websiteUrl || '',
      githubUrl || '',
      logoUrl || '',
      makerName || 'African Maker',
      makerEmail.trim(),
      makerRole || 'Founder'
    );

    const submissionId = result.lastInsertRowid;

    res.json({
      success: true,
      message: 'Product submitted successfully',
      submissionId,
      trackingUrl: `submit-success.html?id=${submissionId}`
    });
  } catch (error) {
    console.error('Error submitting product:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/submissions - view submissions
router.get('/', (req, res) => {
  try {
    const submissions = db.prepare('SELECT * FROM submissions ORDER BY created_at DESC').all();
    res.json({ success: true, count: submissions.length, data: submissions });
  } catch (error) {
    console.error('Error fetching submissions:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/submissions/:id/approve - approve and publish as active product
router.post('/:id/approve', (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const sub = db.prepare('SELECT * FROM submissions WHERE id = ?').get(id);

    if (!sub) {
      return res.status(404).json({ success: false, error: 'Submission not found' });
    }

    const slug = sub.product_name.toLowerCase().replace(/[^a-z0-9]+/g, '-') + '-' + Math.floor(Math.random() * 1000);

    const insertProd = db.prepare(`
      INSERT INTO products (
        slug, name, tagline, description, category_id, city, country,
        website_url, github_url, votes_count, is_featured, is_trending,
        maker_name, maker_role, pricing_type
      ) VALUES (?, ?, ?, ?, ?, 'Lagos', 'Nigeria', ?, ?, 1, 0, 1, ?, ?, ?)
    `);

    const prodResult = insertProd.run(
      slug, sub.product_name, sub.tagline, sub.description, sub.category,
      sub.website_url, sub.github_url, sub.maker_name, sub.maker_role, sub.pricing_type
    );

    // Create launch for today
    const todayStr = new Date().toISOString().split('T')[0];
    db.prepare('INSERT INTO launches (product_id, launch_date, day_rank, votes_at_launch) VALUES (?, ?, 1, 1)')
      .run(prodResult.lastInsertRowid, todayStr);

    db.prepare("UPDATE submissions SET status = 'approved' WHERE id = ?").run(id);

    res.json({ success: true, message: 'Submission approved and published', slug });
  } catch (error) {
    console.error('Error approving submission:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
