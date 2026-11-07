import test from 'node:test';
import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { KioskDatabase } from '../src/database.js';
import { synchronize } from '../src/sync.js';
import { migrate, canCreateTemplateKey } from '../src/migrations.js';
import { mysqlConfig, validateLocalConfig } from '../src/config.js';
import { validateOperation } from '../../shared/kiosk-sync-contract.mjs';
import { mysqlFixture } from './mysql-fixture.js';

const profile = { student_id: '2026-001', lastname: 'Student', firstname: 'Test', middlename: null,
    suffix: null, department: 'COE', major_program: 'BS Computer Engineering', year_level: '1' };
const event = { id: 10, event_name: 'Local event', event_date: '2026-10-04', time_start: '08:00:00', time_end: '17:00:00',
    status: 'approved', kiosk_theme_mode: 'wis', eligibility: [{ id: 1, department: 'COE' }], speakers: [] };
const cursor = '2026-10-04T00:00:00.000Z';
async function seed(db) {
    await db.applySnapshot({ events: [event], cursor });
    return db.registerStudent(profile);
}
async function ack(db, claim, centralId = 7) {
    const { operation_id, kiosk_id, kind } = claim.payload;
    await db.acknowledge(operation_id, claim.leaseToken, { operation_id, kiosk_id, kind, central_id: centralId });
}

test('local configuration rejects remote/central destinations and missing secrets', () => {
    assert.throws(() => mysqlConfig({ DB_USER: 'central', DB_PASSWORD: 'secret' }), /KIOSK_DB_USER/);
    const config = mysqlConfig({ KIOSK_DB_USER: 'local', KIOSK_DB_PASSWORD: 'secret' });
    assert.equal(config.database, 'kiosk_local_db');
    assert.throws(() => validateLocalConfig({ ...config, host: 'remote.example' }), /loopback/);
    assert.throws(() => validateLocalConfig({ ...config, database: 'thesis_db' }), /kiosk_local_/);
    assert.equal(validateLocalConfig({ ...config, multipleStatements: true }).multipleStatements, false);
});

test('migration repeatability, restart persistence, dependencies and duplicate scans', async (t) => {
    const f = await mysqlFixture(t), student = await seed(f.db), kioskId = f.db.kioskId;
    await migrate(f.config);
    const first = await f.db.recordAttendance(student.local_student_id, 10, 'in', cursor);
    assert.equal((await f.db.recordAttendance(student.local_student_id, 10, 'in')).local_attendance_id, first.local_attendance_id);
    await f.db.recordAttendance(student.local_student_id, 10, 'out', '2026-10-04T09:00:00.000Z');
    await f.reopen();
    assert.equal(f.db.kioskId, kioskId);
    let claim = await f.db.claimNext();
    assert.equal(claim.payload.kind, 'student.register');
    assert.equal(await f.db.claimNext(), null);
    await ack(f.db, claim, 71);
    claim = await f.db.claimNext();
    assert.equal(claim.payload.kind, 'attendance.in');
    assert.equal(claim.payload.data.student_id, 71);
    assert.equal(await f.db.claimNext(), null);
    await ack(f.db, claim, 51);
    claim = await f.db.claimNext();
    assert.equal(claim.payload.kind, 'attendance.out');
    await ack(f.db, claim, 51);
    assert.equal(await f.db.claimNext(), null);
    assert.ok((await f.db.syncStatus()).every((row) => row.state === 'acked'));
    const [tables] = await f.raw.query('SELECT ENGINE FROM information_schema.tables WHERE table_schema=DATABASE()');
    assert.ok(tables.every((row) => row.ENGINE === 'InnoDB'));
});

test('expired leases reuse immutable operations; stale/mismatched receipts, retries and conflicts', async (t) => {
    const { db } = await mysqlFixture(t); await seed(db);
    const first = await db.claimNext(1000);
    assert.equal(await db.claimNext(2000), null);
    const second = await db.claimNext(61001);
    assert.deepEqual(second.payload, first.payload);
    assert.notEqual(second.leaseToken, first.leaseToken);
    await assert.rejects(ack(db, first), /Stale/);
    await assert.rejects(db.fail(first.payload.operation_id, first.leaseToken), /Stale/);
    await assert.rejects(db.acknowledge(second.payload.operation_id, second.leaseToken, {}), /Receipt/);
    await db.fail(second.payload.operation_id, second.leaseToken, { now: 62000 });
    assert.equal(await db.claimNext(62001), null);
    const third = await db.claimNext(70000);
    assert.equal(third.payload.operation_id, first.payload.operation_id);
    await db.fail(third.payload.operation_id, third.leaseToken, { conflict: true, code: 'IDENTITY_CONFLICT' });
    assert.equal(await db.claimNext(), null);
    assert.equal((await db.syncStatus())[0].state, 'conflict');
    await db.retryConflict(third.payload.operation_id);
    await ack(db, await db.claimNext());
});

test('encrypted MySQL BLOBs, fresh nonces, plaintext wiping, tamper detection and lost-key protection', async (t) => {
    const f = await mysqlFixture(t), student = await seed(f.db);
    const bytes = Buffer.from('secret-fingerprint-template-marker-never-sent-to-mysql');
    const enrollment = { fingerPosition: 2, templateFormat: 'vendor-test', sdkVersion: '1', template: bytes };
    const id = await f.db.enrollFingerprint(student.local_student_id, enrollment);
    let reference;
    await f.db.withFingerprint(id, (value) => { assert.deepEqual(value, bytes); reference = value; });
    assert.ok(reference.every((byte) => byte === 0));
    assert.equal((await f.db.listFingerprints(student.local_student_id))[0].ciphertext, undefined);
    const [[stored]] = await f.raw.query('SELECT * FROM fingerprint_templates WHERE local_template_id=?', [id]);
    assert.equal(stored.ciphertext.includes(bytes), false);
    assert.equal(stored.nonce.length, 12);
    assert.equal(stored.auth_tag.length, 16);
    const replacement = await f.db.enrollFingerprint(student.local_student_id, enrollment);
    const [[replaced]] = await f.raw.query('SELECT * FROM fingerprint_templates');
    assert.notDeepEqual(replaced.nonce, stored.nonce);
    assert.equal(replaced.local_template_id, replacement);
    await assert.rejects(KioskDatabase.open({ config: f.config, key: randomBytes(32), keyId: 'test-only' }), /key does not match/);
    await f.raw.query('UPDATE fingerprint_templates SET sdk_version=? WHERE local_template_id=?', ['tampered', replacement]);
    await assert.rejects(f.db.withFingerprint(replacement, () => {}));
    await f.db.deleteFingerprint(replacement);
    assert.equal(await canCreateTemplateKey(f.config), false);
});

test('atomic kiosk registration stores only an encrypted merged template and never queues biometric data', async (t) => {
    const f = await mysqlFixture(t);
    const marker = Buffer.from('zk9500-merged-template-test-only');
    const bytes = Buffer.from(marker);
    let consumed;
    const { student, templateId } = await f.db.registerStudentWithFingerprint(profile, {
        fingerPosition: 2, templateFormat: 'ZKFingerSDK-template', sdkVersion: '5.3.0.33', template: bytes,
    });
    bytes.fill(0);

    assert.equal((await f.db.findStudent(profile.student_id)).local_student_id, student.local_student_id);
    const [[stored]] = await f.raw.query('SELECT * FROM fingerprint_templates WHERE local_template_id=?', [templateId]);
    assert.equal(stored.ciphertext.includes(marker), false);
    marker.fill(0);
    assert.equal((await f.db.listFingerprints(student.local_student_id))[0].ciphertext, undefined);
    await f.db.withFingerprintIndex({
        begin: async (count) => assert.equal(count, 1),
        template: async (value) => { consumed = value; assert.equal(value.toString(), 'zk9500-merged-template-test-only'); },
    });
    assert.ok(consumed.every((byte) => byte === 0));

    const claim = await f.db.claimNext();
    assert.equal(claim.payload.kind, 'student.register');
    validateOperation(claim.payload);
    assert.doesNotMatch(JSON.stringify(claim.payload), /fingerprint|biometric|template|ciphertext/i);
    await assert.rejects(f.db.registerStudentWithFingerprint(profile, {
        fingerPosition: 2, templateFormat: 'ZKFingerSDK-template', sdkVersion: '5.3.0.33', template: Buffer.from('another-template'),
    }), /already has that finger/);

    await f.raw.query("CREATE TRIGGER reject_fingerprint BEFORE INSERT ON fingerprint_templates FOR EACH ROW SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='simulated fingerprint write failure'");
    const secondProfile = { ...profile, student_id: '2026-002' };
    await assert.rejects(f.db.registerStudentWithFingerprint(secondProfile, {
        fingerPosition: 2, templateFormat: 'ZKFingerSDK-template', sdkVersion: '5.3.0.33', template: Buffer.from('rolled-back-template'),
    }), /simulated fingerprint write failure/);
    assert.equal(await f.db.findStudent(secondProfile.student_id), undefined);
    assert.equal((await f.db.syncStatus()).length, 1);
});

test('atomic snapshot/cursor rollback, central field exclusions and stale tombstone protection', async (t) => {
    const f = await mysqlFixture(t);
    await f.db.applySnapshot({ students: [{ ...profile, id: 8, status: 'active', biometric_data: 'DO NOT COPY', email: 'omit@example.invalid' }], events: [event], cursor });
    const student = await f.db.findStudent(profile.student_id);
    assert.equal(student.biometric_data, undefined);
    assert.equal(student.email, undefined);
    await assert.rejects(f.db.applySnapshot({ events: [{ ...event, event_name: 'bad update', speakers: [{ id: -1 }] }], cursor: '2026-10-05T00:00:00.000Z' }));
    assert.equal((await f.db.getEvent(10)).event_name, event.event_name);
    const [cursors] = await f.raw.query('SELECT snapshot_cursor FROM sync_metadata');
    assert.ok(cursors.every((row) => row.snapshot_cursor === cursor));
    await f.db.applySnapshot({ deleted_student_ids: [8], deleted_event_ids: [10], cursor: '2026-10-05T00:00:00.000Z' });
    assert.equal((await f.db.getStudent(student.local_student_id)).status, 'inactive');
    await f.db.applySnapshot({ events: [event], cursor });
    assert.equal((await f.db.getEvent(10)).status, 'deleted');
    await assert.rejects(f.db.recordAttendance(student.local_student_id, 10, 'in'), /Active/);
});

test('invalid attendance, eligibility and student identity conflicts', async (t) => {
    const { db } = await mysqlFixture(t), student = await seed(db);
    await assert.rejects(db.registerStudent({ ...profile, firstname: 'Different' }), /different/);
    await assert.rejects(db.recordAttendance(student.local_student_id, 10, 'out'), /earlier/);
    await assert.rejects(db.recordAttendance(student.local_student_id, 10, 'in', 'bad'), /timestamp/);
    await db.applySnapshot({ events: [{ ...event, eligibility: [{ id: 1, department: 'CAS' }] }], cursor: '2026-10-05T00:00:00.000Z' });
    await assert.rejects(db.recordAttendance(student.local_student_id, 10, 'in'), /eligible/);
    assert.equal((await db.syncStatus()).length, 1);
    await assert.rejects(db.applySnapshot({ students: [{ ...profile, id: 8, status: 'active' }], cursor }), /identity conflict/);
});

test('simultaneous MySQL pools serialize registration, claims and repeated attendance', async (t) => {
    const f = await mysqlFixture(t);
    const second = await KioskDatabase.open({ config: f.config, key: f.key, keyId: 'test-only' });
    try {
        await f.db.applySnapshot({ events: [event], cursor });
        const students = await Promise.all([f.db.registerStudent(profile), second.registerStudent(profile)]);
        assert.equal(students[0].local_student_id, students[1].local_student_id);
        const claims = await Promise.all([f.db.claimNext(), second.claimNext()]);
        assert.equal(claims.filter(Boolean).length, 1);
        await ack(f.db, claims.find(Boolean));
        const attendance = await Promise.all([f.db.recordAttendance(students[0].local_student_id, 10, 'in'), second.recordAttendance(students[1].local_student_id, 10, 'in')]);
        assert.equal(attendance[0].local_attendance_id, attendance[1].local_attendance_id);
        assert.equal((await f.db.syncStatus()).filter((row) => row.kind === 'attendance.in').length, 1);
    } finally { await second.close(); }
});

test('outbox failure rolls back attendance; InnoDB foreign keys prevent orphaning', async (t) => {
    const f = await mysqlFixture(t), student = await seed(f.db);
    await f.raw.query("CREATE TRIGGER reject_queue BEFORE INSERT ON sync_outbox FOR EACH ROW SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='simulated write failure'");
    await assert.rejects(f.db.recordAttendance(student.local_student_id, 10, 'in'), /simulated/);
    const [[row]] = await f.raw.query('SELECT COUNT(*) AS n FROM attendance');
    assert.equal(row.n, 0);
    assert.equal((await f.db.syncStatus()).length, 1);
    await assert.rejects(f.raw.query('DELETE FROM students WHERE local_student_id=?', [student.local_student_id]), /foreign key constraint/);
});

test('outbound allowlist and offline retry; backend binding; migration checksum mismatch', async (t) => {
    const f = await mysqlFixture(t), student = await seed(f.db);
    await f.db.enrollFingerprint(student.local_student_id, { fingerPosition: 1, templateFormat: 'test', sdkVersion: '1', template: Buffer.from('LOCAL ONLY') });
    const fetchImpl = async (url, options) => {
        const body = JSON.parse(options.body);
        assert.equal(/fingerprint|biometric|ciphertext|LOCAL ONLY/.test(options.body), false);
        assert.equal(options.redirect, 'error');
        if (url.endsWith('/operations')) { validateOperation(body); throw new Error('offline'); }
        return { ok: true, json: async () => ({ events: [event], cursor }) };
    };
    await synchronize(f.db, { backendOrigin: 'https://backend.example', token: 'x'.repeat(32), fetchImpl });
    assert.equal((await f.db.syncStatus())[0].state, 'pending');
    await assert.rejects(f.db.bindBackend('https://different.example'), /different backend/);
    await assert.rejects(f.db.bindBackend('http://remote.example'), /HTTPS/);
    const op = (await f.db.claimNext(Date.now() + 60000)).payload;
    assert.throws(() => validateOperation({ ...op, data: { ...op.data, fingerprintTemplate: 'forbidden' } }), /Unexpected/);
    await f.raw.query("UPDATE schema_migrations SET checksum=REPEAT('0',64)");
    await assert.rejects(migrate(f.config), /migration/);
});

test('incomplete initial DDL resumes without replacing kiosk identity or bound key', async (t) => {
    const f = await mysqlFixture(t), originalId = f.db.kioskId;
    await f.raw.query('DELETE FROM schema_migrations');
    await f.raw.query('DROP TABLE sync_metadata');
    await migrate(f.config);
    await f.reopen();
    assert.equal(f.db.kioskId, originalId);
    assert.equal(await canCreateTemplateKey(f.config), false);
    const [[row]] = await f.raw.query('SELECT COUNT(*) AS n FROM schema_migrations');
    assert.equal(row.n, 1);
});
