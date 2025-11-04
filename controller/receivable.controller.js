import SuccessResponse from "../lib/success.res.js";
import ErrorResponse from "../lib/error.res.js";
import helperService from "../services/helper.service.js";
import receivableService from "../services/receivable.service.js";


/**
 * getLeadIdsOfAllInvoices - Get all leads whose invoices are created.
 * @param {Object} req - The HTTP request object.
 * @param {Object} res - The HTTP response object.
 * @param {Function} next - The next middleware function for error handling.
 */
export const getLeadIdsOfAllInvoices = async (req, res, next) => {
    try {
        const data = await receivableService.getLeadIdsOfAllInvoices(req, res, next);
        if (data && data.data)
            return SuccessResponse.ok(res, data.message, data.data);
    } catch (error) {
        return next(ErrorResponse.internalServer(error.message));
    }
}

/**
 * getInvoiceMasterByLeadId - Get the invoice master by lead id.
 * @param {Object} req - The HTTP request object.
 * @param {Object} res - The HTTP response object.
 * @param {Function} next - The next middleware function for error handling.
 */
export const getInvoiceMasterByLeadId = async (req, res, next) => {
    const requiredFields = ["leadId"];
    const missingFields = helperService.validateFields(requiredFields, req.query);
    if (missingFields.length > 0) {
        return next(
            ErrorResponse.badRequest(`Missing fields: ${missingFields.join(", ")}`)
        );
    }   
    try {
        const data = await receivableService.getInvoiceMasterByLeadId(req, res, next);
        if (data && data.data)
            return SuccessResponse.ok(res, data.message, data.data);
    } catch (error) {
        return next(ErrorResponse.internalServer(error.message));
    }
}

/**
 * addReceivable - Add a new receivable to the database and update the invoice master.
 * @param {Object} req - The HTTP request object.
 * @param {Object} res - The HTTP response object.
 * @param {Function} next - The next middleware function for error handling.
 */
export const addReceivable = async (req, res, next) => {
    const requiredFields = [
        "invoiceMasterId",
        "leadId",
        "paymentAgainst",
        "receivableAmount",
        "receivedAmount",
        "balanceAmount",
        "receivedDate",
    ];
    const missingFields = helperService.validateFields(requiredFields, req.body);
    if (missingFields.length > 0) {
        return next(
            ErrorResponse.badRequest(`Missing fields: ${missingFields.join(", ")}`)
        );
    }
    try {
        const data = await receivableService.addReceivable(req, res, next);
        if (data && data.data)
            return SuccessResponse.ok(res, data.message, data.data);
    } catch (error) {
        return next(ErrorResponse.internalServer(error.message));
    }
}

/**
 * getAllReceivables - Get all receivables with filters.
 * @param {Object} req - The HTTP request object.
 * @param {Object} res - The HTTP response object.
 * @param {Function} next - The next middleware function for error handling.
 */
export const getAllReceivables = async (req, res, next) => {
    try {
        const data = await receivableService.getAllReceivables(req, res, next);
        if (data && data.data)
            return SuccessResponse.ok(res, data.message, data.data);
    } catch (error) {
        return next(ErrorResponse.internalServer(error.message));
    }
}

/**
 * getSingleReceivable - Get a single receivable by ID.
 * @param {Object} req - The HTTP request object.
 * @param {Object} res - The HTTP response object.
 * @param {Function} next - The next middleware function for error handling.    
 */
export const getSingleReceivable = async (req, res, next) => {
    const requiredFields = ["id"];
    const missingFields = helperService.validateFields(requiredFields, req.params);
    if (missingFields.length > 0) {
        return next(
            ErrorResponse.badRequest(`Missing fields: ${missingFields.join(", ")}`)
        );
    }
    try {
        const data = await receivableService.getSingleReceivable(req, res, next);
        if (data && data.data)
            return SuccessResponse.ok(res, data.message, data.data);
    } catch (error) {
        return next(ErrorResponse.internalServer(error.message));
    }
}   

/**
 * editReceivable - Update a receivable and update the amounts into the invoice master.
 * @param {Object} req - The HTTP request object.
 * @param {Object} res - The HTTP response object.
 * @param {Function} next - The next middleware function for error handling.
 */
export const editReceivable = async (req, res, next) => {
    const requiredFields = [ "id" ];
    const missingFields = helperService.validateFields(requiredFields, req.params);
    if (missingFields.length > 0) {
        return next(
            ErrorResponse.badRequest(`Missing fields: ${missingFields.join(", ")}`)
        );
    }   
    try {
        const data = await receivableService.editReceivable(req, res, next);
        if (data && data.data)
            return SuccessResponse.ok(res, data.message, data.data);
    } catch (error) {
        return next(ErrorResponse.internalServer(error.message));
    }
}

/**
 * deleteReceivable - Delete a receivable and update the amounts into the invoice master.
 * @param {Object} req - The HTTP request object.
 * @param {Object} res - The HTTP response object.
 * @param {Function} next - The next middleware function for error handling.
 */
export const deleteReceivable = async (req, res, next) => {
    const requiredFields = ["id"];
    const missingFields = helperService.validateFields(requiredFields, req.body);
    if (missingFields.length > 0) {
        return next(
            ErrorResponse.badRequest(`Missing fields: ${missingFields.join(", ")}`)
        );
    }
    try {
        const data = await receivableService.deleteReceivable(req, res, next);
        if (data && data.message)
            return SuccessResponse.ok(res, data.message);
    } catch (error) {
        return next(ErrorResponse.internalServer(error.message));
    }
}