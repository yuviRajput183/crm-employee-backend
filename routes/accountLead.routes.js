import express from "express";
import { createAccountLead, getInProgressLeads, getClosedLeads, getAccountLeadById, updateAccountLead } from "../controller/accountLead.controller.js";
import { authenticate } from "../middlewares/verifyayth.middleware.js";

const router = express.Router();

router.post("/create", authenticate, createAccountLead);
router.get("/in-progress", authenticate, getInProgressLeads);
router.get("/closed", authenticate, getClosedLeads);
router.get("/:id", authenticate, getAccountLeadById);
router.put("/:id", authenticate, updateAccountLead);

export default router;
