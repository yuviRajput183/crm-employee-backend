import mongoose from "mongoose";

const accountLeadSchema = new mongoose.Schema(
  {
    location: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Location",
      required: true,
    },
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },
    subProduct: {
      type: String,
      required: true,
    },
    caseName: {
      type: String,
      required: true,
    },
    lanApplicationNo: {
      type: String,
      required: true,
    },
    bank: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Bank",
      required: true,
    },
    reportedLoanAmount: {
      type: Number,
      required: true,
    },
    reportedPayoutPercentage: {
      type: Number,
      required: true,
    },
    totalPayoutAmount: {
      type: Number,
      required: true,
    },
    caseType: {
      type: String,
      enum: ["Processed", "Reported"],
      required: true,
    },
    serviceProvider: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ServiceProvider",
      required: true,
    },
    spCode: {
      type: String,
      required: true,
    },
    disbursementDate: {
      type: Date,
      required: true,
    },
    pddCleared: {
      type: String,
      enum: ["Yes", "No"],
      required: true,
    },
    pddClearedDate: {
      type: Date,
    },
    leadNo: {
      type: Number,
      unique: true
    },
    status: {
      type: String,
      enum: ["In Progress", "Banker Confirmed", "Confirmation Received", "PART_CASE_FOUND", "CASE_FOUND", "Ready to report", "Invoice Raised", "Closed", "Invoiced", "Recovery Required"],
      default: "In Progress",
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee",
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee",
    },
    stageNumber: {
      type: Number,
      default: 1
    },
    bankerCaseLocationDetailsId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "BankerCaseLocationDetails"
    },
    confirmationStageId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ConfirmationStage"
    },
    spInvoiceStageId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "SPInvoiceStage"
    },
    tranchesIds: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Tranche"
      }
    ],
    // Case Search / Tranche Fields
    // totalCaseAmount: { type: Number, default: 0 },
    trancheFoundAmount: { type: Number, default: 0 },
    trancheRemainingAmount: { type: Number, default: 0 },
    reportedThrough: {
      type: String,
      enum: ["Self", "Channel Partner"]
    }
  },
  {
    timestamps: true,
  }
);

const AccountLead = mongoose.models.AccountLead || mongoose.model("AccountLead", accountLeadSchema);

export default AccountLead;
