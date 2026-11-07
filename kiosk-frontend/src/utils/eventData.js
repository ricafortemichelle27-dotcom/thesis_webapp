export function formatEventDate(value) {
    if (!value) return 'Date not provided';
    const date = new Date(`${value.slice(0, 10)}T00:00:00`);
    return Number.isNaN(date.getTime()) ? 'Invalid event date' : date.toLocaleDateString('en-US', {
        month: 'long', day: 'numeric', year: 'numeric',
    });
}

export function formatEventTime(value) {
    if (!value) return 'Time not provided';
    const [hour, minute] = value.split(':');
    return `${Number(hour) % 12 || 12}:${minute} ${Number(hour) >= 12 ? 'PM' : 'AM'}`;
}

// Schedules refer to the event's local date/time in the Philippines, regardless of device timezone.
export function photoboothStatus(event, now = Date.now()) {
    if (!event?.photobooth_start || !event?.photobooth_end) {
        return { available: false, message: 'Photobooth is not available for this event.' };
    }
    const date = event.event_date?.slice(0, 10);
    const start = Date.parse(`${date}T${event.photobooth_start}+08:00`);
    const end = Date.parse(`${date}T${event.photobooth_end}+08:00`);
    const schedule = `${formatEventTime(event.photobooth_start)} – ${formatEventTime(event.photobooth_end)}`;
    if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) {
        return { available: false, message: 'The event photobooth schedule is invalid.' };
    }
    return {
        available: now >= start && now < end,
        message: now >= start && now < end ? `Photobooth open: ${schedule}`
            : `Photobooth closed. Scheduled for ${formatEventDate(date)}, ${schedule} (Philippine time).`,
    };
}
