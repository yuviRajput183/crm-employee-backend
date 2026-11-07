import express from "express";
import { 
    login,
    logout,
    resetPassword,
    sendWhatsappLoginOtp,
    verifyWhatsappLoginOtp,
    resendWhatsappLoginOtp,
} from "../controller/auth.controller.js";
import { authenticate } from "../middlewares/verifyayth.middleware.js";

const router = express.Router();

// Existing routes — unchanged
router.post("/login", login);
router.post("/logout", authenticate, logout);
router.put("/reset-password", authenticate, resetPassword);

// WhatsApp OTP Login routes — public, no authentication required
router.post("/send-whatsapp-login-otp", sendWhatsappLoginOtp);
router.post("/verify-whatsapp-login-otp", verifyWhatsappLoginOtp);
router.post("/resend-whatsapp-login-otp", resendWhatsappLoginOtp);

export default router;