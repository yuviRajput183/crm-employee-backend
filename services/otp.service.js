import crypto from "crypto";
import Otp from "../models/Otp.model.js";

class OtpService {
    generateOtp() {
        if (process.env.TEST_OTP_ENABLED === "true") {
            return "123456";
        }
        return crypto.randomInt(100000, 1000000).toString();
    }

    hashOtp(otp) {
        return crypto.createHash("sha256").update(otp).digest("hex");
    }

    async createOtp(channelPartnerId, channel, purpose, target, validityMinutes = 10, cooldownMinutes = 1) {
        // Generate new OTP
        const otp = this.generateOtp();
        const otpHash = this.hashOtp(otp);

        // Invalidate previous active OTPs for this session/channel/purpose
        await this.invalidatePreviousOtps(channelPartnerId, channel, purpose);

        // Calculate expiry
        const expiresAt = new Date();
        expiresAt.setMinutes(expiresAt.getMinutes() + validityMinutes);

        const resendAvailableAt = new Date();
        resendAvailableAt.setMinutes(resendAvailableAt.getMinutes() + cooldownMinutes);

        // Store in DB
        await Otp.create({
            channelPartnerId,
            channel,
            purpose,
            target,
            otpHash,
            expiresAt,
            resendAvailableAt,
            attempts: 0,
            maxAttempts: 5,
        });

        return otp; // Return the plain OTP to be sent via email/whatsapp
    }

    async invalidatePreviousOtps(channelPartnerId, channel, purpose) {
        await Otp.updateMany(
            { channelPartnerId, channel, purpose, expiresAt: { $gt: new Date() } },
            { $set: { expiresAt: new Date() } } // Set expiry to now to invalidate
        );
    }

    async verifyOtp(channelPartnerId, channel, purpose, target, submittedOtp) {
        // Find latest active OTP
        const otpRecord = await Otp.findOne({
            channelPartnerId,
            channel,
            purpose,
            target,
        }).sort({ createdAt: -1 });

        if (!otpRecord) {
            return { success: false, message: "No OTP found." };
        }

        // Check if expired
        if (new Date() > otpRecord.expiresAt) {
            return { success: false, message: "OTP has expired. Please request a new OTP." };
        }

        if (otpRecord.verified) {
            return { success: false, message: "OTP is already verified." };
        }

        // Check attempts
        if (otpRecord.attempts >= otpRecord.maxAttempts) {
            return { success: false, message: "Maximum OTP attempts exceeded. Please request a new OTP." };
        }

        // Check hash
        const submittedHash = this.hashOtp(submittedOtp);
        if (submittedHash !== otpRecord.otpHash) {
            // Increment attempts
            otpRecord.attempts += 1;
            await otpRecord.save();
            return { success: false, message: "Invalid OTP." };
        }

        // Success - mark as verified and invalidate
        otpRecord.verified = true;
        otpRecord.verifiedAt = new Date();
        otpRecord.expiresAt = new Date();
        await otpRecord.save();

        return { success: true, message: "OTP verified successfully." };
    }
}

export default new OtpService();
