const scraperService = require('../services/scraperService');
const cacheService = require('../services/cacheService');
const { CACHE_TTL } = require('../utils/constants');
const logger = require('../utils/logger');

exports.getDetailsData = async (req, res, next) => {
    try {
        const { id } = req.params;
        
        if (!id) {
            return res.status(400).json({ success: false, error: 'ID is required' });
        }

        const cacheKey = `details_${id}`;
        
        // 1. Check cache
        const cachedData = cacheService.get(cacheKey);
        if (cachedData) {
            return res.json({ success: true, fromCache: true, data: cachedData });
        }

        // 2. Fetch fresh data via scraper
        const data = await scraperService.scrapeDetails(id);

        if (!data) {
            return res.status(404).json({ success: false, error: 'Details not found' });
        }

        // 3. Set Cache
        cacheService.set(cacheKey, data, CACHE_TTL.DETAILS);

        // 4. Send Response
        res.json({ success: true, fromCache: false, data });
    } catch (error) {
        next(error);
    }
};
