#!/usr/bin/env node
/**
 * Manual Scrape Runner
 * Kör scraping i headless mode via API trigger
 */

const { spawn } = require('child_process');
const path = require('path');

// Hämta profile från command line argument (default: medium)
const profile = process.argv[2] || 'medium';

// Validera profile
if (!['small', 'medium', 'large'].includes(profile)) {
    console.error(`[Manual] Invalid profile: ${profile}`);
    console.error(`[Manual] Valid profiles: small, medium, large`);
    process.exit(1);
}

const scriptPath = path.join(__dirname, `fetch_teams_chat_${profile}.js`);

console.log(`[Manual] Starting headless scrape for profile: ${profile}`);

// Kör scraper med HEADLESS=true
const child = spawn('node', [scriptPath], {
    env: {
        ...process.env,
        HEADLESS: 'true',  // Tvinga headless mode
        PLAYWRIGHT_PROFILE: profile
    },
    stdio: 'inherit'  // Visa output direkt
});

child.on('close', (code) => {
    console.log(`[Manual] Scrape completed with exit code: ${code}`);
    process.exit(code);
});

child.on('error', (error) => {
    console.error(`[Manual] Failed to start scrape:`, error);
    process.exit(1);
});
