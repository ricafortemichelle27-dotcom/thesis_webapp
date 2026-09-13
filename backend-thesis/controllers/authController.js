import bcrypt from "bcryptjs";
import { findUserByEmail } from "../models/userModel.js";
import db from "../config/db.js";

const getCurrentUserFromCookie = (req) => {
    const cookies = req.headers.cookie || "";
    const userCookie = cookies
        .split(";")
        .map((cookie) => cookie.trim())
        .find((cookie) => cookie.startsWith("user="));

    if (!userCookie) {
        return null;
    }

    try {
        const encodedValue = userCookie.slice("user=".length);
        const parsedValue = decodeURIComponent(encodedValue);
        return JSON.parse(parsedValue);
    } catch {
        return null;
    }
};

export const login = async (req, res) => {
    try {
        const { email, password } = req.body;

        const normalizedEmail = typeof email === "string"
            ? email.trim()
            : email;

        // Check that both fields were provided
        if (!normalizedEmail || !password) {
            return res.status(400).json({
                message: "Email and password are required."
            });
        }

        // Find user in database
        const user = await findUserByEmail(normalizedEmail);

        if (!user) {
            return res.status(401).json({
                message: "Invalid email or password."
            });
        }

        // Check account status
        if (user.status !== "active") {
            return res.status(403).json({
                message: "This account is inactive."
            });
        }

        // Compare entered password with hashed password
        const passwordMatch = await bcrypt.compare(
            password,
            user.password
        );

        if (!passwordMatch) {
            return res.status(401).json({
                message: "Invalid email or password."
            });
        }

        // Do not send the password back to React
        const userData = {
            id: user.id,
            fullname: user.fullname,
            email: user.email,
            role: user.role,
            organization: user.organization,
            must_change_password: user.must_change_password
        };

        const cookieParts = [
            `user=${encodeURIComponent(JSON.stringify(userData))}`,
            "Path=/",
            "Max-Age=86400",
            "HttpOnly",
            process.env.NODE_ENV === "production"
                ? "SameSite=None; Secure"
                : "SameSite=Lax",
        ];

        res.setHeader("Set-Cookie", cookieParts.join("; "));

        return res.status(200).json({
            message: "Login successful.",
            user: userData
        });

    } catch (error) {
        console.error("Login error:", error);

        return res.status(500).json({
            message: "Server error during login."
        });
    }
};

export const changePassword = async (req, res) => {
    try {
        const currentUser = getCurrentUserFromCookie(req);

        if (!currentUser || !currentUser.id) {
            return res.status(401).json({
                message: "You must be logged in to change your password."
            });
        }

        const { currentPassword, newPassword } = req.body;

        if (!currentPassword || !newPassword) {
            return res.status(400).json({
                message: "Current password and new password are required."
            });
        }

        if (newPassword.length < 8) {
            return res.status(400).json({
                message: "New password must contain at least 8 characters."
            });
        }

        if (!/[A-Z]/.test(newPassword) || !/[0-9]/.test(newPassword) || !/[^A-Za-z0-9]/.test(newPassword)) {
            return res.status(400).json({
                message: "New password must include an uppercase letter, a number, and a special character."
            });
        }

        const [rows] = await db.query(
            `SELECT id, password, status, role
             FROM users
             WHERE id = ?
             LIMIT 1`,
            [currentUser.id]
        );

        const user = rows[0];

        if (!user) {
            return res.status(404).json({
                message: "User not found."
            });
        }

        if (user.status !== "active") {
            return res.status(403).json({
                message: "This account is inactive."
            });
        }

        const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password);

        if (!isCurrentPasswordValid) {
            return res.status(401).json({
                message: "Current password is incorrect."
            });
        }

        const isSamePassword = await bcrypt.compare(newPassword, user.password);

        if (isSamePassword) {
            return res.status(400).json({
                message: "New password must be different from the current password."
            });
        }

        const newPasswordHash = await bcrypt.hash(newPassword, 10);

        await db.query(
            `UPDATE users
             SET password = ?,
                 must_change_password = 0,
                 updated_at = CURRENT_TIMESTAMP
             WHERE id = ? AND role IN ('system_admin', 'event_admin')`,
            [newPasswordHash, currentUser.id]
        );

        const updatedUser = {
            ...currentUser,
            must_change_password: 0
        };

        return res.status(200).json({
            message: "Password changed successfully.",
            user: updatedUser
        });

    } catch (error) {
        console.error("Change password error:", error);

        return res.status(500).json({
            message: "Failed to change password."
        });
    }
};