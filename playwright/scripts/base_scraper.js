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
                waitUntil: 'domcontentloaded',
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
