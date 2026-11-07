import dotenv from 'dotenv';
import { join } from 'node:path';

export function loadEnvironment() {
    // No backend-thesis .env fallback: local credentials must be provisioned separately.
    const path = process.env.KIOSK_CONFIG_FILE || (process.env.LOCALAPPDATA && join(process.env.LOCALAPPDATA, 'ThesisKiosk', 'mysql.env'));
    if (path) dotenv.config({ path, quiet: true });
}

export function mysqlConfig(env = process.env) {
    return validateLocalConfig({ host: env.KIOSK_DB_HOST || '127.0.0.1', port: Number(env.KIOSK_DB_PORT || 3306),
        database: env.KIOSK_DB_NAME || 'kiosk_local_db', user: env.KIOSK_DB_USER, password: env.KIOSK_DB_PASSWORD });
}

export function validateLocalConfig(input) {
    if (!input || !['127.0.0.1', '::1', 'localhost'].includes(input.host)) throw new Error('Kiosk MySQL must use a loopback host');
    if (!/^kiosk_local_[a-zA-Z0-9_]{1,48}$/.test(input.database)) throw new Error('Local database name must start with kiosk_local_ and use only letters, digits, underscores');
    if (!Number.isInteger(input.port) || input.port < 1 || input.port > 65535) throw new Error('Invalid local MySQL port');
    if (!input.user || typeof input.password !== 'string' || !input.password) throw new Error('KIOSK_DB_USER and KIOSK_DB_PASSWORD are required');
    // Rebuild explicitly; callers cannot override host with a URL/stream/socket or enable multi-statements.
    return { host: input.host === 'localhost' ? '127.0.0.1' : input.host, port: input.port, database: input.database,
        user: input.user, password: input.password, charset: 'utf8mb4_bin', timezone: 'Z', dateStrings: true,
        multipleStatements: false, connectionLimit: 4, connectTimeout: 10000 };
}
