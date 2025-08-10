import mongoose from "mongoose";

const runningLoanSchema = new mongoose.Schema({
  loanType: String,
  loanAmount: Number,
  bankName: String,
  emiAmount: Number,
  paidEmi: Number
}, { _id: false });

const referenceSchema = new mongoose.Schema({
  name: String,
  mobileNo: String,
  address: String,
  relation: String
}, { _id: false });

const documentSchema = new mongoose.Schema({
  attachmentType: String,
  fileUrl: String,
  password: String
}, { _id: false });

const historySchema = new mongoose.Schema({
  feedback: String,
  commentBy: String,
  commentDate: String, 
  remarks: String,
  replyDate: String,
  advisorReply: String
}, { _id: false });

const leadSchema = new mongoose.Schema({
  productType: {
    type: String,
    required: true,
    enum: [
      "Instant Loan", "Personal Loan", "Business Loan", "Home Loan",
      "Loan Against Property", "Car Loan", "Used Car Loan", "Insurance",
      "Private Funding", "Services", "Credit Card"
    ]
  },
  loanRequirementAmount: {
    type: Number,
    // required: true
  },
  leadNo: {
    type: Number,
    unique: true
  },
  clientName: {
    type: String,
    required: true
  },
  mobileNo: {
    type: String,
    required: true,
    unique: true
  },
  emailId: {
    type: String,
  },
  dob: Date,
  panNo: String,
  aadharNo: String,
  maritalStatus: String,
  spouseName: String,
  motherName: String,
  otherContactNo: String,
  qualification: String,
  residenceType: String,
  residentialAddress: String,
  residentialAddressTakenFrom: String,
  residentialStability: String,
  stateName: String,
  cityName: String,
  pinCode: {
    type: String,
  },

  companyName: String,
  designation: String,
  companyAddress: String,
  netSalary: Number,
  salaryTransferMode: String,
  jobPeriod: String,
  totalJobExperience: String,
  officialEmailId: String,
  officialNumber: String,
  noOfDependent: Number,

  creditCardOutstandingAmount: Number,
  runningLoans: [runningLoanSchema],
  references: [referenceSchema],
  documents: [documentSchema],
  history: [historySchema],

  password: String,
  
  allocatedTo: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Employee',
    required: true
  },

   // Business Fields
  businessName: String,
  annualTurnover: Number,
  businessAddress: String,
  natureOfBusiness: String,
  businessRegistrationProof: String,
  businessAddressTakenFrom: String,
  businessAge: String,
  businessType: String,
  noOfEmployee: Number,
  businessPremises: String,
  howManyYearItrAvailable: String,

  employment: String,
  propertyType: String,
  propertyMarketValue: Number,
  propertyTotalArea: String,
  propertyAddress: String,

  carName: String,
  carExShowroomPrice: Number,
  manufacturingYear: String,
  fuelType: String,

  insuranceType: String,
  insuranceAmount: Number,

  occupation: String,
  nomineeName: String,
  relationWithNominee: String,
  monthlyIncome: Number,

  servicesType: String,
  description: String,
  amount: Number,

  finalPayout: {
    type: Boolean,
    default: false,
    description: "This shows that advisor payout is final or not"
  },

  finalInvoice: {
    type: Boolean,
    default: false,
    description: "This shows that invoice is final or not"
  },

  advisorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Advisor",
    required: true
  },

  employeeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Employee",
  },

  createdBy: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Employee',
  },
  updatedBy: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Employee',
  },
  createdAt: { 
    type: Date, 
    default: Date.now 
  }
});

const Lead = mongoose.models.Lead || mongoose.model("Lead", leadSchema);

export default Lead;
