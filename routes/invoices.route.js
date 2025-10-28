import express from "express";
import { authenticate, isAdminDepartment } from "../middlewares/verifyayth.middleware.js";
import { addInvoice, deleteInvoice, editInvoice, getAllInvoices, getDisbursedLeadsWithoutInvoice, getSingleInvoice } from "../controller/invoices.controller.js";

const router = express.Router();

router.get("/disbursed-unpaid-leads", authenticate, isAdminDepartment, getDisbursedLeadsWithoutInvoice);
router.post("/add-invoice", authenticate, isAdminDepartment, addInvoice);
router.get("/all-invoices", authenticate, isAdminDepartment, getAllInvoices);
router.get("/:id", authenticate, isAdminDepartment, getSingleInvoice);
router.put("/:id", authenticate, isAdminDepartment, editInvoice);
router.delete("/delete-invoice", authenticate, isAdminDepartment, deleteInvoice);

export default router;