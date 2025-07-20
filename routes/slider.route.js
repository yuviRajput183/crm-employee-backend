import express from "express";
import { addOrUpdateSliders } from "../controller/slider.controller.js";
import { sliderUpload } from "../middlewares/sliderUpload.js";
import { authenticate, isAdminDepartment } from "../middlewares/verifyayth.middleware.js";

const router = express.Router();

router.post("/add-update-sliders", authenticate, isAdminDepartment, sliderUpload, addOrUpdateSliders);

export default router;