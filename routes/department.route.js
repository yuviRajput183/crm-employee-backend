import express from "express";
import {
  createDepartment,
  addDesignation,
  getDesignationsByDepartment,
  listDepartments,
  editDepartment,
  editDesignationInDepartment,
} from "../controller/department.controller.js";
import { authenticate, checkIsOwner, isAdminDepartment } from "../middlewares/verifyayth.middleware.js";

const router = express.Router();

router.post("/add-department", authenticate, isAdminDepartment, checkIsOwner, createDepartment);
router.get("/list-departments", authenticate, isAdminDepartment, listDepartments);
router.put("/edit-department", authenticate, isAdminDepartment, checkIsOwner, editDepartment);
router.post("/add-designation", authenticate, isAdminDepartment, checkIsOwner, addDesignation);
router.get('/designations', authenticate, isAdminDepartment, getDesignationsByDepartment);
router.put('/edit-designation', authenticate, isAdminDepartment, checkIsOwner, editDesignationInDepartment);

export default router;
