import jwt from "jsonwebtoken";
import ErrorResponse from "../lib/error.res.js";
import Employee from "../models/Employee.model.js";
import Advisor from "../models/Advisor.model.js";

/**
 * authenticate - Middleware to authenticate the user.
 * @param {Object} req - The HTTP request object.
 * @param {Object} res - The HTTP response object.
 * @param {Function} next - The next middleware function.
 */
export const authenticate = async (req, res, next) => {
  try {
    const token =
      req.cookies?.token || req.headers.authorization?.split(" ")[1];

    if (!token) {
      return next(ErrorResponse.unauthorized("Authentication token missing"));
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = {
      id: decoded.id,
      referenceId: decoded.referenceId,
      role: decoded.role,
      groupId: decoded.groupId,
      ownerId: decoded.ownerId,
    };
    let user = null;
    if (decoded.role === "employee") {
      user = await Employee.findById(decoded.referenceId);
    } else if (decoded.role === "advisor") {
      user = await Advisor.findById(decoded.referenceId);
    }

    if (!user) {
      return next(ErrorResponse.unauthorized("User not found"));
    }

    if (!user.isActive) {
      return next(ErrorResponse.unauthorized("User account is deactivated"));
    }

    next();
  } catch (error) {
    return next(ErrorResponse.unauthorized("Invalid or expired token"));
  }
};

/**
 * isAdminDepartment - Middleware to check if the user is in the admin department.
 * @param {Object} req - The HTTP request object.
 * @param {Object} res - The HTTP response object.
 * @param {Function} next - The next middleware function.
 */
export const isAdminDepartment = async (req, res, next) => {
  try {
    const employeeId = req.user.referenceId;

    // Fetch the employee with department populated
    const employee = await Employee.findById(employeeId).populate("department");

    if (!employee || !employee.department || !employee.department.name) {
      return next(
        ErrorResponse.forbidden("Access denied: Department not found")
      );
    }

    // Check if department name includes 'admin'
    if (!employee.department.name.toLowerCase().includes("admin")) {
      return next(
        ErrorResponse.forbidden("Access denied: Not in admin department")
      );
    }

    next(); // Access granted
  } catch (error) {
    return next(ErrorResponse.internalServer(error.message));
  }
};

/**
 * isOwner - Middleware to check if the user is the owner of the employee.
 * @param {Object} req - The HTTP request object.
 * @param {Object} res - The HTTP response object.
 * @param {Function} next - The next middleware function.
 */
export const checkIsOwner = async (req, res, next) => {
  try {
    const employeeId = req.user.referenceId;
    const employee = await Employee.findById(employeeId);

    if (!employee || !employee.isOwner) {
      return next(
        ErrorResponse.forbidden("Only group owner can perform this action")
      );
    }

    next();
  } catch (err) {
    return next(ErrorResponse.internalServer(err.message));
  }
};
