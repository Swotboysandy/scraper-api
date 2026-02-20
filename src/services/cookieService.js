const logger = require('../utils/logger');

const cookieService = {
    /**
     * Get cookies for CloudFlare bypass from .env
     * No external dependencies — fully self-hosted.
     */
    getCookies: async () => {
        if (process.env.CF_COOKIES) {
            return process.env.CF_COOKIES;
        }

        logger.warn('CF_COOKIES not set in .env — requests will likely be blocked by CloudFlare.');
        return '';
    },

    clearCache: () => {
        // No-op, kept for API compatibility
    }
};

module.exports = cookieService;
