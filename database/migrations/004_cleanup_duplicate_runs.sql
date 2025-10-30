-- Clean up duplicate scrape_runs entries
-- Problem: base_scraper and scheduler both created runs, causing duplicates
-- Solution: Remove orphaned "running" entries that never completed

USE teamslog;

-- Delete scrape_runs that are stuck in 'running' status and have no completed_at
-- These are the ones created by base_scraper that were never updated
DELETE FROM scrape_runs
WHERE status = 'running'
  AND completed_at IS NULL
  AND id LIKE 'run_medium_%'
  AND started_at < DATE_SUB(NOW(), INTERVAL 1 HOUR);

-- Show remaining runs for verification
SELECT
    id,
    started_at,
    completed_at,
    status,
    message_count
FROM scrape_runs
ORDER BY started_at DESC
LIMIT 20;
