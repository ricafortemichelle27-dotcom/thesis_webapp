-- Run as a LOCAL MySQL administrator, once. Replace the password before executing.
-- Keep this schema on the kiosk, never on a central/replicated server.
CREATE DATABASE IF NOT EXISTS kiosk_local_db CHARACTER SET utf8mb4 COLLATE utf8mb4_bin;
CREATE USER 'kiosk_local_app'@'localhost' IDENTIFIED BY 'REPLACE_WITH_UNIQUE_RANDOM_PASSWORD';
GRANT SELECT, INSERT, UPDATE, DELETE ON kiosk_local_db.* TO 'kiosk_local_app'@'localhost';
-- Run npm run init with temporary KIOSK_DB_ADMIN_USER/PASSWORD for migrations.
-- The runtime account deliberately cannot create/drop/alter tables or access thesis_db.
