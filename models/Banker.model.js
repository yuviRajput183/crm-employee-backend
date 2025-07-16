import mongoose from "mongoose";

const bankerSchema = new mongoose.Schema(
  {
    product: {
      type: String,
      required: true,
      description: "The product of the banker",
    },
    stateName: {
      type: String,
      required: true,
      description: "The state name of the banker",
    },
    city: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "City",
      required: true,
      description: "The city of the banker",
    },
    bank: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Bank",
      required: true,
      description: "The bank of the banker",
    },
    bankerName: {
      type: String,
      required: true,
      description: "The name of the banker",
    },
    designation: {
      type: String,
      required: true,
      description: "The designation of the banker",
    },
    mobile: {
      type: String,
      required: true,
      description: "The mobile number of the banker",
    },
    email: {
      type: String,
      required: true,
      description: "The email of the banker",
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee",
      required: true,
      description: "The employee who created this banker",
    },
    groupId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee",
      required: true,
      description: "The Super Admin group this department belongs to",
    },
  },
  {
    timestamps: true,
  }
);

const Banker = mongoose.models.Banker || mongoose.model("Banker", bankerSchema);

export default Banker;
