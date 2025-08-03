import SuccessResponse from "../lib/success.res.js";
import ErrorResponse from "../lib/error.res.js";
import helperService from "../services/helper.service.js";
import advisorPayoutService from "../services/advisorPayout.service.js";

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

export const getAllAdvisorPayouts = async (req, res, next) => {
  try {
    const data = await advisorPayoutService.getAllAdvisorPayouts(req, res, next);
    if (data && data.data)
      return SuccessResponse.ok(res, data.message, data.data);
  } catch (error) {
    return next(ErrorResponse.internalServer(error.message));
  }
}