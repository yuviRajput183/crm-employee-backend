import mongoose from "mongoose";

const invoiceSchema = new mongoose.Schema(
  {
    leadId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Lead",
      required: true,
    },
    // advisorId: {
    //   type: mongoose.Schema.Types.ObjectId,
    //   ref: "Advisor",
    //   required: true,
    // },
    // customerName: String,
    // loanServiceType: String,

    // disbursalAmount: {
    //   type: Number,
    //   required: true,
    // },
    disbursalDate: Date,

    payoutPercent: {
      type: Number,
      required: true,
    },
    payoutAmount: Number,

    tdsPercent: Number,
    tdsAmount: Number,

    gstPercent: Number,
    gstAmount: Number,

    invoiceNo: {
      type: String,
      required: true,
    },
    invoiceDate: {
      type: Date,
      required: true,
    },

    netReceivableAmount: Number,

    processedById: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ProcessedBy",
      required: true,
    },
    finalInvoice: {
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

const Invoice =
  mongoose.models.Invoice ||
  mongoose.model("Invoice", invoiceSchema);

export default Invoice;
