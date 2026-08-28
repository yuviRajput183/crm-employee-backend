import mongoose from "mongoose";

const OtpSchema = new mongoose.Schema(
    {
        channelPartnerId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "ChannelPartner",
            required: true,
        },
        channel: {
            type: String,
            enum: ["mobile", "email"],
            required: true,
        },
        purpose: {
            type: String,
            enum: ["channel_partner_mobile", "channel_partner_email"],
            required: true,
        },
        target: {
            type: String,
            required: true,
        },
        otpHash: {
            type: String,
            required: true,
        },
        attempts: {
            type: Number,
            default: 0,
        },
        maxAttempts: {
            type: Number,
            default: 5,
        },
        expiresAt: {
            type: Date,
            required: true,
        },
        resendAvailableAt: {
            type: Date,
            required: true,
        },
        verified: {
            type: Boolean,
            default: false,
        },
        verifiedAt: {
            type: Date,
        }
    },
    {
        timestamps: true,
    }
);

export default mongoose.models.Otp || mongoose.model("Otp", OtpSchema);
