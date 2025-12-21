import ErrorResponse from "../lib/error.res.js";
import AdvisorPayout from "../models/AdvisorPayout.model.js";
import Lead from "../models/Lead.model.js";
import Payables from "../models/Payables.model.js";

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
    } = req.body;

    const employeeId = req.user.referenceId;

    const numberFields = [
      { name: "netPayableAmount", value: netPayableAmount },
      { name: "gstAmount", value: gstAmount },
      { name: "payoutAmount", value: payoutAmount },
      { name: "tdsAmount", value: tdsAmount },
    ];

    for (const field of numberFields) {
      if (field.value != null && field.value < 0) {
        await session.abortTransaction();
        session.endSession();
        return next(
          ErrorResponse.badRequest(`${field.name} cannot be negative`)
        );
      }
    }

    const percentFields = [
      { name: "gstPercent", value: gstPercent },
      { name: "payoutPercent", value: payoutPercent },
      { name: "tdsPercent", value: tdsPercent },
    ];

    for (const field of percentFields) {
      if (field.value != null && (field.value < 0 || field.value > 100)) {
        return next(
          ErrorResponse.badRequest(`${field.name} must be between 0 and 100`)
        );
      }
    }

    const lead = await Lead.findById(leadId);
    if (!lead) {
      return next(ErrorResponse.notFound("Lead not found"));
    }

    if (lead.finalPayout === true) {
      return next(ErrorResponse.badRequest("Lead is already final payout"));
    }

    const existingPayoutForAdvisor = await AdvisorPayout.findOne({
      leadId,
      advisorId,
    });
    if (existingPayoutForAdvisor) {
      return next(
        ErrorResponse.badRequest(
          "Payout already exists for this advisor and lead"
        )
      );
    }

    const calculatedPayoutAmount =
      payoutAmount || (disbursalAmount * payoutPercent) / 100;
    const calculatedTdsAmount =
      tdsAmount || (calculatedPayoutAmount * tdsPercent) / 100;
    const calculatedGstAmount =
      gstApplicable && gstPercent
        ? (calculatedPayoutAmount * gstPercent) / 100
        : 0;

    const calculatedNetPayable =
      netPayableAmount ||
      calculatedPayoutAmount - calculatedTdsAmount + calculatedGstAmount;

    const newPayout = new AdvisorPayout({
      leadId,
      advisorId,
      disbursalAmount,
      disbursalDate,
      payoutPercent,
      payoutAmount: calculatedPayoutAmount,
      tdsPercent,
      tdsAmount: calculatedTdsAmount,
      gstApplicable,
      gstPercent,
      gstAmount: calculatedGstAmount,
      invoiceNo,
      invoiceDate,
      netPayableAmount: calculatedNetPayable,
      processedById,
      finalPayout,
      remarks,
      createdBy: employeeId,
      updatedBy: employeeId,
      // totalPaidAmount: 0,
      remainingPayableAmount: calculatedPayoutAmount - calculatedTdsAmount, // initialize for payable tracking
      remainingGstAmount: calculatedGstAmount,
    });

    await newPayout.save();

    if (finalPayout) {
      await Lead.findByIdAndUpdate(
        leadId,
        { finalPayout: true },
        { new: true }
      );
    }

    return {
      data: newPayout,
      message: "Advisor Payout added successfully",
    };
  }

  /**
   * getAllAdvisorPayouts - Get all advisor payouts.
   * @param {Object} req - The HTTP request object.
   * @param {Object} res - The HTTP response object.
   * @param {Function} next - The next middleware function for error handling.
   */
  async getAllAdvisorPayouts(req, res, next) {
    const {
      loanServiceType,
      advisorName,
      clientName,
      fromDate,
      toDate,
      page = 1,
      limit = 1000,
    } = req.query;

    const parsedPage = parseInt(page, 10);
    const parsedLimit = parseInt(limit, 10);
    const skip = (parsedPage - 1) * parsedLimit;

    const filters = {};

    if (fromDate || toDate) {
      filters.createdAt = {};
      if (fromDate) filters.createdAt.$gte = new Date(fromDate);
      if (toDate) filters.createdAt.$lte = new Date(toDate);
    }

    let advisorPayouts = await AdvisorPayout.find(filters)
      .populate("advisorId")
      .populate("leadId")
      .sort({ createdAt: -1 });

    if (loanServiceType) {
      advisorPayouts = advisorPayouts.filter((payout) =>
        payout.leadId?.productType
          ?.toLowerCase()
          .trim()
          .includes(loanServiceType.toLowerCase().trim())
      );
    }

    if (clientName) {
      advisorPayouts = advisorPayouts.filter((payout) =>
        payout.leadId?.clientName
          ?.toLowerCase()
          .includes(clientName.toLowerCase())
      );
    }

    if (advisorName) {
      advisorPayouts = advisorPayouts.filter((payout) =>
        payout.advisorId?.name
          ?.toLowerCase()
          .includes(advisorName.toLowerCase())
      );
    }

    const paginatedAdvisorPayouts = advisorPayouts.slice(
      skip,
      skip + parsedLimit
    );

    const totalPayoutAmount = advisorPayouts.reduce(
      (sum, p) => sum + (p.payoutAmount || 0),
      0
    );

    const totalTdsAmount = advisorPayouts.reduce(
      (sum, p) => sum + (p.tdsAmount || 0),
      0
    );

    const totalGstAmount = advisorPayouts.reduce(
      (sum, p) => sum + (p.gstAmount || 0),
      0
    );

    const grossAmount = totalPayoutAmount + totalGstAmount;

    return {
      data: {
        totals: {
          totalPayoutAmount,
          totalTdsAmount,
          totalGstAmount,
          grossAmount,
        },
        total: advisorPayouts.length,
        currentPage: parsedPage,
        totalPages: Math.ceil(advisorPayouts.length / parsedLimit),
        advisorPayouts: paginatedAdvisorPayouts,
      },
      message: "Advisor Payouts retrieved successfully",
    };
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
      .populate({
        path: "leadId",
        populate: {
          path: "bankerId",
          populate: {
            path: "bank city",
          },
        },
      })
      .populate("processedById", "_id processedBy");

    if (!advisorPayout) {
      return next(ErrorResponse.notFound("Advisor Payout not found"));
    }

    if (!advisorPayout.leadId) {
      return next(ErrorResponse.notFound("Lead not found or deleted"));
    }

    // if (advisorPayout.advisorId) {
    //   const { name, advisorCode } = advisorPayout.advisorId;
    //   advisorPayout.advisorId.name = advisorCode
    //     ? `${name} - ${advisorCode}`
    //     : name;
    // }

    const advisorDisplayName = advisorPayout.advisorId
      ? advisorPayout.advisorId.advisorCode
        ? `${advisorPayout.advisorId.name} - ${advisorPayout.advisorId.advisorCode}`
        : advisorPayout.advisorId.name
      : null;

    const bankerDetails =
      advisorPayout.leadId && advisorPayout.leadId.bankerId
        ? advisorPayout.leadId.bankerId
        : null;

    const payoutData = {
      ...advisorPayout.toObject(),
      advisorDisplayName,
      bankerDetails,
    };

    return {
      data: payoutData,
      message: "Advisor Payout retrieved successfully",
    };
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
    if (!existingPayout) {
      return next(ErrorResponse.notFound("Advisor Payout not found"));
    }

    const numberFields = [
      { name: "netPayableAmount", value: req.body.netPayableAmount },
      { name: "gstAmount", value: req.body.gstAmount },
      { name: "payoutAmount", value: req.body.payoutAmount },
      { name: "tdsAmount", value: req.body.tdsAmount },
    ];

    for (const field of numberFields) {
      if (field.value != null && field.value < 0) {
        return next(
          ErrorResponse.badRequest(`${field.name} cannot be negative`)
        );
      }
    }

    const percentFields = [
      { name: "gstPercent", value: req.body.gstPercent },
      { name: "payoutPercent", value: req.body.payoutPercent },
      { name: "tdsPercent", value: req.body.tdsPercent },
    ];
    for (const field of percentFields) {
      if (field.value != null && (field.value < 0 || field.value > 100)) {
        return next(
          ErrorResponse.badRequest(`${field.name} must be between 0 and 100`)
        );
      }
    }

    const lead = await Lead.findById(existingPayout.leadId);
    if (!lead) {
      return next(ErrorResponse.notFound("Lead not found"));
    }

    const payables = await Payables.find({ payoutId: id });
    const totalPaidPayable = payables
      .filter((p) => p.paymentAgainst === "payableAmount")
      .reduce((sum, p) => sum + (p.paidAmount || 0), 0);
    const totalPaidGst = payables
      .filter((p) => p.paymentAgainst === "gstPayment")
      .reduce((sum, p) => sum + (p.paidAmount || 0), 0);

    // const totalPaid = totalPaidPayable + totalPaidGst;

    const {
      advisorId,
      disbursalAmount,
      disbursalDate,
      payoutPercent,
      tdsPercent,
      gstPercent,
      gstApplicable,
      invoiceNo,
      invoiceDate,
      remarks,
      finalPayout,
      processedById
    } = req.body;

    if (disbursalAmount !== undefined) {
      existingPayout.disbursalAmount = disbursalAmount;
    }
    if (disbursalDate !== undefined) {
      existingPayout.disbursalDate = disbursalDate;
    }
    if(processedById !== undefined) existingPayout.processedById = processedById;
    if (invoiceNo !== undefined) existingPayout.invoiceNo = invoiceNo;
    if (invoiceDate !== undefined) existingPayout.invoiceDate = invoiceDate;
    if (remarks !== undefined) existingPayout.remarks = remarks;
    if (finalPayout !== undefined) existingPayout.finalPayout = finalPayout;
    if (advisorId !== undefined) existingPayout.advisorId = advisorId;

    if (payoutPercent !== undefined) {
      existingPayout.payoutPercent = payoutPercent;
    }
    if (tdsPercent !== undefined) {
      existingPayout.tdsPercent = tdsPercent;
    }
    if (gstApplicable !== undefined) {
      existingPayout.gstApplicable = gstApplicable;
    }
    if (gstPercent !== undefined) {
      existingPayout.gstPercent = gstPercent;
    }

    existingPayout.payoutAmount =
      (existingPayout.disbursalAmount * existingPayout.payoutPercent) / 100;

    existingPayout.tdsAmount =
      (existingPayout.payoutAmount * (existingPayout.tdsPercent || 0)) / 100;

    existingPayout.gstAmount = existingPayout.gstApplicable
      ? (existingPayout.payoutAmount * (existingPayout.gstPercent || 0)) / 100
      : 0;

    existingPayout.netPayableAmount =
      existingPayout.payoutAmount -
      existingPayout.tdsAmount +
      (existingPayout.gstAmount || 0);

    if (existingPayout.payoutAmount < totalPaidPayable) {
      return next(
        ErrorResponse.badRequest(
          `Cannot decrease payout amount below already paid amount (₹${totalPaidPayable})`
        )
      );
    }

    if (existingPayout.gstAmount < totalPaidGst) {
      return next(
        ErrorResponse.badRequest(
          `Cannot decrease gst amount below already paid amount (₹${totalPaidGst})`
        )
      );
    }

    // if (existingPayout.netPayableAmount < totalPaid) {
    //   return next(
    //     ErrorResponse.badRequest(
    //       `Cannot decrease total Net Payable (₹${existingPayout.netPayableAmount}) below already paid (₹${totalPaid})`
    //     )
    //   );
    // }

    existingPayout.remainingPayableAmount = Math.max(
      existingPayout.payoutAmount - existingPayout.tdsAmount - totalPaidPayable,
      0
    );
    existingPayout.remainingGstAmount = Math.max(
      existingPayout.gstAmount - totalPaidGst,
      0
    );

    existingPayout.updatedBy = req.user.referenceId;

    await existingPayout.save();

    const payoutsOfLead = await AdvisorPayout.find({
      leadId: existingPayout.leadId,
    });

    const anyFinalTrue = payoutsOfLead.some((p) => p.finalPayout === true);

    await Lead.findByIdAndUpdate(existingPayout.leadId, {
      finalPayout: anyFinalTrue, // true if any payout has finalPayout true, else false
    });

    return {
      data: existingPayout,
      message: "Advisor Payout updated successfully",
    };
  }

  /**
   * deleteAdvisorPayout - Delete an advisor payout and update the final payout flag in lead if no other final payouts exist.
   * @param {Object} req - The HTTP request object.
   * @param {Object} res - The HTTP response object.
   * @param {Function} next - The next middleware function for error handling.
   */
  async deleteAdvisorPayout(req, res, next) {
    const { id } = req.body;

    const payout = await AdvisorPayout.findById(id);
    if (!payout) {
      return next(ErrorResponse.notFound("Advisor Payout not found"));
    }

    //  const { leadId, finalPayout } = payout;

    await AdvisorPayout.findByIdAndDelete(id);

    const hasOtherFinalPayouts = await AdvisorPayout.exists({
      leadId: payout.leadId,
      finalPayout: true,
    });
    if (!hasOtherFinalPayouts) {
      await Lead.findByIdAndUpdate(payout.leadId, { finalPayout: false });
    }

    return {
      message: "Advisor Payout deleted successfully",
    };
  }
}

export default new AdvisorPayoutService();
