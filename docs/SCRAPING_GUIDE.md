# Guide: Lägga till nya kanaler eller chattar att scrapa

## Steg-för-steg guide

### 1. Spela in ny kanal/chat med Codegen

Codegen är Playwright's inspelningsverktyg som låter dig manuellt navigera i Teams medan det spelar in alla dina klick och selectors.

**Kör codegen för din valda profil:**

```bash
# För medium viewport (1600x900) - rekommenderat
scripts\run_codegen_medium.bat

# För small viewport (1280x720)
scripts\run_codegen_small.bat

# För large viewport (1920x1080)
scripts\run_codegen_large.bat
```

**Vad händer:**
- En webbläsare öppnas med Playwright Inspector
- Navigera till Teams (du kan behöva logga in första gången)
- **Gör följande manuellt:**
  1. Klicka på Chat-ikonen i sidomenyn
  2. Leta upp den kanal/chat du vill scrapa i chatlistan
  3. Klicka på den
  4. Scrolla lite i meddelandehistoriken
  5. Notera viktiga element:
     - Chat-namn/title
     - Meddelande-containers
     - Avsändarnamn
     - Tidsstämplar
     - Meddelandetext

**Output:**
Filen sparas i: `playwright/recorded/recorded_medium_YYYY-MM-DD_HH-mm-ss.ts`

---

### 2. Analysera den inspelade filen

Öppna den inspelade filen och identifiera:

**A. Chat-namn/titel:**
```typescript
// Exempel från inspelning:
await page.locator('#chat-pane-list').getByRole('button', {
    name: 'ÖSTHAMMAR - SERVICEFÖNSTER'
}).click();
```
→ Chat-namnet är: `"ÖSTHAMMAR - SERVICEFÖNSTER"`

**B. Viktiga selectors:**
- Message containers (oftast `[data-tid="chat-pane-message"]`)
- Author elements (oftast `#author-{id}`)
- Timestamp elements (oftast `#timestamp-{id}` eller `time[datetime]`)
- Message text (oftast `[data-tid="message-body"]`)

---

### 3. Lägg till i produktionsskriptet

Öppna lämplig profil-fil:
- `playwright/scripts/fetch_teams_chat_small.js`
- `playwright/scripts/fetch_teams_chat_medium.js`
- `playwright/scripts/fetch_teams_chat_large.js`

**Hitta `targetChats` arrayen (ca rad 52):**

```javascript
this.targetChats = [
    'ÖSTHAMMAR - SERVICEFÖNSTER'  // Befintlig chat
];
```

**Lägg till din nya chat:**

```javascript
this.targetChats = [
    'ÖSTHAMMAR - SERVICEFÖNSTER',  // Befintlig chat
    'Tommy Stigsson',              // Ny användarchat
    'Min nya kanal'                // Ny kanal
];
```

⚠️ **VIKTIGT:**
- Använd **exakt samma namn** som visas i Teams UI
- Namn är case-sensitive!
- Skriv namnet exakt som det står i codegen-filen

---

### 4. Uppdatera selectors (om nödvändigt)

Om din nya chat har annorlunda struktur:

**A. Jämför med befintliga selectors (ca rad 24-44):**

```javascript
const SELECTORS = {
    CHAT_PANE_LIST: '#chat-pane-list',
    MESSAGE_LIST: '[data-tid="virtual-repeat"]',
    MESSAGE_ITEM: '[data-tid="chat-pane-message"]',
    // ... etc
};
```

**B. Om selectors skiljer sig:**
- Anteckna nya selectors från codegen-filen
- Uppdatera `SELECTORS`-objektet
- Eller lägg till chat-specifika selectors

---

### 5. Testa scraping manuellt

**Kör scraper för din profil:**

```bash
# För medium
scripts\run_scrape_medium.bat

# För small
scripts\run_scrape_small.bat

# För large
scripts\run_scrape_large.bat
```

**Vad händer:**
1. Scraped öppnar Teams (headed mode om `HEADLESS=false`)
2. Försöker öppna varje chat i `targetChats`
3. Scrollar och extraherar meddelanden
4. Sparar till databas

**Kontrollera:**
- Loggar i: `logs/run_medium_YYYY-MM-DD....log`
- Video i: `data/video/run_medium_YYYY-MM-DD.../`
- Trace i: `data/trace/run_medium_YYYY-MM-DD....zip`
- Databas: Öppna http://localhost:3040 → Messages

---

### 6. Verifiera i databasen

**Via Web UI:**
```
http://localhost:3040
```
- Gå till "Messages" fliken
- Se om din nya kanal dyker upp i listan
- Klicka på den och kontrollera meddelanden

**Via PhpMyAdmin:**
```
http://localhost:8080
```
- Database: `teamslog`
- Table: `chat_messages`
- Filtrera: `WHERE channel_name = 'Din nya kanal'`

---

## Felsökning

### Problem: "Chat inte hittad"

**Orsak:** Chat-namnet matchar inte exakt

**Lösning:**
1. Kör codegen igen
2. Anteckna exakt namn från `getByRole('button', { name: '...' })`
3. Uppdatera `targetChats` med exakt samma namn

---

### Problem: "Inga meddelanden extraheras"

**Orsak:** Selectors är fel för denna chat

**Lösning:**
1. Öppna trace-filen: `data/trace/run_medium_....zip`
2. Ladda upp på: https://trace.playwright.dev
3. Inspektera DOM-strukturen
4. Uppdatera selectors i skriptet

---

### Problem: "Selector har fel struktur"

**Orsak:** Teams UI kan variera mellan chat-typer

**Lösning:**
Använd debug-skriptet:
```bash
node playwright/scripts/debug_selectors.js
```

Detta öppnar Teams och loggar alla hittade selectors.

---

## Automatisk schemaläggning

När dina nya chattar fungerar manuellt kommer de automatiskt inkluderas i:

**Scheduler** (kör var 30:e minut som default):
```javascript
// playwright/scripts/scheduler.js
// Körs automatiskt av scraper-containern
```

**Inställningar i `.env`:**
```bash
SCRAPE_INTERVAL_MINUTES=30    # Hur ofta scraper körs
PLAYWRIGHT_PROFILE=medium     # Vilken profil som används
HEADLESS=true                 # Headless mode (true i produktion)
```

---

## Exempel: Lägga till en användarchat

### 1. Kör codegen
```bash
scripts\run_codegen_medium.bat
```

### 2. I Teams:
- Klicka på Chat
- Sök upp "Tommy Stigsson"
- Klicka på chatten
- Scrolla lite

### 3. Notera från codegen-filen:
```typescript
await page.getByRole('button', { name: 'Tommy Stigsson' }).click();
```

### 4. Lägg till i fetch_teams_chat_medium.js:
```javascript
this.targetChats = [
    'ÖSTHAMMAR - SERVICEFÖNSTER',
    'Tommy Stigsson'  // ← NY CHAT
];
```

### 5. Testa:
```bash
scripts\run_scrape_medium.bat
```

### 6. Verifiera på http://localhost:3040

---

## Exempel: Lägga till en Teams-kanal

Samma process som användarchat, men kanal-namn inkluderar ofta prefix:

```javascript
this.targetChats = [
    'ÖSTHAMMAR - SERVICEFÖNSTER',
    'IT Support - Generellt',      // Kanal med prefix
    'Project X - Planning'         // Annan kanal
];
```

---

## Best Practices

✅ **GÖR:**
- Använd exakta namn från codegen
- Testa en chat i taget först
- Kontrollera loggar efter varje körning
- Spara trace-filer för felsökning

❌ **UNDVIK:**
- Ändra för många chattar samtidigt
- Skippa manual testning innan automatisering
- Använda för höga `MAX_SCROLLS` (kan ta lång tid)
- Ta bort gamla chattar utan att verifiera först

---

## Support

Om du stöter på problem:

1. **Kolla loggar:** `logs/run_medium_*.log`
2. **Visa trace:** Ladda upp `.zip` från `data/trace/` till https://trace.playwright.dev
3. **Kolla video:** Öppna `.webm` från `data/video/`
4. **Debug mode:** Sätt `HEADLESS=false` i `.env` för att se vad som händer

---

## Sammanfattning

```
1. Kör codegen → Spela in navigation
2. Identifiera chat-namn från inspelning
3. Lägg till i targetChats[]
4. Testa manuellt med run_scrape_*.bat
5. Verifiera i webbgränssnittet
6. Scheduler hämtar automatiskt nya chattar
```

🎉 Klart!
