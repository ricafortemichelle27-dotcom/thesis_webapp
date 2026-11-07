import { createHash } from 'node:crypto';
import { validateOperation, studentFields } from '../../shared/kiosk-sync-contract.mjs';

export class SyncConflict extends Error {
    constructor(message) { super(message); this.status = 409; }
}
const sqlTime = (value) => value.replace('T', ' ').replace('Z', '');
const comparable = (value) => (value ?? '').normalize('NFKC').trim().toLocaleLowerCase('en-US');

// A receipt and its business write share one InnoDB transaction. A lost response is safe to retry.
export async function receiveOperation(pool, raw) {
    const operation = validateOperation(raw);
    const hash = createHash('sha256').update(JSON.stringify(operation)).digest('hex');
    const { kiosk_id, operation_id, kind, data } = operation;
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();
        await connection.query(`INSERT INTO kiosk_sync_receipts(kiosk_id,operation_id,request_sha256,kind)
            VALUES (?,?,?,?) ON DUPLICATE KEY UPDATE operation_id=operation_id`, [kiosk_id, operation_id, hash, kind]);
        const [[receipt]] = await connection.query('SELECT request_sha256,kind,central_id FROM kiosk_sync_receipts WHERE kiosk_id=? AND operation_id=? FOR UPDATE', [kiosk_id, operation_id]);
        if (receipt.request_sha256 !== hash || receipt.kind !== kind) throw new SyncConflict('Operation ID reused with different content');
        let central_id = receipt.central_id;
        if (central_id == null && kind === 'student.register') {
            await connection.query(`INSERT INTO students(${studentFields.join(',')}) VALUES (${studentFields.map(() => '?').join(',')})
                ON DUPLICATE KEY UPDATE id=id`, studentFields.map((field) => data[field]));
            const [[student]] = await connection.query(`SELECT id,${studentFields.join(',')},status FROM students WHERE student_id=? FOR UPDATE`, [data.student_id]);
            // Do not overwrite or link a different person's record based only on an entered student number.
            if (student.status !== 'active' || studentFields.some((field) => comparable(student[field]) !== comparable(data[field]))) throw new SyncConflict('Student number requires identity review');
            central_id = student.id;
        } else if (central_id == null) {
            const [[student]] = await connection.query('SELECT status,department,major_program,year_level FROM students WHERE id=? FOR SHARE', [data.student_id]);
            const [[event]] = await connection.query('SELECT status FROM events WHERE id=? FOR SHARE', [data.event_id]);
            if (!student || student.status !== 'active' || !event || event.status !== 'approved') throw new SyncConflict('Student/event no longer available for attendance');
            const [rules] = await connection.query('SELECT department,major_program,year_level FROM event_eligibility WHERE event_id=?', [data.event_id]);
            if (rules.length && !rules.some((rule) => rule.department === student.department && (!rule.major_program || rule.major_program === student.major_program) &&
                (!rule.year_level || rule.year_level === student.year_level))) throw new SyncConflict('Student eligibility changed');
            const time = sqlTime(data.occurred_at);
            if (kind === 'attendance.in') {
                // Across kiosks, keep one row and the earliest time in.
                await connection.query(`INSERT INTO kiosk_attendance(student_id,event_id,time_in) VALUES (?,?,?)
                    ON DUPLICATE KEY UPDATE time_in=LEAST(time_in,VALUES(time_in))`, [data.student_id, data.event_id, time]);
            } else {
                const [[row]] = await connection.query(`SELECT id,DATE_FORMAT(time_in,'%Y-%m-%d %H:%i:%s.%f') AS time_in FROM kiosk_attendance WHERE student_id=? AND event_id=? FOR UPDATE`, [data.student_id, data.event_id]);
                if (!row || time < row.time_in.slice(0, 23)) throw new SyncConflict('Time out requires an earlier time in');
                await connection.query('UPDATE kiosk_attendance SET time_out=GREATEST(COALESCE(time_out,?),?) WHERE id=?', [time, time, row.id]);
            }
            const [[attendance]] = await connection.query('SELECT id FROM kiosk_attendance WHERE student_id=? AND event_id=?', [data.student_id, data.event_id]);
            central_id = attendance.id;
        }
        await connection.query('UPDATE kiosk_sync_receipts SET central_id=? WHERE kiosk_id=? AND operation_id=?', [central_id, kiosk_id, operation_id]);
        await connection.commit();
        return { kiosk_id, operation_id, kind, central_id };
    } catch (error) { await connection.rollback(); throw error; }
    finally { connection.release(); }
}

export async function selectedSnapshot(pool, { student_ids, event_ids }) {
    const connection = await pool.getConnection();
    try {
        await connection.query('SET TRANSACTION ISOLATION LEVEL REPEATABLE READ');
        await connection.query('START TRANSACTION WITH CONSISTENT SNAPSHOT, READ ONLY');
        const cursor = new Date().toISOString();
        const [students] = student_ids.length ? await connection.query(`SELECT id,${studentFields.join(',')},status,
            DATE_FORMAT(updated_at,'%Y-%m-%d %H:%i:%s') AS updated_at FROM students WHERE id IN (?)`, [student_ids]) : [[]];
        const [events] = event_ids.length ? await connection.query(`SELECT id,event_name,DATE_FORMAT(event_date,'%Y-%m-%d') AS event_date,
            time_start,time_end,location,status,event_description,kiosk_theme_mode,event_logo,background_display_photo,photobooth_start,photobooth_end,
            DATE_FORMAT(updated_at,'%Y-%m-%d %H:%i:%s') AS updated_at FROM events WHERE id IN (?)`, [event_ids]) : [[]];
        for (const event of events) {
            [event.eligibility] = await connection.query('SELECT id,department,major_program,year_level FROM event_eligibility WHERE event_id=? ORDER BY id', [event.id]);
            [event.speakers] = await connection.query(`SELECT id,speaker_name AS name,speaker_photo AS photo,speaker_description AS description,speaker_order
                FROM event_speakers WHERE event_id=? ORDER BY speaker_order,id`, [event.id]);
        }
        await connection.commit();
        return { students, events, deleted_student_ids: student_ids.filter((id) => !students.some((s) => s.id === id)),
            deleted_event_ids: event_ids.filter((id) => !events.some((e) => e.id === id)), cursor };
    } catch (error) { await connection.rollback(); throw error; }
    finally { connection.release(); }
}
