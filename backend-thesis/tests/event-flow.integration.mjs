// Opt-in integration test: uses the configured MySQL/Cloudinary services and cleans up its own fixtures.
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { writeFile, unlink } from 'node:fs/promises';
import express from 'express';
import cors from 'cors';
import { v2 as cloudinary } from 'cloudinary';
import db from '../config/db.js';
import eventRoutes from '../routes/eventRoutes.js';
import kioskRoutes from '../routes/kioskRoutes.js';

if (!process.argv.includes('--live')) throw new Error('Pass --live to test the configured database and uploads.');
const app = express();
app.use(cors());
app.use(express.json());
app.use('/api/events', eventRoutes);
app.use('/api/kiosk', kioskRoutes);
let finishBrowserTests;
const browserTestsFinished = new Promise((resolve) => { finishBrowserTests = resolve; });
app.post('/__test/finish', (req, res) => { res.json({ message: 'Cleaning up test fixture.' }); finishBrowserTests(); });
app.use((error, req, res, next) => {
    res.status(400).json({ message: error.message });
});
const server = app.listen(0, '127.0.0.1');
await once(server, 'listening');
const base = `http://127.0.0.1:${server.address().port}`;
const marker = `event-flow-test-${Date.now()}`;
const image = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+j4xkAAAAASUVORK5CYII=', 'base64');
const pdf = Buffer.from('%PDF-1.4\n1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n2 0 obj\n<< /Type /Pages /Kids [] /Count 0 >>\nendobj\ntrailer\n<< /Root 1 0 R >>\n%%EOF');
const assets = new Map();
let adminId, otherAdminId, eventId;
const fixturePath = new URL('../.event-flow-test.json', import.meta.url);
const trackAsset = (url) => {
    if (!url) return;
    const match = url.match(/\/(image|raw)\/upload\/(?:v\d+\/)?(.+)$/);
    if (match) assets.set(match[1] + ':' + match[2], {
        type: match[1], id: match[1] === 'image' ? match[2].replace(/\.[^.]+$/, '') : match[2],
    });
};
const request = async (path, options = {}, status = 200) => {
    const response = await fetch(base + path, options);
    const data = await response.json();
    assert.equal(response.status, status, JSON.stringify(data));
    return data;
};
const configuration = (overrides = {}, withImages = false) => {
    const form = new FormData();
    const values = {
        requested_by_user_id: adminId,
        event_description: 'Persisted event description', kiosk_theme_mode: 'custom',
        photobooth_start: '09:00', photobooth_end: '12:00',
        speakers: JSON.stringify([{ name: 'Speaker One', description: 'First description', ...(withImages ? { photo_index: 0 } : {}) },
            { name: 'Speaker Two', description: 'Second description', ...(withImages ? { photo_index: 1 } : {}) }]),
        ...overrides,
    };
    for (const [key, value] of Object.entries(values)) form.append(key, String(value));
    if (withImages) {
        for (const key of ['event_logo', 'background_display_photo', 'speaker_photos', 'speaker_photos']) {
            form.append(key, new Blob([image], { type: 'image/png' }), `${marker}.png`);
        }
    }
    return form;
};
try {
    for (const suffix of ['owner', 'other']) {
        const [result] = await db.query(`INSERT INTO users (fullname, email, password, role, status)
            VALUES (?, ?, ?, 'event_admin', 'active')`, [marker, `${marker}-${suffix}@example.invalid`, 'test-only-no-login']);
        if (suffix === 'owner') adminId = result.insertId;
        else otherAdminId = result.insertId;
    }
    const create = new FormData();
    const basics = { requested_by_user_id: adminId, event_admin_id: adminId, event_name: marker,
        event_date: '2026-09-24', time_start: '08:00', time_end: '17:00', location: 'Test auditorium',
        eligibility: JSON.stringify([{ department: 'Test department', major_program: null, year_level: '1' }]) };
    for (const [key, value] of Object.entries(basics)) create.append(key, String(value));
    for (const key of ['letter_of_approval', 'certificate_template']) create.append(key, new Blob([pdf], { type: 'application/pdf' }), `${marker}.pdf`);
    const created = await request('/api/events', { method: 'POST', body: create }, 201);
    eventId = created.event.id;
    trackAsset(created.event.letter_of_approval);
    trackAsset(created.event.certificate_template);
    console.log('PASS event creation and both PDF uploads');
    for (const url of [created.event.letter_of_approval, created.event.certificate_template]) {
        const response = await fetch(url);
        console.log(response.ok ? 'PASS PDF URL delivery' : `KNOWN DELIVERY ISSUE: PDF returned HTTP ${response.status} (${response.headers.get('x-cld-error') || 'no delivery detail'}).`);
        await response.body?.cancel();
    }
    await request(`/api/kiosk/events/${eventId}`, {}, 404);
    assert.ok(!(await request('/api/kiosk/events')).events.some((event) => event.id === eventId));
    console.log('PASS pending events excluded from kiosk');

    const saved = await request(`/api/events/${eventId}/configuration`, { method: 'PUT', body: configuration({}, true) });
    for (const url of [saved.event.event_logo, saved.event.background_display_photo, ...saved.event.speakers.map((speaker) => speaker.photo)]) trackAsset(url);
    const reloaded = (await request(`/api/events/${eventId}`)).event;
    assert.equal(reloaded.event_description, 'Persisted event description');
    assert.equal(reloaded.kiosk_theme_mode, 'custom');
    assert.equal(reloaded.photobooth_start, '09:00:00');
    assert.deepEqual(reloaded.speakers.map((speaker) => speaker.name), ['Speaker One', 'Speaker Two']);
    assert.deepEqual(reloaded.speakers.map((speaker) => speaker.speaker_order), [1, 2]);
    assert.equal(reloaded.letter_of_approval, created.event.letter_of_approval);
    assert.equal(reloaded.certificate_template, created.event.certificate_template);
    const [stored] = await db.query('SELECT event_description, event_logo FROM events WHERE id = ?', [eventId]);
    assert.equal(stored[0].event_description, reloaded.event_description);
    assert.equal(stored[0].event_logo, reloaded.event_logo);
    for (const url of [reloaded.event_logo, reloaded.background_display_photo, ...reloaded.speakers.map((speaker) => speaker.photo)]) {
        const response = await fetch(url);
        assert.equal(response.status, 200);
        assert.match(response.headers.get('content-type'), /^image\//);
    }
    console.log('PASS fresh API reload, direct SQL persistence, speaker order, and four hosted images');

    await request(`/api/events/${eventId}/configuration`, { method: 'PUT', body: configuration({ requested_by_user_id: otherAdminId }) }, 403);
    await request(`/api/events/${eventId}/configuration`, { method: 'PUT', body: configuration({ photobooth_end: '08:00' }) }, 400);
    const invalid = configuration();
    invalid.append('event_logo', new Blob(['bad'], { type: 'text/plain' }), 'bad.txt');
    await request(`/api/events/${eventId}/configuration`, { method: 'PUT', body: invalid }, 400);
    console.log('PASS ownership, schedule, and file-type rejection');

    const edit = { requested_by_user_id: adminId, event_name: marker + ' edited',
        eligibility: [{ department: 'Updated department', major_program: 'Updated program', year_level: '2' }] };
    await request(`/api/events/${eventId}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(edit) });
    let current = (await request(`/api/events/${eventId}`)).event;
    assert.equal(current.event_name, edit.event_name);
    assert.equal(current.eligibility[0].department, 'Updated department');
    assert.equal(current.event_logo, reloaded.event_logo);
    assert.equal(current.letter_of_approval, created.event.letter_of_approval);
    assert.equal(current.certificate_template, created.event.certificate_template);
    assert.equal(current.speakers.length, 2);
    console.log('PASS basic event editing, eligibility replacement, and preservation of configuration/PDFs');

    // Approve only this test fixture to exercise configuration of an approved event.
    await db.query("UPDATE events SET status = 'approved' WHERE id = ?", [eventId]);
    await request(`/api/events/${eventId}/configuration`, { method: 'PUT', body: configuration({
        kiosk_theme_mode: 'wis', event_description: 'Updated description after approval',
        photobooth_start: '', photobooth_end: '', speakers: JSON.stringify([...current.speakers].reverse()),
    }) });
    current = (await request(`/api/events/${eventId}`)).event;
    assert.equal(current.status, 'approved');
    assert.equal(current.event_description, 'Updated description after approval');
    assert.equal(current.event_logo, reloaded.event_logo);
    assert.equal(current.photobooth_start, null);
    assert.equal(current.photobooth_end, null);
    assert.equal(current.speakers[0].name, 'Speaker Two');
    console.log('PASS approved-event configuration, WIS logo preservation, reordered speakers, and disabled photobooth');

    const kiosk = (await request(`/api/kiosk/events/${eventId}`)).event;
    assert.equal(kiosk.event_description, current.event_description);
    assert.equal(kiosk.event_date, '2026-09-24');
    assert.equal(kiosk.event_logo, current.event_logo);
    assert.deepEqual(kiosk.speakers, current.speakers);
    assert.deepEqual(kiosk.eligibility, current.eligibility);
    assert.equal(kiosk.letter_of_approval, undefined);
    assert.equal(kiosk.event_admin_id, undefined);
    await request('/api/kiosk/events/invalid', {}, 400);
    console.log('PASS kiosk approved-event data, date, speakers, eligibility, and response field restrictions');

    if (process.argv.includes('--serve')) {
        await writeFile(fixturePath, JSON.stringify({ base, eventId, adminId, marker }));
        console.log('Browser fixture ready; POST /__test/finish to clean up and finish.');
        await browserTestsFinished;
    }
} finally {
    if (eventId) {
        // Include any assets uploaded by browser tests before deleting our fixture.
        const [rows] = await db.query('SELECT event_logo, background_display_photo FROM events WHERE id = ?', [eventId]);
        const [speakers] = await db.query('SELECT speaker_photo FROM event_speakers WHERE event_id = ?', [eventId]);
        for (const row of rows) { trackAsset(row.event_logo); trackAsset(row.background_display_photo); }
        for (const row of speakers) trackAsset(row.speaker_photo);
        await db.query('DELETE FROM event_speakers WHERE event_id = ?', [eventId]);
        await db.query('DELETE FROM event_eligibility WHERE event_id = ?', [eventId]);
        await db.query('DELETE FROM events WHERE id = ? AND event_name LIKE ?', [eventId, `${marker}%`]);
    }
    for (const id of [adminId, otherAdminId].filter(Boolean)) await db.query('DELETE FROM users WHERE id = ? AND fullname = ?', [id, marker]);
    cloudinary.config({ cloud_name: process.env.CLOUDINARY_CLOUD_NAME, api_key: process.env.CLOUDINARY_API_KEY, api_secret: process.env.CLOUDINARY_API_SECRET });
    for (const asset of assets.values()) await cloudinary.uploader.destroy(asset.id, { resource_type: asset.type, invalidate: true });
    await unlink(fixturePath).catch(() => {});
    server.close();
    await db.end();
    console.log('Temporary database records and test uploads cleaned up.');
}
