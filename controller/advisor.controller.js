import SuccessResponse from "../lib/success.res.js";
import ErrorResponse from "../lib/error.res.js";
import advisorService from "../services/advisor.service.js";
import helperService from "../services/helper.service.js";

/**
 * createAdvisor - Create a new advisor.
 * @param {body(name, email, mobile, photoUrl, companyName, address, altContact, state, city, reportingOfficer, aadharNo, panNo, bankName, accountHolderName, accountNumber, ifscCode, dateOfJoining)} req - The request body.
 * @param {Object} res - The HTTP response object.
 * @param {Function} next - The next middleware function for error handling.    
 */
export const addAdvisor = async (req, res, next) => {
     const requiredFields = [
        "name",
        "mobile",
        "stateName",
        "cityName",
        "email",
        "dateOfJoining",
      ];
      const missingFields = helperService.validateFields(requiredFields, req.body);
    
      if (missingFields.length > 0) {
        const errorMessage = `Missing required fields: ${missingFields.join(", ")}`;
        return next(ErrorResponse.badRequest(errorMessage));
      }
      try {
        const data = await advisorService.addAdvisor(req, res, next);
        if (data && data.data)
          return SuccessResponse.created(res, data.message, data.data);
      } catch (error) {
        return next(ErrorResponse.internalServer(error.message));
      }
} 

/**
 * fetchAllAdvisors - Fetch all advisors created by the current logged in user.
 * @param {Object} req - The HTTP request object.
 * @param {Object} res - The HTTP response object.
 * @param {Function} next - The next middleware function for error handling.
 */
export const fetchAllAdvisors = async (req, res, next) => {
     try {
        const { page = 1, limit = 10 } = req.query;
        const parsedPage = parseInt(page, 10);
        const parsedLimit = parseInt(limit, 10);
    
        if (isNaN(parsedPage) || parsedPage <= 0)
          return next(ErrorResponse.badRequest("Page must be greater than 0."));
    
        if (isNaN(parsedLimit) || parsedLimit <= 0)
          return next(ErrorResponse.badRequest("Limit must be greater than 0."));
        
        const data = await advisorService.fetchAllAdvisors(req, res, next);
        if (data) return SuccessResponse.ok(res, data.message, data.data);
      } catch (error) {
        return next(ErrorResponse.internalServer(error.message));
      }
}

/**
 * fetchSingleAdvisor - Fetches a single advisor on the basis of the advisorId.
 * @param {Object} req - The HTTP request object.
 * @param {Object} res - The HTTP response object.
 * @param {Function} next - The next middleware function for error handling.    
 */
export const fetchSingleAdvisor = async (req, res, next) => {
     try {
        const data = await advisorService.fetchSingleAdvisor(req, res, next);
        if (data) return SuccessResponse.ok(res, data.message, data.data);
      } catch (error) {
        return next(ErrorResponse.internalServer(error.message));
      }
}

/**
 * editAdvisor - Edits an existing advisor.
 * @param {body(name, email, mobile, photoUrl, companyName, address, altContact, state, city, reportingOfficer, aadharNo, panNo, bankName, accountHolderName, accountNumber, ifscCode, dateOfJoining)} req - The request body.
 * @param {Object} res - The HTTP response object.
 * @param {Function} next - The next middleware function for error handling.    
 */
export const editAdvisor = async (req, res, next) => {
      //  const requiredFields = [
      //   "name",
      //   "mobile",
      //   "state",
      //   "city",
      //   "email",
      //   "dateOfJoining",
      // ];
      // const missingFields = helperService.validateFields(requiredFields, req.body);
    
      // if (missingFields.length > 0) {
      //   const errorMessage = `Missing required fields: ${missingFields.join(", ")}`;
      //   return next(ErrorResponse.badRequest(errorMessage));
      // }
      try {
        const data = await advisorService.editAdvisor(req, res, next);
        if (data && data.data)
          return SuccessResponse.created(res, data.message, data.data);
      } catch (error) {
        return next(ErrorResponse.internalServer(error.message));
      }
}

/**
 * getAdvisorsWithoutCredentials - Fetch all advisors name which are created but there login credentials are not set.
 * @param {Object} req - The HTTP request object.
 * @param {Object} res - The HTTP response object.
 * @param {Function} next - The next middleware function for error handling.    
 */
export const getAdvisorsWithoutCredentials = async (req, res, next) => {
   try {
    const data = await advisorService.getAdvisorsWithoutCredentials(req, res, next);
    if (data) return SuccessResponse.ok(res, data.message, data.data);
  } catch (error) {
    return next(ErrorResponse.internalServer(error.message));
  }
}

/**
 * getAdvisorsForDropdown - Fetch all advisors for the dropdown on the basis of the logged in user.
 * @param {Object} req - The HTTP request object.
 * @param {Object} res - The HTTP response object.
 * @param {Function} next - The next middleware function.
 */
export const getAdvisorsForDropdown = async (req, res, next) => {
  try {
    const data = await advisorService.getAdvisorsForDropdown(req, res, next);
    if (data) return SuccessResponse.ok(res, data.message, data.data);
  } catch (error) {
    return next(ErrorResponse.internalServer(error.message));
  }
}