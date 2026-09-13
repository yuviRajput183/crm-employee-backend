import express from "express";
import { getAllChannelPartners, getChannelPartner, verifyPan, initializeAadhaarSDK, verifyAadhaar, confirmAadhaar, verifyBank, confirmPartnerDetails, uploadDocuments, reviewDocument, generateAgreement, downloadAgreement } from "../controller/channelPartner.controller.js";
import {
    getBusinessVerificationState,
    updateRegistrationType,
    checkUdyamPan,
    sendUdyamOtp,
    verifyUdyam,
    submitUdyamDeclaration,
    checkGstPan,
    verifyGst,
    submitGstDeclaration
} from "../controller/channelPartnerBusiness.controller.js";
import { authenticate } from "../middlewares/verifyayth.middleware.js";

const router = express.Router();

router.get("/", authenticate, getAllChannelPartners);
router.get("/:channelPartnerId", authenticate, getChannelPartner);

// Verification Routes
router.post("/:channelPartnerId/pan/verify", authenticate, verifyPan);
router.get("/:channelPartnerId/aadhaar/init", authenticate, initializeAadhaarSDK);
router.post("/:channelPartnerId/aadhaar/verify", authenticate, verifyAadhaar);
router.post("/:channelPartnerId/aadhaar/confirm", authenticate, confirmAadhaar);

import multer from "multer";

const upload = multer({ dest: 'temp_uploads/' });

router.post("/:channelPartnerId/bank/verify", authenticate, verifyBank);
router.post("/:channelPartnerId/bank/confirm-details", authenticate, confirmPartnerDetails);
router.post("/:channelPartnerId/documents", authenticate, upload.any(), uploadDocuments);
router.post("/:channelPartnerId/documents/:docKey/review", authenticate, reviewDocument);
router.post("/:channelPartnerId/agreement/generate", authenticate, generateAgreement);
router.get("/:channelPartnerId/agreement/download", authenticate, downloadAgreement);

// Business Verification Routes
router.get("/:channelPartnerId/business", authenticate, getBusinessVerificationState);
router.post("/:channelPartnerId/business/registration-type", authenticate, updateRegistrationType);
router.post("/:channelPartnerId/business/udyam/pan-check", authenticate, checkUdyamPan);
router.post("/:channelPartnerId/business/udyam/send-otp", authenticate, sendUdyamOtp);
router.post("/:channelPartnerId/business/udyam/verify", authenticate, verifyUdyam);
router.post("/:channelPartnerId/business/udyam/declaration", authenticate, submitUdyamDeclaration);
router.post("/:channelPartnerId/business/gst/pan-check", authenticate, checkGstPan);
router.post("/:channelPartnerId/business/gst/verify", authenticate, verifyGst);
router.post("/:channelPartnerId/business/gst/declaration", authenticate, submitGstDeclaration);

export default router;
