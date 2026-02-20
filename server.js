require('dotenv').config();
const app = require('./src/app');
const logger = require('./src/utils/logger');
const browserService = require('./src/services/browserService');

const PORT = process.env.PORT || 3000;

const startServer = async () => {
    try {
        logger.info('Initializing browser instance...');
        // Initialize browser before accepting traffic to avoid cold start issues
        await browserService.initBrowser();
        
        app.listen(PORT, () => {
            logger.info(`Server is running and listening on port ${PORT}`);
        });
    } catch (error) {
        logger.error('Failed to start server:', error);
        process.exit(1);
    }
};

startServer();

// Graceful shutdowns
const cleanup = async () => {
    logger.info('Shutting down gracefully...');
    await browserService.closeBrowser();
    process.exit(0);
};

process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);
