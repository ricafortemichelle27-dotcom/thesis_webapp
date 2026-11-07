// Opt-in: creates and drops a uniquely named EMPTY test schema on the configured MySQL server.
// Copies table definitions only; never writes to the application schema or copies its records.
import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import { receiveOperation, selectedSnapshot } from '../services/kioskSyncService.js';
import { mysqlFixture } from '../../kiosk-local/tests/mysql-fixture.js';
import { synchronize } from '../../kiosk-local/src/sync.js';

test('MySQL sync: concurrent/replayed operations, lost responses, cross-kiosk deduplication, snapshots and rollback',
    { skip: process.env.KIOSK_SYNC_TEST_FIXTURE !== '1' }, async () => {
        dotenv.config({ path: new URL('../.env', import.meta.url), quiet: true });
        const config = { host: process.env.DB_HOST, port: Number(process.env.DB_PORT || 3306), user: process.env.DB_USER, password: process.env.DB_PASSWORD };
        const admin = await mysql.createConnection(config);
        const schema = `kiosk_sync_test_${randomUUID().replaceAll('-', '')}`;
        let pool, created = false;
        let localFixture, local;
        try {
            localFixture = await mysqlFixture(null, config);
            local = localFixture.db;
            await admin.query(`CREATE DATABASE ${mysql.escapeId(schema)}`); created = true;
            pool = mysql.createPool({ ...config, database: schema });
            for (const table of ['users', 'students', 'events', 'event_eligibility', 'event_speakers']) {
                const [[definition]] = await admin.query(`SHOW CREATE TABLE ${mysql.escapeId(process.env.DB_NAME)}.${mysql.escapeId(table)}`);
                await pool.query(definition['Create Table']);
            }
            const migration = readFileSync(new URL('../migrations/001-kiosk-sync.sql', import.meta.url), 'utf8');
            for (const statement of migration.split(';').map((s) => s.trim()).filter(Boolean)) await pool.query(statement);
            const [user] = await pool.query("INSERT INTO users(fullname,email,password,role,status) VALUES ('Fixture','fixture@example.invalid','not-a-login','event_admin','active')");
            const [event] = await pool.query("INSERT INTO events(event_name,event_admin_id,event_date,time_start,time_end,status) VALUES ('Fixture',?,'2026-10-04','08:00:00','17:00:00','approved')", [user.insertId]);
            const profile = { student_id: 'FIXTURE-1', firstname: 'Test', lastname: 'Student', middlename: null, suffix: null, department: 'COE', major_program: null, year_level: null };
            const student = await local.registerStudent(profile);
            await local.enrollFingerprint(student.local_student_id, {
                fingerPosition: 1, templateFormat: 'test-only', sdkVersion: '1', template: Buffer.from('LOCAL_TEMPLATE_ONLY'),
            });
            await local.applySnapshot(await selectedSnapshot(pool, { student_ids: [], event_ids: [event.insertId] }));
            await local.recordAttendance(student.local_student_id, event.insertId, 'in', '2026-10-04T01:00:00.000Z');
            await local.recordAttendance(student.local_student_id, event.insertId, 'out', '2026-10-04T09:00:00.000Z');
            const registration = await local.claimNext();
            const receipts = await Promise.all([receiveOperation(pool, registration.payload), receiveOperation(pool, registration.payload)]);
            assert.deepEqual(receipts[0], receipts[1]);
            await local.acknowledge(registration.payload.operation_id, registration.leaseToken, receipts[0]);
            const attendance = await local.claimNext();
            const committed = await receiveOperation(pool, attendance.payload);
            // Response lost after COMMIT. A restarted worker sends the identical operation.
            const retry = await local.claimNext(Date.now() + 61000);
            assert.deepEqual(retry.payload, attendance.payload);
            assert.deepEqual(await receiveOperation(pool, retry.payload), committed);
            await local.acknowledge(retry.payload.operation_id, retry.leaseToken, committed);
            const fetchImpl = async (url, options) => {
                assert.equal(/fingerprint|biometric|ciphertext|LOCAL_TEMPLATE_ONLY/.test(options.body), false);
                const body = JSON.parse(options.body);
                const result = url.endsWith('/operations') ? await receiveOperation(pool, body) : await selectedSnapshot(pool, body);
                return { ok: true, json: async () => result };
            };
            await synchronize(local, { backendOrigin: 'https://fixture.example', token: 'x'.repeat(32), fetchImpl });
            assert.ok((await local.syncStatus()).every((row) => row.state === 'acked'));
            const crossKiosk = { ...attendance.payload, kiosk_id: randomUUID(), operation_id: randomUUID() };
            const crossReceipt = await receiveOperation(pool, crossKiosk);
            assert.equal(crossReceipt.central_id, committed.central_id);
            const [[count]] = await pool.query('SELECT COUNT(*) AS count FROM kiosk_attendance');
            assert.equal(count.count, 1);
            await assert.rejects(receiveOperation(pool, { ...attendance.payload, data: { ...attendance.payload.data, occurred_at: '2026-10-04T02:00:00.000Z' } }), /reused/);
            const wrongIdentity = { ...registration.payload, operation_id: randomUUID(), data: { ...profile, firstname: 'Different' } };
            await assert.rejects(receiveOperation(pool, wrongIdentity), /identity review/);
            const [[rolledBack]] = await pool.query('SELECT COUNT(*) AS count FROM kiosk_sync_receipts WHERE operation_id=?', [wrongIdentity.operation_id]);
            assert.equal(rolledBack.count, 0);
            await assert.rejects(receiveOperation(pool, { ...registration.payload, data: { ...profile, biometric_data: 'FORBIDDEN' } }), /Unexpected/);
            const snapshot = await selectedSnapshot(pool, { student_ids: [receipts[0].central_id], event_ids: [event.insertId, 2147483647] });
            assert.equal('biometric_data' in snapshot.students[0], false);
            assert.deepEqual(snapshot.deleted_event_ids, [2147483647]);
            const [[centralStudent]] = await pool.query('SELECT biometric_data FROM students WHERE id=?', [receipts[0].central_id]);
            assert.equal(centralStudent.biometric_data, null);
        } finally {
            if (localFixture) await localFixture.close();
            if (pool) await pool.end();
            // Strictly limited to the random schema this invocation created.
            if (created && /^kiosk_sync_test_[a-f0-9]{32}$/.test(schema)) await admin.query(`DROP DATABASE ${mysql.escapeId(schema)}`);
            await admin.end();
        }
    });
