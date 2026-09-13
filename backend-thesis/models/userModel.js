import db from "../config/db.js";

// Find user by email - used for login
export const findUserByEmail = async (email) => {
    const [rows] = await db.query(
        `SELECT 
            id,
            fullname,
            email,
            password,
            role,
            organization,
            status,
            must_change_password
         FROM users
         WHERE email = ?
         LIMIT 1`,
        [email]
    );

    return rows[0];
};

// Get all active Event Admins
export const getAllEventAdmins = async () => {
    const [rows] = await db.query(
        `SELECT
            id,
            fullname,
            email,
            organization,
            status,
            must_change_password,
            created_at
         FROM users
         WHERE role = 'event_admin' AND status = 'active'
         ORDER BY id DESC`
    );

    return rows;
};

// Get one active Event Admin by ID
export const getEventAdminById = async (id) => {
    const [rows] = await db.query(
        `SELECT
            id,
            fullname,
            email,
            organization,
            status,
            must_change_password,
            created_at
         FROM users
         WHERE id = ? AND role = 'event_admin' AND status = 'active'
         LIMIT 1`,
        [id]
    );

    return rows[0];
};

export const createEventAdmin = async ({ fullname, email, password, organization }) => {
    const [existingRows] = await db.query(
        `SELECT id, status
         FROM users
         WHERE email = ? AND role = 'event_admin'
         LIMIT 1`,
        [email]
    );

    const existingAdmin = existingRows[0];

    if (existingAdmin) {
        if (existingAdmin.status === "active") {
            const duplicateError = new Error("An account with that email already exists.");
            duplicateError.code = "ER_DUP_ENTRY";
            throw duplicateError;
        }

        await db.query(
            `UPDATE users
             SET fullname = ?,
                 password = ?,
                 organization = ?,
                 status = 'active',
                 must_change_password = 1,
                 updated_at = CURRENT_TIMESTAMP
             WHERE id = ? AND role = 'event_admin'`,
            [fullname, password, organization, existingAdmin.id]
        );

        return existingAdmin.id;
    }

    const [result] = await db.query(
        `INSERT INTO users
            (fullname, email, password, role, organization, status, must_change_password)
         VALUES (?, ?, ?, 'event_admin', ?, 'active', 1)`,
        [fullname, email, password, organization]
    );

    return result.insertId;
};

export const deleteEventAdminById = async (id) => {
    const [result] = await db.query(
        `UPDATE users
         SET status = 'inactive',
             updated_at = CURRENT_TIMESTAMP
         WHERE id = ? AND role = 'event_admin' AND status = 'active'`,
        [id]
    );

    return result.affectedRows > 0;
};