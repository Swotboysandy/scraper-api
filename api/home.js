const axios = require('axios');

const BASE_URL = 'https://net22.cc';
const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

// Curated search queries that produce good home page content
const HOME_CATEGORIES = [
    { title: 'Popular Now', queries: ['popular', 'hit', 'best'] },
    { title: 'Action & Thriller', queries: ['action', 'thriller'] },
    { title: 'Drama', queries: ['drama'] },
    { title: 'Comedy', queries: ['comedy', 'funny'] },
    { title: 'Horror', queries: ['horror'] },
    { title: 'Romance', queries: ['romance', 'love'] },
    { title: 'Sci-Fi & Fantasy', queries: ['sci-fi', 'fantasy'] },
    { title: 'Crime', queries: ['crime', 'detective'] },
    { title: 'Anime', queries: ['anime'] },
    { title: 'Documentary', queries: ['documentary'] },
    { title: 'Indian', queries: ['bollywood', 'hindi'] },
    { title: 'Korean', queries: ['korean', 'k-drama'] },
];

function getCookies() {
    return process.env.CF_COOKIES || '';
}

function normalizeImageUrl(url) {
    if (!url) return '';
    if (url.startsWith('//')) return 'https:' + url;
    if (url.startsWith('/')) return BASE_URL + url;
    return url;
}

/**
 * Search using the search.php JSON API (works from ANY IP, no verification needed)
 */
async function searchMovies(query) {
    const timestamp = Date.now().toString();
    const url = `${BASE_URL}/search.php?s=${encodeURIComponent(query)}&t=${timestamp}`;
    
    const { data } = await axios.get(url, {
        headers: {
            'User-Agent': USER_AGENT,
            'Accept': 'application/json',
            'Referer': BASE_URL,
        },
        timeout: 10000,
    });
    
    return data?.searchResult || [];
}

/**
 * Try HTML scraping first (with cookies), fall back to search API
 */
async function tryHtmlScraping() {
    const cookies = getCookies();
    if (!cookies) return null;

    try {
        const cheerio = require('cheerio');
        const { data: html } = await axios.get(BASE_URL, {
            headers: {
                'User-Agent': USER_AGENT,
                'Accept': 'text/html',
                'Cookie': cookies,
                'Referer': BASE_URL,
            },
            timeout: 15000,
        });

        const $ = cheerio.load(html);
        const title = $('title').text().toLowerCase();
        if (title.includes('verification') || title.includes('just a moment')) {
            return null; // Blocked
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

        return sections.length > 0 ? sections : null;
    } catch (err) {
        console.error('HTML scraping failed:', err.message);
        return null;
    }
}

module.exports = async (req, res) => {
    try {
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

        if (req.method === 'OPTIONS') return res.status(200).end();
        if (req.method !== 'GET') return res.status(405).json({ success: false, error: 'Method not allowed' });

        // Strategy 1: Try HTML scraping (best data with images)
        const htmlSections = await tryHtmlScraping();
        if (htmlSections && htmlSections.length > 0) {
            return res.status(200).json({ success: true, source: 'html', count: htmlSections.length, data: htmlSections });
        }

        // Strategy 2: Build sections from search.php API (works from ANY IP)
        console.log('HTML scraping blocked, using search API fallback...');
        const sections = [];
        const seenIds = new Set();

        // Run searches in parallel batches to speed up
        const categoryPromises = HOME_CATEGORIES.map(async (category) => {
            const allResults = [];
            
            for (const query of category.queries) {
                try {
                    const results = await searchMovies(query);
                    allResults.push(...results);
                } catch (err) {
                    console.warn(`Search failed for "${query}":`, err.message);
                }
            }

            // Deduplicate and format
            const movies = [];
            for (const item of allResults) {
                if (item.id && !seenIds.has(item.id)) {
                    seenIds.add(item.id);
                    movies.push({
                        id: item.id,
                        title: item.t || item.title || 'Untitled',
                        // Use the real image CDN: imgcdn.kim
                        imageUrl: item.ua 
                            ? normalizeImageUrl(item.ua) 
                            : `https://imgcdn.kim/poster/341/${item.id}.jpg`,
                    });
                }
            }

            return { title: category.title, movies };
        });

        const results = await Promise.all(categoryPromises);
        
        for (const section of results) {
            if (section.movies.length > 0) {
                sections.push(section);
            }
        }

        if (sections.length === 0) {
            return res.status(503).json({ success: false, error: 'No data available from any source' });
        }

        return res.status(200).json({ success: true, source: 'search', count: sections.length, data: sections });
    } catch (err) {
        console.error('api/home error:', err.message);
        return res.status(500).json({ success: false, error: err.message });
    }
};
