import express from "express";
import { authenticate, isAdminDepartment } from "../middlewares/verifyayth.middleware.js";
import { 
    addServiceProvider, 
    getServiceProviders, 
    getServiceProviderById, 
    updateServiceProvider 
} from "../controller/serviceProvider.controller.js";
import { uploadBillingFormat } from "../middlewares/billingFormatUpload.js";

const router = express.Router();

router.post("/add-service-provider", authenticate, isAdminDepartment, uploadBillingFormat, addServiceProvider);
router.get("/get-service-provider", authenticate, isAdminDepartment, getServiceProviders);
router.get("/get-service-provider/:id", authenticate, isAdminDepartment, getServiceProviderById);
router.put("/edit-service-provider/:id", authenticate, isAdminDepartment, uploadBillingFormat, updateServiceProvider);

export default router;
