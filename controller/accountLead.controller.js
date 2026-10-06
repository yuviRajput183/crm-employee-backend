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
        caseType,
        channelPartner1,
        cp1DealPercentage,
        cp2DealPercentage,
        cp3DealPercentage
    } = req.body;

    const totalPayoutAmount = (reportedLoanAmount * reportedPayoutPercentage) / 100;
    const leadNo = await helperService.getNextSequence("accountLeadSerial");
    
    let leadData = {
        ...req.body,
        totalPayoutAmount,
        leadNo,
        status: "In Progress",
        createdBy: req.user ? (req.user.id || req.user._id) : undefined
    };

    const ChannelPartner = (await import("../models/ChannelPartner.model.js")).default;
    const DealApprovalRequest = (await import("../models/DealApprovalRequest.model.js")).default;
    
    // Process CP1
    let originalCp1DealPercentage = cp1DealPercentage;
    if (channelPartner1) {
        const cp = await ChannelPartner.findById(channelPartner1);
        if (cp) {
            originalCp1DealPercentage = caseType === "Processed" ? cp.processedDealPercentage : cp.reportedDealPercentage;
            
            leadData.cp1DealPercentage = originalCp1DealPercentage;
            leadData.cp1PayoutAmount = (totalPayoutAmount * originalCp1DealPercentage) / 100;
        }
    }

    // Since we don't have direct ObjectIds for cp2 and cp3 in the model reliably, and no specific instruction was given to fetch them from DB,
    // wait, if we are to check MASTER for cp2 and cp3 too, we'd need their IDs. The instructions say "Use ChannelPartner.model.js to fetch channelPartner1." So maybe only fetch CP1?
    // Let's assume we do this just for CP1, or if we have to do for all, wait. The prompt says: "Use ChannelPartner.model.js to fetch channelPartner1. Use its processedDealPercentage or reportedDealPercentage (based on caseType). Do this for createAccountLead."

    const accountLead = await AccountLead.create(leadData);

    if (channelPartner1 && cp1DealPercentage !== undefined && Number(cp1DealPercentage) !== Number(originalCp1DealPercentage)) {
        await DealApprovalRequest.create({
            leadId: accountLead._id,
            cpLevel: 1,
            channelPartnerId: channelPartner1,
            originalDealPercentage: originalCp1DealPercentage,
            requestedDealPercentage: Number(cp1DealPercentage),
            requestedBy: req.user ? (req.user.id || req.user._id) : undefined,
            status: "PENDING_ADMIN"
        });
    }

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
        "CASE_FOUND",
        "Ready to report",
        "Invoiced",
        "Invoice Raised"
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
    updateData.updatedBy = req.user ? (req.user.id || req.user._id) : undefined;

    // Recalculate totalPayoutAmount if fields are provided
    let totalPayoutAmount = existingLead.totalPayoutAmount;
    if (updateData.reportedLoanAmount && updateData.reportedPayoutPercentage) {
        totalPayoutAmount = (updateData.reportedLoanAmount * updateData.reportedPayoutPercentage) / 100;
        updateData.totalPayoutAmount = totalPayoutAmount;
    } else if (updateData.reportedLoanAmount) {
        totalPayoutAmount = (updateData.reportedLoanAmount * existingLead.reportedPayoutPercentage) / 100;
        updateData.totalPayoutAmount = totalPayoutAmount;
    } else if (updateData.reportedPayoutPercentage) {
        totalPayoutAmount = (existingLead.reportedLoanAmount * updateData.reportedPayoutPercentage) / 100;
        updateData.totalPayoutAmount = totalPayoutAmount;
    }

    const { cp1DealPercentage, channelPartner1, caseType } = updateData;
    const finalChannelPartner1 = channelPartner1 || existingLead.channelPartner1;
    const finalCaseType = caseType || existingLead.caseType;

    const ChannelPartner = (await import("../models/ChannelPartner.model.js")).default;
    const DealApprovalRequest = (await import("../models/DealApprovalRequest.model.js")).default;

    if (finalChannelPartner1 && cp1DealPercentage !== undefined) {
        const cp = await ChannelPartner.findById(finalChannelPartner1);
        if (cp) {
            const masterCp1DealPercentage = finalCaseType === "Processed" ? cp.processedDealPercentage : cp.reportedDealPercentage;
            
            if (Number(cp1DealPercentage) !== Number(masterCp1DealPercentage)) {
                // Request created, use master value for now
                updateData.cp1DealPercentage = masterCp1DealPercentage;
                updateData.cp1PayoutAmount = (totalPayoutAmount * masterCp1DealPercentage) / 100;

                await DealApprovalRequest.create({
                    leadId: id,
                    cpLevel: 1,
                    channelPartnerId: finalChannelPartner1,
                    originalDealPercentage: masterCp1DealPercentage,
                    requestedDealPercentage: Number(cp1DealPercentage),
                    requestedBy: req.user ? (req.user.id || req.user._id) : undefined,
                    status: "PENDING_ADMIN"
                });
            } else {
                updateData.cp1DealPercentage = masterCp1DealPercentage;
                updateData.cp1PayoutAmount = (totalPayoutAmount * masterCp1DealPercentage) / 100;
            }
        }
    } else if (updateData.totalPayoutAmount !== undefined && existingLead.cp1DealPercentage !== undefined) {
        // If total payout changed but no CP change in body, update CP payout amount anyway
        updateData.cp1PayoutAmount = (totalPayoutAmount * existingLead.cp1DealPercentage) / 100;
    }

    const updatedLead = await AccountLead.findByIdAndUpdate(id, updateData, { new: true });
    
    return SuccessResponse.ok(res, "Account lead updated successfully", updatedLead);
  } catch (error) {
    return next(ErrorResponse.internalServer(error.message));
  }
};
