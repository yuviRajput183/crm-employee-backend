import SuccessResponse from "../lib/success.res.js";
import ErrorResponse from "../lib/error.res.js";
import payoutService from "../services/payout.service.js";

export const addPayoutFile = async (req, res, next) => {
  try {
    if (!req.file) {
      return next(ErrorResponse.badRequest("Payout file is required"));
    }
    const data = await payoutService.addPayoutFile(req, res, next);
    if (data && data.data)
      return SuccessResponse.created(res, data.message, data.data);
  } catch (error) {
    return next(ErrorResponse.internalServer(error.message));
  }
};

export const getAllPayoutFiles = async (req, res, next) => {
  try {
    const data = await payoutService.getAllPayoutFiles(req, res, next);
    if (data && data.data)
      return SuccessResponse.ok(res, data.message, data.data);
  } catch (error) {
    return next(ErrorResponse.internalServer(error.message));
  }
};

export const downloadPayoutFile = async (req, res, next) => {
  try {
    const data = await payoutService.downloadPayoutFile(req, res, next);
    if (data && data.filePath) {
      res.download(data.filePath, data.fileName);
    }
  } catch (error) {
    return next(ErrorResponse.internalServer(error.message));
  }
};
