import express from "express";
import { addLead, bankerCitiesByStateName, editLead, editLeadAdvisor, getAllMyLeads, getAllNewLeads, getBankerByBankerId, getBankersByBankId, getBanksByCityId, getCustomersName, getSignleLead } from "../controller/lead.controller.js";
import { uploadDocument } from "../middlewares/documentUpload.js";
import { authenticate, isAdminDepartment } from "../middlewares/verifyayth.middleware.js";

const router = express.Router();

router.post("/add-lead",authenticate,uploadDocument, addLead);

router.get("/all-new-leads", authenticate, isAdminDepartment, getAllNewLeads); 
router.get("/single-lead/:leadId", authenticate, isAdminDepartment, getSignleLead);
router.put("/edit-lead-advisor/:leadId", authenticate, isAdminDepartment, editLeadAdvisor)
router.put("/edit-lead/:leadId", authenticate, isAdminDepartment, uploadDocument, editLead);

// Bankers details for disbursed feedback
router.get("/bankercities-by-state-name", authenticate, isAdminDepartment, bankerCitiesByStateName);
router.get("/banks-by-cityId", authenticate, isAdminDepartment, getBanksByCityId)
router.get("/bankers-by-bankId", authenticate, isAdminDepartment, getBankersByBankId);
router.get("/banker-by-bankerId", authenticate, isAdminDepartment, getBankerByBankerId);

router.get("/all-my-leads", authenticate, isAdminDepartment, getAllMyLeads);

router.get("/customers-by-advisorId", authenticate, isAdminDepartment, getCustomersName);




export default router;