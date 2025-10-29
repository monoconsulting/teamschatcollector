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
