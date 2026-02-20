const browserService = require('./browserService');
const logger = require('../utils/logger');
const { TIMEOUTS } = require('../utils/constants');

const scraperService = {
    /**
     * Helper to safely load a page and ensure CF challenge is passed.
     */
    loadPageSafely: async (url) => {
        let page = null;
        try {
            page = await browserService.getNewPage();
            logger.info(`Navigating to ${url}...`);

            // Go to the target URL
            await page.goto(url, { waitUntil: 'domcontentloaded', timeout: TIMEOUTS.NAVIGATION });

            // Check if Cloudflare challenge is present
            const isCloudflare = await page.evaluate(() => {
                return !!document.querySelector('#challenge-running') || 
                       document.title.includes('Just a moment') ||
                       document.title.includes('Cloudflare');
            });

            if (isCloudflare) {
                logger.warn('Cloudflare challenge detected. Waiting for it to resolve...');
                // Wait for the main app container or specific elements to appear
                // This means the challenge successfully passed
                try {
                    await page.waitForFunction(() => {
                        return !document.title.includes('Just a moment') && 
                               (document.querySelector('.showcase') || document.querySelector('.some-main-app-class') || document.body.innerHTML.length > 5000); // 5000 chars is a rough heuristic for content
                    }, { timeout: TIMEOUTS.CLOUDFLARE });
                    logger.info('Cloudflare challenge bypassed.');
                } catch (e) {
                    throw new Error('Timeout waiting for Cloudflare challenge to resolve. Is the IP blocked?');
                }
            }

            // Small delay to ensure any dynamic React chunks load
            await new Promise(r => setTimeout(r, 1000));
            return page;

        } catch (error) {
            if (page) await page.close();
            throw error;
        }
    },

    /**
     * Scrape Home Page
     */
    scrapeHome: async () => {
        const baseUrl = process.env.TARGET_BASE_URL || 'https://net22.cc';
        const page = await scraperService.loadPageSafely(`${baseUrl}/home`);
        
        try {
            logger.info('Parsing home page data...');
            // Need to look at how net22.cc/home actually loads data.
            // If it renders HTML lists, we extract those. 
            // Often these sites might load a React state into a script tag with `__NEXT_DATA__` or similar.
            
            // Example generic extraction logic assuming standard DOM elements:
            const data = await page.evaluate(() => {
                const sections = [];
                // Example pseudo-selector logic: 
                // document.querySelectorAll('.category-section').forEach(...)
                
                // IMPORTANT: Since we don't have the exact DOM structure available right now,
                // we'll implement a fallback/generic JSON pattern search.
                // Often these sites embed the initial state in a script tag:
                const stateScript = Array.from(document.querySelectorAll('script')).find(s => s.textContent.includes('window.__INITIAL_STATE__') || s.textContent.includes('{'));
                if (stateScript && stateScript.textContent.includes('movies')) {
                    try {
                        // Very rough extraction, usually requires precise regex based on site
                        const match = stateScript.textContent.match(/window\.__INITIAL_STATE__\s*=\s*({.*});/);
                        if (match && match[1]) {
                            return JSON.parse(match[1]);
                        }
                    } catch(e) {}
                }

                // Manual DOM extraction fallback
                const lists = document.querySelectorAll('.slider-row, .movie-list, .section');
                lists.forEach(list => {
                    const titleEl = list.querySelector('h2, h3, .title');
                    const items = list.querySelectorAll('.movie-item, .card, a[href^="/movie/"]');
                    if (titleEl && items.length > 0) {
                        const movies = [];
                        items.forEach(item => {
                            const link = item.getAttribute('href') || item.querySelector('a')?.getAttribute('href');
                            const id = link ? link.split('/').pop() : 'unknown';
                            const img = item.querySelector('img')?.getAttribute('src');
                            const tEl = item.querySelector('.title, img')?.getAttribute('alt');
                            if (id !== 'unknown') {
                                movies.push({
                                    id,
                                    title: tEl || id,
                                    imageUrl: img
                                });
                            }
                        });
                        sections.push({
                            title: titleEl.innerText.trim(),
                            movies
                        });
                    }
                });

                return sections;
            });

            await page.close();
            return data;
        } catch (error) {
            if (page && !page.isClosed()) await page.close();
            logger.error('Error during scrapeHome:', error);
            throw error;
        }
    },

    /**
     * Scrape Details Page
     */
    scrapeDetails: async (id) => {
        // Implementation for details scraping
        const baseUrl = process.env.TARGET_BASE_URL || 'https://net22.cc';
        const page = await scraperService.loadPageSafely(`${baseUrl}/details/${id}`);
        
        try {
            logger.info(`Parsing details for ID: ${id}`);
            const data = await page.evaluate(() => {
                // Return dummy structure for now as placeholder for actual DOM scraping logic
                return {
                    id: window.location.pathname.split('/').pop(),
                    title: document.title || 'Unknown Title',
                    desc: document.querySelector('.description, p')?.innerText || '',
                    // ... fetch other details depending on target layout
                };
            });

            await page.close();
            return data;
        } catch (error) {
            if (page && !page.isClosed()) await page.close();
            logger.error(`Error during scrapeDetails (${id}):`, error);
            throw error;
        }
    }
};

module.exports = scraperService;
