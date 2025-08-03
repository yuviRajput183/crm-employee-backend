import express from "express";
import { addLead, editLead, editLeadAdvisor, getAllMyLeads, getAllNewLeads, getCustomersByAdvisorId, getDisbursedUnpaidLeads, getSignleLead } from "../controller/lead.controller.js";
import { uploadDocument } from "../middlewares/documentUpload.js";
import { authenticate, isAdminDepartment } from "../middlewares/verifyayth.middleware.js";

const router = express.Router();

router.post("/add-lead",authenticate,uploadDocument, addLead);

router.get("/all-new-leads", authenticate, isAdminDepartment, getAllNewLeads); 
router.get("/single-lead/:leadId", authenticate, isAdminDepartment, getSignleLead);
router.put("/edit-lead-advisor/:leadId", authenticate, isAdminDepartment, editLeadAdvisor)
router.put("/edit-lead/:leadId", authenticate, isAdminDepartment, uploadDocument, editLead);

router.get("/all-my-leads", authenticate, isAdminDepartment, getAllMyLeads);

router.get("/customers-by-advisorId", authenticate, isAdminDepartment, getCustomersByAdvisorId);

// Leads for advisor payout
router.get("/disbursed-unpaid-leads", authenticate, isAdminDepartment, getDisbursedUnpaidLeads);



export default router;