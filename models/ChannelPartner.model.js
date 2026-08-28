import mongoose from "mongoose";

const channelPartnerSchema = new mongoose.Schema(
    {
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
            dateOfBirth: Date,
            gender: String,
            fullAddress: String
        },
        businessDetails: { type: mongoose.Schema.Types.Mixed },
        bankDetails: { type: mongoose.Schema.Types.Mixed },
        documents: { type: mongoose.Schema.Types.Mixed },
        isApproved: { type: Boolean, default: false },
        currentStage: { type: Number, default: 1 },
        completedStages: { type: [Number], default: [] },
        status: { type: String, enum: ["pending", "active", "inactive"], default: "pending" }
    },
    { timestamps: true }
);

export default mongoose.models.ChannelPartner || mongoose.model("ChannelPartner", channelPartnerSchema);
