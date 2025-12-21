import mongoose from "mongoose";
import ErrorResponse from "../lib/error.res.js";
import AdvisorPayout from "../models/AdvisorPayout.model.js";
import Payables from "../models/Payables.model.js";

class PayablesService {
  /**
   * getLeadIdOfAllAdvisorPayouts - Get all leads whose advisor payouts are created.
   * @param {Object} req - The HTTP request object.
   * @param {Object} res - The HTTP response object.
   * @param {Function} next - The next middleware function for error handling.
   */
  async getLeadIdOfAllAdvisorPayouts(req, res, next) {
    const uniqueLeads = await AdvisorPayout.aggregate([
      {
        $match: {
          $or: [
            { remainingPayableAmount: { $gt: 0 } },
            { remainingGstAmount: { $gt: 0 } },
          ],
        },
      },
      { $group: { _id: "$leadId" } },
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
      message: "Advisor Payouts lead retrieved successfully",
    };
  }

  /**
   * getAdvisorsAssociatedWithPayout - Get all advisors associated with a specific payout.
   * @param {Object} req - The HTTP request object.
   * @param {Object} res - The HTTP response object.
   * @param {Function} next - The next middleware function for error handling.
   */
  async getAdvisorsAssociatedWithPayout(req, res, next) {
    const { leadId } = req.query;

    const payouts = await AdvisorPayout.find({ leadId })
      .populate("advisorId", "_id name")
      .select("_id advisorId");

    const advisors = payouts.map((payout) => ({
      advisorPayoutId: payout._id,
      advisorId: payout.advisorId?._id,
      name: payout.advisorId.name,
    }));

    return {
      data: advisors,
      message: "Advisors associated with Payout retrieved successfully",
    };
  }

  /**
   * addPayable - Add a new payable to the database and update the advisor payout.
   * @param {Object} req - The HTTP request object.
   * @param {Object} res - The HTTP response object.
   * @param {Function} next - The next middleware function for error handling.
   */
  async addPayable(req, res, next) {
    const {
      payoutId,
      leadId,
      advisorId,
      paymentAgainst,
      payableAmount,
      paidAmount,
      balanceAmount,
      paidDate,
      refNo,
      remarks,
    } = req.body;

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      if (paidAmount < 0)
        return next(ErrorResponse.badRequest("Paid amount cannot be negative"));

      if (!["payableAmount", "gstPayment"].includes(paymentAgainst))
        return next(ErrorResponse.badRequest("Invalid paymentAgainst value"));

      const employeeId = req.user.referenceId;

      const payout = await AdvisorPayout.findById(payoutId).session(session);
      if (!payout)
        return next(ErrorResponse.notFound("Advisor Payout not found"));

      const balanceAmountCalc =
        balanceAmount !== undefined
          ? balanceAmount
          : payableAmount - paidAmount;

      if (balanceAmountCalc < 0)
        return next(
          ErrorResponse.badRequest("Paid amount cannot exceed payable amount")
        );

      // const totalPaidAmountAfter = (payout.totalPaidAmount || 0) + paidAmount;
      // if (totalPaidAmountAfter > payout.netPayableAmount) {
      //   return ErrorResponse.badRequest(
      //     "Paid amount cannot exceed payable amount"
      //   );
      // }

      const payable = await Payables.create(
        [
          {
            payoutId,
            leadId,
            advisorId,
            paymentAgainst,
            payableAmount,
            paidAmount,
            balanceAmount: balanceAmountCalc,
            paidDate,
            refNo: refNo || null,
            remarks: remarks || null,
            createdBy: employeeId,
            updatedBy: employeeId,
          },
        ],
        { session }
      );

      if (paymentAgainst === "payableAmount") {
        payout.remainingPayableAmount = Math.max(
          (payout.remainingPayableAmount || 0) - paidAmount,
          0
        );
      } else if (paymentAgainst === "gstPayment") {
        payout.remainingGstAmount = Math.max(
          (payout.remainingGstAmount || 0) - paidAmount,
          0
        );
      }

      // payout.totalPaidAmount = (payout.totalPaidAmount || 0) + paidAmount;
      await payout.save({ session });

      await session.commitTransaction();
      return {
        data: payable,
        message: "Payable added successfully",
      };
    } catch (error) {
      await session.abortTransaction();
      return next(ErrorResponse.internalServer(error.message));
    } finally {
      session.endSession();
    }
  }

  /**
   * getAllPayables - Get all payables with filters.
   * @param {Object} req - The HTTP request object.
   * @param {Object} res - The HTTP response object.
   * @param {Function} next - The next middleware function for error handling.
   */
  async getAllPayables(req, res, next) {
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

    if (clientName) {
      filters.clientName = { $regex: clientName, $options: "i" };
    }

    if (productType) {
      filters.productType = { $regex: productType, $options: "i" };
    }

    const payables = await Payables.find(filters)
      .populate("advisorId")
      .populate("leadId")
      .sort({ createdAt: -1 });

    const filteredPayables = payables.filter((payable) => {
      if (advisorName) {
        return payable.advisorId.name
          .toLowerCase()
          .includes(advisorName.toLowerCase());
      }
      return true;
    });

    let totalCount = payables.length;
    if (filters.createdAt) {
      totalCount = filteredPayables.length;
    }

    let totalPages = Math.ceil(totalCount / parsedLimit);
    if (totalPages === 0) totalPages = 1;

    return {
      data: {
        totalCount,
        totalPages,
        page,
        limit,
        payables: filteredPayables.slice(skip, skip + parsedLimit),
      },
      message: "Payables retrieved successfully",
    };
  }

  /**
   * getSinglePayable - Get a single payable by ID.
   * @param {Object} req - The HTTP request object.
   * @param {Object} res - The HTTP response object.
   * @param {Function} next - The next middleware function for error handling.
   */
  async getSinglePayable(req, res, next) {
    const { id } = req.params;
    const payable = await Payables.findById(id)
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
      .populate("payoutId");
    if (!payable) {
      return next(ErrorResponse.notFound("Payable not found"));
    }
    if (!payable.payoutId) {
      return next(
        ErrorResponse.notFound("Advisor Payout not found or deleted")
      );
    }

    const advisorDisplayName = payable.advisorId
      ? payable.advisorId.advisorCode
        ? `${payable.advisorId.name} - ${payable.advisorId.advisorCode}`
        : payable.advisorId.name
      : null;

    const bankerDetails =
      payable.leadId && payable.leadId.bankerId
        ? payable.leadId.bankerId
        : null;

    let totalAmount = 0;
    if (payable.paymentAgainst === "payableAmount") {
      totalAmount =
        (payable.paidAmount || 0) +
        (payable.payoutId?.remainingPayableAmount || 0);
    } else if (payable.paymentAgainst === "gstPayment") {
      totalAmount =
        (payable.paidAmount || 0) + (payable.payoutId?.remainingGstAmount || 0);
    }
    const payableData = {
      ...payable.toObject(),
      advisorDisplayName,
      bankerDetails,
      totalAmount,
    };

    return {
      data: payableData,
      message: "Payable retrieved successfully",
    };
  }

  /**
   * editPayable - Update a payable and update the amounts into the advisor payout.
   * @param {Object} req - The HTTP request object.
   * @param {Object} res - The HTTP response object.
   * @param {Function} next - The next middleware function for error handling.
   */
  async editPayable(req, res, next) {
    const { id } = req.params;

    const payable = await Payables.findById(id);
    if (!payable) {
      return next(ErrorResponse.notFound("Payable not found"));
    }

    const payout = await AdvisorPayout.findById(payable.payoutId);
    if (!payout) {
      return next(ErrorResponse.notFound("Advisor Payout not found"));
    }

    const { paidAmount, paidDate, refNo, remarks, totalAmount } = req.body;

    const oldPaidAmount = payable.paidAmount;

    if (paidDate !== undefined) payable.paidDate = paidDate;
    if (refNo !== undefined) payable.refNo = refNo;
    if (remarks !== undefined) payable.remarks = remarks;
    payable.payableAmount = totalAmount;

    if (paidAmount !== undefined && paidAmount !== oldPaidAmount) {
      if (paidAmount < 0)
        return next(ErrorResponse.badRequest("Paid amount cannot be negative"));

      if (paidAmount > totalAmount)
        return next(
          ErrorResponse.badRequest("Paid amount cannot exceed payable amount")
        );

      const diff = paidAmount - oldPaidAmount;

      payable.paidAmount = paidAmount;
      payable.balanceAmount = Math.max(
        (payable.payableAmount || 0) - (paidAmount || 0),
        0
      );

      if (payable.paymentAgainst === "payableAmount") {
        payout.remainingPayableAmount = Math.max(
          (payout.remainingPayableAmount || 0) - diff,
          0
        );
      } else if (payable.paymentAgainst === "gstPayment") {
        payout.remainingGstAmount = Math.max(
          (payout.remainingGstAmount || 0) - diff,
          0
        );
      }

      // payout.totalPaidAmount = (payout.totalPaidAmount || 0) + diff;

      // if (payout.totalPaidAmount > payout.netPayableAmount) {
      //   return next(
      //     ErrorResponse.badRequest(
      //       `Total paid amount (₹${payout.totalPaidAmount}) cannot exceed Net Payable (₹${payout.netPayableAmount})`
      //     )
      //   );
      // }

      await payout.save();
    }
    payable.updatedBy = req.user.referenceId;
    await payable.save();

    return {
      data: payable,
      message: "Payable updated successfully",
    };
  }

  /**
   * deletePayable - Delete a payable and update the amounts into the advisor payout.
   * @param {Object} req - The HTTP request object.
   * @param {Object} res - The HTTP response object.
   * @param {Function} next - The next middleware function for error handling.
   */
  async deletePayable(req, res, next) {
    const { id } = req.body;
    const payable = await Payables.findById(id);
    if (!payable) {
      return next(ErrorResponse.notFound("Payable not found"));
    }

    const advisorPayout = await AdvisorPayout.findById(payable.payoutId);
    if (!advisorPayout) {
      return next(ErrorResponse.notFound("Advisor Payout not found"));
    }

    const { paidAmount, paymentAgainst } = payable;

    if (paymentAgainst === "payableAmount") {
      advisorPayout.remainingPayableAmount =
        (advisorPayout.remainingPayableAmount || 0) + paidAmount;
    } else if (paymentAgainst === "gstPayment") {
      advisorPayout.remainingGstAmount =
        (advisorPayout.remainingGstAmount || 0) + paidAmount;
    }

    await advisorPayout.save();

    await Payables.findByIdAndDelete(id);

    return {
      message: "Payable deleted successfully",
    };
  }

  // ADVISOR PANEL

  /**
   * getAdvisorPayout - Get all advisor payout details of the logged-in advisor.
   * @param {Object} req - The HTTP request object.
   * @param {Object} res - The HTTP response object.
   * @param {Function} next - The next middleware function for error handling.
   */
  async getAdvisorPayout(req, res, next) {
    const {
      productType,
      paymentStatus,
      fromDate,
      toDate,
      page = 1,
      limit = 1000,
    } = req.query;

    const parsedPage = parseInt(page, 10);
    const parsedLimit = parseInt(limit, 10);
    const skip = (parsedPage - 1) * parsedLimit;

    const filters = {
      advisorId: req.user.referenceId,
    };
    if (fromDate || toDate) {
      filters.createdAt = {};
      if (fromDate) filters.createdAt.$gte = new Date(fromDate);
      if (toDate) filters.createdAt.$lte = new Date(toDate);
    }

    const payables = await Payables.find(filters)
      .populate("advisorId")
      .populate("leadId")
      .sort({ createdAt: -1 });
    let processedPayables = payables.map((p) => {
      const payableObj = p.toObject();

      payableObj.status =
        payableObj.payableAmount > payableObj.paidAmount ? "Pending" : "Paid";

      return payableObj;
    });

    if (productType) {
      processedPayables = processedPayables.filter((p) =>
        p.leadId?.productType?.toLowerCase().includes(productType.toLowerCase())
      );
    }

    if (paymentStatus) {
      processedPayables = processedPayables.filter(
        (p) => p.status.toLowerCase() === paymentStatus.toLowerCase()
      );
    }

    const stats = processedPayables.reduce(
      (acc, curr) => {
        acc.totalDisbursal += curr.leadId?.loanRequirementAmount || 0;
        acc.totalPayout += curr.payableAmount || 0;
        acc.paidAmount += curr.paidAmount || 0;
        acc.pendingAmount += curr.payableAmount - curr.paidAmount;
        return acc;
      },
      { totalDisbursal: 0, totalPayout: 0, paidAmount: 0, pendingAmount: 0 }
    );

    const totalCount = processedPayables.length;
    const paginatedData = processedPayables.slice(skip, skip + parsedLimit);

    return {
      data: {
        stats, 
        totalCount,
        totalPages: Math.ceil(totalCount / parsedLimit) || 1,
        page: parsedPage,
        limit: parsedLimit,
        payables: paginatedData,
      },
      message: "Advisor payouts retrieved successfully",
    };
  }
}

export default new PayablesService();
