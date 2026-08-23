import mongoose from "mongoose";

const trancheSchema = new mongoose.Schema({
  leadId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "LeadAccount",
    required: true
  },
  // trancheNumber: {
  //   type: Number,
  //   required: true
  // },
  amount: {
    type: Number,
    required: true
  },
  spUid: {
    type: String,
    // Optional depending on flow, but as requested allow entry
  },
  paymentUid: {
    type: String,
    required: true,
    unique: true
  },
  status: {
    type: String,
    enum: ["FOUND", "PENDING"],
    default: "FOUND"
  },
  foundDate: {
    type: Date,
    default: Date.now
  },
  foundMonth: {
    type: String, // e.g. "Aug 2026"
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Employee"
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Employee"
  }
}, {
  timestamps: true
});

const Tranche = mongoose.models.Tranche || mongoose.model("Tranche", trancheSchema);

export default Tranche;
