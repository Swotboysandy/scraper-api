const getTimestamp = () => {
    return new Date().toISOString();
};

const logger = {
    info: (message, ...args) => {
        console.log(`[${getTimestamp()}] [INFO] ${message}`, ...args);
    },
    warn: (message, ...args) => {
        console.warn(`[${getTimestamp()}] [WARN] ${message}`, ...args);
    },
    error: (message, ...args) => {
        console.error(`[${getTimestamp()}] [ERROR] ${message}`, ...args);
    },
    debug: (message, ...args) => {
        if (process.env.NODE_ENV === 'development') {
            console.debug(`[${getTimestamp()}] [DEBUG] ${message}`, ...args);
        }
    }
};

module.exports = logger;
