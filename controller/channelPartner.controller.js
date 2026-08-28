import ChannelPartner from "../models/ChannelPartner.model.js";
import surepassService from "../services/surepass.service.js";

class ChannelPartnerController {
    async verifyPan(req, res) {
        try {
            const { channelPartnerId } = req.params;
            let { pan } = req.body;

            if (!pan || typeof pan !== 'string') {
                return res.status(400).json({ success: false, message: "Please enter a valid PAN number." });
            }

            // Clean spaces and normalize
            pan = pan.replace(/\s+/g, '').toUpperCase();
            
            const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
            if (!panRegex.test(pan)) {
                return res.status(400).json({ success: false, message: "Please enter a valid PAN number." });
            }

            const cp = await ChannelPartner.findById(channelPartnerId);
            
            if (!cp) {
                return res.status(404).json({ success: false, message: "Channel Partner not found." });
            }

            // Stage validation
            if (!cp.mobileVerified || !cp.emailVerified) {
                return res.status(403).json({ 
                    success: false, 
                    message: "Mobile and Email verification must be completed before PAN verification." 
                });
            }

            // Idempotency: If already verified with the same PAN
            if (cp.panVerified && cp.pan === pan) {
                return res.status(200).json({
                    success: true,
                    data: {
                        panVerified: cp.panVerified,
                        ...cp.panDetails
                    },
                    onboarding: {
                        currentStage: cp.currentStage,
                        completedStages: cp.completedStages
                    },
                    message: "PAN is already verified."
                });
            }

            // Check if PAN is already used by another CP
            const existingPanUser = await ChannelPartner.findOne({ pan: pan, _id: { $ne: cp._id } });
            if (existingPanUser) {
                return res.status(409).json({ success: false, message: "This PAN is already associated with another Channel Partner." });
            }

            // Call Surepass API
            let surepassResponse;
            try {
                surepassResponse = await surepassService.verifyPanComprehensive(pan);
            } catch (error) {
                console.error("External PAN API error:", error);
                return res.status(503).json({ success: false, message: "PAN verification service is temporarily unavailable. Please try again later." });
            }

            if (!surepassResponse || !surepassResponse.data) {
                return res.status(500).json({ success: false, message: "Invalid response from PAN verification service." });
            }

            const panData = surepassResponse.data;
            const category = (panData.category || '').toUpperCase();
            const isPerson = category === "PERSON" || category === "INDIVIDUAL";
            
            // Aadhaar linkage logic
            const aadhaarLinked = panData.aadhaar_linked === true;
            
            if (isPerson && !aadhaarLinked) {
                return res.status(400).json({
                    success: false,
                    code: "AADHAAR_NOT_LINKED",
                    message: "As per Income Tax Act, 2025 linkage of Aadhaar and PAN is mandatory for all financial transactions, we request you to link your Aadhaar and PAN first and than proceed for the onboarding process. Sorry for the inconvenience caused."
                });
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
            cp.pan = pan;
            cp.panVerified = true;
            cp.panVerifiedAt = new Date();
            cp.panVerificationStatus = "SUCCESS";
            cp.panDetails = panDetails;
            
            if (cp.currentStage === 3) {
                cp.currentStage = 4;
            }
            if (!cp.completedStages.includes(3)) {
                cp.completedStages.push(3);
            }

            await cp.save();

            return res.status(200).json({
                success: true,
                data: {
                    panVerified: cp.panVerified,
                    ...cp.panDetails
                },
                onboarding: {
                    currentStage: cp.currentStage,
                    completedStages: cp.completedStages
                },
                message: "PAN verified successfully."
            });

        } catch (error) {
            console.error("verifyPan error:", error);
            return res.status(500).json({ success: false, message: "An unexpected error occurred during PAN verification." });
        }
    }

    async verifyAadhaar(req, res) {
        try {
            const { channelPartnerId } = req.params;
            let { aadhaarNumber } = req.body;

            if (!aadhaarNumber || typeof aadhaarNumber !== 'string') {
                return res.status(400).json({ success: false, message: "Please enter a valid Aadhaar number." });
            }

            aadhaarNumber = aadhaarNumber.replace(/[^0-9]/g, '');

            if (aadhaarNumber.length !== 12) {
                return res.status(400).json({ success: false, message: "Please enter a valid 12-digit Aadhaar number." });
            }

            const cp = await ChannelPartner.findById(channelPartnerId);
            if (!cp) {
                return res.status(404).json({ success: false, message: "Channel Partner not found." });
            }

            // Stage validation
            if (!cp.mobileVerified || !cp.emailVerified || !cp.panVerified) {
                return res.status(403).json({ 
                    success: false, 
                    message: "Mobile, Email, and PAN verification must be completed before Aadhaar verification." 
                });
            }

            // Idempotency check: if already fully confirmed, no need to re-verify unless they want to restart?
            if (cp.aadhaarVerified && cp.aadhaarConfirmed && cp.aadhaar === aadhaarNumber) {
                return res.status(200).json({
                    success: true,
                    data: {
                        aadhaarVerified: cp.aadhaarVerified,
                        aadhaarConfirmed: cp.aadhaarConfirmed,
                        ...cp.aadhaarDetails
                    },
                    onboarding: {
                        currentStage: cp.currentStage,
                        completedStages: cp.completedStages
                    },
                    message: "Aadhaar is already verified and confirmed."
                });
            }

            // Import the service dynamically or at the top of the file
            const aadhaarService = (await import("../services/aadhaar.service.js")).default;
            
            let providerResponse;
            try {
                providerResponse = await aadhaarService.verifyAadhaar(aadhaarNumber);
            } catch (error) {
                console.error("External Aadhaar API error:", error);
                if (error.message === "AADHAAR_PROVIDER_NOT_CONFIGURED") {
                    return res.status(501).json({ success: false, message: "Aadhaar provider is not configured. Please use 000000000000 for testing." });
                }
                return res.status(503).json({ success: false, message: "Aadhaar verification service is temporarily unavailable. Please try again later." });
            }

            if (!providerResponse || !providerResponse.data) {
                return res.status(500).json({ success: false, message: "Invalid response from Aadhaar verification service." });
            }

            const aadhaarDetails = {
                fullName: providerResponse.data.fullName || '',
                photo: providerResponse.data.photo || '',
                careOf: providerResponse.data.careOf || null,
                fatherName: providerResponse.data.fatherName || null,
                dateOfBirth: providerResponse.data.dateOfBirth || null,
                gender: providerResponse.data.gender || '',
                fullAddress: providerResponse.data.fullAddress || ''
            };

            cp.aadhaar = aadhaarNumber;
            cp.aadhaarVerified = true;
            cp.aadhaarVerifiedAt = new Date();
            cp.aadhaarVerificationStatus = "SUCCESS";
            cp.aadhaarDetails = aadhaarDetails;
            cp.aadhaarConfirmed = false; // Reset confirmation

            await cp.save();

            return res.status(200).json({
                success: true,
                data: {
                    aadhaarVerified: cp.aadhaarVerified,
                    aadhaarConfirmed: cp.aadhaarConfirmed,
                    ...cp.aadhaarDetails
                },
                onboarding: {
                    currentStage: cp.currentStage,
                    completedStages: cp.completedStages
                },
                message: "Aadhaar verified successfully. Please confirm details."
            });

        } catch (error) {
            console.error("verifyAadhaar error:", error);
            return res.status(500).json({ success: false, message: "An unexpected error occurred during Aadhaar verification." });
        }
    }

    async confirmAadhaar(req, res) {
        try {
            const { channelPartnerId } = req.params;
            const { confirmed, careOf, fatherName } = req.body;

            if (confirmed !== true) {
                return res.status(400).json({ success: false, message: "Please confirm that the displayed details are correct before continuing." });
            }

            const cp = await ChannelPartner.findById(channelPartnerId);
            if (!cp) {
                return res.status(404).json({ success: false, message: "Channel Partner not found." });
            }

            if (!cp.aadhaarVerified) {
                return res.status(400).json({ success: false, message: "Aadhaar must be verified before confirmation." });
            }

            let updatedCareOf = cp.aadhaarDetails.careOf;
            let updatedFatherName = cp.aadhaarDetails.fatherName;

            if (!updatedCareOf) {
                if (!careOf || !careOf.trim() || careOf.trim() === '-' || careOf.trim().toLowerCase() === 'null') {
                    return res.status(400).json({ success: false, message: "Please enter Care of." });
                }
                updatedCareOf = careOf.trim();
            }

            if (!updatedFatherName) {
                if (!fatherName || !fatherName.trim() || fatherName.trim() === '-' || fatherName.trim().toLowerCase() === 'null') {
                    return res.status(400).json({ success: false, message: "Please enter Father's Name." });
                }
                updatedFatherName = fatherName.trim();
            }

            // Update details
            cp.aadhaarDetails.careOf = updatedCareOf;
            cp.aadhaarDetails.fatherName = updatedFatherName;
            
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

            return res.status(200).json({
                success: true,
                message: "Aadhaar details confirmed successfully.",
                onboarding: {
                    currentStage: cp.currentStage,
                    completedStages: cp.completedStages
                }
            });

        } catch (error) {
            console.error("confirmAadhaar error:", error);
            return res.status(500).json({ success: false, message: "An unexpected error occurred during Aadhaar confirmation." });
        }
    }
}

export default new ChannelPartnerController();
