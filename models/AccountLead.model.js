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
    },
    // Channel Partner Fields
    channelPartner1: { type: mongoose.Schema.Types.ObjectId, ref: "ChannelPartner" },
    cpCode1: { type: String },
    cp1DealPercentage: { type: Number },
    cp1PayoutAmount: { type: Number },
    
    channelPartner2: { type: String }, // Store as string (name) or objectId? In frontend we are sending name. Wait. Frontend sets it to level1.name.
    // Actually we should store references if possible, but frontend uses strings right now.
    // Wait, frontend sends name for channelPartner2. I will change frontend to send IDs.
    // Let me check frontend `onSubmit`. It sends `data` straight.
    cpCode2: { type: String },
    cp2DealPercentage: { type: Number },
    cp2PayoutAmount: { type: Number },

    channelPartner3: { type: String },
    cpCode3: { type: String },
    cp3DealPercentage: { type: Number },
    cp3PayoutAmount: { type: Number }
  },
  {
    timestamps: true,
  }
);

const AccountLead = mongoose.models.AccountLead || mongoose.model("AccountLead", accountLeadSchema);

export default AccountLead;
