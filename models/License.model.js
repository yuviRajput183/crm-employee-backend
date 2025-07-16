import mongoose from "mongoose";

const licenseSchema = new mongoose.Schema({
    passwordToValidate: {
        type: String,
        required: true,
        description: "The password to validate"
    },
    totalEmployees: {
        type: Number,
        required: true,
        description: "The total number of employees"
    },
    totalAdvisors: {
        type: Number,
        required: true,
        description: "The total number of advisors"
    },
    usedEmployees: {
        type: Number,
        default: 1,
    },
    usedAdvisors: {
        type: Number,
        default: 0
    },
    ownerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Employee",
        required: true,
        description: "The employee who created this license"
    }
}, {
    timestamps: true
})

const License = mongoose.models.License || mongoose.model("License", licenseSchema);

export default License;