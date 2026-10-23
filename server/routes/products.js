const express = require('express');
const router = express.Router();
const db = require('../db');

// GET /api/products - query with category, search, sort, featured filters
router.get('/', (req, res) => {
  try {
    const { category, search, sort = 'trending', featured, country } = req.query;

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
      sql += ` AND p.category_id = ?`;
      params.push(catId);
    }

    if (country && country !== 'all') {
      sql += ` AND LOWER(REPLACE(REPLACE(p.country, ' ', ''), '''', '')) = LOWER(REPLACE(REPLACE(?, ' ', ''), '''', ''))`;
      params.push(country.trim());
    }

    if (featured === '1' || featured === 'true') {
      sql += ` AND p.is_featured = 1`;
    }

    if (search && search.trim()) {
      sql += ` AND (p.name LIKE ? OR p.tagline LIKE ? OR p.description LIKE ? OR p.city LIKE ? OR p.country LIKE ?)`;
      const term = `%${search.trim()}%`;
      params.push(term, term, term, term, term);
    }

    if (sort === 'top' || sort === 'votes') {
      sql += ` ORDER BY p.votes_count DESC, p.id DESC`;
    } else if (sort === 'newest') {
      sql += ` ORDER BY p.created_at DESC, p.id DESC`;
    } else {
      // Default: trending
      sql += ` ORDER BY p.is_trending DESC, p.votes_count DESC, p.id DESC`;
    }

    const query = db.prepare(sql);
    const products = query.all(...params);

    res.json({ success: true, count: products.length, data: products });
  } catch (error) {
    console.error('Error fetching products:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/products/:slug - get product by slug or numeric id with its reviews
router.get('/:slug', (req, res) => {
  try {
    const { slug } = req.params;

    const isNumeric = /^\d+$/.test(slug);
    const query = db.prepare(`
      SELECT 
        p.*,
        c.name AS category_name,
        c.icon AS category_icon,
        c.color AS category_color
      FROM products p
      LEFT JOIN categories c ON c.id = p.category_id
      WHERE ${isNumeric ? 'p.id = ?' : 'p.slug = ?'}
    `);

    const product = query.get(isNumeric ? parseInt(slug, 10) : slug);

    if (!product) {
      return res.status(404).json({ success: false, error: 'Product not found' });
    }

    // Fetch reviews
    const reviewsQuery = db.prepare(`
      SELECT * FROM reviews 
      WHERE product_id = ? 
      ORDER BY created_at DESC
    `);
    const reviews = reviewsQuery.all(product.id);

    res.json({
      success: true,
      data: {
        ...product,
        reviews
      }
    });
  } catch (error) {
    console.error('Error fetching product details:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/products/:id/vote - atomic upvote
router.post('/:id/vote', (req, res) => {
  try {
    const productId = parseInt(req.params.id, 10);
    const voterToken = req.body.voterToken || req.ip || 'anonymous';

    // Verify product exists
    const prodCheck = db.prepare('SELECT id, votes_count FROM products WHERE id = ?').get(productId);
    if (!prodCheck) {
      return res.status(404).json({ success: false, error: 'Product not found' });
    }

    // Check if voter already voted
    const existingVote = db.prepare('SELECT id FROM votes WHERE product_id = ? AND voter_token = ?').get(productId, voterToken);

    if (existingVote) {
      // Toggle off (un-vote)
      db.prepare('DELETE FROM votes WHERE id = ?').run(existingVote.id);
      db.prepare('UPDATE products SET votes_count = MAX(0, votes_count - 1) WHERE id = ?').run(productId);
      const updated = db.prepare('SELECT votes_count FROM products WHERE id = ?').get(productId);
      return res.json({ success: true, voted: false, votesCount: updated.votes_count });
    } else {
      // Cast upvote
      db.prepare('INSERT INTO votes (product_id, voter_token) VALUES (?, ?)').run(productId, voterToken);
      db.prepare('UPDATE products SET votes_count = votes_count + 1 WHERE id = ?').run(productId);
      const updated = db.prepare('SELECT votes_count FROM products WHERE id = ?').get(productId);
      return res.json({ success: true, voted: true, votesCount: updated.votes_count });
    }
  } catch (error) {
    console.error('Error processing vote:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/products/:id/review - submit a review
router.post('/:id/review', (req, res) => {
  try {
    const productId = parseInt(req.params.id, 10);
    const { authorName, authorRole, content, rating = 5 } = req.body;

    if (!authorName || !content) {
      return res.status(400).json({ success: false, error: 'Name and review text are required' });
    }

    const insert = db.prepare(`
      INSERT INTO reviews (product_id, author_name, author_role, author_avatar, rating, content)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    insert.run(productId, authorName.trim(), (authorRole || 'Builder').trim(), '', rating, content.trim());

    const reviews = db.prepare('SELECT * FROM reviews WHERE product_id = ? ORDER BY created_at DESC').all(productId);
    res.json({ success: true, message: 'Review published successfully', reviews });
  } catch (error) {
    console.error('Error creating review:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
