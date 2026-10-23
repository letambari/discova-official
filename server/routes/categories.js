const express = require('express');
const router = express.Router();
const db = require('../db');

// GET /api/categories - list all categories with dynamic product count
router.get('/', (req, res) => {
  try {
    const query = db.prepare(`
      SELECT 
        c.id, c.name, c.icon, c.color, c.description,
        COUNT(p.id) AS product_count
      FROM categories c
      LEFT JOIN products p ON p.category_id = c.id
      GROUP BY c.id
      ORDER BY c.name ASC
    `);
    const categories = query.all();
    res.json({ success: true, count: categories.length, data: categories });
  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
