import SuccessResponse from "../lib/success.res.js";
import ErrorResponse from "../lib/error.res.js";
import helperService from "../services/helper.service.js";
import serviceProviderService from "../services/serviceProvider.service.js";

export const addServiceProvider = async (req, res, next) => {
  const requiredFields = ["legalName", "type"];
  const missingFields = helperService.validateFields(requiredFields, req.body);

  if (missingFields.length > 0) {
    const errorMessage = `Missing required fields: ${missingFields.join(", ")}`;
    return next(ErrorResponse.badRequest(errorMessage));
  }
  try {
    const data = await serviceProviderService.addServiceProvider(req, res, next);
    if (data && data.data)
      return SuccessResponse.created(res, data.message, data.data);
  } catch (error) {
    return next(ErrorResponse.internalServer(error.message));
  }
};

export const getServiceProviders = async (req, res, next) => {
  try {
    const data = await serviceProviderService.getServiceProviders(req, res, next);
    if (data && data.data)
      return SuccessResponse.ok(res, "Service Providers fetched successfully", data.data);
  } catch (error) {
    return next(ErrorResponse.internalServer(error.message));
  }
};

export const getServiceProviderById = async (req, res, next) => {
  try {
    const data = await serviceProviderService.getServiceProviderById(req, res, next);
    if (data && data.data)
      return SuccessResponse.ok(res, "Service Provider fetched successfully by id", data.data);
  } catch (error) {
    return next(ErrorResponse.internalServer(error.message));
  }
};

export const updateServiceProvider = async (req, res, next) => {
  try {
    const data = await serviceProviderService.updateServiceProvider(req, res, next);
    if (data && data.data)
      return SuccessResponse.ok(res, "Service Provider updated successfully", data.data);
  } catch (error) {
    return next(ErrorResponse.internalServer(error.message));
  }
};
