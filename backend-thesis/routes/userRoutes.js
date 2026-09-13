import express from "express";

import {
    getEventAdmins,
    getEventAdmin,
    createEventAdminAccount,
    deactivateEventAdminAccount
} from "../controllers/userController.js";

const router = express.Router();

// Get all Event Admins
router.get("/event-admins", getEventAdmins);

// Create an Event Admin
router.post("/event-admins", createEventAdminAccount);

// Deactivate an Event Admin
router.delete("/event-admins/:id", deactivateEventAdminAccount);

// Get one Event Admin
router.get("/event-admins/:id", getEventAdmin);

export default router;