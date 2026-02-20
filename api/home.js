const fs = require('fs');
const path = require('path');

module.exports = (req, res) => {
  if (req.method === 'GET') {
    const filePath = path.join(process.cwd(), 'data', 'home.json');
    fs.readFile(filePath, 'utf8', (err, data) => {
      if (err) {
        return res.status(500).json({ error: 'Failed to read home data.' });
      }
      try {
        const json = JSON.parse(data);
        res.status(200).json(json);
      } catch (parseErr) {
        res.status(500).json({ error: 'Invalid JSON format.' });
      }
    });
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
};
