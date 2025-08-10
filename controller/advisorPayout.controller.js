import SuccessResponse from "../lib/success.res.js";
import ErrorResponse from "../lib/error.res.js";
import helperService from "../services/helper.service.js";
import advisorPayoutService from "../services/advisorPayout.service.js";


/**
 * getAllDisbursedLeads - Super admin and admin can fetch all disbursed leads whose finalPayout value is false. We require these leads in advisor payout.
 * @param {Object} req - The HTTP request object.
 * @param {Object} res - The HTTP response object.
 * @param {Function} next - The next middleware function for error handling.  
 */
export const getDisbursedUnpaidLeads = async (req, res, next) => {
  try {
    const data = await leadService.getDisbursedUnpaidLeads(req, res, next);
    if (data && data.data)
      return SuccessResponse.ok(res, data.message, data.data);
  } catch (error) {
    return next(ErrorResponse.internalServer(error.message));
  }
}

/**
 * addAdvisorPayout - Add an advisor payout of a lead which is disbursed and final payout is false.
 * @param {body(leadId, advisorId, customerName, loanServiceType, disbursalAmount, disbursalDate, payoutPercent, payoutAmount, tdsPercent, tdsAmount, gstApplicable, gstPercent, gstAmount, invoiceNo, invoiceDate, netPayableAmount, processedById, finalPayout, remarks, bankerId, bankName, bankerName, bankerEmailId, bankerDesignation, bankerMobileNo, stateName, cityName)} req - The request body.
 * @param {Object} res - The HTTP response object.
 * @param {Function} next - The next middleware function for error handling.
 */
export const addAdvisorPayout = async (req, res, next) => {
    const requiredFields = ["leadId", "advisorId", "disbursalAmount", "disbursalDate", "payoutPercent","gstApplicable", "processedById", "finalPayout", 
    ];
    const missingFields = helperService.validateFields(requiredFields, req.body);
  
    if (missingFields.length > 0) {
      return next(
        ErrorResponse.badRequest(`Missing fields: ${missingFields.join(", ")}`)
      );
    }
  try {
    const data = await advisorPayoutService.addAdvisorPayout(req, res, next);
    if (data && data.data)
      return SuccessResponse.ok(res, data.message, data.data);
  } catch (error) {
    return next(ErrorResponse.internalServer(error.message));
  }
}

/**
 * getAllAdvisorPayouts - Get all advisor payouts.
 * @param {Object} req - The HTTP request object.
 * @param {Object} res - The HTTP response object.
 * @param {Function} next - The next middleware function for error handling.
 */
export const getAllAdvisorPayouts = async (req, res, next) => {
  try {
    const data = await advisorPayoutService.getAllAdvisorPayouts(req, res, next);
    if (data && data.data)
      return SuccessResponse.ok(res, data.message, data.data);
  } catch (error) {
    return next(ErrorResponse.internalServer(error.message));
  }
}

/**
 * getSingleAdvisorPayout - Get a single advisor payout by ID.
 * @param {Object} req - The HTTP request object.
 * @param {Object} res - The HTTP response object.
 * @param {Function} next - The next middleware function for error handling.
 */
export const getSingleAdvisorPayout = async (req, res, next) => {
  const requiredFields = ["id"];
  const missingFields = helperService.validateFields(requiredFields, req.params);

  if (missingFields.length > 0) {
    return next(
      ErrorResponse.badRequest(`Missing fields: ${missingFields.join(", ")}`)
    );
  }
  try {
    const data = await advisorPayoutService.getSingleAdvisorPayout(req, res, next);
    if (data && data.data)
      return SuccessResponse.ok(res, data.message, data.data);
  } catch (error) {
    return next(ErrorResponse.internalServer(error.message));
  }
}

/**
 * editAdvisorPayout - Edit an advisor payout and update the final payout flag in lead.
 * @param {body(leadId, advisorId, customerName, loanServiceType, disbursalAmount, disbursalDate, payoutPercent, payoutAmount, tdsPercent, tdsAmount, gstApplicable, gstPercent, gstAmount, invoiceNo, invoiceDate, netPayableAmount, processedById, finalPayout, remarks, bankerId, bankName, bankerName, bankerEmailId, bankerDesignation, bankerMobileNo, stateName, cityName)} req - The request body.
 * @param {Object} res - The HTTP response object.
 * @param {Function} next - The next middleware function for error handling.  
 */
export const editAdvisorPayout = async (req, res, next) => {
  try {
    const data = await advisorPayoutService.editAdvisorPayout(req, res, next);
    if (data && data.data)
      return SuccessResponse.ok(res, data.message, data.data);
  } catch (error) {
    return next(ErrorResponse.internalServer(error.message));
  }
}

/**
 * deleteAdvisorPayout - Delete an advisor payout and update the final payout flag in lead if no other final payouts exist.
 * @param {Object} req - The HTTP request object.
 * @param {Object} res - The HTTP response object.
 * @param {Function} next - The next middleware function for error handling.  
 */
export const deleteAdvisorPayout = async (req, res, next) => {
  try {
    const data = await advisorPayoutService.deleteAdvisorPayout(req, res, next);
    if (data && data.data)
      return SuccessResponse.ok(res, data.message, data.data);
  } catch (error) {
    return next(ErrorResponse.internalServer(error.message));
  }
}