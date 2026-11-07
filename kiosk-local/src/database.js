import mysql from 'mysql2/promise';
import { AsyncLocalStorage } from 'node:async_hooks';
import { randomUUID, createHash, createHmac, timingSafeEqual } from 'node:crypto';
import { centralId, studentFields, studentProfile, timestamp, validateOperation } from '../../shared/kiosk-sync-contract.mjs';
import { encryptTemplate, decryptTemplate } from './crypto.js';
import { validateLocalConfig } from './config.js';
import { verifySchema, verifyServer } from './migrations.js';

const eventFields = ['event_name', 'event_date', 'time_start', 'time_end', 'location', 'status',
    'event_description', 'kiosk_theme_mode', 'event_logo', 'background_display_photo', 'photobooth_start', 'photobooth_end'];
const nowISO = () => new Date().toISOString();
const constructionToken = Symbol('KioskDatabase.open');

export class KioskDatabase {
    #pool;
    #session = new AsyncLocalStorage();
    #key;
    #keyId;
    #kioskId;
    constructor(token, { config, key, keyId }) {
        if (token !== constructionToken) throw new Error('Use await KioskDatabase.open(options)');
        if (!Buffer.isBuffer(key) || key.length !== 32 || typeof keyId !== 'string' || !keyId || keyId.length > 100) throw new Error('A protected 256-bit template key and key ID are required');
        this.#pool = mysql.createPool(validateLocalConfig(config));
        this.#key = Buffer.from(key);
        this.#keyId = keyId;
    }
    static async open(options) {
        const db = new KioskDatabase(constructionToken, options);
        try {
            await verifyServer(db.#pool);
            await verifySchema(db.#pool);
            await db.#transaction(async () => {
                const row = await db.#get('SELECT * FROM kiosk_metadata WHERE singleton=1');
                if (!row) throw new Error('Kiosk metadata missing');
                db.#kioskId = row.kiosk_id;
                const check = createHmac('sha256', db.#key).update(`thesis-kiosk-key-v1:${row.kiosk_id}`).digest();
                if (row.template_key_check === null) {
                    const templates = await db.#get('SELECT COUNT(*) AS n FROM fingerprint_templates');
                    if (templates.n) throw new Error('Unbound key with existing templates; recovery required');
                    await db.#run('UPDATE kiosk_metadata SET template_key_id=?,template_key_check=? WHERE singleton=1', [db.#keyId, check]);
                } else if (row.template_key_id !== db.#keyId || row.template_key_check.length !== check.length || !timingSafeEqual(row.template_key_check, check)) {
                    throw new Error('Template encryption key does not match this kiosk database');
                }
            });
            return db;
        } catch (error) { await db.close(); throw error; }
    }
    async #all(sql, params = []) {
        const [rows] = await (this.#session.getStore() ?? this.#pool).execute(sql, params);
        return rows;
    }
    async #get(sql, params = []) { return (await this.#all(sql, params))[0]; }
    async #run(sql, params = []) { return this.#all(sql, params); }
    async #transaction(work) {
        if (this.#session.getStore()) return work();
        const connection = await this.#pool.getConnection();
        try {
            await connection.query('SET TRANSACTION ISOLATION LEVEL READ COMMITTED');
            await connection.beginTransaction();
            // One short writer at a time per physical kiosk, across pools/processes.
            // No HTTP call holds this lock; async callers always use the same transaction connection.
            await connection.query('SELECT singleton FROM kiosk_metadata WHERE singleton=1 FOR UPDATE');
            const result = await this.#session.run(connection, work);
            await connection.commit();
            return result;
        } catch (error) { await connection.rollback(); throw error; }
        finally { connection.release(); }
    }
    async close() { try { await this.#pool.end(); } finally { this.#key.fill(0); } }
    get kioskId() { return this.#kioskId; }
    async bindBackend(origin) {
        const url = new URL(origin);
        if (url.username || url.password || url.pathname !== '/' || url.search || url.hash ||
            !(url.protocol === 'https:' || (url.protocol === 'http:' && ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)))) {
            throw new Error('Backend must be an HTTPS origin (HTTP allowed only on loopback)');
        }
        return this.#transaction(async () => {
            const existing = (await this.#get('SELECT backend_origin FROM kiosk_metadata')).backend_origin;
            if (existing && existing !== url.origin) throw new Error('Database belongs to a different backend; explicit reprovisioning required');
            await this.#run('UPDATE kiosk_metadata SET backend_origin = ?', [url.origin]);
            return url.origin;
        });
    }
    async #enqueue(kind, student, attendance) {
        await this.#run('INSERT INTO sync_outbox(operation_id,kind,local_student_id,local_attendance_id,created_at) VALUES (?,?,?,?,?)', [randomUUID(), kind, student, attendance, nowISO()]);
    }
    async registerStudent(input) {
        const profile = studentProfile(input);
        return this.#transaction(async () => {
            const existing = await this.#get('SELECT * FROM students WHERE student_id = ?', [profile.student_id]);
            if (existing) {
                if (studentFields.some((field) => existing[field] !== profile[field])) throw new Error('Student number already exists with different details');
                return existing;
            }
            const id = randomUUID();
            await this.#run(`INSERT INTO students(local_student_id,${studentFields.join(',')},cached_at,created_locally)
                VALUES (${Array(10).fill('?').join(',')},1)`, [id, ...studentFields.map((field) => profile[field]), nowISO()]);
            await this.#enqueue('student.register', id, null);
            return await this.getStudent(id);
        });
    }
    async registerStudentWithFingerprint(input, fingerprint) {
        const profile = studentProfile(input);
        if (!fingerprint || !Number.isInteger(fingerprint.fingerPosition) || fingerprint.fingerPosition < 1 || fingerprint.fingerPosition > 10 ||
            typeof fingerprint.templateFormat !== 'string' || !fingerprint.templateFormat.trim() ||
            typeof fingerprint.sdkVersion !== 'string' || !fingerprint.sdkVersion.trim() ||
            !Buffer.isBuffer(fingerprint.template) || fingerprint.template.length === 0 || fingerprint.template.length > 1024 * 1024) {
            throw new Error('A valid fingerprint template, format, SDK version, and finger position are required');
        }
        return this.#transaction(async () => {
            const student = await this.registerStudent(profile);
            const existing = await this.#get('SELECT local_template_id FROM fingerprint_templates WHERE local_student_id=? AND finger_position=?',
                [student.local_student_id, fingerprint.fingerPosition]);
            if (existing) throw new Error('This student already has that finger enrolled');
            const templateId = await this.enrollFingerprint(student.local_student_id, fingerprint);
            return { student, templateId };
        });
    }
    async getStudent(localId) { return await this.#get('SELECT * FROM students WHERE local_student_id = ?', [localId]); }
    async findStudent(studentNumber) { return await this.#get('SELECT * FROM students WHERE student_id = ?', [studentNumber]); }
    async getEvent(id) {
        return this.#transaction(async () => {
            const event = await this.#get('SELECT * FROM events WHERE central_event_id = ?', [id]);
            if (!event) return undefined;
            return { ...event, eligibility: await this.#all('SELECT * FROM event_eligibility WHERE central_event_id = ?', [id]),
                speakers: await this.#all('SELECT * FROM event_speakers WHERE central_event_id = ? ORDER BY speaker_order,central_speaker_id', [id]) };
        });
    }
    async #acceptSnapshot(scope, cursor) {
        scope = createHash('sha256').update(scope).digest('hex');
        const previous = await this.#get('SELECT snapshot_cursor FROM sync_metadata WHERE scope=?', [scope]);
        if (previous && previous.snapshot_cursor >= cursor) return false;
        await this.#run('INSERT INTO sync_metadata VALUES (?,?,?) ON DUPLICATE KEY UPDATE snapshot_cursor=VALUES(snapshot_cursor),last_success_at=VALUES(last_success_at)', [scope, cursor, nowISO()]);
        return true;
    }
    // Apply one complete, selected-scope snapshot and its metadata atomically. No biometric field is read.
    async applySnapshot({ students = [], events = [], deleted_student_ids = [], deleted_event_ids = [], cursor }, scope = 'selected-cache') {
        timestamp(cursor);
        return this.#transaction(async () => {
            for (const input of students) {
                const id = centralId(input.id), profile = studentProfile(input);
                if (!(await this.#acceptSnapshot(`student:${id}`, cursor))) continue;
                const existing = await this.#all('SELECT * FROM students WHERE central_student_id = ? OR student_id = ?', [id, profile.student_id]);
                if (existing.length > 1 || existing.some((row) => row.central_student_id !== id)) throw new Error('Student identity conflict; synchronize pending registration first');
                if (!['active', 'inactive'].includes(input.status)) throw new Error('Invalid student status');
                await this.#run(`INSERT INTO students(local_student_id,central_student_id,${studentFields.join(',')},status,central_updated_at,cached_at)
                    VALUES (${Array(13).fill('?').join(',')}) ON DUPLICATE KEY UPDATE
                    ${studentFields.map((field) => `${field}=VALUES(${field})`).join(',')},status=VALUES(status),central_updated_at=VALUES(central_updated_at),cached_at=VALUES(cached_at)`, [existing[0]?.local_student_id ?? randomUUID(), id, ...studentFields.map((field) => profile[field]), input.status, input.updated_at ?? null, nowISO()]);
            }
            for (const input of events) {
                const id = centralId(input.id);
                if (!(await this.#acceptSnapshot(`event:${id}`, cursor))) continue;
                if (!/^\d{4}-\d\d-\d\d$/.test(input.event_date) || !Array.isArray(input.eligibility) || !Array.isArray(input.speakers)) throw new Error('Incomplete event snapshot');
                await this.#run(`INSERT INTO events(central_event_id,${eventFields.join(',')},central_updated_at,cached_at)
                    VALUES (${Array(eventFields.length + 3).fill('?').join(',')}) ON DUPLICATE KEY UPDATE
                    ${eventFields.map((field) => `${field}=VALUES(${field})`).join(',')},central_updated_at=VALUES(central_updated_at),cached_at=VALUES(cached_at)`, [id, ...eventFields.map((field) => input[field] ?? null), input.updated_at ?? null, nowISO()]);
                await this.#run('DELETE FROM event_eligibility WHERE central_event_id = ?', [id]);
                await this.#run('DELETE FROM event_speakers WHERE central_event_id = ?', [id]);
                for (const rule of input.eligibility) await this.#run('INSERT INTO event_eligibility VALUES (?,?,?,?,?)', [centralId(rule.id), id, rule.department, rule.major_program ?? null, rule.year_level ?? null]);
                for (const speaker of input.speakers) await this.#run('INSERT INTO event_speakers VALUES (?,?,?,?,?,?)', [centralId(speaker.id), id, speaker.name ?? null, speaker.photo ?? null, speaker.description ?? null, speaker.speaker_order]);
            }
            for (const id of deleted_student_ids) {
                centralId(id);
                if (await this.#acceptSnapshot(`student:${id}`, cursor)) await this.#run("UPDATE students SET status='inactive',cached_at=? WHERE central_student_id=?", [nowISO(), id]);
            }
            for (const id of deleted_event_ids) {
                centralId(id);
                if (await this.#acceptSnapshot(`event:${id}`, cursor)) await this.#run("UPDATE events SET status='deleted',cached_at=? WHERE central_event_id=?", [nowISO(), id]);
            }
            await this.#acceptSnapshot(scope, cursor);
        });
    }
    async enrollFingerprint(localStudentId, { fingerPosition, templateFormat, sdkVersion, template }) {
        if (!Number.isInteger(fingerPosition) || fingerPosition < 1 || fingerPosition > 10 ||
            typeof templateFormat !== 'string' || !templateFormat.trim() || typeof sdkVersion !== 'string' || !sdkVersion.trim()) throw new Error('Template format, SDK version, and finger position required');
        return this.#transaction(async () => {
            if ((await this.getStudent(localStudentId))?.status !== 'active') throw new Error('Active student required');
            const row = { local_template_id: randomUUID(), local_student_id: localStudentId, finger_position: fingerPosition,
                template_format: templateFormat, sdk_version: sdkVersion, key_id: this.#keyId };
            const encrypted = encryptTemplate(template, row, this.#key);
            await this.#run(`INSERT INTO fingerprint_templates VALUES (?,?,?,?,?,?,?,?,?,?)
                ON DUPLICATE KEY UPDATE local_template_id=VALUES(local_template_id),
                template_format=VALUES(template_format),sdk_version=VALUES(sdk_version),key_id=VALUES(key_id),
                ciphertext=VALUES(ciphertext),nonce=VALUES(nonce),auth_tag=VALUES(auth_tag),enrolled_at=VALUES(enrolled_at)`, [...Object.values(row), encrypted.ciphertext, encrypted.nonce, encrypted.auth_tag, nowISO()]);
            return row.local_template_id;
        });
    }
    // Trusted scanner process only. No HTTP endpoint exposes this method or its result.
    async withFingerprint(templateId, useTemplate) {
        const row = await this.#get('SELECT * FROM fingerprint_templates WHERE local_template_id = ?', [templateId]);
        if (!row || row.key_id !== this.#keyId) throw new Error('Template/key unavailable');
        const plaintext = decryptTemplate(row, this.#key);
        try {
            const result = useTemplate(plaintext);
            if (result?.then) throw new Error('Template consumer must be synchronous');
            return result;
        } finally { plaintext.fill(0); }
    }
    async listFingerprints(localStudentId) {
        return await this.#all(`SELECT local_template_id,finger_position,template_format,sdk_version,enrolled_at
            FROM fingerprint_templates WHERE local_student_id=?`, [localStudentId]);
    }
    // Streams one decrypted template at a time to the trusted local SDK matcher. The callback
    // is awaited before each plaintext buffer is wiped; this method must never be exposed over HTTP.
    async withFingerprintIndex(consumer) {
        if (!consumer || typeof consumer.begin !== 'function' || typeof consumer.template !== 'function')
            throw new Error('Trusted fingerprint index consumer required');
        const rows = await this.#all('SELECT * FROM fingerprint_templates ORDER BY local_template_id');
        await consumer.begin(rows.length);
        for (const row of rows) {
            if (row.key_id !== this.#keyId) throw new Error('Fingerprint template key unavailable');
            const plaintext = decryptTemplate(row, this.#key);
            try {
                await consumer.template(plaintext, { fingerPosition: row.finger_position, templateFormat: row.template_format, sdkVersion: row.sdk_version });
            } finally { plaintext.fill(0); }
        }
        return rows.length;
    }
    async deleteFingerprint(templateId) { return this.#transaction(() => this.#run('DELETE FROM fingerprint_templates WHERE local_template_id=?', [templateId])); }
    async recordAttendance(localStudentId, eventId, direction, occurredAt = nowISO()) {
        centralId(eventId); timestamp(occurredAt);
        if (!['in', 'out'].includes(direction)) throw new Error('Invalid attendance direction');
        return this.#transaction(async () => {
            const student = await this.getStudent(localStudentId), event = await this.getEvent(eventId);
            if (student?.status !== 'active' || event?.status !== 'approved') throw new Error('Active student and approved cached event required');
            if (event.eligibility.length && !event.eligibility.some((rule) => rule.department === student.department &&
                (!rule.major_program || rule.major_program === student.major_program) && (!rule.year_level || rule.year_level === student.year_level))) throw new Error('Student is not eligible');
            let row = await this.#get('SELECT * FROM attendance WHERE local_student_id=? AND central_event_id=?', [localStudentId, eventId]);
            if (row?.[`time_${direction}`]) return row; // Repeat scans do not change an immutable operation.
            if (direction === 'out') {
                if (!row || occurredAt < row.time_in) throw new Error('Time out requires an earlier time in');
                await this.#run('UPDATE attendance SET time_out=? WHERE local_attendance_id=?', [occurredAt, row.local_attendance_id]);
            } else {
                const id = randomUUID();
                await this.#run('INSERT INTO attendance(local_attendance_id,local_student_id,central_event_id,time_in) VALUES (?,?,?,?)', [id, localStudentId, eventId, occurredAt]);
                row = { local_attendance_id: id };
            }
            await this.#enqueue(`attendance.${direction}`, null, row.local_attendance_id);
            return await this.#get('SELECT * FROM attendance WHERE local_attendance_id=?', [row.local_attendance_id]);
        });
    }
    async claimNext(now = Date.now()) {
        return this.#transaction(async () => {
            const row = await this.#get(`SELECT q.* FROM sync_outbox q
                LEFT JOIN attendance a ON a.local_attendance_id=q.local_attendance_id
                LEFT JOIN students s ON s.local_student_id=a.local_student_id
                WHERE ((q.state='pending' AND q.next_attempt_at <= ?) OR (q.state='inflight' AND q.lease_until <= ?))
                AND (q.kind='student.register' OR s.central_student_id IS NOT NULL)
                AND (q.kind!='attendance.out' OR EXISTS(SELECT 1 FROM sync_outbox i WHERE i.local_attendance_id=q.local_attendance_id AND i.kind='attendance.in' AND i.state='acked'))
                ORDER BY q.created_at,q.sequence_id LIMIT 1`, [now, now]);
            if (!row) return null;
            let data;
            if (row.kind === 'student.register') data = studentProfile(await this.getStudent(row.local_student_id));
            else {
                const a = await this.#get(`SELECT a.*,s.central_student_id FROM attendance a JOIN students s ON s.local_student_id=a.local_student_id WHERE local_attendance_id=?`, [row.local_attendance_id]);
                data = { student_id: a.central_student_id, event_id: a.central_event_id, occurred_at: row.kind === 'attendance.in' ? a.time_in : a.time_out };
            }
            const payload = validateOperation({ protocol_version: 1, kiosk_id: this.kioskId, operation_id: row.operation_id, kind: row.kind, data });
            const leaseToken = randomUUID();
            await this.#run("UPDATE sync_outbox SET state='inflight',lease_token=?,lease_until=?,attempts=attempts+1 WHERE operation_id=?", [leaseToken, now + 60000, row.operation_id]);
            return { leaseToken, payload };
        });
    }
    async acknowledge(operationId, leaseToken, receipt) {
        return this.#transaction(async () => {
            const row = await this.#get("SELECT * FROM sync_outbox WHERE operation_id=? AND lease_token=? AND state='inflight'", [operationId, leaseToken]);
            if (!row) throw new Error('Stale sync lease');
            if (receipt.operation_id !== operationId || receipt.kiosk_id !== this.kioskId || receipt.kind !== row.kind) throw new Error('Receipt does not match operation');
            const id = centralId(receipt.central_id);
            if (row.kind === 'student.register') await this.#run('UPDATE students SET central_student_id=? WHERE local_student_id=? AND central_student_id IS NULL', [id, row.local_student_id]);
            else {
                const a = await this.#get('SELECT central_attendance_id FROM attendance WHERE local_attendance_id=?', [row.local_attendance_id]);
                if (a.central_attendance_id != null && a.central_attendance_id !== id) throw new Error('Central attendance mapping changed');
                await this.#run('UPDATE attendance SET central_attendance_id=? WHERE local_attendance_id=?', [id, row.local_attendance_id]);
            }
            await this.#run("UPDATE sync_outbox SET state='acked',lease_token=NULL,lease_until=NULL,last_error_code=NULL,acknowledged_at=? WHERE operation_id=?", [nowISO(), operationId]);
        });
    }
    async fail(operationId, leaseToken, { conflict = false, code = 'TRANSPORT_ERROR', now = Date.now() } = {}) {
        // Persist a bounded code, never HTTP bodies, profiles, templates, credentials, or stack traces.
        if (!/^[A-Z0-9_]{1,64}$/.test(code)) code = 'SYNC_ERROR';
        return this.#transaction(async () => {
            const row = await this.#get("SELECT attempts FROM sync_outbox WHERE operation_id=? AND lease_token=? AND state='inflight'", [operationId, leaseToken]);
            if (!row) throw new Error('Stale sync lease');
            await this.#run('UPDATE sync_outbox SET state=?,lease_token=NULL,lease_until=NULL,last_error_code=?,next_attempt_at=? WHERE operation_id=? AND lease_token=?', [conflict ? 'conflict' : 'pending', code, now + Math.min(3600000, 1000 * 2 ** Math.min(row.attempts, 12)), operationId, leaseToken]);
        });
    }
    async retryConflict(operationId) {
        return this.#transaction(() => this.#run("UPDATE sync_outbox SET state='pending',next_attempt_at=0,last_error_code=NULL WHERE operation_id=? AND state='conflict'", [operationId]));
    }
    async syncStatus() {
        return await this.#all('SELECT operation_id,kind,state,attempts,next_attempt_at,last_error_code,acknowledged_at FROM sync_outbox ORDER BY created_at,sequence_id', []);
    }
    async cacheSelection() {
        return { student_ids: (await this.#all('SELECT central_student_id AS id FROM students WHERE central_student_id IS NOT NULL')).map((r) => r.id),
            event_ids: (await this.#all('SELECT central_event_id AS id FROM events')).map((r) => r.id) };
    }
}
