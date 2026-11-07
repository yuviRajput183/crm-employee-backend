import ErrorResponse from "../lib/error.res.js";
import Advisor from "../models/Advisor.model.js";
import Employee from "../models/Employee.model.js";
import User from "../models/User.model.js";
import Otp from "../models/Otp.model.js";
import otpService from "./otp.service.js";
import whatsappMessageService from "./whatsappMessage.service.js";
import jwt from "jsonwebtoken";

class AuthService {
  /**
   * login - Handles login requests.
   * @param {body(role, loginName, password)} req - Expects req.body.role, req.body.loginName and req.body.password for user authentication.
   * @param {Object} res - The HTTP response object.
   * @param {Function} next - The next middleware function for error handling.
   */
  async login(req, res, next) {
    try {
      const { role, loginName, password } = req.body;
      const normalizedRole = role?.toLowerCase();
      if (!["employee", "advisor"].includes(normalizedRole)) {
        return next(ErrorResponse.badRequest("Invalid role"));
      }
      const user = await User.findOne({ loginName, role: normalizedRole });
      if (!user) {
        return next(ErrorResponse.unauthorized("Invalid login name or password"));
      }
      if (user.password !== password) {
        return next(ErrorResponse.unauthorized("Invalid login name or password"));
      }
      const profileModel = normalizedRole === "advisor" ? Advisor : Employee;
      const profile = await profileModel.findById(user.referenceId);
      if (!profile || !profile.isActive) {
        return next(
          ErrorResponse.forbidden("User is inactive or profile not found")
        );
      }
      const payload = {
        id: user._id,
        referenceId: user.referenceId,
        role: user.role,
        groupId: profile.groupId,
        ownerId: profile.ownerId,
      };
      const token = jwt.sign(payload, process.env.JWT_SECRET, {
        expiresIn: "1h",
      });
      res.cookie("token", token, {
        httpOnly: true,
        maxAge: 1000 * 60 * 60,
        secure: true,
        sameSite: "None",
      });
      payload.token = token;
      req.id = payload.id;
      return {
        data: {
          ...payload,
          profile,
        },
        message: "User logged in successfully",
      };
    } catch (error) {
      return next(ErrorResponse.internalServer(error.message));
    }
  }

  /**
   * logout - Handles logout requests.
   * @param {Object} req - The HTTP request object.
   * @param {Object} res - The HTTP response object.
   * @param {Function} next - The next middleware function for error handling.
   */
  async logout(req, res, next) {
    res.clearCookie("token", {
      httpOnly: true,
      secure: true,
      sameSite: "None",
    });

    return {
      message: "Logged out successfully",
    };
  }

  /**
   * resetPassword - Login user can reset their password.
   * @param {body(oldPassword, newPassword, confirmPassword)} req - Expects req.body.oldPassword, req.body.newPassword and req.body.confirmPassword for password reset.
   * @param {Object} res - The HTTP response object.
   * @param {Function} next - The next middleware function for error handling.
   */
  async resetPassword(req, res, next) {
    const { oldPassword, newPassword, confirmPassword } = req.body;
    const userId = req.user.id;

    if (newPassword !== confirmPassword) {
      return next(
        ErrorResponse.badRequest(
          "New password and confirm password do not match"
        )
      );
    }

    const user = await User.findById(userId);
    if (!user) return next(ErrorResponse.notFound("User not found"));

    if (user.password !== oldPassword) {
      return next(ErrorResponse.unauthorized("Old password is incorrect"));
    }

    user.password = newPassword;
    await user.save();

    return {
      message: "Password reset successfully",
    };
  }

  // ---------------------------------------------------------------------------
  // WhatsApp OTP Login Methods
  // ---------------------------------------------------------------------------

  /**
   * _findUserByMobile - Internal helper to find a User and their profile by mobile number and role.
   * Searches only the collection matching the provided role to avoid cross-collection ambiguity
   * when the same mobile number exists in both Employee and Advisor collections.
   *
   * @param {string} mobile - The mobile number to search for.
   * @param {string} role   - "employee" or "advisor" (case-insensitive).
   * @returns {{ user, profile, profileModel }} or null if not found.
   */
  async _findUserByMobile(mobile, role) {
    const normalizedRole = role?.toLowerCase();

    if (!["employee", "advisor"].includes(normalizedRole)) {
      return null;
    }

    let profile = null;
    let profileModel = null;

    if (normalizedRole === "employee") {
      profile = await Employee.findOne({ mobile });
      profileModel = Employee;
    } else {
      profile = await Advisor.findOne({ mobile });
      profileModel = Advisor;
    }

    if (!profile) return null;

    // Find the linked User record via referenceId
    const user = await User.findOne({ referenceId: profile._id });
    if (!user) return null;

    return { user, profile, profileModel };
  }

  /**
   * sendWhatsappLoginOtp - Generates and sends a WhatsApp OTP for login.
   * @param {body(mobile, role)} req - Expects req.body.mobile and req.body.role ("Advisor"|"Employee").
   * @param {Object} res - The HTTP response object.
   * @param {Function} next - The next middleware function for error handling.
   */
  async sendWhatsappLoginOtp(req, res, next) {
    try {
      let { mobile, role } = req.body;

      // Validate role
      if (!role) {
        return next(ErrorResponse.badRequest("User type is required"));
      }
      const normalizedRole = role.toLowerCase();
      if (!["employee", "advisor"].includes(normalizedRole)) {
        return next(ErrorResponse.badRequest("Invalid user type"));
      }

      // Validate mobile
      if (!mobile) {
        return next(ErrorResponse.badRequest("Mobile number is required"));
      }
      mobile = mobile.replace(/[^0-9]/g, "");
      if (mobile.length < 10) {
        return next(ErrorResponse.badRequest("Invalid mobile number"));
      }

      // Look up user by mobile + role — use generic error to avoid revealing registration status
      const result = await this._findUserByMobile(mobile, normalizedRole);
      if (!result) {
        return next(ErrorResponse.unauthorized("Invalid credentials. Please check your mobile number and user type."));
      }

      const { user, profile } = result;

      // Check if the account is active
      if (!profile.isActive) {
        return next(ErrorResponse.forbidden("Your account is inactive. Please contact support."));
      }

      const purpose = "whatsapp_login";
      const channel = "mobile";

      // Check resend cooldown — find latest active OTP for this user
      const existingOtp = await Otp.findOne({
        loginUserId: user._id,
        channel,
        purpose,
        expiresAt: { $gt: new Date() },
      }).sort({ createdAt: -1 });

      if (existingOtp && new Date() < existingOtp.resendAvailableAt) {
        const diff = Math.ceil((existingOtp.resendAvailableAt - new Date()) / 1000);
        return next(
          Object.assign(
            ErrorResponse.requestLimiter(`Please wait ${diff} seconds before requesting another OTP.`),
            { code: "OTP_RESEND_COOLDOWN", resendAvailableAt: existingOtp.resendAvailableAt }
          )
        );
      }

      // Invalidate any previous active login OTPs for this user
      await Otp.updateMany(
        { loginUserId: user._id, channel, purpose, expiresAt: { $gt: new Date() } },
        { $set: { expiresAt: new Date() } }
      );

      // Generate new OTP
      const plainOtp = otpService.generateOtp();
      const otpHash = otpService.hashOtp(plainOtp);

      const validityMinutes = 10;
      const cooldownMinutes = 1;

      const expiresAt = new Date();
      expiresAt.setMinutes(expiresAt.getMinutes() + validityMinutes);

      const resendAvailableAt = new Date();
      resendAvailableAt.setMinutes(resendAvailableAt.getMinutes() + cooldownMinutes);

      // Store OTP record
      await Otp.create({
        loginUserId: user._id,
        channel,
        purpose,
        target: mobile,
        otpHash,
        expiresAt,
        resendAvailableAt,
        attempts: 0,
        maxAttempts: 5,
      });

      // Send OTP via WhatsApp — reuse the exact same service used for Channel Partner OTPs
      const whatsappResult = await whatsappMessageService.sendOtp(mobile, plainOtp);
      if (!whatsappResult) {
        // Clean up the stored OTP so user can retry
        await Otp.updateMany(
          { loginUserId: user._id, channel, purpose, expiresAt: { $gt: new Date() } },
          { $set: { expiresAt: new Date() } }
        );
        return next(ErrorResponse.serviceUnavailable("Failed to send OTP via WhatsApp. Please try again."));
      }

      return {
        data: { otpExpiresAt: expiresAt, resendAvailableAt },
        message: "OTP sent successfully to your WhatsApp number.",
      };
    } catch (error) {
      return next(ErrorResponse.internalServer(error.message));
    }
  }

  /**
   * verifyWhatsappLoginOtp - Verifies the WhatsApp OTP and logs the user in.
   * Returns the same response structure as the normal login method.
   * @param {body(mobile, otp, role)} req - Expects req.body.mobile, req.body.otp, and req.body.role.
   * @param {Object} res - The HTTP response object.
   * @param {Function} next - The next middleware function for error handling.
   */
  async verifyWhatsappLoginOtp(req, res, next) {
    try {
      let { mobile, otp, role } = req.body;

      // Validate inputs
      if (!mobile || !otp || !role) {
        return next(ErrorResponse.badRequest("Mobile number, OTP, and user type are required"));
      }
      const normalizedRole = role.toLowerCase();
      if (!["employee", "advisor"].includes(normalizedRole)) {
        return next(ErrorResponse.badRequest("Invalid user type"));
      }
      mobile = mobile.replace(/[^0-9]/g, "");
      if (mobile.length < 10) {
        return next(ErrorResponse.badRequest("Invalid mobile number"));
      }

      // Look up user by mobile + role
      const result = await this._findUserByMobile(mobile, normalizedRole);
      if (!result) {
        return next(ErrorResponse.unauthorized("Invalid credentials."));
      }

      const { user, profile } = result;

      // Check if the account is active
      if (!profile.isActive) {
        return next(ErrorResponse.forbidden("Your account is inactive. Please contact support."));
      }

      const purpose = "whatsapp_login";
      const channel = "mobile";

      // Find the latest active OTP record for this user
      const otpRecord = await Otp.findOne({
        loginUserId: user._id,
        channel,
        purpose,
        target: mobile,
      }).sort({ createdAt: -1 });

      if (!otpRecord) {
        return next(ErrorResponse.badRequest("No OTP found. Please request a new OTP."));
      }

      // Check expiry
      if (new Date() > otpRecord.expiresAt) {
        return next(ErrorResponse.badRequest("OTP has expired. Please request a new OTP."));
      }

      // Check if already verified
      if (otpRecord.verified) {
        return next(ErrorResponse.badRequest("OTP is already used. Please request a new OTP."));
      }

      // Check attempts
      if (otpRecord.attempts >= otpRecord.maxAttempts) {
        return next(ErrorResponse.badRequest("Maximum OTP attempts exceeded. Please request a new OTP."));
      }

      // Verify hash
      const submittedHash = otpService.hashOtp(String(otp));
      if (submittedHash !== otpRecord.otpHash) {
        otpRecord.attempts += 1;
        await otpRecord.save();
        const remaining = otpRecord.maxAttempts - otpRecord.attempts;
        return next(ErrorResponse.badRequest(`Invalid OTP. ${remaining} attempt(s) remaining.`));
      }

      // Mark OTP as verified and invalidate atomically
      otpRecord.verified = true;
      otpRecord.verifiedAt = new Date();
      otpRecord.expiresAt = new Date(); // Invalidate immediately
      await otpRecord.save();

      // Generate JWT using the same logic as normal login
      const payload = {
        id: user._id,
        referenceId: user.referenceId,
        role: user.role,
        groupId: profile.groupId,
        ownerId: profile.ownerId,
      };

      const token = jwt.sign(payload, process.env.JWT_SECRET, {
        expiresIn: "1h",
      });

      res.cookie("token", token, {
        httpOnly: true,
        maxAge: 1000 * 60 * 60,
        secure: true,
        sameSite: "None",
      });

      payload.token = token;

      return {
        data: {
          ...payload,
          profile,
        },
        message: "Login successful",
      };
    } catch (error) {
      return next(ErrorResponse.internalServer(error.message));
    }
  }

  /**
   * resendWhatsappLoginOtp - Resends a WhatsApp login OTP with cooldown enforcement.
   * @param {body(mobile, role)} req - Expects req.body.mobile and req.body.role.
   * @param {Object} res - The HTTP response object.
   * @param {Function} next - The next middleware function for error handling.
   */
  async resendWhatsappLoginOtp(req, res, next) {
    try {
      let { mobile, role } = req.body;

      if (!mobile || !role) {
        return next(ErrorResponse.badRequest("Mobile number and user type are required"));
      }
      const normalizedRole = role.toLowerCase();
      if (!["employee", "advisor"].includes(normalizedRole)) {
        return next(ErrorResponse.badRequest("Invalid user type"));
      }
      mobile = mobile.replace(/[^0-9]/g, "");
      if (mobile.length < 10) {
        return next(ErrorResponse.badRequest("Invalid mobile number"));
      }

      // Look up user by mobile + role
      const result = await this._findUserByMobile(mobile, normalizedRole);
      if (!result) {
        return next(ErrorResponse.unauthorized("Invalid credentials. Please check your mobile number and user type."));
      }

      const { user, profile } = result;

      // Check if the account is active
      if (!profile.isActive) {
        return next(ErrorResponse.forbidden("Your account is inactive. Please contact support."));
      }

      const purpose = "whatsapp_login";
      const channel = "mobile";

      // Check resend cooldown
      const existingOtp = await Otp.findOne({
        loginUserId: user._id,
        channel,
        purpose,
        expiresAt: { $gt: new Date() },
      }).sort({ createdAt: -1 });

      if (existingOtp && new Date() < existingOtp.resendAvailableAt) {
        const diff = Math.ceil((existingOtp.resendAvailableAt - new Date()) / 1000);
        return next(
          Object.assign(
            ErrorResponse.requestLimiter(`Please wait ${diff} seconds before requesting another OTP.`),
            { code: "OTP_RESEND_COOLDOWN", resendAvailableAt: existingOtp.resendAvailableAt }
          )
        );
      }

      // Invalidate previous OTPs
      await Otp.updateMany(
        { loginUserId: user._id, channel, purpose, expiresAt: { $gt: new Date() } },
        { $set: { expiresAt: new Date() } }
      );

      // Generate and store new OTP
      const plainOtp = otpService.generateOtp();
      const otpHash = otpService.hashOtp(plainOtp);

      const validityMinutes = 10;
      const cooldownMinutes = 1;

      const expiresAt = new Date();
      expiresAt.setMinutes(expiresAt.getMinutes() + validityMinutes);

      const resendAvailableAt = new Date();
      resendAvailableAt.setMinutes(resendAvailableAt.getMinutes() + cooldownMinutes);

      await Otp.create({
        loginUserId: user._id,
        channel,
        purpose,
        target: mobile,
        otpHash,
        expiresAt,
        resendAvailableAt,
        attempts: 0,
        maxAttempts: 5,
      });

      // Send OTP via WhatsApp
      const whatsappResult = await whatsappMessageService.sendOtp(mobile, plainOtp);
      if (!whatsappResult) {
        await Otp.updateMany(
          { loginUserId: user._id, channel, purpose, expiresAt: { $gt: new Date() } },
          { $set: { expiresAt: new Date() } }
        );
        return next(ErrorResponse.serviceUnavailable("Failed to send OTP via WhatsApp. Please try again."));
      }

      return {
        data: { otpExpiresAt: expiresAt, resendAvailableAt },
        message: "OTP resent successfully to your WhatsApp number.",
      };
    } catch (error) {
      return next(ErrorResponse.internalServer(error.message));
    }
  }
}

export default new AuthService();
