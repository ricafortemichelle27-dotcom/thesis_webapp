-- Explicit deployment migration. Never run automatically on backend startup.
-- The inspected thesis_db has no attendance table. Existing students/events are reused.
CREATE TABLE IF NOT EXISTS kiosk_attendance (
    id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    student_id INT NOT NULL,
    event_id INT NOT NULL,
    time_in DATETIME(3) NOT NULL COMMENT 'UTC',
    time_out DATETIME(3) NULL COMMENT 'UTC',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uq_kiosk_attendance_student_event (student_id, event_id),
    CONSTRAINT fk_kiosk_attendance_student FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE RESTRICT,
    CONSTRAINT fk_kiosk_attendance_event FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE RESTRICT,
    CONSTRAINT chk_kiosk_attendance_times CHECK(time_out IS NULL OR time_out >= time_in)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS kiosk_sync_receipts (
    kiosk_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
    operation_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
    request_sha256 CHAR(64) CHARACTER SET ascii NOT NULL,
    kind VARCHAR(32) NOT NULL,
    central_id INT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (kiosk_id, operation_id)
) ENGINE=InnoDB;
