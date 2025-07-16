import SuccessResponse from "../lib/success.res.js";
import ErrorResponse from "../lib/error.res.js";
import helperService from "../services/helper.service.js";
import departmentService from "../services/department.service.js";

/**
 * createDepartment - Create a department.
 * @param {Object} req - The HTTP request object.
 * @param {Object} res - The HTTP response object.
 * @param {Function} next - The next middleware function.
 */
export const createDepartment = async (req, res, next) => {
  const requiredFields = ["name"];
  const missingFields = helperService.validateFields(requiredFields, req.body);

  if (missingFields.length > 0) {
    const errorMessage = `Missing required fields: ${missingFields.join(", ")}`;
    return next(ErrorResponse.badRequest(errorMessage));
  }
  try {
    const data = await departmentService.addDepartment(req, res, next);
    if (data && data.data)
      return SuccessResponse.created(res, data.message, data.data);
  } catch (error) {
    return next(ErrorResponse.internalServer(error.message));
  }
};

/**
 * listDepartments - List all departments.
 * @param {Object} req - The HTTP request object.
 * @param {Object} res - The HTTP response object.
 * @param {Function} next - The next middleware function.
 */
export const listDepartments = async (req, res, next) => {
  try {
    const data = await departmentService.listDepartments(req, res, next);
    if (data && data.data)
      return SuccessResponse.ok(res, data.message, data.data);
  } catch (error) {
    return next(ErrorResponse.internalServer(error.message));
  }
};

/**
 * editDepartment - Edit a department name.
 * @param {Object} req - The HTTP request object.
 * @param {Object} res - The HTTP response object.
 * @param {Function} next - The next middleware function. 
 */
export const editDepartment = async (req, res, next) => {
  const requiredFields = ["name", "departmentId"];
  const missingFields = helperService.validateFields(requiredFields, req.body);

  if (missingFields.length > 0) {
    const errorMessage = `Missing required fields: ${missingFields.join(", ")}`;
    return next(ErrorResponse.badRequest(errorMessage));
  }
  try {
    const data = await departmentService.editDepartment(req, res, next);
    if (data && data.data)
      return SuccessResponse.ok(res, data.message, data.data);
  } catch (error) {
    return next(ErrorResponse.internalServer(error.message));
  }
};

/**
 * addDesignation - Add a designation to a department.
 * @param {Object} req - The HTTP request object.
 * @param {Object} res - The HTTP response object.
 * @param {Function} next - The next middleware function.
 */
export const addDesignation = async (req, res, next) => {
  const requiredFields = ["departmentId", "designation"];
  const missingFields = helperService.validateFields(requiredFields, req.body);

  if (missingFields.length > 0) {
    const errorMessage = `Missing required fields: ${missingFields.join(", ")}`;
    return next(ErrorResponse.badRequest(errorMessage));
  }
  try {
    const data = await departmentService.addDesignationToDepartment(req, res, next);
    if (data && data.data)
      return SuccessResponse.created(res, data.message, data.data);
  } catch (error) {
    return next(ErrorResponse.internalServer(error.message));
  }
};

/**
 * getDesignationsByDepartment - Get all designations in a department.
 * @param {Object} req - The HTTP request object.
 * @param {Object} res - The HTTP response object.
 * @param {Function} next - The next middleware function.
 */
export const getDesignationsByDepartment = async (req, res, next) => {
  const requiredFields = ["departmentId"];
  const missingFields = helperService.validateFields(requiredFields, req.query);

  if (missingFields.length > 0) {
    const errorMessage = `Missing required fields: ${missingFields.join(", ")}`;
    return next(ErrorResponse.badRequest(errorMessage));
  }
  try {
    const data = await departmentService.getDesignationsByDepartment(
      req,
      res,
      next
    );
    if (data && data.data)
      return SuccessResponse.ok(res, data.message, data.data);
  } catch (error) {
    return next(ErrorResponse.internalServer(error.message));
  }
};

export const editDesignationInDepartment = async (req, res, next) => {
  const requiredFields = ["oldDesignation", "newDesignation", "departmentId"];
  const missingFields = helperService.validateFields(requiredFields, req.body);

  if (missingFields.length > 0) {
    const errorMessage = `Missing required fields: ${missingFields.join(", ")}`;
    return next(ErrorResponse.badRequest(errorMessage));
  }
  try {
    const data = await departmentService.editDesignationInDepartment(
      req,
      res,
      next
    );
    if (data && data.data)
      return SuccessResponse.ok(res, data.message, data.data);
  } catch (error) {
    return next(ErrorResponse.internalServer(error.message));
  }
};
