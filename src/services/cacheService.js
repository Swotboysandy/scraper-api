const NodeCache = require('node-cache');
const logger = require('../utils/logger');

// Initialize cache with default TTL of 5 minutes and check bounds periodically 
const cache = new NodeCache({ stdTTL: 300, checkperiod: 120 });

const cacheService = {
    get: (key) => {
        const value = cache.get(key);
        if (value) {
            logger.debug(`Cache HIT for key: ${key}`);
            return value;
        }
        logger.debug(`Cache MISS for key: ${key}`);
        return null;
    },
    
    set: (key, value, ttl) => {
        logger.debug(`SET cache for key: ${key} (TTL: ${ttl}s)`);
        cache.set(key, value, ttl);
    },
    
    del: (key) => {
        cache.del(key);
    },
    
    flush: () => {
        cache.flushAll();
        logger.info('Cache flushed manually.');
    }
};

module.exports = cacheService;
