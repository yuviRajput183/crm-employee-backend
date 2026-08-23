import BankerCaseLocationDetails from "../models/BankerCaseLocationDetails.model.js";
import ConfirmationStage from "../models/ConfirmationStage.model.js";
import AccountLead from "../models/AccountLead.model.js";

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

  async getLeadStageDetails(req) {
    const { leadId } = req.params;
    
    const lead = await AccountLead.findById(leadId)
      .populate("bankerCaseLocationDetailsId")
      .populate("confirmationStageId");

    if (!lead) {
      throw new Error("Lead not found");
    }

    return { message: "Lead stage details fetched successfully", data: lead };
  }
}

export default new LeadStagesService();
