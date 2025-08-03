import express from "express";
import { addAdvisorPayout } from "../controller/advisorPayout.controller.js";
import { authenticate, isAdminDepartment } from "../middlewares/verifyayth.middleware.js";

const router = express.Router();

router.post("/add", authenticate, isAdminDepartment, addAdvisorPayout);


export default router;