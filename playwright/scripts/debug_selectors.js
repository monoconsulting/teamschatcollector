/**
 * Debug Script - Inspekterar DOM-struktur i Teams
 * Kör detta för att se vilka selectors som faktiskt finns
 */

const { chromium } = require('playwright');
require('dotenv').config();

async function debugSelectors() {
    console.log('🔍 Starting selector debugging...\n');

    const browser = await chromium.launch({
        headless: false,
        args: ['--no-sandbox']
    });

    const contextOptions = {
        viewport: { width: 1600, height: 900 },
        storageState: 'E:/projects/TeamsCollector/browser_context/state.json'
    };

    const context = await browser.newContext(contextOptions);
    const page = await context.newPage();

    try {
        // Navigera till Teams
        console.log('📡 Navigating to Teams...');
        await page.goto('https://teams.microsoft.com', {
            waitUntil: 'domcontentloaded',
            timeout: 90000
        });
        await page.waitForTimeout(8000);

        // Öppna chat-panelen
        console.log('💬 Opening chat pane...');
        await page.waitForSelector('#chat-pane-list', { timeout: 30000 });
        await page.locator('#chat-pane-list').click();
        await page.waitForTimeout(2000);

        // Öppna chatten
        console.log('📂 Opening ÖSTHAMMAR chat...');
        const chatElement = page.getByTitle('ÖSTHAMMAR - SERVICEFÖNSTER', { exact: false });
        await chatElement.first().click();
        await page.waitForTimeout(3000);

        // Inspektera DOM-strukturen
        console.log('\n=== DOM INSPECTION ===\n');

        const analysis = await page.evaluate(() => {
            const results = {
                roleGroups: 0,
                chatPaneMessages: 0,
                articles: 0,
                timeElements: 0,
                authorElements: 0,
                timestampElements: 0,
                sampleMessages: []
            };

            // Räkna olika selectors
            results.roleGroups = document.querySelectorAll('[role="group"]').length;
            results.chatPaneMessages = document.querySelectorAll('[data-tid="chat-pane-message"]').length;
            results.articles = document.querySelectorAll('[role="article"]').length;
            results.timeElements = document.querySelectorAll('time[datetime]').length;
            results.authorElements = document.querySelectorAll('[id^="author-"]').length;
            results.timestampElements = document.querySelectorAll('[id^="timestamp-"]').length;

            // Hitta parent containers för time[datetime] elements
            const timeElements = document.querySelectorAll('time[datetime]');
            for (let i = 0; i < Math.min(5, timeElements.length); i++) {
                const timeEl = timeElements[i];

                // Gå uppåt i DOM-trädet för att hitta message container
                let container = timeEl.parentElement;
                let depth = 0;
                while (container && depth < 10) {
                    const hasAuthor = container.querySelector('[id^="author-"]');
                    const dataTid = container.getAttribute('data-tid');
                    const role = container.getAttribute('role');

                    if (hasAuthor || dataTid || role === 'group') {
                        results.sampleMessages.push({
                            depth,
                            containerTag: container.tagName,
                            dataTid: dataTid,
                            role: role,
                            timestamp: timeEl.getAttribute('datetime'),
                            hasAuthor: !!hasAuthor,
                            authorText: hasAuthor?.textContent?.trim(),
                            textContent: container.textContent?.substring(0, 100).trim() + '...'
                        });
                        break;
                    }

                    container = container.parentElement;
                    depth++;
                }
            }

            return results;
        });

        console.log('Selector Count:');
        console.log('  [role="group"]:', analysis.roleGroups);
        console.log('  [data-tid="chat-pane-message"]:', analysis.chatPaneMessages);
        console.log('  [role="article"]:', analysis.articles);
        console.log('  time[datetime]:', analysis.timeElements);
        console.log('  [id^="author-"]:', analysis.authorElements);
        console.log('  [id^="timestamp-"]:', analysis.timestampElements);

        console.log('\nSample Messages (first 5 with timestamps):');
        analysis.sampleMessages.forEach((msg, idx) => {
            console.log(`\n  Message ${idx + 1}:`);
            console.log(`    depth: ${msg.depth} levels up from <time>`);
            console.log(`    containerTag: ${msg.containerTag}`);
            console.log(`    data-tid: ${msg.dataTid || 'N/A'}`);
            console.log(`    role: ${msg.role || 'N/A'}`);
            console.log(`    timestamp: ${msg.timestamp}`);
            console.log(`    author: ${msg.authorText || 'N/A'}`);
            console.log(`    text: ${msg.textContent}`);
        });

        console.log('\n✅ Debug complete! Press Ctrl+C to exit or wait 30 seconds...');
        await page.waitForTimeout(30000);

    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await browser.close();
    }
}

debugSelectors().catch(console.error);
