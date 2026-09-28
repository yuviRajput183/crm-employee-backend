import express from "express";
import { authenticate } from "../middlewares/verifyayth.middleware.js";
import {
    generateTransUnion,
    generateEquifax,
    generateExperian,
    generateCrif,
    getTransUnionHistory,
    getEquifaxHistory,
    getExperianHistory,
    getCrifHistory,
    downloadReport
} from "../controller/cibilReport.controller.js";

const router = express.Router();

router.post("/transunion", authenticate, generateTransUnion);
router.post("/equifax", authenticate, generateEquifax);
router.post("/experian", authenticate, generateExperian);
router.post("/crif", authenticate, generateCrif);

router.get("/transunion", authenticate, getTransUnionHistory);
router.get("/equifax", authenticate, getEquifaxHistory);
router.get("/experian", authenticate, getExperianHistory);
router.get("/crif", authenticate, getCrifHistory);

router.get("/:id/download", authenticate, downloadReport);

export default router;
