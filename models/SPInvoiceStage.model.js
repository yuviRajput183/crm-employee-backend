import mongoose from "mongoose";

const spInvoiceStageSchema = new mongoose.Schema(
  {
    leadId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "AccountLead",
      required: true,
    },
    invoiceType: {
      type: String,
      enum: ["Standard", "On Confirmation"],
      required: true,
    },
    calculationFile: {
      fileName: String,
      filePath: String,
    },
    calculationSameAsReported: {
      type: Boolean,
    },
    reported: {
      channelPartnerPercentage: Number,
      channelPartnerAmount: Number,
      selfPercentage: Number,
      selfAmount: Number,
    },
    calculated: {
      channelPartnerPercentage: Number,
      channelPartnerAmount: Number,
      selfPercentage: Number,
      selfAmount: Number,
    },
    roundOffDifference: {
      type: Boolean,
    },
    advisorPayoutPaid: {
      type: Boolean,
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

const SPInvoiceStage =
  mongoose.models.SPInvoiceStage || mongoose.model("SPInvoiceStage", spInvoiceStageSchema);

export default SPInvoiceStage;
