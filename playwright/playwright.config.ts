/**
 * Playwright Configuration
 * Hanterar tre profiler: small, medium, large
 * Stöder headless/headed mode via env
 * ALLTID spelar in screenshots, video, och trace
 */

import { defineConfig, devices } from '@playwright/test';
import * as dotenv from 'dotenv';

// Ladda environment variables
dotenv.config();

// Hämta konfiguration från env
const headless = process.env.HEADLESS === 'true';
const profile = process.env.PLAYWRIGHT_PROFILE || 'medium';

// Profile size definitions
interface ProfileSize {
    width: number;
    height: number;
}

const profiles: Record<string, ProfileSize> = {
    small: {
        width: Number(process.env.PROFILE_SMALL_W) || 1280,
        height: Number(process.env.PROFILE_SMALL_H) || 720,
    },
    medium: {
        width: Number(process.env.PROFILE_MEDIUM_W) || 1600,
        height: Number(process.env.PROFILE_MEDIUM_H) || 900,
    },
    large: {
        width: Number(process.env.PROFILE_LARGE_W) || 1920,
        height: Number(process.env.PROFILE_LARGE_H) || 1080,
    },
};

// Välj rätt profil
const selectedProfile = profiles[profile] || profiles.medium;

console.log(`[Playwright Config] Profile: ${profile}, Headless: ${headless}`);
console.log(`[Playwright Config] Viewport: ${selectedProfile.width}x${selectedProfile.height}`);

export default defineConfig({
    testDir: './scripts',

    // Timeout settings
    timeout: 5 * 60 * 1000, // 5 minuter per test
    expect: {
        timeout: 10000 // 10 sekunder för assertions
    },

    // Parallellisering
    fullyParallel: false,
    forbidOnly: !!process.env.CI,
    retries: process.env.CI ? 2 : 0,
    workers: 1, // Endast en worker för att undvika race conditions

    // Reporter
    reporter: [
        ['list'],
        ['json', { outputFile: '../logs/test-results.json' }]
    ],

    // Shared settings för alla tests
    use: {
        // Base URL
        baseURL: process.env.TEAMS_URL || 'https://teams.microsoft.com',

        // Headless mode från env
        headless: headless,

        // Viewport baserat på profil
        viewport: selectedProfile,

        // ⚠️ KRITISKT: ALLTID spela in artifacts
        screenshot: 'on',  // Alltid ta screenshots
        video: 'on',       // Alltid spela in video
        trace: 'on',       // Alltid spara trace med snapshots

        // Browser context options
        ignoreHTTPSErrors: true,

        // Timeouts
        actionTimeout: 30000,
        navigationTimeout: 60000,

        // Persistent context för att behålla sessions
        storageState: process.env.USER_DATA_DIR
            ? `${process.env.USER_DATA_DIR}/state.json`
            : undefined,
    },

    // Projects (profiler)
    projects: [
        {
            name: 'small',
            use: {
                ...devices['Desktop Chrome'],
                viewport: profiles.small,
            },
        },
        {
            name: 'medium',
            use: {
                ...devices['Desktop Chrome'],
                viewport: profiles.medium,
            },
        },
        {
            name: 'large',
            use: {
                ...devices['Desktop Chrome'],
                viewport: profiles.large,
            },
        },
    ],
});
