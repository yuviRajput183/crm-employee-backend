import mongoose from "mongoose";

const invoiceMasterSchema = new mongoose.Schema({
    leadId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Lead",
        requiredd: true,
        description: "The lead id of the invoice"
    },
    invoiceReceivableAmount: {
        type: Number,
        default: 0,
        description: "Total of all invoice amounts (excluding GST)"
    },
    invoiceGstAmount: {
        type: Number,
        default: 0,
        description: "Total GST amount from all invoices"
    },
    remainingReceivableAmount: {
        type: Number,
        default: 0,
        description: "total receivable amount minus paid receivable amount"
    },
    remainingGstAmount: {
        type: Number,
        default: 0,
        description: "total GST amount minus paid GST amount"
    }
}, {
    timestamps: true
})

const InvoiceMaster = mongoose.models.InvoiceMaster || mongoose.model("InvoiceMaster", invoiceMasterSchema);

export default InvoiceMaster;