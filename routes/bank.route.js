import express from "express";
import { addBank, editBank, listBanks } from "../controller/bank.controller.js";
import { authenticate, isAdminDepartment } from "../middlewares/verifyayth.middleware.js";

const router = express.Router();

router.post("/add-bank", authenticate, isAdminDepartment, addBank);
router.get("/list-banks", authenticate, isAdminDepartment, listBanks);
router.put("/edit-bank", authenticate, isAdminDepartment, editBank);

export default router;