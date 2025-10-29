/**
 * Profile Management
 * Hanterar de tre profiler: small, medium, large
 */

require('dotenv').config();

const profiles = {
    small: {
        name: 'small',
        width: parseInt(process.env.PROFILE_SMALL_W) || 1280,
        height: parseInt(process.env.PROFILE_SMALL_H) || 720,
        deviceScaleFactor: 1,
    },
    medium: {
        name: 'medium',
        width: parseInt(process.env.PROFILE_MEDIUM_W) || 1600,
        height: parseInt(process.env.PROFILE_MEDIUM_H) || 900,
        deviceScaleFactor: 1,
    },
    large: {
        name: 'large',
        width: parseInt(process.env.PROFILE_LARGE_W) || 1920,
        height: parseInt(process.env.PROFILE_LARGE_H) || 1080,
        deviceScaleFactor: 1,
    }
};

/**
 * Hämtar profil-konfiguration
 */
function getProfile(profileName = null) {
    const name = profileName || process.env.PLAYWRIGHT_PROFILE || 'medium';

    if (!profiles[name]) {
        console.warn(`[Profile] Unknown profile '${name}', falling back to 'medium'`);
        return profiles.medium;
    }

    return profiles[name];
}

/**
 * Får alla tillgängliga profiler
 */
function getAllProfiles() {
    return Object.keys(profiles);
}

/**
 * Validerar profil namn
 */
function isValidProfile(profileName) {
    return profiles.hasOwnProperty(profileName);
}

module.exports = {
    getProfile,
    getAllProfiles,
    isValidProfile,
    profiles
};
