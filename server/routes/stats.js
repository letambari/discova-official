const express = require('express');
const router = express.Router();
const db = require('../db');

const COUNTRY_FLAGS = {
  'Nigeria': '🇳🇬',
  'Kenya': '🇰🇪',
  'South Africa': '🇿🇦',
  'Ghana': '🇬🇭',
  'Egypt': '🇪🇬',
  'Rwanda': '🇷🇼',
  'Senegal': '🇸🇳',
  'Uganda': '🇺🇬',
  'Tanzania': '🇹🇿',
  'Morocco': '🇲🇦',
  'Côte d\'Ivoire': '🇨🇮',
  'Cote d\'Ivoire': '🇨🇮',
  'Cameroon': '🇨🇲',
  'Ethiopia': '🇪🇹',
  'Tunisia': '🇹🇳',
  'Zambia': '🇿🇲'
};

// GET /api/stats - Public real-time platform metrics & country breakdown
router.get('/', (req, res) => {
  try {
    const productsRow = db.prepare('SELECT count(*) as count FROM products').get();
    const totalProducts = productsRow ? productsRow.count : 0;

    const countriesRows = db.prepare(`
      SELECT country, count(*) as count 
      FROM products 
      WHERE country IS NOT NULL AND TRIM(country) != '' 
      GROUP BY country 
      ORDER BY count DESC, country ASC
    `).all();

    const totalCountries = countriesRows.length;

    const formattedCountries = countriesRows.map(c => ({
      country: c.country,
      count: c.count,
      flag: COUNTRY_FLAGS[c.country] || '🌍'
    }));

    const storiesRow = db.prepare('SELECT count(*) as count FROM stories').get();
    const totalStories = storiesRow ? storiesRow.count : 0;

    const categoriesRow = db.prepare('SELECT count(*) as count FROM categories').get();
    const totalCategories = categoriesRow ? categoriesRow.count : 0;

    const launchesRow = db.prepare('SELECT count(*) as count FROM launches').get();
    const totalLaunches = launchesRow ? launchesRow.count : 0;

    const makersRow = db.prepare(`
      SELECT count(DISTINCT maker_name) as count 
      FROM products 
      WHERE maker_name IS NOT NULL AND TRIM(maker_name) != ''
    `).get();
    const totalMakers = makersRow ? makersRow.count : 0;

    res.json({
      success: true,
      stats: {
        totalProducts,
        totalCountries,
        totalStories,
        totalCategories,
        totalLaunches,
        totalMakers,
        countries: formattedCountries
      }
    });
  } catch (error) {
    console.error('Error fetching platform statistics:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
