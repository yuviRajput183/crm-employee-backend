import mongoose from "mongoose";

const employeeSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      description: "The name of the employee",
    },
    email: {
      type: String,
      description: "The email of the employee",
    },
    mobile: {
      type: String,
      required: true,
      unique: true,
      description: "The mobile number of the employee",
    },
    address: {
      type: String,
      description: "The address of the employee",
    },
    altContact: {
      type: String,
      description: "The alternative contact of the employee",
    },
    photoUrl: {
      type: String,
      description: "The photo url of the employee",
    },
    department: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Department",
      required: true,
      description: "Department in which employee works",
    },
    designation: {
      type: String,
      required: true,
      description: "Designation within the department",
    },
    dateOfJoining: {
      type: Date,
      default: Date.now,
      description: "Date the employee joined the organization",
    },
    reportingOfficer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee",
      // required: true,
      description: "Admin to whom this person reports",
    },
    dateOfResign: {
      type: Date,
      default: null,
      description: "The date of resigning from the company",
    },
    isActive: {
      type: Boolean,
      default: true,
      description: "Whether the employee is currently active",
    },
    isCredential: {
      type: Boolean,
      default: false,
      description: "Whether login credentials have been created",
    },
    // isActivated: {
    //   type: Boolean,
    //   default: false,
    //   description: "Indicates if the Super Admin has activated this user",
    // },
    role: {
      type: String,
      enum: ["employee", "admin"],
      required: true,
      description: "Defines if this is a normal employee or admin",
    },
    isOwner: {
      type: Boolean,
      default: false,
      description: "Employee is owner of the group or not",
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee",
      required: true,
      description: "The employee who created this employee",
    },
    ownerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee",
      required: true,
      description:
        "dentifies the Super Admin (E1) of the group to which this advisor belongs",
    },
    groupId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee",
      required: true,
      description: "The Super Admin (E1) of the group",
    },
  },
  {
    timestamps: true,
  }
);

const Employee = mongoose.model.Employee || mongoose.model("Employee", employeeSchema);

export default Employee;
