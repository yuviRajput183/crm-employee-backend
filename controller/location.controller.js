import SuccessResponse from "../lib/success.res.js";
import ErrorResponse from "../lib/error.res.js";
import helperService from "../services/helper.service.js";
import locationService from "../services/location.service.js";

export const addLocation = async (req, res, next) => {
  const requiredFields = [];
  const missingFields = helperService.validateFields(requiredFields, req.body);

  if (missingFields.length > 0) {
    const errorMessage = `Missing required fields: ${missingFields.join(", ")}`;
    return next(ErrorResponse.badRequest(errorMessage));
  }
  try {
    const data = await locationService.addLocation(req, res, next);
    if (data && data.data)
      return SuccessResponse.created(res, data.message, data.data);
  } catch (error) {
    return next(ErrorResponse.internalServer(error.message));
  }
};

export const getLocations = async (req, res, next) => {
  try {
    const data = await locationService.getLocations(req, res, next);
    if (data && data.data)
      return SuccessResponse.ok(res, "Locations fetched successfully", data.data);
  } catch (error) {
    return next(ErrorResponse.internalServer(error.message));
  }
};

export const getSingleLocationById = async (req, res, next) => {
  try {
    const data = await locationService.getLocationById(req, res, next);
    if (data && data.data)
      return SuccessResponse.ok(res, "Location fetched successfully by id", data.data);
  } catch (error) {
    return next(ErrorResponse.internalServer(error.message));
  }
};

export const updateLocation = async (req, res, next) => {
  try {
    const data = await locationService.updateLocation(req, res, next);
    if (data && data.data)
      return SuccessResponse.ok(res, "Location updated successfully", data.data);
  } catch (error) {
    return next(ErrorResponse.internalServer(error.message));
  }
};
