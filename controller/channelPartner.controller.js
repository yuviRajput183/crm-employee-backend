import SuccessResponse from "../lib/success.res.js";
import ErrorResponse from "../lib/error.res.js";
import channelPartnerService from "../services/channelPartner.service.js";

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
