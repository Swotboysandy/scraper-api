const scraperService = require('../services/scraperService');
const cacheService = require('../services/cacheService');
const { CACHE_TTL } = require('../utils/constants');
const logger = require('../utils/logger');

exports.getHomeData = async (req, res, next) => {
    try {
        const cacheKey = 'home_data';
        
        // 1. Check cache
        const cachedData = cacheService.get(cacheKey);
        if (cachedData) {
            return res.json({ success: true, fromCache: true, count: cachedData.length, data: cachedData });
        }

        // 2. Fetch fresh data via scraper
        const data = await scraperService.scrapeHome();

        if (!data || data.length === 0) {
            return res.status(404).json({ success: false, error: 'Failed to retrieve home data or data is empty.' });
        }

        // 3. Set Cache
        cacheService.set(cacheKey, data, CACHE_TTL.HOME);

        // 4. Send Response
        res.json({ success: true, fromCache: false, count: data.length, data });
    } catch (error) {
        next(error);
    }
};
