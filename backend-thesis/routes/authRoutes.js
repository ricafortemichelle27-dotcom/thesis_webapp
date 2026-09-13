import express from "express";
import { login, changePassword } from "../controllers/authController.js";

const router = express.Router();

router.post("/login", login);
router.put("/change-password", changePassword);

export default router;