const express = require('express');
const cors = require('cors');
const logger = require('./utils/logger');

const homeRoutes = require('./routes/homeRoutes');
const detailsRoutes = require('./routes/detailsRoutes');
const streamRoutes = require('./routes/streamRoutes');

const app = express();

app.use(cors());
app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ status: 'ok', up: true });
});

// Routes — MUST be before the 404 fallback
app.use('/', homeRoutes);
app.use('/details', detailsRoutes);
app.use('/stream', streamRoutes);

// Fallback 404 (must be after all routes)
app.use((req, res) => {
    res.status(404).json({ success: false, error: 'Endpoint not found' });
});

// Global Error Handler
app.use((err, req, res, next) => {
    logger.error('Unhandled Server Error:', err.message);
    res.status(500).json({
        success: false,
        error: 'Internal Server Error',
        details: process.env.NODE_ENV === 'development' ? err.message : undefined,
    });
});

module.exports = app;
