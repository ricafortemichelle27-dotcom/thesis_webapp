import db from "../config/db.js";

// Create a new event
export const createEvent = async ({
    event_name,
    event_admin_id,
    event_date,
    time_start,
    time_end,
    letter_of_approval,
    certificate_template,
    status
}) => {
    const [result] = await db.query(
        `INSERT INTO events
        (
            event_name,
            event_admin_id,
            event_date,
            time_start,
            time_end,
            letter_of_approval,
            certificate_template,
            status
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
            event_name,
            event_admin_id,
            event_date,
            time_start,
            time_end,
            letter_of_approval || null,
            certificate_template || null,
            status || "pending"
        ]
    );

    return result.insertId;
};


// Add eligibility for an event
export const createEventEligibility = async ({
    event_id,
    department,
    major_program,
    year_level
}) => {
    const [result] = await db.query(
        `INSERT INTO event_eligibility
        (
            event_id,
            department,
            major_program,
            year_level
        )
        VALUES (?, ?, ?, ?)` ,
        [
            event_id,
            department,
            major_program || null,
            year_level || null
        ]
    );

    return result.insertId;
};


// Get all events
export const getAllEvents = async () => {
    const [rows] = await db.query(
        `SELECT
            e.id,
            e.event_name,
            e.event_admin_id,
            u.fullname AS event_admin_name,
            e.event_date,
            e.time_start,
            e.time_end,
            e.letter_of_approval,
            e.certificate_template,
            e.status,
            e.decline_reason,
            CASE
                WHEN CONCAT(e.event_date, ' ', e.time_end) < NOW()
                    THEN 'finished'
                WHEN CONCAT(e.event_date, ' ', e.time_start) > NOW()
                    THEN 'upcoming'
                ELSE 'ongoing'
            END AS event_status,
            e.created_at,
            e.updated_at
        FROM events e
        INNER JOIN users u
            ON e.event_admin_id = u.id
        ORDER BY e.event_date DESC, e.time_start DESC`
    );

    return rows;
};


// Get one event
export const getEventById = async (id) => {
    const [eventRows] = await db.query(
        `SELECT
            e.id,
            e.event_name,
            e.event_admin_id,
            u.fullname AS event_admin_name,
            e.event_date,
            e.time_start,
            e.time_end,
            e.letter_of_approval,
            e.certificate_template,
            e.status,
            e.decline_reason,
            CASE
                WHEN CONCAT(e.event_date, ' ', e.time_end) < NOW()
                    THEN 'finished'
                WHEN CONCAT(e.event_date, ' ', e.time_start) > NOW()
                    THEN 'upcoming'
                ELSE 'ongoing'
            END AS event_status,
            e.created_at,
            e.updated_at
        FROM events e
        INNER JOIN users u
            ON e.event_admin_id = u.id
        WHERE e.id = ?`,
        [id]
    );

    if (eventRows.length === 0) {
        return null;
    }

    const [eligibilityRows] = await db.query(
        `SELECT
            id,
            event_id,
            department,
            major_program,
            year_level
        FROM event_eligibility
        WHERE event_id = ?
        ORDER BY id ASC`,
        [id]
    );

    return {
        ...eventRows[0],
        eligibility: eligibilityRows
    };
};


// Get eligibility for an event
export const getEventEligibility = async (eventId) => {
    const [rows] = await db.query(
        `SELECT
            id,
            event_id,
            department,
            major_program,
            year_level
        FROM event_eligibility
        WHERE event_id = ?
        ORDER BY id ASC`,
        [eventId]
    );

    return rows;
};


export const updateEventById = async ({
    id,
    event_name,
    event_admin_id,
    event_date,
    time_start,
    time_end,
    letter_of_approval,
    certificate_template,
    status,
    decline_reason
}) => {
    const [result] = await db.query(
        `UPDATE events
        SET
            event_name = ?,
            event_admin_id = ?,
            event_date = ?,
            time_start = ?,
            time_end = ?,
            letter_of_approval = ?,
            certificate_template = ?,
            status = ?,
            decline_reason = ?
        WHERE id = ?`,
        [
            event_name,
            event_admin_id,
            event_date,
            time_start,
            time_end,
            letter_of_approval || null,
            certificate_template || null,
            status || "pending",
            decline_reason || null,
            id
        ]
    );

    return result.affectedRows;
};


export const deleteEventById = async (id) => {
    const [result] = await db.query(
        `DELETE FROM events
        WHERE id = ?`,
        [id]
    );

    return result.affectedRows;
};


export const deleteEventEligibilityByEventId = async (eventId) => {
    const [result] = await db.query(
        `DELETE FROM event_eligibility
        WHERE event_id = ?`,
        [eventId]
    );

    return result.affectedRows;
};