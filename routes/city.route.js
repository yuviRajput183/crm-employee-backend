import express from "express";
import { authenticate, checkIsOwner, isAdminDepartment } from "../middlewares/verifyayth.middleware.js";
import { addCity, editCity, getCitiesByStateName, listCities } from "../controller/city.controller.js";

const router = express.Router();

router.post("/add-city", authenticate, isAdminDepartment, checkIsOwner, addCity);
router.get("/list-cities", authenticate, isAdminDepartment, listCities);
router.get("/cities-by-state-name", authenticate, isAdminDepartment, getCitiesByStateName);
router.put("/edit-city", authenticate, isAdminDepartment, checkIsOwner, editCity);

export default router;