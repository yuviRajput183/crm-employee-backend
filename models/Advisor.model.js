import mongoose from "mongoose";

const advisorSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      // unique: true,
      description: "The name of the advisor",
    },
    email: {
      type: String,
      required: true,
      description: "The email of the advisor",
    },
    mobile: {
      type: String,
      required: true,
      unique: true,
      description: "The mobile number of the advisor",
    },
    advisorCode: {
      type: String,
      required: true,
      unique: true,
      description: "Auto-generated serial advisor code like DSA001",
    },
    photoUrl: {
      type: String,
      description: "The photo url of the advisor",
    },
    dateOfJoining: {
      type: Date,
      default: Date.now,
      description: "The date of joining the company",
    },
    dateOfResign: {
      type: Date,
      default: null,
      description: "The date of resigning from the company",
    },
    isActive: {
      type: Boolean,
      default: true,
      description: "The status of the advisor",
    },
    isActivated: {
      type: Boolean,
      default: false,
      description: "Marks if the super admin has activated this advisor",
    },
    isCredential: {
      type: Boolean,
      default: false,
      description: "Whether login credentials are set",
    },
    role: {
      type: String,
      default: "advisor",
      required: true,
      description: "role of the user",
    },
    companyName: {
      type: String,
      description: "The name of the company",
    },
    address: {
      type: String,
      description: "The address of the advisor",
    },
    altContact: {
      type: String,
      description: "The alternative contact of the advisor",
    },
    state: {
      type: String,
      description: "The state of the advisor",
    },
    city: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "City",
      required: true,
    },
    reportingOfficer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee",
      // required: true,
      description: "Admin to whom this person reports",
    },
    aadharNo: {
      type: String,
      description: "Aadhar number of the advisor",
    },
    panNo: {
      type: String,
      description: "PAN number of the advisor",
    },
    bankName: {
      type: String,
      description: "Bank name of the advisor",
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
      required: true,
      description: "The employee who created this advisor",
    },
    ownerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee",
      required: true,
      description:
        "Identifies the Super Admin (E1) of the group to which this advisor belongs",
    },
    groupId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee",
      required: true,
      description: "It is the id of the super admin(E1)",
    },
  },
  {
    timestamps: true,
  }
);

const Advisor = mongoose.models.Advisor || mongoose.model("Advisor", advisorSchema);

export default Advisor;
