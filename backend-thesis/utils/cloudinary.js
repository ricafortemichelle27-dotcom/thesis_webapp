import { v2 as cloudinary } from "cloudinary";

const configureCloudinary = () => {
    cloudinary.config({
        cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
        api_key: process.env.CLOUDINARY_API_KEY,
        api_secret: process.env.CLOUDINARY_API_SECRET,
    });
};

const sanitizeBaseName = (fileName) => {
    const baseName = fileName
        .replace(/\.pdf$/i, "")
        .replace(/[^a-zA-Z0-9_-]/g, "-")
        .replace(/-+/g, "-")
        .replace(/^-|-$/g, "");

    return baseName || "event-file";
};

export const uploadPdfToCloudinary = (file, folder) => {
    configureCloudinary();

    const publicId = `${Date.now()}-${Math.round(Math.random() * 1e9)}-${sanitizeBaseName(file.originalname)}.pdf`;

    return new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
            {
                folder,
                public_id: publicId,
                resource_type: "raw",
            },
            (error, result) => {
                if (error) {
                    reject(error);
                    return;
                }

                resolve({
                    url: result.secure_url,
                    publicId: result.public_id,
                });
            }
        );

        uploadStream.end(file.buffer);
    });
};

export const deleteCloudinaryAsset = async (publicId, resourceType = "raw") => {
    if (!publicId) {
        return;
    }

    configureCloudinary();

    await cloudinary.uploader.destroy(publicId, {
        resource_type: resourceType,
        invalidate: true,
    });
};

export const uploadImageToCloudinary = (file, folder) => {
    configureCloudinary();
    return new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
            { folder, resource_type: 'image', allowed_formats: ['jpg', 'jpeg', 'png', 'webp'] },
            (error, result) => {
                if (error) return reject(error);
                resolve({ url: result.secure_url, publicId: result.public_id });
            }
        );
        stream.end(file.buffer);
    });
};
