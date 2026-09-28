import cibilReportService from "../services/cibilReport.service.js";
import ErrorResponse from "../lib/error.res.js";
import SuccessResponse from "../lib/success.res.js";
import CibilReport from "../models/CibilReport.model.js";
import path from "path";
import fs from "fs";

export const generateTransUnion = async (req, res, next) => {
    try {
        const data = req.body;
        if (!data.name || !data.mobile || !data.pan || !data.gender || data.consent !== "Y") {
            return next(ErrorResponse.badRequest("Missing required fields or consent"));
        }
        const report = await cibilReportService.generateTransUnion(data, req.user.referenceId);
        SuccessResponse.created(res, "TransUnion report generated successfully", report);
    } catch (error) {
        next(ErrorResponse.internalServer(error.message));
    }
};

export const generateEquifax = async (req, res, next) => {
    try {
        const data = req.body;
        if (!data.name || !data.mobile || !data.pan || !data.gender || data.consent !== "Y") {
            return next(ErrorResponse.badRequest("Missing required fields or consent"));
        }
        const report = await cibilReportService.generateEquifax(data, req.user.referenceId);
        SuccessResponse.created(res, "Equifax report generated successfully", report);
    } catch (error) {
        next(ErrorResponse.internalServer(error.message));
    }
};

export const generateExperian = async (req, res, next) => {
    try {
        const data = req.body;
        if (!data.name || !data.mobile || !data.pan || data.consent !== "Y") {
            return next(ErrorResponse.badRequest("Missing required fields or consent"));
        }
        const report = await cibilReportService.generateExperian(data, req.user.referenceId);
        SuccessResponse.created(res, "Experian report generated successfully", report);
    } catch (error) {
        next(ErrorResponse.internalServer(error.message));
    }
};

export const generateCrif = async (req, res, next) => {
    try {
        const data = req.body;
        if (!data.first_name || !data.last_name || !data.mobile || !data.pan || data.consent !== "Y") {
            return next(ErrorResponse.badRequest("Missing required fields or consent"));
        }
        const report = await cibilReportService.generateCrif(data, req.user.referenceId);
        SuccessResponse.created(res, "CRIF report generated successfully", report);
    } catch (error) {
        next(ErrorResponse.internalServer(error.message));
    }
};

export const getTransUnionHistory = async (req, res, next) => {
    try {
        const result = await cibilReportService.getHistory("TRANSUNION", req.query);
        SuccessResponse.ok(res, "TransUnion history fetched successfully", result);
    } catch (error) {
        next(ErrorResponse.internalServer(error.message));
    }
};

export const getEquifaxHistory = async (req, res, next) => {
    try {
        const result = await cibilReportService.getHistory("EQUIFAX", req.query);
        SuccessResponse.ok(res, "Equifax history fetched successfully", result);
    } catch (error) {
        next(ErrorResponse.internalServer(error.message));
    }
};

export const getExperianHistory = async (req, res, next) => {
    try {
        const result = await cibilReportService.getHistory("EXPERIAN", req.query);
        SuccessResponse.ok(res, "Experian history fetched successfully", result);
    } catch (error) {
        next(ErrorResponse.internalServer(error.message));
    }
};

export const getCrifHistory = async (req, res, next) => {
    try {
        const result = await cibilReportService.getHistory("CRIF", req.query);
        SuccessResponse.ok(res, "CRIF history fetched successfully", result);
    } catch (error) {
        next(ErrorResponse.internalServer(error.message));
    }
};

export const downloadReport = async (req, res, next) => {
    try {
        const report = await CibilReport.findById(req.params.id);
        if (!report) {
            return next(ErrorResponse.notFound("Report not found"));
        }

        const filePath = path.join(process.cwd(), report.pdfPath);
        if (!fs.existsSync(filePath)) {
            return next(ErrorResponse.notFound("PDF file not found on server"));
        }

        const fileName = report.pdfFileName || `${report.bureau}_Report.pdf`;
        res.setHeader("Content-Type", "application/pdf");
        res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);
        
        const fileStream = fs.createReadStream(filePath);
        fileStream.pipe(res);
    } catch (error) {
        next(ErrorResponse.internalServer(error.message));
    }
};
