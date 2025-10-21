import SuccessResponse from "../lib/success.res.js";
import ErrorResponse from "../lib/error.res.js";
import helperService from "../services/helper.service.js";
import payablesService from "../services/payables.service.js";
import mongoose from "mongoose";

/**
 * getLeadIdOfAllAdvisorPayouts - Get all leads whose advisor payouts are created.
 * @param {Object} req - The HTTP request object.
 * @param {Object} res - The HTTP response object.
 * @param {Function} next - The next middleware function for error handling.
 */
export const getLeadIdOfAllAdvisorPayouts = async (req, res, next) => {
  try {
    const data = await payablesService.getLeadIdOfAllAdvisorPayouts(
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

/**
 * getAdvisorsAssociatedWithPayout - Get all advisors associated with a specific payout.
 * @param {Object} req - The HTTP request object.
 * @param {Object} res - The HTTP response object.
 * @param {Function} next - The next middleware function for error handling.
 */
export const getAdvisorsAssociatedWithPayout = async (req, res, next) => {
  const requiredFields = ["leadId"];
  const missingFields = helperService.validateFields(requiredFields, req.query);
  if (missingFields.length > 0) {
    return next(
      ErrorResponse.badRequest(`Missing fields: ${missingFields.join(", ")}`)
    );
  }
  try {
    const data = await payablesService.getAdvisorsAssociatedWithPayout(
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

/**
 * addPayable - Add a new payable to the database and update the advisor payout.
 * @param {Object} req - The HTTP request object.
 * @param {Object} res - The HTTP response object.
 * @param {Function} next - The next middleware function for error handling.
 */
export const addPayable = async (req, res, next) => {
  const requiredFields = [
    "payoutId",
    "leadId",
    "advisorId",
    "paymentAgainst",
    "payableAmount",
    "paidAmount",
    "balanceAmount",
    "paidDate",
  ];
  const missingFields = helperService.validateFields(requiredFields, req.body);
  if (missingFields.length > 0) {
    return next(
      ErrorResponse.badRequest(`Missing fields: ${missingFields.join(", ")}`)
    );
  }
  try {
    const data = await payablesService.addPayable(req, res, next);
    if (data && data.data)
      return SuccessResponse.ok(res, data.message, data.data);
  } catch (error) {
    return next(ErrorResponse.internalServer(error.message));
  }
};

/**
 * getAllPayables - Get all payables with filters.
 * @param {Object} req - The HTTP request object.
 * @param {Object} res - The HTTP response object.
 * @param {Function} next - The next middleware function for error handling.
 */
export const getAllPayables = async (req, res, next) => {
  try {
    const data = await payablesService.getAllPayables(req, res, next);
    if (data && data.data)
      return SuccessResponse.ok(res, data.message, data.data);
  } catch (error) {
    return next(ErrorResponse.internalServer(error.message));
  }
};

/**
 * getSinglePayable - Get a single payable by ID.
 * @param {Object} req - The HTTP request object.
 * @param {Object} res - The HTTP response object.
 * @param {Function} next - The next middleware function for error handling.
 */
export const getSinglePayable = async (req, res, next) => {
  const requiredFields = ["id"];
  const missingFields = helperService.validateFields(
    requiredFields,
    req.params
  );

  if (missingFields.length > 0) {
    return next(
      ErrorResponse.badRequest(`Missing fields: ${missingFields.join(", ")}`)
    );
  }
  try {
    const data = await payablesService.getSinglePayable(req, res, next);
    if (data && data.data)
      return SuccessResponse.ok(res, data.message, data.data);
  } catch (error) {
    return next(ErrorResponse.internalServer(error.message));
  }
};

/**
 * editPayable - Update a payable and update the amounts into the advisor payout.
 * @param {Object} req - The HTTP request object.
 * @param {Object} res - The HTTP response object.
 * @param {Function} next - The next middleware function for error handling.
 */
export const editPayable = async (req, res, next) => {
  const requiredFields = ["id"];
  const missingFields = helperService.validateFields(requiredFields, req.params);
  if (missingFields.length > 0) {
    return next(
      ErrorResponse.badRequest(`Missing fields: ${missingFields.join(", ")}`)
    );
  }
  try {
    const data = await payablesService.editPayable(req, res, next);
    if (data && data.data)
      return SuccessResponse.ok(res, data.message, data.data);
  } catch (error) {
    return next(ErrorResponse.internalServer(error.message));
  }
};

/**
 * deletePayable - Delete a payable and update the amounts into the advisor payout.
 * @param {Object} req - The HTTP request object.
 * @param {Object} res - The HTTP response object.
 * @param {Function} next - The next middleware function for error handling.  
 */
export const deletePayable = async (req, res, next) => {
  const requiredFields = ["id"];
  const missingFields = helperService.validateFields(requiredFields, req.body);
  if (missingFields.length > 0) {
    return next(
      ErrorResponse.badRequest(`Missing fields: ${missingFields.join(", ")}`)
    );
  }
  try {
    const data = await payablesService.deletePayable(req, res, next);
    if (data && data.message)
      return SuccessResponse.ok(res, data.message);
  } catch (error) {
    return next(ErrorResponse.internalServer(error.message));
  }
}