import ErrorResponse from "../lib/error.res.js";
import Employee from "../models/Employee.model.js";
import ProcessedBy from "../models/ProcessedBy.model.js";

class ProcessedByService {
  async addProcessedBy(req, res, next) {
    const { processedBy } = req.body;
    const userId = req.user.referenceId;

    const currentUser = await Employee.findById(userId);
    if (!currentUser) {
      return next(ErrorResponse.notFound("Employee not found"));
    }

    const existing = await ProcessedBy.findOne({
      processedBy: processedBy.trim(),
      createdBy: currentUser.groupId,
    });

    if (existing) {
      return next(ErrorResponse.badRequest("Processed By name already exists"));
    }

    const processBy = await ProcessedBy.create({
      processedBy: processedBy.trim(),
      createdBy: currentUser.groupId,
    });

    return {
      data: processBy,
      message: "Processed By name added successfully",
    };
  }

  async listProcessedBy(req, res, next) {
    const userId = req.user.referenceId;
    const currentUser = await Employee.findById(userId);
    if (!currentUser) {
      return next(ErrorResponse.notFound("Employee not found"));
    }

    const processedBys = await ProcessedBy.find({
      createdBy: currentUser.groupId,
    }).sort({ processedBy: 1 });

    return {
      data: processedBys,
      message: "ProcessedBy list fetched successfully",
    };
  }

  async editProcessedBy(req, res, next) {
    const { processedById, processedBy } = req.body;
    const userId = req.user.referenceId;

    const currentUser = await Employee.findById(userId);
    if (!currentUser) {
      return next(ErrorResponse.notFound("Employee not found"));
    }

    const processBy = await ProcessedBy.findOne({
      _id: processedById,
      createdBy: currentUser.groupId,
    });

    if (!processBy) {
      return next(
        ErrorResponse.notFound("ProcessedBy not found or access denied")
      );
    }

    // Check for duplicate name in the group (excluding current record)
    const existing = await ProcessedBy.findOne({
      _id: { $ne: processedById },
      processedBy: processedBy.trim(),
      createdBy: currentUser.groupId,
    });

    if (existing) {
      return next(
        ErrorResponse.badRequest("ProcessedBy with this name already exists")
      );
    }

    processBy.processedBy = processedBy.trim();
    await processBy.save();

    return {
      data: processBy,
      message: "ProcessedBy updated successfully",
    };
  }
}

export default new ProcessedByService();
