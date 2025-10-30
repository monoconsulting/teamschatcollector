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
        trace_path,
        log_content
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
            trace_path = COALESCE(?, trace_path),
            log_content = COALESCE(?, log_content)
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
        log_content,
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

    // Säkerställ att limit och offset är integers och safe
    const safeLimit = Math.max(1, Math.min(1000, parseInt(limit) || 50));
    const safeOffset = Math.max(0, parseInt(offset) || 0);

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

    query += ` ORDER BY timestamp DESC LIMIT ${safeLimit} OFFSET ${safeOffset}`;

    const [rows] = params.length > 0
        ? await pool.execute(query, params)
        : await pool.query(query);
    return rows;
}

/**
 * Söker i meddelanden (fulltext search)
 */
async function searchMessages(searchTerm, limit = 50) {
    const pool = getPool();

    // Säkerställ att limit är integer och safe
    const safeLimit = Math.max(1, Math.min(1000, parseInt(limit) || 50));

    const query = `
        SELECT
            id, sender, message_text, timestamp,
            channel_name, scrape_run_id
        FROM chat_messages
        WHERE MATCH(message_text) AGAINST(? IN NATURAL LANGUAGE MODE)
        AND deleted_at IS NULL
        ORDER BY timestamp DESC
        LIMIT ${safeLimit}
    `;

    const [rows] = await pool.execute(query, [searchTerm]);
    return rows;
}

/**
 * Hämtar runs med paginering
 */
async function getRuns(limit = 20, offset = 0) {
    const pool = getPool();

    // Säkerställ att limit och offset är integers och safe
    const safeLimit = Math.max(1, Math.min(1000, parseInt(limit) || 20));
    const safeOffset = Math.max(0, parseInt(offset) || 0);

    const query = `
        SELECT
            id, started_at, completed_at, status,
            profile, headless, message_count,
            log_path, video_path, trace_path
        FROM scrape_runs
        WHERE deleted_at IS NULL
        ORDER BY started_at DESC
        LIMIT ${safeLimit} OFFSET ${safeOffset}
    `;

    const [rows] = await pool.query(query);
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

/**
 * Hämtar alla kanaler med senaste meddelande per kanal
 */
async function getChannels() {
    const pool = getPool();
    const query = `
        SELECT
            channel_name,
            COUNT(*) as message_count,
            MAX(timestamp) as last_message_at,
            (SELECT sender FROM chat_messages cm2
             WHERE cm2.channel_name = cm.channel_name
             AND cm2.deleted_at IS NULL
             ORDER BY cm2.timestamp DESC LIMIT 1) as last_sender,
            (SELECT message_text FROM chat_messages cm3
             WHERE cm3.channel_name = cm.channel_name
             AND cm3.deleted_at IS NULL
             ORDER BY cm3.timestamp DESC LIMIT 1) as last_message
        FROM chat_messages cm
        WHERE deleted_at IS NULL
        GROUP BY channel_name
        ORDER BY last_message_at DESC
    `;

    const [rows] = await pool.query(query);
    return rows;
}

/**
 * TARGET CHATS MANAGEMENT
 */

/**
 * Hämtar alla aktiva target chats för en specifik profil
 */
async function getTargetChats(profile = null) {
    const pool = getPool();
    let query = `
        SELECT
            id, chat_name, chat_type, profile,
            is_active, priority, notes,
            last_scraped_at, total_messages,
            created_at, updated_at
        FROM target_chats
        WHERE deleted_at IS NULL AND is_active = 1
    `;

    const params = [];

    if (profile) {
        query += ' AND profile = ?';
        params.push(profile);
    }

    query += ' ORDER BY priority DESC, chat_name ASC';

    const [rows] = params.length > 0
        ? await pool.execute(query, params)
        : await pool.query(query);
    return rows;
}

/**
 * Hämtar alla target chats (inklusive inaktiva) för admin UI
 */
async function getAllTargetChats() {
    const pool = getPool();
    const query = `
        SELECT
            id, chat_name, chat_type, profile,
            is_active, priority, notes,
            last_scraped_at, total_messages,
            created_at, updated_at
        FROM target_chats
        WHERE deleted_at IS NULL
        ORDER BY is_active DESC, priority DESC, chat_name ASC
    `;

    const [rows] = await pool.query(query);
    return rows;
}

/**
 * Lägger till en ny target chat
 */
async function addTargetChat(data) {
    const pool = getPool();
    const {
        chat_name,
        chat_type = 'channel',
        profile = 'medium',
        is_active = 1,
        priority = 0,
        notes = null
    } = data;

    const query = `
        INSERT INTO target_chats
        (chat_name, chat_type, profile, is_active, priority, notes)
        VALUES (?, ?, ?, ?, ?, ?)
    `;

    try {
        const [result] = await pool.execute(query, [
            chat_name,
            chat_type,
            profile,
            is_active ? 1 : 0,
            priority,
            notes
        ]);

        console.log(`[DB] Added target chat: ${chat_name}`);
        return { id: result.insertId, chat_name };
    } catch (error) {
        if (error.code === 'ER_DUP_ENTRY') {
            throw new Error(`Chat "${chat_name}" already exists`);
        }
        throw error;
    }
}

/**
 * Uppdaterar en target chat
 */
async function updateTargetChat(id, data) {
    const pool = getPool();
    const {
        chat_name,
        chat_type,
        profile,
        is_active,
        priority,
        notes
    } = data;

    const query = `
        UPDATE target_chats
        SET
            chat_name = COALESCE(?, chat_name),
            chat_type = COALESCE(?, chat_type),
            profile = COALESCE(?, profile),
            is_active = COALESCE(?, is_active),
            priority = COALESCE(?, priority),
            notes = COALESCE(?, notes)
        WHERE id = ? AND deleted_at IS NULL
    `;

    const [result] = await pool.execute(query, [
        chat_name,
        chat_type,
        profile,
        is_active !== undefined ? (is_active ? 1 : 0) : null,
        priority,
        notes,
        id
    ]);

    console.log(`[DB] Updated target chat ID: ${id}`);
    return result.affectedRows > 0;
}

/**
 * Uppdaterar scraping metadata för en chat
 */
async function updateTargetChatMetadata(chatName, messageCount) {
    const pool = getPool();
    const query = `
        UPDATE target_chats
        SET
            last_scraped_at = NOW(),
            total_messages = ?
        WHERE chat_name = ? AND deleted_at IS NULL
    `;

    await pool.execute(query, [messageCount, chatName]);
    console.log(`[DB] Updated metadata for chat: ${chatName} (${messageCount} messages)`);
}

/**
 * Soft delete av target chat
 */
async function deleteTargetChat(id) {
    const pool = getPool();
    const query = `
        UPDATE target_chats
        SET deleted_at = NOW()
        WHERE id = ? AND deleted_at IS NULL
    `;

    const [result] = await pool.execute(query, [id]);
    console.log(`[DB] Soft deleted target chat ID: ${id}`);
    return result.affectedRows > 0;
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
    getRunById,
    getChannels,
    getTargetChats,
    getAllTargetChats,
    addTargetChat,
    updateTargetChat,
    updateTargetChatMetadata,
    deleteTargetChat
};
