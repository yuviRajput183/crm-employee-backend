import express from "express";
import { addAdvisorPayout, deleteAdvisorPayout, editAdvisorPayout, getAllAdvisorPayouts, getDisbursedUnpaidLeads, getSingleAdvisorPayout } from "../controller/advisorPayout.controller.js";
import { authenticate, isAdminDepartment } from "../middlewares/verifyayth.middleware.js";

const router = express.Router();

router.get("/disbursed-unpaid-leads", authenticate, isAdminDepartment, getDisbursedUnpaidLeads);
router.post("/add", authenticate, isAdminDepartment, addAdvisorPayout);
router.get("/all-advisor-payouts", authenticate, getAllAdvisorPayouts);
router.get("/single-advisor-payout/:id", authenticate, isAdminDepartment, getSingleAdvisorPayout);
router.put("/edit-advisor-payout/:id", authenticate, isAdminDepartment, editAdvisorPayout);
router.delete("/delete-advisor-payout", authenticate, isAdminDepartment, deleteAdvisorPayout);

export default router;