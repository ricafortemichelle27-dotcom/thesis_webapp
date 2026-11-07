import express from 'express';
import { createHash, timingSafeEqual } from 'node:crypto';
import db from '../config/db.js';
import { centralId, validateOperation } from '../../shared/kiosk-sync-contract.mjs';
import { receiveOperation, selectedSnapshot } from '../services/kioskSyncService.js';

const router = express.Router();
router.use((req, res, next) => {
    res.set('Cache-Control', 'no-store');
    const expected = process.env.KIOSK_SYNC_TOKEN;
    if (!expected || expected.length < 32) return res.status(503).json({ code: 'SYNC_NOT_CONFIGURED' });
    const received = req.get('Authorization') ?? '';
    const digest = (value) => createHash('sha256').update(value).digest();
    if (!timingSafeEqual(digest(received), digest(`Bearer ${expected}`))) return res.status(401).json({ code: 'UNAUTHORIZED' });
    next();
});
router.post('/operations', async (req, res) => {
    let operation;
    try { operation = validateOperation(req.body); }
    catch { return res.status(400).json({ code: 'INVALID_OPERATION' }); }
    try { res.json(await receiveOperation(db, operation)); }
    catch (error) { res.status(error.status === 409 ? 409 : 503).json({ code: error.status === 409 ? 'SYNC_CONFLICT' : 'SYNC_UNAVAILABLE' }); }
});
router.post('/snapshot', async (req, res) => {
    try {
        if (!req.body || Object.keys(req.body).some((key) => !['student_ids', 'event_ids'].includes(key))) throw new Error();
        for (const field of ['student_ids', 'event_ids']) {
            if (!Array.isArray(req.body[field]) || req.body[field].length > 100) throw new Error();
            req.body[field].forEach(centralId);
        }
    } catch { return res.status(400).json({ code: 'INVALID_SELECTION' }); }
    try { res.json(await selectedSnapshot(db, req.body)); }
    catch { res.status(503).json({ code: 'SNAPSHOT_UNAVAILABLE' }); }
});
export default router;
