import mongoose from "mongoose";

const reportedBundleSchema = new mongoose.Schema(
  {
    bundleName: {
      type: String,
      required: true,
    },
    reportedDate: {
      type: Date,
      default: Date.now,
    },
    leads: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "AccountLead",
      },
    ],
    selectedTrancheIds: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Tranche",
      },
    ],
    totalAmount: {
      type: Number,
      default: 0,
    },
    totalCases: {
      type: Number,
      default: 0,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee",
    },
  },
  {
    timestamps: true,
  }
);

const ReportedBundle =
  mongoose.models.ReportedBundle ||
  mongoose.model("ReportedBundle", reportedBundleSchema);

export default ReportedBundle;
