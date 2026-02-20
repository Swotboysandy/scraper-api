const express = require('express');
const cors = require('cors');

const homeRoutes = require('./routes/homeRoutes');

const app = express();

app.use(cors());
app.use(express.json());


// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ status: 'ok', up: true });
});

// Fallback 404
app.use((req, res) => {
    res.status(404).json({ success: false, error: 'Endpoint not found' });
});

// Global Error Handler
app.use((err, req, res, next) => {
    logger.error('Unhandled Server Error:', err.message);
    res.status(500).json({
        success: false,
        error: 'Internal Server Error',
        details: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
});

app.use('/', homeRoutes);

module.exports = app;
