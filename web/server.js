/**
 * Teams Collector Web API
 * Express server på port 3000 (internal), 3040 (public)
 */

const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

// Database imports
const { testConnection } = require('../database/connection');
const {
    getMessages,
    searchMessages,
    getRuns,
    getRunById
} = require('../database/operations');

const app = express();

// ⚠️ PORT 3000 är FASTSTÄLLD - ändra inte!
const PORT = process.env.PORT || process.env.INTERNAL_PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'static')));

// Request logging
app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
    next();
});

// ==================== ROUTES ====================

/**
 * Health check endpoint
 */
app.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        port: PORT
    });
});

/**
 * Root - overview page
 */
app.get('/api', async (req, res) => {
    try {
        const runs = await getRuns(10, 0);
        const recentMessages = await getMessages({ limit: 10 });

        res.json({
            status: 'ok',
            summary: {
                recent_runs: runs.length,
                recent_messages: recentMessages.length
            },
            runs: runs,
            messages: recentMessages
        });

    } catch (error) {
        console.error('[API] Error in root endpoint:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * GET /messages
 * Hämta messages med pagination och filter
 *
 * Query params:
 * - limit: antal meddelanden (default: 50)
 * - offset: start position (default: 0)
 * - channel: filtrera på channel namn
 * - include_deleted: inkludera soft-deleted (default: false)
 */
app.get('/api/messages', async (req, res) => {
    try {
        const {
            limit = 50,
            offset = 0,
            channel = null,
            include_deleted = false
        } = req.query;

        const options = {
            limit: parseInt(limit),
            offset: parseInt(offset),
            channel_name: channel,
            include_deleted: include_deleted === 'true'
        };

        const messages = await getMessages(options);

        res.json({
            count: messages.length,
            limit: options.limit,
            offset: options.offset,
            filters: {
                channel: channel,
                include_deleted: options.include_deleted
            },
            messages: messages
        });

    } catch (error) {
        console.error('[API] Error fetching messages:', error);
        res.status(500).json({ error: 'Failed to fetch messages' });
    }
});

/**
 * GET /search
 * Fulltext search i messages
 *
 * Query params:
 * - q: search query (required)
 * - limit: max results (default: 50)
 */
app.get('/api/search', async (req, res) => {
    try {
        const { q, limit = 50 } = req.query;

        if (!q) {
            return res.status(400).json({ error: 'Query parameter "q" is required' });
        }

        const results = await searchMessages(q, parseInt(limit));

        res.json({
            query: q,
            count: results.length,
            results: results
        });

    } catch (error) {
        console.error('[API] Error in search:', error);
        res.status(500).json({ error: 'Search failed' });
    }
});

/**
 * GET /runs
 * Lista alla scrape runs
 *
 * Query params:
 * - limit: antal runs (default: 20)
 * - offset: start position (default: 0)
 */
app.get('/api/runs', async (req, res) => {
    try {
        const { limit = 20, offset = 0 } = req.query;

        const runs = await getRuns(parseInt(limit), parseInt(offset));

        res.json({
            count: runs.length,
            limit: parseInt(limit),
            offset: parseInt(offset),
            runs: runs
        });

    } catch (error) {
        console.error('[API] Error fetching runs:', error);
        res.status(500).json({ error: 'Failed to fetch runs' });
    }
});

/**
 * GET /runs/:id
 * Hämta detaljer för specifik run inklusive artifacts
 */
app.get('/api/runs/:id', async (req, res) => {
    try {
        const { id } = req.params;

        const run = await getRunById(id);

        if (!run) {
            return res.status(404).json({ error: 'Run not found' });
        }

        // Lägg till artifact URLs
        run.artifacts = {
            log: run.log_path ? `/artifacts${run.log_path}` : null,
            video: run.video_path ? `/artifacts${run.video_path}` : null,
            trace: run.trace_path ? `/artifacts${run.trace_path}` : null
        };

        res.json(run);

    } catch (error) {
        console.error('[API] Error fetching run:', error);
        res.status(500).json({ error: 'Failed to fetch run' });
    }
});

/**
 * GET /artifacts/*
 * Servar artifacts (logs, videos, traces)
 * Monterade som read-only volumes i Docker
 */
app.use('/artifacts/logs', express.static(path.join(__dirname, '../logs')));
app.use('/artifacts/data', express.static(path.join(__dirname, '../data')));

// ==================== ERROR HANDLING ====================

// 404 handler
app.use((req, res) => {
    res.status(404).json({ error: 'Endpoint not found' });
});

// Global error handler
app.use((err, req, res, next) => {
    console.error('[API] Unhandled error:', err);
    res.status(500).json({ error: 'Internal server error' });
});

// ==================== SERVER START ====================

async function startServer() {
    try {
        // Test DB connection
        console.log('[API] Testing database connection...');
        const dbOk = await testConnection();

        if (!dbOk) {
            console.error('[API] ❌ Database connection failed');
            console.error('[API] Check if MySQL container is running: docker ps');
            console.error('[API] Check .env configuration');
            process.exit(1);
        }

        console.log('[API] ✅ Database connection successful');

        // Start server
        app.listen(PORT, '0.0.0.0', () => {
            console.log('='.repeat(50));
            console.log(`[API] Teams Collector API started`);
            console.log(`[API] Internal port: ${PORT}`);
            console.log(`[API] Public port: ${process.env.PUBLIC_PORT || 3040}`);
            console.log(`[API] Health check: http://localhost:${PORT}/health`);
            console.log('='.repeat(50));
        });

    } catch (error) {
        console.error('[API] Failed to start server:', error);
        process.exit(1);
    }
}

// Graceful shutdown
process.on('SIGTERM', async () => {
    console.log('[API] SIGTERM received, shutting down gracefully...');
    const { closePool } = require('../database/connection');
    await closePool();
    process.exit(0);
});

process.on('SIGINT', async () => {
    console.log('[API] SIGINT received, shutting down gracefully...');
    const { closePool } = require('../database/connection');
    await closePool();
    process.exit(0);
});

// Start server
startServer();
