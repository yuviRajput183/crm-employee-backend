import ErrorResponse from "../lib/error.res.js";
import ChannelPartner from "../models/ChannelPartner.model.js";
import surepassService from "./surepass.service.js";

class ChannelPartnerService {
    async verifyPan(req, res, next) {
        const { channelPartnerId } = req.params;
        let { pan, isAuthPan } = req.body;

        if (!pan || typeof pan !== 'string') {
            return next(ErrorResponse.badRequest("Please enter a valid PAN number."));
        }

        // Clean spaces and normalize
        pan = pan.replace(/\s+/g, '').toUpperCase();
        
        const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
        if (!panRegex.test(pan)) {
            return next(ErrorResponse.badRequest("Please enter a valid PAN number."));
        }

        const cp = await ChannelPartner.findById(channelPartnerId);
        
        if (!cp) {
            return next(ErrorResponse.notFound("Channel Partner not found."));
        }

        // Stage validation
        if (!cp.mobileVerified || !cp.emailVerified) {
            return next(ErrorResponse.forbidden("Mobile and Email verification must be completed before PAN verification."));
        }

        // Idempotency: If already verified with the same PAN
        if (isAuthPan) {
            if (cp.authPanVerified && cp.authPan === pan) {
                return {
                    data: {
                        panVerified: cp.authPanVerified,
                        ...cp.authPanDetails
                    },
                    onboarding: {
                        currentStage: cp.currentStage,
                        completedStages: cp.completedStages
                    },
                    message: "Signatory PAN is already verified."
                };
            }
        } else {
            if (cp.panVerified && cp.pan === pan) {
                return {
                    data: {
                        panVerified: cp.panVerified,
                        ...cp.panDetails
                    },
                    onboarding: {
                        currentStage: cp.currentStage,
                        completedStages: cp.completedStages
                    },
                    message: "PAN is already verified."
                };
            }
        }

        // Check if PAN is already used by another CP (either as primary or auth PAN)
        const existingPanUser = await ChannelPartner.findOne({ 
            $or: [ { pan: pan }, { authPan: pan } ],
            _id: { $ne: cp._id } 
        });
        if (existingPanUser) {
            return next(ErrorResponse.conflict("This PAN is already associated with another Channel Partner."));
        }

        // Call Surepass API
        let surepassResponse;
        try {
            surepassResponse = await surepassService.verifyPanComprehensive(pan);
        } catch (error) {
            console.error("External PAN API error:", error);
            return next(ErrorResponse.internalServer("PAN verification service is temporarily unavailable. Please try again later."));
        }

        if (!surepassResponse || !surepassResponse.data) {
            return next(ErrorResponse.internalServer("Invalid response from PAN verification service."));
        }

        const panData = surepassResponse.data;
        const category = (panData.category || '').toUpperCase();
        const isPerson = category === "PERSON" || category === "INDIVIDUAL";
        
        // Aadhaar linkage logic
        const aadhaarLinked = panData.aadhaar_linked === true;
        
        if (isPerson && !aadhaarLinked) {
            return next(ErrorResponse.badRequest("As per Income Tax Act, 2025 linkage of Aadhaar and PAN is mandatory for all financial transactions, we request you to link your Aadhaar and PAN first and than proceed for the onboarding process. Sorry for the inconvenience caused."));
        }

        // Normalize Date of Birth if possible (Surepass might return DD/MM/YYYY)
        let parsedDob = null;
        if (panData.dob) {
            const parts = panData.dob.split('/');
            if (parts.length === 3) {
                 // Assume DD/MM/YYYY
                 parsedDob = new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
            } else {
                 parsedDob = new Date(panData.dob);
            }
        }

        const panDetails = {
            firstName: (panData.full_name_split && panData.full_name_split[0]) || '',
            middleName: (panData.full_name_split && panData.full_name_split[1]) || '',
            lastName: (panData.full_name_split && panData.full_name_split[2]) || '',
            fullName: panData.full_name || '',
            gender: panData.gender || '',
            dateOfBirth: parsedDob && !isNaN(parsedDob.valueOf()) ? parsedDob : null,
            category: panData.category || '',
            aadhaarLinked: aadhaarLinked,
            maskedAadhaar: panData.masked_aadhaar || ''
        };

        // Update CP
        if (isAuthPan) {
            cp.authPan = pan;
            cp.authPanVerified = true;
            cp.authPanVerifiedAt = new Date();
            cp.authPanDetails = panDetails;
        } else {
            cp.pan = pan;
            cp.panVerified = true;
            cp.panVerifiedAt = new Date();
            cp.panVerificationStatus = "SUCCESS";
            cp.panDetails = panDetails;
            
            // Only progress stage if verifying primary PAN? Or both? 
            // We can just keep the stage progression here. 
            // If primary PAN is verified and it's a person, we move to Aadhaar. 
            // If it's a company, they still need auth PAN. But stage 3 is Aadhaar. So let's keep it simple.
        }

        if (cp.currentStage === 3) {
            cp.currentStage = 4;
        }
        if (!cp.completedStages.includes(3)) {
            cp.completedStages.push(3);
        }

        await cp.save();

        return {
            data: {
                success: true,
                panVerified: true,
                ...panDetails
            },
            onboarding: {
                currentStage: cp.currentStage,
                completedStages: cp.completedStages
            },
            message: "PAN verified successfully."
        };
    }

    async initializeAadhaarSDK(req, res, next) {
        const { channelPartnerId } = req.params;

        const cp = await ChannelPartner.findById(channelPartnerId);
        if (!cp) {
            return next(ErrorResponse.notFound("Channel Partner not found."));
        }

        if (!cp.mobileVerified || !cp.emailVerified || !cp.panVerified) {
            return next(ErrorResponse.forbidden("Mobile, Email, and PAN verification must be completed before Aadhaar verification."));
        }

        const sdkResponse = await surepassService.initializeDigilocker();

        if (sdkResponse && sdkResponse.success) {
            return {
                data: {
                    token: sdkResponse.data.token,
                    clientId: sdkResponse.data.client_id
                }
            };
        } else {
            return next(ErrorResponse.internalServer("Failed to initialize Digiboost SDK."));
        }
    }

    async verifyAadhaar(req, res, next) {
        const { channelPartnerId } = req.params;
        const { clientId } = req.body;

        if (!clientId || typeof clientId !== 'string') {
            return next(ErrorResponse.badRequest("Client ID is missing."));
        }

        const cp = await ChannelPartner.findById(channelPartnerId);
        if (!cp) {
            return next(ErrorResponse.notFound("Channel Partner not found."));
        }

        // Stage validation
        if (!cp.mobileVerified || !cp.emailVerified || !cp.panVerified) {
            return next(ErrorResponse.forbidden("Mobile, Email, and PAN verification must be completed before Aadhaar verification."));
        }

        // Fetch Aadhaar data using client_id
        let providerResponse;
        try {
            providerResponse = await surepassService.downloadAadhaarXml(clientId);
        } catch (error) {
            console.error("External Aadhaar API error:", error);
            return next(ErrorResponse.internalServer("Aadhaar verification service is temporarily unavailable. Please try again later."));
        }

        if (!providerResponse || !providerResponse.data || !providerResponse.data.aadhaar_xml_data) {
            return next(ErrorResponse.internalServer("Invalid response from Aadhaar verification service."));
        }

        const aadhaarXml = providerResponse.data.aadhaar_xml_data;
        const aadhaarDetails = {
            fullName: aadhaarXml.full_name || '',
            photo: aadhaarXml.profile_image ? `data:image/jpeg;base64,${aadhaarXml.profile_image}` : '',
            careOf: aadhaarXml.care_of || null,
            fatherName: aadhaarXml.father_name || null,
            dateOfBirth: aadhaarXml.dob ? new Date(aadhaarXml.dob) : null,
            gender: aadhaarXml.gender || '',
            fullAddress: aadhaarXml.full_address || ''
        };

        cp.aadhaar = aadhaarXml.masked_aadhaar ? aadhaarXml.masked_aadhaar.replace(/[^0-9X]/g, '') : '';
        cp.aadhaarVerified = true;
        cp.aadhaarVerifiedAt = new Date();
        cp.aadhaarVerificationStatus = "SUCCESS";
        cp.aadhaarDetails = aadhaarDetails;
        cp.aadhaarConfirmed = false; // Reset confirmation

        await cp.save();

        return {
            data: {
                aadhaarVerified: cp.aadhaarVerified,
                aadhaarConfirmed: cp.aadhaarConfirmed,
                aadhaar: cp.aadhaar,
                ...cp.aadhaarDetails
            },
            onboarding: {
                currentStage: cp.currentStage,
                completedStages: cp.completedStages
            },
            message: "Aadhaar verified successfully. Please confirm details."
        };
    }

    async confirmAadhaar(req, res, next) {
        const { channelPartnerId } = req.params;
        const { confirmed, careOf, fatherName, motherName, isMarried, spouseName } = req.body;

        if (confirmed !== true) {
            return next(ErrorResponse.badRequest("Please confirm that the displayed details are correct before continuing."));
        }

        const cp = await ChannelPartner.findById(channelPartnerId);
        if (!cp) {
            return next(ErrorResponse.notFound("Channel Partner not found."));
        }

        if (!cp.aadhaarVerified) {
            return next(ErrorResponse.badRequest("Aadhaar must be verified before confirmation."));
        }

        let updatedCareOf = cp.aadhaarDetails.careOf;
        let updatedFatherName = cp.aadhaarDetails.fatherName;
        let updatedMotherName = cp.aadhaarDetails.motherName;
        let updatedSpouseName = cp.aadhaarDetails.spouseName;
        let updatedIsMarried = cp.aadhaarDetails.isMarried;

        if (!updatedCareOf) {
            if (!careOf || !careOf.trim() || careOf.trim() === '-' || careOf.trim().toLowerCase() === 'null') {
                return next(ErrorResponse.badRequest("Please enter Care of."));
            }
            updatedCareOf = careOf.trim();
        }

        if (!updatedFatherName) {
            if (!fatherName || !fatherName.trim() || fatherName.trim() === '-' || fatherName.trim().toLowerCase() === 'null') {
                return next(ErrorResponse.badRequest("Please enter Father's Name."));
            }
            updatedFatherName = fatherName.trim();
        }

        if (!updatedMotherName) {
            if (!motherName || !motherName.trim() || motherName.trim() === '-' || motherName.trim().toLowerCase() === 'null') {
                return next(ErrorResponse.badRequest("Please enter Mother's Name."));
            }
            updatedMotherName = motherName.trim();
        }

        if (updatedIsMarried === undefined || updatedIsMarried === null) {
            if (isMarried !== true && isMarried !== false && isMarried !== "yes" && isMarried !== "no") {
                return next(ErrorResponse.badRequest("Please specify if you are married."));
            }
            updatedIsMarried = isMarried === true || isMarried === "yes";
        }

        if (updatedIsMarried) {
            if (!updatedSpouseName) {
                if (!spouseName || !spouseName.trim() || spouseName.trim() === '-' || spouseName.trim().toLowerCase() === 'null') {
                    return next(ErrorResponse.badRequest("Spouse Name is required when married."));
                }
                updatedSpouseName = spouseName.trim();
            }
        } else {
            updatedSpouseName = null;
        }

        // Update details
        cp.aadhaarDetails.careOf = updatedCareOf;
        cp.aadhaarDetails.fatherName = updatedFatherName;
        cp.aadhaarDetails.motherName = updatedMotherName;
        cp.aadhaarDetails.isMarried = updatedIsMarried;
        if (updatedSpouseName) {
            cp.aadhaarDetails.spouseName = updatedSpouseName;
        } else {
            cp.aadhaarDetails.spouseName = null;
        }
        
        cp.aadhaarConfirmed = true;
        cp.aadhaarConfirmedAt = new Date();

        if (cp.currentStage === 4) {
            cp.currentStage = 5;
        }
        if (!cp.completedStages.includes(4)) {
            cp.completedStages.push(4);
        }

        // Mongoose mixed type requires markModified
        cp.markModified('aadhaarDetails');
        await cp.save();

        return {
            onboarding: {
                currentStage: cp.currentStage,
                completedStages: cp.completedStages
            },
            message: "Aadhaar details confirmed successfully."
        };
    }
}

export default new ChannelPartnerService();
