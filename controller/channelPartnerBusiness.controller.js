import ChannelPartner from "../models/ChannelPartner.model.js";
import BusinessVerificationService from "../services/BusinessVerificationService.js";
import ErrorResponse from "../lib/error.res.js";
import { downloadAndSaveDocument } from "../utils/file.util.js";

export const getBusinessVerificationState = async (req, res, next) => {
    try {
        const { channelPartnerId } = req.params;
        const cp = await ChannelPartner.findById(channelPartnerId);
        if (!cp) return next(ErrorResponse.notFound("Channel Partner not found"));
        return res.status(200).json({ success: true, businessDetails: cp.businessDetails, pan: cp.pan, aadhaar: cp.aadhaarDetails?.fullName });
    } catch (error) {
        next(ErrorResponse.internalServer(error.message));
    }
};

export const updateRegistrationType = async (req, res, next) => {
    try {
        const { channelPartnerId } = req.params;
        const { registrationType } = req.body;
        const cp = await ChannelPartner.findById(channelPartnerId);
        if (!cp) return next(ErrorResponse.notFound("Channel Partner not found"));
        
        cp.businessDetails = cp.businessDetails || {};
        cp.businessDetails.registrationType = registrationType;
        cp.businessDetails.businessVerificationStatus = "IN_PROGRESS";
        await cp.save();
        
        return res.status(200).json({ success: true, message: "Registration type saved", businessDetails: cp.businessDetails });
    } catch (error) {
        next(ErrorResponse.internalServer(error.message));
    }
};

export const checkUdyamPan = async (req, res, next) => {
    try {
        const { channelPartnerId } = req.params;
        const cp = await ChannelPartner.findById(channelPartnerId);
        if (!cp || !cp.pan) return next(ErrorResponse.badRequest("Valid PAN not found for this partner"));

        // Extract full name and date of birth from panDetails or aadhaarDetails
        const fullName = cp.panDetails?.fullName || cp.aadhaarDetails?.fullName;
        const rawDob = cp.panDetails?.dateOfBirth || cp.aadhaarDetails?.dateOfBirth;

        if (!fullName || !rawDob) {
            return next(ErrorResponse.badRequest("Full Name and Date of Birth are required for Udyam check. Please complete Aadhaar/PAN verification."));
        }

        // Format dob to YYYY-MM-DD
        const dateObj = new Date(rawDob);
        const dob = `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, '0')}-${String(dateObj.getDate()).padStart(2, '0')}`;

        const result = await BusinessVerificationService.checkUdyamByPan(cp.pan, fullName, dob);
        
        cp.businessDetails = cp.businessDetails || {};
        cp.businessDetails.udyam = cp.businessDetails.udyam || {};
        cp.businessDetails.udyam.panCheckStatus = result.found ? "FOUND" : "NOT_FOUND";
        
        // Remove the automatic udyamNumber assignment since the Surepass initialize/status APIs don't return the Udyam number itself
        // The user will enter it in the next step if found is true.
        
        await cp.save();

        return res.status(200).json({ success: true, result, businessDetails: cp.businessDetails });
    } catch (error) {
        next(ErrorResponse.internalServer(error.message));
    }
};

export const sendUdyamOtp = async (req, res, next) => {
    try {
        const { channelPartnerId } = req.params;
        const { udyamNumber, mobileNumber } = req.body;
        
        if (!/^UDYAM-[A-Z]{2}-\d{2}-\d{7}$/.test(udyamNumber)) {
            return next(ErrorResponse.badRequest("Invalid Udyam Number format. Expected format: UDYAM-XX-00-0000000"));
        }
        if (!mobileNumber) {
            return next(ErrorResponse.badRequest("Mobile Number is required"));
        }

        const cp = await ChannelPartner.findById(channelPartnerId);
        if (!cp) return next(ErrorResponse.notFound("Channel Partner not found"));

        const result = await BusinessVerificationService.sendUdyamOtp(udyamNumber, mobileNumber);

        return res.status(200).json({ success: true, message: "OTP sent successfully", result });
    } catch (error) {
        next(ErrorResponse.internalServer(error.message));
    }
};

export const verifyUdyam = async (req, res, next) => {
    try {
        const { channelPartnerId } = req.params;
        const { clientId, otp } = req.body;
        
        const cp = await ChannelPartner.findById(channelPartnerId);
        if (!cp) return next(ErrorResponse.notFound("Channel Partner not found"));

        const result = await BusinessVerificationService.verifyUdyamNumber(clientId, otp);
        
        cp.businessDetails.udyam.verificationStatus = "VERIFIED";
        cp.businessDetails.udyam.enterpriseName = result.data.enterpriseName;
        cp.businessDetails.udyam.enterpriseType = result.data.enterpriseType;
        cp.businessDetails.udyam.majorActivity = result.data.majorActivity;
        cp.businessDetails.udyam.organisationType = result.data.organisationType;
        cp.businessDetails.udyam.ownerName = result.data.ownerName;
        cp.businessDetails.udyam.dateOfIncorporation = result.data.dateOfIncorporation;
        cp.businessDetails.udyam.officialAddress = result.data.officialAddress;
        cp.businessDetails.udyam.units = result.data.units;
        cp.businessDetails.udyam.registrationDate = result.data.registrationDate;
        cp.businessDetails.udyam.lastUpdatedDate = result.data.lastUpdatedDate;
        if(result.data.certificateUrl) {
            try {
                // Download the certificate
                const cpName = cp.aadhaarDetails?.fullName || cp.panDetails?.fullName || 'Unknown';
                const safeName = cpName.replace(/[^a-z0-9]/gi, '_').toLowerCase();
                const dirName = `${cp._id}_${safeName}`;
                
                const localUrl = await downloadAndSaveDocument(result.data.certificateUrl, dirName, 'udyamCert.pdf');
                
                cp.businessDetails.udyam.certificateDocument = {
                    url: localUrl,
                    uploadedAt: new Date()
                };
            } catch (err) {
                console.error("Failed to download udyam cert:", err);
                cp.businessDetails.udyam.certificateDocument = {
                    url: result.data.certificateUrl,
                    uploadedAt: new Date()
                };
            }
        }
        await cp.save();

        return res.status(200).json({ success: true, message: "Udyam verified successfully", businessDetails: cp.businessDetails });
    } catch (error) {
        next(ErrorResponse.internalServer(error.message));
    }
};

export const submitUdyamDeclaration = async (req, res, next) => {
    try {
        const { channelPartnerId } = req.params;
        const { type, selectedUnit } = req.body; 
        const cp = await ChannelPartner.findById(channelPartnerId);
        if (!cp) return next(ErrorResponse.notFound("Channel Partner not found"));
        
        cp.businessDetails.udyam.declarationType = type;
        if (selectedUnit) cp.businessDetails.udyam.selectedUnit = selectedUnit;
        cp.businessDetails.udyam.declarationAccepted = true;
        cp.businessDetails.udyam.declarationAcceptedAt = new Date();
        await cp.save();
        
        return res.status(200).json({ success: true, message: "Udyam declaration accepted", businessDetails: cp.businessDetails });
    } catch (error) {
        next(ErrorResponse.internalServer(error.message));
    }
};

export const checkGstPan = async (req, res, next) => {
    try {
        const { channelPartnerId } = req.params;
        const cp = await ChannelPartner.findById(channelPartnerId);
        if (!cp || !cp.pan) return next(ErrorResponse.badRequest("Valid PAN not found for this partner"));

        const result = await BusinessVerificationService.checkGstByPan(cp.pan);
        
        cp.businessDetails.gst = cp.businessDetails.gst || {};
        cp.businessDetails.gst.panCheckStatus = result.found ? "FOUND" : "NOT_FOUND";
        if (result.found) cp.businessDetails.gst.gstins = result.gstins;
        await cp.save();

        return res.status(200).json({ success: true, result, businessDetails: cp.businessDetails });
    } catch (error) {
        next(ErrorResponse.internalServer(error.message));
    }
};

export const verifyGst = async (req, res, next) => {
    try {
        const { channelPartnerId } = req.params;
        const { gstin } = req.body;
        const cp = await ChannelPartner.findById(channelPartnerId);
        if (!cp) return next(ErrorResponse.notFound("Channel Partner not found"));

        const result = await BusinessVerificationService.verifyGstin(gstin);
        
        cp.businessDetails.gst.selectedGstin = gstin;
        cp.businessDetails.gst.verificationStatus = "VERIFIED";
        cp.businessDetails.gst.legalName = result.data.legalName;
        cp.businessDetails.gst.businessName = result.data.businessName;
        cp.businessDetails.gst.constitutionOfBusiness = result.data.constitutionOfBusiness;
        cp.businessDetails.gst.dateOfRegistration = result.data.dateOfRegistration;
        cp.businessDetails.gst.taxpayerType = result.data.taxpayerType;
        cp.businessDetails.gst.gstinStatus = result.data.gstinStatus;
        cp.businessDetails.gst.address = result.data.address;
        
        cp.businessDetails.gst.gstRegistered = (result.data.gstinStatus === "Active");
        
        await cp.save();

        return res.status(200).json({ success: true, message: "GST verified successfully", businessDetails: cp.businessDetails });
    } catch (error) {
        next(ErrorResponse.internalServer(error.message));
    }
};

export const submitGstDeclaration = async (req, res, next) => {
    try {
        const { channelPartnerId } = req.params;
        const { type } = req.body; 
        const cp = await ChannelPartner.findById(channelPartnerId);
        if (!cp) return next(ErrorResponse.notFound("Channel Partner not found"));
        
        cp.businessDetails.gst.declarationType = type;
        cp.businessDetails.gst.declarationAccepted = true;
        cp.businessDetails.gst.declarationAcceptedAt = new Date();
        
        cp.businessDetails.businessVerificationStatus = "COMPLETED";
        if(!cp.completedStages.includes(4)) {
            cp.completedStages.push(4);
        }
        cp.currentStage = 5; 
        await cp.save();
        
        return res.status(200).json({ success: true, message: "GST declaration accepted", businessDetails: cp.businessDetails });
    } catch (error) {
        next(ErrorResponse.internalServer(error.message));
    }
};
