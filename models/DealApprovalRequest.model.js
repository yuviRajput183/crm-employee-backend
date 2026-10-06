import mongoose from "mongoose";

const dealApprovalRequestSchema = new mongoose.Schema({
  leadId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "AccountLead",
    required: true,
  },
  cpLevel: {
    type: Number, // 1, 2, or 3
    required: true,
  },
  channelPartnerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "ChannelPartner",
  },
  channelPartnerName: String,
  originalDealPercentage: {
    type: Number,
    required: true,
  },
  requestedDealPercentage: {
    type: Number,
    required: true,
  },
  status: {
    type: String,
    enum: ["PENDING_ADMIN", "ADMIN_APPROVED", "ADMIN_REJECTED", "PENDING_SUPER_ADMIN", "SUPER_ADMIN_APPROVED", "SUPER_ADMIN_REJECTED"],
    default: "PENDING_ADMIN",
  },
  requestedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Employee",
  },
  adminApprovedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Employee",
  },
  adminApprovedAt: Date,
  superAdminApprovedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Employee",
  },
  superAdminApprovedAt: Date,
  rejectionReason: String,
}, { timestamps: true });

export default mongoose.models.DealApprovalRequest || mongoose.model("DealApprovalRequest", dealApprovalRequestSchema);
