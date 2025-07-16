import SuccessResponse from "../lib/success.res.js";
import ErrorResponse from "../lib/error.res.js";
import UserService from "../services/user.service.js";
import helperService from "../services/helper.service.js";

/**
 * setEmployeeLoginCredentials - Set employee login credentials.
 * @param {Object} req - The HTTP request object.
 * @param {Object} res - The HTTP response object.
 * @param {Function} next - The next middleware function for error handling.
 */
export const setEmployeeLoginCredentials = async (req, res, next) => {
  const requiredFields = ["employeeId", "loginName", "password"];
  const missingFields = helperService.validateFields(requiredFields, req.body);

  if (missingFields.length > 0) {
    const errorMessage = `Missing required fields: ${missingFields.join(", ")}`;
    return next(ErrorResponse.badRequest(errorMessage));
  }
  try {
    const data = await UserService.setEmployeeLoginCredentials(req, res, next);
    if (data && data.data)
      return SuccessResponse.created(res, data.message, data.data);
  } catch (error) {
    return next(ErrorResponse.internalServer(error.message));
  }
};

/**
 * getEmployeeCredentials - Admin(E1) can fetch all employee credentials in the group whereas normal admin can only fetch credentials of employees created by him.
 * @param {Object} req - The HTTP request object.
 * @param {Object} res - The HTTP response object.
 * @param {Function} next - The next middleware function for error handling.
 */
export const getEmployeeLoginCredentials = async (req, res, next) => {
  try {
    const data = await UserService.getEmployeeLoginCredentials(req, res, next);
    if (data && data.data)
      return SuccessResponse.created(res, data.message, data.data);
  } catch (error) {
    return next(ErrorResponse.internalServer(error.message));
  }
};

/**
 * setAdvisorLoginCredentials - Set advisor login credentials.
 * @param {Object} req - The HTTP request object.
 * @param {Object} res - The HTTP response object.
 * @param {Function} next - The next middleware function for error handling.
 */
export const setAdvisorLoginCredentials = async (req, res, next) => {
  const requiredFields = ["advisorId", "loginName", "password"];
  const missingFields = helperService.validateFields(requiredFields, req.body);

  if (missingFields.length > 0) {
    const errorMessage = `Missing required fields: ${missingFields.join(", ")}`;
    return next(ErrorResponse.badRequest(errorMessage));
  }
  try {
    const data = await UserService.setAdvisorLoginCredentials(req, res, next);
    if (data && data.data)
      return SuccessResponse.created(res, data.message, data.data);
  } catch (error) {
    return next(ErrorResponse.internalServer(error.message));
  }
};

/**
 * getAdvisorLoginCredentials - Admin(E1) can fetch all advisor credentials in the group whereas normal admin can only fetch credentials of advisors created by him.
 * @param {Object} req - The HTTP request object.
 * @param {Object} res - The HTTP response object.
 * @param {Function} next - The next middleware function for error handling.
 */
export const getAdvisorLoginCredentials = async (req, res, next) => {
  try {
    const data = await UserService.getAdvisorLoginCredentials(req, res, next);
    if (data && data.data)
      return SuccessResponse.created(res, data.message, data.data);
  } catch (error) {
    return next(ErrorResponse.internalServer(error.message));
  }
};

/**
 * updateLoginCredentials - Update login credentials of a user.
 * @param {Object} req - The HTTP request object.
 * @param {Object} res - The HTTP response object.
 * @param {Function} next - The next middleware function for error handling.  
 */
export const updateLoginCredentials = async (req, res, next) => {
  const requiredFields = [ "loginName", "password", "userId"];
  const missingFields = helperService.validateFields(requiredFields, req.body);

  if (missingFields.length > 0) {
    const errorMessage = `Missing required fields: ${missingFields.join(", ")}`;
    return next(ErrorResponse.badRequest(errorMessage));
  }
  try {
    const data = await UserService.updateLoginCredentials(req, res, next);
    if (data && data.data)
      return SuccessResponse.created(res, data.message, data.data);
  } catch (error) {
    return next(ErrorResponse.internalServer(error.message));
  }
}