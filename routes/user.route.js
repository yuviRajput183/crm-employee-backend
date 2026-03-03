import express from "express";
import { authenticate, isAdminDepartment } from "../middlewares/verifyayth.middleware.js";
import { 
    getAdvisorLoginCredentials, 
    getEmployeeLoginCredentials, 
    setAdvisorLoginCredentials, 
    setEmployeeLoginCredentials, 
    updateLoginCredentials,
    changePassword,
    getProfile
} from "../controller/user.controller.js";

const router = express.Router();

router.post("/set-employee-credentials", authenticate, isAdminDepartment, setEmployeeLoginCredentials);
router.get("/employee-credentials", authenticate, isAdminDepartment, getEmployeeLoginCredentials);
router.post('/set-advisor-credentials', authenticate, isAdminDepartment, setAdvisorLoginCredentials);
router.get('/advisor-credentials', authenticate, isAdminDepartment, getAdvisorLoginCredentials);
router.put('/update-login-credentials', authenticate, isAdminDepartment, updateLoginCredentials);
router.put('/change-password', authenticate, changePassword);
router.get('/profile', authenticate, getProfile);

export default router;