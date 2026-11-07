import AuthService from "../services/auth.service.js";
import SuccessResponse from "../lib/success.res.js";
import ErrorResponse from "../lib/error.res.js";
import helperService from "../services/helper.service.js";

/**
 * login -  Handles login requests.
 * @param {body(role, loginName, password)} req - Expects req.body.role, req.body.loginName and req.body.password for user authentication.
 * @param {Object} res - The HTTP response object.
 * @param {Function} next - The next middleware function for error handling.
 */
export const login = async (req, res, next) => {
  try {
    const data = await AuthService.login(req, res, next);
    if (data && data.data)
      return SuccessResponse.ok(res, data.message, data.data);
  } catch (error) {
        return next(ErrorResponse.internalServer(errorHandler.message));
  }
}

/**
 * logout - Handles logout requests.
 * @param {Object} req - The HTTP request object.
 * @param {Object} res - The HTTP response object.
 * @param {Function} next - The next middleware function for error handling.
 */
export const logout = async (req, res, next) => {
  try {
    const data = await AuthService.logout(req, res, next);
    SuccessResponse.ok(res, data.message);
  } catch (error) {
        return next(ErrorResponse.internalServer(errorHandler.message));
  }
}

/**
 * resetPassword - Login user can reset their password.
 * @param {body(oldPassword, newPassword, confirmPassword)} req - Expects req.body.oldPassword, req.body.newPassword and req.body.confirmPassword for password reset.
 * @param {Object} res - The HTTP response object.
 * @param {Function} next - The next middleware function for error handling.
 */
export const resetPassword = async (req, res, next) => {
    const requiredFields = [ "loginName", "password"];
    const missingFields = helperService.validateFields(requiredFields, req.body);
  
    if (missingFields.length > 0) {
      const errorMessage = `Missing required fields: ${missingFields.join(", ")}`;
      return next(ErrorResponse.badRequest(errorMessage));
    }
      try {
        const data = await AuthService.resetPassword(req, res, next);
        SuccessResponse.ok(res, data.message);
      } catch (error) {
        return next(ErrorResponse.internalServer(errorHandler.message));
      }
}

/**
 * sendWhatsappLoginOtp - Generates and sends a WhatsApp OTP for passwordless login.
 * @param {body(mobile)} req - Expects req.body.mobile.
 * @param {Object} res - The HTTP response object.
 * @param {Function} next - The next middleware function for error handling.
 */
export const sendWhatsappLoginOtp = async (req, res, next) => {
  try {
    const data = await AuthService.sendWhatsappLoginOtp(req, res, next);
    if (data && data.data)
      return SuccessResponse.ok(res, data.message, data.data);
  } catch (error) {
    return next(ErrorResponse.internalServer(error.message));
  }
};

/**
 * verifyWhatsappLoginOtp - Verifies a WhatsApp OTP and authenticates the user.
 * Returns the same response structure as the normal login endpoint.
 * @param {body(mobile, otp)} req - Expects req.body.mobile and req.body.otp.
 * @param {Object} res - The HTTP response object.
 * @param {Function} next - The next middleware function for error handling.
 */
export const verifyWhatsappLoginOtp = async (req, res, next) => {
  try {
    const data = await AuthService.verifyWhatsappLoginOtp(req, res, next);
    if (data && data.data)
      return SuccessResponse.ok(res, data.message, data.data);
  } catch (error) {
    return next(ErrorResponse.internalServer(error.message));
  }
};

/**
 * resendWhatsappLoginOtp - Resends a WhatsApp login OTP with cooldown enforcement.
 * @param {body(mobile)} req - Expects req.body.mobile.
 * @param {Object} res - The HTTP response object.
 * @param {Function} next - The next middleware function for error handling.
 */
export const resendWhatsappLoginOtp = async (req, res, next) => {
  try {
    const data = await AuthService.resendWhatsappLoginOtp(req, res, next);
    if (data && data.data)
      return SuccessResponse.ok(res, data.message, data.data);
  } catch (error) {
    return next(ErrorResponse.internalServer(error.message));
  }
};