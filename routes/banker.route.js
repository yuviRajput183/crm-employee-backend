import express from "express";
import { authenticate, isAdminDepartment } from "../middlewares/verifyayth.middleware.js";
import { addBanker, editBanker, listBankers } from "../controller/banker.controller.js";

const router = express.Router();

router.post("/add-banker", authenticate, isAdminDepartment, addBanker);
router.get("/list-bankers", authenticate, isAdminDepartment, listBankers);
router.put("/edit-banker/:bankerId", authenticate, isAdminDepartment, editBanker);

export default router;