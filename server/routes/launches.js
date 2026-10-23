const express = require('express');
const router = express.Router();
const db = require('../db');

// GET /api/launches - returns products grouped into today and yesterday / past launches
router.get('/', (req, res) => {
  try {
    const todayStr = new Date().toISOString().split('T')[0];
    const yesterdayStr = new Date(Date.now() - 86400000).toISOString().split('T')[0];

    // Calculate time until next midnight UTC (daily launch cycle)
    const now = new Date();
    const nextMidnight = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1));
    const msUntilNextLaunch = nextMidnight.getTime() - now.getTime();

    const query = db.prepare(`
      SELECT 
        l.id AS launch_id,
        l.launch_date,
        l.day_rank,
        l.votes_at_launch,
        p.id AS product_id,
        p.slug,
        p.name,
        p.tagline,
        p.description,
        p.city,
        p.country,
        p.banner_class,
        p.logo_url,
        p.votes_count,
        p.website_url,
        p.pricing_type,
        c.name AS category_name,
        c.icon AS category_icon,
        c.color AS category_color
      FROM launches l
      JOIN products p ON p.id = l.product_id
      LEFT JOIN categories c ON c.id = p.category_id
      ORDER BY l.launch_date DESC, p.votes_count DESC
    `);

    const allLaunches = query.all();

    const today = allLaunches.filter(item => item.launch_date === todayStr);
    const yesterday = allLaunches.filter(item => item.launch_date === yesterdayStr);
    const archive = allLaunches.filter(item => item.launch_date !== todayStr && item.launch_date !== yesterdayStr);

    res.json({
      success: true,
      data: {
        cycleCountdownMs: msUntilNextLaunch,
        todayDate: todayStr,
        today,
        yesterdayDate: yesterdayStr,
        yesterday,
        archive
      }
    });
  } catch (error) {
    console.error('Error fetching launches:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
