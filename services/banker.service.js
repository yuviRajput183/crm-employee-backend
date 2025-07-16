import ErrorResponse from "../lib/error.res.js";
import Bank from "../models/Bank.model.js";
import Banker from "../models/banker.model.js";
import City from "../models/City.model.js";
import Employee from "../models/Employee.model.js";

class BankerService {
  /**
   * addBanker - Add new Banker.
   * @param {body(role, loginName, password)} req - Expects req.body.role, req.body.loginName and req.body.password for user authentication.
   * @param {Object} res - The HTTP response object.
   * @param {Function} next - The next middleware function for error handling.
   */
  async addBanker(req, res, next) {
    const {
      product,
      stateName,
      cityId,
      bankId,
      bankerName,
      designation,
      mobile,
      email,
    } = req.body;

    const currentUserId = req.user.referenceId;

    const currentUser = await Employee.findById(currentUserId);
    if (!currentUser) {
      return next(ErrorResponse.notFound("Employee not found"));
    }

    const city = await City.findOne({
      _id: cityId,
      createdBy: currentUser.groupId,
    });
    if (!city) {
      return next(ErrorResponse.notFound("City not found or access denied"));
    }

    const bank = await Bank.findOne({
      _id: bankId,
      createdBy: currentUser.groupId,
    });
    if (!bank) {
      return next(ErrorResponse.notFound("Bank not found or access denied"));
    }

    const query = {
      product: { $regex: `^${product.trim()}$`, $options: "i" },
      stateName: { $regex: `^${stateName.trim()}$`, $options: "i" },
      city: cityId,
      bank: bankId,
      bankerName: { $regex: `^${bankerName.trim()}$`, $options: "i" },
      designation: { $regex: `^${designation.trim()}$`, $options: "i" },
      mobile: mobile.trim(),
    };
    if (email) {
      query.email = { $regex: `^${email.trim()}$`, $options: "i" };
    }

    const existingBanker = await Banker.findOne(query);
    if (existingBanker) {
      return next(
        ErrorResponse.badRequest("Banker with these details already exists")
      );
    }

    const banker = await Banker.create({
      product: product.trim(),
      stateName: stateName.trim(),
      city: cityId,
      bank: bankId,
      bankerName: bankerName.trim(),
      designation: designation.trim(),
      mobile: mobile.trim(),
      email: email ? email.trim() : null,
      createdBy: currentUser._id,
      groupId: currentUser.groupId,
    });

    return {
      data: banker,
      message: "Banker added successfully",
    };
  }

  /**
   * listBankers - List all Bankers.
   * @param {Object} req - The HTTP request object.
   * @param {Object} res - The HTTP response object.
   * @param {Function} next - The next middleware function for error handling.
   */
  async listBankers(req, res, next) {
    const userId = req.user.referenceId;

    const currentUser = await Employee.findById(userId);
    if (!currentUser) {
      return next(ErrorResponse.notFound("Logged-in employee not found"));
    }

    const bankers = await Banker.find({
      groupId: currentUser.groupId,
    })
      .populate("city", "cityName stateName")
      .populate("bank", "name")
      .sort({ createdAt: -1 });

    return {
      data: bankers,
      message: "Bankers fetched successfully",
    };
  }

  /**
   * editBanker - Edit existing Banker.
   * @param {body(product, stateName, cityId, bankId, bankerName, designation, mobile, email)} req - Expects req.body.product, req.body.stateName, req.body.cityId, req.body.bankId, req.body.bankerName, req.body.designation, req.body.mobile, req.body.email for Banker details.
   * @param {Object} res - The HTTP response object.
   * @param {Function} next - The next middleware function for error handling.
   */
  async editBanker(req, res, next) {
    const {
      product,
      stateName,
      cityId,
      bankId,
      bankerName,
      designation,
      mobile,
      email,
    } = req.body;

    const bankerId = req.params.bankerId;

    const currentUserId = req.user.referenceId;

    const currentUser = await Employee.findById(currentUserId);
    if (!currentUser) {
      return next(ErrorResponse.notFound("Employee not found"));
    }

    const banker = await Banker.findById(bankerId);
    if (!banker) {
      return next(ErrorResponse.notFound("Banker not found"));
    }

    // Check if Banker belongs to same group
    if (banker.groupId.toString() !== currentUser.groupId.toString()) {
      return next(
        ErrorResponse.forbidden("You are not authorized to edit this banker")
      );
    }

    const city = await City.findById(cityId);
    if (!city) {
      return next(ErrorResponse.notFound("City not found"));
    }

    const bank = await Bank.findById(bankId);
    if (!bank) {
      return next(ErrorResponse.notFound("Bank not found"));
    }

    // Check for exact duplicate (excluding current banker)
    const existingBanker = await Banker.findOne({
      _id: { $ne: bankerId },
      product: product.trim(),
      stateName: stateName.trim(),
      city: cityId,
      bank: bankId,
      bankerName: bankerName.trim(),
      designation: designation.trim(),
      mobile: mobile.trim(),
      email: email ? email.trim() : null,
    });

    if (existingBanker) {
      return next(
        ErrorResponse.badRequest(
          "Another banker with these details already exists"
        )
      );
    }

    // Update banker details
    banker.product = product.trim();
    banker.stateName = stateName.trim();
    banker.city = cityId;
    banker.bank = bankId;
    banker.bankerName = bankerName.trim();
    banker.designation = designation.trim();
    banker.mobile = mobile.trim();
    banker.email = email ? email.trim() : null;

    await banker.save();

    return {
      data: banker,
      message: "Banker details updated successfully",
    };
  }
}

export default new BankerService();
