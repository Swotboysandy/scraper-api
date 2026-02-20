const puppeteer = require('puppeteer');
const logger = require('../utils/logger');

let browser = null;

const browserService = {
    /**
     * Get or launch the shared browser instance.
     */
    getBrowser: async () => {
        if (browser && browser.connected) {
            return browser;
        }

        logger.info('Launching new Puppeteer browser instance...');
        browser = await puppeteer.launch({
            headless: 'new',
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-gpu',
                '--single-process',
            ],
            executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined,
        });

        browser.on('disconnected', () => {
            logger.warn('Browser disconnected.');
            browser = null;
        });

        return browser;
    },

    /**
     * Get a new page from the browser instance.
     */
    getNewPage: async () => {
        const b = await browserService.getBrowser();
        const page = await b.newPage();

        // Set a realistic user-agent to help bypass basic bot detection
        await page.setUserAgent(
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        );
        await page.setViewport({ width: 1366, height: 768 });

        return page;
    },

    /**
     * Gracefully close the browser.
     */
    close: async () => {
        if (browser) {
            await browser.close();
            browser = null;
            logger.info('Browser closed.');
        }
    },
};

module.exports = browserService;
