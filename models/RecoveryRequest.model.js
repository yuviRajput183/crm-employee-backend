import mongoose from "mongoose";

const recoveryRequestSchema = new mongoose.Schema(
  {
    leadId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "AccountLead",
      required: true,
    },
    spInvoiceStageId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "SPInvoiceStage",
      required: true,
    },
    reason: {
      type: String,
      default: "CALCULATION_DIFFERENCE_AFTER_PAYOUT",
    },
    reportedAmount: {
      type: Number,
    },
    calculatedAmount: {
      type: Number,
    },
    paidAmount: {
      type: Number,
    },
    recoveryAmount: {
      type: Number,
    },
    status: {
      type: String,
      enum: ["PENDING_ADMIN_REVIEW", "RESOLVED"],
      default: "PENDING_ADMIN_REVIEW",
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee",
    }
  },
  {
    timestamps: true,
  }
);

const RecoveryRequest =
  mongoose.models.RecoveryRequest || mongoose.model("RecoveryRequest", recoveryRequestSchema);

export default RecoveryRequest;
