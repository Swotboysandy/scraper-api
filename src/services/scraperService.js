const axios = require('axios');
const cheerio = require('cheerio');
const cookieService = require('./cookieService');
const logger = require('../utils/logger');
const { USER_AGENT } = require('../utils/constants');

const BASE_URL = 'https://net22.cc';
const STREAM_PREFIX = 'https://net51.cc';
const PLAYLIST_HOST = 'https://net52.cc';

/**
 * Build common headers for all requests
 */
async function getHeaders(acceptJson = false) {
    const cookies = await cookieService.getCookies();
    return {
        'User-Agent': USER_AGENT,
        'Accept': acceptJson
            ? 'application/json, text/plain, */*'
            : 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Cookie': cookies,
        'Referer': BASE_URL,
        ...(acceptJson ? { 'X-Requested-With': 'XMLHttpRequest' } : {}),
    };
}

/**
 * Normalize image URLs (handle protocol-relative, relative, etc.)
 */
function normalizeImageUrl(url) {
    if (!url) return '';
    if (url.startsWith('//')) return 'https:' + url;
    if (url.startsWith('/')) return BASE_URL + url;
    return url;
}

const scraperService = {
    /**
     * Scrape Home Page — Cheerio-based HTML parsing
     */
    scrapeHome: async () => {
        try {
            logger.info(`Scraping home page from ${BASE_URL}...`);
            const headers = await getHeaders(false);
            const { data: html } = await axios.get(BASE_URL, { headers, timeout: 15000 });

            const $ = cheerio.load(html);
            const sections = [];

            // Check if we got past CloudFlare
            const title = $('title').text().toLowerCase();
            if (title.includes('verification') || title.includes('just a moment') || title.includes('cloudflare')) {
                throw new Error('CloudFlare challenge detected. Set CF_COOKIES in your .env file with valid browser cookies.');
            }

            // Parse the actual content
            $('.lolomoRow').each((_, rowElement) => {
                const $row = $(rowElement);
                const categoryTitle = $row.find('.row-header-title').text().trim();
                const movies = [];

                $row.find('.slider-item').each((_, itemElement) => {
                    const $item = $(itemElement);
                    const dataPost = $item.attr('data-post');
                    const $link = $item.find('a.slider-refocus');
                    const linkTitle = $link.attr('aria-label') || '';
                    const $img = $item.find('.boxart-image');
                    const imageUrl = normalizeImageUrl($img.attr('data-src') || $img.attr('src'));

                    if (dataPost && linkTitle && imageUrl) {
                        movies.push({
                            id: dataPost,
                            title: linkTitle,
                            imageUrl: imageUrl,
                        });
                    }
                });

                if (categoryTitle && movies.length > 0) {
                    sections.push({ title: categoryTitle, movies });
                }
            });

            logger.info(`Scraped ${sections.length} sections with ${sections.reduce((a, s) => a + s.movies.length, 0)} items.`);
            return sections;
        } catch (error) {
            logger.error('Error scraping home:', error.message);
            throw error;
        }
    },

    /**
     * Search — calls search.php JSON API
     */
    scrapeSearch: async (query) => {
        try {
            const timestamp = Date.now().toString();
            const searchUrl = `${BASE_URL}/search.php?s=${encodeURIComponent(query)}&t=${timestamp}`;

            logger.info(`Searching: ${searchUrl}`);
            const headers = await getHeaders(true);
            const { data } = await axios.get(searchUrl, { headers, timeout: 15000 });

            return data;
        } catch (error) {
            logger.error('Error searching:', error.message);
            throw error;
        }
    },

    /**
     * Get Details — calls post.php JSON API
     */
    scrapeDetails: async (id) => {
        try {
            const timestamp = Date.now().toString();
            const postUrl = `${BASE_URL}/post.php?id=${id}&t=${timestamp}`;

            logger.info(`Fetching details: ${postUrl}`);
            const headers = await getHeaders(true);
            const { data } = await axios.get(postUrl, { headers, timeout: 15000 });

            return data;
        } catch (error) {
            logger.error(`Error fetching details for ${id}:`, error.message);
            throw error;
        }
    },

    /**
     * Get Stream — 2-step: play.php → playlist.php
     */
    scrapeStream: async (id) => {
        try {
            // Step 1: Get play hash
            logger.info(`Getting play hash for ID: ${id}...`);
            const headers = await getHeaders(true);

            const playResponse = await axios.post(`${BASE_URL}/play.php`, `id=${id}`, {
                headers: {
                    ...headers,
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                timeout: 15000,
            });

            const hash = playResponse.data?.h;
            if (!hash) {
                throw new Error('Hash not found in play.php response');
            }
            logger.info(`Got play hash: ${hash}`);

            // Step 2: Get playlist
            const timestamp = Date.now().toString();
            const cookies = await cookieService.getCookies();
            const playlistUrl = `${PLAYLIST_HOST}/playlist.php?id=${id}&tm=${timestamp}&h=${encodeURIComponent(hash)}`;

            logger.info(`Fetching playlist: ${playlistUrl}`);
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

            return {
                playlistUrl,
                streamData,
                requestParams: { id, timestamp, h: hash },
            };
        } catch (error) {
            logger.error(`Error fetching stream for ${id}:`, error.message);
            throw error;
        }
    },
};

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

module.exports = scraperService;
