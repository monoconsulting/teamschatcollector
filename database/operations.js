/**
 * Database Operations
 * CRUD operations med stöd för soft delete
 */

const { getPool } = require('./connection');

/**
 * Skapar en ny scrape run
 */
async function createScrapeRun(runId, profile, headless) {
    const pool = getPool();
    const query = `
        INSERT INTO scrape_runs (id, started_at, profile, headless, status)
        VALUES (?, NOW(), ?, ?, 'running')
    `;

    await pool.execute(query, [runId, profile, headless ? 1 : 0]);
    console.log(`[DB] Created scrape run: ${runId}`);
    return runId;
}

/**
 * Uppdaterar scrape run status
 */
async function updateScrapeRun(runId, data) {
    const pool = getPool();
    const {
        status,
        completed_at,
        message_count,
        error_message,
        log_path,
        video_path,
        trace_path
    } = data;

    const query = `
        UPDATE scrape_runs
        SET
            status = COALESCE(?, status),
            completed_at = COALESCE(?, completed_at),
            message_count = COALESCE(?, message_count),
            error_message = COALESCE(?, error_message),
            log_path = COALESCE(?, log_path),
            video_path = COALESCE(?, video_path),
            trace_path = COALESCE(?, trace_path)
        WHERE id = ?
    `;

    await pool.execute(query, [
        status,
        completed_at,
        message_count,
        error_message,
        log_path,
        video_path,
        trace_path,
        runId
    ]);

    console.log(`[DB] Updated scrape run: ${runId}, status: ${status}`);
}

/**
 * Sparar chat messages (batch upsert - idempotent)
 *
 * Använder INSERT ... ON DUPLICATE KEY UPDATE för att undvika dubbletter.
 * Unikhetsnyckel baseras på: channel_name + timestamp + sender + message_text
 *
 * VIKTIGT: Denna metod är idempotent - samma meddelande kan skickas flera gånger
 * utan att skapa dubbletter i databasen.
 */
async function saveChatMessages(messages, scrapeRunId) {
    if (!messages || messages.length === 0) {
        return 0;
    }

    const pool = getPool();

    // Batch insert med ON DUPLICATE KEY UPDATE för idempotens
    // Vi skapar en "fingerprint" för varje meddelande baserat på:
    // channel_name + timestamp + sender + message_text
    const query = `
        INSERT INTO chat_messages
        (sender, message_text, timestamp, channel_name, thread_id, scrape_run_id, raw_json)
        VALUES ?
        ON DUPLICATE KEY UPDATE
            scrape_run_id = VALUES(scrape_run_id),
            raw_json = VALUES(raw_json),
            updated_at = CURRENT_TIMESTAMP
    `;

    const values = messages.map(msg => [
        msg.sender || 'Unknown',
        msg.message_text || '',
        msg.timestamp || new Date(),
        msg.channel_name || 'Unknown',
        msg.thread_id || null,
        scrapeRunId,
        JSON.stringify(msg)
    ]);

    const [result] = await pool.query(query, [values]);
    console.log(`[DB] Saved ${result.affectedRows} messages for run ${scrapeRunId} (${result.insertId ? 'new' : 'updated'})`);
    return result.affectedRows;
}

/**
 * Hämtar senaste timestamp för en specifik chat
 * Används för inkrementell insamling
 */
async function getLatestMessageTimestamp(channelName) {
    const pool = getPool();
    const query = `
        SELECT MAX(timestamp) as last_timestamp
        FROM chat_messages
        WHERE channel_name = ? AND deleted_at IS NULL
    `;

    const [rows] = await pool.execute(query, [channelName]);

    if (rows && rows[0] && rows[0].last_timestamp) {
        return new Date(rows[0].last_timestamp);
    }

    return null;
}

/**
 * Soft delete av meddelanden
 * VIKTIGT: Använd ALLTID soft delete, ALDRIG hard delete!
 */
async function softDeleteMessage(messageId) {
    const pool = getPool();
    const query = `
        UPDATE chat_messages
        SET deleted_at = NOW()
        WHERE id = ? AND deleted_at IS NULL
    `;

    const [result] = await pool.execute(query, [messageId]);
    console.log(`[DB] Soft deleted message ${messageId}`);
    return result.affectedRows > 0;
}

/**
 * Hämtar messages med paginering
 */
async function getMessages(options = {}) {
    const {
        limit = 50,
        offset = 0,
        channel_name = null,
        include_deleted = false
    } = options;

    const pool = getPool();
    let query = `
        SELECT
            id, sender, message_text, timestamp,
            channel_name, thread_id, scrape_run_id,
            deleted_at, created_at
        FROM chat_messages
        WHERE 1=1
    `;

    const params = [];

    if (!include_deleted) {
        query += ' AND deleted_at IS NULL';
    }

    if (channel_name) {
        query += ' AND channel_name = ?';
        params.push(channel_name);
    }

    query += ' ORDER BY timestamp DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    const [rows] = await pool.execute(query, params);
    return rows;
}

/**
 * Söker i meddelanden (fulltext search)
 */
async function searchMessages(searchTerm, limit = 50) {
    const pool = getPool();
    const query = `
        SELECT
            id, sender, message_text, timestamp,
            channel_name, scrape_run_id
        FROM chat_messages
        WHERE MATCH(message_text) AGAINST(? IN NATURAL LANGUAGE MODE)
        AND deleted_at IS NULL
        ORDER BY timestamp DESC
        LIMIT ?
    `;

    const [rows] = await pool.execute(query, [searchTerm, limit]);
    return rows;
}

/**
 * Hämtar runs med paginering
 */
async function getRuns(limit = 20, offset = 0) {
    const pool = getPool();
    const query = `
        SELECT
            id, started_at, completed_at, status,
            profile, headless, message_count,
            log_path, video_path, trace_path
        FROM scrape_runs
        WHERE deleted_at IS NULL
        ORDER BY started_at DESC
        LIMIT ? OFFSET ?
    `;

    const [rows] = await pool.execute(query, [limit, offset]);
    return rows;
}

/**
 * Hämtar specifik run
 */
async function getRunById(runId) {
    const pool = getPool();
    const query = `
        SELECT * FROM scrape_runs WHERE id = ?
    `;

    const [rows] = await pool.execute(query, [runId]);
    return rows[0] || null;
}

module.exports = {
    createScrapeRun,
    updateScrapeRun,
    saveChatMessages,
    getLatestMessageTimestamp,
    softDeleteMessage,
    getMessages,
    searchMessages,
    getRuns,
    getRunById
};
