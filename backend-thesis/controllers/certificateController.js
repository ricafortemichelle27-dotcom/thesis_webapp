import {
    getApprovedEvents,
    getAllCertificates,
    getCertificatesByEvent,
    createCertificate
} from "../models/certificateModel.js";

import db from "../config/db.js";

const getRequestingUserId = (req) =>
    req.query.requested_by_user_id ||
    req.headers["x-user-id"] ||
    null;

export const getApprovedEventList = async (req, res) => {
    try {
        const requestingUserId = getRequestingUserId(req);

        if (!requestingUserId) {
            return res.status(400).json({
                message: "A requesting user is required."
            });
        }

        const [userRows] = await db.query(
            "SELECT role FROM users WHERE id = ?",
            [requestingUserId]
        );
        const role = userRows[0]?.role;

        if (!["system_admin", "event_admin"].includes(role)) {
            return res.status(403).json({
                message: "You are not authorized to view certificate events."
            });
        }

        const events = await getApprovedEvents(
            role === "event_admin" ? requestingUserId : null
        );

        return res.status(200).json({ events });
    } catch (error) {
        console.error("Get approved certificate events error:", error);

        return res.status(500).json({
            message: "Failed to retrieve approved events."
        });
    }
};


export const getCertificates = async (req, res) => {
    try {
        const certificates = await getAllCertificates();

        return res.status(200).json({
            certificates
        });

    } catch (error) {
        console.error("Get certificates error:", error);

        return res.status(500).json({
            message: "Failed to retrieve certificates."
        });
    }
};


export const getEventCertificates = async (req, res) => {
    try {
        const { eventId } = req.params;

        const certificates = await getCertificatesByEvent(eventId);

        return res.status(200).json({
            certificates
        });

    } catch (error) {
        console.error("Get event certificates error:", error);

        return res.status(500).json({
            message: "Failed to retrieve event certificates."
        });
    }
};


export const generateCertificateRecord = async (req, res) => {
    try {
        const {
            eventId,
            studentId,
            certificateFile,
            sentTo
        } = req.body;

        if (!eventId || !studentId || !certificateFile) {
            return res.status(400).json({
                message: "eventId, studentId, and certificateFile are required."
            });
        }

        const certificateId = await createCertificate({
            eventId,
            studentId,
            certificateFile,
            sentTo
        });

        return res.status(201).json({
            message: "Certificate record created successfully.",
            certificateId
        });

    } catch (error) {
        console.error("Create certificate error:", error);

        return res.status(500).json({
            message: "Failed to create certificate record."
        });
    }
};