import express from "express";
import otpController from "../controller/otp.controller.js";

const router = express.Router();

router.post("/send", otpController.sendOtp);
router.post("/verify", otpController.verifyOtp);
router.get("/channel-partner/status", otpController.getSessionStatus);

export default router;
