module.exports = {
    // Cache TTLs in seconds
    CACHE_TTL: {
        HOME: 5 * 60,       // 5 minutes
        DETAILS: 10 * 60,   // 10 minutes
        STREAM: 2 * 60      // 2 minutes
    },
    
    // Puppeteer Timeouts
    TIMEOUTS: {
        NAVIGATION: 30000,  // 30 seconds
        CLOUDFLARE: 15000,  // 15 seconds wait for CF check
    },

    USER_AGENT: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'
};
