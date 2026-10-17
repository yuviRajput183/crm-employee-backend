import ReportedBundle from "../models/ReportedBundle.model.js";
import AccountLead from "../models/AccountLead.model.js";
import Tranche from "../models/Tranche.model.js";
import SuccessResponse from "../lib/success.res.js";
import ErrorResponse from "../lib/error.res.js";

export const createReportedBundle = async (req, res, next) => {
  try {
    const { leadIds, selectedTrancheIds = [], bundleDate } = req.body;

    if (!leadIds || !Array.isArray(leadIds) || leadIds.length === 0) {
      return next(ErrorResponse.badRequest("Please select at least one lead to export and bundle."));
    }

    const dateObj = bundleDate ? new Date(bundleDate) : new Date();
    const day = String(dateObj.getDate()).padStart(2, '0');
    const month = String(dateObj.getMonth() + 1).padStart(2, '0');
    const year = dateObj.getFullYear();
    const formattedDate = `${day}-${month}-${year}`;

    const baseName = `Cases Reported on ${formattedDate}`;

    // Find any existing bundles with the same base name to assign suffix if needed
    const regex = new RegExp(`^Cases Reported on ${formattedDate}`);
    const existingCount = await ReportedBundle.countDocuments({ bundleName: regex });
    const bundleName = existingCount === 0 ? baseName : `${baseName} (${existingCount + 1})`;

    // Fetch the leads
    const leads = await AccountLead.find({ _id: { $in: leadIds } });
    if (leads.length === 0) {
      return next(ErrorResponse.notFound("None of the selected leads were found."));
    }

    // Calculate total amount
    let totalAmount = 0;
    if (selectedTrancheIds && selectedTrancheIds.length > 0) {
      const tranches = await Tranche.find({ _id: { $in: selectedTrancheIds } });
      const trancheSum = tranches.reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
      
      // For leads that did not have tranches selected, add their reportedLoanAmount
      const leadsWithSelectedTranches = new Set(tranches.map(t => String(t.leadId)));
      const leadsWithoutTranchesSum = leads
        .filter(l => !leadsWithSelectedTranches.has(String(l._id)))
        .reduce((sum, l) => sum + (Number(l.reportedLoanAmount) || 0), 0);

      totalAmount = trancheSum + leadsWithoutTranchesSum;
    } else {
      totalAmount = leads.reduce((sum, l) => sum + (Number(l.reportedLoanAmount) || 0), 0);
    }

    const newBundle = new ReportedBundle({
      bundleName,
      reportedDate: dateObj,
      leads: leads.map(l => l._id),
      selectedTrancheIds: selectedTrancheIds || [],
      totalAmount,
      totalCases: leads.length,
      createdBy: req.user?.id || req.user?._id,
    });

    await newBundle.save();

    // When leads come first time in Reported Leads tab, their status is "Ready to report"
    // with bundleId set so they move from In Progress to Reported Leads tab
    await AccountLead.updateMany(
      { _id: { $in: leadIds } },
      {
        $set: {
          status: "Ready to report",
          bundleId: newBundle._id,
          reportedAt: dateObj,
          stageNumber: 4,
        },
      }
    );

    if (selectedTrancheIds && selectedTrancheIds.length > 0) {
      await Tranche.updateMany(
        { _id: { $in: selectedTrancheIds } },
        { $set: { bundleId: newBundle._id } }
      );
    } else {
      await Tranche.updateMany(
        { leadId: { $in: leadIds } },
        { $set: { bundleId: newBundle._id } }
      );
    }

    return SuccessResponse.created(res, "Reported bundle created successfully", newBundle);
  } catch (error) {
    return next(ErrorResponse.internalServer(error.message));
  }
};

export const getAllReportedBundles = async (req, res, next) => {
  try {
    const bundles = await ReportedBundle.find()
      .populate({
        path: "leads",
        populate: [
          { path: "location", select: "name" },
          { path: "product", select: "name" },
          { path: "bank", select: "name bankName" },
          { path: "serviceProvider", select: "legalName code dealPercentage" },
        ],
      })
      .populate("createdBy", "name username")
      .sort({ createdAt: -1 })
      .lean();

    // Attach tranches to each lead in each bundle
    for (let bundle of bundles) {
      if (bundle.leads && bundle.leads.length > 0) {
        for (let lead of bundle.leads) {
          const tranches = await Tranche.find({ leadId: lead._id }).lean();
          lead.tranches = tranches || [];
        }
      }
    }

    return SuccessResponse.ok(res, "Reported bundles fetched successfully", bundles);
  } catch (error) {
    return next(ErrorResponse.internalServer(error.message));
  }
};

export const getReportedBundleById = async (req, res, next) => {
  try {
    const bundle = await ReportedBundle.findById(req.params.id)
      .populate({
        path: "leads",
        populate: [
          { path: "location", select: "name" },
          { path: "product", select: "name" },
          { path: "bank", select: "name bankName" },
          { path: "serviceProvider", select: "legalName code dealPercentage" },
        ],
      })
      .populate("createdBy", "name username")
      .lean();

    if (!bundle) {
      return next(ErrorResponse.notFound("Reported bundle not found"));
    }

    if (bundle.leads && bundle.leads.length > 0) {
      for (let lead of bundle.leads) {
        const tranches = await Tranche.find({ leadId: lead._id }).lean();
        lead.tranches = tranches || [];
      }
    }

    return SuccessResponse.ok(res, "Reported bundle fetched successfully", bundle);
  } catch (error) {
    return next(ErrorResponse.internalServer(error.message));
  }
};

// Accept a single lead in a bundle -> status changes to "Reported"
export const acceptLeadInBundle = async (req, res, next) => {
  try {
    const { bundleId, leadId } = req.params;

    const bundle = await ReportedBundle.findById(bundleId);
    if (!bundle) {
      return next(ErrorResponse.notFound("Reported bundle not found"));
    }

    const lead = await AccountLead.findById(leadId);
    if (!lead) {
      return next(ErrorResponse.notFound("Account lead not found"));
    }

    lead.status = "Reported";
    lead.updatedBy = req.user?.id || req.user?._id;
    await lead.save();

    return SuccessResponse.ok(res, "Lead accepted successfully! Status changed to Reported.", lead);
  } catch (error) {
    return next(ErrorResponse.internalServer(error.message));
  }
};

// Reject a single lead in a bundle -> status remains "Ready to report", removed from bundle and Reported Leads tab
export const rejectLeadInBundle = async (req, res, next) => {
  try {
    const { bundleId, leadId } = req.params;

    const bundle = await ReportedBundle.findById(bundleId);
    if (!bundle) {
      return next(ErrorResponse.notFound("Reported bundle not found"));
    }

    const lead = await AccountLead.findById(leadId);
    if (!lead) {
      return next(ErrorResponse.notFound("Account lead not found"));
    }

    lead.status = "Ready to report";
    lead.bundleId = null;
    lead.reportedAt = null;
    lead.updatedBy = req.user?.id || req.user?._id;
    await lead.save();

    await Tranche.updateMany(
      { leadId: lead._id, bundleId: bundle._id },
      { $set: { bundleId: null } }
    );

    // 2. Remove lead from bundle
    bundle.leads = bundle.leads.filter(id => String(id) !== String(leadId));

    // Also remove any tranches belonging to this lead from selectedTrancheIds
    const leadTranches = await Tranche.find({ leadId: lead._id });
    const leadTrancheIdStrings = new Set(leadTranches.map(t => String(t._id)));
    if (bundle.selectedTrancheIds && bundle.selectedTrancheIds.length > 0) {
      bundle.selectedTrancheIds = bundle.selectedTrancheIds.filter(id => !leadTrancheIdStrings.has(String(id)));
    }

    bundle.totalCases = bundle.leads.length;

    // If no leads remain in the bundle, delete the empty bundle
    if (bundle.leads.length === 0) {
      await ReportedBundle.findByIdAndDelete(bundle._id);
      return SuccessResponse.ok(res, "Lead rejected and returned to In Progress Leads. Empty bundle removed.", {
        bundleDeleted: true,
        leadId
      });
    }

    // Recalculate bundle totalAmount for remaining leads
    const remainingLeads = await AccountLead.find({ _id: { $in: bundle.leads } });
    let newTotalAmount = 0;
    if (bundle.selectedTrancheIds && bundle.selectedTrancheIds.length > 0) {
      const tranches = await Tranche.find({ _id: { $in: bundle.selectedTrancheIds } });
      const trancheSum = tranches.reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
      const leadsWithSelectedTranches = new Set(tranches.map(t => String(t.leadId)));
      const leadsWithoutTranchesSum = remainingLeads
        .filter(l => !leadsWithSelectedTranches.has(String(l._id)))
        .reduce((sum, l) => sum + (Number(l.reportedLoanAmount) || 0), 0);

      newTotalAmount = trancheSum + leadsWithoutTranchesSum;
    } else {
      newTotalAmount = remainingLeads.reduce((sum, l) => sum + (Number(l.reportedLoanAmount) || 0), 0);
    }

    bundle.totalAmount = newTotalAmount;
    await bundle.save();

    return SuccessResponse.ok(res, "Lead rejected successfully and returned to In Progress Leads.", {
      bundleDeleted: false,
      bundle,
      leadId
    });
  } catch (error) {
    return next(ErrorResponse.internalServer(error.message));
  }
};

// Accept all leads in a bundle
export const acceptAllLeadsInBundle = async (req, res, next) => {
  try {
    const { bundleId } = req.params;

    const bundle = await ReportedBundle.findById(bundleId);
    if (!bundle) {
      return next(ErrorResponse.notFound("Reported bundle not found"));
    }

    await AccountLead.updateMany(
      { _id: { $in: bundle.leads } },
      {
        $set: {
          status: "Reported",
          updatedBy: req.user?.id || req.user?._id
        }
      }
    );

    return SuccessResponse.ok(res, "All leads in this bundle have been accepted! Status changed to Reported.");
  } catch (error) {
    return next(ErrorResponse.internalServer(error.message));
  }
};
