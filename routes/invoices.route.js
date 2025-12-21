import express from "express";
import { addInvoice, advisorPerformance, deleteInvoice, editInvoice, employeePerformance, getAllInvoices, getDisbursedLeadsWithoutInvoice, getSingleInvoice } from "../controller/invoices.controller.js";
import { authenticate, isAdminDepartment } from "../middlewares/verifyayth.middleware.js";

const router = express.Router();

router.get("/disbursed-unpaid-leads", authenticate, isAdminDepartment, getDisbursedLeadsWithoutInvoice);
router.post("/add-invoice", authenticate, isAdminDepartment, addInvoice);
router.get("/all-invoices", authenticate, isAdminDepartment, getAllInvoices);
router.delete("/delete-invoice", authenticate, isAdminDepartment, deleteInvoice);

// employee (My Performance) => in this section we show invoices in which the logged-in employee id present
router.get("/employee-performance", authenticate, employeePerformance)


// advisor (My Performance) => in this section we show invoices in which the logged-in advisor id present
router.get("/advisor-performance", authenticate, advisorPerformance)




router.get("/:id", authenticate, isAdminDepartment, getSingleInvoice);
router.put("/:id", authenticate, isAdminDepartment, editInvoice);



export default router;