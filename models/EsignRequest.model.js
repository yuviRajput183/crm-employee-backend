import mongoose from "mongoose";

const esignRequestSchema = new mongoose.Schema({
  channelPartnerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "ChannelPartner",
    required: true,
    index: true
  },

  documentType: {
    type: String,
    enum: ["CHANNEL_PARTNER_AGREEMENT"],
    required: true
  },

  fileName: {
    type: String,
    required: true
  },

  fileId: {
    type: String,
    default: null,
    index: true
  },

  clientId: {
    type: String,
    default: null,
    index: true
  },

  signingUrl: {
    type: String,
    default: null
  },

  originalDocumentUrl: {
    type: String,
    default: null
  },

  signedDocumentUrl: {
    type: String,
    default: null
  },

  status: {
    type: String,
    enum: [
      "INITIATED",
      "PDF_UPLOADED",
      "OTP_SENT",
      "OTP_VERIFIED",
      "SIGNING",
      "SIGNED_PENDING_DOWNLOAD",
      "SIGNED",
      "FAILED",
      "CANCELLED"
    ],
    default: "INITIATED"
  },

  surepassStatus: {
    type: String,
    default: null
  },

  failureReason: {
    type: String,
    default: null
  },

  initiatedAt: Date,

  signedAt: Date,

  downloadedAt: Date,
  
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Employee"
  }
}, {
  timestamps: true
});

const EsignRequest = mongoose.model("EsignRequest", esignRequestSchema);

export default EsignRequest;
