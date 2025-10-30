-- Add log_content column to scrape_runs table
USE teams_collector;

ALTER TABLE scrape_runs
ADD COLUMN log_content LONGTEXT DEFAULT NULL COMMENT 'Full log output from scraper run';
