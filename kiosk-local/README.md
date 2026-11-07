# Kiosk local MySQL database

The kiosk uses **MySQL/InnoDB on the kiosk machine**, accessed by a trusted Node process through `mysql2/promise`. The default database is `kiosk_local_db`. It is separate from backend-thesis's central `thesis_db`; the kiosk never connects directly to central MySQL. No browser/Vite code receives database credentials, fingerprint templates, or encryption keys.

The development machine has been initialized at `127.0.0.1:3306`, using MySQL 8.0.46 and the restricted `kiosk_local_app` account. The unique kiosk identity and DPAPI template key were retained. The previous SQLite database was inspected read-only: students, events, fingerprints, attendance and outbox were all empty. Its unused file was left untouched outside the repository. There is no SQLite driver, SQL dialect, migration, or test dependency in the current implementation, and no automatic import of arbitrary legacy files.

## Requirements and first-time setup

- Node 24.15+ (24.x), `npm install` (or `npm ci` with the included lockfile).
- Local MySQL 8.0.16+ with InnoDB, strict SQL mode, and `innodb_flush_log_at_trx_commit=1`. Startup checks these settings; MariaDB and older MySQL versions are rejected.
- Windows DPAPI under a dedicated kiosk account. Other operating systems must supply an OS-protected key provider; there is no plaintext key fallback.
- MySQL must remain available on the kiosk during offline operation. Configure the MySQL service to start with Windows. Offline here means the central backend/network can be unavailable; it does not mean MySQL can be stopped.

On a new kiosk:

1. Install a local MySQL service. Bind it to loopback and restrict its data directory and backup files to the service account/administrators. Do not replicate, dump, or ship this local database to a central service. In development, local and central schemas may share a machine's MySQL instance; a deployed kiosk needs its own local service.
2. As a **local** administrator, run `setup/local-mysql.sql` after replacing its placeholder password. This creates `kiosk_local_db` and grants its runtime account only SELECT, INSERT, UPDATE and DELETE on that schema. It does not grant central-schema access or runtime DDL privileges.
3. Provision the variables in `.env.example` through the service environment. Alternatively copy the example to `%LOCALAPPDATA%\ThesisKiosk\mysql.env` with access restricted to the kiosk Windows account and SYSTEM. This file is outside the repository/OneDrive. `KIOSK_CONFIG_FILE` can select a different protected file. Explicit process environment variables take precedence.
4. From `kiosk-local`, run `npm ci`, then `npm run init`. For the first migration only, supply `KIOSK_DB_ADMIN_USER` and `KIOSK_DB_ADMIN_PASSWORD` for a local schema migration account with CREATE/DDL privileges. The database itself must already exist. Remove those two administrator variables afterward; do not store central/root credentials in the runtime configuration.
5. Run `npm run init` again using only the runtime account to verify setup. Existing migrations are checked without issuing DDL. The supplied Windows initializer restricts the `ThesisKiosk` directory ACL to the current account and SYSTEM and creates/reuses its protected template key.

Existing central configuration is the reference for `mysql2/promise`, environment loading and central field types, but `backend-thesis/.env` is **never loaded by the local application**. Local provisioning and tests used existing local administrator access without copying those administrator credentials into runtime files.

## Configuration

| Variable | Meaning |
| --- | --- |
| `KIOSK_DB_HOST` | Default `127.0.0.1`; only loopback allowed. `localhost` is normalized to `127.0.0.1`. |
| `KIOSK_DB_PORT` | Local MySQL port, default `3306`. |
| `KIOSK_DB_NAME` | Default `kiosk_local_db`; names must start with `kiosk_local_`. `thesis_db` is rejected. |
| `KIOSK_DB_USER`, `KIOSK_DB_PASSWORD` | Required, separate local runtime credentials. No fallback to central `DB_*` variables. |
| `KIOSK_DB_ADMIN_USER`, `KIOSK_DB_ADMIN_PASSWORD` | Optional one-time migration credentials; runtime connections still use `KIOSK_DB_USER`. |
| `KIOSK_CONFIG_FILE` | Optional explicit environment-file path; default is `%LOCALAPPDATA%\ThesisKiosk\mysql.env`. |
| `KIOSK_BACKEND_ORIGIN` | Backend HTTPS origin; HTTP allowed only on loopback for development. |
| `KIOSK_SYNC_TOKEN` | Separate random backend API credential, at least 32 characters, matching the receiver configuration. |
| `KIOSK_EVENT_IDS`, `KIOSK_STUDENT_IDS` | Comma-separated **central integer IDs** to initially cache. Previously cached IDs are refreshed automatically. |
| `KIOSK_TEST_DB_USER`, `KIOSK_TEST_DB_PASSWORD` | Separate test credentials with privileges to create/drop isolated test schemas. Never give these privileges to the runtime account. |
| `KIOSK_BRIDGE_PORT` | Loopback scanner bridge port, default `5182`. |
| `KIOSK_UI_ORIGINS` | Exact allowed kiosk UI origins, default `http://localhost:5174,http://127.0.0.1:5174`. No wildcard origins are accepted. |

The current machine's local runtime credentials are already in `%LOCALAPPDATA%\ThesisKiosk\mysql.env`; secrets are not included in this documentation. Backend origin/token are not fabricated or copied from central database credentials. Configure them before live synchronization.

## Schema and relationships

All tables use InnoDB and enforced foreign keys/checks. MySQL migrations use a named migration lock and restartable DDL because MySQL DDL implicitly commits. The version and source checksum are recorded only after the schema and singleton identity are complete. A mismatched/newer migration fails closed; application startup never silently edits the schema.

| Table | Important fields and relationships |
| --- | --- |
| `schema_migrations` | Version, SHA-256 migration checksum, application time. |
| `kiosk_metadata` | Singleton kiosk UUID, creation time, protocol version, bound backend origin, key ID and keyed verification value. Also provides a transaction row lock for local writers. |
| `students` | `local_student_id` UUID PK; nullable unique `central_student_id` maps to central `students.id`; unique `student_id` is the school student number. Names, department, program, year, status, source/cache timestamps, local-origin flag. |
| `events` | `central_event_id` PK maps to `events.id`. Name, DATE/TIME fields, location, approval/deletion status, display text/theme, image URLs, photobooth times, source/cache timestamps. |
| `event_eligibility` | Existing central eligibility ID, local event FK, department and optional program/year. |
| `event_speakers` | Existing central speaker ID, local event FK, name, photo URL, description, order. |
| `fingerprint_templates` | Local template UUID, local student FK, finger position, format/SDK version, key ID, encrypted MEDIUMBLOB, 12-byte nonce, 16-byte authentication tag, enrollment time. Unique student/finger. |
| `attendance` | Local attendance UUID, nullable unique central attendance ID, local student FK, central event FK, UTC time-in/time-out. Unique student/event; time-out cannot precede time-in. |
| `sync_outbox` | Stable operation UUID, sequence number, constrained operation kind, student or attendance FK, pending/inflight/acked/conflict state, attempt count, retry timestamp, lease token/expiry, sanitized error code and acknowledgement time. No generic payload or biometric field. |
| `sync_metadata` | Hashed scope identifier, snapshot cursor, last successful application time. Per-entity scopes reject stale snapshots; per-selection scopes track successful pages. |

Central IDs stay signed INTs compatible with the inspected central primary keys. Local IDs are UUID strings in `CHAR(36)` with binary ASCII comparison; they never occupy central integer columns. All FKs stay inside the local schema; central ID relationships are logical mappings verified during sync. Existing names/string lengths follow the central schema. UTC ISO timestamps use fixed-width ASCII strings for lossless millisecond round trips; retry/lease times are BIGINT Unix milliseconds. The central attendance receiver retains its existing UTC `DATETIME(3)` representation. Event dates/times retain the project's Philippine wall-clock meaning.

Only the required student and selected-event data are cached. Users, email, approval/certificate documents, certificates and the legacy central `students.biometric_data` field are excluded. Image URLs are cached, but image file downloading remains a separate offline asset-cache concern.

## Fingerprint encryption and key protection

`crypto.js` retains AES-256-GCM with fresh random nonces and 128-bit authentication tags. Its authenticated metadata binds a template to its local template/student UUIDs, finger position, format, SDK version and key ID. Templates are encrypted **before** they are passed as MySQL parameters; local MySQL receives ciphertext only. Tampered bytes or metadata fail authentication. Template metadata listings exclude ciphertext and plaintext.

The random 256-bit encryption key remains at `%LOCALAPPDATA%\ThesisKiosk\keys\templates.dpapi`, protected by Windows DPAPI `CurrentUser` and restrictive Windows ACLs. It is not stored in MySQL, in `mysql.env`, in Vite variables, or in Git. Existing protected keys are reused. A keyed verification value bound to the kiosk UUID detects a wrong key even when no fingerprints remain. If an initialized database's key file is missing, initialization refuses to create a replacement. Owned temporary plaintext/key buffers are cleared after use; the caller must clear its original SDK buffer after awaited enrollment.

Only the trusted local scanner process can call the decrypt callback. There is no HTTP endpoint exporting fingerprints. The unchanged shared wire contract allows only `student.register`, `attendance.in`, and `attendance.out`; central routes reject extra fields. Neither plaintext nor encrypted templates are synchronized to backend-thesis or central MySQL.

Student names, attendance and template metadata are not application-encrypted. Protect the local MySQL service/data directory, the runtime credential file, and the device disk. DPAPI cannot prevent a process already running as the kiosk Windows account from using its key. Backups must remain in protected **local** storage: use a consistent MySQL backup, preserve the encrypted key plus original DPAPI profile/master keys, and stop kiosk writes during coordinated restore. Never upload local SQL dumps, data directories, binary logs, or keys to central services or OneDrive. Retain receipt/outbox identities on restore. Automatic key rotation and cross-device key recovery are not implemented; lost DPAPI material requires re-enrollment.

## Local API and kiosk integration

All I/O methods are now asynchronous. Replace the old constructor with `await KioskDatabase.open(...)`, and **await each database operation and close**. `kioskId` remains a read-only synchronous property after opening.

```js
import { KioskDatabase } from './src/database.js';
import { loadEnvironment, mysqlConfig } from './src/config.js';
import { loadWindowsKey } from './src/windows-key.js';

loadEnvironment();
const protectedKey = loadWindowsKey();
let db;
try {
    db = await KioskDatabase.open({
        config: mysqlConfig(), key: protectedKey.key, keyId: protectedKey.keyId,
    });
} finally { protectedKey.key.fill(0); }

try {
    const student = await db.registerStudent({
        student_id: '2026-001', lastname: 'Santos', firstname: 'Ana',
        middlename: null, suffix: null, department: 'COE',
        major_program: 'BS Computer Engineering', year_level: '1',
    });
    // The kiosk bridge instead calls registerStudentWithFingerprint(profile, fingerprint)
    // after the ZK9500 SDK merges three matching scans. It encrypts and saves both
    // records in one transaction; raw templates stay inside the trusted local process.
    // After matching locally and caching central event 123:
    // await db.recordAttendance(student.local_student_id, 123, 'in');
} finally { await db.close(); }
```

`findStudent(studentNumber)`, `getStudent(localUUID)`, `getEvent(centralID)`, `listFingerprints(localUUID)`, and `withFingerprint(templateUUID, synchronousCallback)` provide local reads. The database lookup in `withFingerprint` is asynchronous; its plaintext-consuming SDK callback must remain synchronous so the temporary bytes can be wiped immediately. `withFingerprintIndex` is the trusted bridge's streaming path: it decrypts one existing template at a time, awaits the local SDK matcher, and wipes that buffer before continuing. `deleteFingerprint` removes a local enrollment.

## ZK9500 capture bridge

The kiosk UI now uses the Windows ZKFinger SDK through a small x86 .NET Framework helper and a local Node bridge. It follows the Fingerprint Manager enrollment sequence: choose one of ten fingers, capture three separate placements, reject scans that do not match the previous scans, reject a finger already present in the kiosk index, and merge the three captures with the SDK. It does not use the Manager's separate `records.dat` store.

The browser sends only the registration form fields and finger position to `127.0.0.1`. It never receives a fingerprint image or template. The local bridge opens this kiosk's MySQL database and DPAPI-protected encryption key, streams decrypted saved templates directly to the native SDK matcher for duplicate checking, then receives the merged template over a local process pipe. Student registration and encrypted template insertion run in one MySQL transaction. The bridge clears its template buffer after AES-256-GCM encryption; the native helper clears each sample, merged buffer and image buffer. The sync contract still sends only student profile and attendance fields to the backend.

The helper build uses the x86 `libzkfpcsharp.dll` installed with ZK9500 Fingerprint Manager by default. No vendor binaries are copied into Git. If the wrapper is elsewhere, set `ZK_SDK_WRAPPER_PATH` to its x86 DLL before building. The installed x86 ZKFinger native runtime and Windows driver must remain installed. Keep ZK9500 Fingerprint Manager closed while the kiosk uses the sensor because the reader can only be open in one application at a time.

Build the helper once, then run the bridge in its own PowerShell window:

```powershell
cd kiosk-local
npm run build:scanner
npm run bridge
```

In another PowerShell window, start the kiosk UI with `cd kiosk-frontend; npm run dev`. Vite is pinned to `http://127.0.0.1:5174`, the default allowed bridge origin. Submit the registration form, choose a finger, and start enrollment. The scan counter advances only on SDK captures; canceling before completion saves neither the student nor a template. If another UI port is required, add its exact loopback origin to `KIOSK_UI_ORIGINS` in the protected `mysql.env`.

The local bridge binds only to `127.0.0.1`, checks the request host and exact browser origin, has no template-read endpoint, permits one active scan, and cancels an abandoned session. `ZK9500Capture.exe --diagnose` checks SDK initialization, reader presence, and open/close without capturing a finger.

## Offline writes and backend sync

Registration, cached reads, encrypted enrollment and attendance work without internet while local MySQL runs. Unknown students receive local UUIDs and pending registration operations. Events must first be cached using central IDs; they cannot be invented offline. Run `npm run sync` when connected, or call `synchronize(db, options)` periodically from a trusted service/scheduler. Each call performs one bounded pass; no background task is installed automatically.

Local business writes and outbox insertions share one InnoDB transaction on one pooled connection. A short singleton row lock serializes local writes across processes, preventing races in registration, duplicate scans and claim/acknowledgement state. AsyncLocalStorage keeps nested database calls on that transaction's connection; HTTP requests run after releasing all local database locks. Readers see committed data; composed event reads are consistent with relationship replacement.

Synchronization retains the existing protocol:

1. Register profiles, validate acknowledgements, map central student IDs, then send attendance in/out in dependency order. Each operation's UUID/content remains stable through retries.
2. Use 60-second leases, 20-second HTTP timeouts and exponential retry delays capped at one hour. A crash or lost response leaves a retryable operation. Old workers cannot acknowledge or fail a newer lease.
3. Central receipts and central business writes commit atomically. Central `(student_id,event_id)` uniqueness prevents duplicates across kiosks; repeated in keeps the earliest time, repeated out the latest. One attendance pair per student/event is the supported policy.
4. Keep validation/identity/eligibility failures as conflicts without discarding local history. `await db.syncStatus()` shows state; after central review, `await db.retryConflict(operationUUID)` retries the unchanged operation. Identity conflicts never silently overwrite someone else's profile.
5. Refresh selected students/events in full snapshot pages of at most 100 per type. Cached IDs are automatically included. A page, relationships, deletion/inactivation markers and metadata commit together. Older per-entity snapshots cannot reactivate deleted data. Cursors are observation timestamps, not incremental change-feed tokens.

The database binds to the first backend origin. HTTPS is required except loopback development, redirects are rejected, and the independent API token never reaches React. Offline status/eligibility use the last cache; the receiver rechecks them, so changes while disconnected may require conflict review. Keep device time accurate. Event-window policy remains the application's responsibility, as before.

The backend receiver at `/api/kiosk-sync` and `backend-thesis/migrations/001-kiosk-sync.sql` are unchanged. That central migration provides `kiosk_attendance` and `kiosk_sync_receipts` because the inspected original central schema had no attendance table. Apply it to central MySQL and configure `KIOSK_SYNC_TOKEN` there before live sync. This replacement did not apply it to `thesis_db`. Never use the local schema migration on the central database. Do not prune central receipts while old queues/backups can still replay their operations.

## Tests

Set `KIOSK_TEST_DB_USER` and `KIOSK_TEST_DB_PASSWORD` to a dedicated **local test** account with create/drop-schema, table, and trigger privileges, then run `npm test` from `kiosk-local`. Missing credentials fail visibly; the suite does not fall back to central credentials. Tests create fresh `kiosk_local_test_<uuid>` schemas with synthetic records and remove only those schemas. Nothing is written to `kiosk_local_db` or the application central schema.

Ten local tests cover configuration separation, repeatable/interrupted migrations, persistence across reconnects, operation dependencies, leases, retries, conflicts, duplicate scans, concurrent pools, InnoDB rollback/FKs, encrypted BLOBs, fresh nonces, plaintext wiping, wrong keys/tampering, atomic snapshots, stale tombstones, outbound allowlists and backend binding.

From `backend-thesis`, the existing opt-in end-to-end test is:

```powershell
$env:KIOSK_SYNC_TEST_FIXTURE = '1'
node --test tests/kiosk-sync.integration.mjs
```

It uses the configured local development MySQL administrator to create **separate temporary local and central schemas**, copies central table definitions only, and cleans up both. It tests concurrent/replayed requests, a lost response after commit, cross-kiosk deduplication, rollback and snapshots while a fingerprint is enrolled locally. It asserts that sync requests contain no template fields and central `biometric_data` stays null. It requires local server access and create/drop privileges; no real central rows are copied or changed.

## Files changed for the MySQL replacement

Created: `.env.example`, `package-lock.json`, `setup/local-mysql.sql`, `migrations/001-local-mysql.sql`, `src/config.js`, `src/migrations.js`, and `tests/mysql-fixture.js` inside `kiosk-local`.

Modified: `kiosk-local/package.json`, `src/database.js`, `src/windows-key.js`, `src/cli.js`, `src/sync.js`, `tests/database.test.js`, this README, `backend-thesis/tests/kiosk-sync.integration.mjs`, and the root `.gitignore`. The existing encryption implementation and shared sync contract remain unchanged.

Deleted: `kiosk-local/migrations/001-initial.sql` (SQLite). SQLite connection code, PRAGMAs, conflict syntax, file-based setup and SQLite-specific tests were replaced. Old database-file ignore rules remain to prevent accidentally committing legacy private files.

References: [mysql2 pools](https://sidorares.github.io/node-mysql2/docs/examples/connections/create-pool), [MySQL atomic DDL](https://dev.mysql.com/doc/refman/8.0/en/atomic-ddl.html), [MySQL named locks](https://dev.mysql.com/doc/refman/8.0/en/locking-functions.html).
