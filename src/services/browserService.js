const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const logger = require('../utils/logger');
const { USER_AGENT } = require('../utils/constants');

puppeteer.use(StealthPlugin());

let globalBrowser = null;
let activePages = 0;
const MAX_CONCURRENT_PAGES = 5;

const browserService = {
    initBrowser: async () => {
        if (!globalBrowser) {
            logger.info('Launching global Puppeteer browser...');
            globalBrowser = await puppeteer.launch({
                headless: true,
                args: [
                    '--no-sandbox',
                    '--disable-setuid-sandbox',
                    '--disable-dev-shm-usage',
                    '--disable-gpu',
                    '--no-zygote',
                    '--single-process'
                ]
            });
            globalBrowser.on('disconnected', () => {
                logger.warn('Browser disconnected. Will reinit on next request.');
                globalBrowser = null;
            });
            logger.info('Global browser launched successfully.');
        }
        return globalBrowser;
    },

    getNewPage: async () => {
        if (activePages >= MAX_CONCURRENT_PAGES) {
            throw new Error('Too many concurrent page requests. Server is busy.');
        }

        const browser = await browserService.initBrowser();
        const page = await browser.newPage();
        activePages++;

        // Optimize page load by blocking unnecessary resources
        await page.setRequestInterception(true);
        page.on('request', (req) => {
            const resourceType = req.resourceType();
            if (['image', 'stylesheet', 'font', 'media'].includes(resourceType)) {
                req.abort();
            } else {
                req.continue();
            }
        });

        await page.setUserAgent(USER_AGENT);
        await page.setViewport({ width: 1280, height: 720 });
        
        // Hide standard headless traits
        await page.evaluateOnNewDocument(() => {
            Object.defineProperty(navigator, 'webdriver', { get: () => false });
        });

        // Add a cleanup method to track active pages correctly
        const originalClose = page.close.bind(page);
        page.close = async (...args) => {
            try {
                activePages--;
                await originalClose(...args);
                logger.debug(`Page closed. Active pages: ${activePages}`);
            } catch (err) {
                logger.error('Error closing page:', err);
            }
        };

        return page;
    },

    closeBrowser: async () => {
        if (globalBrowser) {
            logger.info('Closing global browser...');
            await globalBrowser.close();
            globalBrowser = null;
            activePages = 0;
        }
    }
};

module.exports = browserService;
