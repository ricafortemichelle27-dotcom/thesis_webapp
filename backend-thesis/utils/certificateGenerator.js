import fs from "fs/promises";
import path from "path";

export const createEventCertificateFolder = async (
    eventId,
    eventName
) => {
    const safeEventName = eventName
        .replace(/[^a-z0-9]/gi, "_")
        .replace(/_+/g, "_");

    const eventFolder = path.join(
        "uploads",
        "certificates",
        `event_${eventId}_${safeEventName}`
    );

    await fs.mkdir(eventFolder, {
        recursive: true
    });

    return eventFolder;
};