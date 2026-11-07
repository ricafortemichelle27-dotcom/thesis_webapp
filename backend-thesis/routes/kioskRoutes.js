import express from 'express';
import db from '../config/db.js';
import { getEventById } from '../models/eventModel.js';

const router = express.Router();
router.use((req, res, next) => { res.set('Cache-Control', 'no-store'); next(); });

router.get('/events', async (req, res) => {
    try {
        const [events] = await db.query(`SELECT id, event_name, DATE_FORMAT(event_date, '%Y-%m-%d') AS event_date,
            time_start, time_end, location, event_logo, status, kiosk_theme_mode FROM events WHERE status = 'approved' AND event_date >= DATE(UTC_TIMESTAMP() + INTERVAL 8 HOUR) ORDER BY event_date DESC, time_start, id`);
        res.json({ events });
    } catch (error) {
        console.error('Kiosk event list error:', error);
        res.status(500).json({ message: 'Unable to retrieve approved events.' });
    }
});

router.get('/events/:id', async (req, res) => {
    if (!/^[1-9]\d*$/.test(req.params.id)) return res.status(400).json({ message: 'Invalid event ID.' });
    try {
        const event = await getEventById(req.params.id);
        const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Manila', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
        if (!event || event.status !== 'approved' || event.event_date < today) return res.status(404).json({ message: 'Approved event not found.' });
        // Keep admin information and approval/certificate documents out of the kiosk response.
        const fields = ['id', 'event_name', 'event_date', 'time_start', 'time_end', 'location',
            'event_description', 'kiosk_theme_mode', 'event_logo', 'background_display_photo',
            'photobooth_start', 'photobooth_end', 'speakers', 'eligibility'];
        res.json({ event: Object.fromEntries(fields.map((field) => [field, event[field]])) });
    } catch (error) {
        console.error('Kiosk event error:', error);
        res.status(500).json({ message: 'Unable to retrieve event configuration.' });
    }
});

export default router;
