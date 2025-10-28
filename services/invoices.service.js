import mongoose from "mongoose";
import ErrorResponse from "../lib/error.res.js";
import Invoice from "../models/Invoices.model.js";
import Lead from "../models/Lead.model.js";
import InvoiceMaster from "../models/InvoiceMaster.model.js";
import { populate } from "dotenv";
import Receivable from "../models/Receivable.model.js";

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
      disbursalAmount,
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
    } = req.body;

    const employeeId = req.user.referenceId;

    const numberFields = [
      { name: "netReceivableAmount", value: netReceivableAmount },
      { name: "gstAmount", value: gstAmount },
      { name: "payoutAmount", value: payoutAmount },
      { name: "tdsAmount", value: tdsAmount },
    ];

    for (const field of numberFields) {
      if (field.value != null && field.value < 0) {
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
    if (!lead) return next(ErrorResponse.notFound("Lead not found"));
    if (lead.finalInvoice === true)
      return next(ErrorResponse.badRequest("Lead is already final invoice"));

    const calculatedPayoutAmount =
      payoutAmount || (disbursalAmount * payoutPercent) / 100;
    const calculatedTdsAmount =
      tdsAmount || (calculatedPayoutAmount * tdsPercent) / 100;
    const calculatedGstAmount = gstPercent
      ? (calculatedPayoutAmount * gstPercent) / 100
      : 0;
    const calculatedNetReceivable =
      netReceivableAmount ||
      calculatedPayoutAmount - calculatedTdsAmount + calculatedGstAmount;

    const invoiceMaster = await InvoiceMaster.findOneAndUpdate(
      { leadId },
      {
        $inc: {
          invoiceReceivableAmount: calculatedPayoutAmount - calculatedTdsAmount,
          invoiceGstAmount: calculatedGstAmount,
          remainingReceivableAmount:
            calculatedPayoutAmount - calculatedTdsAmount,
          remainingGstAmount: calculatedGstAmount,
        },
      },
      {
        upsert: true,
        new: true,
      }
    );

    const newInvoice = await Invoice.create({
      invoiceMasterId: invoiceMaster._id,
      leadId,
      disbursalDate,
      disbursalAmount,
      payoutPercent,
      payoutAmount: calculatedPayoutAmount,
      tdsPercent,
      tdsAmount: calculatedTdsAmount,
      gstApplicable,
      gstPercent,
      gstAmount: calculatedGstAmount,
      invoiceNo,
      invoiceDate,
      netReceivableAmount: calculatedNetReceivable,
      processedById,
      finalInvoice,
      remarks,
      createdBy: employeeId,
      updatedBy: employeeId,
    });

    if (finalInvoice) {
      await Lead.findByIdAndUpdate(
        leadId,
        { finalInvoice: true },
        { new: true }
      );
    }
    return {
      message: "Invoice created successfully.",
      data: newInvoice,
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
          disbursalAmount: "$lead.loanRequirementAmount",
          leadNo: "$lead.leadNo",
        },
      },
    ];

    const invoices = await Invoice.aggregate(pipeline);

    const totalPayoutAmount = invoices.reduce(
      (sum, p) => sum + (p.payoutAmount || 0),
      0
    );

    const paginatedInvoices = invoices.slice(skip, skip + parsedLimit);

    const totalTdsAmount = invoices.reduce(
      (sum, p) => sum + (p.tdsAmount || 0),
      0
    );

    const totalGstAmount = invoices.reduce(
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
        total: invoices.length,
        currentPage: parsedPage,
        totalPages: Math.ceil(invoices.length / parsedLimit),
        invoices: paginatedInvoices,
      },
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
      .populate({
        path: "leadId",
        populate: [
          {
            path: "bankerId",
            populate: {
              path: "bank city",
            },
          },
          {
            path: "advisorId",
          },
        ],
      })
      .populate("processedById");

    if (!invoice) {
      return next(ErrorResponse.notFound("Invoice not found"));
    }

    if (!invoice.leadId) {
      return next(ErrorResponse.notFound("Lead not found or deleted"));
    }

    const advisorDisplayName = invoice.leadId.advisorId
      ? invoice.leadId.advisorId.advisorCode
        ? `${invoice.leadId.advisorId.name} - ${invoice.leadId.advisorId.advisorCode}`
        : invoice.leadId.advisorId.name
      : null;

    const bankerDetails =
      invoice.leadId && invoice.leadId.bankerId
        ? invoice.leadId.bankerId
        : null;

    const invoiceData = {
      ...invoice.toObject(),
      advisorDisplayName,
      bankerDetails,
    };

    return {
      data: invoiceData,
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

    const numberFields = [
      { name: "netReceivableAmount", value: req.body.netReceivableAmount },
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

    const lead = await Lead.findById(existingInvoice.leadId);
    if (!lead) return next(ErrorResponse.notFound("Lead not found"));

    const invoiceMaster = await InvoiceMaster.findOne({
      leadId: existingInvoice.leadId,
    });
    if (!invoiceMaster)
      return next(ErrorResponse.notFound("Invoice Master not found"));

    const oldPayoutAmount = existingInvoice.payoutAmount || 0;
    const oldTdsAmount = existingInvoice.tdsAmount || 0;
    const oldGstAmount = existingInvoice.gstAmount || 0;

    const {
      invoiceNo,
      invoiceDate,
      disbursalDate,
      disbursalAmount,
      finalInvoice,
      payoutPercent,
      tdsPercent,
      gstPercent,
      processedById,
      remarks,
    } = req.body;

    if (disbursalAmount !== undefined)
      existingInvoice.disbursalAmount = disbursalAmount;
    if (disbursalDate !== undefined)
      existingInvoice.disbursalDate = disbursalDate;
    if (processedById !== undefined)
      existingInvoice.processedById = processedById;
    if (invoiceNo !== undefined) existingInvoice.invoiceNo = invoiceNo;
    if (invoiceDate !== undefined) existingInvoice.invoiceDate = invoiceDate;
    if (remarks !== undefined) existingInvoice.remarks = remarks;
    if (finalInvoice !== undefined) existingInvoice.finalInvoice = finalInvoice;
    if (payoutPercent !== undefined)
      existingInvoice.payoutPercent = payoutPercent;
    if (tdsPercent !== undefined) existingInvoice.tdsPercent = tdsPercent;
    if (gstPercent !== undefined) existingInvoice.gstPercent = gstPercent;

    const newPayoutAmount =
      (existingInvoice.disbursalAmount * (existingInvoice.payoutPercent || 0)) /
      100;

    const newTdsAmount =
      (newPayoutAmount * (existingInvoice.tdsPercent || 0)) / 100;

    const newGstAmount =
      (newPayoutAmount * (existingInvoice.gstPercent || 0)) / 100;

    const newNetReceivableAmount =
      newPayoutAmount - newTdsAmount + newGstAmount;

    existingInvoice.payoutAmount = newPayoutAmount;
    existingInvoice.tdsAmount = newTdsAmount;
    existingInvoice.gstAmount = newGstAmount;
    existingInvoice.netReceivableAmount = newNetReceivableAmount;

    invoiceMaster.invoiceReceivableAmount -= oldPayoutAmount - oldTdsAmount;
    invoiceMaster.invoiceGstAmount -= oldGstAmount;
    invoiceMaster.remainingReceivableAmount -= oldPayoutAmount - oldTdsAmount;
    invoiceMaster.remainingGstAmount -= oldGstAmount;

    invoiceMaster.invoiceReceivableAmount += newPayoutAmount - newTdsAmount;
    invoiceMaster.invoiceGstAmount += newGstAmount;
    invoiceMaster.remainingReceivableAmount += newPayoutAmount - newTdsAmount;
    invoiceMaster.remainingGstAmount += newGstAmount;

    const receivables = await Receivable.find({
      leadId: existingInvoice.leadId,
    });

    const totalPaidReceivable = receivables
      .filter((r) => r.paymentAgainst === "receivableAmount")
      .reduce((sum, r) => sum + (r.paidAmount || 0), 0);

    const totalPaidGst = receivables
      .filter((r) => r.paymentAgainst === "gstAmount")
      .reduce((sum, r) => sum + (r.paidAmount || 0), 0);

    if (invoiceMaster.invoiceReceivableAmount < totalPaidReceivable) {
      return next(
        ErrorResponse.badRequest("Cannot reduce receivable below paid amount")
      );
    }

    if (invoiceMaster.invoiceGstAmount < totalPaidGst) {
      return next(
        ErrorResponse.badRequest("Cannot reduce GST below paid amount")
      );
    }

    if (invoiceMaster.remainingReceivableAmount < 0) {
      return next(
        ErrorResponse.badRequest("Remaining receivable cannot be negative")
      );
    }

    if (invoiceMaster.remainingGstAmount < 0) {
      return next(ErrorResponse.badRequest("Remaining GST cannot be negative"));
    }

    existingInvoice.updatedBy = employeeId;

    await existingInvoice.save();
    await invoiceMaster.save();

    const invoicesOfLead = await Invoice.find({
      leadId: existingInvoice.leadId,
    });
    const anyFinalTrue = invoicesOfLead.some(
      (inv) => inv.finalInvoice === true
    );

    await Lead.findByIdAndUpdate(existingInvoice.leadId, {
      finalInvoice: anyFinalTrue,
    });

    return {
      data: existingInvoice,
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
    const { id } = req.query;

    const invoice = await Invoice.findById(id);
    if (!invoice) {
      return next(ErrorResponse.notFound("Invoice not found"));
    }

    const invoiceMaster = await InvoiceMaster.findById(invoice.invoiceMasterId);
    if (!invoiceMaster) {
      return next(ErrorResponse.badRequest("Invoice master record not found"));
    }

    const receivableDiff = invoice.payoutAmount - invoice.tdsAmount;
    const gstDiff = invoice.gstAmount || 0;

    invoiceMaster.invoiceReceivableAmount = Math.max(
      invoiceMaster.invoiceReceivableAmount - receivableDiff,
      0
    );
    invoiceMaster.invoiceGstAmount = Math.max(
      invoiceMaster.invoiceGstAmount - gstDiff,
      0
    );
    invoiceMaster.remainingReceivableAmount = Math.max(
      invoiceMaster.remainingReceivableAmount - receivableDiff,
      0
    );
    invoiceMaster.remainingGstAmount = Math.max(
      invoiceMaster.remainingGstAmount - gstDiff,
      0
    );

    if (
      invoiceMaster.invoiceReceivableAmount === 0 &&
      invoiceMaster.invoiceGstAmount === 0 &&
      invoiceMaster.remainingReceivableAmount === 0 &&
      invoiceMaster.remainingGstAmount === 0
    ) {
      await invoiceMaster.deleteOne();
    } else {
      await invoiceMaster.save();
    }

    await invoice.deleteOne();

    const hasOtherFinalInvoice = await Invoice.exists({
      leadId: invoice.leadId,
      finalInvoice: true,
    });

    if (!hasOtherFinalInvoice) {
      await Lead.findByIdAndUpdate(invoice.leadId, { finalInvoice: false });
    }


    return {
      message: "Invoice deleted successfully",
    };
  }
}

export default new InvoicesService();
