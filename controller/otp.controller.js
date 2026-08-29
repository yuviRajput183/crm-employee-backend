import crypto from "crypto";
import ChannelPartner from "../models/ChannelPartner.model.js";
import Otp from "../models/Otp.model.js";
import otpService from "../services/otp.service.js";
import emailService from "../services/email.service.js";
import whatsappMessageService from "../services/whatsappMessage.service.js";

class OtpController {
    // Send or Resend OTP
    async sendOtp(req, res) {
        try {
            let { mobile, email, channel, purpose } = req.body;

            if (!channel || !purpose || (!mobile && !email)) {
                return res.status(400).json({ success: false, message: "Missing required fields" });
            }

            // Clean mobile if provided
            if (mobile) {
                mobile = mobile.replace(/[^0-9]/g, '');
            }

            let cp;
            let target;

            if (channel === "mobile") {
                target = mobile;
                if (!target || target.length < 10) {
                    return res.status(400).json({ success: false, message: "Invalid mobile number" });
                }
                
                cp = await ChannelPartner.findOne({ mobile: target });
                if (cp && cp.mobileVerified) {
                    // Mobile is verified, so resume onboarding
                    return res.status(200).json({
                        success: true,
                        existingChannelPartner: true,
                        mobileVerified: cp.mobileVerified,
                        emailVerified: cp.emailVerified,
                        currentStage: cp.currentStage,
                        channelPartnerId: cp._id.toString(),
                        message: "Mobile number recognized. Resuming Channel Partner onboarding..."
                    });
                }
                
                if (!cp) {
                    // Case A: Mobile does not exist
                    cp = await ChannelPartner.create({
                        mobile: target,
                        currentStage: 1,
                        status: "pending"
                    });
                }
            } else if (channel === "email") {
                target = email;
                if (!target) {
                    return res.status(400).json({ success: false, message: "Invalid email" });
                }
                // We MUST have a mobile number to identify the CP for Stage 2
                if (!mobile) {
                    return res.status(400).json({ success: false, message: "Mobile number required to identify Channel Partner" });
                }
                
                cp = await ChannelPartner.findOne({ mobile });
                if (!cp || !cp.mobileVerified) {
                    return res.status(400).json({ success: false, message: "Mobile number must be verified first." });
                }

                if (cp.emailVerified && cp.email === target) {
                    return res.status(200).json({
                        success: true,
                        existingChannelPartner: true,
                        mobileVerified: cp.mobileVerified,
                        emailVerified: cp.emailVerified,
                        currentStage: cp.currentStage,
                        channelPartnerId: cp._id.toString(),
                        message: "Email already verified."
                    });
                }

                // Check for email conflicts
                const otherCp = await ChannelPartner.findOne({ email: target });
                if (otherCp && otherCp._id.toString() !== cp._id.toString()) {
                    return res.status(409).json({ success: false, message: "This email address is already associated with another Channel Partner." });
                }

                // Associate email with current CP
                cp.email = target;
                await cp.save();
            } else {
                return res.status(400).json({ success: false, message: "Invalid channel" });
            }

            // Check existing active OTP for resend cooldown
            const existingOtp = await Otp.findOne({
                channelPartnerId: cp._id,
                channel,
                purpose,
                target,
                expiresAt: { $gt: new Date() },
            }).sort({ createdAt: -1 });

            if (existingOtp) {
                if (new Date() < existingOtp.resendAvailableAt) {
                    const diff = Math.ceil((existingOtp.resendAvailableAt - new Date()) / 1000);
                    return res.status(400).json({
                        success: false,
                        code: "OTP_RESEND_COOLDOWN",
                        resendAvailableAt: existingOtp.resendAvailableAt,
                        message: `Please wait ${diff} seconds before requesting another OTP.`
                    });
                }
            }

            const validityMinutes = 10;
            const cooldownMinutes = 1;
            const otp = await otpService.createOtp(cp._id, channel, purpose, target, validityMinutes, cooldownMinutes);

            // Fetch the created OTP to get exact timestamps
            const createdOtpRecord = await Otp.findOne({ channelPartnerId: cp._id, target, otpHash: otpService.hashOtp(otp) }).sort({ createdAt: -1 });

            if (channel === "email") {
                await emailService.sendEmailOtp(target, otp, validityMinutes);
            } else if (channel === "mobile") {
                await whatsappMessageService.sendOtp(target, otp);
            }

            return res.status(200).json({
                success: true,
                message: "OTP sent successfully",
                otpExpiresAt: createdOtpRecord.expiresAt,
                resendAvailableAt: createdOtpRecord.resendAvailableAt,
                currentStage: cp.currentStage,
                channelPartnerId: cp._id.toString()
            });

        } catch (error) {
            console.error("Error sending OTP:", error);
            return res.status(500).json({ success: false, message: "Failed to send OTP. Please try again." });
        }
    }

    // Verify OTP
    async verifyOtp(req, res) {
        try {
            let { mobile, email, channel, purpose, otp } = req.body;

            if (!channel || !purpose || !otp || (!mobile && !email)) {
                return res.status(400).json({ success: false, message: "Missing required fields" });
            }

            // Clean mobile if provided
            if (mobile) {
                mobile = mobile.replace(/[^0-9]/g, '');
            }

            let cp;
            let target;

            if (channel === "mobile") {
                target = mobile;
                cp = await ChannelPartner.findOne({ mobile: target });
            } else if (channel === "email") {
                target = email;
                cp = await ChannelPartner.findOne({ mobile }); // Must identify via mobile
            }

            if (!cp) {
                return res.status(404).json({ success: false, message: "Channel Partner not found" });
            }

            // Verify OTP
            const verificationResult = await otpService.verifyOtp(cp._id, channel, purpose, target, otp);

            if (!verificationResult.success) {
                return res.status(400).json({ success: false, message: verificationResult.message });
            }

            // Update session status
            if (channel === "mobile") {
                cp.mobileVerified = true;
                if (cp.currentStage === 1) {
                    cp.currentStage = 2;
                    if (!cp.completedStages.includes(1)) cp.completedStages.push(1);
                }
            } else if (channel === "email") {
                cp.emailVerified = true;
                if (cp.currentStage === 2) {
                    cp.currentStage = 3;
                    if (!cp.completedStages.includes(2)) cp.completedStages.push(2);
                }
            }
            await cp.save();

            return res.status(200).json({
                success: true,
                message: channel === "email" ? "Email verified successfully." : "Mobile number verified successfully.",
                mobileVerified: cp.mobileVerified,
                emailVerified: cp.emailVerified,
                currentStage: cp.currentStage,
                completedStages: cp.completedStages,
                channelPartnerId: cp._id.toString()
            });
        } catch (error) {
            console.error("Error verifying OTP:", error);
            return res.status(500).json({ success: false, message: "Internal server error" });
        }
    }

    // Check Status based on mobile
    async getSessionStatus(req, res) {
        try {
            let { mobile } = req.query;
            
            if (!mobile) {
                return res.status(400).json({ success: false, message: "Mobile number required" });
            }

            mobile = mobile.replace(/[^0-9]/g, '');
            const cp = await ChannelPartner.findOne({ mobile });
            
            if (!cp) {
                return res.status(404).json({ success: false, message: "Channel Partner not found" });
            }

            // Check if there are active OTPs
            let mobileOtpExpiresAt = null;
            let emailOtpExpiresAt = null;
            let mobileResendAvailableAt = null;
            let emailResendAvailableAt = null;
            let isMobileOtpSent = false;
            let isEmailOtpSent = false;

            if (!cp.mobileVerified) {
                const activeMobileOtp = await Otp.findOne({
                    channelPartnerId: cp._id,
                    channel: "mobile",
                    expiresAt: { $gt: new Date() }
                }).sort({ createdAt: -1 });

                if (activeMobileOtp) {
                    mobileOtpExpiresAt = activeMobileOtp.expiresAt;
                    mobileResendAvailableAt = activeMobileOtp.resendAvailableAt;
                    isMobileOtpSent = true;
                }
            }

            if (!cp.emailVerified && cp.email) {
                const activeEmailOtp = await Otp.findOne({
                    channelPartnerId: cp._id,
                    channel: "email",
                    expiresAt: { $gt: new Date() }
                }).sort({ createdAt: -1 });

                if (activeEmailOtp) {
                    emailOtpExpiresAt = activeEmailOtp.expiresAt;
                    emailResendAvailableAt = activeEmailOtp.resendAvailableAt;
                    isEmailOtpSent = true;
                }
            }

            return res.status(200).json({
                success: true,
                channelPartnerId: cp._id.toString(),
                currentStage: cp.currentStage,
                completedStages: cp.completedStages,
                mobileVerified: cp.mobileVerified,
                emailVerified: cp.emailVerified,
                panVerified: cp.panVerified,
                panDetails: cp.panDetails,
                pan: cp.pan,
                authPanVerified: cp.authPanVerified,
                authPanDetails: cp.authPanDetails,
                authPan: cp.authPan,
                aadhaarVerified: cp.aadhaarVerified,
                aadhaarConfirmed: cp.aadhaarConfirmed,
                aadhaarDetails: cp.aadhaarDetails,
                aadhaar: cp.aadhaar,
                mobile: cp.mobile,
                email: cp.email,
                mobileOtpExpiresAt,
                emailOtpExpiresAt,
                mobileResendAvailableAt,
                emailResendAvailableAt,
                isMobileOtpSent,
                isEmailOtpSent
            });
        } catch (error) {
            console.error("Error getting session status:", error);
            return res.status(500).json({ success: false, message: "Internal server error" });
        }
    }
}

export default new OtpController();
