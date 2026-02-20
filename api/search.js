const axios = require('axios');

const BASE_URL = 'https://net22.cc';
const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

function getCookies() {
    return process.env.CF_COOKIES || '';
}

module.exports = async (req, res) => {
    try {
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

        if (req.method === 'OPTIONS') return res.status(200).end();
        if (req.method !== 'GET') return res.status(405).json({ success: false, error: 'Method not allowed' });

        const { q } = req.query;
        if (!q || q.trim().length === 0) {
            return res.status(400).json({ success: false, error: 'Missing required query parameter: q' });
        }

        const query = q.trim();
        const cookies = getCookies();
        const timestamp = Date.now().toString();
        const searchUrl = `${BASE_URL}/search.php?s=${encodeURIComponent(query)}&t=${timestamp}`;

        const { data } = await axios.get(searchUrl, {
            headers: {
                'User-Agent': USER_AGENT,
                'Accept': 'application/json, text/plain, */*',
                'Accept-Language': 'en-US,en;q=0.5',
                'Cookie': cookies,
                'Referer': BASE_URL,
                'X-Requested-With': 'XMLHttpRequest',
            },
            timeout: 15000,
        });

        return res.status(200).json({ success: true, query, data });
    } catch (err) {
        console.error('api/search error:', err.message);
        return res.status(500).json({ success: false, error: err.message });
    }
};
