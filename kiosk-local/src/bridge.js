import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { createServer } from 'node:http';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { KioskDatabase } from './database.js';
import { loadWindowsKey } from './windows-key.js';
import { loadEnvironment, mysqlConfig } from './config.js';
import { studentProfile } from '../../shared/kiosk-sync-contract.mjs';

loadEnvironment();
const PORT = Number(process.env.KIOSK_BRIDGE_PORT || 5182);
if (!Number.isInteger(PORT) || PORT < 1 || PORT > 65535) throw new Error('Invalid KIOSK_BRIDGE_PORT');

const allowedOrigins = (process.env.KIOSK_UI_ORIGINS || 'http://localhost:5174,http://127.0.0.1:5174')
    .split(',').map((value) => value.trim()).filter(Boolean);
if (allowedOrigins.some((origin) => {
    try {
        const url = new URL(origin);
        return !['http:', 'https:'].includes(url.protocol) || !['localhost', '127.0.0.1'].includes(url.hostname) || url.origin !== origin;
    } catch { return true; }
})) throw new Error('KIOSK_UI_ORIGINS must contain exact localhost origins');

const helperPath = fileURLToPath(new URL('../native/zk9500/bin/ZK9500Capture.exe', import.meta.url));
const sessions = new Map();
let activeSessionId = null;
let database;
let protectedKey;

function sendJson(response, statusCode, body, origin) {
    response.writeHead(statusCode, {
        'content-type': 'application/json; charset=utf-8',
        'cache-control': 'no-store',
        'x-content-type-options': 'nosniff',
        ...(origin ? { 'access-control-allow-origin': origin, vary: 'Origin' } : {}),
    });
    response.end(JSON.stringify(body));
}

function publicSession(session) {
    return {
        id: session.id,
        status: session.status,
        scanCount: session.scanCount,
        totalScans: 3,
        message: session.message,
        ...(session.status === 'failed' ? { error: session.error || session.message } : {}),
    };
}

function setSession(session, status, message) {
    session.status = status;
    session.message = message;
    session.updatedAt = Date.now();
    if (['complete', 'failed', 'cancelled'].includes(status)) {
        session.profile = null;
        if (session.watchdog) clearInterval(session.watchdog);
        if (!session.cleanupScheduled) {
            session.cleanupScheduled = true;
            const cleanup = setTimeout(() => sessions.delete(session.id), 5 * 60 * 1000);
            cleanup.unref?.();
        }
    }
}

function writeChunk(stream, value) {
    return new Promise((resolve, reject) => {
        stream.write(value, (error) => error ? reject(error) : resolve());
    });
}

function errorText(error) {
    return error instanceof Error ? error.message : 'Fingerprint enrollment failed.';
}

function decodeNativeError(value) {
    try { return Buffer.from(value, 'base64').toString('utf8').slice(0, 500); }
    catch { return 'Fingerprint reader failed. Reconnect the reader and retry.'; }
}

function handleNativeLine(session, line) {
    if (line === 'CONNECTED') {
        session.connectedResolve?.();
        session.status = 'loading-index';
        session.message = 'Loading encrypted kiosk enrollments for duplicate checking…';
    } else if (line === 'READY') {
        session.status = 'waiting-for-finger';
        session.message = `Place the selected finger on the reader (${session.scanCount + 1} of 3).`;
    } else if (line.startsWith('CAPTURED:')) {
        const count = Number(line.slice('CAPTURED:'.length));
        if (Number.isInteger(count) && count >= 1 && count <= 3) session.scanCount = count;
        if (session.scanCount >= 3) {
            session.status = 'merging';
            session.message = 'Three scans captured. Preparing the fingerprint template…';
        } else {
            session.status = 'waiting-for-lift';
            session.message = `Scan ${session.scanCount} of 3 accepted. Lift your finger completely before scanning again.`;
        }
    } else if (line.startsWith('RELEASED:')) {
        session.status = 'waiting-for-finger';
        session.message = `Scan ${session.scanCount} of 3 accepted. Place the same finger again.`;
    } else if (line.startsWith('MISMATCH:')) {
        session.status = 'waiting-for-lift';
        session.message = 'That scan did not match the earlier scans. Lift your finger, then place the same finger again.';
    } else if (line === 'MERGING') {
        session.status = 'merging';
        session.message = 'Combining the three matching scans…';
    } else if (line === 'DUPLICATE') {
        session.nativeError = 'This fingerprint is already enrolled. Choose another finger or use the existing enrollment.';
        setSession(session, 'failed', session.nativeError);
        session.connectedReject?.(new Error(session.nativeError));
    } else if (line.startsWith('ERROR:')) {
        session.nativeError = decodeNativeError(line.slice('ERROR:'.length));
        session.connectedReject?.(new Error(session.nativeError));
    } else if (line.startsWith('CANCELLED:')) {
        session.nativeError = decodeNativeError(line.slice('CANCELLED:'.length));
    }
    session.updatedAt = Date.now();
}

function nativeErrorFor(session, fallback) {
    return session.nativeError || fallback;
}

async function runEnrollment(session) {
    let child;
    let stderrPending = Buffer.alloc(0);
    const templateChunks = [];
    let templateLength = null;
    let templateHeaderSeen = false;
    let templateFrameComplete = false;
    let templateBytes = 0;
    let streamFailure = null;
    let closeResolve;
    const closed = new Promise((resolve) => { closeResolve = resolve; });
    const connected = new Promise((resolve, reject) => {
        session.connectedResolve = resolve;
        session.connectedReject = reject;
    });

    try {
        if (!existsSync(helperPath)) throw new Error('ZK9500 capture helper is not built. Run npm run build:scanner from kiosk-local.');
        child = spawn(helperPath, [], { windowsHide: true, stdio: ['pipe', 'pipe', 'pipe'] });
        session.child = child;
        child.stdin.on('error', (error) => { streamFailure = error; });
        // The native SDK writes diagnostics to stdout. Drain and discard them; template bytes use a framed stderr message.
        child.stdout.on('data', () => {});

        const consumeNativeStderr = (chunk) => {
            if (chunk.length) {
                const combined = Buffer.concat([stderrPending, chunk]);
                stderrPending.fill(0);
                stderrPending = combined;
            }
            while (stderrPending.length) {
                if (templateHeaderSeen) {
                    if (templateFrameComplete) {
                        streamFailure = new Error('Unexpected data followed the fingerprint template.');
                        stderrPending.fill(0);
                        stderrPending = Buffer.alloc(0);
                        return;
                    }
                    const remaining = templateLength - templateBytes;
                    const take = Math.min(remaining, stderrPending.length);
                    templateChunks.push(Buffer.from(stderrPending.subarray(0, take)));
                    templateBytes += take;
                    const rest = Buffer.from(stderrPending.subarray(take));
                    stderrPending.fill(0);
                    stderrPending = rest;
                    if (templateBytes === templateLength) templateFrameComplete = true;
                    continue;
                }
                const newline = stderrPending.indexOf(10);
                if (newline < 0) {
                    if (stderrPending.length > 4096) {
                        streamFailure = new Error('Invalid ZK9500 bridge response.');
                        stderrPending.fill(0);
                        stderrPending = Buffer.alloc(0);
                    }
                    return;
                }
                const line = stderrPending.subarray(0, newline).toString('utf8').replace(/\r$/, '');
                const rest = Buffer.from(stderrPending.subarray(newline + 1));
                stderrPending.fill(0);
                stderrPending = rest;
                if (line.startsWith('TEMPLATE:')) {
                    const length = Number(line.slice('TEMPLATE:'.length));
                    if (!Number.isInteger(length) || length < 1 || length > 2048 || templateHeaderSeen) {
                        streamFailure = new Error('The ZK9500 returned an invalid template frame.');
                        return;
                    }
                    templateLength = length;
                    templateHeaderSeen = true;
                } else if (line) handleNativeLine(session, line);
            }
        };
        child.stderr.on('data', (chunk) => {
            consumeNativeStderr(chunk);
        });
        child.once('error', (error) => {
            streamFailure = error;
            session.connectedReject?.(error);
            closeResolve({ code: -1, signal: null });
        });
        child.once('close', (code, signal) => {
            if (templateHeaderSeen && !templateFrameComplete) {
                streamFailure = new Error('The ZK9500 returned an incomplete fingerprint template.');
                stderrPending.fill(0);
                stderrPending = Buffer.alloc(0);
            } else if (stderrPending.length) {
                const tail = stderrPending.toString('utf8').replace(/\r?\n$/, '');
                stderrPending.fill(0);
                stderrPending = Buffer.alloc(0);
                if (tail) handleNativeLine(session, tail);
            }
            closeResolve({ code, signal });
        });

        const connectTimer = setTimeout(() => session.connectedReject?.(new Error('Timed out connecting to the ZK9500 reader.')), 15000);
        connectTimer.unref?.();
        try { await connected; }
        finally { clearTimeout(connectTimer); }

        await database.withFingerprintIndex({
            begin: async (count) => {
                const header = Buffer.alloc(4);
                header.writeInt32LE(count, 0);
                try { await writeChunk(child.stdin, header); }
                finally { header.fill(0); }
            },
            template: async (template) => {
                if (session.cancelRequested) throw new Error('Enrollment cancelled.');
                if (streamFailure) throw streamFailure;
                const length = Buffer.alloc(4);
                length.writeInt32LE(template.length, 0);
                try {
                    await writeChunk(child.stdin, length);
                    await writeChunk(child.stdin, template);
                } finally { length.fill(0); }
            },
        });

        session.catalogueSent = true;
        if (session.cancelRequested) {
            child.stdin.write('CANCEL\n');
            child.stdin.end();
        }
        const { code } = await closed;
        if (session.cancelRequested || code === 2) {
            setSession(session, 'cancelled', 'Fingerprint enrollment cancelled.');
            return;
        }
        if (streamFailure) throw streamFailure;
        if (code !== 0) throw new Error(nativeErrorFor(session, 'The ZK9500 capture process stopped. Close other scanner apps and retry.'));

        if (!templateHeaderSeen || !templateFrameComplete || templateBytes !== templateLength) {
            throw new Error('The ZK9500 did not return a complete fingerprint template.');
        }
        const template = Buffer.concat(templateChunks, templateBytes);
        for (const chunk of templateChunks) chunk.fill(0);
        templateChunks.length = 0;
        if (!template.length || template.length > 2048) {
            template.fill(0);
            throw new Error('The ZK9500 returned an invalid merged template.');
        }

        session.status = 'saving';
        session.message = 'Encrypting and saving the fingerprint in the kiosk database…';
        try {
            await database.registerStudentWithFingerprint(session.profile, {
                fingerPosition: session.fingerPosition,
                templateFormat: 'ZKFingerSDK-template',
                sdkVersion: '5.3.0.33',
                template,
            });
        } catch (error) {
            if (error?.code === 'ER_DUP_ENTRY') throw new Error('This student already has that finger enrolled. Choose another finger.');
            if (error?.message === 'Student number already exists with different details') throw error;
            throw new Error('The fingerprint was captured, but could not be saved to the kiosk database. Check the local database and retry.');
        } finally { template.fill(0); }
        setSession(session, 'complete', 'Fingerprint enrollment was encrypted and saved on this kiosk.');
    } catch (error) {
        if (session.cancelRequested) setSession(session, 'cancelled', 'Fingerprint enrollment cancelled.');
        else setSession(session, 'failed', errorText(error));
    } finally {
        if (child && child.exitCode === null && child.signalCode === null) {
            if (session.catalogueSent && !child.stdin.destroyed) child.stdin.write('CANCEL\n');
            if (!session.catalogueSent && !child.stdin.destroyed) child.stdin.end();
        }
        if (child) await Promise.race([closed, new Promise((resolve) => setTimeout(resolve, 3000))]);
        if (child && child.exitCode === null && child.signalCode === null) child.kill();
        for (const chunk of templateChunks) chunk.fill(0);
        templateChunks.length = 0;
        stderrPending.fill(0);
        session.child = null;
        session.connectedResolve = null;
        session.connectedReject = null;
        session.catalogueSent = false;
        if (activeSessionId === session.id) activeSessionId = null;
    }
}

function requestCancel(session) {
    if (!session || ['complete', 'failed', 'cancelled'].includes(session.status)) return;
    session.cancelRequested = true;
    session.status = 'cancelling';
    session.message = 'Stopping the reader and clearing the unsaved scans…';
    if (session.catalogueSent && session.child && !session.child.stdin.destroyed) {
        session.child.stdin.write('CANCEL\n');
    }
}

function readJson(request) {
    return new Promise((resolve, reject) => {
        let size = 0;
        const chunks = [];
        request.on('data', (chunk) => {
            size += chunk.length;
            if (size > 16 * 1024) {
                reject(Object.assign(new Error('Request body is too large.'), { statusCode: 413 }));
                request.destroy();
                return;
            }
            chunks.push(chunk);
        });
        request.on('end', () => {
            try { resolve(JSON.parse(Buffer.concat(chunks).toString('utf8'))); }
            catch { reject(Object.assign(new Error('Invalid JSON request.'), { statusCode: 400 })); }
        });
        request.on('error', reject);
    });
}

function loopbackHostAllowed(host) {
    return new Set([`127.0.0.1:${PORT}`, `localhost:${PORT}`]).has(host || '');
}

function checkOrigin(request, response) {
    const origin = request.headers.origin;
    if (!origin || !allowedOrigins.includes(origin) || !loopbackHostAllowed(request.headers.host)) {
        sendJson(response, 403, { message: 'This kiosk request origin is not allowed.' });
        return null;
    }
    response.setHeader('access-control-allow-origin', origin);
    response.setHeader('access-control-allow-methods', 'GET, POST, OPTIONS');
    response.setHeader('access-control-allow-headers', 'content-type');
    response.setHeader('access-control-max-age', '300');
    response.setHeader('vary', 'Origin');
    return origin;
}

function publicError(error) {
    const known = new Set([
        'Missing student_id', 'Missing lastname', 'Missing firstname', 'Missing department',
        'Student number already exists with different details', 'This student already has that finger enrolled',
    ]);
    return known.has(error?.message) || /^Invalid (student_id|lastname|firstname|middlename|suffix|department|major_program|year_level)$/.test(error?.message || '')
        ? error.message
        : 'Kiosk fingerprint service error. Check its local database and scanner connection.';
}

async function handleRequest(request, response) {
    if (!loopbackHostAllowed(request.headers.host)) {
        sendJson(response, 403, { message: 'The kiosk bridge is loopback-only.' });
        return;
    }
    const origin = checkOrigin(request, response);
    if (!origin) return;
    if (request.method === 'OPTIONS') {
        response.writeHead(204, { 'access-control-allow-origin': origin, 'access-control-allow-methods': 'GET, POST, OPTIONS',
            'access-control-allow-headers': 'content-type', 'access-control-max-age': '300', vary: 'Origin' });
        response.end();
        return;
    }

    const path = new URL(request.url, `http://127.0.0.1:${PORT}`).pathname;
    if (request.method === 'GET' && path === '/api/health') {
        sendJson(response, 200, { ok: true, scannerHelperBuilt: existsSync(helperPath) }, origin);
        return;
    }

    if (request.method === 'POST' && path === '/api/enrollments') {
        if (activeSessionId) {
            sendJson(response, 409, { message: 'A fingerprint enrollment is already in progress on this kiosk.' }, origin);
            return;
        }
        let body;
        try { body = await readJson(request); }
        catch (error) { sendJson(response, error.statusCode || 400, { message: errorText(error) }, origin); return; }
        if (!body || typeof body !== 'object' || Array.isArray(body) || Object.keys(body).sort().join(',') !== 'fingerPosition,profile' ||
            !Number.isInteger(body.fingerPosition) || body.fingerPosition < 1 || body.fingerPosition > 10) {
            sendJson(response, 400, { message: 'Choose a valid finger before enrolling.' }, origin);
            return;
        }
        let profile;
        try { profile = studentProfile(body.profile); }
        catch (error) { sendJson(response, 400, { message: publicError(error) }, origin); return; }
        const id = randomUUID();
        const session = { id, profile, fingerPosition: body.fingerPosition, status: 'starting', scanCount: 0,
            message: 'Starting the ZK9500 reader…', updatedAt: Date.now(), lastPollAt: Date.now(), cancelRequested: false };
        sessions.set(id, session);
        activeSessionId = id;
        session.watchdog = setInterval(() => {
            if (Date.now() - session.updatedAt > 2 * 60 * 1000) requestCancel(session);
            else if (session.child && Date.now() - session.lastPollAt > 30 * 1000) requestCancel(session);
        }, 2000);
        session.watchdog.unref?.();
        void runEnrollment(session);
        sendJson(response, 202, { id, status: session.status }, origin);
        return;
    }

    const match = path.match(/^\/api\/enrollments\/([0-9a-f-]{36})(?:\/(cancel))?$/i);
    if (match) {
        const session = sessions.get(match[1]);
        if (!session) { sendJson(response, 404, { message: 'Enrollment session expired. Start again.' }, origin); return; }
        session.lastPollAt = Date.now();
        if (request.method === 'POST' && match[2] === 'cancel') {
            requestCancel(session);
            sendJson(response, 202, publicSession(session), origin);
            return;
        }
        if (request.method === 'GET' && !match[2]) {
            sendJson(response, 200, publicSession(session), origin);
            return;
        }
    }

    sendJson(response, 404, { message: 'Kiosk endpoint not found.' }, origin);
}

async function main() {
    protectedKey = loadWindowsKey();
    try {
        database = await KioskDatabase.open({ config: mysqlConfig(), key: protectedKey.key, keyId: protectedKey.keyId });
    } finally { protectedKey.key.fill(0); }

    const server = createServer((request, response) => {
        void handleRequest(request, response).catch((error) => {
            if (!response.headersSent) sendJson(response, 500, { message: 'Kiosk fingerprint service error.' });
            else response.destroy();
            process.stderr.write(`Kiosk bridge request failed: ${errorText(error)}\n`);
        });
    });
    server.requestTimeout = 20_000;
    server.headersTimeout = 10_000;
    server.keepAliveTimeout = 5_000;
    server.listen(PORT, '127.0.0.1', () => {
        process.stdout.write(`Kiosk fingerprint bridge listening on http://127.0.0.1:${PORT}\n`);
    });

    const shutdown = () => {
        for (const session of sessions.values()) requestCancel(session);
        server.close();
        database?.close().catch(() => {});
    };
    process.once('SIGINT', shutdown);
    process.once('SIGTERM', shutdown);
}

main().catch((error) => {
    process.stderr.write(`Kiosk fingerprint bridge could not start: ${errorText(error)}\n`);
    process.exitCode = 1;
});
