import SuccessResponse from "../lib/success.res.js";
import ErrorResponse from "../lib/error.res.js";
import helperService from "../services/helper.service.js";
import invoicesService from "../services/invoices.service.js";

/**
 * getDisbursedLeadsWithoutInvoice - Get leads for invoice. These leads are disbursed but not invoiced. There finalInvoice field is false.
 * @param {Object} req - The HTTP request object.
 * @param {Object} res - The HTTP response object.
 * @param {Function} next - The next middleware function for error handling.
 */
export const getDisbursedLeadsWithoutInvoice  = async (req, res, next) => {
  try {
    const data = await invoicesService.getDisbursedLeadWithoutInvoice(req, res, next);
    if (data && data.data)
      return SuccessResponse.ok(res, data.message, data.data);
  } catch (error) {
    return next(ErrorResponse.internalServer(error.message));
  }
}

/**
 * addInvoice - Add an invoice of a lead which is disbursed and final invoice is false.
 * @param {body(leadId, advisorId, customerName, loanServiceType, disbursalAmount, disbursalDate, payoutPercent, payoutAmount, tdsPercent, tdsAmount, gstApplicable, gstPercent, gstAmount, invoiceNo, invoiceDate, netReceivableAmount, processedById, finalInvoice, remarks, bankerId, bankName, bankerName, bankerEmailId, bankerDesignation, bankerMobileNo, stateName, cityName)} req - The request body.
 * @param {Object} res - The HTTP response object.
 * @param {Function} next - The next middleware function for error handling.    
 */
export const addInvoice = async (req, res, next) => {
    const requiredFields = ["leadId", "disbursalDate", "invoiceNo", "invoiceDate", "netReceivableAmount", "processedById", "finalInvoice", "payoutPercent"
    ];
    const missingFields = helperService.validateFields(requiredFields, req.body);

    if(missingFields.length > 0) {
        return next(
            ErrorResponse.badRequest(`Missing fields: ${missingFields.join(", ")}`)
        )
    }
    try {
        const data = await invoicesService.addInvoice(req, res, next);
        if (data && data.data)
            return SuccessResponse.ok(res, data.message, data.data);
    } catch (error) {
        return next(ErrorResponse.internalServer(error.message));
    }
}

/**
 * getAllInvoices - Get all invoices.
 * @param {Object} req - The HTTP request object.
 * @param {Object} res - The HTTP response object.
 * @param {Function} next - The next middleware function for error handling.
 */
export const getAllInvoices = async (req, res, next) => {
    try {
        const data = await invoicesService.getAllInvoices(req, res, next);
        if( data && data.data) 
            return SuccessResponse.ok(res, data.message, data.data);
    } catch (error) {
        return next(ErrorResponse.internalServer(error.message));
    }
}

/**
 * getSingleInvoice - Get one invoice by ID.
 * @param {params.id} req - Invoice ID in request params.
 */
export const getSingleInvoice = async (req, res, next) => {
    try {
        const data = await invoicesService.getSingleInvoice(req, res, next);
        if( data && data.data) 
            return SuccessResponse.ok(res, data.message, data.data);
    } catch (error) {
        return next(ErrorResponse.internalServer(error.message));
    }
}

/**
 * editInvoice - Edit an invoice and update lead status.
 * @param {body(disbursalDate, payoutPercent, payoutAmount, tdsPercent, tdsAmount, gstApplicable, gstPercent, gstAmount, invoiceNo, invoiceDate, netReceivableAmount, processedById, finalInvoice, remarks, bankerId, bankName, bankerName, bankerEmailId, bankerDesignation, bankerMobileNo, stateName, cityName)} req - The request body.
 * @param {Object} res - The HTTP response object.
 * @param {Function} next - The next middleware function for error handling.    
 */
export const editInvoice = async (req, res, next) => {
    try {
        const data = await invoicesService.editInvoice(req, res, next);
        if( data && data.data) 
            return SuccessResponse.ok(res, data.message, data.data);
    } catch (error) {
        return next(ErrorResponse.internalServer(error.message));
    }
}

export const deleteInvoice = async (req, res, next) => {
    try {
        const data = await invoicesService.deleteInvoice(req, res, next);
        if( data ) 
            return SuccessResponse.ok(res, data.message);
    } catch (error) {
        return next(ErrorResponse.internalServer(error.message));
    }
}