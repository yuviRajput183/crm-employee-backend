import express from "express";
import channelPartnerController from "../controller/channelPartner.controller.js";
import { authenticate } from "../middlewares/verifyayth.middleware.js";

const router = express.Router();

router.post("/:channelPartnerId/pan/verify", authenticate, channelPartnerController.verifyPan);
router.post("/:channelPartnerId/aadhaar/verify", authenticate, channelPartnerController.verifyAadhaar);
router.post("/:channelPartnerId/aadhaar/confirm", authenticate, channelPartnerController.confirmAadhaar);

export default router;
