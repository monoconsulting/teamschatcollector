# TEAMS COLLECTOR - ANVÄNDARMANUAL

## Innehållsförteckning
1. [Översikt](#översikt)
2. [Snabbstart](#snabbstart)
3. [Installation och Setup](#installation-och-setup)
4. [Användning - Steg för Steg](#användning---steg-för-steg)
5. [Profiler (Small, Medium, Large)](#profiler-small-medium-large)
6. [Felsökning](#felsökning)
7. [Avancerad Användning](#avancerad-användning)
8. [FAQ](#faq)

---

## Översikt

**Teams Collector** är ett automatiserat system för att samla in Microsoft Teams-chattloggar direkt från webbgränssnittet med hjälp av Playwright browser automation. Systemet kräver **INTE** Microsoft Graph API eller Power Automate.

### Vad gör systemet?

1. **Öppnar Teams i en webbläsare** (Chromium via Playwright)
2. **Spelar in dina navigeringsåtgärder** för att hitta rätt chat
3. **Konverterar inspelningen** till ett produktionsskript
4. **Kör automatiskt** enligt schema för att extrahera chattmeddelanden
5. **Sparar data** i MySQL-databas och JSON-filer
6. **Visar resultat** via webbgränssnitt på port 3040

### Systemkomponenter

| Komponent | Beskrivning | Port |
|-----------|-------------|------|
| **MySQL Database** | Lagrar chat-meddelanden och körningshistorik | 3306 |
| **Web API/UI** | Dashboard för att visa data | 3040 |
| **Playwright Scraper** | Automatiserad chattinsamling | - |
| **Scheduler** | Kör scraper enligt intervall | - |

---

## Snabbstart

### Förutsättningar

- **Windows 10/11**
- **Docker Desktop** installerat och igång
- **Node.js 18+** installerat
- **Git** installerat
- **Microsoft Teams** tillgång (webbversion)

### 5-Minuters Setup

```bash
# 1. Klona projektet (om inte redan gjort)
cd E:\projects\TeamsCollector

# 2. Installera dependencies
npm install

# 3. Konfigurera .env (redigera vid behov)
# Filen finns redan - kontrollera portar och lösenord

# 4. Starta Docker-stacken
scripts\docker_start.bat

# 5. Vänta tills alla containers är healthy (~30 sekunder)
docker ps

# 6. Öppna Dashboard
# Surfa till: http://localhost:3040
```

**Klart!** Systemet är nu igång. Nästa steg är att spela in din första scraping-session.

---

## Installation och Setup

### Steg 1: Verifiera Förutsättningar

```bash
# Kontrollera Node.js version
node --version
# Output: v20.x.x eller högre

# Kontrollera npm
npm --version
# Output: 10.x.x eller högre

# Kontrollera Docker Desktop
docker --version
# Output: Docker version 24.x.x eller högre

# Kontrollera docker-compose
docker-compose --version
# Output: Docker Compose version v2.x.x eller högre
```

### Steg 2: Installera Node Dependencies

```bash
# I projektroten
npm install

# I web-mappen (för API)
cd web
npm install
cd ..
```

**Viktigt:** Kör `npm install` i **båda** mapparna!

### Steg 3: Konfigurera .env

Filen `.env` finns redan i projektroten. Öppna och granska:

```env
# Portar (ÄNDRA ALDRIG utan tillåtelse!)
PUBLIC_PORT=3040
INTERNAL_PORT=3000

# Teams URL
TEAMS_URL=https://teams.microsoft.com

# Playwright inställningar
HEADLESS=true                    # false = se webbläsaren
PLAYWRIGHT_PROFILE=medium        # small|medium|large

# Database (MySQL)
DB_HOST=db
DB_PORT=3306
DB_NAME=teams_collector
DB_USER=teams_user
DB_PASSWORD=SecurePassword123!   # ⚠️ ÄNDRA DETTA!
MYSQL_ROOT_PASSWORD=RootPassword456!  # ⚠️ ÄNDRA DETTA!

# Scheduler
SCRAPE_INTERVAL_MINUTES=30       # Hur ofta scraper körs
```

**Rekommendation:** Ändra lösenorden innan första körningen!

### Steg 4: Starta Docker-stacken

```bash
# Alternativ 1: Använd batch-filen
scripts\docker_start.bat

# Alternativ 2: Manuellt
docker-compose up -d
```

**Vänta tills alla containers är healthy:**

```bash
docker ps
```

Du ska se:
- ✅ `teams_collector_db` - Status: Up (healthy)
- ✅ `teams_collector_api` - Status: Up (healthy)
- ✅ `teams_collector_scraper` - Status: Up (healthy)

### Steg 5: Verifiera Installation

```bash
# Testa API health endpoint
curl http://localhost:3040/health

# Output: {"status":"ok","timestamp":"...","port":"3000"}
```

**Öppna Dashboard i webbläsare:**
```
http://localhost:3040
```

Du ska se Teams Collector Dashboard med stats och listor (tomma första gången).

---

## Användning - Steg för Steg

### STEG 1: Spela in din första navigering (Codegen)

**Vad är Codegen?**
Codegen är Playwrights verktyg för att spela in dina webbläsaråtgärder och generera kod automatiskt.

**Kör Codegen:**

```bash
# Använd en av de förenklade bat-filerna i roten:
.\codegen_small.bat
.\codegen_medium.bat    # Rekommenderad
.\codegen_large.bat

# Eller använd scripts-mappen:
scripts\run_codegen_medium.bat
```

**Vad händer nu?**

1. En **Chromium-webbläsare öppnas** (headed mode)
2. **Playwright Inspector** öppnas bredvid
3. Webbläsaren navigerar till `https://teams.microsoft.com`
4. **DU tar över kontrollen**

**Dina åtgärder:**

1. **Logga in** på Teams (om inte redan inloggad)
2. **Navigera** till den chat du vill samla in från
   - Klicka på "Chat" i vänstermenyn
   - Välj en specifik konversation eller kanal
3. **Scrolla** lite i chatthistoriken (så Playwright ser strukturen)
4. **Stäng webbläsaren** när du är klar

**Resultat:**

En fil skapas: `playwright/recorded/recorded_medium_YYYY-MM-DD_HH-mm-ss.ts`

**Exempel på inspelad fil:**

```typescript
import { test, expect } from '@playwright/test';

test('test', async ({ page }) => {
  await page.goto('https://teams.microsoft.com/');
  await page.getByRole('button', { name: 'Chat' }).click();
  await page.getByText('Min Konversation').click();
  // ... fler actions ...
});
```

### STEG 2: Konvertera till Produktionsskript

Den inspelade filen är en **grundmall** men behöver konverteras till ett produktionsskript.

**Manuell konvertering:**

Se `playwright/CODEGEN_CONVERSION_GUIDE.md` för detaljerad guide.

**AI-assisterad konvertering (rekommenderat):**

Be din AI-assistent (som mig!) att:
1. Läsa den inspelade filen
2. Extrahera selectors
3. Implementera `extractMessages()` metoden
4. Lägga till scrolling och pagination
5. Skapa ett komplett produktionsskript

**Produktionsskriptet ska vara:**
- `playwright/scripts/fetch_teams_chat_small.js`
- `playwright/scripts/fetch_teams_chat_medium.js`
- `playwright/scripts/fetch_teams_chat_large.js`

### STEG 3: Kör Manuell Test av Scraper

När produktionsskriptet är klart, testa det:

```bash
# Sätt HEADLESS=false i .env för att se vad som händer
# Redigera .env: HEADLESS=false

# Kör scraper manuellt
scripts\run_scrape_medium.bat
```

**Vad händer nu?**

1. En webbläsare öppnas (om HEADLESS=false)
2. Navigerar till Teams
3. Utför dina inspelade åtgärder
4. Extraherar chattmeddelanden
5. Sparar data

**Kontrollera resultat:**

```bash
# Loggar
dir logs\

# JSON-data
dir data\raw\

# Video
dir data\video\

# Trace (för debugging)
dir data\trace\

# Database
# Öppna http://localhost:3040 och se nya meddelanden
```

### STEG 4: Aktivera Automatisk Schemalagd Körning

När manuell test fungerar, aktivera scheduler:

**Scheduler är redan igång!** (körs i `teams_collector_scraper` container)

**Kontrollera scheduler-loggar:**

```bash
scripts\docker_logs.bat

# Eller specifikt för scraper:
docker logs -f teams_collector_scraper
```

**Output ska visa:**

```
[Scheduler] Teams Chat Scraper Scheduler
[Scheduler] Configuration:
  - Interval: 30 minutes
  - Profile: medium
  - Headless: true
[Scheduler] Running initial scrape...
[Scheduler] Starting scrape run run_medium_2025-10-29T...
```

**Scheduler körs automatiskt enligt:**
- **Intervall:** `SCRAPE_INTERVAL_MINUTES` från `.env` (default 30 min)
- **Profil:** `PLAYWRIGHT_PROFILE` från `.env` (default medium)

### STEG 5: Övervaka och Granska Data

**Web Dashboard:**
```
http://localhost:3040
```

Dashboard visar:
- Antal runs
- Antal meddelanden
- Lista över runs med status
- Lista över senaste meddelanden

**API Endpoints:**

```bash
# Hämta alla runs
curl http://localhost:3040/runs

# Hämta alla meddelanden
curl http://localhost:3040/messages

# Hämta specifik run
curl http://localhost:3040/runs/<RUN_ID>

# Sök i meddelanden
curl "http://localhost:3040/search?q=projekt"

# Filtrera på kanal
curl "http://localhost:3040/messages?channel=Min+Kanal"
```

**Database Direct Access:**

```bash
# Anslut till MySQL
docker exec -it teams_collector_db mysql -uteams_user -pSecurePassword123!

# Kör queries
USE teams_collector;
SELECT COUNT(*) FROM chat_messages;
SELECT * FROM scrape_runs ORDER BY started_at DESC LIMIT 5;
```

---

## Profiler (Small, Medium, Large)

### Vad är Profiler?

Profiler styr webbläsarens **viewport-storlek** (upplösning). Detta påverkar hur Teams renderar sitt gränssnitt och kan påverka vilka element som är synliga.

### Tillgängliga Profiler

| Profil | Upplösning | Användning |
|--------|------------|-----------|
| **small** | 1280x720 | Laptops, små skärmar |
| **medium** | 1600x900 | Desktop, standard (REKOMMENDERAD) |
| **large** | 1920x1080 | Stora skärmar, high-res |

### Konfigurera Profiler

I `.env`:

```env
PLAYWRIGHT_PROFILE=medium

PROFILE_SMALL_W=1280
PROFILE_SMALL_H=720
PROFILE_MEDIUM_W=1600
PROFILE_MEDIUM_H=900
PROFILE_LARGE_W=1920
PROFILE_LARGE_H=1080
```

### Använda Olika Profiler

**Vid Codegen:**
```bash
.\codegen_small.bat      # Använder small profil
.\codegen_medium.bat     # Använder medium profil
.\codegen_large.bat      # Använder large profil
```

**Vid Scraping:**
```bash
scripts\run_scrape_small.bat
scripts\run_scrape_medium.bat
scripts\run_scrape_large.bat
```

**Tips:** Om Teams gränssnitt ser annorlunda ut på olika enheter, spela in med flera profiler och skapa separata scrapers för varje.

---

## Felsökning

### Problem 1: Containers startar inte

**Symptom:**
```bash
docker ps
# teams_collector_api visar "Restarting"
```

**Lösning:**
```bash
# Kolla loggar
docker logs teams_collector_api

# Vanliga orsaker:
# 1. Port 3040 redan upptagen
# 2. Database inte healthy än
# 3. Dependencies saknas

# Fixa:
docker-compose down
docker-compose build --no-cache api
docker-compose up -d
```

### Problem 2: "Module not found" fel

**Symptom:**
```
Error: Cannot find module 'mysql2'
```

**Lösning:**
```bash
# Installera dependencies igen
npm install
cd web && npm install && cd ..

# Bygg om containers
docker-compose build --no-cache
docker-compose up -d
```

### Problem 3: Playwright selectors fungerar inte

**Symptom:**
Scraper hittar inga meddelanden eller kraschar.

**Lösning:**

1. **Kör i headed mode:**
   ```env
   # I .env
   HEADLESS=false
   ```

2. **Kör codegen igen:**
   ```bash
   .\codegen_medium.bat
   ```

3. **Inspektera Teams DOM:**
   - Högerklicka → "Inspect"
   - Hitta message-element
   - Notera nya selectors

4. **Uppdatera produktionsskriptet**

### Problem 4: Session expirerar / Behöver logga in igen

**Symptom:**
Scraper visar login-skärm istället för Teams.

**Lösning:**

1. **Kör i headed mode:**
   ```env
   HEADLESS=false
   ```

2. **Kör codegen igen** och logga in:
   ```bash
   .\codegen_medium.bat
   ```

3. **Session sparas** i `browser_context/state.json`

4. **Kör scraper igen:**
   ```bash
   scripts\run_scrape_medium.bat
   ```

### Problem 5: Port 3040 redan upptagen

**Symptom:**
```
Error: bind: address already in use
```

**Lösning:**

```bash
# Kontrollera vad som använder porten
netstat -ano | findstr :3040

# OM det är en annan Teams Collector instans:
docker ps
docker stop <container_id>

# OM det är något annat:
# ALDRIG använd taskkill!
# FRÅGA först vad som använder porten
# Ändra port i .env (kräver tillåtelse enligt regler)
```

### Problem 6: Inga meddelanden extraheras

**Symptom:**
Scraper kör utan fel men 0 meddelanden i database.

**Lösning:**

1. **Kontrollera att extractMessages() är implementerad:**
   ```bash
   # Öppna filen
   notepad playwright\scripts\fetch_teams_chat_medium.js

   # Kolla om extractMessages() innehåller faktisk kod
   # eller bara "TODO: Implementera"
   ```

2. **Kör i headed mode och inspektera:**
   ```env
   HEADLESS=false
   ```

3. **Kolla trace-filer:**
   ```bash
   # Öppna trace viewer
   npx playwright show-trace data\trace\<RUN_ID>.zip
   ```

4. **Uppdatera selectors baserat på faktisk DOM-struktur**

---

## Avancerad Användning

### Ändra Scraping-intervall

```env
# I .env
SCRAPE_INTERVAL_MINUTES=15   # Kör var 15:e minut
```

**Starta om scraper-container:**
```bash
docker-compose restart scraper
```

### Scrapa Flera Kanaler

**Alternativ 1: En Scraper per Kanal**

Skapa separata scrapers:
- `fetch_teams_chat_kanal1.js`
- `fetch_teams_chat_kanal2.js`

Kör manuellt eller schemalägg med olika intervall.

**Alternativ 2: Loop i Ett Script**

Modifiera produktionsskriptet för att loopa genom flera kanaler.

### Exportera Data

**JSON Export:**
```bash
# Data finns redan i JSON-format
dir data\raw\

# Kopiera för backup
xcopy data\raw\ backup\raw\ /E /I /Y
```

**SQL Export:**
```bash
# Anslut till database
docker exec teams_collector_db mysqldump -uteams_user -pSecurePassword123! teams_collector > backup.sql
```

**CSV Export via API:**

Skriv ett enkelt script:
```javascript
const messages = await fetch('http://localhost:3040/messages?limit=1000').then(r => r.json());
// Konvertera till CSV...
```

### Backup och Restore

**Backup:**
```bash
# Database
docker exec teams_collector_db mysqldump -uteams_user -pSecurePassword123! teams_collector > backup_$(date +%Y%m%d).sql

# Data-filer
xcopy data\ backup\data\ /E /I /Y
xcopy logs\ backup\logs\ /E /I /Y
xcopy browser_context\ backup\browser_context\ /E /I /Y
```

**Restore:**
```bash
# Database
docker exec -i teams_collector_db mysql -uteams_user -pSecurePassword123! teams_collector < backup_20251029.sql

# Data-filer
xcopy backup\data\ data\ /E /I /Y
```

### Prestanda-optimering

**Tips:**

1. **Minska scraping-frekvens** om inte realtid behövs
   ```env
   SCRAPE_INTERVAL_MINUTES=60  # En gång i timmen
   ```

2. **Begränsa antal meddelanden** per körning (i produktionsskriptet)
   ```javascript
   await this.scrollToLoadMore(selector, 5);  // Bara 5 scrolls
   ```

3. **Använd headless mode**
   ```env
   HEADLESS=true  # Snabbare
   ```

4. **Database-indexering**
   - Indexes finns redan i schema.sql
   - Fulltext search optimerad

---

## FAQ

### Q: Behöver jag Microsoft Graph API eller admin-rättigheter?

**A:** NEJ! Systemet använder bara webbgränssnittet precis som när du använder Teams manuellt. Ingen API eller admin-access krävs.

### Q: Är det säkert? Kan Microsoft blockera mig?

**A:** Systemet simulerar en vanlig användare som surfar på Teams. Men:
- ⚠️ Kontrollera din organisations policy
- ⚠️ Använd rimliga intervall (inte var minut)
- ⚠️ Logga endast in på chatter du har access till

### Q: Fungerar det med privata meddelanden och kanaler?

**A:** Ja, om du har access till dem manuellt kan scriptet också samla in från dem.

### Q: Hur många meddelanden kan systemet hantera?

**A:** Testet på tusentals meddelanden. MySQL och JSON-storage skalerar bra. Begränsning är främst disk-space.

### Q: Kan jag köra flera instanser samtidigt?

**A:** Nej, inte utan att ändra portar. En instans kan dock scrapa flera kanaler.

### Q: Vad händer om Teams uppdaterar sitt gränssnitt?

**A:** Selectors kan brytas. Lösning:
1. Kör codegen igen
2. Uppdatera selectors i produktionsskriptet
3. Testa

### Q: Kan jag schemalägga olika profiler på olika tider?

**A:** Inte direkt med nuvarande scheduler. Men du kan:
- Köra scheduler med en profil
- Manuellt köra andra profiler med bat-filer
- Eller skapa en custom scheduler

### Q: Hur raderar jag data?

**A:** Soft delete används:
```sql
UPDATE chat_messages SET deleted_at = NOW() WHERE id = 123;
```

**ALDRIG hard delete:**
```sql
-- FÖRBJUDET!
-- DELETE FROM chat_messages WHERE id = 123;
```

### Q: Kan jag använda på Mac/Linux?

**A:** Ja, men:
- Byt ut `.bat` filer mot `.sh` scripts
- Docker Compose fungerar på alla plattformar
- Node.js och Playwright fungerar cross-platform

---

## Support och Bidrag

### Dokumentation

- **PRD:** `TEAMS_COLLECTOR_PRD.md` - Produktspecifikation
- **Implementation Plan:** `TEAMS_COLLECTOR_IMPLEMENTATION_PLAN.md` - Teknisk plan
- **CLAUDE.md:** Instruktioner för AI-assistenter
- **Denna guide:** `USER_GUIDE.md`

### Troubleshooting

1. Kolla loggar: `docker logs teams_collector_scraper`
2. Kolla traces: `npx playwright show-trace data/trace/<RUN_ID>.zip`
3. Kör i headed mode: `HEADLESS=false`

### Community

För buggar och feature requests, skapa issue i GitHub repo (om det finns).

---

## Snabbreferens - Kommandon

```bash
# Starta systemet
scripts\docker_start.bat

# Stoppa systemet
scripts\docker_stop.bat

# Visa loggar
scripts\docker_logs.bat

# Spela in navigering
.\codegen_medium.bat

# Kör manuell scraping
scripts\run_scrape_medium.bat

# Kontrollera status
docker ps

# Testa API
curl http://localhost:3040/health

# Öppna Dashboard
start http://localhost:3040
```

---

**Lycka till med din Teams-chattinsamling!** 🚀

Om du stöter på problem, kolla först Felsöknings-sektionen eller loggarna.
