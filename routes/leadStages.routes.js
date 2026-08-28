import express from "express";
import multer from "multer";
import fs from "fs";
import { 
  saveBankerDetails, 
  saveConfirmationDetails, 
  getLeadStageDetails,
  saveCaseReporting,
  uploadCalculationExcel,
  saveSPInvoiceStage
} from "../controller/leadStages.controller.js";
import { authenticate } from "../middlewares/verifyayth.middleware.js";

const router = express.Router();

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    // Shared for confirmations and calculations
    const uploadPath = "uploads/files/";
    fs.mkdirSync(uploadPath, { recursive: true });
    cb(null, uploadPath);
  },
  filename: function (req, file, cb) {
    cb(null, `${Date.now()}-${file.fieldname}-${file.originalname}`);
  },
});
const upload = multer({ storage });

router.post("/:leadId/banker-details", authenticate, saveBankerDetails);
router.post("/:leadId/confirmation", authenticate, upload.fields([{ name: 'pdf', maxCount: 1 }, { name: 'eml', maxCount: 1 }]), saveConfirmationDetails);
router.post("/:leadId/case-reporting", authenticate, saveCaseReporting);
router.post("/:leadId/sp-invoice/calculate", authenticate, upload.single('excel'), uploadCalculationExcel);
router.post("/:leadId/sp-invoice/submit", authenticate, saveSPInvoiceStage);
router.get("/:leadId", authenticate, getLeadStageDetails);

export default router;
