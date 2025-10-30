/**
 * Manual Scrape Trigger
 * Körs när användaren manuellt triggar scraping via UI
 */

const { spawn } = require('child_process');
const path = require('path');

async function triggerScrape(profile = 'medium') {
    return new Promise((resolve, reject) => {
        console.log(`[TRIGGER] Starting manual scrape for profile: ${profile}`);

        const scriptPath = path.join(__dirname, `fetch_teams_chat_${profile}.js`);

        // Spawn scraper-process
        const scraper = spawn('node', [scriptPath], {
            cwd: path.join(__dirname, '../..'),
            env: {
                ...process.env,
                HEADLESS: 'true',  // Alltid headless vid manuell trigger
                PLAYWRIGHT_PROFILE: profile
            }
        });

        let output = '';
        let errorOutput = '';

        scraper.stdout.on('data', (data) => {
            const message = data.toString();
            console.log(`[SCRAPER] ${message}`);
            output += message;
        });

        scraper.stderr.on('data', (data) => {
            const message = data.toString();
            console.error(`[SCRAPER ERROR] ${message}`);
            errorOutput += message;
        });

        scraper.on('close', (code) => {
            if (code === 0) {
                console.log(`[TRIGGER] Scrape completed successfully`);
                resolve({
                    success: true,
                    message: 'Scraping completed successfully',
                    profile: profile,
                    output: output
                });
            } else {
                console.error(`[TRIGGER] Scrape failed with code ${code}`);
                reject({
                    success: false,
                    message: `Scraping failed with exit code ${code}`,
                    profile: profile,
                    error: errorOutput
                });
            }
        });

        scraper.on('error', (error) => {
            console.error(`[TRIGGER] Failed to start scraper:`, error);
            reject({
                success: false,
                message: 'Failed to start scraper',
                error: error.message
            });
        });
    });
}

module.exports = { triggerScrape };

// CLI support
if (require.main === module) {
    const profile = process.argv[2] || 'medium';

    triggerScrape(profile)
        .then(result => {
            console.log('Success:', result);
            process.exit(0);
        })
        .catch(error => {
            console.error('Failed:', error);
            process.exit(1);
        });
}
