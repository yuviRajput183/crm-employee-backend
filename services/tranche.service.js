import AccountLead from "../models/AccountLead.model.js";
import Tranche from "../models/Tranche.model.js";
import Counter from "../models/Counter.model.js";

class TrancheService {
  async getLeadTranches(leadId) {
    const lead = await AccountLead.findById(leadId).populate('location product bank serviceProvider');
    if (!lead) {
      throw new Error("Account Lead not found");
    }

    // Initialize remaining amount if it's the first time
    if (!lead.trancheRemainingAmount && lead.trancheFoundAmount === 0 && lead.reportedLoanAmount) {
        lead.trancheRemainingAmount = lead.reportedLoanAmount;
        await lead.save();
    }

    const tranches = await Tranche.find({ leadId: lead._id }).sort({ createdAt: 1 });

    return {
      lead,
      tranches
    };
  }

  async addTranches(leadId, tranches, isFullCaseFound, user) {
    const lead = await AccountLead.findById(leadId);
    if (!lead) {
      throw new Error("Account Lead not found");
    }

    if (!tranches || !Array.isArray(tranches) || tranches.length === 0) {
      throw new Error("Tranches data is required");
    }

    const currentFoundAmount = lead.trancheFoundAmount || 0;
    const totalCaseAmount = lead.reportedLoanAmount || 0;

    const newTranchesTotal = tranches.reduce((sum, t) => {
        return (t.status === 'PENDING') ? sum : sum + Number(t.amount);
    }, 0);
    const newTotalFound = currentFoundAmount + newTranchesTotal;

    if (newTotalFound > totalCaseAmount) {
      throw new Error("Total tranche amount cannot exceed the case amount.");
    }

    if (isFullCaseFound && newTotalFound !== totalCaseAmount) {
      throw new Error(`Full case cannot be marked as found because ₹${totalCaseAmount - newTotalFound} is still remaining.`);
    }

    const existingTranches = await Tranche.find({ leadId: lead._id });
    let nextTrancheNumber = existingTranches.length + 1;

    const createdTranches = [];

    for (let t of tranches) {
      const counter = await Counter.findOneAndUpdate(
        { name: "paymentUid" },
        { $inc: { seq: 1 } },
        { new: true, upsert: true }
      );
      
      const pUid = `P${counter.seq + 10000}`;

      const newTranche = new Tranche({
        leadId: lead._id,
        trancheNumber: nextTrancheNumber++,
        amount: Number(t.amount),
        spUid: t.spUid,
        paymentUid: pUid,
        status: t.status || 'FOUND',
        foundDate: t.foundDate || Date.now(),
        foundMonth: t.foundMonth,
        createdBy: user?.referenceId || user?._id
      });

      await newTranche.save();
      createdTranches.push(newTranche);
      lead.tranchesIds.push(newTranche._id);
    }

    lead.trancheFoundAmount = newTotalFound;
    lead.trancheRemainingAmount = totalCaseAmount - newTotalFound;
    
    lead.status = newTotalFound === totalCaseAmount ? "CASE_FOUND" : "PART_CASE_FOUND";

    if (lead.stageNumber === 3 && newTotalFound === totalCaseAmount) {
        lead.stageNumber = 4;
    }

    await lead.save();

    return {
      lead,
      createdTranches
    };
  }

  async getAllTranches() {
    return await Tranche.find().populate('leadId', 'leadNo caseName').sort({ createdAt: -1 });
  }
}

export default new TrancheService();
