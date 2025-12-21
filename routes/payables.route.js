import express from "express";
import { addPayable, deletePayable, editPayable, getAdvisorPayout, getAdvisorsAssociatedWithPayout, getAllPayables, getLeadIdOfAllAdvisorPayouts, getSinglePayable } from "../controller/payables.controller.js";
import { authenticate, isAdminDepartment } from "../middlewares/verifyayth.middleware.js";

const router = express.Router();

router.get("/all-advisor-payouts-leadIds", authenticate, isAdminDepartment, getLeadIdOfAllAdvisorPayouts);

router.get("/advisors-associated-with-payout", authenticate, isAdminDepartment, getAdvisorsAssociatedWithPayout);

// use getSingleAdvisorPayout from advisorPayout routes to get the information of the selected advisor payout.

router.post("/add-payable", authenticate, isAdminDepartment, addPayable);

router.get("/all-payables", authenticate, isAdminDepartment, getAllPayables);

// totalAmount field bheji h ushe payable/gst amount me show krna h.
router.get("/single-payable/:id", authenticate, isAdminDepartment, getSinglePayable);

// totalAmount field ko bhejna h.
router.put("/edit-payable/:id", authenticate, isAdminDepartment, editPayable);

router.delete("/delete-payable", authenticate, isAdminDepartment, deletePayable);

// ADVISOR PANEL
router.get("/advisor-payout", authenticate, getAdvisorPayout);


export default router;