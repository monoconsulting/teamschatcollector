-- Initial setup script
-- Körs automatiskt när MySQL container startar första gången

SOURCE /docker-entrypoint-initdb.d/schema.sql;

-- Skapa användare med rätt behörigheter
CREATE USER IF NOT EXISTS 'teams_user'@'%' IDENTIFIED BY 'SecurePassword123!';
GRANT ALL PRIVILEGES ON teams_collector.* TO 'teams_user'@'%';
FLUSH PRIVILEGES;

-- Verifiera
SELECT 'Database setup completed successfully!' as status;
