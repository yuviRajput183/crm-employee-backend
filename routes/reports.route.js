import express from "express";
import { authenticate } from "../middlewares/verifyayth.middleware.js";
import { isAdminDepartment } from "../middlewares/verifyayth.middleware.js";
import { getGSTPayablesReport, getGSTReceivablesReport, getPayablesReport, getPerformanceReport, getReceivablesReport } from "../controller/reports.controller.js";


const router = express.Router();

router.get("/receivables", authenticate, isAdminDepartment, getReceivablesReport);
router.get("/gst-receivables", authenticate, isAdminDepartment, getGSTReceivablesReport);
router.get("/payables", authenticate, isAdminDepartment, getPayablesReport);
router.get("/gst-payables", authenticate, isAdminDepartment, getGSTPayablesReport);
router.get("/performance", authenticate, isAdminDepartment, getPerformanceReport);

export default router;