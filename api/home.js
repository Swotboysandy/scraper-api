const fs = require('fs');
const path = require('path');

module.exports = (req, res) => {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method === 'GET') {
    const filePath = path.join(__dirname, '..', 'data', 'home.json');
    fs.readFile(filePath, 'utf8', (err, data) => {
      if (err) {
        console.error('Failed to read home.json:', err.message);
        return res.status(500).json({ success: false, error: 'Failed to read home data.' });
      }
      try {
        const json = JSON.parse(data);
        res.status(200).json({ success: true, count: json.length, data: json });
      } catch (parseErr) {
        console.error('JSON parse error:', parseErr.message);
        res.status(500).json({ success: false, error: 'Invalid JSON format.' });
      }
    });
  } else {
    res.status(405).json({ success: false, error: 'Method not allowed' });
  }
};
