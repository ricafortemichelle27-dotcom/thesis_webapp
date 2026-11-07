import { centralId } from '../../shared/kiosk-sync-contract.mjs';

export async function synchronize(database, { backendOrigin, token, eventIds = [], studentIds = [], fetchImpl = fetch, maxOperations = 100 }) {
    if (typeof token !== 'string' || token.length < 32) throw new Error('Provision a kiosk sync credential of at least 32 characters');
    const origin = await database.bindBackend(backendOrigin);
    const request = async (path, body) => fetchImpl(`${origin}/api/kiosk-sync${path}`, {
        method: 'POST', redirect: 'error', signal: AbortSignal.timeout(20000),
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify(body),
    });
    let acknowledged = 0;
    for (let count = 0; count < maxOperations; count++) {
        const claim = await database.claimNext();
        if (!claim) break;
        const { payload, leaseToken } = claim;
        try {
            const response = await request('/operations', payload);
            if (!response.ok) {
                const conflict = [400, 404, 409, 422].includes(response.status);
                await database.fail(payload.operation_id, leaseToken, { conflict, code: `HTTP_${response.status}` });
                if (!conflict) break;
                continue;
            }
            await database.acknowledge(payload.operation_id, leaseToken, await response.json());
            acknowledged++;
        } catch {
            await database.fail(payload.operation_id, leaseToken, { code: 'TRANSPORT_OR_RECEIPT_ERROR' });
            break;
        }
    }
    const selection = await database.cacheSelection();
    const selected = { student_ids: [...new Set([...selection.student_ids, ...studentIds].map(centralId))],
        event_ids: [...new Set([...selection.event_ids, ...eventIds].map(centralId))] };
    // Bounded snapshots; each successful page and cursor commits atomically. Re-fetching is safe.
    for (let offset = 0; offset < Math.max(selected.student_ids.length, selected.event_ids.length); offset += 100) {
        const page = { student_ids: selected.student_ids.slice(offset, offset + 100), event_ids: selected.event_ids.slice(offset, offset + 100) };
        const response = await request('/snapshot', page);
        if (!response.ok) throw new Error(`Cache refresh failed (HTTP ${response.status}); previous cache retained`);
        await database.applySnapshot(await response.json(), `selection:${page.student_ids.join(',')}/${page.event_ids.join(',')}`);
    }
    return { acknowledged, queue: await database.syncStatus() };
}
