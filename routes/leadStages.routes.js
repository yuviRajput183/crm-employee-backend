import express from "express";
import multer from "multer";
import fs from "fs";
import { 
  saveBankerDetails, 
  saveConfirmationDetails, 
  getLeadStageDetails,
  saveCaseReporting
} from "../controller/leadStages.controller.js";
import { authenticate } from "../middlewares/verifyayth.middleware.js";

const router = express.Router();

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadPath = "uploads/confirmations/";
    fs.mkdirSync(uploadPath, { recursive: true });
    cb(null, uploadPath);
  },
  filename: function (req, file, cb) {
    cb(null, `${Date.now()}-${file.fieldname}-${file.originalname}`);
  },
});
const uploadConfirmation = multer({ storage });

router.post("/:leadId/banker-details",authenticate, saveBankerDetails);
router.post("/:leadId/confirmation", authenticate, uploadConfirmation.fields([{ name: 'pdf', maxCount: 1 }, { name: 'eml', maxCount: 1 }]), saveConfirmationDetails);
router.post("/:leadId/case-reporting", authenticate, saveCaseReporting);
router.get("/:leadId", authenticate, getLeadStageDetails);

export default router;
