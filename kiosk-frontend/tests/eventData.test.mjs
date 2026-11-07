import test from 'node:test';
import assert from 'node:assert/strict';
import { photoboothStatus, formatEventDate, formatEventTime } from '../src/utils/eventData.js';

const event = { event_date: '2026-09-24', photobooth_start: '09:00:00', photobooth_end: '12:00:00' };
test('photobooth is closed before its Philippine-time schedule', () => {
    assert.equal(photoboothStatus(event, Date.parse('2026-09-24T00:59:59Z')).available, false);
});
test('photobooth opens at the start boundary', () => {
    assert.equal(photoboothStatus(event, Date.parse('2026-09-24T01:00:00Z')).available, true);
});
test('photobooth remains open until the end boundary', () => {
    assert.equal(photoboothStatus(event, Date.parse('2026-09-24T03:59:59Z')).available, true);
    assert.equal(photoboothStatus(event, Date.parse('2026-09-24T04:00:00Z')).available, false);
});
test('photobooth does not open on a different day', () => {
    assert.equal(photoboothStatus(event, Date.parse('2026-09-25T01:30:00Z')).available, false);
});
test('null schedule means unavailable', () => {
    assert.equal(photoboothStatus({ ...event, photobooth_start: null, photobooth_end: null }).available, false);
});
test('invalid or reversed schedules never enable the camera', () => {
    assert.equal(photoboothStatus({ ...event, photobooth_end: '08:00:00' }).available, false);
    assert.equal(photoboothStatus({ ...event, event_date: 'invalid' }).available, false);
});
test('date-only strings retain the event day and times format correctly', () => {
    assert.equal(formatEventDate(event.event_date), 'September 24, 2026');
    assert.equal(formatEventTime('00:00:00'), '12:00 AM');
    assert.equal(formatEventTime('12:00:00'), '12:00 PM');
});
