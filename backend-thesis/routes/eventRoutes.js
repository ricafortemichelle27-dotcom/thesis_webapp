import express from "express";
import uploadEventFiles from "../middleware/eventUpload.js";

import {
    createEventAccount,
    getEvents,
    getEvent,
    getEligibility,
    approveEvent,
    declineEvent,
    updateEvent,
    deleteEvent
} from "../controllers/eventController.js";

const router = express.Router();


// Create Event
router.post("/", uploadEventFiles, createEventAccount);

// Get all Events
router.get("/", getEvents);

// Get one Event
router.get("/:id", getEvent);

// Get Event Eligibility
router.get("/:id/eligibility", getEligibility);

// Approve event
router.put("/:id/approve", approveEvent);

// Decline event
router.put("/:id/decline", declineEvent);

// Update event
router.put("/:id", uploadEventFiles, updateEvent);

// Delete event
router.delete("/:id", deleteEvent);


export default router;