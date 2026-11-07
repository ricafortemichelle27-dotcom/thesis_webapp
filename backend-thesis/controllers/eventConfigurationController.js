import db from '../config/db.js';
import { getEventById } from '../models/eventModel.js';
import { uploadImageToCloudinary, deleteCloudinaryAsset } from '../utils/cloudinary.js';

const badRequest = (message) => Object.assign(new Error(message), { status: 400 });
const normalizeTime = (value) => {
    if (value === '' || value == null) return null;
    if (typeof value !== 'string' || !/^([01]\d|2[0-3]):[0-5]\d(?::[0-5]\d)?$/.test(value)) {
        throw badRequest('Photobooth times must be valid 24-hour times.');
    }
    return value.length === 5 ? `${value}:00` : value;
};

export async function saveEventConfiguration(req, res) {
    const uploaded = [];
    let connection;
    let committed = false;
    try {
        const event = await getEventById(req.params.id);
        if (!event) return res.status(404).json({ message: 'Event not found.' });
        // Reuse the application's existing actor/ownership convention.
        const actorId = req.body.requested_by_user_id;
        const [actors] = await db.query('SELECT id, role FROM users WHERE id = ?', [actorId || null]);
        const actor = actors[0];
        if (!actor || !(actor.role === 'system_admin' ||
            (actor.role === 'event_admin' && Number(actor.id) === Number(event.event_admin_id)))) {
            return res.status(403).json({ message: 'You can only configure your own events.' });
        }
        const mode = req.body.kiosk_theme_mode;
        if (!['wis', 'custom'].includes(mode)) throw badRequest('Choose WIS or Custom theme.');
        const start = normalizeTime(req.body.photobooth_start);
        const end = normalizeTime(req.body.photobooth_end);
        if (Boolean(start) !== Boolean(end) || (start && start >= end)) {
            throw badRequest('Provide both photobooth times, with the end later than the start, or leave both empty.');
        }
        let speakers;
        try { speakers = JSON.parse(req.body.speakers); }
        catch { throw badRequest('Speakers must be valid JSON.'); }
        if (!Array.isArray(speakers) || speakers.length > 20) throw badRequest('Provide no more than 20 speakers.');
        const photos = req.files?.speaker_photos || [];
        const usedPhotos = new Set();
        const existing = new Map(event.speakers.map((speaker) => [Number(speaker.id), speaker]));
        const usedIds = new Set();
        const normalized = speakers.map((speaker, index) => {
            if (!speaker || typeof speaker !== 'object') throw badRequest('Invalid speaker.');
            const id = speaker.id == null ? null : Number(speaker.id);
            if (id !== null && (!existing.has(id) || usedIds.has(id))) throw badRequest('Invalid or duplicate speaker ID.');
            if (id !== null) usedIds.add(id);
            const name = typeof speaker.name === 'string' ? speaker.name.trim() : '';
            const description = typeof speaker.description === 'string' ? speaker.description.trim() : '';
            if (name.length > 200 || description.length > 10000) throw badRequest('Speaker text is too long.');
            if (speaker.photo_index != null) {
                if (!Number.isInteger(speaker.photo_index) || !photos[speaker.photo_index] || usedPhotos.has(speaker.photo_index)) {
                    throw badRequest('Invalid speaker photo reference.');
                }
                usedPhotos.add(speaker.photo_index);
            }
            return { id, name, description, order: index + 1, photo: existing.get(id)?.photo || null, photoIndex: speaker.photo_index };
        });
        if (usedPhotos.size !== photos.length) throw badRequest('A speaker photo has no matching speaker.');
        const description = typeof req.body.event_description === 'string' ? req.body.event_description.trim() : '';
        if (description.length > 10000) throw badRequest('Event description must be 10,000 characters or fewer.');
        const upload = async (file, folder) => {
            const asset = await uploadImageToCloudinary(file, folder);
            uploaded.push(asset.publicId);
            return asset.url;
        };
        const logo = req.files?.event_logo?.[0]
            ? await upload(req.files.event_logo[0], 'thesis-events/logos') : event.event_logo;
        const background = req.files?.background_display_photo?.[0]
            ? await upload(req.files.background_display_photo[0], 'thesis-events/backgrounds') : event.background_display_photo;
        for (const speaker of normalized) {
            if (speaker.photoIndex != null) speaker.photo = await upload(photos[speaker.photoIndex], 'thesis-events/speakers');
        }
        connection = await db.getConnection();
        await connection.beginTransaction();
        const [locked] = await connection.query('SELECT event_admin_id FROM events WHERE id = ? FOR UPDATE', [event.id]);
        if (!locked.length || (actor.role !== 'system_admin' && Number(locked[0].event_admin_id) !== Number(actor.id))) {
            throw Object.assign(new Error('Event ownership changed. Reload and try again.'), { status: 409 });
        }
        await connection.query(`UPDATE events SET event_description = ?, kiosk_theme_mode = ?, event_logo = ?,
            background_display_photo = ?, photobooth_start = ?, photobooth_end = ? WHERE id = ?`,
        [description, mode, logo, background, start, end, event.id]);
        const retained = normalized.filter((speaker) => speaker.id != null).map((speaker) => speaker.id);
        await connection.query(`DELETE FROM event_speakers WHERE event_id = ?${retained.length ? ' AND id NOT IN (?)' : ''}`,
            retained.length ? [event.id, retained] : [event.id]);
        for (const speaker of normalized) {
            const values = [speaker.name || null, speaker.photo, speaker.description || null, speaker.order];
            if (speaker.id != null) {
                await connection.query(`UPDATE event_speakers SET speaker_name = ?, speaker_photo = ?, speaker_description = ?,
                    speaker_order = ? WHERE event_id = ? AND id = ?`, [...values, event.id, speaker.id]);
            } else {
                await connection.query(`INSERT INTO event_speakers (speaker_name, speaker_photo, speaker_description, speaker_order, event_id)
                    VALUES (?, ?, ?, ?, ?)`, [...values, event.id]);
            }
        }
        await connection.commit();
        committed = true;
        connection.release();
        connection = null;
        return res.json({ message: 'Event configuration saved.', event: await getEventById(event.id) });
    } catch (error) {
        if (connection && !committed) await connection.rollback().catch((rollbackError) => console.error('Configuration rollback error:', rollbackError));
        if (!committed) await Promise.allSettled(uploaded.map((id) => deleteCloudinaryAsset(id, 'image')));
        if (!error.status || error.status >= 500) console.error('Event configuration error:', error);
        return res.status(error.status || 500).json({ message: error.status ? error.message :
            committed ? 'Configuration saved, but reloading failed. Please refresh.' : 'Unable to save event configuration.' });
    } finally {
        connection?.release();
    }
}
