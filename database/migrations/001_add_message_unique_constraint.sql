-- Migration: Add unique constraint for message deduplication
-- Version: 001
-- Date: 2025-10-29
-- Purpose: Stöd för idempotent batch upsert med ON DUPLICATE KEY UPDATE

USE teams_collector;

-- Lägg till UNIQUE index för att identifiera dubbletter
-- Baserat på: channel_name + timestamp + sender + message_text (hash)
--
-- OBSERVERA: Vi använder en hash av message_text istället för hela texten
-- eftersom MySQL har begränsningar för index-längd på LONGTEXT

ALTER TABLE chat_messages
ADD UNIQUE INDEX idx_message_fingerprint (
    channel_name,
    timestamp,
    sender,
    -- Vi kan inte indexera LONGTEXT direkt, så vi använder de första 255 tecknen
    -- och förlitar oss på att kombinationen channel+timestamp+sender+text-prefix är unik
    message_text(255)
);

-- Alternativ implementation om ovanstående ger problem:
-- CREATE INDEX idx_message_fingerprint ON chat_messages
-- (channel_name, timestamp, sender, (SUBSTRING(message_text, 1, 255)));
