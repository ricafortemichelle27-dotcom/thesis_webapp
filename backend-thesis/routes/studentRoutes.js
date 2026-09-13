import express from "express";

import {
    createStudentAccount,
    getStudents,
    getStudent
} from "../controllers/studentController.js";

const router = express.Router();

// Register a student
router.post("/", createStudentAccount);

// Get all students
router.get("/", getStudents);

// Get one student
router.get("/:id", getStudent);

export default router;