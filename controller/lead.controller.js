import SuccessResponse from "../lib/success.res.js";
import ErrorResponse from "../lib/error.res.js";
import leadService from "../services/lead.service.js";
import helperService from "../services/helper.service.js";

/**
 * addLead - Add a new lead. Admin or Super admin send the employeeId in allocatedTo field. If the logged in user is employee, allocatedTo field is set to the id of logged in employee.
 * @param {body(productType, loanRequirementAmount, clientName, mobileNo, emailId, dob, panNo, aadharNo, maritalStatus, spouseName, motherName, otherContactNo, qualification, residenceType, residentialAddress, residentialAddressTakenFrom, residentialStability, stateName, cityName, pinCode, companyName, designation, companyAddress, netSalary, salaryTransferMode, jobPeriod, totalJobExperience, officialEmailId, officialNumber, noOfDependent, creditCardOutstandingAmount, runningLoans, references, documents, history, password, allocatedTo)} req - The request body.
 * @param {Object} res - The HTTP response object.
 * @param {Function} next - The next middleware function for error handling.
 */
export const addLead = async (req, res, next) => {
  const requiredFields = [
    "clientName",
    "mobileNo",
    "advisorId",
    "productType",
  ];
  const missingFields = helperService.validateFields(requiredFields, req.body);

  if (missingFields.length > 0) {
    const errorMessage = `Missing required fields: ${missingFields.join(", ")}`;
    return next(ErrorResponse.badRequest(errorMessage));
  }
  try {
    const data = await leadService.addLead(req, res, next);
    if (data && data.data)
      return SuccessResponse.created(res, data.message, data.data);
  } catch (error) {
    return next(ErrorResponse.internalServer(error.message));
  }
};

export const getAllLeads = async (req, res, next) => {
  try {
    const data = await leadService.getAllLeads(req, res, next);
    if (data && data.data)
      return SuccessResponse.ok(res, data.message, data.data);
  } catch (error) {
    return next(ErrorResponse.internalServer(error.message));
  }
};

/**
 * getAllNewLeads - Super admin and admin can fetch all new leads and their stats.
 * @param {Object} req - The HTTP request object.
 * @param {Object} res - The HTTP response object.
 * @param {Function} next - The next middleware function for error handling.
 */
export const getAllNewLeads = async (req, res, next) => {
  try {
    const data = await leadService.getAllNewLeads(req, res, next);
    if (data && data.data)
      return SuccessResponse.ok(res, data.message, data.data);
  } catch (error) {
    return next(ErrorResponse.internalServer(error.message));
  }
};

/**
 * getSignleLead - Fetch a single lead on the basis of the leadId.
 * @param {Object} req - The HTTP request object.
 * @param {Object} res - The HTTP response object.
 * @param {Function} next - The next middleware function for error handling.
 */
export const getSignleLead = async (req, res, next) => {
  try {
    const data = await leadService.getSignleLead(req, res, next);
    if (data && data.data)
      return SuccessResponse.ok(res, data.message, data.data);
  } catch (error) {
    return next(ErrorResponse.internalServer(error.message));
  }
};

/**
 * editAdvisor - Edit an advisor assigned to the lead.
 * @param {body(advisorId)} req - The request body.
 * @param {Object} res - The HTTP response object.
 * @param {Function} next - The next middleware function for error handling.
 */
export const editLeadAdvisor = async (req, res, next) => {
  const requiredFields = ["advisorId"];
  const missingFields = helperService.validateFields(requiredFields, req.body);

  if (missingFields.length > 0) {
    const errorMessage = `Missing required fields: ${missingFields.join(", ")}`;
    return next(ErrorResponse.badRequest(errorMessage));
  }
  try {
    const data = await leadService.editLeadAdvisor(req, res, next);
    if (data && data.data)
      return SuccessResponse.ok(res, data.message, data.data);
  } catch (error) {
    return next(ErrorResponse.internalServer(error.message));
  }
};

/**
 * editLead - Edit a lead.
 * @param {body(productType, loanRequirementAmount, clientName, mobileNo, emailId, dob, panNo, aadharNo, maritalStatus, spouseName, motherName, otherContactNo, qualification, residenceType, residentialAddress, residentialAddressTakenFrom, residentialStability, stateName, cityName, pinCode, companyName, designation, companyAddress, netSalary, salaryTransferMode, jobPeriod, totalJobExperience, officialEmailId, officialNumber, noOfDependent, creditCardOutstandingAmount, runningLoans, references, documents, history, password, allocatedTo)} req - The request body.
 * @param {Object} res - The HTTP response object.
 * @param {Function} next - The next middleware function for error handling.
 */
export const editNewLead = async (req, res, next) => {
  const requiredFields = [
    "clientName",
    "mobileNo",
    "advisorId",
    "productType",
    "pinCode",
    "emailId",
  ];
  const missingFields = helperService.validateFields(requiredFields, req.body);

  if (missingFields.length > 0) {
    const errorMessage = `Missing required fields: ${missingFields.join(", ")}`;
    return next(ErrorResponse.badRequest(errorMessage));
  }
  try {
    const data = await leadService.editNewLead(req, res, next);
    if (data && data.data)
      return SuccessResponse.ok(res, data.message, data.data);
  } catch (error) {
    return next(ErrorResponse.internalServer(error.message));
  }
};

/**
 * getAllMyLeads - Super admin and admin can fetch all my leads and their stats.
 * @param {Object} req - The HTTP request object.
 * @param {Object} res - The HTTP response object.
 * @param {Function} next - The next middleware function for error handling.  
 */
export const getAllMyLeads = async (req, res, next) => {
  try {
    const data = await leadService.getAllMyLeads(req, res, next);
    if (data && data.data)
      return SuccessResponse.ok(res, data.message, data.data);
  } catch (error) {
    return next(ErrorResponse.internalServer(error.message));
  }
};