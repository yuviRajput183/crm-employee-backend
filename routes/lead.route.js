import express from "express";
import { addLead, editLeadAdvisor, editNewLead, getAllMyLeads, getAllNewLeads, getSignleLead } from "../controller/lead.controller.js";
import { authenticate, isAdminDepartment } from "../middlewares/verifyayth.middleware.js";
import { uploadDocument } from "../middlewares/documentUpload.js";

const router = express.Router();

router.post("/add-lead",authenticate,uploadDocument, addLead);

router.get("/all-new-leads", authenticate, isAdminDepartment, getAllNewLeads); 
router.get("/single-new-lead/:leadId", authenticate, isAdminDepartment, getSignleLead);
router.put("/edit-lead-advisor/:leadId", authenticate, isAdminDepartment, editLeadAdvisor)
router.put("/edit-new-lead/:leadId", authenticate, isAdminDepartment, uploadDocument, editNewLead);

router.get("/all-my-leads", authenticate, isAdminDepartment, getAllMyLeads);



export default router;