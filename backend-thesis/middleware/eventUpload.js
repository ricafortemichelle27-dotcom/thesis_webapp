import fs from "node:fs";
import path from "node:path";
import multer from "multer";

const uploadRoot = path.resolve("uploads");
const letterDirectory = path.join(uploadRoot, "lettersOfApproval");
const certificateDirectory = path.join(uploadRoot, "certificateTemplates");

fs.mkdirSync(letterDirectory, { recursive: true });
fs.mkdirSync(certificateDirectory, { recursive: true });

const storage = multer.diskStorage({
    destination: (req, file, callback) => {
        const destination =
            file.fieldname === "letter_of_approval"
                ? letterDirectory
                : certificateDirectory;

        callback(null, destination);
    },
    filename: (req, file, callback) => {
        const extension = path.extname(file.originalname).toLowerCase();
        const baseName = path
            .basename(file.originalname, extension)
            .replace(/[^a-zA-Z0-9_-]/g, "-")
            .replace(/-+/g, "-")
            .replace(/^-|-$/g, "") || "event-file";

        callback(
            null,
            `${Date.now()}-${Math.round(Math.random() * 1e9)}-${baseName}${extension}`
        );
    },
});

const fileFilter = (req, file, callback) => {
    const isPdf =
        file.mimetype === "application/pdf" ||
        path.extname(file.originalname).toLowerCase() === ".pdf";

    if (!isPdf) {
        return callback(new multer.MulterError("LIMIT_UNEXPECTED_FILE", file.fieldname));
    }

    callback(null, true);
};

const uploadEventFiles = multer({
    storage,
    fileFilter,
    limits: {
        files: 2,
        fileSize: 10 * 1024 * 1024,
    },
}).fields([
    { name: "letter_of_approval", maxCount: 1 },
    { name: "certificate_template", maxCount: 1 },
]);

export default uploadEventFiles;
