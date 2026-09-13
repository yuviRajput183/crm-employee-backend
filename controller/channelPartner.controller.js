import SuccessResponse from "../lib/success.res.js";
import ErrorResponse from "../lib/error.res.js";
import channelPartnerService from "../services/channelPartner.service.js";

export const getAllChannelPartners = async (req, res, next) => {
    try {
        const data = await channelPartnerService.getAllChannelPartners(req, res, next);
        if (data) {
            return res.status(200).json({
                success: true,
                data: data.data
            });
        }
    } catch (error) {
        console.error("getAllChannelPartners error:", error);
        return next(ErrorResponse.internalServer("An unexpected error occurred while fetching channel partners."));
    }
};

export const getChannelPartner = async (req, res, next) => {
    try {
        const data = await channelPartnerService.getChannelPartner(req, res, next);
        if (data) {
            return res.status(200).json({
                success: true,
                data: data.data
            });
        }
    } catch (error) {
        console.error("getChannelPartner error:", error);
        return next(ErrorResponse.internalServer("An unexpected error occurred while fetching channel partner."));
    }
};

export const verifyPan = async (req, res, next) => {
    try {
        const data = await channelPartnerService.verifyPan(req, res, next);
        if (data) {
            return res.status(200).json({
                success: true,
                data: data.data,
                onboarding: data.onboarding,
                message: data.message
            });
        }
    } catch (error) {
        console.error("verifyPan error:", error);
        return next(ErrorResponse.internalServer("An unexpected error occurred during PAN verification."));
    }
};

export const initializeAadhaarSDK = async (req, res, next) => {
    try {
        const data = await channelPartnerService.initializeAadhaarSDK(req, res, next);
        if (data) {
            return res.status(200).json({
                success: true,
                data: data.data
            });
        }
    } catch (error) {
        console.error("initializeAadhaarSDK error:", error);
        return next(ErrorResponse.internalServer("An unexpected error occurred during SDK initialization."));
    }
};

export const verifyAadhaar = async (req, res, next) => {
    try {
        const data = await channelPartnerService.verifyAadhaar(req, res, next);
        if (data) {
            return res.status(200).json({
                success: true,
                data: data.data,
                onboarding: data.onboarding,
                message: data.message
            });
        }
    } catch (error) {
        console.error("verifyAadhaar error:", error);
        return next(ErrorResponse.internalServer("An unexpected error occurred during Aadhaar verification."));
    }
};

export const confirmAadhaar = async (req, res, next) => {
    try {
        const data = await channelPartnerService.confirmAadhaar(req, res, next);
        if (data) {
            return res.status(200).json({
                success: true,
                message: data.message,
                onboarding: data.onboarding
            });
        }
    } catch (error) {
        console.error("confirmAadhaar error:", error);
        return next(ErrorResponse.internalServer("An unexpected error occurred during Aadhaar confirmation."));
    }
};

export const verifyBank = async (req, res, next) => {
    try {
        const data = await channelPartnerService.verifyBank(req, res, next);
        if (data) {
            return res.status(200).json({
                success: true,
                data: data.data,
                message: data.message,
                onboarding: data.onboarding
            });
        }
    } catch (error) {
        console.error("verifyBank error:", error);
        return next(ErrorResponse.internalServer("An unexpected error occurred during Bank verification."));
    }
};

export const confirmPartnerDetails = async (req, res, next) => {
    try {
        const data = await channelPartnerService.confirmPartnerDetails(req, res, next);
        if (data) {
            return res.status(200).json({
                success: true,
                message: data.message,
                onboarding: data.onboarding
            });
        }
    } catch (error) {
        console.error("confirmPartnerDetails error:", error);
        return next(ErrorResponse.internalServer("An unexpected error occurred during details confirmation."));
    }
};

export const uploadDocuments = async (req, res, next) => {
    try {
        const data = await channelPartnerService.uploadDocuments(req, res, next);
        if (data) {
            return res.status(200).json({
                success: true,
                message: data.message,
                onboarding: data.onboarding
            });
        }
    } catch (error) {
        console.error("uploadDocuments error:", error);
        return next(ErrorResponse.internalServer("An unexpected error occurred during document upload."));
    }
};

export const reviewDocument = async (req, res, next) => {
    try {
        const data = await channelPartnerService.reviewDocument(req, res, next);
        if (data) {
            return res.status(200).json({
                success: true,
                message: data.message,
                documents: data.documents
            });
        }
    } catch (error) {
        console.error("reviewDocument error:", error);
        return next(ErrorResponse.internalServer("An unexpected error occurred during document review."));
    }
};

export const generateAgreement = async (req, res, next) => {
    try {
        const data = await channelPartnerService.generateAgreement(req, res, next);
        if (data) {
            return res.status(200).json({
                success: true,
                message: data.message,
                onboarding: data.onboarding,
                url: data.data?.fileUrl || data.url,
                data: data.data
            });
        }
    } catch (error) {
        console.error("generateAgreement error:", error);
        return next(ErrorResponse.internalServer("An unexpected error occurred during agreement generation."));
    }
};

export const downloadAgreement = async (req, res, next) => {
    try {
        await channelPartnerService.downloadAgreement(req, res, next);
    } catch (error) {
        console.error("downloadAgreement error:", error);
        return next(ErrorResponse.internalServer("An unexpected error occurred during agreement download."));
    }
};
