import express from "express";
import { verifyPan, initializeAadhaarSDK, verifyAadhaar, confirmAadhaar } from "../controller/channelPartner.controller.js";
import { authenticate } from "../middlewares/verifyayth.middleware.js";

const router = express.Router();

router.post("/:channelPartnerId/pan/verify", authenticate, verifyPan);
router.get("/:channelPartnerId/aadhaar/init", authenticate, initializeAadhaarSDK);
router.post("/:channelPartnerId/aadhaar/verify", authenticate, verifyAadhaar);
router.post("/:channelPartnerId/aadhaar/confirm", authenticate, confirmAadhaar);

export default router;
