import SuccessResponse from "../lib/success.res.js";
import ErrorResponse from "../lib/error.res.js";
import reportService from "../services/reports.service.js";

export const getReceivablesReport = async (req, res, next) => {
    try {
        const data = await reportService.getReceivablesReport(req, res, next);
        if (data)
            return SuccessResponse.ok(res, "Receivables report fetched successfully", data);
    } catch (error) {
        return next(ErrorResponse.internalServer(error.message));
    }
}

export const getGSTReceivablesReport = async (req, res, next) => {
    try {
        const data = await reportService.getGSTReceivablesReport(req, res, next);
        if (data)
            return SuccessResponse.ok(res, "GST Receivables report fetched successfully", data);
    } catch (error) {
        return next(ErrorResponse.internalServer(error.message));
    }
}

export const getPayablesReport = async (req, res, next) => {
    try {
        const data = await reportService.getPayablesReport(req, res, next);
        if (data)
            return SuccessResponse.ok(res, "Payables report fetched successfully", data);
    } catch (error) {
        return next(ErrorResponse.internalServer(error.message));
    }
}

export const getGSTPayablesReport = async (req, res, next) => {
    try {
        const data = await reportService.getGSTPayablesReport(req, res, next);
        if (data)
            return SuccessResponse.ok(res, "GST Payables report fetched successfully", data);
    } catch (error) {
        return next(ErrorResponse.internalServer(error.message));
    }
}

export const getPerformanceReport = async (req, res, next) => {
    try {
        const data = await reportService.getPerformanceReport(req, res, next);
        if (data)
            return SuccessResponse.ok(res, "Performance report fetched successfully", data);
    } catch (error) {
        return next(ErrorResponse.internalServer(error.message));
    }
}