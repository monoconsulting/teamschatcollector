/**
 * Artifact Management
 * Hanterar screenshots, video, och trace artifacts
 */

const path = require('path');
const fs = require('fs');

/**
 * Skapar artifact-strukturen för en run
 */
function createArtifactPaths(runId) {
    const basePath = path.join(__dirname, '../../data');

    const paths = {
        video: path.join(basePath, 'video', runId),
        trace: path.join(basePath, 'trace'),
        screenshots: path.join(basePath, 'screenshots', runId),
        raw: path.join(basePath, 'raw')
    };

    // Skapa alla directories
    Object.values(paths).forEach(dir => {
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
    });

    return {
        videoDir: paths.video,
        traceFile: path.join(paths.trace, `${runId}.zip`),
        screenshotDir: paths.screenshots,
        jsonFile: path.join(paths.raw, `${runId}.json`)
    };
}

/**
 * Browser context options med artifacts ALLTID aktiverade
 */
function getBrowserContextOptions(runId, profile) {
    const artifacts = createArtifactPaths(runId);

    const headless = process.env.HEADLESS === 'true';

    return {
        viewport: {
            width: profile.width,
            height: profile.height
        },
        deviceScaleFactor: profile.deviceScaleFactor || 1,

        // ⚠️ KRITISKT: ALLTID spela in artifacts
        recordVideo: {
            dir: artifacts.videoDir,
            size: {
                width: profile.width,
                height: profile.height
            }
        },

        // Storage state för persistent session
        storageState: process.env.USER_DATA_DIR
            ? path.join(process.env.USER_DATA_DIR, 'state.json')
            : undefined,

        // Andra options
        ignoreHTTPSErrors: true,
        javaScriptEnabled: true,

        headless: headless
    };
}

/**
 * Sparar JSON data
 */
function saveJsonData(runId, data) {
    const artifacts = createArtifactPaths(runId);
    fs.writeFileSync(
        artifacts.jsonFile,
        JSON.stringify(data, null, 2),
        'utf-8'
    );
    return artifacts.jsonFile;
}

/**
 * Får relativa paths för DB storage
 */
function getRelativePaths(runId) {
    return {
        log_path: `/logs/${runId}.log`,
        video_path: `/data/video/${runId}/`,
        trace_path: `/data/trace/${runId}.zip`
    };
}

module.exports = {
    createArtifactPaths,
    getBrowserContextOptions,
    saveJsonData,
    getRelativePaths
};
