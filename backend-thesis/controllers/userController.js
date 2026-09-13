import {
    getAllEventAdmins,
    getEventAdminById,
    createEventAdmin,
    deleteEventAdminById
} from "../models/userModel.js";

import nodemailer from "nodemailer";
import {
    generateTemporaryPassword,
    hashPassword
} from "../utils/passwordUtils.js";


// =========================================
// EMAIL TRANSPORT
// =========================================

const mailTransport = () => {
    const smtpUser = String(process.env.SMTP_USER || "").trim();
    const smtpPassword = String(process.env.SMTP_PASSWORD || "").replace(/\s+/g, "");
    const smtpFrom = String(process.env.SMTP_FROM || smtpUser || "").trim();

    if (!smtpUser || !smtpPassword) {
        return null;
    }

    if (smtpFrom) {
        process.env.SMTP_FROM = smtpFrom;
    }

    return nodemailer.createTransport({
        host: process.env.SMTP_HOST || "smtp.gmail.com",
        port: Number(process.env.SMTP_PORT || 587),
        secure: process.env.SMTP_SECURE === "true",
        tls: {
            rejectUnauthorized: false
        },

        auth: {
            user: smtpUser,
            pass: smtpPassword
        }
    });
};


// =========================================
// SEND TEMPORARY PASSWORD
// =========================================

const sendTemporaryPassword = async (
    email,
    fullname,
    temporaryPassword
) => {
    const transport = mailTransport();

    if (!transport) {
        throw new Error(
            "SMTP email configuration is missing."
        );
    }

    await transport.sendMail({
        from:
            String(process.env.SMTP_FROM || process.env.SMTP_USER || "").trim(),

        to: email,

        subject: "Your Event Admin account",

        text: `Hello ${fullname},

Your Event Admin account has been created.

Login email / username: ${email}
Temporary password: ${temporaryPassword}

This password is temporary and must be changed immediately after logging in.
`
    });
};


// =========================================
// CREATE EVENT ADMIN ACCOUNT
// =========================================

export const createEventAdminAccount = async (
    req,
    res
) => {
    try {

        // Get the information submitted by the frontend
        const {
            fullname,
            email,
            organization
        } = req.body;


        // =========================================
        // NORMALIZE INPUT
        // =========================================

        const normalizedEmail =
            typeof email === "string"
                ? email.trim().toLowerCase()
                : "";

        const normalizedFullname =
            typeof fullname === "string"
                ? fullname.trim()
                : "";

        const normalizedOrganization =
            typeof organization === "string"
                ? organization.trim()
                : "";


        // =========================================
        // VALIDATE REQUIRED FIELDS
        // =========================================

        if (
            !normalizedFullname ||
            !normalizedEmail ||
            !normalizedOrganization
        ) {
            return res.status(400).json({
                message:
                    "Full name, email, and organization are required."
            });
        }


        // =========================================
        // VALIDATE GMAIL
        // =========================================

        if (
            !/^[^\s@]+@gmail\.com$/i.test(
                normalizedEmail
            )
        ) {
            return res.status(400).json({
                message:
                    "Please provide a valid Gmail address."
            });
        }


        // =========================================
        // CREATE TEMPORARY PASSWORD
        // =========================================

        const temporaryPassword =
            generateTemporaryPassword();


        // =========================================
        // HASH PASSWORD
        // =========================================

        const passwordHash =
            await hashPassword(
                temporaryPassword
            );


        // =========================================
        // CREATE EVENT ADMIN IN DATABASE
        // =========================================

        const id = await createEventAdmin({
            fullname: normalizedFullname,
            email: normalizedEmail,
            password: passwordHash,
            organization: normalizedOrganization
        });


        // =========================================
        // SEND TEMPORARY PASSWORD BY EMAIL
        // =========================================

        try {

            await sendTemporaryPassword(
                normalizedEmail,
                normalizedFullname,
                temporaryPassword
            );

        } catch (mailError) {

            const smtpIssueText =
                process.env.SMTP_USER &&
                process.env.SMTP_PASSWORD
                    ? "Event Admin account was created, but the temporary-password email could not be sent. Gmail rejected the SMTP credentials or the App Password. Check that the App Password is the exact 16-character Gmail value with no spaces, then update the backend .env and retry."
                    : "Event Admin account was created, but the temporary-password email could not be sent because Gmail SMTP is not configured. Add SMTP_USER and SMTP_PASSWORD to backend-thesis/.env, then restart the backend.";

            console.error(
                "Event Admin email error: SMTP send failed."
            );

            return res.status(201).json({
                message: smtpIssueText,
                emailSent: false,
                eventAdmin: {
                    id,
                    fullname: normalizedFullname,
                    email: normalizedEmail,
                    organization: normalizedOrganization
                }
            });
        }


        // =========================================
        // SUCCESS RESPONSE
        // =========================================

        return res.status(201).json({

            message:
                "Event Admin created and temporary password sent.",

            emailSent: true,

            eventAdmin: {
                id,
                fullname: normalizedFullname,
                email: normalizedEmail,
                organization: normalizedOrganization
            }
        });


    } catch (error) {

        // =========================================
        // DUPLICATE EMAIL
        // =========================================

        if (error.code === "ER_DUP_ENTRY") {

            return res.status(409).json({
                message:
                    "An account with that email already exists."
            });
        }


        // =========================================
        // OTHER ERRORS
        // =========================================

        console.error(
            "Create Event Admin error:",
            error
        );

        return res.status(500).json({
            message:
                "Failed to create Event Admin."
        });
    }
};


// =========================================
// GET ALL EVENT ADMINS
// =========================================

export const getEventAdmins = async (
    req,
    res
) => {

    try {

        const eventAdmins =
            await getAllEventAdmins();

        return res.status(200).json({
            eventAdmins
        });

    } catch (error) {

        console.error(
            "Get Event Admins error:",
            error
        );

        return res.status(500).json({
            message:
                "Failed to retrieve Event Admins."
        });
    }
};


// =========================================
// GET ONE EVENT ADMIN
// =========================================

export const getEventAdmin = async (
    req,
    res
) => {

    try {

        const { id } = req.params;

        const eventAdmin =
            await getEventAdminById(id);


        // =========================================
        // EVENT ADMIN NOT FOUND
        // =========================================

        if (!eventAdmin) {

            return res.status(404).json({
                message:
                    "Event Admin not found."
            });
        }


        // =========================================
        // SUCCESS RESPONSE
        // =========================================

        return res.status(200).json({
            eventAdmin
        });

    } catch (error) {

        console.error(
            "Get Event Admin error:",
            error
        );

        return res.status(500).json({
            message:
                "Failed to retrieve Event Admin."
        });
    }
};

// =========================================
// DEACTIVATE EVENT ADMIN ACCOUNT
// =========================================

export const deactivateEventAdminAccount = async (
    req,
    res
) => {
    try {
        const { id } = req.params;
        const numericId = Number(id);

        if (!Number.isInteger(numericId) || numericId <= 0) {
            return res.status(400).json({
                message: "A valid Event Admin ID is required."
            });
        }

        const eventAdmin = await getEventAdminById(numericId);

        if (!eventAdmin) {
            return res.status(404).json({
                message: "Event Admin not found or already inactive."
            });
        }

        const wasUpdated = await deleteEventAdminById(numericId);

        if (!wasUpdated) {
            return res.status(409).json({
                message: "This Event Admin cannot be deactivated because it is already inactive."
            });
        }

        return res.status(200).json({
            message: "Event Admin deactivated successfully.",
            eventAdminId: numericId
        });

    } catch (error) {
        console.error("Deactivate Event Admin error:", error);

        return res.status(500).json({
            message: "Failed to deactivate Event Admin."
        });
    }
};