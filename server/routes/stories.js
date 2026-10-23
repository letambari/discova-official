const express = require('express');
const router = express.Router();
const db = require('../db');

// GET /api/stories - list founder stories with filtering
router.get('/', (req, res) => {
  try {
    const { type, category } = req.query;

    let sql = `
      SELECT 
        s.*,
        c.name AS category_name,
        c.color AS category_color
      FROM stories s
      LEFT JOIN categories c ON c.id = s.category_id
      WHERE 1=1
    `;
    const params = [];

    if (type && type !== 'all') {
      sql += ` AND s.type = ?`;
      params.push(type);
    }

    if (category && category !== 'all') {
      sql += ` AND s.category_id = ?`;
      params.push(category);
    }

    sql += ` ORDER BY s.is_featured DESC, s.id DESC`;

    const stories = db.prepare(sql).all(...params);

    const parsedStories = stories.map(s => {
      let transcript = [];
      try {
        transcript = JSON.parse(s.transcript_json || '[]');
      } catch (e) {}
      return {
        ...s,
        transcript
      };
    });

    res.json({ success: true, count: parsedStories.length, data: parsedStories });
  } catch (error) {
    console.error('Error fetching stories:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/stories/:slug - get detailed story with full transcript & company products
router.get('/:slug', (req, res) => {
  try {
    const { slug } = req.params;
    const isNumeric = /^\d+$/.test(slug);

    const query = db.prepare(`
      SELECT 
        s.*,
        c.name AS category_name,
        c.color AS category_color
      FROM stories s
      LEFT JOIN categories c ON c.id = s.category_id
      WHERE ${isNumeric ? 's.id = ?' : 's.slug = ?'}
    `);

    const story = query.get(isNumeric ? parseInt(slug, 10) : slug);

    if (!story) {
      return res.status(404).json({ success: false, error: 'Story not found' });
    }

    let transcript = [];
    try {
      transcript = JSON.parse(story.transcript_json || '[]');
    } catch (e) {}

    // Find products linked to this founder/company
    const productsQuery = db.prepare(`
      SELECT * FROM products 
      WHERE maker_name LIKE ? OR slug = ? OR name LIKE ?
    `);
    const linkedProducts = productsQuery.all(
      `%${story.founder_name}%`,
      story.company_slug || '',
      `%${story.company_name}%`
    );

    res.json({
      success: true,
      data: {
        ...story,
        transcript,
        linkedProducts
      }
    });
  } catch (error) {
    console.error('Error fetching story details:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/stories - create/publish story from Studio CMS
router.post('/', (req, res) => {
  try {
    const {
      founderName, founderRole, companyName, companySlug, headline,
      quote, storyBody, videoUrl, videoDuration = '20:00',
      location = 'Lagos, Nigeria', categoryId = 'devtools',
      type = 'video', transcript = []
    } = req.body;

    if (!founderName || !companyName || !headline) {
      return res.status(400).json({ success: false, error: 'Founder name, company, and headline are required' });
    }

    const slug = (companySlug || companyName).toLowerCase().replace(/[^a-z0-9]+/g, '-') + '-' + Date.now();

    const insert = db.prepare(`
      INSERT INTO stories (
        slug, founder_name, founder_role, founder_avatar, company_name, company_slug,
        headline, quote, story_body, video_url, video_duration, location, category_id,
        type, transcript_json, is_featured
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)
    `);

    insert.run(
      slug, founderName, founderRole || 'Founder', '', companyName, companySlug || '',
      headline, quote || '', storyBody || '', videoUrl || '', videoDuration,
      location, categoryId, type, JSON.stringify(transcript)
    );

    res.json({ success: true, message: 'Story created successfully', slug });
  } catch (error) {
    console.error('Error publishing story:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
