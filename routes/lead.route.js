import express from "express";
import { addDraft, addLead, advisorLead, bankerCitiesByStateName, deleteAllLeadAttachments, editLead, editLeadAdvisor, getAdvisorLeads, getAdvisorStatistics, getAllDrafts, getAllLeads, getAllMyLeads, getAllNewLeads, getBankerByBankerId, getBankersByBankId, getBanksByCityId, getCustomersName, getEmployeeStatistics, getLeadStatistics, getSignleDraft, getSignleLead } from "../controller/lead.controller.js";
import { uploadDocument } from "../middlewares/documentUpload.js";
import { authenticate, isAdminDepartment } from "../middlewares/verifyayth.middleware.js";

const router = express.Router();

router.post("/add-lead",authenticate,uploadDocument, addLead);

router.get("/all-new-leads", authenticate, getAllNewLeads); 
router.get("/single-lead/:leadId", authenticate, getSignleLead);
router.put("/edit-lead-advisor/:leadId", authenticate, isAdminDepartment, editLeadAdvisor)
router.put("/edit-lead/:leadId", authenticate, uploadDocument, editLead);

// Bankers details for disbursed feedback
router.get("/bankercities-by-state-name", authenticate, bankerCitiesByStateName);
router.get("/banks-by-cityId", authenticate, getBanksByCityId)
router.get("/bankers-by-bankId", authenticate, getBankersByBankId);
router.get("/banker-by-bankerId", authenticate, getBankerByBankerId);

router.get("/all-my-leads", authenticate, getAllMyLeads);

router.get("/customers-by-advisorId", authenticate, getCustomersName);


router.get("/statistics", authenticate, isAdminDepartment, getLeadStatistics);
router.get("/employee-statistics", authenticate, getEmployeeStatistics);
router.get("/advisor-statistics", authenticate, getAdvisorStatistics);

router.get("/all-leads", authenticate, isAdminDepartment, getAllLeads);

router.delete("/attachments", authenticate, isAdminDepartment, deleteAllLeadAttachments);


// advisor
router.post("/add-draft", authenticate, uploadDocument, addDraft);
router.get("/all-drafts", authenticate, getAllDrafts); 
router.get("/single-draft/:draftId", authenticate, getSignleDraft);

router.post("/add-advisor-lead",authenticate,uploadDocument, advisorLead);

router.get("/advisor-my-leads", authenticate, getAdvisorLeads);

export default router;