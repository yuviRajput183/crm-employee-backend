import mongoose from "mongoose";
import ErrorResponse from "../lib/error.res.js";
import Advisor from "../models/Advisor.model.js";
import Employee from "../models/Employee.model.js";
import User from "../models/User.model.js";

class UserService {
  /**
   * setEmployeeLoginCredentials - Set employee login credentials.
   * @param {Object} req - The HTTP request object.
   * @param {Object} res - The HTTP response object.
   * @param {Function} next - The next middleware function for error handling.
   */
  async setEmployeeLoginCredentials(req, res, next) {
    const { employeeId, loginName, password } = req.body;

    const employee = await Employee.findOne({ _id: employeeId });
    if (!employee) {
      return next(ErrorResponse.notFound("Employee not found"));
    }

    if (!employee.isActive || employee.dateOfResign) {
      return next(
        ErrorResponse.forbidden("Cannot set credentials for inactive employee")
      );
    }

    // Check if credentials already set
    const existingUser = await User.findOne({ referenceId: employee._id });
    if (existingUser) {
      return next(
        ErrorResponse.badRequest("Credentials already set for this employee")
      );
    }

    // Check if loginName is already exists gobally
    const loginNameExists = await User.findOne({ loginName });
    if (loginNameExists) {
      return next(ErrorResponse.badRequest("Login name already taken"));
    }

    // const hashedPassword = await bcrypt.hash(password, 10);

    const user = new User({
      loginName,
      password,
      role: "employee",
      referenceId: employee._id,
      createdBy: req.user.referenceId,
    });

    await user.save();

    employee.isCredential = true;
    await employee.save();

    return {
      data: user,
      message: "Employee login credentials set successfully",
    };
  }

  /**
   * getEmployeeCredentials - Admin(E1) can fetch all employee credentials in the group whereas normal admin can only fetch credentials of employees created by him.
   * @param {Object} req - The HTTP request object.
   * @param {Object} res - The HTTP response object.
   * @param {Function} next - The next middleware function for error handling.
   */
  async getEmployeeLoginCredentials(req, res, next) {
    const currentUserId = req.user.referenceId;
    const currentEmployee = await Employee.findById(currentUserId);
    if (!currentEmployee) {
      return next(ErrorResponse.notFound("Employee not found"));
    }

    let users;

    if (currentEmployee.isOwner) {
      // E1 -> fetch all employees credential in the group
      const employeesInGroup = await Employee.find({
        groupId: currentEmployee.groupId,
      }).select("_id");
      const employeesId = employeesInGroup.map((emp) => emp._id);
      users = await User.find({
        role: "employee",
        referenceId: { $in: employeesId },
      }).populate({
        path: "referenceId",
        model: "Employee",
        select: "name",
      });
    } else {
      // Normal admin => only see credentials of employees created by him
      users = await User.find({
        role: "employee",
        createdBy: currentUserId,
      }).populate({
        path: "referenceId",
        model: "Employee",
        select: "name",
      });
    }

    if (!users || users.length === 0) {
      return {
        data: [],
        message: "No employee credentials found",
      };
    }

    return {
      data: users,
      message: "Employee login credentials fetched successfully",
    };
  }

  /**
   * setAdvisorLoginCredentials - Set advisor login credentials.
   * @param {Object} req - The HTTP request object.
   * @param {Object} res - The HTTP response object.
   * @param {Function} next - The next middleware function for error handling.
   */
  async setAdvisorLoginCredentials(req, res, next) {
    const { advisorId, loginName, password } = req.body;

    const advisor = await Advisor.findOne({ _id: advisorId });
    if (!advisor) {
      return next(ErrorResponse.notFound("Advisor not found"));
    }

    if (!advisor.isActive || advisor.dateOfResign) {
      return next(
        ErrorResponse.forbidden("Cannot set credentials for inactive advisor")
      );
    }

    const existingUser = await User.findOne({ referenceId: advisor._id });
    if (existingUser) {
      return next(
        ErrorResponse.badRequest("Credentials already set for this advisor")
      );
    }

    const loginNameExists = await User.findOne({ loginName });
    if (loginNameExists) {
      return next(ErrorResponse.badRequest("Login name already taken"));
    }

    // const hashedPassword = await bcrypt.hash(password, 10);

    const user = new User({
      loginName,
      password,
      role: "advisor",
      referenceId: advisor._id,
      createdBy: req.user.referenceId,
    });

    await user.save();

    advisor.isCredential = true;
    await advisor.save();

    return {
      data: user,
      message: "Advisor login credentials set successfully",
    };
  }

  /**
   * getAdvisorLoginCredentials - Admin(E1) can fetch all advisor credentials in the group whereas normal admin can only fetch credentials of advisors created by him.
   * @param {Object} req - The HTTP request object.
   * @param {Object} res - The HTTP response object.
   * @param {Function} next - The next middleware function for error handling.
   */
  async getAdvisorLoginCredentials(req, res, next) {
    const currentUserId = req.user.referenceId;

    const currentEmployee = await Employee.findById(currentUserId);
    if (!currentEmployee) {
      return next(ErrorResponse.notFound("Employee not found"));
    }

    let users;
    if (currentEmployee.isOwner) {
      // Super Admin (E1) - all advisors in their group
      const advisorsInGroup = await Advisor.find({
        groupId: currentEmployee.groupId,
      }).select("_id");

      const advisorIds = advisorsInGroup.map((a) => a._id);

      users = await User.find({
        role: "advisor",
        referenceId: { $in: advisorIds },
      }).populate({
        path: "referenceId",
        model: "Advisor",
        select: "name",
      });
    } else {
      // Normal admin - only advisors created by them
      users = await User.find({
        role: "advisor",
        createdBy: currentUserId,
      }).populate({
        path: "referenceId",
        model: "Advisor",
        select: "name",
      });
    }

    if (!users || users.length === 0) {
      return {
        data: [],
        message: "No advisor credentials found",
      };
    }

    return {
      data: users,
      message: "Advisor login credentials fetched successfully",
    };
  }

  /**
   * updateLoginCredentials - Update login credentials of a user.
   * @param {Object} req - The HTTP request object.
   * @param {Object} res - The HTTP response object.
   * @param {Function} next - The next middleware function for error handling.
   */
  async updateLoginCredentials(req, res, next) {
    const { loginName, password, userId } = req.body;
    const currentUserId = req.user.referenceId;

    const currentEmployee = await Employee.findById(currentUserId);
    if (!currentEmployee) {
      return next(ErrorResponse.notFound("Employee not found"));
    }

    const user = await User.findById(userId);
    if (!user) {
      return next(ErrorResponse.notFound("User not found"));
    }

    const roleCapitalized =
      user.role.charAt(0).toUpperCase() + user.role.slice(1).toLowerCase();
    const Reference = mongoose.model(roleCapitalized);
    const refDoc = await Reference.findById(user.referenceId);

    if (currentEmployee.isOwner) {
      if (
        !refDoc ||
        refDoc.groupId.toString() !== currentEmployee.groupId.toString()
      ) {
        return next(
          ErrorResponse.forbidden("You are not authorized to update this user")
        );
      }
    } else {
      if (user.createdBy?.toString() !== currentUserId.toString()) {
        return next(
          ErrorResponse.forbidden("You are not authorized to update this user")
        );
      }
    }

    if (loginName && loginName !== user.loginName) {
      const existingUser = await User.findOne({
        loginName: { $regex: new RegExp(`^${loginName}$`, "i") },
      });
      if (existingUser) {
        return next(ErrorResponse.badRequest("Login name already exists"));
      }
      user.loginName = loginName;
    }

    if (password) {
      user.password = password;
    }

    await user.save();

    return {
      data: user,
      message: "Login credentials updated successfully",
    };
  }
}

export default new UserService();
