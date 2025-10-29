/**
 * Logger Utility
 * Strukturerad loggning med Winston
 */

const winston = require('winston');
const path = require('path');
const fs = require('fs');

// Säkerställ att logs-mappen finns
const logsDir = path.join(__dirname, '../../logs');
if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
}

/**
 * Skapar en logger för specifik run
 */
function createLogger(runId) {
    const logFile = path.join(logsDir, `${runId}.log`);

    const logger = winston.createLogger({
        level: 'info',
        format: winston.format.combine(
            winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
            winston.format.errors({ stack: true }),
            winston.format.splat(),
            winston.format.json()
        ),
        defaultMeta: { runId },
        transports: [
            // File transport
            new winston.transports.File({
                filename: logFile,
                maxsize: 10485760, // 10MB
                maxFiles: 5
            }),
            // Console transport
            new winston.transports.Console({
                format: winston.format.combine(
                    winston.format.colorize(),
                    winston.format.printf(({ timestamp, level, message, runId, ...meta }) => {
                        let msg = `${timestamp} [${runId}] ${level}: ${message}`;
                        if (Object.keys(meta).length > 0) {
                            msg += ` ${JSON.stringify(meta)}`;
                        }
                        return msg;
                    })
                )
            })
        ]
    });

    logger.logPath = logFile;
    return logger;
}

module.exports = { createLogger };
