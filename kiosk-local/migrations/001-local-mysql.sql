-- DDL is restartable; the migration runner records its checksum only after all statements succeed.
CREATE TABLE IF NOT EXISTS kiosk_metadata (
    singleton TINYINT NOT NULL PRIMARY KEY CHECK(singleton = 1),
    kiosk_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL UNIQUE,
    created_at CHAR(24) CHARACTER SET ascii NOT NULL,
    backend_origin VARCHAR(2048),
    protocol_version INT NOT NULL DEFAULT 1 CHECK(protocol_version = 1),
    template_key_id VARCHAR(100),
    template_key_check VARBINARY(32),
    CHECK((template_key_id IS NULL AND template_key_check IS NULL) OR
          (template_key_id IS NOT NULL AND OCTET_LENGTH(template_key_check) = 32))
) ENGINE=InnoDB;
CREATE TABLE IF NOT EXISTS students (
    local_student_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin PRIMARY KEY,
    central_student_id INT UNIQUE CHECK(central_student_id > 0),
    student_id VARCHAR(50) NOT NULL UNIQUE,
    lastname VARCHAR(100) NOT NULL, firstname VARCHAR(100) NOT NULL, middlename VARCHAR(100), suffix VARCHAR(20),
    department VARCHAR(100) NOT NULL, major_program VARCHAR(150), year_level VARCHAR(30),
    status VARCHAR(8) NOT NULL DEFAULT 'active' CHECK(status IN ('active','inactive')),
    central_updated_at VARCHAR(32), cached_at CHAR(24) CHARACTER SET ascii NOT NULL,
    created_locally TINYINT NOT NULL DEFAULT 0 CHECK(created_locally IN (0,1))
) ENGINE=InnoDB;
CREATE TABLE IF NOT EXISTS events (
    central_event_id INT PRIMARY KEY CHECK(central_event_id > 0),
    event_name VARCHAR(200) NOT NULL, event_date DATE NOT NULL,
    time_start TIME NOT NULL, time_end TIME NOT NULL, location VARCHAR(255),
    status VARCHAR(8) NOT NULL CHECK(status IN ('pending','approved','declined','deleted')),
    event_description TEXT, kiosk_theme_mode VARCHAR(6) NOT NULL DEFAULT 'wis' CHECK(kiosk_theme_mode IN ('wis','custom')),
    event_logo VARCHAR(500), background_display_photo VARCHAR(500), photobooth_start TIME, photobooth_end TIME,
    central_updated_at VARCHAR(32), cached_at CHAR(24) CHARACTER SET ascii NOT NULL
) ENGINE=InnoDB;
CREATE TABLE IF NOT EXISTS event_eligibility (
    central_eligibility_id INT PRIMARY KEY CHECK(central_eligibility_id > 0),
    central_event_id INT NOT NULL,
    department VARCHAR(100) NOT NULL, major_program VARCHAR(150), year_level VARCHAR(50),
    INDEX eligibility_event(central_event_id),
    FOREIGN KEY (central_event_id) REFERENCES events(central_event_id) ON DELETE CASCADE
) ENGINE=InnoDB;
CREATE TABLE IF NOT EXISTS event_speakers (
    central_speaker_id INT PRIMARY KEY CHECK(central_speaker_id > 0),
    central_event_id INT NOT NULL,
    speaker_name VARCHAR(200), speaker_photo VARCHAR(500), speaker_description TEXT, speaker_order INT NOT NULL,
    INDEX speakers_event(central_event_id, speaker_order),
    FOREIGN KEY (central_event_id) REFERENCES events(central_event_id) ON DELETE CASCADE
) ENGINE=InnoDB;
CREATE TABLE IF NOT EXISTS fingerprint_templates (
    local_template_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin PRIMARY KEY,
    local_student_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
    finger_position TINYINT NOT NULL CHECK(finger_position BETWEEN 1 AND 10),
    template_format VARCHAR(100) NOT NULL, sdk_version VARCHAR(100) NOT NULL,
    key_id VARCHAR(100) NOT NULL, ciphertext MEDIUMBLOB NOT NULL,
    nonce VARBINARY(12) NOT NULL CHECK(OCTET_LENGTH(nonce) = 12),
    auth_tag VARBINARY(16) NOT NULL CHECK(OCTET_LENGTH(auth_tag) = 16),
    enrolled_at CHAR(24) CHARACTER SET ascii NOT NULL,
    UNIQUE(local_student_id, finger_position),
    CHECK(OCTET_LENGTH(ciphertext) BETWEEN 1 AND 1048576),
    FOREIGN KEY (local_student_id) REFERENCES students(local_student_id) ON DELETE RESTRICT
) ENGINE=InnoDB;
CREATE TABLE IF NOT EXISTS attendance (
    local_attendance_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin PRIMARY KEY,
    central_attendance_id INT UNIQUE CHECK(central_attendance_id > 0),
    local_student_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
    central_event_id INT NOT NULL,
    time_in CHAR(24) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
    time_out CHAR(24) CHARACTER SET ascii COLLATE ascii_bin,
    UNIQUE(local_student_id, central_event_id),
    CHECK(time_out IS NULL OR time_out >= time_in),
    INDEX attendance_event(central_event_id),
    FOREIGN KEY (local_student_id) REFERENCES students(local_student_id) ON DELETE RESTRICT,
    FOREIGN KEY (central_event_id) REFERENCES events(central_event_id) ON DELETE RESTRICT
) ENGINE=InnoDB;
-- Only typed references; template bytes have no outbox payload column.
CREATE TABLE IF NOT EXISTS sync_outbox (
    sequence_id BIGINT UNSIGNED AUTO_INCREMENT UNIQUE,
    operation_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin PRIMARY KEY,
    kind VARCHAR(32) NOT NULL CHECK(kind IN ('student.register','attendance.in','attendance.out')),
    local_student_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin,
    local_attendance_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin,
    state VARCHAR(8) NOT NULL DEFAULT 'pending' CHECK(state IN ('pending','inflight','acked','conflict')),
    attempts INT NOT NULL DEFAULT 0 CHECK(attempts >= 0),
    next_attempt_at BIGINT NOT NULL DEFAULT 0,
    lease_token CHAR(36) CHARACTER SET ascii COLLATE ascii_bin, lease_until BIGINT,
    last_error_code VARCHAR(64), created_at CHAR(24) CHARACTER SET ascii NOT NULL,
    acknowledged_at CHAR(24) CHARACTER SET ascii,
    CHECK((kind = 'student.register' AND local_student_id IS NOT NULL AND local_attendance_id IS NULL)
       OR (kind != 'student.register' AND local_student_id IS NULL AND local_attendance_id IS NOT NULL)),
    UNIQUE(kind, local_student_id), UNIQUE(kind, local_attendance_id),
    INDEX outbox_ready(state, next_attempt_at, lease_until),
    FOREIGN KEY (local_student_id) REFERENCES students(local_student_id) ON DELETE RESTRICT,
    FOREIGN KEY (local_attendance_id) REFERENCES attendance(local_attendance_id) ON DELETE RESTRICT
) ENGINE=InnoDB;
CREATE TABLE IF NOT EXISTS sync_metadata (
    scope VARCHAR(128) CHARACTER SET ascii COLLATE ascii_bin PRIMARY KEY,
    snapshot_cursor CHAR(24) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
    last_success_at CHAR(24) CHARACTER SET ascii NOT NULL
) ENGINE=InnoDB;
