import express from "express";
import { authenticate, isAdminDepartment } from "../middlewares/verifyayth.middleware.js";
import { 
    addServiceProvider, 
    getServiceProviders, 
    getServiceProviderById, 
    updateServiceProvider 
} from "../controller/serviceProvider.controller.js";

const router = express.Router();

router.post("/add-service-provider", authenticate, isAdminDepartment, addServiceProvider);
router.get("/get-service-provider", authenticate, isAdminDepartment, getServiceProviders);
router.get("/get-service-provider/:id", authenticate, isAdminDepartment, getServiceProviderById);
router.put("/edit-service-provider/:id", authenticate, isAdminDepartment, updateServiceProvider);

export default router;
