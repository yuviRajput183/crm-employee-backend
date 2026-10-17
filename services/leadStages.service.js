import BankerCaseLocationDetails from "../models/BankerCaseLocationDetails.model.js";
import ConfirmationStage from "../models/ConfirmationStage.model.js";
import AccountLead from "../models/AccountLead.model.js";
import SPInvoiceStage from "../models/SPInvoiceStage.model.js";
import RecoveryRequest from "../models/RecoveryRequest.model.js";
import AdvisorPayout from "../models/AdvisorPayout.model.js";
import xlsx from "xlsx";

class LeadStagesService {
  async saveBankerDetails(req) {
    const { leadId } = req.params;
    const { stateName, cityId, bankerId } = req.body;
    const userId = req.user.id;

    const details = new BankerCaseLocationDetails({
      leadId,
      stateName,
      cityId,
      bankerId,
      createdBy: userId,
    });
    const savedDetails = await details.save();

    const updatedLead = await AccountLead.findByIdAndUpdate(
      leadId,
      {
        stageNumber: 2,
        bankerCaseLocationDetailsId: savedDetails._id,
        bankerId: bankerId,
      },
      { new: true }
    )
      .populate("bankerCaseLocationDetailsId")
      .populate("confirmationStageId")
      .populate("spInvoiceStageId")
      .populate("serviceProvider");

    return { message: "Stage 1 Details saved successfully", data: updatedLead };
  }

  async saveConfirmationDetails(req) {
    const { leadId } = req.params;
    const { confirmationReceived, reason } = req.body;
    const userId = req.user.id;

    const lead = await AccountLead.findById(leadId).populate("confirmationStageId");
    if (!lead) throw new Error("Lead not found");

    let pdfPath = lead?.confirmationStageId?.pdf || "";
    let emlPath = lead?.confirmationStageId?.eml || "";
    
    if (req.files) {
      if (req.files.pdf && req.files.pdf.length > 0) {
        pdfPath = req.files.pdf[0].path;
      }
      if (req.files.eml && req.files.eml.length > 0) {
        emlPath = req.files.eml[0].path;
      }
    }

    if (confirmationReceived === "Yes" && !pdfPath && !emlPath) {
        throw new Error("Both PDF and EML files are mandatory to upload.");
    }

    let savedDetails;
    if (lead.confirmationStageId) {
      lead.confirmationStageId.confirmationReceived = confirmationReceived;
      lead.confirmationStageId.pdf = pdfPath;
      lead.confirmationStageId.eml = emlPath;
      lead.confirmationStageId.reason = reason;
      lead.confirmationStageId.updatedBy = userId;
      savedDetails = await lead.confirmationStageId.save();
    } else {
      const details = new ConfirmationStage({
        leadId,
        confirmationReceived,
        pdf: pdfPath,
        eml: emlPath,
        reason,
        createdBy: userId,
      });
      savedDetails = await details.save();
    }

    const newStatus = confirmationReceived === "Yes" ? "Confirmation Received" : "In Progress"; // Or whatever logic you have

    const updatedLead = await AccountLead.findByIdAndUpdate(
      leadId,
      {
        stageNumber: 3,
        confirmationStageId: savedDetails._id,
        status: newStatus
      },
      { new: true }
    )
      .populate("bankerCaseLocationDetailsId")
      .populate("confirmationStageId")
      .populate("spInvoiceStageId")
      .populate("serviceProvider");

    return { message: "Stage 2 Confirmation saved successfully", data: updatedLead };
  }

  async saveCaseReporting(req) {
    const { leadId } = req.params;
    const { reportedPayoutPercentageSame, reportedPayoutPercentage, totalPayoutAmount, reportedThrough } = req.body;

    const lead = await AccountLead.findById(leadId);
    if (!lead) throw new Error("Lead not found");

    const originalPct = lead.originalReportedPayoutPercentage !== undefined && lead.originalReportedPayoutPercentage !== null
      ? lead.originalReportedPayoutPercentage
      : lead.reportedPayoutPercentage;
    const originalAmt = lead.originalTotalPayoutAmount !== undefined && lead.originalTotalPayoutAmount !== null
      ? lead.originalTotalPayoutAmount
      : lead.totalPayoutAmount;

    const newStatus = lead.status === "Reported" ? "Reported" : (lead.status || "Ready to report");

    const updates = {
      reportedThrough,
      reportedPayoutPercentageSame,
      originalReportedPayoutPercentage: originalPct,
      originalTotalPayoutAmount: originalAmt,
      status: newStatus,
      stageNumber: 5 // advance to next stage
    };

    if (reportedPayoutPercentageSame === 'No') {
      updates.reportedPayoutPercentage = Number(reportedPayoutPercentage);
      updates.totalPayoutAmount = Number(totalPayoutAmount);
    } else {
      updates.reportedPayoutPercentage = originalPct;
      updates.totalPayoutAmount = originalAmt;
    }

    const updatedLead = await AccountLead.findByIdAndUpdate(leadId, updates, { new: true })
      .populate("bankerCaseLocationDetailsId")
      .populate("confirmationStageId")
      .populate("spInvoiceStageId")
      .populate("serviceProvider");
    return { message: "Stage 4 Case Reporting saved successfully", data: updatedLead };
  }

  async uploadCalculationExcel(req) {
    const filePath = req.file.path;
    const workbook = xlsx.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const rows = xlsx.utils.sheet_to_json(sheet);

    let cpPercentage = null, cpAmount = null, selfPercentage = null, selfAmount = null;

    const parseNum = (val) => {
      if (val === undefined || val === null || val === '') return null;
      const cleaned = String(val).replace(/[^0-9.-]/g, '');
      const parsed = parseFloat(cleaned);
      return isNaN(parsed) ? null : parsed;
    };
    
    if (rows && rows.length > 0) {
      const firstRow = rows[0];
      for (const [key, val] of Object.entries(firstRow)) {
        const lowerKey = key.toLowerCase();
        const isPercent = lowerKey.includes("percent") || lowerKey.includes("%") || lowerKey.includes("pct") || lowerKey.includes("rate");
        const isAmount = lowerKey.includes("amount") || lowerKey.includes("amt") || lowerKey.includes("₹") || lowerKey.includes("rs") || lowerKey.includes("payout") || lowerKey.includes("total");
        const isCP = lowerKey.includes("cp") || lowerKey.includes("partner") || lowerKey.includes("broker") || lowerKey.includes("dsa");
        const isSelf = lowerKey.includes("self") || lowerKey.includes("rkpl") || lowerKey.includes("company");

        const parsedVal = parseNum(val);

        if (isCP && isPercent && cpPercentage === null) {
          cpPercentage = parsedVal;
        } else if (isCP && isAmount && cpAmount === null) {
          cpAmount = parsedVal;
        } else if (isSelf && isPercent && selfPercentage === null) {
          selfPercentage = parsedVal;
        } else if (isSelf && isAmount && selfAmount === null) {
          selfAmount = parsedVal;
        }
      }
    }

    return { 
      message: "Calculation processed", 
      data: {
        fileName: req.file.originalname,
        filePath: req.file.path,
        calculated: {
          channelPartnerPercentage: cpPercentage,
          channelPartnerAmount: cpAmount,
          selfPercentage: selfPercentage,
          selfAmount: selfAmount
        }
      } 
    };
  }

  async saveSPInvoiceStage(req) {
    const { leadId } = req.params;
    const {
      invoiceType,
      calculationFile,
      calculationSameAsReported,
      roundOffDifference,
      remainingAmountWillCome,
      remainingTrancheAmount,
      reported,
      calculated
    } = req.body;
    const userId = req.user.id;

    const lead = await AccountLead.findById(leadId).populate("confirmationStageId");
    if (!lead) throw new Error("Lead not found");

    if (invoiceType === "On Confirmation") {
      if (!lead.confirmationStageId || lead.confirmationStageId.confirmationReceived !== "Yes") {
        throw new Error("On Confirmation invoice cannot be raised because confirmation has not been received.");
      }
    }

    const payout = await AdvisorPayout.findOne({ leadId });
    const advisorPayoutPaid = payout ? (payout.finalPayout === true) : false;

    let createdNewTranche = null;

    if (calculationSameAsReported === false && remainingAmountWillCome === true) {
      const Tranche = (await import("../models/Tranche.model.js")).default;
      const Counter = (await import("../models/Counter.model.js")).default;

      const counter = await Counter.findOneAndUpdate(
        { name: "paymentUid" },
        { $inc: { seq: 1 } },
        { new: true, upsert: true }
      );
      const pUid = `P${counter.seq + 10000}`;

      const existingTranches = await Tranche.find({ leadId: lead._id }).sort({ createdAt: 1 });
      const subTranches = existingTranches.filter(t => t.customTrancheId && /\.[a-z]$/i.test(t.customTrancheId));
      const letter = String.fromCharCode(97 + subTranches.length); // 'a', 'b', 'c'...
      
      let baseNumber = "1.1";
      if (existingTranches.length > 0) {
        const firstTranche = existingTranches[0];
        baseNumber = `1.${firstTranche.trancheNumber || 1}`;
      }
      const customTrancheId = `${baseNumber}.${letter}`;

      const repAmt = (reported?.channelPartnerAmount || 0) > 0 ? (reported?.channelPartnerAmount || 0) : (reported?.selfAmount || 0);
      const calcAmt = (reported?.channelPartnerAmount || 0) > 0 ? (calculated?.channelPartnerAmount || 0) : (calculated?.selfAmount || 0);
      // const repSelfAmt = Number(reported?.selfAmount) || 0;
      // const calcSelfAmt = Number(calculated?.selfAmount) || 0;
      const amountToUse = Number(remainingTrancheAmount) > 0 
        ? Number(remainingTrancheAmount) 
        : Math.max(0, Number((repAmt - calcAmt).toFixed(2)));

      createdNewTranche = new Tranche({
        leadId: lead._id,
        trancheNumber: existingTranches.length + 1,
        customTrancheId,
        amount: amountToUse,
        paymentUid: pUid,
        status: "FOUND",
        bundleId: null, // explicitly unbundled so it appears in In Progress
        foundDate: new Date(),
        createdBy: userId
      });
      await createdNewTranche.save();

      lead.tranchesIds.push(createdNewTranche._id);
      await lead.save();
    }

    const spInvoice = new SPInvoiceStage({
      leadId,
      invoiceType,
      calculationFile,
      calculationSameAsReported,
      roundOffDifference,
      remainingAmountWillCome: !!remainingAmountWillCome,
      remainingTrancheAmount: createdNewTranche ? createdNewTranche.amount : 0,
      remainingTrancheId: createdNewTranche ? createdNewTranche._id : null,
      reported,
      calculated,
      advisorPayoutPaid,
      createdBy: userId,
    });
    
    const savedInvoice = await spInvoice.save();
    let newStatus = "Invoiced";

    if (calculationSameAsReported === false && remainingAmountWillCome !== true && roundOffDifference === false) {
      const repAmt = (reported?.channelPartnerAmount || 0) > 0 ? (reported?.channelPartnerAmount || 0) : (reported?.selfAmount || 0);
      const calcAmt = (reported?.channelPartnerAmount || 0) > 0 ? (calculated?.channelPartnerAmount || 0) : (calculated?.selfAmount || 0);
      if (advisorPayoutPaid) {
        const recovery = new RecoveryRequest({
          leadId,
          spInvoiceStageId: savedInvoice._id,
          reportedAmount: repAmt,
          calculatedAmount: calcAmt,
          paidAmount: payout.payoutAmount || 0,
          recoveryAmount: Math.abs((payout.payoutAmount || 0) - calcAmt),
          createdBy: userId
        });
        await recovery.save();
        newStatus = "Recovery Required";
      } else if (payout) {
        payout.payoutPercent = (calculated?.channelPartnerPercentage || 0) > 0 ? (calculated?.channelPartnerPercentage || 0) : (calculated?.selfPercentage || 0);
        payout.payoutAmount = calcAmt;
        await payout.save();
      }
    }

    const updatedLead = await AccountLead.findByIdAndUpdate(
      leadId,
      {
        stageNumber: 6,
        spInvoiceStageId: savedInvoice._id,
        status: newStatus
      },
      { new: true }
    )
      .populate("bankerCaseLocationDetailsId")
      .populate("confirmationStageId")
      .populate("spInvoiceStageId")
      .populate("serviceProvider");

    return { 
      message: "SP Invoice Stage saved successfully", 
      data: {
        lead: updatedLead,
        newTranche: createdNewTranche,
        status: newStatus
      }
    };
  }

  async getLeadStageDetails(req) {
    const { leadId } = req.params;
    
    let lead = await AccountLead.findById(leadId)
      .populate("bankerCaseLocationDetailsId")
      .populate("confirmationStageId")
      .populate("spInvoiceStageId")
      .populate("serviceProvider");

    if (!lead) {
      throw new Error("Lead not found");
    }

    if (lead.originalReportedPayoutPercentage === undefined || lead.originalReportedPayoutPercentage === null) {
      lead.originalReportedPayoutPercentage = lead.reportedPayoutPercentage;
      lead.originalTotalPayoutAmount = lead.totalPayoutAmount;
      await AccountLead.findByIdAndUpdate(leadId, {
        originalReportedPayoutPercentage: lead.reportedPayoutPercentage,
        originalTotalPayoutAmount: lead.totalPayoutAmount
      });
    }

    return { message: "Lead stage details fetched successfully", data: lead };
  }
}

export default new LeadStagesService();
