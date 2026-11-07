import mysql from 'mysql2/promise';
import { randomUUID, randomBytes } from 'node:crypto';
import { KioskDatabase } from '../src/database.js';
import { migrate } from '../src/migrations.js';
import { loadEnvironment, validateLocalConfig } from '../src/config.js';

export async function mysqlFixture(t, suppliedConfig) {
    loadEnvironment();
    const database = `kiosk_local_test_${randomUUID().replaceAll('-', '')}`;
    const config = validateLocalConfig({ host: process.env.KIOSK_DB_HOST || '127.0.0.1', port: Number(process.env.KIOSK_DB_PORT || 3306),
        user: process.env.KIOSK_TEST_DB_USER, password: process.env.KIOSK_TEST_DB_PASSWORD, ...suppliedConfig, database });
    const admin = await mysql.createConnection({ ...config, database: undefined });
    const key = randomBytes(32);
    let db, raw, created = false, closed = false;
    const close = async () => {
        if (closed) return;
        closed = true;
        try {
            if (db) await db.close();
            if (raw) await raw.end();
            if (created && /^kiosk_local_test_[a-f0-9]{32}$/.test(database)) await admin.query(`DROP DATABASE ${mysql.escapeId(database)}`);
        } finally { key.fill(0); await admin.end(); }
    };
    try {
        await admin.query(`CREATE DATABASE ${mysql.escapeId(database)} CHARACTER SET utf8mb4 COLLATE utf8mb4_bin`);
        created = true;
        await migrate(config);
        db = await KioskDatabase.open({ config, key, keyId: 'test-only' });
        raw = await mysql.createConnection(config);
        if (t) t.after(close);
        return { config, key, raw, get db() { return db; }, close, async reopen() {
            await db.close();
            db = await KioskDatabase.open({ config, key, keyId: 'test-only' });
            return db;
        } };
    } catch (error) { await close(); throw error; }
}
