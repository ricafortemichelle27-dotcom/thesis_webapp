import express from "express";

import {
    getApprovedEventList,
    getCertificates,
    getEventCertificates,
    generateCertificateRecord
} from "../controllers/certificateController.js";

const router = express.Router();


router.get("/", getCertificates);

router.get("/events", getApprovedEventList);

router.get("/event/:eventId", getEventCertificates);

router.post("/", generateCertificateRecord);


export default router;