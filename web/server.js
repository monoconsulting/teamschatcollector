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
    getRunById,
    getChannels,
    getTargetChats,
    getAllTargetChats,
    addTargetChat,
    updateTargetChat,
    deleteTargetChat
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
 * GET /channels
 * Hämta alla kanaler med senaste meddelande
 */
app.get('/api/channels', async (req, res) => {
    try {
        const channels = await getChannels();

        res.json({
            count: channels.length,
            channels: channels
        });

    } catch (error) {
        console.error('[API] Error fetching channels:', error);
        res.status(500).json({ error: 'Failed to fetch channels' });
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
 * GET /target-chats
 * Hämta alla target chats (admin UI)
 */
app.get('/api/target-chats', async (req, res) => {
    try {
        const chats = await getAllTargetChats();

        res.json({
            count: chats.length,
            chats: chats
        });

    } catch (error) {
        console.error('[API] Error fetching target chats:', error);
        res.status(500).json({ error: 'Failed to fetch target chats' });
    }
});

/**
 * POST /target-chats
 * Lägg till ny target chat
 *
 * Body:
 * - chat_name: namn på chat/kanal (required)
 * - chat_type: channel|user|group (default: channel)
 * - profile: small|medium|large (default: medium)
 * - is_active: 0|1 (default: 1)
 * - priority: integer (default: 0)
 * - notes: fritext (optional)
 */
app.post('/api/target-chats', async (req, res) => {
    try {
        const { chat_name, chat_type, profile, is_active, priority, notes } = req.body;

        if (!chat_name || chat_name.trim() === '') {
            return res.status(400).json({ error: 'chat_name is required' });
        }

        const result = await addTargetChat({
            chat_name: chat_name.trim(),
            chat_type,
            profile,
            is_active,
            priority,
            notes
        });

        res.status(201).json({
            success: true,
            message: `Chat "${result.chat_name}" added successfully`,
            id: result.id
        });

    } catch (error) {
        console.error('[API] Error adding target chat:', error);
        if (error.message.includes('already exists')) {
            return res.status(409).json({ error: error.message });
        }
        res.status(500).json({ error: 'Failed to add target chat' });
    }
});

/**
 * PUT /target-chats/:id
 * Uppdatera target chat
 */
app.put('/api/target-chats/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { chat_name, chat_type, profile, is_active, priority, notes } = req.body;

        const success = await updateTargetChat(parseInt(id), {
            chat_name: chat_name?.trim(),
            chat_type,
            profile,
            is_active,
            priority,
            notes
        });

        if (!success) {
            return res.status(404).json({ error: 'Target chat not found' });
        }

        res.json({
            success: true,
            message: 'Target chat updated successfully'
        });

    } catch (error) {
        console.error('[API] Error updating target chat:', error);
        res.status(500).json({ error: 'Failed to update target chat' });
    }
});

/**
 * DELETE /target-chats/:id
 * Soft delete av target chat
 */
app.delete('/api/target-chats/:id', async (req, res) => {
    try {
        const { id } = req.params;

        const success = await deleteTargetChat(parseInt(id));

        if (!success) {
            return res.status(404).json({ error: 'Target chat not found' });
        }

        res.json({
            success: true,
            message: 'Target chat deleted successfully'
        });

    } catch (error) {
        console.error('[API] Error deleting target chat:', error);
        res.status(500).json({ error: 'Failed to delete target chat' });
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
 * GET /runs/:id/log
 * Hämta logg-innehåll för en specifik run från databasen
 */
app.get('/api/runs/:id/log', async (req, res) => {
    try {
        const { id } = req.params;
        const { getPool } = require('../database/connection');
        const pool = getPool();

        const [rows] = await pool.execute(
            'SELECT log_content FROM scrape_runs WHERE id = ? AND deleted_at IS NULL',
            [id]
        );

        if (rows.length === 0) {
            return res.status(404).json({ error: 'Run not found' });
        }

        const logContent = rows[0].log_content;

        if (!logContent) {
            return res.json({
                id: id,
                log: 'No log content available for this run.'
            });
        }

        res.json({
            id: id,
            log: logContent
        });

    } catch (error) {
        console.error('[API] Error fetching log:', error);
        res.status(500).json({ error: 'Failed to fetch log' });
    }
});

/**
 * POST /trigger-scrape
 * Manuellt trigga scraping av alla aktiva target chats
 *
 * Body:
 * - profile: small|medium|large (default: medium)
 */
app.post('/api/trigger-scrape', async (req, res) => {
    try {
        const { profile = 'medium' } = req.body;

        // Validera profile
        if (!['small', 'medium', 'large'].includes(profile)) {
            return res.status(400).json({ error: 'Invalid profile. Must be small, medium, or large.' });
        }

        console.log(`[API] Manual scrape triggered for profile: ${profile}`);

        // Använd child_process för att exekvera scraper i scraper-containern via Docker exec
        const { exec } = require('child_process');

        // Kör wrapper-scriptet som tvingar headless mode
        const command = `docker exec teams_collector_scraper node /app/playwright/scripts/run_manual_scrape.js ${profile}`;

        exec(command, (error, stdout, stderr) => {
            if (error) {
                console.error(`[API] Scrape execution error:`, error);
                console.error(`[API] stderr:`, stderr);
            } else {
                console.log(`[API] Scrape completed successfully`);
                console.log(`[API] stdout:`, stdout);
            }
        });

        // Returnera omedelbart
        res.json({
            success: true,
            message: `Scraping started for profile: ${profile}`,
            profile: profile,
            note: 'Check the Scrape Runs tab for progress'
        });

    } catch (error) {
        console.error('[API] Error triggering scrape:', error);
        res.status(500).json({ error: 'Failed to trigger scrape' });
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
