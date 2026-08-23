import express from "express";
import { getLeadTranches, addTranches, getAllTranches } from "../controller/tranche.controller.js";
import { authenticate } from "../middlewares/verifyayth.middleware.js";

const router = express.Router();

router.get("/all", authenticate, getAllTranches);
router.get("/:leadId", authenticate, getLeadTranches);
router.post("/:leadId", authenticate, addTranches);

export default router;
