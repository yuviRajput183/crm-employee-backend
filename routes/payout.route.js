import express from "express";
import { payoutUpload } from "../middlewares/payoutUpload.js";
import { addPayoutFile, downloadPayoutFile, getAllPayoutFiles } from "../controller/payout.controller.js";
import { authenticate, isAdminDepartment } from "../middlewares/verifyayth.middleware.js";

const router = express.Router();

router.post("/upload-payout", authenticate, isAdminDepartment, payoutUpload.single("file"), addPayoutFile);
router.get("/all-payout-files", authenticate, getAllPayoutFiles);
router.get("/download-payout/:payoutId", authenticate, downloadPayoutFile);

export default router;