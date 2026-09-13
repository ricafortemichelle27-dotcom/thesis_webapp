import {
    createEvent,
    createEventEligibility,
    getAllEvents,
    getEventById,
    getEventEligibility,
    updateEventById,
    deleteEventById,
    deleteEventEligibilityByEventId,
} from "../models/eventModel.js";

import db from "../config/db.js";

const getUploadedFilePath = (file) => {
    if (!file) {
        return null;
    }

    const directory =
        file.fieldname === "letter_of_approval"
            ? "lettersOfApproval"
            : "certificateTemplates";

    return `/uploads/${directory}/${file.filename}`;
};

const getRequestingUserId = (req) => {
    const body = req?.body || {};
    const query = req?.query || {};
    const headers = req?.headers || {};

    return (
        body.requested_by_user_id ||
        body.user_id ||
        body.actor_user_id ||
        query.requested_by_user_id ||
        headers["x-user-id"] ||
        null
    );
};

const getUserRoleById = async (userId) => {
    if (!userId) {
        return null;
    }

    const [rows] = await db.query(
        `SELECT role
         FROM users
         WHERE id = ?`,
        [userId]
    );

    return rows[0]?.role || null;
};

const getActorContext = async (req) => {
    const userId = getRequestingUserId(req);

    if (!userId) {
        return {
            userId: null,
            role: null,
        };
    }

    const role = await getUserRoleById(userId);

    return {
        userId,
        role,
    };
};

const createUnauthorizedResponse = (res, message) => {
    return res.status(403).json({
        message,
    });
};

const validateSystemAdminRequest = async (req, res) => {
    const { userId, role } = await getActorContext(req);

    if (!userId) {
        return createUnauthorizedResponse(
            res,
            "A valid requesting user is required for this action."
        );
    }

    if (role !== "system_admin") {
        return createUnauthorizedResponse(
            res,
            "Only System Admin can approve or decline events."
        );
    }

    return {
        userId,
        role,
    };
};

const validateEventManagementRequest = async (req, res, existingEvent) => {
    const { userId, role } = await getActorContext(req);

    if (!userId) {
        return createUnauthorizedResponse(
            res,
            "A valid requesting user is required for this action."
        );
    }

    if (role === "system_admin") {
        return {
            allowed: true,
            userId,
            role,
        };
    }

    if (role !== "event_admin") {
        return createUnauthorizedResponse(
            res,
            "You are not authorized to manage events."
        );
    }

    if (Number(existingEvent.event_admin_id) !== Number(userId)) {
        return createUnauthorizedResponse(
            res,
            "You can only manage your own events."
        );
    }

    if (existingEvent.status === "approved") {
        return createUnauthorizedResponse(
            res,
            "Approved events cannot be edited or deleted through the backend."
        );
    }

    if (!["pending", "declined"].includes(existingEvent.status)) {
        return createUnauthorizedResponse(
            res,
            "Only pending or declined events can be edited or deleted."
        );
    }

    return {
        allowed: true,
        userId,
        role,
    };
};


// Create Event
export const createEventAccount = async (req, res) => {
    try {
        const {
            event_name,
            event_admin_id,
            event_date,
            time_start,
            time_end,
            eligibility
        } = req.body;

        const requestingUserId = getRequestingUserId(req);
        const requestingUserRole = await getUserRoleById(requestingUserId);
        const resolvedEventAdminId =
            requestingUserRole === "event_admin"
                ? requestingUserId
                : event_admin_id;

        const letterOfApprovalFile = req.files?.letter_of_approval?.[0];
        const certificateTemplateFile = req.files?.certificate_template?.[0];

        let parsedEligibility = eligibility;

        if (typeof parsedEligibility === "string") {
            try {
                parsedEligibility = JSON.parse(parsedEligibility);
            } catch {
                return res.status(400).json({
                    message: "Eligibility must be valid JSON."
                });
            }
        }

        // Basic validation
        if (
            !event_name ||
            !resolvedEventAdminId ||
            !event_date ||
            !time_start ||
            !time_end ||
            !letterOfApprovalFile ||
            !certificateTemplateFile
        ) {
            return res.status(400).json({
                message:
                    "Event name, Event Admin, date, start time, end time, Letter of Approval, and Certificate Template are required."
            });
        }

        if (
            !Array.isArray(parsedEligibility) ||
            parsedEligibility.length === 0
        ) {
            return res.status(400).json({
                message:
                    "At least one event eligibility rule is required."
            });
        }

        // Check that the selected user is an Event Admin
        const [adminRows] = await db.query(
            `SELECT id, fullname
             FROM users
             WHERE id = ?
             AND role = 'event_admin'`,
            [resolvedEventAdminId]
        );

        if (adminRows.length === 0) {
            return res.status(400).json({
                message:
                    "The selected Event Admin does not exist."
            });
        }

        // Normalize event information
        const normalizedEventName =
            typeof event_name === "string"
                ? event_name.trim()
                : "";

        const normalizedDate =
            typeof event_date === "string"
                ? event_date.trim()
                : "";

        const normalizedStart =
            typeof time_start === "string"
                ? time_start.trim()
                : "";

        const normalizedEnd =
            typeof time_end === "string"
                ? time_end.trim()
                : "";

        if (
            !normalizedEventName ||
            !normalizedDate ||
            !normalizedStart ||
            !normalizedEnd
        ) {
            return res.status(400).json({
                message:
                    "Event name, date, start time, and end time cannot be empty."
            });
        }

        // Create event
        const eventId = await createEvent({
            event_name: normalizedEventName,
            event_admin_id: resolvedEventAdminId,
            event_date: normalizedDate,
            time_start: normalizedStart,
            time_end: normalizedEnd,
            letter_of_approval:
                getUploadedFilePath(letterOfApprovalFile),
            certificate_template:
                getUploadedFilePath(certificateTemplateFile),
            status: "pending"
        });

        // Create eligibility rules
        for (const rule of parsedEligibility) {
            if (!rule.department) {
                return res.status(400).json({
                    message:
                        "Every eligibility rule must have a department."
                });
            }

            await createEventEligibility({
                event_id: eventId,
                department:
                    typeof rule.department === "string"
                        ? rule.department.trim()
                        : "",
                major_program:
                    typeof rule.major_program === "string"
                        ? rule.major_program.trim()
                        : null,
                year_level:
                    typeof rule.year_level === "string"
                        ? rule.year_level.trim()
                        : null
            });
        }

        return res.status(201).json({
            message: "Event created successfully.",
            event: {
                id: eventId,
                event_name: normalizedEventName,
                event_admin_id: resolvedEventAdminId,
                event_admin_name:
                    adminRows[0].fullname,
                event_date: normalizedDate,
                time_start: normalizedStart,
                time_end: normalizedEnd,
                status: "pending",
                decline_reason: null,
                eligibility: parsedEligibility,
                letter_of_approval: getUploadedFilePath(letterOfApprovalFile),
                certificate_template: getUploadedFilePath(certificateTemplateFile)
            }
        });

    } catch (error) {
        console.error("Create event error:", error);

        return res.status(500).json({
            message: "Failed to create event."
        });
    }
};


// Get all Events
export const getEvents = async (req, res) => {
    try {
        const events = await getAllEvents();

        return res.status(200).json({
            events
        });

    } catch (error) {
        console.error("Get events error:", error);

        return res.status(500).json({
            message: "Failed to retrieve events."
        });
    }
};


// Get one Event
export const getEvent = async (req, res) => {
    try {
        const { id } = req.params;

        const event = await getEventById(id);

        if (!event) {
            return res.status(404).json({
                message: "Event not found."
            });
        }

        return res.status(200).json({
            event
        });

    } catch (error) {
        console.error("Get event error:", error);

        return res.status(500).json({
            message: "Failed to retrieve event."
        });
    }
};


// Get Event Eligibility
export const getEligibility = async (req, res) => {
    try {
        const { id } = req.params;

        const eligibility =
            await getEventEligibility(id);

        return res.status(200).json({
            eligibility
        });

    } catch (error) {
        console.error(
            "Get event eligibility error:",
            error
        );

        return res.status(500).json({
            message:
                "Failed to retrieve event eligibility."
        });
    }
};


export const approveEvent = async (req, res) => {
    try {
        const { id } = req.params;

        const actorContext = await getActorContext(req);

        if (!actorContext.userId) {
            return createUnauthorizedResponse(
                res,
                "A valid requesting user is required for this action."
            );
        }

        if (actorContext.role !== "system_admin") {
            return createUnauthorizedResponse(
                res,
                "Only System Admin can approve or decline events."
            );
        }

        const existingEvent = await getEventById(id);

        if (!existingEvent) {
            return res.status(404).json({
                message: "Event not found."
            });
        }

        if (existingEvent.status !== "pending") {
            return res.status(400).json({
                message: "Only pending events can be approved."
            });
        }

        const updatedRows = await updateEventById({
            id,
            event_name: existingEvent.event_name,
            event_admin_id: existingEvent.event_admin_id,
            event_date: existingEvent.event_date,
            time_start: existingEvent.time_start,
            time_end: existingEvent.time_end,
            letter_of_approval: existingEvent.letter_of_approval,
            certificate_template: existingEvent.certificate_template,
            status: "approved",
            decline_reason: null
        });

        if (updatedRows === 0) {
            return res.status(404).json({
                message: "Event not found."
            });
        }

        return res.status(200).json({
            message: "Event approved successfully.",
            event: {
                ...existingEvent,
                status: "approved",
                decline_reason: null
            }
        });
    } catch (error) {
        console.error("Approve event error:", error);

        return res.status(500).json({
            message: "Failed to approve event."
        });
    }
};


export const declineEvent = async (req, res) => {
    try {
        const { id } = req.params;
        const { decline_reason } = req.body;

        const actorContext = await getActorContext(req);

        if (!actorContext.userId) {
            return createUnauthorizedResponse(
                res,
                "A valid requesting user is required for this action."
            );
        }

        if (actorContext.role !== "system_admin") {
            return createUnauthorizedResponse(
                res,
                "Only System Admin can approve or decline events."
            );
        }

        const existingEvent = await getEventById(id);

        if (!existingEvent) {
            return res.status(404).json({
                message: "Event not found."
            });
        }

        if (existingEvent.status !== "pending") {
            return res.status(400).json({
                message: "Only pending events can be declined."
            });
        }

        const normalizedReason =
            typeof decline_reason === "string"
                ? decline_reason.trim()
                : "";

        if (!normalizedReason) {
            return res.status(400).json({
                message: "A decline reason is required."
            });
        }

        const updatedRows = await updateEventById({
            id,
            event_name: existingEvent.event_name,
            event_admin_id: existingEvent.event_admin_id,
            event_date: existingEvent.event_date,
            time_start: existingEvent.time_start,
            time_end: existingEvent.time_end,
            letter_of_approval: existingEvent.letter_of_approval,
            certificate_template: existingEvent.certificate_template,
            status: "declined",
            decline_reason: normalizedReason
        });

        if (updatedRows === 0) {
            return res.status(404).json({
                message: "Event not found."
            });
        }

        return res.status(200).json({
            message: "Event declined successfully.",
            event: {
                ...existingEvent,
                status: "declined",
                decline_reason: normalizedReason
            }
        });
    } catch (error) {
        console.error("Decline event error:", error);

        return res.status(500).json({
            message: "Failed to decline event."
        });
    }
};


export const updateEvent = async (req, res) => {
    try {
        const { id } = req.params;
        const {
            event_name,
            event_admin_id,
            event_date,
            time_start,
            time_end,
            letter_of_approval,
            certificate_template,
            status,
            decline_reason
        } = req.body;
        const uploadedLetterOfApproval = getUploadedFilePath(
            req.files?.letter_of_approval?.[0]
        );
        const uploadedCertificateTemplate = getUploadedFilePath(
            req.files?.certificate_template?.[0]
        );

        const existingEvent = await getEventById(id);

        if (!existingEvent) {
            return res.status(404).json({
                message: "Event not found."
            });
        }

        const actorContext = await getActorContext(req);

        if (!actorContext.userId) {
            return createUnauthorizedResponse(
                res,
                "A valid requesting user is required for this action."
            );
        }

        if (actorContext.role === "system_admin") {
            const updatedRows = await updateEventById({
                id,
                event_name: event_name || existingEvent.event_name,
                event_admin_id: event_admin_id || existingEvent.event_admin_id,
                event_date: event_date || existingEvent.event_date,
                time_start: time_start || existingEvent.time_start,
                time_end: time_end || existingEvent.time_end,
                letter_of_approval:
                    uploadedLetterOfApproval ||
                    (letter_of_approval !== undefined
                        ? letter_of_approval
                        : existingEvent.letter_of_approval),
                certificate_template:
                    uploadedCertificateTemplate ||
                    (certificate_template !== undefined
                        ? certificate_template
                        : existingEvent.certificate_template),
                status:
                    status || existingEvent.status,
                decline_reason:
                    decline_reason !== undefined
                        ? decline_reason
                        : existingEvent.decline_reason
            });

            if (updatedRows === 0) {
                return res.status(404).json({
                    message: "Event not found."
                });
            }

            return res.status(200).json({
                message: "Event updated successfully."
            });
        }

        if (actorContext.role !== "event_admin") {
            return createUnauthorizedResponse(
                res,
                "You are not authorized to manage events."
            );
        }

        if (Number(existingEvent.event_admin_id) !== Number(actorContext.userId)) {
            return createUnauthorizedResponse(
                res,
                "You can only manage your own events."
            );
        }

        if (existingEvent.status === "approved") {
            return createUnauthorizedResponse(
                res,
                "Approved events cannot be edited or deleted through the backend."
            );
        }

        if (!["pending", "declined"].includes(existingEvent.status)) {
            return createUnauthorizedResponse(
                res,
                "Only pending or declined events can be edited or deleted."
            );
        }

        const updatedRows = await updateEventById({
            id,
            event_name: event_name || existingEvent.event_name,
            event_admin_id: existingEvent.event_admin_id,
            event_date: event_date || existingEvent.event_date,
            time_start: time_start || existingEvent.time_start,
            time_end: time_end || existingEvent.time_end,
            letter_of_approval:
                uploadedLetterOfApproval ||
                (letter_of_approval !== undefined
                    ? letter_of_approval
                    : existingEvent.letter_of_approval),
            certificate_template:
                uploadedCertificateTemplate ||
                (certificate_template !== undefined
                    ? certificate_template
                    : existingEvent.certificate_template),
            status: "pending",
            decline_reason: null
        });

        if (updatedRows === 0) {
            return res.status(404).json({
                message: "Event not found."
            });
        }

        return res.status(200).json({
            message: "Event updated successfully. The event has been resubmitted for approval."
        });
    } catch (error) {
        console.error("Update event error:", error);

        return res.status(500).json({
            message: "Failed to update event."
        });
    }
};


export const deleteEvent = async (req, res) => {
    try {
        const { id } = req.params;

        const existingEvent = await getEventById(id);

        if (!existingEvent) {
            return res.status(404).json({
                message: "Event not found."
            });
        }

        const actorContext = await getActorContext(req);

        if (!actorContext.userId) {
            return createUnauthorizedResponse(
                res,
                "A valid requesting user is required for this action."
            );
        }

        if (actorContext.role === "system_admin") {
            await deleteEventEligibilityByEventId(id);
            const deletedRows = await deleteEventById(id);

            if (deletedRows === 0) {
                return res.status(404).json({
                    message: "Event not found."
                });
            }

            return res.status(200).json({
                message: "Event deleted successfully."
            });
        }

        if (actorContext.role !== "event_admin") {
            return createUnauthorizedResponse(
                res,
                "You are not authorized to manage events."
            );
        }

        if (Number(existingEvent.event_admin_id) !== Number(actorContext.userId)) {
            return createUnauthorizedResponse(
                res,
                "You can only manage your own events."
            );
        }

        if (existingEvent.status === "approved") {
            return createUnauthorizedResponse(
                res,
                "Approved events cannot be edited or deleted through the backend."
            );
        }

        if (!["pending", "declined"].includes(existingEvent.status)) {
            return createUnauthorizedResponse(
                res,
                "Only pending or declined events can be edited or deleted."
            );
        }

        await deleteEventEligibilityByEventId(id);
        const deletedRows = await deleteEventById(id);

        if (deletedRows === 0) {
            return res.status(404).json({
                message: "Event not found."
            });
        }

        return res.status(200).json({
            message: "Event deleted successfully."
        });
    } catch (error) {
        console.error("Delete event error:", error);

        return res.status(500).json({
            message: "Failed to delete event."
        });
    }
};