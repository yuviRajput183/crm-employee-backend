import express from "express";
import {
  createProduct,
  listProducts,
  editProduct,
  addSubProduct,
  getSubProductsByProduct,
  editSubProductInProduct
} from "../controller/product.controller.js";
import { authenticate, checkIsOwner, isAdminDepartment } from "../middlewares/verifyayth.middleware.js";

const router = express.Router();

router.post("/add-product", authenticate, isAdminDepartment, checkIsOwner, createProduct);
router.get("/list-products", authenticate, isAdminDepartment, listProducts);
router.put("/edit-product", authenticate, isAdminDepartment, checkIsOwner, editProduct);
router.post("/add-sub-product", authenticate, isAdminDepartment, checkIsOwner, addSubProduct);
router.get('/sub-products', authenticate, isAdminDepartment, getSubProductsByProduct);
router.put('/edit-sub-product', authenticate, isAdminDepartment, checkIsOwner, editSubProductInProduct);

export default router;
