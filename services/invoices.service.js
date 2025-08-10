import ErrorResponse from "../lib/error.res.js";
import Invoice from "../models/Invoices.model.js";
import Lead from "../models/Lead.model.js";

class InvoicesService {
  /**
   * getDisbursedLeadsWithoutInvoice - Get leads for invoice. These leads are disbursed but not invoiced. There finalInvoice field is false.
   * @param {Object} req - The HTTP request object.
   * @param {Object} res - The HTTP response object.
   * @param {Function} next - The next middleware function for error handling.
   */
  async getDisbursedLeadWithoutInvoice(req, res, next) {
    const leads = await Lead.find({
      finalInvoice: false,
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
      message:
        "Disbursed unpaid leads without invoice(false) retrieved successfully",
    };
  }

  /**
   * addInvoice - Add an invoice of a lead which is disbursed and final invoice is false.
   * @param {body(leadId, advisorName, customerName, loanServiceType, disbursalAmount, disbursalDate, payoutPercent, payoutAmount, tdsPercent, tdsAmount, gstApplicable, gstPercent, gstAmount, invoiceNo, invoiceDate, netReceivableAmount, processedById, finalInvoice, remarks, bankerId, bankName, bankerName, bankerEmailId, bankerDesignation, bankerMobileNo, stateName, cityName)} req - The request body.
   * @param {Object} res - The HTTP response object.
   * @param {Function} next - The next middleware function for error handling.
   */
  async addInvoice(req, res, next) {
    const {
      leadId,
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
      netReceivableAmount,
      processedById,
      finalInvoice,
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
    if (!lead) {
      return next(ErrorResponse.notFound("Lead not found"));
    }

    if (lead.finalInvoice === true) {
      return next(ErrorResponse.badRequest("Lead is already final invoice"));
    }

    const newInvoice = new Invoice({
      leadId,
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
      netReceivableAmount,
      processedById,
      finalInvoice,
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
    });

    await newInvoice.save();

    if (typeof finalInvoice === "boolean") {
      await Lead.findByIdAndUpdate(leadId, { finalInvoice: finalInvoice });
    }

    return {
      data: newInvoice,
      message: "Invoice added successfully",
    };
  }

  /**
   * getAllInvoices - Get all invoices.
   * @param {Object} req - The HTTP request object.
   * @param {Object} res - The HTTP response object.
   * @param {Function} next - The next middleware function for error handling.
   */
  async getAllInvoices(req, res, next) {
    const {
      loanServiceType,
      advisorName,
      customerName,
      fromDate,
      toDate,
      page = 1,
      limit = 1000,
    } = req.query;

    const parsedPage = parseInt(page, 10);
    const parsedLimit = parseInt(limit, 10);
    const skip = (parsedPage - 1) * parsedLimit;

    const matchStage = {};

    if (fromDate || toDate) {
      matchStage.createdAt = {};
      if (fromDate) matchStage.createdAt.$gte = new Date(fromDate);
      if (toDate) matchStage.createdAt.$lte = new Date(toDate);
    }

    const pipeline = [
      { $match: matchStage },
      {
        $lookup: {
          from: "leads",
          localField: "leadId",
          foreignField: "_id",
          as: "lead",
        },
      },
      { $unwind: "$lead" },
      {
        $lookup: {
          from: "advisors",
          localField: "lead.advisorId",
          foreignField: "_id",
          as: "advisor",
        },
      },
      { $unwind: { path: "$advisor", preserveNullAndEmptyArrays: true } },
      {
        $match: {
          ...(loanServiceType && {
            "lead.productType": { $regex: loanServiceType, $options: "i" },
          }),
          ...(customerName && {
            "lead.clientName": { $regex: customerName, $options: "i" },
          }),
          ...(advisorName && {
            "advisor.name": { $regex: advisorName, $options: "i" },
          }),
        },
      },
      { $sort: { createdAt: -1 } },
      { $skip: skip },
      { $limit: parsedLimit },
      {
        $project: {
          _id: 1,
          invoiceNo: 1,
          invoiceDate: 1,
          payoutPercent: 1,
          payoutAmount: 1,
          tdsPercent: 1,
          tdsAmount: 1,
          gstPercent: 1,
          gstAmount: 1,
          netReceivableAmount: 1,
          finalInvoice: 1,
          remarks: 1,
          disbursalDate: 1,
          createdAt: 1,
          updatedAt: 1,

          // Lead data
          advisorName: "$advisor.name",
          customerName: "$lead.clientName",
          loanServiceType: "$lead.productType",
          disbursalAmount: "$lead.disbursalAmount",
          leadNo: "$lead.leadNo",

          // Banker data
          bankerName: "$banker.name",
          bankerEmailId: "$banker.emailId",
          bankerDesignation: "$banker.designation",
          bankerMobileNo: "$banker.mobileNo",
          bankName: "$banker.bankName",
        },
      },
    ];

    const invoices = await Invoice.aggregate(pipeline);

    return {
      data: invoices,
      message: "Invoices retrieved successfully",
    };
  }

  /**
   * getSingleInvoice - Get one invoice by ID.
   * @param {params.id} req - Invoice ID in request params.
   */
  async getSingleInvoice(req, res, next) {
    const { id } = req.params;

    const invoice = await Invoice.findById(id)
      .populate("leadId")
      .populate("processedById")
      .populate("bankerId");

    if (!invoice) {
      return next(ErrorResponse.notFound("Invoice not found"));
    }

    return {
      data: invoice,
      message: "Invoice retrieved successfully",
    };
  }

  /**
   * editInvoice - Edit an invoice and update lead status.
   * @param {body(disbursalDate, payoutPercent, payoutAmount, tdsPercent, tdsAmount, gstApplicable, gstPercent, gstAmount, invoiceNo, invoiceDate, netReceivableAmount, processedById, finalInvoice, remarks, bankerId, bankName, bankerName, bankerEmailId, bankerDesignation, bankerMobileNo, stateName, cityName)} req - The request body.
   * @param {Object} res - The HTTP response object.
   * @param {Function} next - The next middleware function for error handling.
   */
  async editInvoice(req, res, next) {
    const { id } = req.params;
    const employeeId = req.user.referenceId;

    const existingInvoice = await Invoice.findById(id);
    if (!existingInvoice) {
      return next(ErrorResponse.notFound("Invoice not found"));
    }

    const updatedData = {
      ...req.body,
      updatedBy: employeeId,
    };

    const updatedInvoice = await Invoice.findByIdAndUpdate(id, updatedData, {
      new: true,
      runValidators: true,
    });

    if (typeof req.body.finalInvoice === "boolean") {
      await Lead.findByIdAndUpdate(updatedInvoice.leadId, {
        finalInvoice: req.body.finalInvoice,
      });
    }

    return {
      data: updatedInvoice,
      message: "Invoice updated successfully",
    };
  }

  /**
   * deleteInvoice - Delete an invoice and update the final invoice flag in lead if no other final invoices exist.
   * @param {Object} req - The HTTP request object.
   * @param {Object} res - The HTTP response object.
   * @param {Function} next - The next middleware function for error handling.
   */
  async deleteInvoice(req, res, next) {
    const { id } = req.params;

    const invoice = await Invoice.findById(id);
    if (!invoice) {
      return next(ErrorResponse.notFound("Invoice not found"));
    }

    if (invoice.finalInvoice === true && invoice.leadId) {
      await Lead.findByIdAndUpdate(invoice.leadId, {
        finalInvoice: false,
      });
    }

    await Invoice.findByIdAndDelete(id);

    return {
      message: "Invoice deleted successfully",
    };
  }
}

export default new InvoicesService();
