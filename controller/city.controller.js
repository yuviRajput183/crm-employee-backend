import SuccessResponse from "../lib/success.res.js";
import ErrorResponse from "../lib/error.res.js";
import helperService from "../services/helper.service.js";
import CityService from "../services/city.service.js";

/**
 * addCity - Add a new city in a state.
 * @param {Object} req - The HTTP request object.
 * @param {Object} res - The HTTP response object.
 * @param {Function} next - The next middleware function.
 */
export const addCity = async (req, res, next) => {
  const requiredFields = ["stateName", "cityName"];
  const missingFields = helperService.validateFields(requiredFields, req.body);

  if (missingFields.length > 0) {
    const errorMessage = `Missing required fields: ${missingFields.join(", ")}`;
    return next(ErrorResponse.badRequest(errorMessage));
  }
  try {
    const data = await CityService.addCity(req, res, next);
    if (data && data.data)
      return SuccessResponse.created(res, data.message, data.data);
  } catch (error) {
    return next(ErrorResponse.internalServer(error.message));
  }
};

/**
 * listCities - List all states and cities which are created by the owner of the group.
 * @param {Object} req - The HTTP request object.
 * @param {Object} res - The HTTP response object.
 * @param {Function} next - The next middleware function.
 */
export const listCities = async (req, res, next) => {
  try {
    const data = await CityService.listCities(req, res, next);
    if (data && data.data)
      return SuccessResponse.ok(res, data.message, data.data);
  } catch (error) {
    return next(ErrorResponse.internalServer(error.message));
  }
}

/**
 * getCitiesByStateName - List all cities in a state.
 * @param {Object} req - The HTTP request object.
 * @param {Object} res - The HTTP response object.
 * @param {Function} next - The next middleware function.  
 */
export const getCitiesByStateName = async (req, res, next) => {
  const requiredFields = ["stateName"];
  const missingFields = helperService.validateFields(requiredFields, req.query);

  if (missingFields.length > 0) {
    const errorMessage = `Missing required fields: ${missingFields.join(", ")}`;
    return next(ErrorResponse.badRequest(errorMessage));
  }
  try {
    const data = await CityService.getCitiesByStateName(req, res, next);
    if (data && data.data)
      return SuccessResponse.ok(res, data.message, data.data);
  } catch (error) {
    return next(ErrorResponse.internalServer(error.message));
  }
}

/**
 * editCity - Edit a city in a state.
 * @param {Object} req - The HTTP request object.
 * @param {Object} res - The HTTP response object.
 * @param {Function} next - The next middleware function.  
 */
export const editCity = async (req, res, next) => {
  const requiredFields = ["cityId", "cityName", "stateName"];
  const missingFields = helperService.validateFields(requiredFields, req.body);

  if (missingFields.length > 0) {
    const errorMessage = `Missing required fields: ${missingFields.join(", ")}`;
    return next(ErrorResponse.badRequest(errorMessage));
  }
  try {
    const data = await CityService.editCity(req, res, next);
    if (data && data.data)
      return SuccessResponse.ok(res, data.message, data.data);
  } catch (error) {
    return next(ErrorResponse.internalServer(error.message));
  }
};