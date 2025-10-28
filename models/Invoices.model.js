import mongoose from "mongoose";

const invoiceSchema = new mongoose.Schema(
  {
    invoiceMasterId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "InvoiceMaster",
      required: true,
      description: "Stores the total of all the invoice of same lead"
    },
    leadId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Lead",
      required: true,
    },

    disbursalAmount: Number,
    disbursalDate: Date,

    payoutPercent: {
      type: Number,
      required: true,
    },
    payoutAmount: Number,

    tdsPercent: {
      type: Number,
      default: 0,
      min: [0, "TDS Percentage should be between 0 and 100"],
      max: [100, "TDS Percentage should be between 0 and 100"]
    },
    tdsAmount: {
      type: Number,
      default: 0
    },

    gstPercent: {
      type: Number,
      default: 0,
      min: [0, "GST Percentage should be between 0 and 100"],
      max: [100, "GST Percentage should be between 0 and 100"]
    },
    gstAmount: {
      type: Number,
      default: 0
    },

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
