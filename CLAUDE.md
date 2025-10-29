# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

MS Teams Chat Collector - A Playwright-based automation system that collects Microsoft Teams chat logs from the web interface without using Microsoft Graph API or Power Automate. The system runs as a Docker Compose stack with MySQL database, Express API/UI, and Playwright scraper services.

## Architecture

### Core Components
1. **Playwright Automation Layer** - Chromium browser controlled by Playwright to navigate Teams and extract chat data
2. **Script Conversion Layer** - Converts user-recorded `codegen` scripts into production scraping scripts
3. **Scheduler/Runner** - Interval-based scraping triggered by `.env` configuration
4. **Database Layer** - MySQL storing chat messages, runs, and metadata
5. **Web Interface** - Express API + minimal UI (internal port 3000, public port 3040)
6. **Docker Compose Stack** - Orchestrates `scraper`, `api`, and `db` services

### Folder Structure
```
/project-root
├─ docker-compose.yml
├─ .env
├─ /playwright
│  ├─ playwright.config.ts
│  ├─ recorded/              # codegen output files
│  └─ scripts/               # production scraper scripts
├─ /scripts
│  ├─ run_codegen_{small,medium,large}.bat
│  └─ run_scrape_{small,medium,large}.bat
├─ /web
│  ├─ server.js
│  └─ static/, templates/
├─ /database
│  ├─ schema.sql
│  └─ import_chat.js
├─ /data                     # JSON output, videos, traces
├─ /logs                     # Run logs
└─ /browser_context          # Persistent Chromium session
```

## Database Schema

### Table: `chat_messages`
- `id` BIGINT PK AUTO_INC
- `sender` VARCHAR(255) - Display name
- `message_text` LONGTEXT - Chat content
- `timestamp` DATETIME - UTC timestamp
- `channel_name` VARCHAR(255)
- `thread_id` VARCHAR(255) NULL
- `scrape_run_id` VARCHAR(64)
- `raw_json` JSON

### Table: `scrape_runs`
- `id` VARCHAR(64) PK - Unique run ID
- `started_at` DATETIME
- `completed_at` DATETIME
- `status` ENUM('success','failed')
- `profile` ENUM('small','medium','large')
- `headless` TINYINT(1)
- `message_count` INT
- `log_path` VARCHAR(512)
- `video_path` VARCHAR(512)
- `trace_path` VARCHAR(512)

## Execution Profiles

Three viewport profiles controlled via `PLAYWRIGHT_PROFILE` env:
- **small**: 1280×720
- **medium**: 1600×900 (default)
- **large**: 1920×1080

## Key Environment Variables

```
PUBLIC_PORT=3040              # External web UI port
INTERNAL_PORT=3000            # Internal API port
TEAMS_URL=https://teams.microsoft.com
HEADLESS=true                 # true=headless, false=headed
PLAYWRIGHT_PROFILE=medium     # small|medium|large
USER_DATA_DIR=/app/browser_context
SCRAPE_INTERVAL_MINUTES=30
DB_HOST=db
DB_PORT=3306
DB_NAME=teamslog
DB_USER=teamslog
DB_PASSWORD=teamslog_password
PROFILE_SMALL_W=1280
PROFILE_SMALL_H=720
PROFILE_MEDIUM_W=1600
PROFILE_MEDIUM_H=900
PROFILE_LARGE_W=1920
PROFILE_LARGE_H=1080
```

## Development Workflow

### 1. Recording New Scraping Actions
Use Windows batch files to launch Playwright codegen with specific profiles:
```bat
scripts\run_codegen_small.bat
scripts\run_codegen_medium.bat
scripts\run_codegen_large.bat
```
Output saved to: `playwright/recorded/recorded_{profile}_{timestamp}.ts`

### 2. Converting Recorded Scripts
AI agent should convert codegen output to production scripts at:
`playwright/scripts/fetch_teams_chat_{profile}.ts`

Production script must:
- Deduplicate waits and stabilize selectors
- Add scrolling/pagination logic
- Extract message fields (content, sender, timestamp, channel, thread)
- Emit JSON to `/data/raw/YYYY-MM-DD_HH-mm_{runId}.json`
- Record diagnostics: `screenshot: "on"`, `video: "on"`, `trace: "on"`
- Use profile-specific viewport from env
- Respect `HEADLESS` env variable

### 3. Running Scrapers Manually
```bat
scripts\run_scrape_small.bat
scripts\run_scrape_medium.bat
scripts\run_scrape_large.bat
```

### 4. Docker Operations
```bash
# Start all services
docker compose up -d

# View logs
docker compose logs -f scraper
docker compose logs -f api

# Stop services
docker compose down

# Rebuild after code changes
docker compose build
docker compose up -d
```

## Playwright Configuration

The `playwright.config.ts` must:
- Read `HEADLESS` env (true/false)
- Read `PLAYWRIGHT_PROFILE` env (small/medium/large)
- Set viewport based on profile dimensions from env
- Always enable: `video: 'on'`, `screenshot: 'on'`, `trace: 'on'`

Example structure:
```typescript
import { defineConfig } from '@playwright/test';

const headless = process.env.HEADLESS === 'true';
const profile = process.env.PLAYWRIGHT_PROFILE || 'medium';

const sizes: Record<string, { width: number; height: number }> = {
  small:  { width: Number(process.env.PROFILE_SMALL_W || 1280), height: Number(process.env.PROFILE_SMALL_H || 720) },
  medium: { width: Number(process.env.PROFILE_MEDIUM_W || 1600), height: Number(process.env.PROFILE_MEDIUM_H || 900) },
  large:  { width: Number(process.env.PROFILE_LARGE_W || 1920), height: Number(process.env.PROFILE_LARGE_H || 1080) },
};

export default defineConfig({
  use: {
    headless,
    viewport: sizes[profile],
    video: 'on',
    screenshot: 'on',
    trace: 'on',
  },
});
```

## Artifacts Storage

Each scraper run produces:
- `/logs/{RUNID}.log` - Execution log
- `/data/raw/{timestamp}_{RUNID}.json` - Extracted messages
- `/data/video/{RUNID}/*.webm` - Video recording
- `/data/trace/{RUNID}.zip` - Trace with DOM snapshots
- Database entry in `scrape_runs` table

## API Routes

Web interface (port 3040) provides:
- `/` - Run overview
- `/messages` - Paginated message list
- `/messages?channel=X` - Filter by channel
- `/search?q=keyword` - Search messages
- `/runs/:id` - Run details with video/trace artifact links

## Docker Services

### Service: `db`
- Image: `mysql:8.0`
- Port: 3306
- Volume: `db_data:/var/lib/mysql`
- Healthcheck enabled

### Service: `api`
- Build: `Dockerfile.api`
- Port mapping: `3040:3000`
- Depends on: `db` (healthy)
- Volumes: `./data`, `./logs`, `./browser_context`

### Service: `scraper`
- Build: `Dockerfile.scraper`
- Base: `mcr.microsoft.com/playwright:v1.47.0-jammy`
- Depends on: `db` (healthy)
- Volumes: `./playwright`, `./data`, `./logs`, `./browser_context`
- CMD: `node playwright/scripts/scheduler.js`

## Critical Implementation Rules

1. **NO MOCK DATA** - Never generate hardcoded or mock data
2. **Persistent Session** - Always use `USER_DATA_DIR` to avoid re-login
3. **Always Record Artifacts** - Every run must produce screenshots, video, and trace
4. **Selector Stability** - Centralize selectors; plan for DOM changes
5. **Profile Awareness** - All scripts must respect `PLAYWRIGHT_PROFILE` env
6. **Port Mapping** - Internal services use 3000, external access via 3040
7. **Session Expiration** - Fall back to headed mode (`HEADLESS=false`) for manual re-login when needed

## Scheduler Implementation

Located at: `playwright/scripts/scheduler.js`

Must:
- Read `SCRAPE_INTERVAL_MINUTES` from env
- Execute profiled scraper script (respects `PLAYWRIGHT_PROFILE`)
- Implement retry with backoff on failures
- Log each run summary
- Create `scrape_runs` database record
- Handle errors gracefully

## Security & Privacy

- No external APIs or Microsoft cloud services
- Session stored in local mounted volume
- Access restricted to authorized chats only
- Secure volume permissions
- Data rotation/archival policies for `/data`, `/logs`, `/browser_context`

## Known Risks

- **Teams DOM changes** - Selectors may break; re-record with codegen and update production scripts
- **Session expiration** - Use headed mode for manual re-login; persist context in USER_DATA_DIR
- **Anti-automation detection** - Add human-like delays; vary scroll cadence; use video/trace for debugging

## Tech Stack

- **Automation**: Playwright (Node.js, Chromium)
- **Database**: MySQL 8.0
- **Backend/UI**: Express (Node.js)
- **Scheduler**: node-cron
- **Container**: Docker Compose
- **Language**: TypeScript/JavaScript for Playwright, JavaScript for API
