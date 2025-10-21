import mongoose from "mongoose";

const payablesSchema = new mongoose.Schema({
    payoutId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'AdvisorPayout',
        required: true,
        description: "Reference to the advisor payout"
    },
    leadId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Lead',
        required: true,
        description: "Reference to the lead"
    },
    advisorId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Advisor',
        required: true,
        description: "Reference to the advisor"
    },
    paymentAgainst: {
        type: String,
        enum: ["gstPayment", "payableAmount"],
        required: true,
        description: "Payment against"
    },
    payableAmount: {
        type: Number,
        required: true,
        min: [0, "Payable amount cannot be negative"],
        description: "Payable amount"
    },
    paidAmount: {
        type: Number,
        required: true,
        min: [0, "Paid amount cannot be negative"],
        description: "Paid amount"
    },
    balanceAmount: {
        type: Number,
        required: true,
        min: [0, "Balance amount cannot be negative"],
        description: "Balance amount"
    },
    paidDate: {
        type: Date,
        required: true,
        description: "Paid date"
    },
    refNo: {
        type: String,
        trim: true,
        description: "Reference number"
    },
    remarks: {
        type: String,
        trim: true,
        description: "Remarks"
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Employee',
        required: true,
        description: "The user who created the payable"
    },
    updatedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Employee",
        description: "The user who updated the payable"
    }
}, {
    timestamps: true,
})

const Payables = mongoose.models.Payables || mongoose.model("Payables", payablesSchema);

export default Payables;