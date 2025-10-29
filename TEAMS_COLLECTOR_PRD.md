Toppen — jag har uppdaterat PRD:et enligt dina sex punkter (Docker-compose stack, 3040↔3000 port-mapping, headless/headed via env, tre profiler small/medium/large, färdiga .bat-filer, samt alltid snapshots/video/trace). Klistra in allt nedan till din `docs/PRD_MS_Teams_Chat_Collector.md`.

```markdown
# TEAMS COLLECTOR - PRODUCT REQUIREMENTS DOCUMENT (PRD)

## Project Title
**MS Teams Chat Collector (via Playwright Chromium Automation)**

## Author
Mattias Cederlund

## Version
1.1  
Date: 2025-10-29

---

## 1. Overview

### 1.1 Purpose
The purpose of this system is to **automatically collect and store Microsoft Teams chat logs** from the web interface (via Chromium browser) using **Playwright scripts**, **without any Microsoft Graph API or Power Automate dependencies**.  
The system allows the user to define scraping intervals, run Playwright scripts to extract chat data, and store the results in a MySQL database for easy browsing through a minimal web interface.

### 1.2 Goals
- Automatically open a Chromium instance, navigate to Teams (web), and extract visible chat data.  
- Allow easy creation of scraping scripts using `playwright codegen`.  
- Allow conversion of the recorded script into a fully working Playwright automation by the AI agent.  
- Store all chat messages, timestamps, authors, and channel/thread information in a structured database.  
- Provide a simple browser-based web interface to review stored chats.  
- Enable manual or scheduled execution intervals.  
- **Run as a Docker Compose stack** with clear port mappings (**3040** public ↔ **3000** internal).

### 1.3 Non-Goals
- No integration with Microsoft Graph API or any official Teams API.
- No use of Power Automate, Azure Logic Apps, or any Microsoft cloud service.
- No dependency on Office 365 tokens or admin consent flows.
- No AI/LLM post-processing (may be added later as a separate project).

---

## 2. System Architecture

### 2.1 High-Level Components
| # | Component | Description |
|---|-----------|-------------|
| 1 | **Playwright Automation Layer** | Chromium-based headless or headed browser controlled by Playwright. Executes scripted actions to navigate Teams, collect chat data, and extract HTML/text content. **Always records screenshots, video, and trace snapshots.** |
| 2 | **Script Conversion Layer** | Converts user-recorded `codegen` scripts into functional scraping scripts. Handles scrolling, pagination, and extraction. |
| 3 | **Scheduler/Runner** | Interval runner triggers scraping according to `.env` (e.g., every 15 minutes). |
| 4 | **Database Layer (MySQL)** | Stores chat logs (messages, authors, threads, runs, metadata). |
| 5 | **Web Interface (API + UI)** | Minimal Express/Flask app. Internal service listens on **3000**, published as **3040** by Docker. |
| 6 | **Docker Compose Stack** | Orchestrates services (`scraper`, `api`, `db`), volumes for `/data`, `/logs`, `/browser_context`. |

---

## 3. Functional Requirements

### 3.1 Playwright Automation
- Launch Chromium (headless or headed, controlled via env `HEADLESS=true|false`).
- Persistent session with `USER_DATA_DIR` to avoid re-login.
- Navigate to configurable Teams URL.
- Open target channels/chats based on selectors captured in codegen.
- Scroll/load recent messages (configurable window, e.g., last 24h).
- Extract fields:
  - **Message content**
  - **Sender name**
  - **Timestamp**
  - **Chat type** (channel / direct message)
  - **Thread or reply ID** (if available)
- **Recording/Diagnostics (always on):**
  - `screenshot: "on"`
  - `video: "on"`
  - `trace: "on"` (snapshots for replay in trace viewer)
- Output JSON to `/data/raw/YYYY-MM-DD_HH-mm_<runId>.json`.

### 3.2 Script Creation Workflow
1. User runs codegen with a **profile** (`small`/`medium`/`large`) that controls viewport/resolution.
2. User interacts to reach the target chat area; file saved as `playwright/recorded/recorded_<profile>_<timestamp>.ts`.
3. AI agent converts to production script at `playwright/scripts/fetch_teams_chat_<profile>.ts`:
   - Deduplicates waits & stabilizes selectors.
   - Adds scrolling/pagination.
   - Emits JSON and logs under `/data` and `/logs`.
   - Uses **profile** for viewport and the **HEADLESS** env.

### 3.3 Scheduler
- Interval from `.env` (`SCRAPE_INTERVAL_MINUTES`).
- Retries with backoff on failures.
- Logs summary for each run and writes a `scrape_runs` record.

### 3.4 Database Schema (proposed)
**Table: `chat_messages`**
| Column        | Type                   | Description |
|---------------|------------------------|-------------|
| id            | BIGINT, PK, AUTO_INC   | Message row id |
| sender        | VARCHAR(255)           | Display name of sender |
| message_text  | LONGTEXT               | Chat message content |
| timestamp     | DATETIME               | UTC timestamp |
| channel_name  | VARCHAR(255)           | Channel/chat identifier |
| thread_id     | VARCHAR(255), NULL     | Thread/reply ID |
| scrape_run_id | VARCHAR(64)            | Run correlation id |
| raw_json      | JSON                   | Original message blob |

**Table: `scrape_runs`**
| Column        | Type                       | Description |
|---------------|----------------------------|-------------|
| id            | VARCHAR(64), PK            | Unique scrape session ID |
| started_at    | DATETIME                   | Start time |
| completed_at  | DATETIME                   | End time |
| status        | ENUM('success','failed')   | Outcome |
| profile       | ENUM('small','medium','large') | Execution profile |
| headless      | TINYINT(1)                 | 1=headless, 0=headed |
| message_count | INT                         | Count extracted |
| log_path      | VARCHAR(512)               | Log location |
| video_path    | VARCHAR(512)               | Video location |
| trace_path    | VARCHAR(512)               | Trace zip |

### 3.5 Web Interface
- Internal service on **3000**, published as **3040**.
- Routes:
  - `/` – Run overview
  - `/messages` – Paginated list
  - `/messages?channel=X` – Filter
  - `/search?q=keyword` – Search
  - `/runs/:id` – Run details with links to **video** and **trace** artifacts

---

## 4. Non-Functional Requirements
| Category | Requirement |
|---|---|
| **Performance** | ≥1000 messages/run under ~1 minute (UI/scroll dependent). |
| **Security** | No external APIs. Session persisted locally in mounted volume. |
| **Maintainability** | Scripts generated from codegen are structured and commented. |
| **Portability** | Runs via Docker Compose on Windows/Linux. |
| **Resilience** | Auto-retry and clear error logs; headed mode prompt when auth expires. |
| **Storage** | Monthly rotation/archival of `/data`, `/logs`, `/browser_context`. |

---

## 5. User Workflow
1. `docker compose up -d` to start DB + API/UI (port **3040**) and base images.
2. Use **.bat** helpers to **record** codegen with selected **profile**.
3. Convert codegen → production script (agent).
4. Run scraper manually once with **.bat** (per profile), verify JSON/DB/UI.
5. Enable scheduler container (or cron in scraper container) according to `.env`.

---

## 6. Technical Stack
| Layer | Technology |
|---|---|
| Automation | Playwright (Node.js, Chromium) |
| Database | MySQL (Docker) |
| Backend/UI | Express (Node) or Flask (Python), minimal |
| Scheduler | `node-cron` (Node) |
| Storage | Mounted volumes: `/data`, `/logs`, `/browser_context` |
| Orchestration | **Docker Compose** (single stack) |

---

## 7. Profiles & Headless/Headed

### 7.1 Execution Profiles
Defined via env and Playwright config (viewport & device scale):

- **small**: 1280×720  
- **medium**: 1600×900  
- **large**: 1920×1080

### 7.2 Mode Control
- `HEADLESS=true` → headless
- `HEADLESS=false` → headed (with visible Chromium)

Both are selectable in `.env` and can be overridden per **.bat**.

---

## 8. Risks & Considerations
| Risk | Mitigation |
|---|---|
| Teams DOM/selector changes | Centralize selectors; re-record with codegen; feature flag unstable paths. |
| Session expiration | Persist context; fall back to headed mode for manual re-login. |
| Anti-automation heuristics | Add human-like delays; vary scroll cadence; keep video/trace to debug. |
| Privacy & compliance | Restrict to authorized chats; secure volumes; rotate data. |

---

## 9. Verification & Testing
(unchanged content, with added checks for **video/trace** artifacts)
- Ensure each run stores **video** and **trace.zip** and links appear in `/runs/:id`.

---

## 10. Logging & Diagnostics
- Log file per run in `/logs`.
- **Artifacts (always on):**
  - Screenshots per important step
  - **Video** recording per run
  - **Trace** with DOM snapshots

---

## 11. Configuration Details

### 11.1 `.env` (top-level)
```

# ---- Ports ----

PUBLIC_PORT=3040
 INTERNAL_PORT=3000

# ---- Playwright ----

TEAMS_URL=[https://teams.microsoft.com](https://teams.microsoft.com/)
 HEADLESS=true               # true=headless, false=headed
 PLAYWRIGHT_PROFILE=medium   # small | medium | large
 USER_DATA_DIR=/app/browser_context

# ---- Profiles (viewport) ----

PROFILE_SMALL_W=1280
 PROFILE_SMALL_H=720
 PROFILE_MEDIUM_W=1600
 PROFILE_MEDIUM_H=900
 PROFILE_LARGE_W=1920
 PROFILE_LARGE_H=1080

# ---- Scheduler ----

SCRAPE_INTERVAL_MINUTES=30

# ---- Database (MySQL) ----

DB_HOST=db
 DB_PORT=3306
 DB_NAME=teamslog
 DB_USER=teamslog
 DB_PASSWORD=teamslog_password

```
### 11.2 Folder Structure
```

/project-root
 ├─ docker-compose.yml
 ├─ .env
 ├─ /playwright
 │  ├─ playwright.config.ts
 │  ├─ recorded/
 │  └─ scripts/
 ├─ /scripts
 │  ├─ run_codegen_small.bat
 │  ├─ run_codegen_medium.bat
 │  ├─ run_codegen_large.bat
 │  ├─ run_scrape_small.bat
 │  ├─ run_scrape_medium.bat
 │  └─ run_scrape_large.bat
 ├─ /web
 │  ├─ server.js  # or Flask app.py
 │  └─ static/, templates/
 ├─ /database
 │  ├─ schema.sql
 │  └─ import_chat.js  # or import_chat.py
 ├─ /data
 ├─ /logs
 └─ /browser_context

```
---

## 12. Docker Compose Stack

### 12.1 `docker-compose.yml`
```yaml
version: "3.9"

services:
  db:
    image: mysql:8.0
    environment:
      MYSQL_DATABASE: ${DB_NAME}
      MYSQL_USER: ${DB_USER}
      MYSQL_PASSWORD: ${DB_PASSWORD}
      MYSQL_ROOT_PASSWORD: ${DB_PASSWORD}
    command: --default-authentication-plugin=mysql_native_password
    volumes:
      - db_data:/var/lib/mysql
    healthcheck:
      test: ["CMD", "mysqladmin", "ping", "-h", "localhost"]
      interval: 10s
      timeout: 5s
      retries: 10

  api:
    build:
      context: .
      dockerfile: Dockerfile.api
    environment:
      DB_HOST: db
      DB_PORT: ${DB_PORT}
      DB_NAME: ${DB_NAME}
      DB_USER: ${DB_USER}
      DB_PASSWORD: ${DB_PASSWORD}
      INTERNAL_PORT: ${INTERNAL_PORT}
    depends_on:
      db:
        condition: service_healthy
    ports:
      - "${PUBLIC_PORT}:${INTERNAL_PORT}"   # 3040 -> 3000
    volumes:
      - ./data:/app/data
      - ./logs:/app/logs
      - ./browser_context:/app/browser_context

  scraper:
    build:
      context: .
      dockerfile: Dockerfile.scraper
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
      - ./data:/app/data
      - ./logs:/app/logs
      - ./browser_context:/app/browser_context
    # optional if scraper exposes metrics
    # ports:
    #   - "9304:9304"

volumes:
  db_data:
```

### 12.2 `Dockerfile.scraper` (Playwright with video/trace)

```dockerfile
FROM mcr.microsoft.com/playwright:v1.47.0-jammy
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY playwright ./playwright
COPY database ./database
COPY scripts ./scripts
ENV NODE_ENV=production
# Ensure folders exist
RUN mkdir -p /app/data /app/logs /app/browser_context
# default command kicks the scheduler/runner
CMD ["node", "playwright/scripts/scheduler.js"]
```

### 12.3 `Dockerfile.api`

```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY web/package*.json ./
RUN npm ci
COPY web .
ENV PORT=${INTERNAL_PORT}
CMD ["node", "server.js"]
```

------

## 13. Playwright Configuration (profiles + artifacts)

### 13.1 `playwright.config.ts`

```ts
import { defineConfig } from '@playwright/test';

const headless = process.env.HEADLESS === 'true';
const profile = process.env.PLAYWRIGHT_PROFILE || 'medium';

const sizes: Record<string, { width: number; height: number }> = {
  small:  {
    width: Number(process.env.PROFILE_SMALL_W || 1280),
    height: Number(process.env.PROFILE_SMALL_H || 720),
  },
  medium: {
    width: Number(process.env.PROFILE_MEDIUM_W || 1600),
    height: Number(process.env.PROFILE_MEDIUM_H || 900),
  },
  large:  {
    width: Number(process.env.PROFILE_LARGE_W || 1920),
    height: Number(process.env.PROFILE_LARGE_H || 1080),
  },
};

export default defineConfig({
  use: {
    headless,
    viewport: sizes[profile],
    video: 'on',           // always record video
    screenshot: 'on',      // always take screenshots
    trace: 'on',           // always keep trace with snapshots
  },
});
```

> **Note:** Even when not using the Playwright Test runner, the scraper should mirror these options in its script-level `browser.newContext({ viewport, recordVideo, ... })` to guarantee artifacts are always produced.

------

## 14. Batch Files (Windows)

### 14.1 Codegen launchers (save with profile in filename)

```
/scripts/run_codegen_small.bat
@echo off
set PLAYWRIGHT_PROFILE=small
set HEADLESS=false
set TS=%DATE%_%TIME%
set TS=%TS::=-%
set TS=%TS:/=-%
set TS=%TS: =_% 
npx playwright codegen https://teams.microsoft.com --viewport-size=%PROFILE_SMALL_W%x%PROFILE_SMALL_H% --save-storage=browser_context/state.json --output=playwright/recorded/recorded_small_%TS%.ts
/scripts/run_codegen_medium.bat
@echo off
set PLAYWRIGHT_PROFILE=medium
set HEADLESS=false
set TS=%DATE%_%TIME%
set TS=%TS::=-%
set TS=%TS:/=-%
set TS=%TS: =_% 
npx playwright codegen https://teams.microsoft.com --viewport-size=%PROFILE_MEDIUM_W%x%PROFILE_MEDIUM_H% --save-storage=browser_context/state.json --output=playwright/recorded/recorded_medium_%TS%.ts
/scripts/run_codegen_large.bat
@echo off
set PLAYWRIGHT_PROFILE=large
set HEADLESS=false
set TS=%DATE%_%TIME%
set TS=%TS::=-%
set TS=%TS:/=-%
set TS=%TS: =_% 
npx playwright codegen https://teams.microsoft.com --viewport-size=%PROFILE_LARGE_W%x%PROFILE_LARGE_H% --save-storage=browser_context/state.json --output=playwright/recorded/recorded_large_%TS%.ts
```

> **Note:** Codegen itself does not record videos; these launchers enforce viewport/profile and persist storage. The **production scraper** records video/screenshots/trace.

### 14.2 Scraper runners (execute converted scripts; always artifacts)

```
/scripts/run_scrape_small.bat
@echo off
set PLAYWRIGHT_PROFILE=small
set HEADLESS=true
node playwright/scripts/fetch_teams_chat_small.js
/scripts/run_scrape_medium.bat
@echo off
set PLAYWRIGHT_PROFILE=medium
set HEADLESS=true
node playwright/scripts/fetch_teams_chat_medium.js
/scripts/run_scrape_large.bat
@echo off
set PLAYWRIGHT_PROFILE=large
set HEADLESS=true
node playwright/scripts/fetch_teams_chat_large.js
```

------

## 15. Scheduler (inside scraper container)

- `SCRAPE_INTERVAL_MINUTES` controls cadence.
- Scheduler calls the **profiled** scraper (default uses `PLAYWRIGHT_PROFILE` from env).
- Each run writes:
  - `/logs/RUNID.log`
  - `/data/raw/<timestamp>_<RUNID>.json`
  - `/data/video/<RUNID>/*.webm`
  - `/data/trace/<RUNID>.zip`
  - DB row in `scrape_runs`.

------

## 16. Success & Acceptance Criteria

(unchanged, with the following **additions**)

- ✅ Compose stack starts **db**, **api** (internal 3000, published 3040), and **scraper**.
- ✅ `.env` toggles **HEADLESS** and selects **PROFILE** (`small|medium|large`).
- ✅ All scraper runs persist **screenshots**, **video**, and **trace** artifacts.
- ✅ Windows **.bat** scripts exist to run **codegen** and **scraper** for each profile.

------

## 17. Deliverables

- `docker-compose.yml`
- `Dockerfile.scraper`, `Dockerfile.api`
- `playwright/playwright.config.ts`
- `playwright/scripts/fetch_teams_chat_<profile>.ts` (+ `scheduler.js`)
- `scripts/run_codegen_{small,medium,large}.bat`
- `scripts/run_scrape_{small,medium,large}.bat`
- `web/server.js` (or `web/app.py`) listening on **3000**, published as **3040**
- `database/schema.sql`, importer
- `docs/PRD_MS_Teams_Chat_Collector.md` (this document)

------

## 18. Conclusion

The Teams Chat Collector runs as a **single Docker Compose stack**, publishing the UI/API on **port 3040** (internal 3000). Execution **profiles** (`small|medium|large`) and **headless/headed** mode are controlled via `.env`. **Artifacts (screenshots, video, trace snapshots)** are always recorded to support debugging and auditing. Windows **.bat** helpers streamline **codegen** and **scraper** execution per profile — fully aligned with your constraint of **Playwright-only** (no Graph/Power Automate).

**End of Document**

```

```