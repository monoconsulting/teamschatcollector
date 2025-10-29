-- Teams Collector Database Schema
-- Version: 1.0
-- OBSERVERA: Endast soft delete tillåts!

CREATE DATABASE IF NOT EXISTS teams_collector
CHARACTER SET utf8mb4
COLLATE utf8mb4_unicode_ci;

USE teams_collector;

-- Table: chat_messages
-- Lagrar individuella chat-meddelanden
CREATE TABLE IF NOT EXISTS chat_messages (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    sender VARCHAR(255) NOT NULL,
    message_text LONGTEXT NOT NULL,
    timestamp DATETIME NOT NULL,
    channel_name VARCHAR(255),
    thread_id VARCHAR(255) DEFAULT NULL,
    scrape_run_id VARCHAR(64) NOT NULL,
    raw_json JSON DEFAULT NULL,

    -- Soft delete support (ALDRIG hard delete!)
    deleted_at DATETIME DEFAULT NULL,

    -- Metadata
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    -- Indexes för performance
    INDEX idx_scrape_run (scrape_run_id),
    INDEX idx_timestamp (timestamp),
    INDEX idx_channel (channel_name),
    INDEX idx_sender (sender),
    INDEX idx_deleted (deleted_at),

    -- Fulltext search
    FULLTEXT INDEX idx_message_search (message_text)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table: scrape_runs
-- Lagrar metadata om varje scraping-körning
CREATE TABLE IF NOT EXISTS scrape_runs (
    id VARCHAR(64) PRIMARY KEY,
    started_at DATETIME NOT NULL,
    completed_at DATETIME DEFAULT NULL,
    status ENUM('running', 'success', 'failed') NOT NULL DEFAULT 'running',
    profile ENUM('small', 'medium', 'large') NOT NULL DEFAULT 'medium',
    headless TINYINT(1) NOT NULL DEFAULT 1,
    message_count INT DEFAULT 0,
    error_message TEXT DEFAULT NULL,

    -- Artifact paths
    log_path VARCHAR(512),
    video_path VARCHAR(512),
    trace_path VARCHAR(512),

    -- Soft delete support
    deleted_at DATETIME DEFAULT NULL,

    -- Metadata
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    INDEX idx_started (started_at),
    INDEX idx_status (status),
    INDEX idx_profile (profile)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table: scrape_errors
-- Loggar errors för debugging
CREATE TABLE IF NOT EXISTS scrape_errors (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    scrape_run_id VARCHAR(64),
    error_type VARCHAR(100),
    error_message TEXT,
    stack_trace TEXT,
    occurred_at DATETIME DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (scrape_run_id) REFERENCES scrape_runs(id),
    INDEX idx_run (scrape_run_id),
    INDEX idx_occurred (occurred_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
