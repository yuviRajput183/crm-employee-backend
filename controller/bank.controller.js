import SuccessResponse from "../lib/success.res.js";
import ErrorResponse from "../lib/error.res.js";
import helperService from "../services/helper.service.js";
import BankService from "../services/bank.service.js";

/**
 * addBank - Add a new bank.
 * @param {Object} req - The HTTP request object.
 * @param {Object} res - The HTTP response object.
 * @param {Function} next - The next middleware function.   
 */
export const addBank = async (req, res, next) => {
    const requiredFields = ["name"];
    const missingFields = helperService.validateFields(requiredFields, req.body);

    if(missingFields.length > 0) {
        const errorMessage = `Missing required fields: ${missingFields.join(", ")}`;
        return next(ErrorResponse.badRequest(errorMessage));
    }
    try {
        const data = await BankService.addBank(req, res, next);
        if(data && data.data)
            return SuccessResponse.created(res, data.message, data.data);
    } catch(error) {
        return next(ErrorResponse.internalServer(error.message));
    }
}

/**
 * listBanks - List all banks which are created by the admin of the group.
 * @param {Object} req - The HTTP request object.
 * @param {Object} res - The HTTP response object.
 * @param {Function} next - The next middleware function.  
 */
export const listBanks = async (req, res, next) => {
    try {
        const data = await BankService.listBanks(req, res, next);
        if(data && data.data)
            return SuccessResponse.ok(res, data.message, data.data);
    } catch(error) {
        return next(ErrorResponse.internalServer(error.message));
    }
}

/**
 * editBank - Admin can edit the name of the bank.
 * @param {body(bankId, name)} req - The request body.
 * @param {Object} res - The HTTP response object.
 * @param {Function} next - The next middleware function.  
 */
export const editBank = async (req, res, next) => {
    const requiredFields = ["bankId", "name"];
    const missingFields = helperService.validateFields(requiredFields, req.body);

    if(missingFields.length > 0) {
        const errorMessage = `Missing required fields: ${missingFields.join(", ")}`;
        return next(ErrorResponse.badRequest(errorMessage));
    }
    try {
        const data = await BankService.editBank(req, res, next);
        if(data && data.data)
            return SuccessResponse.ok(res, data.message, data.data);
    } catch(error) {
        return next(ErrorResponse.internalServer(error.message));
    }
}
