import express from "express";
import { getLeadTranches, addTranches, getAllTranches, updateTranche } from "../controller/tranche.controller.js";
import { authenticate } from "../middlewares/verifyayth.middleware.js";

const router = express.Router();

router.get("/all", authenticate, getAllTranches);
router.get("/:leadId", authenticate, getLeadTranches);
router.post("/:leadId", authenticate, addTranches);
router.put("/:trancheId", authenticate, updateTranche);

export default router;
