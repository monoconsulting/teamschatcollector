/**
 * Scheduler for Teams Chat Scraper
 *
 * Runs scraper at intervals specified by SCRAPE_INTERVAL_MINUTES env variable.
 * Implements retry with backoff on failures.
 * Creates scrape_runs database records.
 */

const { spawn } = require('child_process');
const fs = require('fs').promises;
const path = require('path');
const mysql = require('mysql2/promise');

// Configuration from environment
const SCRAPE_INTERVAL_MINUTES = parseInt(process.env.SCRAPE_INTERVAL_MINUTES || '30', 10);
const PLAYWRIGHT_PROFILE = process.env.PLAYWRIGHT_PROFILE || 'medium';
const HEADLESS = process.env.HEADLESS === 'true';

// Database configuration
const DB_CONFIG = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '3306', 10),
  user: process.env.DB_USER || 'teamslog',
  password: process.env.DB_PASSWORD || 'teamslog_password',
  database: process.env.DB_NAME || 'teamslog',
};

// Retry configuration
const MAX_RETRIES = 3;
const INITIAL_BACKOFF_MS = 5000;

let dbConnection = null;
let isShuttingDown = false;

/**
 * Initialize database connection
 */
async function initDatabase() {
  try {
    dbConnection = await mysql.createConnection(DB_CONFIG);
    console.log('[Scheduler] Database connection established');
    return true;
  } catch (error) {
    console.error('[Scheduler] Failed to connect to database:', error.message);
    return false;
  }
}

/**
 * Create scrape run record in database
 */
async function createScrapeRun(runId, profile, headless) {
  if (!dbConnection) {
    console.warn('[Scheduler] No database connection, skipping run record creation');
    return;
  }

  try {
    await dbConnection.execute(
      `INSERT INTO scrape_runs (id, started_at, profile, headless, status)
       VALUES (?, NOW(), ?, ?, 'running')`,
      [runId, profile, headless ? 1 : 0]
    );
    console.log(`[Scheduler] Created scrape run record: ${runId}`);
  } catch (error) {
    console.error('[Scheduler] Failed to create scrape run record:', error.message);
  }
}

/**
 * Update scrape run record with completion status
 */
async function updateScrapeRun(runId, status, messageCount = 0, logPath = null, videoPath = null, tracePath = null) {
  if (!dbConnection) {
    console.warn('[Scheduler] No database connection, skipping run record update');
    return;
  }

  try {
    await dbConnection.execute(
      `UPDATE scrape_runs
       SET completed_at = NOW(), status = ?, message_count = ?,
           log_path = ?, video_path = ?, trace_path = ?
       WHERE id = ?`,
      [status, messageCount, logPath, videoPath, tracePath, runId]
    );
    console.log(`[Scheduler] Updated scrape run record: ${runId} - ${status}`);
  } catch (error) {
    console.error('[Scheduler] Failed to update scrape run record:', error.message);
  }
}

/**
 * Generate unique run ID
 */
function generateRunId() {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
  const random = Math.random().toString(36).substring(2, 8);
  return `${timestamp}_${random}`;
}

/**
 * Run scraper script
 */
async function runScraper(profile, retryCount = 0) {
  const runId = generateRunId();
  const scriptPath = path.join(__dirname, `fetch_teams_chat_${profile}.js`);
  const logDir = path.join('/app', 'logs');
  const logPath = path.join(logDir, `${runId}.log`);

  console.log(`[Scheduler] Starting scrape run ${runId} (profile: ${profile}, headless: ${HEADLESS}, retry: ${retryCount})`);

  // Ensure log directory exists
  try {
    await fs.mkdir(logDir, { recursive: true });
  } catch (error) {
    console.error('[Scheduler] Failed to create log directory:', error.message);
  }

  // Create database record
  await createScrapeRun(runId, profile, HEADLESS);

  return new Promise((resolve) => {
    const logStream = require('fs').createWriteStream(logPath, { flags: 'a' });

    const child = spawn('node', [scriptPath], {
      env: {
        ...process.env,
        RUN_ID: runId,
        PLAYWRIGHT_PROFILE: profile,
        HEADLESS: HEADLESS.toString(),
      },
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    // Log stdout and stderr
    child.stdout.on('data', (data) => {
      const message = data.toString();
      process.stdout.write(message);
      logStream.write(message);
    });

    child.stderr.on('data', (data) => {
      const message = data.toString();
      process.stderr.write(message);
      logStream.write(message);
    });

    child.on('close', async (code) => {
      logStream.end();

      const success = code === 0;
      const status = success ? 'success' : 'failed';

      console.log(`[Scheduler] Scrape run ${runId} ${status} (exit code: ${code})`);

      // Try to find output files and count messages
      let messageCount = 0;
      let videoPath = null;
      let tracePath = null;

      try {
        const dataDir = path.join('/app', 'data', 'raw');
        const files = await fs.readdir(dataDir);
        const outputFile = files.find(f => f.includes(runId));

        if (outputFile) {
          const content = await fs.readFile(path.join(dataDir, outputFile), 'utf-8');
          const data = JSON.parse(content);
          messageCount = data.messages ? data.messages.length : 0;
        }

        // Check for video and trace
        const videoDir = path.join('/app', 'data', 'video');
        const traceDir = path.join('/app', 'data', 'trace');

        try {
          const videoFiles = await fs.readdir(videoDir);
          const runVideo = videoFiles.find(f => f.includes(runId));
          if (runVideo) videoPath = path.join(videoDir, runVideo);
        } catch (e) {
          // Video directory might not exist yet
        }

        try {
          const traceFiles = await fs.readdir(traceDir);
          const runTrace = traceFiles.find(f => f.includes(runId));
          if (runTrace) tracePath = path.join(traceDir, runTrace);
        } catch (e) {
          // Trace directory might not exist yet
        }
      } catch (error) {
        console.warn('[Scheduler] Could not read output files:', error.message);
      }

      // Update database record
      await updateScrapeRun(runId, status, messageCount, logPath, videoPath, tracePath);

      // Handle retry on failure
      if (!success && retryCount < MAX_RETRIES) {
        const backoffMs = INITIAL_BACKOFF_MS * Math.pow(2, retryCount);
        console.log(`[Scheduler] Retrying in ${backoffMs}ms (attempt ${retryCount + 1}/${MAX_RETRIES})`);

        setTimeout(() => {
          runScraper(profile, retryCount + 1).then(resolve);
        }, backoffMs);
      } else {
        resolve({ success, runId, messageCount });
      }
    });

    child.on('error', async (error) => {
      console.error('[Scheduler] Failed to spawn scraper process:', error.message);
      logStream.end();
      await updateScrapeRun(runId, 'failed', 0, logPath, null, null);

      // Retry on spawn error
      if (retryCount < MAX_RETRIES) {
        const backoffMs = INITIAL_BACKOFF_MS * Math.pow(2, retryCount);
        console.log(`[Scheduler] Retrying in ${backoffMs}ms (attempt ${retryCount + 1}/${MAX_RETRIES})`);

        setTimeout(() => {
          runScraper(profile, retryCount + 1).then(resolve);
        }, backoffMs);
      } else {
        resolve({ success: false, runId, messageCount: 0 });
      }
    });
  });
}

/**
 * Schedule recurring scrapes
 */
async function startScheduler() {
  console.log('[Scheduler] Starting Teams Chat Scraper Scheduler');
  console.log(`[Scheduler] Configuration:`);
  console.log(`  - Interval: ${SCRAPE_INTERVAL_MINUTES} minutes`);
  console.log(`  - Profile: ${PLAYWRIGHT_PROFILE}`);
  console.log(`  - Headless: ${HEADLESS}`);

  // Initialize database
  const dbConnected = await initDatabase();
  if (!dbConnected) {
    console.warn('[Scheduler] Running without database connection');
  }

  // Run initial scrape
  console.log('[Scheduler] Running initial scrape...');
  const result = await runScraper(PLAYWRIGHT_PROFILE);
  console.log('[Scheduler] Initial scrape completed:', result);

  // Schedule recurring scrapes
  const intervalMs = SCRAPE_INTERVAL_MINUTES * 60 * 1000;
  const intervalId = setInterval(async () => {
    if (isShuttingDown) {
      clearInterval(intervalId);
      return;
    }

    console.log('[Scheduler] Running scheduled scrape...');
    const result = await runScraper(PLAYWRIGHT_PROFILE);
    console.log('[Scheduler] Scheduled scrape completed:', result);
  }, intervalMs);

  console.log(`[Scheduler] Scheduler started, next run in ${SCRAPE_INTERVAL_MINUTES} minutes`);
}

/**
 * Graceful shutdown handler
 */
async function shutdown() {
  if (isShuttingDown) return;

  isShuttingDown = true;
  console.log('[Scheduler] Shutting down gracefully...');

  if (dbConnection) {
    try {
      await dbConnection.end();
      console.log('[Scheduler] Database connection closed');
    } catch (error) {
      console.error('[Scheduler] Error closing database connection:', error.message);
    }
  }

  process.exit(0);
}

// Register shutdown handlers
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

// Start scheduler
startScheduler().catch((error) => {
  console.error('[Scheduler] Fatal error:', error);
  process.exit(1);
});
