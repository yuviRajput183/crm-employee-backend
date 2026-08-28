import SuccessResponse from "../lib/success.res.js";
import ErrorResponse from "../lib/error.res.js";
import helperService from "../services/helper.service.js";
import LeadStagesService from "../services/leadStages.service.js";

export const saveBankerDetails = async (req, res, next) => {
  const requiredFields = ["stateName", "cityId", "bankerId"];
  const missingFields = helperService.validateFields(requiredFields, req.body);

  if (missingFields.length > 0) {
    return next(ErrorResponse.badRequest(`Missing fields: ${missingFields.join(", ")}`));
  }

  try {
    const data = await LeadStagesService.saveBankerDetails(req);
    return SuccessResponse.ok(res, data.message, data.data);
  } catch (error) {
    return next(ErrorResponse.internalServer(error.message));
  }
};

export const saveConfirmationDetails = async (req, res, next) => {
  const requiredFields = ["confirmationReceived"];
  const missingFields = helperService.validateFields(requiredFields, req.body);

  if (missingFields.length > 0) {
    return next(ErrorResponse.badRequest(`Missing fields: ${missingFields.join(", ")}`));
  }

  try {
    const data = await LeadStagesService.saveConfirmationDetails(req);
    return SuccessResponse.ok(res, data.message, data.data);
  } catch (error) {
    return next(ErrorResponse.internalServer(error.message));
  }
};

export const getLeadStageDetails = async (req, res, next) => {
  try {
    const data = await LeadStagesService.getLeadStageDetails(req);
    return SuccessResponse.ok(res, data.message, data.data);
  } catch (error) {
    return next(ErrorResponse.internalServer(error.message));
  }
};

export const saveCaseReporting = async (req, res, next) => {
  try {
    const requiredFields = ["reportedPayoutPercentageSame", "reportedThrough"];
    const missingFields = helperService.validateFields(requiredFields, req.body);

    if (missingFields.length > 0) {
      return next(ErrorResponse.badRequest(`Missing fields: ${missingFields.join(", ")}`));
    }

    const data = await LeadStagesService.saveCaseReporting(req);
    return SuccessResponse.ok(res, data.message, data.data);
  } catch (error) {
    return next(ErrorResponse.internalServer(error.message));
  }
};

export const uploadCalculationExcel = async (req, res, next) => {
  try {
    if (!req.file) {
      return next(ErrorResponse.badRequest("Please upload an excel file."));
    }
    const data = await LeadStagesService.uploadCalculationExcel(req);
    return SuccessResponse.ok(res, data.message, data.data);
  } catch (error) {
    return next(ErrorResponse.internalServer(error.message));
  }
};

export const saveSPInvoiceStage = async (req, res, next) => {
  try {
    const requiredFields = ["invoiceType", "calculationSameAsReported"];
    const missingFields = helperService.validateFields(requiredFields, req.body);
    if (missingFields.length > 0) {
      return next(ErrorResponse.badRequest(`Missing fields: ${missingFields.join(", ")}`));
    }

    const data = await LeadStagesService.saveSPInvoiceStage(req);
    return SuccessResponse.ok(res, data.message, data.data);
  } catch (error) {
    return next(ErrorResponse.internalServer(error.message));
  }
};
