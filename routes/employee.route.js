import express from "express";
import { 
    createEmployee, 
    createGroupSuperAdmin, 
    editEmployee, 
    fetchAllEmployees, 
    fetchSingleEmployee,
    getEmployeesWithoutCredentials,
    getReportingOfficer
} from "../controller/employee.controller.js";
import { 
    authenticate, 
    isAdminDepartment 
} from "../middlewares/verifyayth.middleware.js";

const router = express.Router();

router.post("/create-superadmin", createGroupSuperAdmin);
router.post("/add-employee", authenticate, isAdminDepartment, createEmployee);
router.get("/list-employees", authenticate, isAdminDepartment, fetchAllEmployees);
router.get("/employee-detail/:employeeId", authenticate, isAdminDepartment, fetchSingleEmployee);
router.put("/edit-employee/:employeeId", authenticate, isAdminDepartment, editEmployee)
router.get("/no-credentials", authenticate, isAdminDepartment, getEmployeesWithoutCredentials);
router.get("/reporting-officer", authenticate, isAdminDepartment, getReportingOfficer);

export default router;