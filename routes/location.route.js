import express from "express";
import { authenticate, isAdminDepartment } from "../middlewares/verifyayth.middleware.js";
import { addLocation, getLocations, getSingleLocationById, updateLocation } from "../controller/location.controller.js";
import { uploadStampAndSign } from "../middlewares/stampSignatureUpload.js";

const router = express.Router();

router.post("/add-location", authenticate, isAdminDepartment, uploadStampAndSign, addLocation);
router.get("/get-location", authenticate, isAdminDepartment, getLocations);
router.get("/get-location/:id", authenticate, isAdminDepartment, getSingleLocationById);
router.put("/edit-location/:id", authenticate, isAdminDepartment, uploadStampAndSign, updateLocation);

export default router;