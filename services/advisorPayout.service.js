import ErrorResponse from "../lib/error.res.js";
import AdvisorPayout from "../models/AdvisorPayout.model.js";
import Lead from "../models/Lead.model.js";

class AdvisorPayoutService {
  
  /**
   * getDisbursedUnpaidLeads - Get leads for advisor payout. These leads are disbursed but not paid.
   * @param {Object} req - The HTTP request object.
   * @param {Object} res - The HTTP response object.
   * @param {Function} next - The next middleware function for error handling.
   */
  async getDisbursedUnpaidLeads(req, res, next) {
    const leads = await Lead.find({
      finalPayout: false,
      history: { $exists: true, $ne: [] },
    })
      .populate("advisorId", "_id name")
      .populate("allocatedTo", "_id name")
      .populate("createdBy", "_id name")
      .sort({ createdAt: -1 });

    const filteredLeads = leads.filter((lead) => {
      const lastEntry = lead.history[lead.history.length - 1];
      return lastEntry?.feedback === "Loan Disbursed";
    });

    // Format response to "leadNo - clientName"
    const formattedLeads = filteredLeads.map((lead) => ({
      id: lead._id,
      displayName: `${lead.leadNo} - ${lead.clientName}`,
    }));

    return {
      data: formattedLeads,
      message: "Disbursed unpaid leads retrieved successfully",
    };
  }

  /**
   * addAdvisorPayout - Add an advisor payout of a lead which is disbursed and final payout is false.
   * @param {body(leadId, advisorId, customerName, loanServiceType, disbursalAmount, disbursalDate, payoutPercent, payoutAmount, tdsPercent, tdsAmount, gstApplicable, gstPercent, gstAmount, invoiceNo, invoiceDate, netPayableAmount, processedById, finalPayout, remarks, bankerId, bankName, bankerName, bankerEmailId, bankerDesignation, bankerMobileNo, stateName, cityName)} req - The request body.
   * @param {Object} res - The HTTP response object.
   * @param {Function} next - The next middleware function for error handling.  
   */
  async addAdvisorPayout(req, res, next) {
    const {
      leadId,
      advisorId,
      disbursalAmount,
      disbursalDate,
      payoutPercent,
      payoutAmount,
      tdsPercent,
      tdsAmount,
      gstApplicable,
      gstPercent,
      gstAmount,
      invoiceNo,
      invoiceDate,
      netPayableAmount,
      processedById,
      finalPayout,
      remarks,
      bankerId,
      bankName,
      bankerName,
      bankerEmailId,
      bankerDesignation,
      bankerMobileNo,
      stateName,
      cityName,
    } = req.body;

    const employeeId = req.user.referenceId;

    const lead = await Lead.findById(leadId);
    if(!lead) {
      return next(ErrorResponse.notFound("Lead not found"));
    }

    if(lead.finalPayout === true) {
      return next(ErrorResponse.badRequest("Lead is already final payout"));
    }

    const newPayout = new AdvisorPayout({
        leadId,
        advisorId,
        disbursalAmount,
        disbursalDate,
        payoutPercent,
        payoutAmount,
        tdsPercent,
        tdsAmount,
        gstApplicable,
        gstPercent,
        gstAmount,
        invoiceNo,
        invoiceDate,
        netPayableAmount,
        processedById,
        finalPayout,
        remarks,
        bankerId,
        bankName,
        bankerName,
        bankerEmailId,
        bankerDesignation,
        bankerMobileNo,
        stateName,
        cityName,
        createdBy: employeeId,
        updatedBy: employeeId,
    })

    await newPayout.save();

    await Lead.findByIdAndUpdate({id: leadId}, { finalPayout}, { new: true})

    return {
        data: newPayout,
        message: "Advisor Payout added successfully",
    }
  } 

  /**
   * getAllAdvisorPayouts - Get all advisor payouts.
   * @param {Object} req - The HTTP request object.
   * @param {Object} res - The HTTP response object.
   * @param {Function} next - The next middleware function for error handling.
   */
  async getAllAdvisorPayouts(req, res, next) {
    const { productType, advisorName, clientName, fromDate, toDate, page = 1, limit = 1000 } = req.query;

    const parsedPage = parseInt(page, 10);
    const parsedLimit = parseInt(limit, 10);
    const skip = (parsedPage - 1) * parsedLimit;

    const filters = {};

    if(fromDate || toDate) {
      filters.createdAt = {};
      if(fromDate) filters.createdAt.$gte = new Date(fromDate);
      if(toDate) filters.createdAt.$lte = new Date(toDate);
    }

    if(productType) {
      filters.productType = {
        $regex: productType,
        $options: "i"
      }
    }

    if(clientName) {
      filters.clientName = {
        $regex: clientName,
        $options: "i"
      }
    }

    let advisorPayouts = await AdvisorPayout.find(filters)
      .populate("advisorId")
      .populate("leadId")
      .sort({ createdAt: -1 });

    if(productType) {
      advisorPayouts = advisorPayouts.filter((payout) => payout.leadId?.productType?.toLowerCase().includes(productType.toLowerCase()));
    }

    if (clientName) {
      advisorPayouts = advisorPayouts.filter(payout =>
        payout.leadId?.clientName?.toLowerCase().includes(clientName.toLowerCase())
      );
    }

    if (advisorName) {
      advisorPayouts = advisorPayouts.filter(payout =>
        payout.advisorId?.name?.toLowerCase().includes(advisorName.toLowerCase())
      );
    }

    const paginatedAdvisorPayouts = advisorPayouts.slice(skip, skip + parsedLimit);

    return {
      data: {
        total: advisorPayouts.length,
        currentPage: parsedPage,
        totalPages: Math.ceil(advisorPayouts.length / parsedLimit),
        advisorPayouts: paginatedAdvisorPayouts,
      },
      message: "Advisor Payouts retrieved successfully",
    }

  }

  /**
   * getSingleAdvisorPayout - Get a single advisor payout by ID.
   * @param {Object} req - The HTTP request object.
   * @param {Object} res - The HTTP response object.
   * @param {Function} next - The next middleware function for error handling.  
   */
  async getSingleAdvisorPayout(req, res, next) {
    const { id } = req.params;

    const advisorPayout = await AdvisorPayout.findById(id)
      .populate("advisorId", "_id name advisorCode")
      .populate("leadId")
      .populate("processedById", "_id processedBy")
      .populate("bankerId");
    
    if(!advisorPayout) {
      return next(ErrorResponse.notFound("Advisor Payout not found"));
    }

    if (advisorPayout.advisorId) {
      const { name, advisorCode } = advisorPayout.advisorId;
      advisorPayout.advisorId.name = advisorCode ? `${name} - ${advisorCode}` : name;
    }

    return {
      data: advisorPayout,
      message: "Advisor Payout retrieved successfully",
    }
  }

  /**
   * editAdvisorPayout - Edit an advisor payout and update the final payout flag in lead.
   * @param {body(leadId, advisorId, customerName, loanServiceType, disbursalAmount, disbursalDate, payoutPercent, payoutAmount, tdsPercent, tdsAmount, gstApplicable, gstPercent, gstAmount, invoiceNo, invoiceDate, netPayableAmount, processedById, finalPayout, remarks, bankerId, bankName, bankerName, bankerEmailId, bankerDesignation, bankerMobileNo, stateName, cityName)} req - The request body.
   * @param {Object} res - The HTTP response object.
   * @param {Function} next - The next middleware function for error handling.
   */
  async editAdvisorPayout(req, res, next) {
    const { id } = req.params;

    const existingPayout = await AdvisorPayout.findById(id);
    if(!existingPayout) {
      return next(ErrorResponse.notFound("Advisor Payout not found"));
    }

    const lead = await Lead.findById(existingPayout.leadId);
    if(!lead) {
      return next(ErrorResponse.notFound("Lead not found"));
    }

    const updates = { 
      ...req.body,
      loanServiceType: lead.productType,
      customerName: lead.clientName, 
      updatedBy: req.user.referenceId,
    };

    const updatedPayout = await AdvisorPayout.findByIdAndUpdate(id, updates, { new: true, runValidators: true });

    if(typeof updates.finalPayout === "boolean") {
      await Lead.findByIdAndUpdate(updatedPayout.leadId, {
        finalPayout: updates.finalPayout
      })
    }

    return {
      data: updatedPayout,
      message: "Advisor Payout updated successfully",
    }
  }

  /**
   * deleteAdvisorPayout - Delete an advisor payout and update the final payout flag in lead if no other final payouts exist.
   * @param {Object} req - The HTTP request object.
   * @param {Object} res - The HTTP response object.
   * @param {Function} next - The next middleware function for error handling.  
   */
  async deleteAdvisorPayout(req, res, next) {
    const { id } = req.params;

    const payout = await AdvisorPayout.findById(id);
    if(!payout) {
      return next(ErrorResponse.notFound("Advisor Payout not found"));
    }

    await AdvisorPayout.findByIdAndDelete(id);

    const hasOtherFinalPayouts = await AdvisorPayout.exists({
      leadId: payout.leadId,
      finalPayout: true
    })

    if(!hasOtherFinalPayouts) {
      await Lead.findByIdAndUpdate(payout.leadId, { finalPayout: false })
    }
    
    return {
      data: null,
      message: "Advisor Payout deleted successfully",
    }
  }
}

export default new AdvisorPayoutService();
