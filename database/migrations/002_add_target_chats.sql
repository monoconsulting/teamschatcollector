-- Migration: Add target_chats table
-- Version: 1.1
-- Description: Databas-driven chat targets istället för hårdkodade listor

USE teams_collector;

-- Table: target_chats
-- Lagrar vilka chattar/kanaler som ska scrapas
CREATE TABLE IF NOT EXISTS target_chats (
    id INT PRIMARY KEY AUTO_INCREMENT,
    chat_name VARCHAR(255) NOT NULL UNIQUE,
    chat_type ENUM('channel', 'user', 'group') DEFAULT 'channel',
    profile ENUM('small', 'medium', 'large') DEFAULT 'medium',
    is_active TINYINT(1) DEFAULT 1,
    priority INT DEFAULT 0,

    -- Metadata
    notes TEXT DEFAULT NULL,
    last_scraped_at DATETIME DEFAULT NULL,
    total_messages INT DEFAULT 0,

    -- Soft delete support
    deleted_at DATETIME DEFAULT NULL,

    -- Timestamps
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    INDEX idx_active (is_active),
    INDEX idx_profile (profile),
    INDEX idx_deleted (deleted_at),
    INDEX idx_priority (priority)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Lägg till befintlig chat som exempel
INSERT INTO target_chats (chat_name, chat_type, profile, is_active, notes)
VALUES ('ÖSTHAMMAR - SERVICEFÖNSTER', 'channel', 'medium', 1, 'Befintlig kanal från hårdkodad lista')
ON DUPLICATE KEY UPDATE updated_at = CURRENT_TIMESTAMP;
