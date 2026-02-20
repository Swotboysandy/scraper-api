const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const logger = require('../utils/logger');
const { USER_AGENT } = require('../utils/constants');

// Apply stealth plugin to avoid basic bot detections
puppeteer.use(StealthPlugin());

let globalBrowser = null;
let activePages = 0;
const MAX_CONCURRENT_PAGES = 5;

const browserService = {
    initBrowser: async () => {
        if (!globalBrowser) {
            logger.info('Launching global Puppeteer browser...');
            
            // Render specific configurations
            const args = [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-gpu',
                '--single-process',
                '--no-zygote',
                '--disable-web-security',
                '--disable-features=IsolateOrigins,site-per-process'
            ];

            // If environment provides custom args
            if (process.env.CHROME_ARGS) {
                args.push(...process.env.CHROME_ARGS.split(','));
            }

            const launchOptions = {
                headless: "new",
                args: [...new Set(args)], // remove duplicates
                ignoreHTTPSErrors: true,
            };

            if (process.env.PUPPETEER_EXECUTABLE_PATH) {
                launchOptions.executablePath = process.env.PUPPETEER_EXECUTABLE_PATH;
            }

            globalBrowser = await puppeteer.launch(launchOptions);
            
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
