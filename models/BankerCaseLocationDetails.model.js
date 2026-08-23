import mongoose from "mongoose";

const bankerCaseLocationDetailsSchema = new mongoose.Schema({
  leadId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Lead",
    required: true,
  },
  stateName: {
    type: String,
    required: true,
  },
  cityId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "City",
    required: true,
  },
  bankerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Banker",
    required: true,
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Employee",
    required: true,
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Employee",
  }
}, {
  timestamps: true
});

const BankerCaseLocationDetails = mongoose.models.BankerCaseLocationDetails || mongoose.model("BankerCaseLocationDetails", bankerCaseLocationDetailsSchema);

export default BankerCaseLocationDetails;
