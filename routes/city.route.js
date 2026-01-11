import express from "express";
import { authenticate, checkIsOwner, isAdminDepartment } from "../middlewares/verifyayth.middleware.js";
import { addCitiesFromExcel, addCity, editCity, getCitiesByStateName, listCities } from "../controller/city.controller.js";
import { uploadCity } from "../middlewares/cityUpload.js";

const router = express.Router();

router.post("/add-city", authenticate, isAdminDepartment, checkIsOwner, addCity);
router.post("/add-cities-from-excel", authenticate, isAdminDepartment, checkIsOwner, uploadCity, addCitiesFromExcel);
router.get("/list-cities", authenticate, isAdminDepartment, listCities);
router.get("/cities-by-state-name", authenticate, getCitiesByStateName);
router.put("/edit-city", authenticate, isAdminDepartment, checkIsOwner, editCity);

export default router;