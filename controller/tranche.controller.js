import TrancheService from "../services/tranche.service.js";
import SuccessResponse from "../lib/success.res.js";
import ErrorResponse from "../lib/error.res.js";

// Fetch lead details and associated tranches by leadId (_id)
export const getLeadTranches = async (req, res, next) => {
  try {
    const { leadId } = req.params;
    const data = await TrancheService.getLeadTranches(leadId);
    
    // Maintain old response shape for frontend
    res.status(200).json({
      success: true,
      data
    });
  } catch (error) {
    // If standard error is thrown, format it nicely or pass to next
    if (error.message === "Account Lead not found") {
      return res.status(404).json({ success: false, message: error.message });
    }
    next(error);
  }
};

// Add new tranches
export const addTranches = async (req, res, next) => {
  try {
    const { leadId } = req.params;
    const { tranches, isFullCaseFound } = req.body;

    const data = await TrancheService.addTranches(leadId, tranches, isFullCaseFound, req.user);

    res.status(201).json({
      success: true,
      message: "Tranches added successfully",
      data
    });
  } catch (error) {
    if (error.message.includes("not found") || error.message.includes("exceed") || error.message.includes("remaining") || error.message.includes("required")) {
      return res.status(400).json({ success: false, message: error.message });
    }
    next(error);
  }
};

export const getAllTranches = async (req, res, next) => {
  try {
    const data = await TrancheService.getAllTranches();
    res.status(200).json({ success: true, data });
  } catch (error) {
    next(error);
  }
};
