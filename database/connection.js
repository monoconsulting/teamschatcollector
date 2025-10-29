/**
 * Database Connection Manager
 * Hanterar MySQL connections med connection pooling
 */

const mysql = require('mysql2/promise');
require('dotenv').config();

let pool = null;

/**
 * Skapar eller returnerar existerande connection pool
 */
function getPool() {
    if (pool) {
        return pool;
    }

    pool = mysql.createPool({
        host: process.env.DB_HOST || 'localhost',
        port: process.env.DB_PORT || 3306,
        user: process.env.DB_USER || 'teams_user',
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME || 'teams_collector',
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0,
        enableKeepAlive: true,
        keepAliveInitialDelay: 0
    });

    console.log(`[DB] Connection pool created for ${process.env.DB_HOST}:${process.env.DB_PORT}`);
    return pool;
}

/**
 * Testar database connection
 */
async function testConnection() {
    try {
        const pool = getPool();
        const connection = await pool.getConnection();
        await connection.ping();
        connection.release();
        console.log('[DB] Connection test successful');
        return true;
    } catch (error) {
        console.error('[DB] Connection test failed:', error.message);
        return false;
    }
}

/**
 * Stänger connection pool
 */
async function closePool() {
    if (pool) {
        await pool.end();
        pool = null;
        console.log('[DB] Connection pool closed');
    }
}

module.exports = {
    getPool,
    testConnection,
    closePool
};
