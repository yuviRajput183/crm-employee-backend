import SuccessResponse from "../lib/success.res.js";
import ErrorResponse from "../lib/error.res.js";
import employeeService from "../services/employee.service.js";
import helperService from "../services/helper.service.js";

/**
 * createGroupSuperAdmin - Create a new super admin user.
 * @param {body(name, email, mobile, username, password, totalEmployees, totalAdvisors, licenseKey)} req - The request body.
 * @param {Object} res - The HTTP response object.
 * @param {Function} next - The next middleware function for error handling.
 */
export const createGroupSuperAdmin = async (req, res, next) => {
  try {
    const data = await employeeService.createGroupSuperAdmin(req, res, next);
    if (data && data.data)
      return SuccessResponse.created(res, data.message, data.data);
  } catch (error) {
    return next(ErrorResponse.internalServer(error.message));
  }
};

/**
 * createEmployee - Create a new employee.
 * @param {body(name, email, mobile, )} req - The request body.
 * @param {Object} res - The HTTP response object.
 * @param {Function} next - The next middleware function for error handling.
 */
export const createEmployee = async (req, res, next) => {
  const requiredFields = [
    "name",
    "mobile",
    "department",
    "designation",
    "dateOfJoining",
  ];
  const missingFields = helperService.validateFields(requiredFields, req.body);

  if (missingFields.length > 0) {
    const errorMessage = `Missing required fields: ${missingFields.join(", ")}`;
    return next(ErrorResponse.badRequest(errorMessage));
  }
  try {
    const data = await employeeService.createEmployee(req, res, next);
    if (data && data.data)
      return SuccessResponse.created(res, data.message, data.data);
  } catch (error) {
    return next(ErrorResponse.internalServer(error.message));
  }
};

/**
 * fetchAllEmployees - Fetch all employees created by the current logged in user.
 * @param {Object} req - The HTTP request object.
 * @param {Object} res - The HTTP response object.
 * @param {Function} next - The next middleware function for error handling.
 */
export const fetchAllEmployees = async (req, res, next) => {
  try {
    const { page = 1, limit = 100 } = req.query;
    const parsedPage = parseInt(page, 10);
    const parsedLimit = parseInt(limit, 10);

    if (isNaN(parsedPage) || parsedPage <= 0)
      return next(ErrorResponse.badRequest("Page must be greater than 0."));

    if (isNaN(parsedLimit) || parsedLimit <= 0)
      return next(ErrorResponse.badRequest("Limit must be greater than 0."));

    const data = await employeeService.fetchAllEmployees(req, res, next);
    if (data) return SuccessResponse.ok(res, data.message, data.data);
  } catch (error) {
    return next(ErrorResponse.internalServer(error.message));
  }
};

/**
 * fetchSingleEmployee - Fetches a single employee on the basis of the employeeId.
 * @param {Object} req - The HTTP request object.
 * @param {Object} res - The HTTP response object.
 * @param {Function} next - The next middleware function for error handling.
 */
export const fetchSingleEmployee = async (req, res, next) => {
  try {
    const data = await employeeService.fetchSingleEmployee(req, res, next);
    if (data) return SuccessResponse.ok(res, data.message, data.data);
  } catch (error) {
    return next(ErrorResponse.internalServer(error.message));
  }
};

/**
 * editEmployee - Edits an existing employee.
 * @param {body(name, email, mobile, address, altContact, department, designation, reportingOfficer, dateOfJoining, dateOfResign)} req - The request body.
 * @param {Object} res - The HTTP response object.
 * @param {Function} next - The next middleware function for error handling.
 */
export const editEmployee = async (req, res, next) => {
  const requiredFields = [
    "name",
    "mobile",
    "department",
    "designation",
    "dateOfJoining",
  ];
  const missingFields = helperService.validateFields(requiredFields, req.body);

  if (missingFields.length > 0) {
    const errorMessage = `Missing required fields: ${missingFields.join(", ")}`;
    return next(ErrorResponse.badRequest(errorMessage));
  }
  try {
    const data = await employeeService.editEmployee(req, res, next);
    if (data) return SuccessResponse.ok(res, data.message, data.data);
  } catch (error) {
    return next(ErrorResponse.internalServer(error.message));
  }
};

/**
 * getEmployeesWithoutCredentials - Fetch all employees name which are created but there login credentials are not set.
 * @param {Object} req - The HTTP request object.
 * @param {Object} res - The HTTP response object.
 * @param {Function} next - The next middleware function for error handling.
 */
export const getEmployeesWithoutCredentials = async (req, res, next) => {
  try {
    const data = await employeeService.getEmployeesWithoutCredentials(
      req,
      res,
      next
    );
    if (data) return SuccessResponse.ok(res, data.message, data.data);
  } catch (error) {
    return next(ErrorResponse.internalServer(error.message));
  }
};

/**
 * getReportingOfficer - Fetches the all admin of the group because they can be the reporting officer of the employee and advisor.
 * @param {Object} req - The HTTP request object.
 * @param {Object} res - The HTTP response object.
 * @param {Function} next - The next middleware function for error handling.
 */
export const getReportingOfficer = async (req, res, next) => {
  try {
    const data = await employeeService.getReportingOfficer(req, res, next);
    if (data) return SuccessResponse.ok(res, data.message, data.data);
  } catch (error) {
    return next(ErrorResponse.internalServer(error.message));
  }
};

/**
 * getNonAdminEmployees - Fetch all employees name which are not belongs to admin department.
 * @param {Object} req - The HTTP request object.
 * @param {Object} res - The HTTP response object.
 * @param {Function} next - The next middleware function for error handling.  
 */
export const getNonAdminEmployees = async (req, res, next) => {
  try {
    const data = await employeeService.getNonAdminEmployees(req, res, next);
    if (data) return SuccessResponse.ok(res, data.message, data.data);
  } catch (error) {
    return next(ErrorResponse.internalServer(error.message));
  }
};
