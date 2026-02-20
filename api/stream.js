const axios = require('axios');

const BASE_URL = 'https://net22.cc';
const STREAM_PREFIX = 'https://net51.cc';
const PLAYLIST_HOST = 'https://net52.cc';
const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

function getCookies() {
    return process.env.CF_COOKIES || '';
}

/**
 * Recursively add STREAM_PREFIX to relative file URLs in sources
 */
function addPrefixToSources(data) {
    if (!data || typeof data !== 'object') return data;

    if (Array.isArray(data)) {
        return data.map(item => addPrefixToSources(item));
    }

    const result = { ...data };

    if (Array.isArray(result.sources)) {
        result.sources = result.sources.map(source => {
            if (source.file && typeof source.file === 'string' && source.file.startsWith('/')) {
                return { ...source, file: STREAM_PREFIX + source.file };
            }
            return source;
        });
    }

    for (const key in result) {
        if (result[key] && typeof result[key] === 'object') {
            result[key] = addPrefixToSources(result[key]);
        }
    }

    return result;
}

module.exports = async (req, res) => {
    try {
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

        if (req.method === 'OPTIONS') return res.status(200).end();
        if (req.method !== 'GET') return res.status(405).json({ success: false, error: 'Method not allowed' });

        // ID comes from query param
        const { id } = req.query;
        if (!id) {
            return res.status(400).json({ success: false, error: 'Missing required parameter: id' });
        }

        const cookies = getCookies();
        const headers = {
            'User-Agent': USER_AGENT,
            'Accept': 'application/json, text/plain, */*',
            'Accept-Language': 'en-US,en;q=0.5',
            'Cookie': cookies,
            'Referer': BASE_URL,
            'X-Requested-With': 'XMLHttpRequest',
        };

        // Step 1: Get play hash
        const playResponse = await axios.post(`${BASE_URL}/play.php`, `id=${id}`, {
            headers: {
                ...headers,
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            timeout: 15000,
        });

        const hash = playResponse.data?.h;
        if (!hash) {
            return res.status(502).json({ success: false, error: 'Hash not found in play.php response' });
        }

        // Step 2: Get playlist
        const timestamp = Date.now().toString();
        const playlistUrl = `${PLAYLIST_HOST}/playlist.php?id=${id}&tm=${timestamp}&h=${encodeURIComponent(hash)}`;

        const playlistResponse = await axios.get(playlistUrl, {
            headers: {
                'User-Agent': USER_AGENT,
                'Accept': 'application/json, text/plain, */*',
                'Accept-Language': 'en-US,en;q=0.5',
                'Cookie': cookies,
                'Referer': `${STREAM_PREFIX}/`,
                'X-Requested-With': 'XMLHttpRequest',
            },
            timeout: 15000,
        });

        let streamData = playlistResponse.data;
        streamData = addPrefixToSources(streamData);

        return res.status(200).json({
            success: true,
            data: {
                playlistUrl,
                streamData,
                requestParams: { id, timestamp, h: hash },
            },
        });
    } catch (err) {
        console.error('api/stream error:', err.message);
        return res.status(500).json({ success: false, error: err.message });
    }
};
