import mongoose from "mongoose";

const advisorPayoutSchema = new mongoose.Schema(
  {
    leadId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Lead",
      required: true,
    },
    advisorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Advisor",
      required: true,
    },
    // customerName: String,
    // loanServiceType: String,

    disbursalAmount: {
      type: Number,
      required: true,
    },
    disbursalDate: Date,

    payoutPercent: {
      type: Number,
      required: true,
    },
    payoutAmount: Number,

    tdsPercent: Number,
    tdsAmount: Number,

    gstApplicable: {
      type: Boolean,
      required: true,
    },
    gstPercent: Number,
    gstAmount: Number,

    invoiceNo: String,
    invoiceDate: Date,

    netPayableAmount: Number,

    processedById: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ProcessedBy",
      required: true,
    },
    finalPayout: {
      type: Boolean,
      default: false,
    },
    remarks: String,

    // totalPaidAmount: {
    //   type: Number,
    //   default: 0
    // },

    remainingGstAmount: {
      type: Number,
    },

    remainingPayableAmount: {
      type: Number
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee",
      required: true,
      description: "The user who created the advisor payout"
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee",
      description: "The user who updated the advisor payout"
    }
  },
  {
    timestamps: true,
  }
);

const AdvisorPayout =
  mongoose.models.AdvisorPayout ||
  mongoose.model("AdvisorPayout", advisorPayoutSchema);

export default AdvisorPayout;
