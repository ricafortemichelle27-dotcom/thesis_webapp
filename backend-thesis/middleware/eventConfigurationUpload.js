import multer from 'multer';

// Event images use the same in-memory Multer → Cloudinary architecture as PDFs.
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024, files: 22, fields: 30 },
    fileFilter(req, file, callback) {
        if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.mimetype)) {
            return callback(Object.assign(new Error('Event images must be JPEG, PNG, or WebP.'), { status: 400 }));
        }
        callback(null, true);
    },
}).fields([
    { name: 'event_logo', maxCount: 1 },
    { name: 'background_display_photo', maxCount: 1 },
    { name: 'speaker_photos', maxCount: 20 },
]);

export default function uploadEventConfiguration(req, res, next) {
    upload(req, res, (error) => {
        if (error) return res.status(400).json({ message: error.code === 'LIMIT_FILE_SIZE'
            ? 'Each event image must be 5 MB or smaller.'
            : error.message });
        next();
    });
}
