const scraperService = require('../services/scraperService');
const cacheService = require('../services/cacheService');
const { CACHE_TTL } = require('../utils/constants');
const logger = require('../utils/logger');

exports.getSearchData = async (req, res, next) => {
    try {
        const { q } = req.query;

        if (!q || q.trim().length === 0) {
            return res.status(400).json({ success: false, error: 'Missing required query parameter: q' });
        }

        const query = q.trim();
        const cacheKey = `search_${query.toLowerCase()}`;

        // 1. Check cache
        const cachedData = cacheService.get(cacheKey);
        if (cachedData) {
            return res.json({ success: true, fromCache: true, query, data: cachedData });
        }

        // 2. Fetch fresh data
        const data = await scraperService.scrapeSearch(query);

        // 3. Set Cache
        cacheService.set(cacheKey, data, CACHE_TTL.SEARCH);

        // 4. Send Response
        res.json({ success: true, fromCache: false, query, data });
    } catch (error) {
        next(error);
    }
};
