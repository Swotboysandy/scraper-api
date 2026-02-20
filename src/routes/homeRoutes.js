const express = require('express');
const fs = require('fs');
const path = require('path');

const router = express.Router();

router.get('/home', (req, res) => {
  const filePath = path.join(__dirname, '../../data/home.json');
  fs.readFile(filePath, 'utf8', (err, data) => {
    if (err) {
      return res.status(500).json({ error: 'Failed to read home data.' });
    }
    try {
      const json = JSON.parse(data);
      res.json(json);
    } catch (parseErr) {
      res.status(500).json({ error: 'Invalid JSON format.' });
    }
  });
});

module.exports = router;const express = require('express');
const router = express.Router();
const homeController = require('../controllers/homeController');

router.get('/', homeController.getHomeData);

module.exports = router;
