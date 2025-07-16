import SuccessResponse from "../lib/success.res.js";
import ErrorResponse from "../lib/error.res.js";
import helperService from "../services/helper.service.js";
import bankerService from "../services/banker.service.js";

/**
 * addBanker - Add new Banker.
 * @param {body(product, stateName, cityId, bankId, bankerName, designation, mobile, email)} req - Expects req.body.product, req.body.stateName, req.body.cityId, req.body.bankId, req.body.bankerName, req.body.designation, req.body.mobile, req.body.email for Banker details.
 * @param {Object} res - The HTTP response object.
 * @param {Function} next - The next middleware function for error handling.
 */
export const addBanker = async (req, res, next) => {
  const requiredFields = ["product", "stateName", "cityId", "bankId", "bankerName", "designation", "mobile", "email"];
  const missingFields = helperService.validateFields(requiredFields, req.body);

  if (missingFields.length > 0) {
    return next(ErrorResponse.badRequest(`Missing fields: ${missingFields.join(", ")}`));
  }

  try {
    const data = await bankerService.addBanker(req, res, next);
    if (data && data.data) return SuccessResponse.created(res, data.message, data.data);
  } catch (error) {
    return next(ErrorResponse.internalServer(error.message));
  }
};

/**
 * listBankers - List all Bankers.
 * @param {Object} req - The HTTP request object.
 * @param {Object} res - The HTTP response object.
 * @param {Function} next - The next middleware function for error handling.
 */
export const listBankers = async (req, res, next) => {
  try {
    const data = await bankerService.listBankers(req, res, next);
    if (data && data.data) return SuccessResponse.ok(res, data.message, data.data);
  } catch (error) {
    return next(ErrorResponse.internalServer(error.message));
  }
};

/**
 * editBanker - Edit existing Banker.
 * @param {body(product, stateName, cityId, bankId, bankerName, designation, mobile, email)} req - Expects req.body.product, req.body.stateName, req.body.cityId, req.body.bankId, req.body.bankerName, req.body.designation, req.body.mobile, req.body.email for Banker details.
 * @param {Object} res - The HTTP response object.
 * @param {Function} next - The next middleware function for error handling.  
 */
export const editBanker = async (req, res, next) => {
  try {
    const data = await bankerService.editBanker(req, res, next);
    if (data && data.data) return SuccessResponse.ok(res, data.message, data.data);
  } catch (error) {
    return next(ErrorResponse.internalServer(error.message));
  }
};