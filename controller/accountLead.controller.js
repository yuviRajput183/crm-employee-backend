import SuccessResponse from "../lib/success.res.js";
import ErrorResponse from "../lib/error.res.js";
import helperService from "../services/helper.service.js";
import AccountLead from "../models/AccountLead.model.js";

export const createAccountLead = async (req, res, next) => {
  const requiredFields = [
    "location", "product", "subProduct", "caseName", "lanApplicationNo",
    "bank", "reportedLoanAmount", "reportedPayoutPercentage",
    "caseType", "serviceProvider", "spCode", "disbursementDate", "pddCleared"
  ];
  
  const missingFields = helperService.validateFields(requiredFields, req.body);
  if (missingFields.length > 0) {
    const errorMessage = `Missing required fields: ${missingFields.join(", ")}`;
    return next(ErrorResponse.badRequest(errorMessage));
  }

  try {
    const { 
        reportedLoanAmount, 
        reportedPayoutPercentage, 
    } = req.body;

    const totalPayoutAmount = (reportedLoanAmount * reportedPayoutPercentage) / 100;
    const leadNo = await helperService.getNextSequence("accountLeadSerial");
    
    const accountLeadData = {
        ...req.body,
        totalPayoutAmount,
        leadNo,
        status: "In Progress",
        createdBy: req.user ? req.user._id : undefined
    };

    const accountLead = await AccountLead.create(accountLeadData);
    return SuccessResponse.created(res, "Account Lead created successfully", accountLead);
  } catch (error) {
    return next(ErrorResponse.internalServer(error.message));
  }
};

export const getInProgressLeads = async (req, res, next) => {
  try {
    const allowedStatuses = [
        "In Progress", 
        "Banker Confirmed", 
        "Confirmation Received", 
        "PART_CASE_FOUND", 
        "CASE_FOUND"
    ];

    const leads = await AccountLead.find({ status: { $in: allowedStatuses } })
      .populate("location", "name")
      .populate("product", "name")
      .populate("bank", "name bankName")
      .populate("serviceProvider", "legalName code")
      .lean();

    const Tranche = (await import("../models/Tranche.model.js")).default;

    for (let i = 0; i < leads.length; i++) {
        const tranches = await Tranche.find({ leadId: leads[i]._id }).lean();
        leads[i].tranches = tranches || [];
    }
      
    return SuccessResponse.ok(res, "In Progress leads fetched successfully", leads);
  } catch (error) {
    return next(ErrorResponse.internalServer(error.message));
  }
};

export const getClosedLeads = async (req, res, next) => {
  try {
    const leads = await AccountLead.find({ status: "Closed" })
      .populate("location", "name")
      .populate("product", "name")
      .populate("bank", "name bankName")
      .populate("serviceProvider", "legalName code");
      
    return SuccessResponse.ok(res, "Closed leads fetched successfully", leads);
  } catch (error) {
    return next(ErrorResponse.internalServer(error.message));
  }
};

export const getAccountLeadById = async (req, res, next) => {
  try {
    const lead = await AccountLead.findById(req.params.id)
      .populate("location", "name")
      .populate("product", "name")
      .populate("bank", "name bankName")
      .populate("serviceProvider", "legalName code");

    if (!lead) {
      return next(ErrorResponse.notFound("Account lead not found"));
    }

    return SuccessResponse.ok(res, "Account lead fetched successfully", lead);
  } catch (error) {
    return next(ErrorResponse.internalServer(error.message));
  }
};

export const updateAccountLead = async (req, res, next) => {
  try {
    const { id } = req.params;
    
    const existingLead = await AccountLead.findById(id);
    if (!existingLead) {
      return next(ErrorResponse.notFound("Account lead not found"));
    }

    // Role check logic depends on how user role is structured
    // Usually req.user.role exists if authenticated
    const userRole = req.user?.role?.toLowerCase() || '';
    if (existingLead.status === 'Invoice Raised' && userRole !== 'super admin' && userRole !== 'admin') {
      return next(ErrorResponse.unauthorized("Only super admin can edit after Invoice is Raised"));
    }

    let updateData = { ...req.body };
    updateData.updatedBy = req.user ? req.user._id : undefined;

    // Recalculate totalPayoutAmount if fields are provided
    if (updateData.reportedLoanAmount && updateData.reportedPayoutPercentage) {
        updateData.totalPayoutAmount = (updateData.reportedLoanAmount * updateData.reportedPayoutPercentage) / 100;
    }

    const updatedLead = await AccountLead.findByIdAndUpdate(id, updateData, { new: true });
    
    return SuccessResponse.ok(res, "Account lead updated successfully", updatedLead);
  } catch (error) {
    return next(ErrorResponse.internalServer(error.message));
  }
};
