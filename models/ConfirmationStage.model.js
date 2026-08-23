import mongoose from "mongoose";

const confirmationStageSchema = new mongoose.Schema({
  leadId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Lead",
    required: true,
  },
  confirmationReceived: {
    type: String,
    enum: ["Yes", "No"],
    required: true,
  },
  pdf: {
    type: String,
  },
  eml: {
    type: String,
  },
  reason: {
    type: String,
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Employee",
    required: true,
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Employee",
  }
}, {
  timestamps: true
});

const ConfirmationStage = mongoose.models.ConfirmationStage || mongoose.model("ConfirmationStage", confirmationStageSchema);

export default ConfirmationStage;
