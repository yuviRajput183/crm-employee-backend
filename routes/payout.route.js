import express from "express";
import { payoutUpload } from "../middlewares/payoutUpload.js";
import { addPayoutFile } from "../controller/payout.controller.js";
import { authenticate, isAdminDepartment } from "../middlewares/verifyayth.middleware.js";

const router = express.Router();

router.post("/upload-payout", authenticate, isAdminDepartment, payoutUpload.single("file"), addPayoutFile);

export default router;