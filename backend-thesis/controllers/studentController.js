import {
    createStudent,
    getAllStudents,
    getStudentById
} from "../models/studentModel.js";

// Create student
export const createStudentAccount = async (req, res) => {
    try {
        const {
            student_id,
            lastname,
            firstname,
            middlename,
            suffix,
            department,
            major_program,
            year_level
        } = req.body;

        // Required fields
        if (
            !student_id ||
            !lastname ||
            !firstname ||
            !department ||
            !major_program ||
            !year_level
        ) {
            return res.status(400).json({
                message:
                    "Student ID, last name, first name, department, major/program, and year level are required."
            });
        }

        const normalizedStudentId = student_id.trim();
        const normalizedLastname = lastname.trim();
        const normalizedFirstname = firstname.trim();
        const normalizedMiddlename =
            typeof middlename === "string"
                ? middlename.trim()
                : "";
        const normalizedSuffix =
            typeof suffix === "string"
                ? suffix.trim()
                : "";
        const normalizedDepartment = department.trim();
        const normalizedMajorProgram = major_program.trim();
        const normalizedYearLevel = year_level.trim();

        const id = await createStudent({
            student_id: normalizedStudentId,
            lastname: normalizedLastname,
            firstname: normalizedFirstname,
            middlename: normalizedMiddlename,
            suffix: normalizedSuffix,
            department: normalizedDepartment,
            major_program: normalizedMajorProgram,
            year_level: normalizedYearLevel
        });

        return res.status(201).json({
            message: "Student registered successfully.",
            student: {
                id,
                student_id: normalizedStudentId,
                lastname: normalizedLastname,
                firstname: normalizedFirstname,
                middlename: normalizedMiddlename,
                suffix: normalizedSuffix,
                department: normalizedDepartment,
                major_program: normalizedMajorProgram,
                year_level: normalizedYearLevel
            }
        });
    } catch (error) {
        if (error.code === "ER_DUP_ENTRY") {
            return res.status(409).json({
                message:
                    "A student with that Student ID already exists."
            });
        }

        console.error("Create student error:", error);

        return res.status(500).json({
            message: "Failed to register student."
        });
    }
};

// Get all students
export const getStudents = async (req, res) => {
    try {
        const students = await getAllStudents();

        return res.status(200).json({
            students
        });
    } catch (error) {
        console.error("Get students error:", error);

        return res.status(500).json({
            message: "Failed to retrieve students."
        });
    }
};

// Get student by database ID
export const getStudent = async (req, res) => {
    try {
        const { id } = req.params;

        const student = await getStudentById(id);

        if (!student) {
            return res.status(404).json({
                message: "Student not found."
            });
        }

        return res.status(200).json({
            student
        });
    } catch (error) {
        console.error("Get student error:", error);

        return res.status(500).json({
            message: "Failed to retrieve student."
        });
    }
};