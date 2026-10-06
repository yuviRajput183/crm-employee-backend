import SuccessResponse from '../lib/success.res.js';
import ErrorResponse from '../lib/error.res.js';
import AccountInvoiceService from '../services/accountInvoice.service.js';

export const previewInvoice = async (req, res, next) => {
    try {
        const { selectedLeadIds } = req.body;
        
        if (!selectedLeadIds || !Array.isArray(selectedLeadIds) || selectedLeadIds.length === 0) {
            return next(ErrorResponse.badRequest("No leads selected for preview"));
        }

        const data = await AccountInvoiceService.previewInvoice(req);
        
        return SuccessResponse.ok(res, "Invoice preview calculated", data);

    } catch (error) {
        return next(ErrorResponse.badRequest(error.message));
    }
};

export const generateInvoice = async (req, res, next) => {
    try {
        const { selectedLeadIds } = req.body;
        
        if (!selectedLeadIds || !Array.isArray(selectedLeadIds) || selectedLeadIds.length === 0) {
            return next(ErrorResponse.badRequest("No leads selected for invoice"));
        }

        const data = await AccountInvoiceService.generateInvoice(req);

        return SuccessResponse.created(res, "Invoice generated successfully", data);

    } catch (error) {
        return next(ErrorResponse.badRequest(error.message));
    }
};
