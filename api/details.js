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

        // ID comes from query param since Vercel serverless doesn't support path params natively
        const { id } = req.query;
        if (!id) {
            return res.status(400).json({ success: false, error: 'Missing required parameter: id' });
        }

        const cookies = getCookies();
        const timestamp = Math.round(Date.now() / 1000);
        const postUrl = `${BASE_URL}/post.php?id=${id}&t=${timestamp}`;

        const { data } = await axios.get(postUrl, {
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

        return res.status(200).json({ success: true, data });
    } catch (err) {
        console.error('api/details error:', err.message);
        return res.status(500).json({ success: false, error: err.message });
    }
};
