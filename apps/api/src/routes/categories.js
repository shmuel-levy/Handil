const express = require('express');
const CATEGORIES = require('../data/categories');

const router = express.Router();

// GET /api/categories
router.get('/', (req, res) => {
  res.json({ categories: CATEGORIES });
});

module.exports = router;
