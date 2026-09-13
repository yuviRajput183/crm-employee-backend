import mongoose from "mongoose";

const channelPartnerSchema = new mongoose.Schema(
    {
        applicationNumber: { type: String, unique: true, sparse: true },
        applicationStatus: { type: String, enum: ["IN_PROGRESS", "COMPLETED"], default: "IN_PROGRESS" },
        mobile: { type: String, sparse: true, unique: true },
        email: { type: String, sparse: true, unique: true },
        mobileVerified: { type: Boolean, default: false },
        emailVerified: { type: Boolean, default: false },
        mobileOtpExpiresAt: { type: Date },
        emailOtpExpiresAt: { type: Date },
        pan: { type: String, sparse: true },
        panVerified: { type: Boolean, default: false },
        panVerifiedAt: { type: Date },
        panVerificationStatus: { type: String },
        panDetails: {
            firstName: String,
            middleName: String,
            lastName: String,
            fullName: String,
            gender: String,
            dateOfBirth: Date,
            category: String,
            aadhaarLinked: Boolean,
            maskedAadhaar: String
        },
        authPan: { type: String, sparse: true },
        authPanVerified: { type: Boolean, default: false },
        authPanVerifiedAt: { type: Date },
        authPanDetails: {
            firstName: String,
            middleName: String,
            lastName: String,
            fullName: String,
            gender: String,
            dateOfBirth: Date,
            category: String,
            aadhaarLinked: Boolean,
            maskedAadhaar: String
        },
        aadhaar: { type: String, sparse: true },
        aadhaarVerified: { type: Boolean, default: false },
        aadhaarVerifiedAt: { type: Date },
        aadhaarConfirmed: { type: Boolean, default: false },
        aadhaarConfirmedAt: { type: Date },
        aadhaarVerificationStatus: { type: String },
        aadhaarDetails: {
            fullName: String,
            photo: String,
            careOf: String,
            fatherName: String,
            motherName: String,
            isMarried: Boolean,
            spouseName: String,
            dateOfBirth: Date,
            gender: String,
            fullAddress: String
        },
        businessDetails: {
            registrationType: { type: String, enum: ["Individual", "Sole Proprietorship", "Firm/LLP", "Company", "HUF"] },
            udyam: {
                panCheckStatus: { type: String, enum: ["PENDING", "FOUND", "NOT_FOUND"], default: "PENDING" },
                udyamNumber: { type: String },
                verificationStatus: { type: String, enum: ["PENDING", "VERIFIED", "FAILED"], default: "PENDING" },
                verificationResponse: { type: mongoose.Schema.Types.Mixed },
                enterpriseType: { type: String },
                majorActivity: { type: String },
                organisationType: { type: String },
                enterpriseName: { type: String },
                ownerName: { type: String },
                dateOfIncorporation: { type: String },
                officialAddress: { type: String },
                units: [{ type: mongoose.Schema.Types.Mixed }],
                selectedUnit: { type: mongoose.Schema.Types.Mixed },
                registrationDate: { type: String },
                lastUpdatedDate: { type: String },
                certificateDocument: {
                    type: { type: String, default: "UDYAM_CERTIFICATE" },
                    originalSource: String,
                    storageKey: String,
                    url: String,
                    uploadedAt: Date
                },
                declarationType: { type: String, enum: ["REGISTERED", "NOT_REGISTERED"] },
                declarationAccepted: { type: Boolean, default: false },
                declarationAcceptedAt: { type: Date }
            },
            gst: {
                panCheckStatus: { type: String, enum: ["PENDING", "FOUND", "NOT_FOUND"], default: "PENDING" },
                gstins: [{ type: mongoose.Schema.Types.Mixed }],
                selectedGstin: { type: String },
                verificationStatus: { type: String, enum: ["PENDING", "VERIFIED", "FAILED"], default: "PENDING" },
                legalName: { type: String },
                businessName: { type: String },
                constitutionOfBusiness: { type: String },
                dateOfRegistration: { type: String },
                taxpayerType: { type: String },
                gstinStatus: { type: String },
                address: { type: String },
                gstRegistered: { type: Boolean },
                declarationType: { type: String, enum: ["REGISTERED", "NOT_REGISTERED"] },
                declarationAccepted: { type: Boolean, default: false },
                declarationAcceptedAt: { type: Date }
            },
            businessVerificationStatus: { type: String, enum: ["NOT_STARTED", "IN_PROGRESS", "COMPLETED"], default: "NOT_STARTED" }
        },
        bankDetails: { type: mongoose.Schema.Types.Mixed },
        documents: { type: mongoose.Schema.Types.Mixed },
        isApproved: { type: Boolean, default: false },
        currentStage: { type: Number, default: 1 },
        completedStages: { type: [Number], default: [] },
        
        // Code Generation Fields
        code: { type: String, unique: true, sparse: true },
        referredByLevel1Id: { type: mongoose.Schema.Types.ObjectId, ref: 'ChannelPartner' },
        referredByLevel2Id: { type: mongoose.Schema.Types.ObjectId, ref: 'ChannelPartner' },
        dealType: { type: String, enum: ["Fixed", "Variable"] },
        dealPercentage: { type: Number },
        referralDealPercentage: { type: Number },
        balanceReferralDealPercentage: { type: Number },
        generatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee' }, // Or User
        generatedAt: { type: Date },
        agreementSigningAt: { type: Date },
        approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee' },
        approvedAt: { type: Date },

        status: { type: String, enum: ["pending", "pending_approval", "active", "inactive"], default: "pending" },
        agreement: {
            generated: { type: Boolean, default: false },
            generatedAt: { type: Date },
            fileName: { type: String },
            filePath: { type: String },
            fileUrl: { type: String },
            templateVersion: { type: String }
        }
    },
    { timestamps: true }
);

export default mongoose.models.ChannelPartner || mongoose.model("ChannelPartner", channelPartnerSchema);
