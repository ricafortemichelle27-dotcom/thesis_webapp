import { KioskDatabase } from './database.js';
import { loadWindowsKey } from './windows-key.js';
import { synchronize } from './sync.js';
import { loadEnvironment, mysqlConfig } from './config.js';
import { migrate, canCreateTemplateKey } from './migrations.js';

const command = process.argv[2];
if (!['init', 'sync'].includes(command)) throw new Error('Usage: npm run init | npm run sync');
loadEnvironment();
const config = mysqlConfig();
if (command === 'init') {
    await migrate(process.env.KIOSK_DB_ADMIN_USER ? { ...config, user: process.env.KIOSK_DB_ADMIN_USER, password: process.env.KIOSK_DB_ADMIN_PASSWORD } : config);
}
const protectedKey = loadWindowsKey({ initialize: command === 'init', allowCreate: command === 'init' && await canCreateTemplateKey(config) });
let database;
try { database = await KioskDatabase.open({ config, key: protectedKey.key, keyId: protectedKey.keyId }); }
finally { protectedKey.key.fill(0); }
try {
    if (command === 'init') console.log(JSON.stringify({ database: config.database, host: config.host, port: config.port, kioskId: database.kioskId }));
    else {
        const ids = (value) => value ? value.split(',').map(Number) : [];
        const result = await synchronize(database, { backendOrigin: process.env.KIOSK_BACKEND_ORIGIN,
            token: process.env.KIOSK_SYNC_TOKEN, eventIds: ids(process.env.KIOSK_EVENT_IDS), studentIds: ids(process.env.KIOSK_STUDENT_IDS) });
        console.log(JSON.stringify({ acknowledged: result.acknowledged, pending: result.queue.filter((row) => row.state !== 'acked').length }));
    }
} finally { await database.close(); }
