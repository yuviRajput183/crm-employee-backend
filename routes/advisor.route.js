import express from "express";
import { authenticate, isAdminDepartment } from "../middlewares/verifyayth.middleware.js";
import { addAdvisor, editAdvisor, fetchAllAdvisors, fetchSingleAdvisor, getAdvisorsWithoutCredentials } from "../controller/advisor.controller.js";

const router = express.Router();

router.post("/add-advisor", authenticate, isAdminDepartment, addAdvisor);
router.get("/all-advisors", authenticate, isAdminDepartment, fetchAllAdvisors);
router.get("/advisor-detail/:advisorId", authenticate, isAdminDepartment, fetchSingleAdvisor);
router.put("/edit-advisor/:advisorId", authenticate, isAdminDepartment, editAdvisor);
router.get("/without-credentials", authenticate, isAdminDepartment, getAdvisorsWithoutCredentials);

export default router;