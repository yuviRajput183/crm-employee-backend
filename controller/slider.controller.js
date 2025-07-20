import SuccessResponse from "../lib/success.res.js";
import ErrorResponse from "../lib/error.res.js";
import sliderService from "../services/slider.service.js";

/**
 * addSlider - Add or update sliders images.
 * @param {Object} req - The HTTP request object.
 * @param {Object} res - The HTTP response object.
 * @param {Function} next - The next middleware function for error handling.
 */
export const addOrUpdateSliders = async (req, res, next) => {
  try {
    if (!req.files) {
      return next(ErrorResponse.badRequest("Slider images are required"));
    }
    const data = await sliderService.addOrUpdateSliders(req, res, next);
    if (data && data.data)
      return SuccessResponse.created(res, data.message, data.data);
  } catch (error) {
    return next(ErrorResponse.internalServer(error.message));
  }
};
