import mongoose from "mongoose";

const locationSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      description: "The name of the location",
    },
    state: {
      type: String,
      description: "The state of the advisor",
    },
    address: {
      type: String,
      description: "The address of the advisor",
    },
    gstin: {
      type: String,
      trim: true,
      uppercase: true,
    },
    mobile: {
      type: String,
      required: true,
      unique: true,
      description: "The mobile number",
    },
    email: {
      type: String,
      required: true,
      description: "The email of the advisor",
    },
    authorizedSignatoryName: {
      type: String,
      description:
        "Name of the person who is authorized to sign official documents on behalf of that location/company",
    },
    authorizedSignatoryDesignation: {
      type: String,
      description: "The job title/position of that person",
    },
    stampAndSign: {
      type: String,
      trim: true,
      default: null,
    },
    accountHolderName: {
      type: String,
      description: "Account holder name of the advisor",
    },
    accountNumber: {
      type: String,
      description: "Account number of the advisor",
    },
    ifscCode: {
      type: String,
      description: "IFSC code of the advisor",
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee",
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee",
    },
  },
  {
    timestamps: true,
  },
);

const Location = mongoose.model("Location", locationSchema);

export default Location;
