import ErrorResponse from "../lib/error.res.js";
import AdvisorPayout from "../models/AdvisorPayout.model.js";
import Lead from "../models/Lead.model.js";

class AdvisorPayoutService {
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
      customerName,
      loanServiceType,
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

    const newPayout = new AdvisorPayout({
        leadId,
        advisorId,
        customerName,
        loanServiceType,
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
    })

    await newPayout.save();

    await Lead.findByIdAndUpdate(leadId, { finalPayout})

    return {
        data: newPayout,
        message: "Advisor Payout added successfully",
    }
  }

  async getAllAdvisorPayouts(req, res, next) {
    const { loanServiceType, advisorName, customerName, from_date, to_date } = req.query;
  }
}

export default new AdvisorPayoutService();
