# TEAMS COLLECTOR - DETALJERAD INFÖRANDEPLAN

**Version:** 1.0  
**Datum:** 2025-10-29  
**Projektnamn:** MS Teams Chat Collector  
**Target:** Kodagent implementation

---

## 🚨 KRITISKA REGLER SOM ALLTID GÄLLER

### ❌ ABSOLUT FÖRBJUDET:
- **ALDRIG ändra portar** (3040→3000 är fastställda)
- **ALDRIG använda taskkill** eller döda processer på upptagna portar
- **ALDRIG använda SQLite** - Endast MySQL tillåts
- **ALDRIG mock data** utan explicit order
- **ALDRIG filnamn med åäö** eller icke-standard tecken
- **ALDRIG redigera utan tillåtelse:**
  - `docker-compose.yml`
  - `.env` filer
  - `playwright.config.ts`

### ✅ KRAV:
- **ALLTID läs instruerade filer** innan du startar
- **ALLTID soft delete** i databas (aldrig hard delete)
- **ALLTID fråga** innan du ändrar kritiska konfigurationsfiler
- **ALLTID kontrollera** `docker ps` innan du påstår att något inte fungerar

---

## 📋 ÖVERSIKT AV FASER

1. **Phase 1:** Projektstruktur och grundläggande setup
2. **Phase 2:** Database setup (MySQL)
3. **Phase 3:** Docker konfiguration
4. **Phase 4:** Playwright setup och profiler
5. **Phase 5:** Scraper implementation
6. **Phase 6:** Web API/UI (Express)
7. **Phase 7:** Scheduler och automation
8. **Phase 8:** Batch scripts (.bat filer)
9. **Phase 9:** Testing och verifiering

---

# PHASE 1: PROJEKTSTRUKTUR OCH GRUNDLÄGGANDE SETUP

## Task 1.1: Skapa projektets mappstruktur

### Subtask 1.1.1: Skapa root-struktur
- [x] Skapa projektets root-mapp: `teams-collector/`
- [x] Navigera till projektmappen

```bash
mkdir teams-collector
cd teams-collector
```

### Subtask 1.1.2: Skapa huvudmappar
- [x] Skapa följande mappar i root:

```bash
mkdir -p playwright/scripts
mkdir -p playwright/recorded
mkdir -p playwright/utils
mkdir -p database
mkdir -p web
mkdir -p scripts
mkdir -p data/raw
mkdir -p data/video
mkdir -p data/trace
mkdir -p logs
mkdir -p browser_context
mkdir -p docs
```

**Förklaring av mappstruktur:**
- `playwright/scripts/` - Konverterade produktionsskript
- `playwright/recorded/` - Inspelade codegen-skript
- `playwright/utils/` - Hjälpfunktioner
- `database/` - SQL-schema och migrations
- `web/` - Express API och UI
- `scripts/` - .bat filer för Windows
- `data/` - Lagrade JSON, video, traces
- `logs/` - Loggfiler från körningar
- `browser_context/` - Persistent Chromium session
- `docs/` - Dokumentation

### Subtask 1.1.3: Verifiera struktur
- [x] Lista alla skapade mappar:

```bash
tree -L 2 -d
# eller på Windows:
dir /s /b /ad
```

**⚠️ VIKTIGT:** Kontrollera att INGA mappar innehåller åäö i sina namn.

---

## Task 1.2: Initiera Node.js projekt

### Subtask 1.2.1: Skapa root package.json
- [x] Skapa `package.json` i projektets root:

```json
{
  "name": "teams-collector",
  "version": "1.0.0",
  "description": "MS Teams Chat Collector via Playwright",
  "main": "index.js",
  "scripts": {
    "test": "echo \"No tests yet\"",
    "scrape:small": "set PLAYWRIGHT_PROFILE=small&& node playwright/scripts/fetch_teams_chat_small.js",
    "scrape:medium": "set PLAYWRIGHT_PROFILE=medium&& node playwright/scripts/fetch_teams_chat_medium.js",
    "scrape:large": "set PLAYWRIGHT_PROFILE=large&& node playwright/scripts/fetch_teams_chat_large.js"
  },
  "keywords": ["teams", "scraper", "playwright"],
  "author": "Mattias Cederlund",
  "license": "ISC",
  "dependencies": {
    "playwright": "^1.47.0",
    "mysql2": "^3.6.5",
    "dotenv": "^16.3.1",
    "node-cron": "^3.0.3",
    "winston": "^3.11.0"
  },
  "devDependencies": {
    "@playwright/test": "^1.47.0",
    "@types/node": "^20.10.0",
    "typescript": "^5.3.3"
  }
}
```

### Subtask 1.2.2: Installera dependencies
- [x] Kör npm install:

```bash
npm install
```

**⚠️ OBS:** Om installationen misslyckas, kontrollera nätverksanslutning. FRÅGA innan du ändrar något i package.json.

### Subtask 1.2.3: Skapa web/package.json
- [x] Skapa separat `web/package.json` för API:

```json
{
  "name": "teams-collector-api",
  "version": "1.0.0",
  "description": "Web API for Teams Collector",
  "main": "server.js",
  "scripts": {
    "start": "node server.js",
    "dev": "nodemon server.js"
  },
  "dependencies": {
    "express": "^4.18.2",
    "mysql2": "^3.6.5",
    "dotenv": "^16.3.1",
    "cors": "^2.8.5"
  },
  "devDependencies": {
    "nodemon": "^3.0.2"
  }
}
```

---

## Task 1.3: Skapa .env fil

### Subtask 1.3.1: Skapa .env i root
- [x] Skapa `.env` fil med EXAKT denna innehåll:

```env
# ---- Ports (ÄNDRA ALDRIG!) ----
PUBLIC_PORT=3040
INTERNAL_PORT=3000

# ---- Playwright ----
TEAMS_URL=https://teams.microsoft.com
HEADLESS=true
PLAYWRIGHT_PROFILE=medium
USER_DATA_DIR=/app/browser_context

# ---- Database (MySQL) ----
DB_HOST=db
DB_PORT=3306
DB_NAME=teams_collector
DB_USER=teams_user
DB_PASSWORD=SecurePassword123!
MYSQL_ROOT_PASSWORD=RootPassword456!

# ---- Scheduler ----
SCRAPE_INTERVAL_MINUTES=15

# ---- Profile Sizes ----
PROFILE_SMALL_W=1280
PROFILE_SMALL_H=720
PROFILE_MEDIUM_W=1600
PROFILE_MEDIUM_H=900
PROFILE_LARGE_W=1920
PROFILE_LARGE_H=1080
```

**🔒 KRITISKT:**
- **ÄNDRA ALDRIG PUBLIC_PORT=3040 eller INTERNAL_PORT=3000**
- Om något inte fungerar med portar: KONTROLLERA .env och docker-compose.yml
- Om port 3040 är upptagen: **FRÅGA OM TILLÅTELSE** innan du ändrar
- Använd ALDRIG taskkill för att frigöra portar

### Subtask 1.3.2: Skapa .env.example
- [x] Kopiera .env till .env.example (utan känsliga lösenord)
- [x] Ersätt lösenord med "CHANGE_ME"

### Subtask 1.3.3: Lägg till .gitignore
- [x] Skapa `.gitignore`:

```gitignore
# Environment
.env

# Dependencies
node_modules/
web/node_modules/

# Data och logs
data/
logs/
browser_context/

# OS
.DS_Store
Thumbs.db

# IDE
.vscode/
.idea/
*.swp
*.swo
```

---

# PHASE 2: DATABASE SETUP (MySQL)

## Task 2.1: Skapa SQL schema

### Subtask 2.1.1: Skapa schema.sql
- [x] Skapa `database/schema.sql`:

```sql
-- Teams Collector Database Schema
-- Version: 1.0
-- OBSERVERA: Endast soft delete tillåts!

CREATE DATABASE IF NOT EXISTS teams_collector 
CHARACTER SET utf8mb4 
COLLATE utf8mb4_unicode_ci;

USE teams_collector;

-- Table: chat_messages
-- Lagrar individuella chat-meddelanden
CREATE TABLE IF NOT EXISTS chat_messages (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    sender VARCHAR(255) NOT NULL,
    message_text LONGTEXT NOT NULL,
    timestamp DATETIME NOT NULL,
    channel_name VARCHAR(255),
    thread_id VARCHAR(255) DEFAULT NULL,
    scrape_run_id VARCHAR(64) NOT NULL,
    raw_json JSON DEFAULT NULL,
    
    -- Soft delete support (ALDRIG hard delete!)
    deleted_at DATETIME DEFAULT NULL,
    
    -- Metadata
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    -- Indexes för performance
    INDEX idx_scrape_run (scrape_run_id),
    INDEX idx_timestamp (timestamp),
    INDEX idx_channel (channel_name),
    INDEX idx_sender (sender),
    INDEX idx_deleted (deleted_at),
    
    -- Fulltext search
    FULLTEXT INDEX idx_message_search (message_text)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table: scrape_runs
-- Lagrar metadata om varje scraping-körning
CREATE TABLE IF NOT EXISTS scrape_runs (
    id VARCHAR(64) PRIMARY KEY,
    started_at DATETIME NOT NULL,
    completed_at DATETIME DEFAULT NULL,
    status ENUM('running', 'success', 'failed') NOT NULL DEFAULT 'running',
    profile ENUM('small', 'medium', 'large') NOT NULL DEFAULT 'medium',
    headless TINYINT(1) NOT NULL DEFAULT 1,
    message_count INT DEFAULT 0,
    error_message TEXT DEFAULT NULL,
    
    -- Artifact paths
    log_path VARCHAR(512),
    video_path VARCHAR(512),
    trace_path VARCHAR(512),
    
    -- Soft delete support
    deleted_at DATETIME DEFAULT NULL,
    
    -- Metadata
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_started (started_at),
    INDEX idx_status (status),
    INDEX idx_profile (profile)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table: scrape_errors
-- Loggar errors för debugging
CREATE TABLE IF NOT EXISTS scrape_errors (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    scrape_run_id VARCHAR(64),
    error_type VARCHAR(100),
    error_message TEXT,
    stack_trace TEXT,
    occurred_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (scrape_run_id) REFERENCES scrape_runs(id),
    INDEX idx_run (scrape_run_id),
    INDEX idx_occurred (occurred_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

**🔒 VIKTIGT om soft delete:**
```sql
-- Exempel på soft delete (KORREKT)
UPDATE chat_messages 
SET deleted_at = NOW() 
WHERE id = 123;

-- Exempel på hard delete (FÖRBJUDET!)
-- DELETE FROM chat_messages WHERE id = 123;  ❌ ALDRIG!
```

### Subtask 2.1.2: Skapa init script
- [x] Skapa `database/init.sql`:

```sql
-- Initial setup script
-- Körs automatiskt när MySQL container startar första gången

SOURCE /docker-entrypoint-initdb.d/schema.sql;

-- Skapa användare med rätt behörigheter
CREATE USER IF NOT EXISTS 'teams_user'@'%' IDENTIFIED BY 'SecurePassword123!';
GRANT ALL PRIVILEGES ON teams_collector.* TO 'teams_user'@'%';
FLUSH PRIVILEGES;

-- Verifiera
SELECT 'Database setup completed successfully!' as status;
```

### Subtask 2.1.3: Skapa migrations-mapp
- [x] Skapa `database/migrations/` för framtida uppdateringar:

```bash
mkdir -p database/migrations
```

---

## Task 2.2: Skapa database utilities

### Subtask 2.2.1: Skapa database connection utility
- [x] Skapa `database/connection.js`:

```javascript
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
```

### Subtask 2.2.2: Skapa database operations
- [x] Skapa `database/operations.js`:

```javascript
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
 * Sparar chat messages (batch insert)
 */
async function saveChatMessages(messages, scrapeRunId) {
    if (!messages || messages.length === 0) {
        return 0;
    }

    const pool = getPool();
    const query = `
        INSERT INTO chat_messages 
        (sender, message_text, timestamp, channel_name, thread_id, scrape_run_id, raw_json)
        VALUES ?
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
    console.log(`[DB] Saved ${result.affectedRows} messages for run ${scrapeRunId}`);
    return result.affectedRows;
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
    softDeleteMessage,
    getMessages,
    searchMessages,
    getRuns,
    getRunById
};
```

---

# PHASE 3: DOCKER KONFIGURATION

## Task 3.1: Skapa Docker Compose

### Subtask 3.1.1: Läs existerande docker-compose.yml
- [ ] **VIKTIGT:** Kontrollera om `docker-compose.yml` redan finns:

```bash
# Om filen finns - LÄSE DEN FÖRST!
type docker-compose.yml
# eller
cat docker-compose.yml
```

**⚠️ KRITISK REGEL:** Om `docker-compose.yml` finns - **FRÅGA OM TILLÅTELSE** innan du ändrar!

### Subtask 3.1.2: Skapa docker-compose.yml (om den inte finns)
- [ ] Skapa `docker-compose.yml` med EXAKT denna konfiguration:

```yaml
version: '3.8'

services:
  # MySQL Database
  db:
    image: mysql:8.0
    container_name: teams_collector_db
    restart: unless-stopped
    environment:
      MYSQL_ROOT_PASSWORD: ${MYSQL_ROOT_PASSWORD}
      MYSQL_DATABASE: ${DB_NAME}
      MYSQL_USER: ${DB_USER}
      MYSQL_PASSWORD: ${DB_PASSWORD}
    ports:
      # ⚠️ ÄNDRA ALDRIG DENNA PORT UTAN TILLÅTELSE!
      - "3306:3306"
    volumes:
      - db_data:/var/lib/mysql
      - ./database/schema.sql:/docker-entrypoint-initdb.d/schema.sql:ro
      - ./database/init.sql:/docker-entrypoint-initdb.d/init.sql:ro
    healthcheck:
      test: ["CMD", "mysqladmin", "ping", "-h", "localhost", "-u", "root", "-p${MYSQL_ROOT_PASSWORD}"]
      interval: 10s
      timeout: 5s
      retries: 5
    networks:
      - teams_network

  # Web API/UI
  api:
    build:
      context: .
      dockerfile: Dockerfile.api
    container_name: teams_collector_api
    restart: unless-stopped
    environment:
      # ⚠️ DESSA PORTAR ÄR FASTSTÄLLDA - ÄNDRA ALDRIG!
      PORT: ${INTERNAL_PORT}
      DB_HOST: db
      DB_PORT: ${DB_PORT}
      DB_NAME: ${DB_NAME}
      DB_USER: ${DB_USER}
      DB_PASSWORD: ${DB_PASSWORD}
    ports:
      # ⚠️ KRITISKT: 3040 (public) → 3000 (internal)
      - "${PUBLIC_PORT}:${INTERNAL_PORT}"
    depends_on:
      db:
        condition: service_healthy
    volumes:
      - ./web:/app:ro
      - ./data:/app/data:ro
      - ./logs:/app/logs:ro
    networks:
      - teams_network

  # Playwright Scraper
  scraper:
    build:
      context: .
      dockerfile: Dockerfile.scraper
    container_name: teams_collector_scraper
    restart: unless-stopped
    environment:
      TEAMS_URL: ${TEAMS_URL}
      HEADLESS: ${HEADLESS}
      PLAYWRIGHT_PROFILE: ${PLAYWRIGHT_PROFILE}
      USER_DATA_DIR: ${USER_DATA_DIR}
      DB_HOST: db
      DB_PORT: ${DB_PORT}
      DB_NAME: ${DB_NAME}
      DB_USER: ${DB_USER}
      DB_PASSWORD: ${DB_PASSWORD}
      SCRAPE_INTERVAL_MINUTES: ${SCRAPE_INTERVAL_MINUTES}
      PROFILE_SMALL_W: ${PROFILE_SMALL_W}
      PROFILE_SMALL_H: ${PROFILE_SMALL_H}
      PROFILE_MEDIUM_W: ${PROFILE_MEDIUM_W}
      PROFILE_MEDIUM_H: ${PROFILE_MEDIUM_H}
      PROFILE_LARGE_W: ${PROFILE_LARGE_W}
      PROFILE_LARGE_H: ${PROFILE_LARGE_H}
    depends_on:
      db:
        condition: service_healthy
    volumes:
      - ./playwright:/app/playwright
      - ./database:/app/database
      - ./data:/app/data
      - ./logs:/app/logs
      - ./browser_context:/app/browser_context
    networks:
      - teams_network
    # OBS: Exponera INTE portar för scraper om inte nödvändigt

volumes:
  db_data:
    driver: local

networks:
  teams_network:
    driver: bridge
```

**🔒 PORT-REGLER:**
```
PUBLIC (Host) → INTERNAL (Container)
3040          → 3000             [API/UI]
3306          → 3306             [MySQL]

ALDRIG ändra dessa utan explicit tillåtelse!
```

---

## Task 3.2: Skapa Dockerfiles

### Subtask 3.2.1: Skapa Dockerfile.scraper
- [ ] Skapa `Dockerfile.scraper`:

```dockerfile
# Playwright Scraper Container
# Baserad på officiell Playwright image med Chromium

FROM mcr.microsoft.com/playwright:v1.47.0-jammy

# Sätt arbetskatalog
WORKDIR /app

# Kopiera package files
COPY package*.json ./

# Installera dependencies
RUN npm ci --only=production

# Kopiera application kod
COPY playwright ./playwright
COPY database ./database

# Skapa nödvändiga directories
RUN mkdir -p /app/data/raw \
    /app/data/video \
    /app/data/trace \
    /app/logs \
    /app/browser_context \
    && chmod -R 777 /app/data /app/logs /app/browser_context

# Environment
ENV NODE_ENV=production
ENV PLAYWRIGHT_BROWSERS_PATH=/ms-playwright

# Health check
HEALTHCHECK --interval=60s --timeout=10s --start-period=40s --retries=3 \
    CMD node -e "require('./database/connection').testConnection().then(ok => process.exit(ok ? 0 : 1))" || exit 1

# Default command - startar scheduler
CMD ["node", "playwright/scripts/scheduler.js"]
```

### Subtask 3.2.2: Skapa Dockerfile.api
- [ ] Skapa `Dockerfile.api`:

```dockerfile
# Web API Container
# Lightweight Node.js för Express server

FROM node:20-alpine

# Sätt arbetskatalog
WORKDIR /app

# Kopiera package files
COPY web/package*.json ./

# Installera dependencies
RUN npm ci --only=production

# Kopiera application kod
COPY web ./

# Skapa user för säkerhet
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001 && \
    chown -R nodejs:nodejs /app

USER nodejs

# ⚠️ PORT 3000 är FASTSTÄLLD - ändra inte!
ENV PORT=3000
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD node -e "require('http').get('http://localhost:3000/health', (r) => r.statusCode === 200 ? process.exit(0) : process.exit(1))"

# Start server
CMD ["node", "server.js"]
```

### Subtask 3.2.3: Skapa .dockerignore
- [ ] Skapa `.dockerignore`:

```
# Dependencies
node_modules
web/node_modules
npm-debug.log

# Environment
.env
.env.*

# Data och logs
data/
logs/
browser_context/

# Git
.git
.gitignore

# Documentation
docs/
*.md

# IDE
.vscode
.idea

# OS
.DS_Store
Thumbs.db

# Temporary
*.tmp
*.log
*.swp
```

---

# PHASE 4: PLAYWRIGHT SETUP OCH PROFILER

## Task 4.1: Skapa Playwright konfiguration

### Subtask 4.1.1: Läs existerande playwright.config.ts
- [ ] **VIKTIGT:** Kontrollera om filen finns:

```bash
type playwright/playwright.config.ts
```

**⚠️ Om filen finns:** FRÅGA OM TILLÅTELSE innan du ändrar!

### Subtask 4.1.2: Skapa playwright.config.ts (om den inte finns)
- [ ] Skapa `playwright/playwright.config.ts`:

```typescript
/**
 * Playwright Configuration
 * Hanterar tre profiler: small, medium, large
 * Stöder headless/headed mode via env
 * ALLTID spelar in screenshots, video, och trace
 */

import { defineConfig, devices } from '@playwright/test';
import * as dotenv from 'dotenv';

// Ladda environment variables
dotenv.config();

// Hämta konfiguration från env
const headless = process.env.HEADLESS === 'true';
const profile = process.env.PLAYWRIGHT_PROFILE || 'medium';

// Profile size definitions
interface ProfileSize {
    width: number;
    height: number;
}

const profiles: Record<string, ProfileSize> = {
    small: {
        width: Number(process.env.PROFILE_SMALL_W) || 1280,
        height: Number(process.env.PROFILE_SMALL_H) || 720,
    },
    medium: {
        width: Number(process.env.PROFILE_MEDIUM_W) || 1600,
        height: Number(process.env.PROFILE_MEDIUM_H) || 900,
    },
    large: {
        width: Number(process.env.PROFILE_LARGE_W) || 1920,
        height: Number(process.env.PROFILE_LARGE_H) || 1080,
    },
};

// Välj rätt profil
const selectedProfile = profiles[profile] || profiles.medium;

console.log(`[Playwright Config] Profile: ${profile}, Headless: ${headless}`);
console.log(`[Playwright Config] Viewport: ${selectedProfile.width}x${selectedProfile.height}`);

export default defineConfig({
    testDir: './scripts',
    
    // Timeout settings
    timeout: 5 * 60 * 1000, // 5 minuter per test
    expect: {
        timeout: 10000 // 10 sekunder för assertions
    },

    // Parallellisering
    fullyParallel: false,
    forbidOnly: !!process.env.CI,
    retries: process.env.CI ? 2 : 0,
    workers: 1, // Endast en worker för att undvika race conditions

    // Reporter
    reporter: [
        ['list'],
        ['json', { outputFile: '../logs/test-results.json' }]
    ],

    // Shared settings för alla tests
    use: {
        // Base URL
        baseURL: process.env.TEAMS_URL || 'https://teams.microsoft.com',

        // Headless mode från env
        headless: headless,

        // Viewport baserat på profil
        viewport: selectedProfile,

        // ⚠️ KRITISKT: ALLTID spela in artifacts
        screenshot: 'on',  // Alltid ta screenshots
        video: 'on',       // Alltid spela in video
        trace: 'on',       // Alltid spara trace med snapshots

        // Browser context options
        ignoreHTTPSErrors: true,
        
        // Timeouts
        actionTimeout: 30000,
        navigationTimeout: 60000,

        // Persistent context för att behålla sessions
        storageState: process.env.USER_DATA_DIR 
            ? `${process.env.USER_DATA_DIR}/state.json` 
            : undefined,
    },

    // Projects (profiler)
    projects: [
        {
            name: 'small',
            use: { 
                ...devices['Desktop Chrome'],
                viewport: profiles.small,
            },
        },
        {
            name: 'medium',
            use: { 
                ...devices['Desktop Chrome'],
                viewport: profiles.medium,
            },
        },
        {
            name: 'large',
            use: { 
                ...devices['Desktop Chrome'],
                viewport: profiles.large,
            },
        },
    ],
});
```

### Subtask 4.1.3: Skapa tsconfig.json
- [ ] Skapa `playwright/tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "lib": ["ES2020"],
    "outDir": "./dist",
    "rootDir": "./",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "types": ["node", "@playwright/test"]
  },
  "include": [
    "**/*.ts"
  ],
  "exclude": [
    "node_modules",
    "dist",
    "recorded"
  ]
}
```

---

## Task 4.2: Skapa utility funktioner

### Subtask 4.2.1: Skapa logger utility
- [ ] Skapa `playwright/utils/logger.js`:

```javascript
/**
 * Logger Utility
 * Strukturerad loggning med Winston
 */

const winston = require('winston');
const path = require('path');
const fs = require('fs');

// Säkerställ att logs-mappen finns
const logsDir = path.join(__dirname, '../../logs');
if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
}

/**
 * Skapar en logger för specifik run
 */
function createLogger(runId) {
    const logFile = path.join(logsDir, `${runId}.log`);

    const logger = winston.createLogger({
        level: 'info',
        format: winston.format.combine(
            winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
            winston.format.errors({ stack: true }),
            winston.format.splat(),
            winston.format.json()
        ),
        defaultMeta: { runId },
        transports: [
            // File transport
            new winston.transports.File({ 
                filename: logFile,
                maxsize: 10485760, // 10MB
                maxFiles: 5
            }),
            // Console transport
            new winston.transports.Console({
                format: winston.format.combine(
                    winston.format.colorize(),
                    winston.format.printf(({ timestamp, level, message, runId, ...meta }) => {
                        let msg = `${timestamp} [${runId}] ${level}: ${message}`;
                        if (Object.keys(meta).length > 0) {
                            msg += ` ${JSON.stringify(meta)}`;
                        }
                        return msg;
                    })
                )
            })
        ]
    });

    logger.logPath = logFile;
    return logger;
}

module.exports = { createLogger };
```

### Subtask 4.2.2: Skapa profile utility
- [ ] Skapa `playwright/utils/profiles.js`:

```javascript
/**
 * Profile Management
 * Hanterar de tre profiler: small, medium, large
 */

require('dotenv').config();

const profiles = {
    small: {
        name: 'small',
        width: parseInt(process.env.PROFILE_SMALL_W) || 1280,
        height: parseInt(process.env.PROFILE_SMALL_H) || 720,
        deviceScaleFactor: 1,
    },
    medium: {
        name: 'medium',
        width: parseInt(process.env.PROFILE_MEDIUM_W) || 1600,
        height: parseInt(process.env.PROFILE_MEDIUM_H) || 900,
        deviceScaleFactor: 1,
    },
    large: {
        name: 'large',
        width: parseInt(process.env.PROFILE_LARGE_W) || 1920,
        height: parseInt(process.env.PROFILE_LARGE_H) || 1080,
        deviceScaleFactor: 1,
    }
};

/**
 * Hämtar profil-konfiguration
 */
function getProfile(profileName = null) {
    const name = profileName || process.env.PLAYWRIGHT_PROFILE || 'medium';
    
    if (!profiles[name]) {
        console.warn(`[Profile] Unknown profile '${name}', falling back to 'medium'`);
        return profiles.medium;
    }

    return profiles[name];
}

/**
 * Får alla tillgängliga profiler
 */
function getAllProfiles() {
    return Object.keys(profiles);
}

/**
 * Validerar profil namn
 */
function isValidProfile(profileName) {
    return profiles.hasOwnProperty(profileName);
}

module.exports = {
    getProfile,
    getAllProfiles,
    isValidProfile,
    profiles
};
```

### Subtask 4.2.3: Skapa artifact utility
- [ ] Skapa `playwright/utils/artifacts.js`:

```javascript
/**
 * Artifact Management
 * Hanterar screenshots, video, och trace artifacts
 */

const path = require('path');
const fs = require('fs');

/**
 * Skapar artifact-strukturen för en run
 */
function createArtifactPaths(runId) {
    const basePath = path.join(__dirname, '../../data');
    
    const paths = {
        video: path.join(basePath, 'video', runId),
        trace: path.join(basePath, 'trace'),
        screenshots: path.join(basePath, 'screenshots', runId),
        raw: path.join(basePath, 'raw')
    };

    // Skapa alla directories
    Object.values(paths).forEach(dir => {
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
    });

    return {
        videoDir: paths.video,
        traceFile: path.join(paths.trace, `${runId}.zip`),
        screenshotDir: paths.screenshots,
        jsonFile: path.join(paths.raw, `${runId}.json`)
    };
}

/**
 * Browser context options med artifacts ALLTID aktiverade
 */
function getBrowserContextOptions(runId, profile) {
    const artifacts = createArtifactPaths(runId);
    
    const headless = process.env.HEADLESS === 'true';
    
    return {
        viewport: {
            width: profile.width,
            height: profile.height
        },
        deviceScaleFactor: profile.deviceScaleFactor || 1,
        
        // ⚠️ KRITISKT: ALLTID spela in artifacts
        recordVideo: {
            dir: artifacts.videoDir,
            size: {
                width: profile.width,
                height: profile.height
            }
        },
        
        // Storage state för persistent session
        storageState: process.env.USER_DATA_DIR 
            ? path.join(process.env.USER_DATA_DIR, 'state.json')
            : undefined,
        
        // Andra options
        ignoreHTTPSErrors: true,
        javaScriptEnabled: true,
        
        headless: headless
    };
}

/**
 * Sparar JSON data
 */
function saveJsonData(runId, data) {
    const artifacts = createArtifactPaths(runId);
    fs.writeFileSync(
        artifacts.jsonFile,
        JSON.stringify(data, null, 2),
        'utf-8'
    );
    return artifacts.jsonFile;
}

/**
 * Får relativa paths för DB storage
 */
function getRelativePaths(runId) {
    return {
        log_path: `/logs/${runId}.log`,
        video_path: `/data/video/${runId}/`,
        trace_path: `/data/trace/${runId}.zip`
    };
}

module.exports = {
    createArtifactPaths,
    getBrowserContextOptions,
    saveJsonData,
    getRelativePaths
};
```

---

# PHASE 5: SCRAPER IMPLEMENTATION

## Task 5.1: Skapa base scraper template

### Subtask 5.1.1: Skapa base scraper
- [ ] Skapa `playwright/scripts/base_scraper.js`:

```javascript
/**
 * Base Scraper Template
 * Grundläggande struktur som alla profile-specifika scrapers ärver
 * 
 * VIKTIGT: Detta är en template - konkreta scrapers ska konverteras från codegen
 */

const { chromium } = require('playwright');
const path = require('path');
const { createLogger } = require('../utils/logger');
const { getProfile } = require('../utils/profiles');
const { 
    getBrowserContextOptions, 
    saveJsonData, 
    getRelativePaths 
} = require('../utils/artifacts');
const {
    createScrapeRun,
    updateScrapeRun,
    saveChatMessages
} = require('../../database/operations');

class BaseScraper {
    constructor(profileName) {
        this.profileName = profileName;
        this.profile = getProfile(profileName);
        this.runId = this.generateRunId();
        this.logger = createLogger(this.runId);
        this.browser = null;
        this.context = null;
        this.page = null;
        this.messages = [];
    }

    /**
     * Genererar unikt run ID
     */
    generateRunId() {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        return `run_${this.profileName}_${timestamp}`;
    }

    /**
     * Initierar scraping session
     */
    async initialize() {
        try {
            this.logger.info('Initializing scraper', { 
                profile: this.profileName,
                headless: process.env.HEADLESS 
            });

            // Skapa scrape run i DB
            await createScrapeRun(
                this.runId,
                this.profileName,
                process.env.HEADLESS === 'true'
            );

            // Starta browser
            this.browser = await chromium.launch({
                headless: process.env.HEADLESS === 'true',
                args: [
                    '--no-sandbox',
                    '--disable-setuid-sandbox',
                    '--disable-dev-shm-usage',
                    '--disable-blink-features=AutomationControlled'
                ]
            });

            // Skapa context med artifacts
            const contextOptions = getBrowserContextOptions(this.runId, this.profile);
            this.context = await this.browser.newContext(contextOptions);

            // Starta trace recording
            await this.context.tracing.start({ 
                screenshots: true, 
                snapshots: true 
            });

            // Skapa page
            this.page = await this.context.newPage();

            // Sätt timeout
            this.page.setDefaultTimeout(60000);
            this.page.setDefaultNavigationTimeout(60000);

            this.logger.info('Scraper initialized successfully');
            return true;

        } catch (error) {
            this.logger.error('Failed to initialize scraper', { 
                error: error.message,
                stack: error.stack 
            });
            await this.handleError(error);
            return false;
        }
    }

    /**
     * Navigerar till Teams
     */
    async navigateToTeams() {
        try {
            const teamsUrl = process.env.TEAMS_URL || 'https://teams.microsoft.com';
            this.logger.info(`Navigating to ${teamsUrl}`);
            
            await this.page.goto(teamsUrl, { 
                waitUntil: 'networkidle',
                timeout: 90000 
            });

            // Vänta på att sidan laddats
            await this.page.waitForLoadState('domcontentloaded');
            
            this.logger.info('Navigation successful');
            return true;

        } catch (error) {
            this.logger.error('Navigation failed', { error: error.message });
            throw error;
        }
    }

    /**
     * Extraherar messages från page
     * OBS: Denna metod måste implementeras av konkreta scrapers
     */
    async extractMessages() {
        throw new Error('extractMessages() must be implemented by concrete scraper');
    }

    /**
     * Scrollar för att ladda fler meddelanden
     */
    async scrollToLoadMore(selector, maxScrolls = 10) {
        this.logger.info(`Scrolling to load more messages, max ${maxScrolls} times`);
        
        let scrollCount = 0;
        let previousHeight = 0;

        while (scrollCount < maxScrolls) {
            // Scrolla till toppen
            await this.page.evaluate((sel) => {
                const element = document.querySelector(sel);
                if (element) {
                    element.scrollTop = 0;
                }
            }, selector);

            // Vänta på att nya meddelanden laddas
            await this.page.waitForTimeout(2000);

            // Kolla om ny content laddades
            const currentHeight = await this.page.evaluate((sel) => {
                const element = document.querySelector(sel);
                return element ? element.scrollHeight : 0;
            }, selector);

            if (currentHeight === previousHeight) {
                this.logger.info('No more messages to load');
                break;
            }

            previousHeight = currentHeight;
            scrollCount++;
            
            this.logger.info(`Scroll ${scrollCount}/${maxScrolls} completed`);
        }

        return scrollCount;
    }

    /**
     * Sparar resultat
     */
    async saveResults() {
        try {
            this.logger.info(`Saving ${this.messages.length} messages`);

            // Spara till JSON
            const jsonPath = saveJsonData(this.runId, {
                runId: this.runId,
                profile: this.profileName,
                timestamp: new Date().toISOString(),
                messageCount: this.messages.length,
                messages: this.messages
            });

            // Spara till DB
            if (this.messages.length > 0) {
                await saveChatMessages(this.messages, this.runId);
            }

            this.logger.info('Results saved successfully', { 
                jsonPath,
                messageCount: this.messages.length 
            });

            return true;

        } catch (error) {
            this.logger.error('Failed to save results', { error: error.message });
            throw error;
        }
    }

    /**
     * Avslutar scraping session
     */
    async cleanup(status = 'success', errorMessage = null) {
        try {
            this.logger.info('Cleaning up scraper');

            // Stoppa trace och spara
            if (this.context) {
                const artifacts = require('../utils/artifacts').createArtifactPaths(this.runId);
                await this.context.tracing.stop({ path: artifacts.traceFile });
                this.logger.info('Trace saved', { path: artifacts.traceFile });
            }

            // Stäng browser
            if (this.browser) {
                await this.browser.close();
            }

            // Uppdatera DB
            const paths = getRelativePaths(this.runId);
            await updateScrapeRun(this.runId, {
                status: status,
                completed_at: new Date(),
                message_count: this.messages.length,
                error_message: errorMessage,
                ...paths
            });

            this.logger.info('Cleanup completed', { status });

        } catch (error) {
            this.logger.error('Cleanup failed', { error: error.message });
        }
    }

    /**
     * Error handler
     */
    async handleError(error) {
        this.logger.error('Scraper error occurred', {
            error: error.message,
            stack: error.stack
        });

        await this.cleanup('failed', error.message);
    }

    /**
     * Main execution method
     */
    async run() {
        try {
            // Initialize
            const initialized = await this.initialize();
            if (!initialized) {
                return false;
            }

            // Navigate
            await this.navigateToTeams();

            // Extract (implementeras av konkret scraper)
            await this.extractMessages();

            // Save
            await this.saveResults();

            // Cleanup
            await this.cleanup('success');

            return true;

        } catch (error) {
            await this.handleError(error);
            return false;
        }
    }
}

module.exports = BaseScraper;
```

### Subtask 5.1.2: Skapa template för konkret scraper
- [ ] Skapa `playwright/scripts/fetch_teams_chat_medium.js` (template):

```javascript
/**
 * Teams Chat Scraper - Medium Profile
 * 
 * VIKTIGT: Detta är en TEMPLATE som ska ersättas med konverterad codegen-script!
 * 
 * Workflow:
 * 1. Användaren kör: scripts/run_codegen_medium.bat
 * 2. Interagerar med Teams för att nå target chat
 * 3. Codegen sparar till: playwright/recorded/recorded_medium_<timestamp>.ts
 * 4. AI-agenten konverterar den filen till denna produktionsskript
 * 5. Scriptet ska behålla strukturen nedan men ersätta extractMessages()
 */

const BaseScraper = require('./base_scraper');

class TeamsScraperMedium extends BaseScraper {
    constructor() {
        super('medium');
    }

    /**
     * Extraherar messages från Teams UI
     * 
     * ⚠️ VIKTIGT: Denna metod måste implementeras baserat på codegen!
     * 
     * Generell approach:
     * 1. Identifiera message containers (från codegen selectors)
     * 2. Scrolla för att ladda historik
     * 3. Extrahera varje meddelande:
     *    - Sender namn
     *    - Message text
     *    - Timestamp
     *    - Channel name
     *    - Thread ID (om applicable)
     */
    async extractMessages() {
        this.logger.info('Starting message extraction (MEDIUM profile)');

        /**
         * TODO: Implementera baserat på codegen
         * 
         * Exempel-struktur (anpassa efter faktiska selectors):
         */

        try {
            // 1. Vänta på att chat-området laddas
            // await this.page.waitForSelector('SELECTOR_FROM_CODEGEN');

            // 2. Scrolla för att ladda historik
            // await this.scrollToLoadMore('SCROLL_CONTAINER_SELECTOR', 10);

            // 3. Hämta alla message elements
            // const messageElements = await this.page.$$('MESSAGE_SELECTOR');

            // 4. Extrahera data från varje meddelande
            // for (const element of messageElements) {
            //     const sender = await element.$eval('SENDER_SELECTOR', el => el.textContent);
            //     const text = await element.$eval('TEXT_SELECTOR', el => el.textContent);
            //     const timestamp = await element.$eval('TIME_SELECTOR', el => el.getAttribute('datetime'));
            //     
            //     this.messages.push({
            //         sender: sender?.trim() || 'Unknown',
            //         message_text: text?.trim() || '',
            //         timestamp: new Date(timestamp),
            //         channel_name: 'CHANNEL_NAME', // extrahera från UI
            //         thread_id: null // extrahera om applicable
            //     });
            // }

            // TEMPORARY PLACEHOLDER - ersätt med faktisk implementation
            this.logger.warn('⚠️  extractMessages() is not yet implemented!');
            this.logger.warn('⚠️  Run codegen and convert to production script!');
            
            // Simulerar att vi försöker hitta messages
            await this.page.waitForTimeout(2000);
            
            this.logger.info(`Extracted ${this.messages.length} messages`);

        } catch (error) {
            this.logger.error('Message extraction failed', { error: error.message });
            throw error;
        }
    }

    /**
     * Navigerar till specifik chat/channel
     * Implementera om codegen visar specific navigation steps
     */
    async navigateToTargetChat() {
        // TODO: Implementera baserat på codegen
        // Exempel:
        // await this.page.click('CHANNEL_SELECTOR');
        // await this.page.waitForLoadState('networkidle');
    }

    /**
     * Override run() om custom flow behövs
     */
    async run() {
        try {
            const initialized = await this.initialize();
            if (!initialized) return false;

            await this.navigateToTeams();
            
            // Custom navigation om applicable
            // await this.navigateToTargetChat();
            
            await this.extractMessages();
            await this.saveResults();
            await this.cleanup('success');

            return true;

        } catch (error) {
            await this.handleError(error);
            return false;
        }
    }
}

// Main execution
if (require.main === module) {
    const scraper = new TeamsScraperMedium();
    
    scraper.run()
        .then(success => {
            console.log(success ? '✅ Scrape completed successfully' : '❌ Scrape failed');
            process.exit(success ? 0 : 1);
        })
        .catch(error => {
            console.error('❌ Fatal error:', error);
            process.exit(1);
        });
}

module.exports = TeamsScraperMedium;
```

### Subtask 5.1.3: Kopiera template för alla profiler
- [ ] Kopiera och anpassa för small:

```bash
cp playwright/scripts/fetch_teams_chat_medium.js playwright/scripts/fetch_teams_chat_small.js
# Redigera: ersätt "Medium" med "Small" och 'medium' med 'small' i filen
```

- [ ] Kopiera och anpassa för large:

```bash
cp playwright/scripts/fetch_teams_chat_medium.js playwright/scripts/fetch_teams_chat_large.js
# Redigera: ersätt "Medium" med "Large" och 'medium' med 'large' i filen
```

**📝 NOTERA:** Dessa templates ska ersättas när codegen-scripts konverteras!

---

## Task 5.2: Skapa conversion guide för codegen

### Subtask 5.2.1: Skapa conversion instructions
- [ ] Skapa `playwright/CODEGEN_CONVERSION_GUIDE.md`:

```markdown
# CODEGEN TO PRODUCTION CONVERSION GUIDE

## Översikt
Detta dokument beskriver hur man konverterar ett inspelat codegen-script till ett produktionsskript.

## Workflow

### Steg 1: Spela in med codegen
```bash
# Kör rätt .bat-fil för önskad profil
scripts/run_codegen_small.bat
scripts/run_codegen_medium.bat
scripts/run_codegen_large.bat
```

Saved file kommer att vara:
`playwright/recorded/recorded_<profile>_<timestamp>.ts`

### Steg 2: Analysera inspelat script

Codegen genererar typiskt:
- `goto()` navigations
- `click()` actions
- `fill()` för input
- `waitForSelector()` för väntan

### Steg 3: Konvertera till production script

#### A. Använd BaseScraper som grund
```javascript
const BaseScraper = require('./base_scraper');

class TeamsScraperMedium extends BaseScraper {
    constructor() {
        super('medium');
    }
    
    async extractMessages() {
        // Implementation här
    }
}
```

#### B. Extrahera selectors från codegen
Leta efter patterns som:
```typescript
await page.click('div[role="button"][aria-label="Chat"]');
await page.waitForSelector('.message-list');
```

Konvertera till:
```javascript
const SELECTORS = {
    CHAT_BUTTON: 'div[role="button"][aria-label="Chat"]',
    MESSAGE_LIST: '.message-list',
    MESSAGE_ITEM: '.message-item',
    SENDER_NAME: '.message-author',
    MESSAGE_TEXT: '.message-content',
    TIMESTAMP: 'time[datetime]'
};
```

#### C. Implementera extractMessages()
```javascript
async extractMessages() {
    this.logger.info('Extracting messages');
    
    // 1. Navigera till rätt chat (från codegen)
    await this.page.click(SELECTORS.CHAT_BUTTON);
    await this.page.waitForSelector(SELECTORS.MESSAGE_LIST);
    
    // 2. Scrolla för historik
    await this.scrollToLoadMore(SELECTORS.MESSAGE_LIST, 10);
    
    // 3. Extrahera messages
    const messageElements = await this.page.$$(SELECTORS.MESSAGE_ITEM);
    
    for (const element of messageElements) {
        try {
            const sender = await element.$eval(
                SELECTORS.SENDER_NAME, 
                el => el.textContent
            ).catch(() => 'Unknown');
            
            const text = await element.$eval(
                SELECTORS.MESSAGE_TEXT,
                el => el.textContent
            ).catch(() => '');
            
            const timestampStr = await element.$eval(
                SELECTORS.TIMESTAMP,
                el => el.getAttribute('datetime')
            ).catch(() => new Date().toISOString());
            
            this.messages.push({
                sender: sender.trim(),
                message_text: text.trim(),
                timestamp: new Date(timestampStr),
                channel_name: 'CHANNEL_NAME', // TODO: extrahera
                thread_id: null
            });
            
        } catch (error) {
            this.logger.warn('Failed to extract message', { error: error.message });
        }
    }
    
    this.logger.info(`Extracted ${this.messages.length} messages`);
}
```

#### D. Hantera pagination/scrolling
```javascript
// Identifiera scroll container från codegen
// Vanligtvis är det element med overflow: scroll

async scrollToLoadMore(selector, maxScrolls = 10) {
    return super.scrollToLoadMore(selector, maxScrolls);
}
```

#### E. Lägg till error handling
```javascript
async extractMessages() {
    try {
        // Main logic
    } catch (error) {
        this.logger.error('Extraction failed', { error: error.message });
        
        // Ta screenshot för debugging
        await this.page.screenshot({ 
            path: `logs/error_${this.runId}.png` 
        });
        
        throw error;
    }
}
```

### Steg 4: Testa production script

```bash
# Manuell test
node playwright/scripts/fetch_teams_chat_medium.js

# Eller via .bat
scripts/run_scrape_medium.bat
```

Kontrollera:
- [ ] Logfil skapades i `/logs/`
- [ ] JSON data i `/data/raw/`
- [ ] Video i `/data/video/`
- [ ] Trace i `/data/trace/`
- [ ] DB records i `chat_messages` och `scrape_runs`

## Best Practices

### Selector Stability
- Använd `data-*` attributes när möjligt
- Föredra ARIA labels
- Undvik CSS classes som kan ändras
- Centralisera selectors i constants

### Error Handling
- Hantera missing elements gracefully
- Logga warnings istället för att krascha
- Ta screenshots vid errors
- Fortsätt scraping även om enskilda messages failar

### Performance
- Använd batch operations för DB
- Begränsa antal scrolls
- Sätt rimliga timeouts
- Undvik onödiga waits

### Maintainability
- Kommentera selector-logic
- Dokumentera DOM-struktur
- Versionera scripts när Teams UI ändras
- Behåll gamla scripts som referens

## Troubleshooting

### Selectors fungerar inte
1. Kör codegen igen
2. Inspektera Teams DOM i DevTools
3. Testa selectors i browser console
4. Använd mer generiska selectors

### Session expired
1. Kör i headed mode (`HEADLESS=false`)
2. Logga in manuellt
3. Session sparas i `browser_context/state.json`

### Inga messages extraheras
1. Kontrollera att rätt chat är öppen
2. Verifiera selectors i DevTools
3. Kolla om DOM-struktur ändrats
4. Lägg till fler waits
```

---

# PHASE 6: WEB API/UI (Express)

## Task 6.1: Skapa Express server

### Subtask 6.1.1: Skapa server.js
- [ ] Skapa `web/server.js`:

```javascript
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
const PORT = process.env.INTERNAL_PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

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
app.get('/', async (req, res) => {
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
app.get('/messages', async (req, res) => {
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
app.get('/search', async (req, res) => {
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
app.get('/runs', async (req, res) => {
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
app.get('/runs/:id', async (req, res) => {
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

// Start
startServer();
```

### Subtask 6.1.2: Skapa enkel UI
- [ ] Skapa `web/public/index.html`:

```html
<!DOCTYPE html>
<html lang="sv">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Teams Collector - Dashboard</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
            background: #f5f5f5;
            padding: 20px;
        }

        .container {
            max-width: 1200px;
            margin: 0 auto;
            background: white;
            border-radius: 8px;
            padding: 30px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }

        h1 {
            color: #333;
            margin-bottom: 10px;
        }

        .subtitle {
            color: #666;
            margin-bottom: 30px;
        }

        .stats {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 20px;
            margin-bottom: 30px;
        }

        .stat-card {
            background: #f9f9f9;
            padding: 20px;
            border-radius: 6px;
            border-left: 4px solid #6264A7;
        }

        .stat-value {
            font-size: 32px;
            font-weight: bold;
            color: #6264A7;
        }

        .stat-label {
            color: #666;
            margin-top: 5px;
        }

        .section {
            margin-bottom: 30px;
        }

        .section-title {
            font-size: 20px;
            color: #333;
            margin-bottom: 15px;
            padding-bottom: 10px;
            border-bottom: 2px solid #6264A7;
        }

        .run-item, .message-item {
            background: #f9f9f9;
            padding: 15px;
            margin-bottom: 10px;
            border-radius: 4px;
            border-left: 3px solid #6264A7;
        }

        .run-header {
            display: flex;
            justify-content: space-between;
            margin-bottom: 10px;
        }

        .run-id {
            font-weight: bold;
            color: #333;
        }

        .run-status {
            padding: 4px 12px;
            border-radius: 12px;
            font-size: 12px;
            font-weight: bold;
        }

        .status-success {
            background: #d4edda;
            color: #155724;
        }

        .status-failed {
            background: #f8d7da;
            color: #721c24;
        }

        .run-meta {
            font-size: 14px;
            color: #666;
        }

        .message-header {
            display: flex;
            justify-content: space-between;
            margin-bottom: 8px;
        }

        .message-sender {
            font-weight: bold;
            color: #333;
        }

        .message-time {
            font-size: 12px;
            color: #999;
        }

        .message-text {
            color: #555;
            line-height: 1.5;
        }

        .error {
            background: #f8d7da;
            color: #721c24;
            padding: 15px;
            border-radius: 4px;
            margin-bottom: 20px;
        }

        .loading {
            text-align: center;
            padding: 40px;
            color: #666;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>Teams Collector Dashboard</h1>
        <p class="subtitle">MS Teams Chat Collection System</p>

        <div id="error-container"></div>
        <div id="loading" class="loading">Loading...</div>
        <div id="content" style="display: none;">
            <div class="stats">
                <div class="stat-card">
                    <div class="stat-value" id="stat-runs">-</div>
                    <div class="stat-label">Recent Runs</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value" id="stat-messages">-</div>
                    <div class="stat-label">Recent Messages</div>
                </div>
            </div>

            <div class="section">
                <h2 class="section-title">Recent Runs</h2>
                <div id="runs-list"></div>
            </div>

            <div class="section">
                <h2 class="section-title">Recent Messages</h2>
                <div id="messages-list"></div>
            </div>
        </div>
    </div>

    <script>
        async function loadDashboard() {
            try {
                const response = await fetch('/');
                const data = await response.json();

                // Update stats
                document.getElementById('stat-runs').textContent = data.summary.recent_runs;
                document.getElementById('stat-messages').textContent = data.summary.recent_messages;

                // Render runs
                const runsList = document.getElementById('runs-list');
                runsList.innerHTML = data.runs.map(run => `
                    <div class="run-item">
                        <div class="run-header">
                            <span class="run-id">${run.id}</span>
                            <span class="run-status status-${run.status}">${run.status}</span>
                        </div>
                        <div class="run-meta">
                            Profile: ${run.profile} | 
                            Messages: ${run.message_count} | 
                            Started: ${new Date(run.started_at).toLocaleString()}
                            ${run.video_path ? ' | <a href="/artifacts' + run.video_path + '" target="_blank">📹 Video</a>' : ''}
                            ${run.trace_path ? ' | <a href="/artifacts' + run.trace_path + '" target="_blank">🔍 Trace</a>' : ''}
                        </div>
                    </div>
                `).join('');

                // Render messages
                const messagesList = document.getElementById('messages-list');
                messagesList.innerHTML = data.messages.map(msg => `
                    <div class="message-item">
                        <div class="message-header">
                            <span class="message-sender">${msg.sender}</span>
                            <span class="message-time">${new Date(msg.timestamp).toLocaleString()}</span>
                        </div>
                        <div class="message-text">${msg.message_text}</div>
                    </div>
                `).join('');

                // Show content, hide loading
                document.getElementById('loading').style.display = 'none';
                document.getElementById('content').style.display = 'block';

            } catch (error) {
                console.error('Failed to load dashboard:', error);
                document.getElementById('error-container').innerHTML = `
                    <div class="error">
                        Failed to load dashboard: ${error.message}
                    </div>
                `;
                document.getElementById('loading').style.display = 'none';
            }
        }

        // Load on page load
        loadDashboard();

        // Reload every 30 seconds
        setInterval(loadDashboard, 30000);
    </script>
</body>
</html>
```

---

# PHASE 7: SCHEDULER OCH AUTOMATION

## Task 7.1: Skapa scheduler

### Subtask 7.1.1: Skapa scheduler.js
- [ ] Skapa `playwright/scripts/scheduler.js`:

```javascript
/**
 * Scheduler for Teams Collector
 * Kör scraping på definierade intervaller
 */

const cron = require('node-cron');
const { testConnection } = require('../../database/connection');
const { getProfile } = require('../utils/profiles');

// Import scrapers
const TeamsScraperSmall = require('./fetch_teams_chat_small');
const TeamsScraperMedium = require('./fetch_teams_chat_medium');
const TeamsScraperLarge = require('./fetch_teams_chat_large');

// Konfiguration från env
const INTERVAL_MINUTES = parseInt(process.env.SCRAPE_INTERVAL_MINUTES) || 15;
const PROFILE = process.env.PLAYWRIGHT_PROFILE || 'medium';

console.log('='.repeat(60));
console.log('[Scheduler] Teams Collector Scheduler Starting');
console.log(`[Scheduler] Interval: ${INTERVAL_MINUTES} minutes`);
console.log(`[Scheduler] Profile: ${PROFILE}`);
console.log(`[Scheduler] Headless: ${process.env.HEADLESS}`);
console.log('='.repeat(60));

/**
 * Väljer rätt scraper baserat på profil
 */
function getScraperForProfile(profile) {
    switch (profile.toLowerCase()) {
        case 'small':
            return TeamsScraperSmall;
        case 'large':
            return TeamsScraperLarge;
        case 'medium':
        default:
            return TeamsScraperMedium;
    }
}

/**
 * Kör en scraping session
 */
async function runScrapeSession() {
    const startTime = new Date();
    console.log(`\n${'='.repeat(60)}`);
    console.log(`[Scheduler] Starting scrape session at ${startTime.toISOString()}`);
    console.log(`[Scheduler] Profile: ${PROFILE}`);
    console.log(`${'='.repeat(60)}\n`);

    try {
        // Test DB connection först
        const dbOk = await testConnection();
        if (!dbOk) {
            console.error('[Scheduler] ❌ Database connection failed, skipping run');
            return false;
        }

        // Skapa och kör scraper
        const ScraperClass = getScraperForProfile(PROFILE);
        const scraper = new ScraperClass();
        
        const success = await scraper.run();

        const endTime = new Date();
        const duration = (endTime - startTime) / 1000;

        console.log(`\n${'='.repeat(60)}`);
        console.log(`[Scheduler] Scrape session completed`);
        console.log(`[Scheduler] Status: ${success ? '✅ SUCCESS' : '❌ FAILED'}`);
        console.log(`[Scheduler] Duration: ${duration.toFixed(2)}s`);
        console.log(`[Scheduler] Next run in ${INTERVAL_MINUTES} minutes`);
        console.log(`${'='.repeat(60)}\n`);

        return success;

    } catch (error) {
        console.error('[Scheduler] Fatal error in scrape session:', error);
        return false;
    }
}

/**
 * Startar scheduler
 */
async function startScheduler() {
    try {
        // Initial DB test
        console.log('[Scheduler] Testing database connection...');
        const dbOk = await testConnection();
        
        if (!dbOk) {
            console.error('[Scheduler] ❌ Cannot start - database unavailable');
            console.error('[Scheduler] Check if MySQL container is running: docker ps');
            process.exit(1);
        }

        console.log('[Scheduler] ✅ Database connection OK\n');

        // Kör omedelbart vid start (optional, kan kommenteras bort)
        console.log('[Scheduler] Running initial scrape session...');
        await runScrapeSession();

        // Schedule recurring runs
        // Cron pattern: varje N minuter
        const cronPattern = `*/${INTERVAL_MINUTES} * * * *`;
        
        console.log(`[Scheduler] Scheduling recurring runs: ${cronPattern}`);
        
        cron.schedule(cronPattern, async () => {
            await runScrapeSession();
        });

        console.log('[Scheduler] Scheduler is now running. Press Ctrl+C to stop.');

    } catch (error) {
        console.error('[Scheduler] Failed to start scheduler:', error);
        process.exit(1);
    }
}

// Graceful shutdown
process.on('SIGTERM', async () => {
    console.log('\n[Scheduler] SIGTERM received, shutting down...');
    const { closePool } = require('../../database/connection');
    await closePool();
    process.exit(0);
});

process.on('SIGINT', async () => {
    console.log('\n[Scheduler] SIGINT received, shutting down...');
    const { closePool } = require('../../database/connection');
    await closePool();
    process.exit(0);
});

// Start scheduler
startScheduler();
```

---

# PHASE 8: BATCH SCRIPTS (.bat filer)

## Task 8.1: Skapa codegen batch scripts

### Subtask 8.1.1: Skapa run_codegen_small.bat
- [ ] Skapa `scripts/run_codegen_small.bat`:

```batch
@echo off
REM ========================================
REM Codegen Launcher - Small Profile
REM ========================================
REM Denna fil startar Playwright Codegen för small profile
REM Output: playwright/recorded/recorded_small_<timestamp>.ts

echo ========================================
echo Teams Collector - Codegen (Small)
echo ========================================
echo.

REM Ladda environment variables från .env
call :load_env ..\.env

REM Sätt profil-specifika settings
set PLAYWRIGHT_PROFILE=small
set HEADLESS=false

REM Generera timestamp för filnamn (utan åäö!)
set TS=%DATE:~-4%-%DATE:~3,2%-%DATE:~0,2%_%TIME:~0,2%-%TIME:~3,2%-%TIME:~6,2%
set TS=%TS: =0%

REM Generera output path
set OUTPUT_FILE=playwright\recorded\recorded_small_%TS%.ts

echo Profile: %PLAYWRIGHT_PROFILE%
echo Viewport: %PROFILE_SMALL_W%x%PROFILE_SMALL_H%
echo Output: %OUTPUT_FILE%
echo.
echo Starting Codegen...
echo TIPS:
echo - Navigera till din Teams chat
echo - Gor de actions du vill spela in
echo - Stang browsern nar du ar klar
echo.

REM Kör codegen
npx playwright codegen ^
    %TEAMS_URL% ^
    --viewport-size=%PROFILE_SMALL_W%,%PROFILE_SMALL_H% ^
    --save-storage=browser_context\state.json ^
    --output=%OUTPUT_FILE%

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ========================================
    echo SUCCESS!
    echo ========================================
    echo File saved: %OUTPUT_FILE%
    echo.
    echo NEXT STEPS:
    echo 1. Review the recorded script
    echo 2. Convert to production script using AI agent
    echo 3. Test with: scripts\run_scrape_small.bat
    echo ========================================
) else (
    echo.
    echo ========================================
    echo FAILED!
    echo ========================================
    echo Codegen exited with error code: %ERRORLEVEL%
    echo Check that:
    echo - Playwright is installed: npm install
    echo - .env file exists with correct settings
    echo ========================================
)

pause
goto :eof

:load_env
for /f "usebackq tokens=1,2 delims==" %%a in ("%~1") do (
    set "%%a=%%b"
)
goto :eof
```

### Subtask 8.1.2: Skapa run_codegen_medium.bat
- [ ] Skapa `scripts/run_codegen_medium.bat`:

```batch
@echo off
REM ========================================
REM Codegen Launcher - Medium Profile
REM ========================================

echo ========================================
echo Teams Collector - Codegen (Medium)
echo ========================================
echo.

call :load_env ..\.env

set PLAYWRIGHT_PROFILE=medium
set HEADLESS=false

set TS=%DATE:~-4%-%DATE:~3,2%-%DATE:~0,2%_%TIME:~0,2%-%TIME:~3,2%-%TIME:~6,2%
set TS=%TS: =0%

set OUTPUT_FILE=playwright\recorded\recorded_medium_%TS%.ts

echo Profile: %PLAYWRIGHT_PROFILE%
echo Viewport: %PROFILE_MEDIUM_W%x%PROFILE_MEDIUM_H%
echo Output: %OUTPUT_FILE%
echo.
echo Starting Codegen...
echo.

npx playwright codegen ^
    %TEAMS_URL% ^
    --viewport-size=%PROFILE_MEDIUM_W%,%PROFILE_MEDIUM_H% ^
    --save-storage=browser_context\state.json ^
    --output=%OUTPUT_FILE%

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ========================================
    echo SUCCESS! File saved: %OUTPUT_FILE%
    echo ========================================
) else (
    echo.
    echo ========================================
    echo FAILED! Error code: %ERRORLEVEL%
    echo ========================================
)

pause
goto :eof

:load_env
for /f "usebackq tokens=1,2 delims==" %%a in ("%~1") do (
    set "%%a=%%b"
)
goto :eof
```

### Subtask 8.1.3: Skapa run_codegen_large.bat
- [ ] Skapa `scripts/run_codegen_large.bat`:

```batch
@echo off
REM ========================================
REM Codegen Launcher - Large Profile
REM ========================================

echo ========================================
echo Teams Collector - Codegen (Large)
echo ========================================
echo.

call :load_env ..\.env

set PLAYWRIGHT_PROFILE=large
set HEADLESS=false

set TS=%DATE:~-4%-%DATE:~3,2%-%DATE:~0,2%_%TIME:~0,2%-%TIME:~3,2%-%TIME:~6,2%
set TS=%TS: =0%

set OUTPUT_FILE=playwright\recorded\recorded_large_%TS%.ts

echo Profile: %PLAYWRIGHT_PROFILE%
echo Viewport: %PROFILE_LARGE_W%x%PROFILE_LARGE_H%
echo Output: %OUTPUT_FILE%
echo.
echo Starting Codegen...
echo.

npx playwright codegen ^
    %TEAMS_URL% ^
    --viewport-size=%PROFILE_LARGE_W%,%PROFILE_LARGE_H% ^
    --save-storage=browser_context\state.json ^
    --output=%OUTPUT_FILE%

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ========================================
    echo SUCCESS! File saved: %OUTPUT_FILE%
    echo ========================================
) else (
    echo.
    echo ========================================
    echo FAILED! Error code: %ERRORLEVEL%
    echo ========================================
)

pause
goto :eof

:load_env
for /f "usebackq tokens=1,2 delims==" %%a in ("%~1") do (
    set "%%a=%%b"
)
goto :eof
```

---

## Task 8.2: Skapa scraper batch scripts

### Subtask 8.2.1: Skapa run_scrape_small.bat
- [ ] Skapa `scripts/run_scrape_small.bat`:

```batch
@echo off
REM ========================================
REM Scraper Runner - Small Profile
REM ========================================
REM Kör production scraper med small profile

echo ========================================
echo Teams Collector - Scraper (Small)
echo ========================================
echo.

call :load_env ..\.env

set PLAYWRIGHT_PROFILE=small
set HEADLESS=true

echo Profile: %PLAYWRIGHT_PROFILE%
echo Headless: %HEADLESS%
echo.
echo Running scraper...
echo.

node playwright\scripts\fetch_teams_chat_small.js

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ========================================
    echo SUCCESS!
    echo ========================================
    echo Check results:
    echo - Logs: logs\
    echo - Data: data\raw\
    echo - Video: data\video\
    echo - Trace: data\trace\
    echo - Database: query scrape_runs table
    echo - Web UI: http://localhost:3040
    echo ========================================
) else (
    echo.
    echo ========================================
    echo FAILED! Error code: %ERRORLEVEL%
    echo ========================================
    echo Check logs\ for details
    echo.
    echo TROUBLESHOOTING:
    echo - Database running? docker ps
    echo - Correct .env settings?
    echo - Browser issues? Try HEADLESS=false
    echo ========================================
)

pause
goto :eof

:load_env
for /f "usebackq tokens=1,2 delims==" %%a in ("%~1") do (
    set "%%a=%%b"
)
goto :eof
```

### Subtask 8.2.2: Skapa run_scrape_medium.bat
- [ ] Skapa `scripts/run_scrape_medium.bat`:

```batch
@echo off
REM ========================================
REM Scraper Runner - Medium Profile
REM ========================================

echo ========================================
echo Teams Collector - Scraper (Medium)
echo ========================================
echo.

call :load_env ..\.env

set PLAYWRIGHT_PROFILE=medium
set HEADLESS=true

echo Profile: %PLAYWRIGHT_PROFILE%
echo Headless: %HEADLESS%
echo.
echo Running scraper...
echo.

node playwright\scripts\fetch_teams_chat_medium.js

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ========================================
    echo SUCCESS! Check http://localhost:3040
    echo ========================================
) else (
    echo.
    echo ========================================
    echo FAILED! Error code: %ERRORLEVEL%
    echo ========================================
)

pause
goto :eof

:load_env
for /f "usebackq tokens=1,2 delims==" %%a in ("%~1") do (
    set "%%a=%%b"
)
goto :eof
```

### Subtask 8.2.3: Skapa run_scrape_large.bat
- [ ] Skapa `scripts/run_scrape_large.bat`:

```batch
@echo off
REM ========================================
REM Scraper Runner - Large Profile
REM ========================================

echo ========================================
echo Teams Collector - Scraper (Large)
echo ========================================
echo.

call :load_env ..\.env

set PLAYWRIGHT_PROFILE=large
set HEADLESS=true

echo Profile: %PLAYWRIGHT_PROFILE%
echo Headless: %HEADLESS%
echo.
echo Running scraper...
echo.

node playwright\scripts\fetch_teams_chat_large.js

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ========================================
    echo SUCCESS! Check http://localhost:3040
    echo ========================================
) else (
    echo.
    echo ========================================
    echo FAILED! Error code: %ERRORLEVEL%
    echo ========================================
)

pause
goto :eof

:load_env
for /f "usebackq tokens=1,2 delims==" %%a in ("%~1") do (
    set "%%a=%%b"
)
goto :eof
```

---

## Task 8.3: Skapa Docker management scripts

### Subtask 8.3.1: Skapa start script
- [ ] Skapa `scripts/docker_start.bat`:

```batch
@echo off
REM ========================================
REM Docker Compose Start
REM ========================================
REM Startar alla containers (db, api, scraper)

echo ========================================
echo Teams Collector - Starting Docker Stack
echo ========================================
echo.

echo Checking docker-compose.yml...
if not exist "docker-compose.yml" (
    echo ERROR: docker-compose.yml not found!
    echo Run this from project root.
    pause
    exit /b 1
)

echo.
echo Starting containers...
echo This may take a few minutes on first run...
echo.

docker-compose up -d

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ========================================
    echo SUCCESS! All containers started
    echo ========================================
    echo.
    echo Services:
    echo - Database: localhost:3306
    echo - Web API: http://localhost:3040
    echo - Scraper: background service
    echo.
    echo Check status: docker ps
    echo Check logs: docker-compose logs -f
    echo ========================================
) else (
    echo.
    echo ========================================
    echo FAILED! Error code: %ERRORLEVEL%
    echo ========================================
    echo.
    echo TROUBLESHOOTING:
    echo - Docker Desktop running?
    echo - Ports 3040, 3306 available?
    echo   (NEVER use taskkill! Check docker ps first)
    echo - .env file configured?
    echo ========================================
)

pause
```

### Subtask 8.3.2: Skapa stop script
- [ ] Skapa `scripts/docker_stop.bat`:

```batch
@echo off
REM ========================================
REM Docker Compose Stop
REM ========================================

echo ========================================
echo Teams Collector - Stopping Docker Stack
echo ========================================
echo.

docker-compose down

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ========================================
    echo SUCCESS! All containers stopped
    echo ========================================
) else (
    echo.
    echo ========================================
    echo FAILED! Error code: %ERRORLEVEL%
    echo ========================================
)

pause
```

### Subtask 8.3.3: Skapa logs script
- [ ] Skapa `scripts/docker_logs.bat`:

```batch
@echo off
REM ========================================
REM Docker Logs Viewer
REM ========================================

echo ========================================
echo Teams Collector - Container Logs
echo ========================================
echo.
echo Press Ctrl+C to exit
echo.

docker-compose logs -f --tail=100
```

---

# PHASE 9: TESTING OCH VERIFIERING

## Task 9.1: Manuell testplan

### Subtask 9.1.1: Skapa test checklist
- [ ] Skapa `docs/TESTING_CHECKLIST.md`:

```markdown
# TESTING CHECKLIST

## Pre-Test Setup

### Environment
- [ ] `.env` file exists och är korrekt konfigurerad
- [ ] Inga åäö i filnamn eller mappnamn
- [ ] Docker Desktop installerad och running
- [ ] Node.js installerad (version 18+)
- [ ] npm dependencies installerade

### Database
- [ ] MySQL container startar utan errors
- [ ] Database `teams_collector` skapas
- [ ] Tables skapas (chat_messages, scrape_runs, scrape_errors)
- [ ] User `teams_user` har rätt permissions

## Phase 1: Docker Stack Test

### Start Services
- [ ] Kör `docker-compose up -d`
- [ ] Alla containers startar: db, api, scraper
- [ ] Kör `docker ps` - alla containers "Up"
- [ ] Inga port conflicts (3040, 3306)

### Health Checks
- [ ] Database health check passerar
- [ ] API health endpoint svarar: `curl http://localhost:3040/health`
- [ ] Web UI laddar: `http://localhost:3040`

## Phase 2: Database Test

### Connection Test
```bash
docker exec -it teams_collector_db mysql -uteams_user -p
# Ange lösenord från .env
```

- [ ] Connection successful
- [ ] Database finns: `SHOW DATABASES;`
- [ ] Tables finns: `USE teams_collector; SHOW TABLES;`

### Schema Validation
```sql
DESCRIBE chat_messages;
DESCRIBE scrape_runs;
DESCRIBE scrape_errors;
```

- [ ] Alla columns finns
- [ ] Indexes finns
- [ ] Fulltext search index finns

## Phase 3: Codegen Test

### Run Codegen (Medium)
- [ ] Kör `scripts\run_codegen_medium.bat`
- [ ] Browser öppnas (headed mode)
- [ ] Navigerar till Teams URL
- [ ] Kan interagera med UI
- [ ] File sparas: `playwright\recorded\recorded_medium_<timestamp>.ts`

### Verify Codegen Output
- [ ] File innehåller valid TypeScript
- [ ] Selectors captured korrekt
- [ ] Navigation steps inkluderade
- [ ] Session state sparad: `browser_context\state.json`

### Test All Profiles
- [ ] Small profile: `run_codegen_small.bat`
- [ ] Medium profile: `run_codegen_medium.bat`
- [ ] Large profile: `run_codegen_large.bat`

## Phase 4: Scraper Test

### Manual Scraper Run
- [ ] Kör `scripts\run_scrape_medium.bat`
- [ ] Scraper startar utan errors
- [ ] Browser öppnas (eller headless)
- [ ] Navigerar till Teams
- [ ] Extraherar messages (eller loggar om not implemented)

### Verify Artifacts
- [ ] Log file: `logs\run_medium_<timestamp>.log`
- [ ] JSON data: `data\raw\run_medium_<timestamp>.json`
- [ ] Video: `data\video\run_medium_<timestamp>\`
- [ ] Trace: `data\trace\run_medium_<timestamp>.zip`

### Verify Database
```sql
SELECT * FROM scrape_runs ORDER BY started_at DESC LIMIT 1;
SELECT COUNT(*) FROM chat_messages;
```

- [ ] Run record created
- [ ] Status correct
- [ ] Artifact paths saved
- [ ] Messages saved (if extracted)

## Phase 5: API Test

### Endpoints
```bash
# Health
curl http://localhost:3040/health

# Root
curl http://localhost:3040/

# Messages
curl "http://localhost:3040/messages?limit=10"

# Search (om messages finns)
curl "http://localhost:3040/search?q=test"

# Runs
curl http://localhost:3040/runs

# Specific run
curl http://localhost:3040/runs/<RUN_ID>
```

- [ ] Alla endpoints svarar 200
- [ ] JSON format korrekt
- [ ] Data returneras (om finns)

### Web UI
- [ ] Dashboard laddar: `http://localhost:3040`
- [ ] Stats visas
- [ ] Runs listade
- [ ] Messages listade (om finns)
- [ ] Artifact links fungerar

## Phase 6: Scheduler Test

### Start Scheduler
- [ ] Scheduler container running
- [ ] Logs visar "Scheduler is now running"
- [ ] Interval korrekt från .env

### Monitor Runs
```bash
# Watch logs
docker-compose logs -f scraper
```

- [ ] First run startar omedelbart
- [ ] Subsequent runs enligt interval
- [ ] Errors logged korrekt
- [ ] Retries vid failure

## Phase 7: Error Handling Test

### Simulate Errors
- [ ] Stop database: `docker stop teams_collector_db`
- [ ] Run scraper - ska hantera gracefully
- [ ] Check logs för error messages
- [ ] Start database: `docker start teams_collector_db`
- [ ] Scraper ska reconnect

### Invalid Selectors
- [ ] Modifiera selectors i scraper
- [ ] Run scraper
- [ ] Ska hantera gracefully, inte crashas
- [ ] Error logged med screenshot

## Phase 8: Integration Test

### Full Workflow
1. [ ] Start Docker stack
2. [ ] Record med codegen
3. [ ] Convert till production script (manual eller AI)
4. [ ] Run scraper manually
5. [ ] Verify i UI at http://localhost:3040
6. [ ] Enable scheduler
7. [ ] Monitor for 30 minutes
8. [ ] Verify multiple runs

## Phase 9: Cleanup Test

### Graceful Shutdown
- [ ] Stop containers: `scripts\docker_stop.bat`
- [ ] Alla containers stoppar gracefully
- [ ] Inga orphaned processes
- [ ] Data preserved i volumes

### Data Persistence
- [ ] Restart containers
- [ ] Database data finns kvar
- [ ] Artifact files finns kvar
- [ ] Browser context preserved

## Phase 10: Port Validation

### KRITISK TEST
- [ ] API ENDAST på port 3040 (public), 3000 (internal)
- [ ] MySQL ENDAST på port 3306
- [ ] Inga andra portar exponerade
- [ ] Port mapping korrekt i docker-compose.yml

**⚠️ OM PORT-PROBLEM:**
- [ ] ALDRIG ändra ports direkt
- [ ] Kontrollera `docker ps` först
- [ ] Kontrollera .env och docker-compose.yml
- [ ] FRÅGA om tillåtelse innan ändringar
- [ ] ALDRIG använd taskkill

## Issues Log

Dokumentera alla issues här:

| Issue | Description | Resolution |
|-------|-------------|------------|
|       |             |            |

## Sign-Off

- [ ] Alla tests passerade
- [ ] Inga kritiska errors
- [ ] Performance acceptabel
- [ ] Artifacts genereras korrekt
- [ ] Database integritet verifierad

**Tested by:** _________________  
**Date:** _________________  
**Signature:** _________________
```

---

## Task 9.2: Automated tests (optional, framtida)

### Subtask 9.2.1: Skapa test setup för framtiden
- [ ] Skapa `tests/` mapp:

```bash
mkdir -p tests/unit tests/integration
```

- [ ] Skapa placeholder: `tests/README.md`:

```markdown
# Tests Directory

Denna mapp är reserverad för framtida automated tests.

## Planerade tests:

### Unit Tests
- Database operations
- Artifact management
- Profile handling
- Logger functionality

### Integration Tests
- End-to-end scraping flow
- API endpoints
- Database integration
- Docker compose stack

### Tools
- Jest för unit tests
- Playwright Test för integration
- Supertest för API tests

**Status:** Not yet implemented
```

---

# COMPLETION CHECKLIST

## 🎯 Final Verification

### Phase 1: Projektstruktur
- [ ] Alla mappar skapade
- [ ] package.json files korrekt
- [ ] .env konfigurerad
- [ ] .gitignore skapad

### Phase 2: Database
- [ ] schema.sql skapad
- [ ] connection.js fungerar
- [ ] operations.js implementerad
- [ ] Endast soft delete används

### Phase 3: Docker
- [ ] docker-compose.yml skapad (LÄST FÖRST om existerande!)
- [ ] Dockerfile.scraper skapad
- [ ] Dockerfile.api skapad
- [ ] Ports ALDRIG ändrade (3040↔3000)

### Phase 4: Playwright
- [ ] playwright.config.ts skapad (LÄST FÖRST om existerande!)
- [ ] Tre profiler konfigurerade
- [ ] Utilities skapade (logger, profiles, artifacts)
- [ ] Artifacts ALLTID on (video, trace, screenshots)

### Phase 5: Scraper
- [ ] BaseScraper implementerad
- [ ] Templates för alla tre profiler
- [ ] Conversion guide skapad
- [ ] Error handling implementerad

### Phase 6: Web API
- [ ] Express server skapad
- [ ] Alla endpoints implementerade
- [ ] UI dashboard skapad
- [ ] Port 3000 ALDRIG ändrad

### Phase 7: Scheduler
- [ ] scheduler.js implementerad
- [ ] Interval från .env
- [ ] Graceful shutdown

### Phase 8: Batch Scripts
- [ ] Alla 6 .bat filer skapade (3 codegen + 3 scraper)
- [ ] Docker management scripts
- [ ] INGA åäö i filnamn

### Phase 9: Testing
- [ ] Test checklist skapad
- [ ] Manual test plan
- [ ] Tests körda

## 🚀 Deployment Steps

1. **Environment Setup**
   ```bash
   cd teams-collector
   npm install
   cd web && npm install && cd ..
   ```

2. **Configure Environment**
   ```bash
   # Edit .env with actual credentials
   notepad .env
   ```

3. **Start Docker Stack**
   ```bash
   scripts\docker_start.bat
   ```

4. **Verify Services**
   ```bash
   docker ps
   curl http://localhost:3040/health
   ```

5. **Record Codegen**
   ```bash
   scripts\run_codegen_medium.bat
   ```

6. **Convert Script**
   - Review: `playwright\recorded\recorded_medium_<timestamp>.ts`
   - Convert using AI agent or manually
   - Update: `playwright\scripts\fetch_teams_chat_medium.js`

7. **Test Scraper**
   ```bash
   scripts\run_scrape_medium.bat
   ```

8. **Verify Results**
   - Check UI: http://localhost:3040
   - Check logs: `logs\`
   - Check artifacts: `data\`
   - Check DB: query scrape_runs

9. **Enable Scheduler**
   - Already running in scraper container
   - Monitor: `docker-compose logs -f scraper`

## 📝 VIKTIGA REMINDERS FÖR KODAGENT

### VID START AV VARJE TASK:
1. ✅ LÄS instruktioner noga
2. ✅ KONTROLLERA om filer redan finns
3. ✅ FRÅGA om tillåtelse för kritiska filer
4. ✅ FÖLJ naming conventions (inga åäö)

### UNDER IMPLEMENTATION:
1. ✅ TESTA varje steg innan nästa
2. ✅ LOGGA alla decisions och errors
3. ✅ DOKUMENTERA ändringar
4. ✅ COMMIT efter varje completed subtask

### VID PROBLEM:
1. ❌ ÄNDRA ALDRIG portar utan tillåtelse
2. ❌ ANVÄND ALDRIG taskkill
3. ❌ ÄNDRA ALDRIG docker-compose utan tillåtelse
4. ✅ KONTROLLERA `docker ps` först
5. ✅ LÄS logs: `docker-compose logs <service>`
6. ✅ FRÅGA om hjälp istället för att gissa

### KVALITETSSÄKRING:
1. ✅ Soft delete ALLTID i databas
2. ✅ Artifacts ALLTID sparade
3. ✅ Errors ALLTID loggade
4. ✅ Graceful shutdown implementerad
5. ✅ INGA mock data utan order

---

**END OF IMPLEMENTATION PLAN**

**Success Criteria:**
- ✅ Docker stack startar utan errors
- ✅ Codegen kan spelas in för alla profiler  
- ✅ Scrapers kan köras manuellt
- ✅ Artifacts (video, trace, logs) genereras
- ✅ Data sparas i MySQL
- ✅ Web UI visar data på http://localhost:3040
- ✅ Scheduler kör automatiskt enligt interval
- ✅ Alla .bat scripts fungerar
- ✅ INGA portkonflikter (3040, 3306 fastställda)
- ✅ Soft delete använt överallt i DB

**Version:** 1.0  
**Author:** Based on PRD by Mattias Cederlund  
**Date:** 2025-10-29
