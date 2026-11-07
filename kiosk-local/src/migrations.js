import mysql from 'mysql2/promise';
import { readFileSync } from 'node:fs';
import { createHash, randomUUID } from 'node:crypto';
import { validateLocalConfig } from './config.js';
import { uuid } from '../../shared/kiosk-sync-contract.mjs';

const sql = readFileSync(new URL('../migrations/001-local-mysql.sql', import.meta.url), 'utf8');
const checksum = createHash('sha256').update(sql.replaceAll('\r\n', '\n')).digest('hex');
export async function verifySchema(connection) {
    const [rows] = await connection.query('SELECT version,checksum FROM schema_migrations ORDER BY version');
    if (rows.length !== 1 || rows[0].version !== 1 || rows[0].checksum !== checksum) throw new Error('Local schema migration missing, changed, or newer than application');
}
export async function verifyServer(connection) {
    const [[row]] = await connection.query('SELECT VERSION() AS version,@@innodb_flush_log_at_trx_commit AS durable,@@sql_mode AS sql_mode');
    const [major, minor, patch] = row.version.split('.').map(Number);
    if (/MariaDB/i.test(row.version) || major < 8 || (major === 8 && minor === 0 && patch < 16)) throw new Error('MySQL 8.0.16+ is required for enforced CHECK constraints');
    if (row.durable !== 1) throw new Error('Local MySQL requires innodb_flush_log_at_trx_commit=1');
    if (!/STRICT_(TRANS|ALL)_TABLES/.test(row.sql_mode)) throw new Error('Local MySQL requires strict SQL mode');
}
export async function migrate(config, { kioskId = randomUUID() } = {}) {
    if (!uuid(kioskId)) throw new Error('Invalid kiosk UUID');
    const connection = await mysql.createConnection(validateLocalConfig(config));
    const lock = `kiosk-migrate:${createHash('sha256').update(config.database).digest('hex').slice(0, 40)}`;
    let locked = false;
    try {
        await verifyServer(connection);
        const [[result]] = await connection.query('SELECT GET_LOCK(?,10) AS acquired', [lock]);
        if (result.acquired !== 1) throw new Error('Local migration is already running');
        locked = true;
        const [[existing]] = await connection.query("SELECT COUNT(*) AS n FROM information_schema.tables WHERE table_schema=DATABASE() AND table_name='schema_migrations'");
        if (existing.n) {
            const [versions] = await connection.query('SELECT version FROM schema_migrations');
            if (versions.length) { await verifySchema(connection); return; }
        }
        // MySQL DDL implicitly commits. Use restartable statements plus a version/checksum record,
        // not a misleading transaction around CREATE TABLE. No application writes before this finishes.
        await connection.query(`CREATE TABLE IF NOT EXISTS schema_migrations (
            version INT PRIMARY KEY, checksum CHAR(64) CHARACTER SET ascii NOT NULL,
            applied_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP) ENGINE=InnoDB`);
        for (const statement of sql.replace(/^--.*$/gm, '').split(';').map((value) => value.trim()).filter(Boolean)) await connection.query(statement);
        await connection.beginTransaction();
        await connection.query('INSERT INTO kiosk_metadata(singleton,kiosk_id,created_at) VALUES (1,?,?) ON DUPLICATE KEY UPDATE singleton=singleton', [kioskId, new Date().toISOString()]);
        await connection.query('INSERT INTO schema_migrations(version,checksum) VALUES (1,?)', [checksum]);
        await connection.commit();
    } catch (error) { await connection.rollback(); throw error; }
    finally {
        try { if (locked) await connection.query('SELECT RELEASE_LOCK(?)', [lock]); }
        finally { await connection.end(); }
    }
}

export async function canCreateTemplateKey(config) {
    const connection = await mysql.createConnection(validateLocalConfig(config));
    try {
        await verifySchema(connection);
        const [[row]] = await connection.query('SELECT template_key_check FROM kiosk_metadata WHERE singleton=1');
        const [[templates]] = await connection.query('SELECT COUNT(*) AS n FROM fingerprint_templates');
        return Boolean(row && row.template_key_check === null && templates.n === 0);
    } finally { await connection.end(); }
}
