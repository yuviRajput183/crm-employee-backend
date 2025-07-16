import SuccessResponse from "../lib/success.res.js";
import ErrorResponse from "../lib/error.res.js";
import helperService from "../services/helper.service.js";
import processedByService from "../services/processedBy.service.js";

export const addProcessedBy = async (req, res, next) => {
  const requiredFields = ["processedBy"];
  const missingFields = helperService.validateFields(requiredFields, req.body);

  if (missingFields.length > 0) {
    return next(
      ErrorResponse.badRequest(`Missing fields: ${missingFields.join(", ")}`)
    );
  }

  try {
    const data = await processedByService.addProcessedBy(req, res, next);
    if (data && data.data)
      return SuccessResponse.created(res, data.message, data.data);
  } catch (error) {
    return next(ErrorResponse.internalServer(error.message));
  }
};

export const listProcessedBy = async (req, res, next) => {
  try {
    const data = await processedByService.listProcessedBy(req, res, next);
    if (data && data.data)
      return SuccessResponse.ok(res, data.message, data.data);
  } catch (error) {
    return next(ErrorResponse.internalServer(error.message));
  }
};

export const editProcessedBy = async (req, res, next) => {
  const requiredFields = ["processedById", "processedBy"];
  const missingFields = helperService.validateFields(requiredFields, req.body);

  if (missingFields.length > 0) {
    return next(
      ErrorResponse.badRequest(`Missing fields: ${missingFields.join(", ")}`)
    );
  }
  try {
    const data = await processedByService.editProcessedBy(req, res, next);
    if (data && data.data)
      return SuccessResponse.ok(res, data.message, data.data);
  } catch (error) {
    return next(ErrorResponse.internalServer(error.message));
  }
};
