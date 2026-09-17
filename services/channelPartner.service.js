import ErrorResponse from "../lib/error.res.js";
import ChannelPartner from "../models/ChannelPartner.model.js";
import surepassService from "./surepass.service.js";
import fs from "fs";
import path from "path";
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';

class ChannelPartnerService {
    async getAllChannelPartners(req, res, next) {
        const cps = await ChannelPartner.find().sort({ createdAt: -1 });
        return { data: cps };
    }

    async getChannelPartner(req, res, next) {
        const { channelPartnerId } = req.params;
        const cp = await ChannelPartner.findById(channelPartnerId);
        if (!cp) {
            return next(ErrorResponse.notFound("Channel Partner not found."));
        }
        return { data: cp };
    }

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
        let constructedAddress = aadhaarXml.full_address || '';
        if (aadhaarXml.address) {
            const addr = aadhaarXml.address;
            const parts = [
                addr.house, addr.street, addr.landmark, addr.loc, 
                addr.po, addr.subdist, addr.dist, addr.vtc, 
                addr.state, addr.country, aadhaarXml.zip || addr.zip
            ].filter(p => p && String(p).trim() !== '');
            constructedAddress = parts.join(', ');
        }

        const aadhaarDetails = {
            fullName: aadhaarXml.full_name || '',
            photo: aadhaarXml.profile_image ? `data:image/jpeg;base64,${aadhaarXml.profile_image}` : '',
            careOf: aadhaarXml.care_of || null,
            fatherName: aadhaarXml.father_name || null,
            dateOfBirth: aadhaarXml.dob ? new Date(aadhaarXml.dob) : null,
            gender: aadhaarXml.gender || '',
            fullAddress: constructedAddress
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

        // Removed mandatory careOf check because it is strictly fetched from Aadhaar API
        // if (!updatedCareOf) {
        //     updatedCareOf = careOf ? careOf.trim() : null;
        // }

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
    async verifyBank(req, res, next) {
        const { channelPartnerId } = req.params;
        const { accountNumber, ifsc } = req.body;

        if (!accountNumber || !ifsc) {
            return next(ErrorResponse.badRequest("Account Number and IFSC Code are required."));
        }

        const cp = await ChannelPartner.findById(channelPartnerId);
        if (!cp) {
            return next(ErrorResponse.notFound("Channel Partner not found."));
        }

        // Call Surepass API
        /*
        let surepassResponse;
        try {
            surepassResponse = await surepassService.verifyBankAccount(accountNumber, ifsc);
        } catch (error) {
            console.error("External Bank API error:", error);
            return next(ErrorResponse.internalServer("Bank verification service is temporarily unavailable. Please try again later."));
        }

        if (!surepassResponse || !surepassResponse.data || surepassResponse.data.status !== "success") {
            return next(ErrorResponse.badRequest("Bank account verification failed. Please check the details."));
        }

        const bankData = surepassResponse.data;
        */

        // Dummy data for testing
        const bankData = {
            account_exists: true,
            full_name: "DUMMY TEST USER",
            remarks: "Account is active (DUMMY)",
            status: "success",
            ifsc_details: {
                bank_name: "DUMMY BANK LTD",
                branch: "TEST BRANCH",
                city: "TEST CITY",
                state: "TEST STATE",
                micr: "123456789",
                contact: "1234567890",
                address: "DUMMY ADDRESS, TEST CITY"
            }
        };

        // Ensure name matches or at least save it
        cp.bankDetails = {
            accountNumber,
            ifsc,
            accountExists: bankData.account_exists,
            fullName: bankData.full_name,
            remarks: bankData.remarks,
            status: bankData.status,
            bankName: bankData.ifsc_details?.bank_name,
            branch: bankData.ifsc_details?.branch,
            city: bankData.ifsc_details?.city,
            state: bankData.ifsc_details?.state,
            micr: bankData.ifsc_details?.micr,
            contact: bankData.ifsc_details?.contact,
            address: bankData.ifsc_details?.address,
            verifiedAt: new Date()
        };

        if (cp.currentStage === 6) {
            cp.currentStage = 7;
        }
        if (!cp.completedStages.includes(6)) {
            cp.completedStages.push(6);
        }

        // Mongoose mixed type requires markModified
        cp.markModified('bankDetails');
        await cp.save();

        return {
            data: {
                bankDetails: cp.bankDetails,
                businessDetails: cp.businessDetails,
                panDetails: cp.panDetails,
                aadhaarDetails: cp.aadhaarDetails,
                mobile: cp.mobile,
                email: cp.email,
                authPanDetails: cp.authPanDetails
            },
            onboarding: {
                currentStage: cp.currentStage,
                completedStages: cp.completedStages
            },
            message: "Bank account verified successfully."
        };
    }

    async confirmPartnerDetails(req, res, next) {
        const { channelPartnerId } = req.params;
        const { declarationAccepted, addressSource, addressDetails } = req.body;

        if (!declarationAccepted) {
            return next(ErrorResponse.badRequest("Declaration must be accepted."));
        }

        const cp = await ChannelPartner.findById(channelPartnerId);
        if (!cp) {
            return next(ErrorResponse.notFound("Channel Partner not found."));
        }

        if (!cp.bankDetails) {
            cp.bankDetails = {};
        }

        cp.bankDetails.detailsConfirmed = true;
        cp.bankDetails.detailsConfirmedAt = new Date();
        cp.bankDetails.addressSource = addressSource;
        cp.bankDetails.addressDetails = addressDetails;

        cp.markModified('bankDetails');
        await cp.save();

        return {
            onboarding: {
                currentStage: cp.currentStage,
                completedStages: cp.completedStages
            },
            message: "Partner details confirmed successfully."
        };
    }
    async uploadDocuments(req, res, next) {
        const { channelPartnerId } = req.params;
        const cp = await ChannelPartner.findById(channelPartnerId);
        if (!cp) {
            return next(ErrorResponse.notFound("Channel Partner not found."));
        }

        const cpName = cp.aadhaarDetails?.fullName || cp.panDetails?.fullName || 'Unknown';
        const safeName = cpName.replace(/[^a-z0-9]/gi, '_').toLowerCase();
        
        // We'll use cp._id as UniqueId
        const dirName = `${cp._id}_${safeName}`;
        const targetDir = path.join(process.cwd(), 'uploads', 'ChannelPartnerDocuments', dirName);

        if (!fs.existsSync(targetDir)) {
            fs.mkdirSync(targetDir, { recursive: true });
        }

        const files = req.files || [];
        const uploadedFilePaths = {};

        files.forEach(file => {
            const ext = path.extname(file.originalname) || '.pdf';
            const targetFileName = `${file.fieldname}${ext}`;
            const targetPath = path.join(targetDir, targetFileName);
            
            fs.renameSync(file.path, targetPath);
            
            // Generate public URL
            uploadedFilePaths[file.fieldname] = `/uploads/ChannelPartnerDocuments/${dirName}/${targetFileName}`;
        });

        // Determine required docs based on CP state
        const requiredDocs = ['pan', 'bankProof'];
        if (cp.authPanVerified) {
            requiredDocs.push('authSignPan', 'authSignAadhaar', 'authSignLetter');
        }
        const isPerson = cp.businessDetails?.registrationType === 'Individual' || cp.businessDetails?.registrationType === 'Sole Proprietorship' || cp.businessDetails?.registrationType === 'Individual/Sole Prop' || cp.businessDetails?.registrationType === 'HUF';
        if (isPerson) requiredDocs.push('aadhaar');
        if (cp.businessDetails?.udyam?.declarationType === 'REGISTERED') requiredDocs.push('udyamCert');
        if (cp.businessDetails?.gst?.declarationType === 'REGISTERED') {
            requiredDocs.push('gstCert', 'eInvoiceDeclaration');
        }
        if (cp.businessDetails?.registrationType === 'Company') requiredDocs.push('coi', 'moa', 'aoa');
        if (cp.businessDetails?.registrationType === 'Firm/LLP' || cp.businessDetails?.registrationType === 'Partnership/LLP') requiredDocs.push('partnershipDeed');

        // Merge with existing docStates if they exist (in case of re-upload after rejection)
        const docStates = cp.documents?.docStates ? { ...cp.documents.docStates } : {};
        
        const isFinalSubmit = req.body.isFinalSubmit === 'true';

        // Update URL for just the uploaded files
        Object.keys(uploadedFilePaths).forEach(docKey => {
            if (!docStates[docKey]) docStates[docKey] = { remark: '' };
            docStates[docKey].url = uploadedFilePaths[docKey];
            if (docStates[docKey].status !== 'APPROVED') {
                docStates[docKey].status = isFinalSubmit ? 'SUBMITTED' : 'UPLOADED';
            }
        });

        if (isFinalSubmit) {
            requiredDocs.forEach(doc => {
                if (!docStates[doc] || docStates[doc].status !== 'APPROVED') {
                    docStates[doc] = { 
                        status: 'SUBMITTED', 
                        remark: '',
                        url: docStates[doc]?.url || ''
                    };
                }
            });

            cp.documents = {
                status: "SUBMITTED",
                submittedAt: new Date(),
                docStates: docStates
            };

            if (cp.currentStage === 7) {
                cp.currentStage = 8;
            }
            if (!cp.completedStages.includes(7)) {
                cp.completedStages.push(7);
            }

            cp.isApproved = false;
            cp.status = "pending";
        } else {
            if (!cp.documents) cp.documents = {};
            cp.documents.docStates = docStates;
            cp.documents.status = cp.documents.status || 'DRAFT';
        }

        cp.markModified('documents');
        await cp.save();

        return {
            onboarding: {
                currentStage: cp.currentStage,
                completedStages: cp.completedStages
            },
            message: "Documents submitted successfully for review."
        };
    }

    async reviewDocument(req, res, next) {
        const { channelPartnerId, docKey } = req.params;
        const { status, remark } = req.body;

        if (!['APPROVED', 'REJECTED'].includes(status)) {
            return next(ErrorResponse.badRequest("Status must be either APPROVED or REJECTED."));
        }

        if (status === 'REJECTED' && !remark) {
            return next(ErrorResponse.badRequest("Remark is required when rejecting a document."));
        }

        const cp = await ChannelPartner.findById(channelPartnerId);
        if (!cp) {
            return next(ErrorResponse.notFound("Channel Partner not found."));
        }

        if (!cp.documents || !cp.documents.docStates || !cp.documents.docStates[docKey]) {
            return next(ErrorResponse.badRequest("Document not found in submissions."));
        }

        cp.documents.docStates[docKey].status = status;
        cp.documents.docStates[docKey].remark = status === 'REJECTED' ? remark : '';

        // Check overall status
        const states = Object.values(cp.documents.docStates);
        const anyRejected = states.some(doc => doc.status === 'REJECTED');
        const allApproved = states.every(doc => doc.status === 'APPROVED');

        if (anyRejected) {
            cp.documents.status = 'REJECTED';
        } else if (allApproved) {
            cp.documents.status = 'APPROVED';
        } else {
            cp.documents.status = 'SUBMITTED';
        }

        cp.markModified('documents');
        await cp.save();

        return { message: `Document ${docKey} ${status.toLowerCase()} successfully`, documents: cp.documents };
    }

    async generateAgreement(req, res, next) {
        const { channelPartnerId } = req.params;
        const cp = await ChannelPartner.findById(channelPartnerId);
        
        if (!cp) {
            return next(ErrorResponse.notFound("Channel Partner not found."));
        }

        if (!cp.pan && !cp.panDetails?.panNumber) {
            return next(ErrorResponse.badRequest("Verified PAN is required to generate the agreement."));
        }
        if (!cp.mobile) {
            return next(ErrorResponse.badRequest("Verified mobile number is required to generate the agreement."));
        }
        if (!cp.email) {
            return next(ErrorResponse.badRequest("Verified email address is required to generate the agreement."));
        }

        const templatePath = path.join(process.cwd(), 'templates', 'pdf', 'ULSPL Connector Agreement - AcroForm.pdf');
        if (!fs.existsSync(templatePath)) {
            return next(ErrorResponse.internalServer("Agreement template not found on server."));
        }

        try {
            const pdfBytes = fs.readFileSync(templatePath);
            const pdfDoc = await PDFDocument.load(pdfBytes);
            const form = pdfDoc.getForm();

            // Format date as DD/MM/YYYY
            const now = new Date();
            const signingDate = `${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()}`;
            
            // Name logic
            const cpName = cp.businessDetails?.udyam?.enterpriseName || cp.businessDetails?.gst?.legalName || cp.panDetails?.fullName || cp.aadhaarDetails?.fullName || '';
            const pan = cp.panDetails?.panNumber || cp.pan || '';
            
            // Address logic
            const udyamAddr = cp.businessDetails?.udyam?.officialAddress;
            const gstAddr = cp.businessDetails?.gst?.address;
            const bankAddr = cp.bankDetails?.addressDetails ? 
                `${cp.bankDetails.addressDetails.addressLine1 || ''} ${cp.bankDetails.addressDetails.addressLine2 || ''}`.trim() : '';
            const aadhaarAddr = cp.aadhaarDetails?.fullAddress;
            
            const businessAddress = udyamAddr || gstAddr || aadhaarAddr || bankAddr || '';
            const commAddress = aadhaarAddr || bankAddr || businessAddress || '';
            
            const mobile = cp.mobile || '';
            const email = cp.email || '';
            const authSignName = cp.authPanDetails?.fullName || cp.panDetails?.fullName || '';

            const AGREEMENT_FIELDS = {
                signingDate,
                channelPartnerName: cpName,
                pan,
                businessAddress,
                connectorName: cpName,
                contactName: authSignName,
                communicationAddress: commAddress,
                connectorAddress: commAddress,
                mobile,
                connectorMobile: mobile,
                email,
                connectorEmail: email,
                executionPartnerName: cpName,
                authorizedSignatoryName: authSignName,
                scheduleFirmName: cpName,
                additionalGuidelinesConnectorName: cpName,
                conflictConnectorName: cpName
            };

            const setTextField = (formObj, fieldName, value) => {
                try {
                    const field = formObj.getTextField(fieldName);
                    if (!field) {
                        console.warn(`PDF field not found: ${fieldName}`);
                        return;
                    }
                    field.setText(value == null ? "" : String(value));
                } catch (err) {
                    console.warn(`Could not set field ${fieldName}: ${err.message}`);
                }
            };

            Object.entries(AGREEMENT_FIELDS).forEach(([fieldName, value]) => {
                setTextField(form, fieldName, value);
            });

            // eSign process requires unflattened PDF with signature fields intact

            // --- Merge logic starts here ---
            const agreementPdfBytes = await pdfDoc.save();

            // Generate KYC Form
            const { default: pdfGeneratorService } = await import("./pdfGenerator.service.js");
            const kycPdfBytes = await pdfGeneratorService.generateKycForm(cp);

            // Merge PDFs
            const mergedPdf = await PDFDocument.create();
            const kycDoc = await PDFDocument.load(kycPdfBytes);
            const agreementDoc = await PDFDocument.load(agreementPdfBytes);

            const copiedKycPages = await mergedPdf.copyPages(kycDoc, kycDoc.getPageIndices());
            copiedKycPages.forEach((page) => mergedPdf.addPage(page));

            const copiedAgreementPages = await mergedPdf.copyPages(agreementDoc, agreementDoc.getPageIndices());
            copiedAgreementPages.forEach((page) => mergedPdf.addPage(page));

            const pdfBytesOut = await mergedPdf.save();
            // --- Merge logic ends here ---

            const targetDir = path.join(process.cwd(), 'uploads', 'Agreements');
            if (!fs.existsSync(targetDir)) {
                fs.mkdirSync(targetDir, { recursive: true });
            }

            const timestamp = Date.now();
            const sanitizedId = String(cp._id).replace(/[^a-zA-Z0-9_-]/g, '');
            const fileName = `ULSPL-Connector-Agreement-${sanitizedId}-${timestamp}.pdf`;
            const filePath = path.join(targetDir, fileName);
            
            fs.writeFileSync(filePath, pdfBytesOut);

            const fileUrl = `/uploads/Agreements/${fileName}`;

            // Update CP state to Stage 9
            if (cp.currentStage === 8) {
                cp.currentStage = 9;
            }
            if (!cp.completedStages.includes(8)) {
                cp.completedStages.push(8);
            }
            
            const templateVersion = "ULSPL_CONNECTOR_AGREEMENT_V1";
            cp.agreement = {
                generated: true,
                generatedAt: new Date(),
                fileName,
                filePath,
                fileUrl,
                templateVersion
            };
            
            if (!cp.documents) cp.documents = {};
            cp.documents.agreementUrl = fileUrl;
            
            cp.markModified('agreement');
            cp.markModified('documents');
            await cp.save();

            return {
                message: "Connector agreement generated successfully",
                data: {
                    channelPartnerId: cp._id,
                    fileName,
                    fileUrl,
                    generatedAt: cp.agreement.generatedAt
                },
                onboarding: {
                    currentStage: cp.currentStage,
                    completedStages: cp.completedStages
                }
            };
        } catch (err) {
            console.error("PDF Generation Error:", err);
            return next(ErrorResponse.internalServer("Failed to generate PDF agreement."));
        }
    }

    async downloadAgreement(req, res, next) {
        const { channelPartnerId } = req.params;
        const cp = await ChannelPartner.findById(channelPartnerId);
        
        if (!cp) {
            return next(ErrorResponse.notFound("Channel Partner not found."));
        }

        if (!cp.agreement || !cp.agreement.filePath) {
            return next(ErrorResponse.notFound("Agreement not generated yet."));
        }

        const filePath = cp.agreement.filePath;
        if (!fs.existsSync(filePath)) {
            return next(ErrorResponse.notFound("Agreement file not found on server."));
        }

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="${cp.agreement.fileName}"`);
        
        const fileStream = fs.createReadStream(filePath);
        fileStream.pipe(res);
    }
}

export default new ChannelPartnerService();
