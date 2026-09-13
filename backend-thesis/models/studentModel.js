import db from "../config/db.js";

// Create a new student
export const createStudent = async ({
    student_id,
    lastname,
    firstname,
    middlename,
    suffix,
    department,
    major_program,
    year_level
}) => {
    const [result] = await db.query(
        `INSERT INTO students
        (
            student_id,
            lastname,
            firstname,
            middlename,
            suffix,
            department,
            major_program,
            year_level
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
            student_id,
            lastname,
            firstname,
            middlename || null,
            suffix || null,
            department,
            major_program,
            year_level
        ]
    );

    return result.insertId;
};

// Get all students
export const getAllStudents = async () => {
    const [rows] = await db.query(
        `SELECT
            id,
            student_id,
            lastname,
            firstname,
            middlename,
            suffix,
            department,
            major_program,
            year_level,
            biometric_data,
            status,
            created_at,
            updated_at
        FROM students
        ORDER BY lastname ASC, firstname ASC`
    );

    return rows;
};

// Get one student by ID
export const getStudentById = async (id) => {
    const [rows] = await db.query(
        `SELECT
            id,
            student_id,
            lastname,
            firstname,
            middlename,
            suffix,
            department,
            major_program,
            year_level,
            biometric_data,
            status,
            created_at,
            updated_at
        FROM students
        WHERE id = ?`,
        [id]
    );

    return rows[0];
};