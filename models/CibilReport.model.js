import mongoose from "mongoose";

const cibilReportSchema = new mongoose.Schema(
  {
    bureau: {
      type: String,
      enum: ["TRANSUNION", "EQUIFAX", "EXPERIAN", "CRIF"],
      required: true,
      index: true
    },
    name: {
      type: String,
      required: true,
      trim: true
    },
    firstName: {
      type: String,
      trim: true
    },
    lastName: {
      type: String,
      trim: true
    },
    mobile: {
      type: String,
      required: true,
      trim: true,
      index: true
    },
    pan: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
      index: true
    },
    gender: {
      type: String,
      trim: true
    },
    creditScore: {
      type: String
    },
    clientId: {
      type: String,
      required: true
    },
    pdfPath: {
      type: String,
      required: true
    },
    pdfFileName: {
      type: String
    },
    generatedAt: {
      type: Date,
      default: Date.now,
      index: true
    },
    generatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee"
    }
  },
  {
    timestamps: true
  }
);

export default mongoose.model("CibilReport", cibilReportSchema);
