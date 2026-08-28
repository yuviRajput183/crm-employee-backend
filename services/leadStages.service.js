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
    );

    return { message: "Stage 1 Details saved successfully", data: updatedLead };
  }

  async saveConfirmationDetails(req) {
    const { leadId } = req.params;
    const { confirmationReceived, reason } = req.body;
    const userId = req.user.id;

    let pdfPath = "";
    let emlPath = "";
    if (req.files) {
      if (req.files.pdf && req.files.pdf.length > 0) {
        pdfPath = req.files.pdf[0].path;
      }
      if (req.files.eml && req.files.eml.length > 0) {
        emlPath = req.files.eml[0].path;
      }
    }

    const details = new ConfirmationStage({
      leadId,
      confirmationReceived,
      pdf: pdfPath,
      eml: emlPath,
      reason,
      createdBy: userId,
    });
    const savedDetails = await details.save();

    const newStatus = confirmationReceived === "Yes" ? "Confirmation Received" : "In Progress"; // Or whatever logic you have

    const updatedLead = await AccountLead.findByIdAndUpdate(
      leadId,
      {
        stageNumber: 3,
        confirmationStageId: savedDetails._id,
        status: newStatus
      },
      { new: true }
    );

    return { message: "Stage 2 Confirmation saved successfully", data: updatedLead };
  }

  async saveCaseReporting(req) {
    const { leadId } = req.params;
    const { reportedPayoutPercentageSame, reportedPayoutPercentage, totalPayoutAmount, reportedThrough } = req.body;

    const lead = await AccountLead.findById(leadId);
    if (!lead) throw new Error("Lead not found");

    const updates = {
      reportedThrough,
      status: "Ready to report",
      stageNumber: 5 // advance to next stage
    };

    if (reportedPayoutPercentageSame === 'No') {
      updates.reportedPayoutPercentage = Number(reportedPayoutPercentage);
      updates.totalPayoutAmount = Number(totalPayoutAmount);
    }

    const updatedLead = await AccountLead.findByIdAndUpdate(leadId, updates, { new: true });
    return { message: "Stage 4 Case Reporting saved successfully", data: updatedLead };
  }

  async uploadCalculationExcel(req) {
    const filePath = req.file.path;
    const workbook = xlsx.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const rows = xlsx.utils.sheet_to_json(sheet);

    let cpPercentage = 0, cpAmount = 0, selfPercentage = 0, selfAmount = 0;
    
    if (rows && rows.length > 0) {
      const firstRow = rows[0];
      for (const [key, val] of Object.entries(firstRow)) {
        const lowerKey = key.toLowerCase();
        if ((lowerKey.includes("cp") || lowerKey.includes("partner")) && lowerKey.includes("percent")) {
          cpPercentage = Number(val) || 0;
        } else if ((lowerKey.includes("cp") || lowerKey.includes("partner")) && lowerKey.includes("amount")) {
          cpAmount = Number(val) || 0;
        } else if (lowerKey.includes("self") && lowerKey.includes("percent")) {
          selfPercentage = Number(val) || 0;
        } else if (lowerKey.includes("self") && lowerKey.includes("amount")) {
          selfAmount = Number(val) || 0;
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

    const spInvoice = new SPInvoiceStage({
      leadId,
      invoiceType,
      calculationFile,
      calculationSameAsReported,
      reported,
      calculated,
      roundOffDifference,
      advisorPayoutPaid,
      createdBy: userId,
    });
    
    const savedInvoice = await spInvoice.save();
    let newStatus = "Invoiced";

    if (calculationSameAsReported === false && roundOffDifference === false) {
      if (advisorPayoutPaid) {
        const recovery = new RecoveryRequest({
          leadId,
          spInvoiceStageId: savedInvoice._id,
          reportedAmount: (reported?.channelPartnerAmount || 0) + (reported?.selfAmount || 0),
          calculatedAmount: (calculated?.channelPartnerAmount || 0) + (calculated?.selfAmount || 0),
          paidAmount: payout.payoutAmount || 0,
          recoveryAmount: Math.abs((payout.payoutAmount || 0) - ((calculated?.channelPartnerAmount || 0) + (calculated?.selfAmount || 0))),
          createdBy: userId
        });
        await recovery.save();
        newStatus = "Recovery Required";
      } else if (payout) {
        payout.payoutPercent = (calculated?.channelPartnerPercentage || 0) + (calculated?.selfPercentage || 0);
        payout.payoutAmount = (calculated?.channelPartnerAmount || 0) + (calculated?.selfAmount || 0);
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
    );

    return { message: "SP Invoice Stage saved successfully", data: updatedLead };
  }

  async getLeadStageDetails(req) {
    const { leadId } = req.params;
    
    const lead = await AccountLead.findById(leadId)
      .populate("bankerCaseLocationDetailsId")
      .populate("confirmationStageId")
      .populate("spInvoiceStageId");

    if (!lead) {
      throw new Error("Lead not found");
    }

    return { message: "Lead stage details fetched successfully", data: lead };
  }
}

export default new LeadStagesService();
