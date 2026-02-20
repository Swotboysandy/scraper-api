const fs = require('fs');
const path = require('path');

module.exports = (req, res) => {
  try {
    // CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
      return res.status(200).end();
    }

    if (req.method !== 'GET') {
      return res.status(405).json({ success: false, error: 'Method not allowed' });
    }

    const filePath = path.join(__dirname, '..', 'data', 'home.json');

    if (!fs.existsSync(filePath)) {
      // Fallback: return hardcoded data if file not bundled
      return res.status(200).json({
        success: true,
        fallback: true,
        data: [
          {
            title: 'Trending',
            movies: [
              { id: '123', title: 'Example Movie', imageUrl: 'https://imgcdn.example.com/v/123.jpg' }
            ]
          }
        ]
      });
    }

    const raw = fs.readFileSync(filePath, 'utf8');
    const json = JSON.parse(raw);
    return res.status(200).json({ success: true, count: json.length, data: json });
  } catch (err) {
    console.error('api/home error:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
};
