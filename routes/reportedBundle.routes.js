import express from "express";
import {
  createReportedBundle,
  getAllReportedBundles,
  getReportedBundleById,
  acceptLeadInBundle,
  rejectLeadInBundle,
  acceptAllLeadsInBundle,
} from "../controller/reportedBundle.controller.js";
import { authenticate } from "../middlewares/verifyayth.middleware.js";

const router = express.Router();

router.post("/create", authenticate, createReportedBundle);
router.get("/", authenticate, getAllReportedBundles);
router.get("/:id", authenticate, getReportedBundleById);
router.put("/:bundleId/leads/:leadId/accept", authenticate, acceptLeadInBundle);
router.put("/:bundleId/leads/:leadId/reject", authenticate, rejectLeadInBundle);
router.put("/:bundleId/accept-all", authenticate, acceptAllLeadsInBundle);

export default router;
