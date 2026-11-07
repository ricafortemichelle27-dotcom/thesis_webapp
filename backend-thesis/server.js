import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import db from "./config/db.js";
import authRoutes from "./routes/authRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import studentRoutes from "./routes/studentRoutes.js";
import eventRoutes from "./routes/eventRoutes.js";
import kioskRoutes from "./routes/kioskRoutes.js";
import kioskSyncRoutes from "./routes/kioskSyncRoutes.js";
import certificateRoutes from "./routes/certificateRoutes.js";

const envPath = fileURLToPath(new URL("./.env", import.meta.url));
dotenv.config({ path: envPath });

const app = express();

const configuredOrigins = (process.env.FRONTEND_URL || "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

app.use(cors({
    origin: configuredOrigins.length > 0
        ? (origin, callback) => {
            if (!origin || configuredOrigins.includes(origin)) {
                callback(null, true);
                return;
            }

            callback(new Error("Origin is not allowed by CORS."));
        }
        : true,
    credentials: true,
}));
app.use(express.json());

app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/students", studentRoutes);
app.use("/api/events", eventRoutes);
app.use("/api/kiosk", kioskRoutes);
app.use("/api/kiosk-sync", kioskSyncRoutes);
app.use("/api/certificates", certificateRoutes);
app.use("/uploads", express.static("uploads"));

app.use((error, req, res, next) => {
    if (error?.code === "LIMIT_FILE_SIZE") {
        return res.status(400).json({
            message: "Each PDF file must be 10 MB or smaller."
        });
    }

    if (error?.code === "LIMIT_UNEXPECTED_FILE") {
        return res.status(400).json({
            message: "Only Letter of Approval and Certificate Template PDF files are allowed."
        });
    }

    return next(error);
});

app.get("/", (req, res) => {
    res.json({
        message: "Thesis backend is running"
    });
});

app.get("/api/test-db", async (req, res) => {
    try {
        const [rows] = await db.query("SELECT 1 AS result");

        res.json({
            message: "MySQL connection successful",
            result: rows[0]
        });
    } catch (error) {
        console.error(error);

        res.status(500).json({
            message: "MySQL connection failed",
            error: error.message
        });
    }
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log(`Backend server running on http://localhost:${PORT}`);
});
