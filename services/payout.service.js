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
}

export default new PayoutService();
