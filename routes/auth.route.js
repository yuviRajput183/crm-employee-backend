import express from "express";
import { 
    login,
    logout,
    resetPassword
} from "../controller/auth.controller.js";
import { authenticate } from "../middlewares/verifyayth.middleware.js";

const router = express.Router();

router.post("/login", login);
router.post("/logout", authenticate, logout);
router.put("/reset-password", authenticate, resetPassword);

export default router;