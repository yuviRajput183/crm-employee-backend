import express from "express";
import { authenticate, isAdminDepartment } from "../middlewares/verifyayth.middleware.js";
import { addReceivable, deleteReceivable, editReceivable, getAllReceivables, getInvoiceMasterByLeadId, getLeadIdsOfAllInvoices, getSingleReceivable } from "../controller/receivable.controller.js";

const router = express.Router();

router.get("/all-receivable-leads", authenticate, isAdminDepartment, getLeadIdsOfAllInvoices);

router.get("/invoice-master-by-lead-id", authenticate, isAdminDepartment, getInvoiceMasterByLeadId);

router.post("/add-receivable", authenticate, isAdminDepartment, addReceivable);

router.get("/all-receivables", authenticate, isAdminDepartment, getAllReceivables);

router.get("/single-receivable/:id", authenticate, isAdminDepartment, getSingleReceivable);

router.put("/edit-receivable/:id", authenticate, isAdminDepartment, editReceivable);

router.delete("/delete-receivable", authenticate, isAdminDepartment, deleteReceivable);


export default router