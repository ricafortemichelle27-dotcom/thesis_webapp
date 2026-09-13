import db from "../config/db.js";

export const getApprovedEvents = async (eventAdminId = null) => {
    const params = [];
    let ownershipClause = "";

    if (eventAdminId !== null) {
        ownershipClause = "AND e.event_admin_id = ?";
        params.push(eventAdminId);
    }

    const [rows] = await db.query(`
        SELECT
            e.id,
            e.event_name,
            e.event_date,
            e.time_start,
            e.time_end,
            e.certificate_template,
            e.event_admin_id
        FROM events e
        WHERE e.status = 'approved'
        ${ownershipClause}
        ORDER BY e.event_date DESC
    `, params);

    return rows;
};

export const getAllCertificates = async () => {
    const [rows] = await db.query(`
        SELECT
            c.id,
            c.event_id,
            c.student_id,
            c.certificate_file,
            c.sent_to,
            c.sent_at,
            c.status,
            c.created_at,

            e.event_name,

            CONCAT(
                s.firstname,
                ' ',
                s.middlename,
                ' ',
                s.lastname
            ) AS student_name

        FROM certificates c

        INNER JOIN events e
            ON c.event_id = e.id

        INNER JOIN students s
            ON c.student_id = s.id

        ORDER BY c.created_at DESC
    `);

    return rows;
};


export const getCertificatesByEvent = async (eventId) => {
    const [rows] = await db.query(`
        SELECT
            c.id,
            c.event_id,
            c.student_id,
            c.certificate_file,
            c.sent_to,
            c.sent_at,
            c.status,
            c.created_at,

            e.event_name,

            CONCAT(
                s.firstname,
                ' ',
                s.middlename,
                ' ',
                s.lastname
            ) AS student_name

        FROM certificates c

        INNER JOIN events e
            ON c.event_id = e.id

        INNER JOIN students s
            ON c.student_id = s.id

        WHERE c.event_id = ?

        ORDER BY c.created_at DESC
    `, [eventId]);

    return rows;
};


export const createCertificate = async ({
    eventId,
    studentId,
    certificateFile,
    sentTo
}) => {
    const [result] = await db.query(`
        INSERT INTO certificates (
            event_id,
            student_id,
            certificate_file,
            sent_to,
            status
        )
        VALUES (?, ?, ?, ?, 'generated')
    `, [
        eventId,
        studentId,
        certificateFile,
        sentTo
    ]);

    return result.insertId;
};