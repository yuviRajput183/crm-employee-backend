import mongoose from "mongoose";

const departmentSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      description: "The name of the department",
    },
    designations: [
      {
        type: String,
        description: "The designation of the department",
      },
    ],
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee",
      description: "The employee who created this department",
    },
    groupId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee",
      required: true,
      description: "The Super Admin group this department belongs to",
    },
    isDefault: {
      type: Boolean,
      default: false,
      description:
        "Marks this department as default (cannot be updated or deleted)",
    },
  },
  {
    timestamps: true,
  }
);

const Department = mongoose.models.Department || mongoose.model("Department", departmentSchema);

export default Department;
