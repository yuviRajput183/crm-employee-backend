import mongoose from "mongoose";
import ErrorResponse from "../lib/error.res.js";
import InvoiceMaster from "../models/InvoiceMaster.model.js";
import Receivable from "../models/Receivable.model.js";
import { populate } from "dotenv";

class ReceivableService {
  /**
   * getLeadIdsOfAllInvoices - Get all leads whose invoices are created.
   * @param {Object} req - request object
   * @param {Object} res - response object
   * @param {Function} next - next middleware function
   * @returns {Object} - response object
   */
  async getLeadIdsOfAllInvoices(req, res, next) {
    const uniqueLeads = await InvoiceMaster.aggregate([
      {
        $match: {
          $or: [
            { remainingReceivableAmount: { $gt: 0 } },
            { remainingGstAmount: { $gt: 0 } },
          ],
        },
      },
      {
        $group: { _id: "$leadId" },
      },
      {
        $lookup: {
          from: "leads",
          localField: "_id",
          foreignField: "_id",
          as: "leadDetails",
        },
      },
      { $unwind: "$leadDetails" },
    ]);

    const formattedLeads = uniqueLeads.map((lead) => ({
      id: lead._id,
      displayName: `${lead.leadDetails.leadNo} - ${lead.leadDetails.clientName}`,
    }));

    return {
      data: formattedLeads,
      message: "Invoice leads retrieved successfully",
    };
  }

  /**
   * getInvoiceMasterByLeadId - Get the invoice master by lead id.
   * @param {Object} req - request object
   * @param {Object} res - response object
   * @param {Function} next - next middleware function
   * @returns {Object} - response object
   */
  async getInvoiceMasterByLeadId(req, res, next) {
    const { leadId } = req.query;

    if (!leadId) {
      return next(ErrorResponse.badRequest("Lead id is required"));
    }

    const invoiceMaster = await InvoiceMaster.findOne({ leadId }).populate({
      path: "leadId",
      populate: [
        { path: "advisorId", model: "Advisor" },
        { 
          path: "bankerId", 
          model: "Banker" ,
          populate: [
            { path: "city", model: "City" },
            { path: "bank", model: "Bank" },
          ]
        },
      ],
    });

    if (!invoiceMaster) {
      return next(ErrorResponse.notFound("Invoice master not found"));
    }

    return {
      data: invoiceMaster,
      message: "Invoice master retrieved successfully",
    };
  }

  /**
   * addReceivable - Add a new receivable to the database and update the invoice master.
   * @param {Object} req - The HTTP request object.
   * @param {Object} res - The HTTP response object.
   * @param {Function} next - The next middleware function for error handling.
   */
  async addReceivable(req, res, next) {
    const {
      invoiceMasterId,
      leadId,
      paymentAgainst,
      receivableAmount,
      receivedAmount,
      balanceAmount,
      receivedDate,
      refNo,
      remarks,
    } = req.body;

    const session = await mongoose.startSession();
    session.startTransaction();
    try {
      if (receivedAmount < 0)
        return next(
          ErrorResponse.badRequest("Received amount cannot be negative"),
        );

      if (!["receivableAmount", "gstPayment"].includes(paymentAgainst))
        return next(ErrorResponse.badRequest("Invalid paymentAgainst value"));

      const employeeId = req.user.referenceId;

      const invoiceMaster =
        await InvoiceMaster.findById(invoiceMasterId).session(session);
      if (!invoiceMaster)
        return next(ErrorResponse.notFound("Invoice not found"));

      const balanceAmountCalc =
        balanceAmount !== undefined
          ? balanceAmount
          : receivableAmount - receivedAmount;

      if (balanceAmountCalc < 0)
        return next(
          ErrorResponse.badRequest(
            "Received amount cannot exceed receivable amount",
          ),
        );

      const receivable = await Receivable.create(
        [
          {
            invoiceMasterId,
            leadId,
            paymentAgainst,
            receivableAmount,
            receivedAmount,
            balanceAmount: balanceAmountCalc,
            receivedDate,
            refNo: refNo || null,
            remarks: remarks || null,
            createdBy: employeeId,
            updatedBy: employeeId,
          },
        ],
        { session },
      );

      if (paymentAgainst === "receivableAmount") {
        invoiceMaster.remainingReceivableAmount = Math.max(
          (invoiceMaster.remainingReceivableAmount || 0) - receivedAmount,
          0,
        );
      } else if (paymentAgainst === "gstPayment") {
        invoiceMaster.remainingGstAmount = Math.max(
          (invoiceMaster.remainingGstAmount || 0) - receivedAmount,
          0,
        );
      }

      await invoiceMaster.save({ session });

      await session.commitTransaction();
      return {
        data: receivable,
        message: "Receivable added successfully",
      };
    } catch (error) {
      await session.abortTransaction();
      return next(ErrorResponse.internalServer(error.message));
    } finally {
      session.endSession();
    }
  }

  /**
   * getAllReceivables - Get all receivables with filters.
   * @param {Object} req - The HTTP request object.
   * @param {Object} res - The HTTP response object.
   * @param {Function} next - The next middleware function for error handling.
   */
  async getAllReceivables(req, res, next) {
    const {
      productType,
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

    let receivables = await Receivable.find(filters)
      .populate({
        path: "leadId",
        populate: {
          path: "advisorId",
        },
      })
      .sort({ createdAt: -1 });

    const filteredReceivables = receivables.filter((rec) => {
      const lead = rec.leadId;
      if (!lead) {
        return false;
      }

      let match = true;
      if (clientName) {
        match =
          match &&
          lead.clientName.toLowerCase().includes(clientName.toLowerCase());
      }

      if (productType) {
        match =
          match &&
          lead.productType.toLowerCase().includes(productType.toLowerCase());
      }

      if (advisorName && lead.advisorId) {
        match =
          match &&
          lead.advisorId.name.toLowerCase().includes(advisorName.toLowerCase());
      }

      return match;
    });

    const totalCount = filteredReceivables.length;
    let totalPages = Math.ceil(totalCount / parsedLimit);
    if (totalPages === 0) totalPages = 1;

    return {
      data: {
        totalCount,
        totalPages,
        page,
        limit,
        receivables: filteredReceivables.slice(skip, skip + parsedLimit),
      },
      message: "Receivables retrieved successfully",
    };
  }

  /**
   * getSingleReceivable - Get a single receivable by ID.
   * @param {Object} req - The HTTP request object.
   * @param {Object} res - The HTTP response object.
   * @param {Function} next - The next middleware function for error handling.
   */
  async getSingleReceivable(req, res, next) {
    const { id } = req.params;
    const receivable = await Receivable.findById(id)
      .populate({
        path: "leadId",
        populate: [
          {
            path: "advisorId",
          },
          {
            path: "bankerId",
            populate: [
              { path: "city", model: "City" },
              { path: "bank", model: "Bank" },
            ]
          },
        ],
      })
      .populate("invoiceMasterId");

    if (!receivable) {
      return next(ErrorResponse.notFound("Receivable not found"));
    }
    if (!receivable.invoiceMasterId) {
      return next(ErrorResponse.notFound("Invoice master not found"));
    }

    const advisor = receivable.leadId?.advisorId;
    const advisorDisplayName = advisor
      ? advisor.advisorCode
        ? `${advisor.name} - ${advisor.advisorCode}`
        : advisor.name
      : null;

    const bankerDetails =
      receivable.leadId && receivable.leadId.bankerId
        ? receivable.leadId.bankerId
        : null;

    let totalAmount = 0;
    if (receivable.paymentAgainst === "receivableAmount") {
      totalAmount =
        (receivable.receivedAmount || 0) +
        (receivable.invoiceMasterId?.remainingReceivableAmount || 0);
    } else if (receivable.paymentAgainst === "gstPayment") {
      totalAmount =
        (receivable.receivedAmount || 0) +
        (receivable.invoiceMasterId?.remainingGstAmount || 0);
    }

    const receivableData = {
      ...receivable.toObject(),
      advisorDisplayName,
      bankerDetails,
      totalAmount,
    };

    return {
      data: receivableData,
      message: "Receivable retrieved successfully",
    };
  }

  /**
   * editReceivable - Update a receivable and update the amounts into the invoice master.
   * @param {Object} req - The HTTP request object.
   * @param {Object} res - The HTTP response object.
   * @param {Function} next - The next middleware function for error handling.
   */
  async editReceivable(req, res, next) {
    const { id } = req.params;

    const receivable = await Receivable.findById(id);
    if (!receivable) {
      return next(ErrorResponse.notFound("Receivable not found"));
    }

    const invoiceMaster = await InvoiceMaster.findById(
      receivable.invoiceMasterId,
    );
    if (!invoiceMaster) {
      return next(ErrorResponse.notFound("Invoice Master not found"));
    }

    const { receivedAmount, paidDate, refNo, remarks, totalAmount } = req.body;

    const oldReceivedAmount = receivable.receivedAmount;

    // Update standard editable fields
    if (paidDate !== undefined) receivable.paidDate = paidDate;
    if (refNo !== undefined) receivable.refNo = refNo;
    if (remarks !== undefined) receivable.remarks = remarks;
    receivable.receivableAmount = totalAmount;

    if (receivedAmount !== undefined && receivedAmount !== oldReceivedAmount) {
      if (receivedAmount < 0)
        return next(
          ErrorResponse.badRequest("Received amount cannot be negative"),
        );

      if (receivedAmount > totalAmount)
        return next(
          ErrorResponse.badRequest(
            "Received amount cannot exceed receivable amount",
          ),
        );

      const diff = receivedAmount - oldReceivedAmount;

      receivable.receivedAmount = receivedAmount;
      receivable.balanceAmount = Math.max(
        (receivable.receivableAmount || 0) - (receivedAmount || 0),
        0,
      );

      if (receivable.paymentAgainst === "receivableAmount") {
        invoiceMaster.remainingReceivableAmount = Math.max(
          (invoiceMaster.remainingReceivableAmount || 0) - diff,
          0,
        );
      } else if (receivable.paymentAgainst === "gstPayment") {
        invoiceMaster.remainingGstAmount = Math.max(
          (invoiceMaster.remainingGstAmount || 0) - diff,
          0,
        );
      }

      await invoiceMaster.save();
    }

    receivable.updatedBy = req.user.referenceId;
    await receivable.save();

    return {
      data: receivable,
      message: "Receivable updated successfully",
    };
  }

  /**
   * deleteReceivable - Delete a receivable and update the amounts into the invoice master.
   * @param {Object} req - The HTTP request object.
   * @param {Object} res - The HTTP response object.
   * @param {Function} next - The next middleware function for error handling.
   */
  async deleteReceivable(req, res, next) {
    const { id } = req.body;

    const receivable = await Receivable.findById(id);
    if (!receivable) {
      return next(ErrorResponse.notFound("Receivable not found"));
    }

    const invoiceMaster = await InvoiceMaster.findById(
      receivable.invoiceMasterId,
    );
    if (!invoiceMaster) {
      return next(ErrorResponse.notFound("Invoice Master not found"));
    }

    const { receivedAmount, paymentAgainst } = receivable;

    if (paymentAgainst === "receivableAmount") {
      invoiceMaster.remainingReceivableAmount =
        (invoiceMaster.remainingReceivableAmount || 0) + (receivedAmount || 0);
    } else if (paymentAgainst === "gstPayment") {
      invoiceMaster.remainingGstAmount =
        (invoiceMaster.remainingGstAmount || 0) + (receivedAmount || 0);
    }

    await invoiceMaster.save();
    await Receivable.findByIdAndDelete(id);

    return {
      message: "Receivable deleted successfully",
    };
  }
}

export default new ReceivableService();
