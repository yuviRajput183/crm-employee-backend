import ErrorResponse from "../lib/error.res.js";
import Advisor from "../models/Advisor.model.js";
import Employee from "../models/Employee.model.js";
import User from "../models/User.model.js";
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
        expiresIn: "7d",
      });
      res.cookie("token", token, {
        httpOnly: true,
        maxAge: 1000 * 60 * 60 * 24 * 7,
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
}

export default new AuthService();
