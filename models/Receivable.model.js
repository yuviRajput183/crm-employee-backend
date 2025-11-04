import mongoose from "mongoose";

const receivableSchema = new mongoose.Schema({
    invoiceMasterId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "InvoiceMaster",
        required: true
    },
    leadId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Lead",
        required: true,
    },
    paymentAgainst: {
        type: String,
        enum:["receivableAmount", "gstPayment"],
        required: true
    },
    receivableAmount: {
        type: Number,
        required: true,
        min: [0, "Receivable amount cannot be negative"],
        description: "Receivable amount"
    },
    receivedAmount: {
        type: Number,
        required: true,
        min: [0, "Received amount cannot be negative"],
        description: "Received amount"
    },
    balanceAmount: {
        type: Number,
        required: true,
        min: [0, "Balance amount cannot be negative"],
        description: "Balance amount"
    },
    receivedDate: {
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
        ref: "Employee",
        required: true,
        description: "The user who created the receivable"
    },
    updatedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Employee",
        description: "The user who updated the receivable"
    }
}, {
    timestamps: true,
})

const Receivable = mongoose.models.Receivable || mongoose.model("Receivable", receivableSchema)

export default Receivable;