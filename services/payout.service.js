import ErrorResponse from "../lib/error.res.js";
import Employee from "../models/Employee.model.js";
import Payout from "../models/Payout.model.js";

class PayoutService {
  /**
   * addPayoutFile - Add payout file to the database and multer stores it into storage.
   * @param {Object} req - The HTTP request object.
   * @param {Object} res - The HTTP response object.
   * @param {Function} next - The next middleware function for error handling.
   */
  async addPayoutFile(req, res, next) {
    const userId = req.user.referenceId;
    const currentUser = await Employee.findById(userId);
    if (!currentUser) {
      return next(ErrorResponse.notFound("Employee not found"));
    }

    if (!req.file) {
      return next(ErrorResponse.badRequest("Payout file is required"));
    }

    const payoutFile = await Payout.create({
      fileName: req.file.originalname,
      filePath: req.file.path,
      uploadedBy: currentUser.groupId,
    });

    return {
      data: payoutFile,
      message: "Payout file added successfully",
    };
  }

  /**
   * getAllPayoutFiles - Get all payout files.
   * @param {Object} req - The HTTP request object.
   * @param {Object} res - The HTTP response object.
   * @param {Function} next - The next middleware function for error handling.
   */
  async getAllPayoutFiles(req, res, next) {
    // Assuming admin sees all, or filter by groupId if needed. 
    // The previous code suggests filtering by uploadedBy (groupId) might be relevant, 
    // but the request is generic. Let's return all for now or filter by user's group if logical.
    // Given it's "admin route" usually, maybe all?
    // Let's stick to simple find() for now.
    
    // const userId = req.user.referenceId;
    // const currentUser = await Employee.findById(userId);
    // if (!currentUser) {
    //   return next(ErrorResponse.notFound("Employee not found"));
    // }

    const payoutFiles = await Payout.find({})
      .populate("uploadedBy", "name")
      .sort({ createdAt: -1 });

    return {
      data: payoutFiles,
      message: "Payout files retrieved successfully",
    };
  }

  /**
   * downloadPayoutFile - Download a payout file.
   * @param {Object} req - The HTTP request object.
   * @param {Object} res - The HTTP response object.
   * @param {Function} next - The next middleware function for error handling.
   */
  async downloadPayoutFile(req, res, next) {
    const { payoutId } = req.params;
    const payoutFile = await Payout.findById(payoutId);

    if (!payoutFile) {
      return next(ErrorResponse.notFound("Payout file not found"));
    }

    return {
      filePath: payoutFile.filePath,
      fileName: payoutFile.fileName
    };
  }
}

export default new PayoutService();
