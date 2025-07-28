import ErrorResponse from "../lib/error.res.js";
import Employee from "../models/Employee.model.js";
import Slider from "../models/Slider.model.js";

class SliderService {
  /**
   * addOrUpdateSliders - Add or update sliders images.
   * @param {Object} req - The HTTP request object.
   * @param {Object} res - The HTTP response object.
   * @param {Function} next - The next middleware function for error handling.
   */
    async addOrUpdateSliders(req, res, next) {
        const userId = req.user.referenceId;
        let sliderDoc = await Slider.findOne({
            createdBy: userId
        });

        if (!sliderDoc) {
            // Create new record with available images
            const newData = {
                createdBy: userId
            };
            ["slider1", "slider2", "slider3", "slider4", "slider5"].forEach(
                (field) => {
                    if(req.files[field]) {
                        newData[field] = req.files[field][0].filename;
                    }
                }
            );
            sliderDoc = await Slider.create(newData);
        }
        else {
            // Update only sent fields
            ["slider1", "slider2", "slider3", "slider4", "slider5"].forEach(
                (field) => {
                    if(req.files[field]) {
                        sliderDoc[field] = req.files[field][0].filename;
                    }
                }
            );
            await sliderDoc.save();
        }

        return {
            data: sliderDoc,
            message: "Slider updated successfully",
        }
    }

    // Make a GET request to get all sliders
}

export default new SliderService();
