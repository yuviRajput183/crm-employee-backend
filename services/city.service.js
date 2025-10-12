import xlsx from "xlsx";
import ErrorResponse from "../lib/error.res.js";
import City from "../models/City.model.js";
import Employee from "../models/Employee.model.js";
import fs from "fs";

class CityService {
  /**
   * addCity - Add a new city in a state.
   * @param {Object} req - The HTTP request object.
   * @param {Object} res - The HTTP response object.
   * @param {Function} next - The next middleware function.
   */
  async addCity(req, res, next) {
    const { stateName, cityName } = req.body;
    const createdBy = req.user.referenceId;

    if (!stateName.trim() || !cityName.trim()) {
      return next(
        ErrorResponse.badRequest("State name and City name are required")
      );
    }

    const cleanStateName = stateName.trim();
    const cleanCityName = cityName.trim();

    // Check if city with same name (case-insensitive) exists in the state
    const exist = await City.findOne({
      stateName: { $regex: `^${cleanStateName}$`, $options: "i" },
      cityName: { $regex: `^${cleanCityName}$`, $options: "i" },
    });
    if (exist) {
      return next(
        ErrorResponse.badRequest("City already exists in this state")
      );
    }

    const city = await City.create({
      stateName: cleanStateName,
      cityName: cleanCityName,
      createdBy,
    });

    return {
      data: city,
      message: "City added successfully",
    };
  }

  async addCitiesFromExcel(req, res, next) {
    const createdBy = req.user.referenceId;

    const filePath = req.file.path;
    const workbook = xlsx.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const sheetData = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName]);

    let addedCities = [];

    for (const row of sheetData) {
      const { stateName, cityName } = row;

      const cleanStateName = stateName.trim();
      const cleanCityName = cityName.trim();

      const exists = await City.findOne({
        stateName: { $regex: `^${cleanStateName}$`, $options: "i" },
        cityName: { $regex: `^${cleanCityName}$`, $options: "i" },
      });

      if (!exists) {
        const city = new City({
          stateName: cleanStateName,
          cityName: cleanCityName,
          createdBy,
        });
        await city.save();
        addedCities.push(city);
      }
    }

    fs.unlinkSync(filePath);

    return {
      data: addedCities,
      message: "Cities added successfully",
    };
  }

  /**
   * listCities - List all states and cities which are created by the owner of the group.
   * @param {Object} req - The HTTP request object.
   * @param {Object} res - The HTTP response object.
   * @param {Function} next - The next middleware function.
   */
  async listCities(req, res, next) {
    const userId = req.user.referenceId;

    const currentUser = await Employee.findById(userId).select("groupId");
    if (!currentUser) {
      return next(ErrorResponse.notFound("Logged-in user not found"));
    }

    if (!currentUser.groupId) {
      return next(ErrorResponse.badRequest("Group ID not found for this user"));
    }

    const cities = await City.find({
      createdBy: currentUser.groupId,
    }).sort({
      stateName: 1,
      cityName: 1,
    });
    return {
      data: cities,
      message: "Cities fetched successfully",
    };
  }

  /**
   * getCitiesByStateName - List all cities in a state.
   * @param {Object} req - The HTTP request object.
   * @param {Object} res - The HTTP response object.
   * @param {Function} next - The next middleware function.
   */
  async getCitiesByStateName(req, res, next) {
    const { stateName } = req.query;
    const userId = req.user.referenceId;

    const currentUser = await Employee.findById(userId).select("groupId");
    if (!currentUser) {
      return next(ErrorResponse.notFound("Logged-in user not found"));
    }

    const cities = await City.find({
      createdBy: currentUser.groupId,
      stateName: stateName,
    }).sort({ cityName: 1 });

    return {
      data: cities,
      message: `Cities for state '${stateName}' fetched successfully`,
    };
  }

  /**
   * editCity - Edit a city in a state.
   * @param {Object} req - The HTTP request object.
   * @param {Object} res - The HTTP response object.
   * @param {Function} next - The next middleware function.
   */
  async editCity(req, res, next) {
    const { cityId, cityName, stateName } = req.body;
    const currentUserId = req.user.referenceId;

    const currentUser = await Employee.findById(currentUserId);
    if (!currentUser) {
      return next(ErrorResponse.notFound("Employee not found"));
    }

    const city = await City.findById(cityId);
    if (!city) {
      return next(ErrorResponse.notFound("City not found"));
    }

    if (city.createdBy.toString() !== currentUserId.toString()) {
      return next(
        ErrorResponse.forbidden("You are not authorized to edit this city")
      );
    }

    // Check for duplicate city with same state (case-insensitive)
    const existing = await City.findOne({
      stateName: { $regex: `^${stateName}$`, $options: "i" },
      cityName: { $regex: `^${cityName}$`, $options: "i" },
    });

    if (existing && existing._id.toString() !== cityId.toString()) {
      return next(
        ErrorResponse.badRequest("Another city with this name already exists")
      );
    }
    // city.stateName = stateName;
    city.cityName = cityName;
    await city.save();
    return {
      data: city,
      message: "City name updated successfully",
    };
  }
}

export default new CityService();
