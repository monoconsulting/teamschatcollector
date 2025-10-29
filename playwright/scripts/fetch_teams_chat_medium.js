/**
 * Teams Chat Scraper - Medium Profile
 * Konverterad från: recorded_medium_0-29-5--20_20-06-57.ts
 *
 * Target Chattar: Tommy Stigsson, Mattias Cederlund
 *
 * Strategi:
 * 1. Navigera till Teams (session state används för autentisering)
 * 2. Öppna Chat-panelen
 * 3. För varje målchat:
 *    - Öppna chatten
 *    - Scrolla bakåt för att ladda historik (inkrementellt)
 *    - Extrahera alla meddelanden med metadata
 *    - Spara till DB (batch upsert, idempotent)
 */

const BaseScraper = require('./base_scraper');
const { getPool } = require('../../database/connection');

/**
 * Centraliserade selectors
 * Källa: codegen recorded_medium_0-29-5--20_20-06-57.ts
 */
const SELECTORS = {
    // Chat navigation
    CHAT_PANE_LIST: '#chat-pane-list',              // Huvudlista med chattar (rad 21 i codegen)

    // Message containers
    MESSAGE_LIST: '[data-tid="virtual-repeat"]',     // Virtualiserad meddelande-container
    MESSAGE_ITEM: '[data-tid="chat-pane-message"]',  // Individuella meddelanden

    // Message metadata
    AUTHOR_ID_PREFIX: '#author-',                    // Author IDs (rad 31, 36, 42 etc i codegen)
    TIMESTAMP_ID_PREFIX: '#timestamp-',              // Timestamp IDs (rad 34, 37, 39 etc)

    // Alternativa selectors
    MESSAGE_TEXT_CONTAINER: '[data-tid="message-body"]',
    MESSAGE_SENDER_NAME: '[data-tid="message-author-name"]',
    MESSAGE_TIME: 'time[datetime]',                  // ISO timestamp i datetime-attribut

    // Chat header (för att få chat-namn)
    CHAT_HEADER: '[id^="chat-header"]',
    CHAT_TITLE: '[data-tid="chat-header-title"]'
};

class TeamsScraperMedium extends BaseScraper {
    constructor() {
        super('medium');

        // Målchattar att skrapa
        // OBS: Använd exakta namn från Teams UI (kolla i codegen-filen)
        this.targetChats = [
            'ÖSTHAMMAR - SERVICEFÖNSTER'  // Från recorded_medium_0-29-5--20_20-06-57.ts rad 22
        ];

        // Max scrolls för medium profile (från .prompts/convert.prompt.md)
        this.maxScrolls = parseInt(process.env.MAX_SCROLLS) || 15;
    }

    /**
     * Hämtar senaste kända timestamp för en specifik chat från DB
     * För inkrementell insamling
     */
    async getLastKnownTimestamp(chatName) {
        try {
            const pool = getPool();
            const query = `
                SELECT MAX(timestamp) as last_timestamp
                FROM chat_messages
                WHERE channel_name = ? AND deleted_at IS NULL
            `;

            const [rows] = await pool.execute(query, [chatName]);

            if (rows && rows[0] && rows[0].last_timestamp) {
                this.logger.info(`Last known timestamp for "${chatName}":`, rows[0].last_timestamp);
                return new Date(rows[0].last_timestamp);
            }

            this.logger.info(`No previous messages found for "${chatName}"`);
            return null;

        } catch (error) {
            this.logger.error('Failed to get last known timestamp', {
                chat: chatName,
                error: error.message
            });
            return null;
        }
    }

    /**
     * Öppnar chat-panelen och väntar på att den laddas
     */
    async openChatPane() {
        try {
            this.logger.info('Opening chat pane');

            // Vänta på att chat-listan finns
            await this.page.waitForSelector(SELECTORS.CHAT_PANE_LIST, {
                timeout: 30000,
                state: 'visible'
            });

            // Klicka på chat-panelen för att säkerställa den är aktiv
            await this.page.locator(SELECTORS.CHAT_PANE_LIST).click();
            await this.page.waitForTimeout(1000);

            this.logger.info('Chat pane opened successfully');
            return true;

        } catch (error) {
            this.logger.error('Failed to open chat pane', { error: error.message });

            // Ta screenshot för debugging
            await this.page.screenshot({
                path: `E:/projects/TeamsCollector/data/screenshots/${this.runId}_chat_pane_error.png`
            });

            throw error;
        }
    }

    /**
     * Öppnar en specifik chat baserat på namn
     */
    async openChat(chatName) {
        try {
            this.logger.info(`Opening chat: "${chatName}"`);

            // Använd getByTitle från codegen (rad 22)
            const chatElement = this.page.getByTitle(chatName, { exact: false });

            // Kolla om chatten finns
            const count = await chatElement.count();
            if (count === 0) {
                this.logger.warn(`Chat "${chatName}" not found in chat list`);
                return false;
            }

            // Klicka på chatten
            await chatElement.first().click();

            // Vänta på att meddelandeområdet laddas
            await this.page.waitForTimeout(2000);

            // Verifiera att chat-headern finns
            const headerVisible = await this.page.locator(SELECTORS.CHAT_HEADER).isVisible();
            if (!headerVisible) {
                this.logger.warn(`Chat header not visible for "${chatName}"`);
            }

            this.logger.info(`Chat "${chatName}" opened successfully`);
            return true;

        } catch (error) {
            this.logger.error(`Failed to open chat "${chatName}"`, { error: error.message });

            // Ta screenshot
            await this.page.screenshot({
                path: `E:/projects/TeamsCollector/data/screenshots/${this.runId}_open_chat_${chatName.replace(/\s+/g, '_')}_error.png`
            });

            return false;
        }
    }

    /**
     * Scrollar för att ladda äldre meddelanden
     * Stoppar när vi når lastKnownTimestamp eller maxScrolls
     */
    async scrollToLoadHistory(chatName, lastKnownTimestamp) {
        this.logger.info(`Scrolling to load history for "${chatName}"`, {
            maxScrolls: this.maxScrolls,
            lastKnown: lastKnownTimestamp
        });

        let scrollCount = 0;
        let reachedBoundary = false;

        try {
            // Hitta scroll-container (vanligtvis meddelande-listan)
            const scrollContainer = await this.page.locator('[data-tid="chat-messages-list"], [role="log"]').first();

            while (scrollCount < this.maxScrolls && !reachedBoundary) {
                // Scrolla till toppen av containern
                await scrollContainer.evaluate(el => {
                    el.scrollTop = 0;
                });

                // Vänta på att nya meddelanden laddas
                await this.page.waitForTimeout(1500);

                // Kolla om vi nått lastKnownTimestamp
                if (lastKnownTimestamp) {
                    reachedBoundary = await this.hasReachedTimestampBoundary(lastKnownTimestamp);
                    if (reachedBoundary) {
                        this.logger.info(`Reached lastKnown timestamp boundary after ${scrollCount} scrolls`);
                        break;
                    }
                }

                scrollCount++;
                this.logger.info(`Scroll ${scrollCount}/${this.maxScrolls} completed`);
            }

            return scrollCount;

        } catch (error) {
            this.logger.error('Scrolling failed', { error: error.message });
            return scrollCount;
        }
    }

    /**
     * Kollar om äldsta synliga meddelandet är äldre än lastKnownTimestamp
     */
    async hasReachedTimestampBoundary(lastKnownTimestamp) {
        try {
            // Hämta alla synliga timestamps
            const timestamps = await this.page.locator('time[datetime]').evaluateAll(elements => {
                return elements.map(el => el.getAttribute('datetime')).filter(Boolean);
            });

            if (timestamps.length === 0) return false;

            // Hitta äldsta timestamp
            const oldestTimestamp = new Date(Math.min(...timestamps.map(t => new Date(t).getTime())));

            // Om äldsta synliga meddelandet är äldre än lastKnown, har vi nått boundary
            return oldestTimestamp <= lastKnownTimestamp;

        } catch (error) {
            this.logger.error('Failed to check timestamp boundary', { error: error.message });
            return false;
        }
    }

    /**
     * Extraherar alla meddelanden från den öppna chatten
     */
    async extractMessagesFromChat(chatName, lastKnownTimestamp) {
        this.logger.info(`Extracting messages from "${chatName}"`);

        const extractedMessages = [];

        try {
            // Vänta på att meddelanden finns
            await this.page.waitForSelector('time[datetime]', { timeout: 10000 });

            // Extrahera alla meddelanden via page.evaluate för bättre prestanda
            // STRATEGI: Börja med time[datetime] elements och gå upp till parent container
            const messages = await this.page.evaluate(() => {
                const result = [];
                const seenTimestamps = new Set(); // Dedup

                // Hitta alla time elements (20 st enligt debug)
                const timeElements = document.querySelectorAll('time[datetime]');

                timeElements.forEach(timeEl => {
                    try {
                        const timestamp = timeEl.getAttribute('datetime');
                        if (!timestamp || seenTimestamps.has(timestamp)) return;
                        seenTimestamps.add(timestamp);

                        // Extrahera timestamp ID för att hitta matchande content och author
                        const timestampId = timeEl.getAttribute('id'); // t.ex. "timestamp-1761770666052"
                        if (!timestampId) return;

                        // Extrahera message ID från timestamp ID
                        const messageId = timestampId.replace('timestamp-', ''); // t.ex. "1761770666052"

                        // Hitta content div med id="content-{messageId}"
                        const contentDiv = document.getElementById(`content-${messageId}`);
                        if (!contentDiv) return;

                        // Extrahera meddelandetext från content div
                        let messageText = contentDiv.textContent?.trim() || '';
                        if (!messageText || messageText.length === 0) return;

                        // Extrahera avsändare från author element med id="author-{messageId}"
                        let sender = 'Mattias Cederlund'; // Default till dig själv
                        const authorElement = document.getElementById(`author-${messageId}`);
                        if (authorElement) {
                            // Om author-element finns, är det från någon annan
                            sender = authorElement.textContent.trim();
                        }

                        // Extrahera thread_id om det finns (från parent container)
                        let threadId = null;
                        const messageBody = document.getElementById(`message-body-${messageId}`);
                        if (messageBody) {
                            const threadAttr = messageBody.getAttribute('data-tid');
                            if (threadAttr && threadAttr.includes('thread')) {
                                threadId = threadAttr;
                            }
                        }

                        result.push({
                            sender,
                            message_text: messageText,
                            timestamp,
                            thread_id: threadId
                        });

                    } catch (err) {
                        console.error('Failed to extract message:', err);
                    }
                });

                return result;
            });

            // Filtrera meddelanden baserat på lastKnownTimestamp (inkrementell logik)
            for (const msg of messages) {
                const msgTimestamp = new Date(msg.timestamp);

                // Om vi har lastKnown och meddelandet är äldre eller lika, hoppa över
                if (lastKnownTimestamp && msgTimestamp <= lastKnownTimestamp) {
                    continue;
                }

                extractedMessages.push({
                    sender: msg.sender,
                    message_text: msg.message_text,
                    timestamp: msgTimestamp,
                    channel_name: chatName,
                    thread_id: msg.thread_id
                });
            }

            this.logger.info(`Extracted ${extractedMessages.length} new messages from "${chatName}"`, {
                total: messages.length,
                new: extractedMessages.length,
                filtered: messages.length - extractedMessages.length
            });

            return extractedMessages;

        } catch (error) {
            this.logger.error(`Failed to extract messages from "${chatName}"`, {
                error: error.message,
                stack: error.stack
            });

            // Ta screenshot för debugging
            await this.page.screenshot({
                path: `E:/projects/TeamsCollector/data/screenshots/${this.runId}_extract_error_${chatName.replace(/\s+/g, '_')}.png`
            });

            return extractedMessages;
        }
    }

    /**
     * Huvudmetod för att extrahera meddelanden från alla målchattar
     */
    async extractMessages() {
        this.logger.info('Starting message extraction (MEDIUM profile)', {
            targetChats: this.targetChats,
            maxScrolls: this.maxScrolls
        });

        try {
            // 1. Öppna chat-panelen
            await this.openChatPane();

            // 2. Iterera genom alla målchattar
            for (const chatName of this.targetChats) {
                this.logger.info(`Processing chat: "${chatName}"`);

                try {
                    // 2a. Hämta lastKnown timestamp för inkrementell insamling
                    const lastKnownTimestamp = await this.getLastKnownTimestamp(chatName);

                    // 2b. Öppna chatten
                    const opened = await this.openChat(chatName);
                    if (!opened) {
                        this.logger.warn(`Skipping chat "${chatName}" - could not open`);
                        continue;
                    }

                    // 2c. Scrolla för att ladda historik
                    await this.scrollToLoadHistory(chatName, lastKnownTimestamp);

                    // 2d. Extrahera meddelanden
                    const chatMessages = await this.extractMessagesFromChat(chatName, lastKnownTimestamp);

                    // 2e. Lägg till i total messages-array
                    this.messages.push(...chatMessages);

                    this.logger.info(`Completed processing "${chatName}"`, {
                        messagesExtracted: chatMessages.length,
                        totalMessages: this.messages.length
                    });

                    // Paus mellan chattar för att undvika rate limits
                    await this.page.waitForTimeout(2000);

                } catch (error) {
                    this.logger.error(`Failed to process chat "${chatName}"`, {
                        error: error.message
                    });

                    // Fortsätt med nästa chat trots fel
                    continue;
                }
            }

            this.logger.info('Message extraction completed', {
                totalChatsProcessed: this.targetChats.length,
                totalMessagesExtracted: this.messages.length
            });

        } catch (error) {
            this.logger.error('Message extraction failed', {
                error: error.message,
                stack: error.stack
            });
            throw error;
        }
    }

    /**
     * Override run() för custom flow
     */
    async run() {
        try {
            const initialized = await this.initialize();
            if (!initialized) return false;

            await this.navigateToTeams();

            // Vänta på att Teams UI laddas helt
            await this.page.waitForTimeout(5000);

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
