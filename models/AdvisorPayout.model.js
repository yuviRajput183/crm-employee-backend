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
    customerName: String,
    loanServiceType: String,

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

    bankerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Banker",
    },
    bankName: String,
    bankerName: String,
    bankerEmailId: String,
    bankerDesignation: String,
    bankerMobileNo: String,
    stateName: String,
    cityName: String,
  },
  {
    timestamps: true,
  }
);

const AdvisorPayout =
  mongoose.models.AdvisorPayout ||
  mongoose.model("AdvisorPayout", advisorPayoutSchema);

export default AdvisorPayout;
