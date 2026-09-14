import path from "node:path";
import multer from "multer";

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
    storage: multer.memoryStorage(),
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
