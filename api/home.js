const axios = require('axios');
const cheerio = require('cheerio');

const BASE_URL = 'https://net22.cc';
const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

function getCookies() {
    return process.env.CF_COOKIES || '';
}

function normalizeImageUrl(url) {
    if (!url) return '';
    if (url.startsWith('//')) return 'https:' + url;
    if (url.startsWith('/')) return BASE_URL + url;
    return url;
}

module.exports = async (req, res) => {
    try {
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

        if (req.method === 'OPTIONS') return res.status(200).end();
        if (req.method !== 'GET') return res.status(405).json({ success: false, error: 'Method not allowed' });

        const cookies = await getCookies();
        const { data: html } = await axios.get(BASE_URL, {
            headers: {
                'User-Agent': USER_AGENT,
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.5',
                'Cookie': cookies,
                'Referer': BASE_URL,
            },
            timeout: 15000,
        });

        const $ = cheerio.load(html);

        const title = $('title').text().toLowerCase();
        if (title.includes('verification') || title.includes('just a moment') || title.includes('cloudflare')) {
            return res.status(503).json({ success: false, error: 'CloudFlare challenge detected. Set CF_COOKIES env variable.' });
        }

        const sections = [];
        $('.lolomoRow').each((_, rowElement) => {
            const $row = $(rowElement);
            const categoryTitle = $row.find('.row-header-title').text().trim();
            const movies = [];

            $row.find('.slider-item').each((_, itemElement) => {
                const $item = $(itemElement);
                const dataPost = $item.attr('data-post');
                const $link = $item.find('a.slider-refocus');
                const itemTitle = $link.attr('aria-label') || '';
                const $img = $item.find('.boxart-image');
                const imageUrl = normalizeImageUrl($img.attr('data-src') || $img.attr('src'));

                if (dataPost && itemTitle && imageUrl) {
                    movies.push({ id: dataPost, title: itemTitle, imageUrl });
                }
            });

            if (categoryTitle && movies.length > 0) {
                sections.push({ title: categoryTitle, movies });
            }
        });

        return res.status(200).json({ success: true, count: sections.length, data: sections });
    } catch (err) {
        console.error('api/home error:', err.message);
        return res.status(500).json({ success: false, error: err.message });
    }
};
