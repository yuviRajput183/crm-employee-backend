import mongoose from "mongoose";

const accountInvoiceSchema = new mongoose.Schema({
  invoiceNumber: { type: String, required: true, unique: true },
  invoiceDate: { type: Date, required: true },
  locationId: { type: mongoose.Schema.Types.ObjectId, ref: "Location", required: true },
  serviceProviderId: { type: mongoose.Schema.Types.ObjectId, ref: "ServiceProvider", required: true },
  selectedLeadIds: [{ type: mongoose.Schema.Types.ObjectId, ref: "AccountLead" }],
  
  connectorCode: String,
  productClassification: { type: String, enum: ["Secured", "Unsecured"] },
  
  supplierSnapshot: { type: mongoose.Schema.Types.Mixed },
  recipientSnapshot: { type: mongoose.Schema.Types.Mixed },
  locationSnapshot: { type: mongoose.Schema.Types.Mixed },
  paymentDetailsSnapshot: { type: mongoose.Schema.Types.Mixed },
  
  basicAmount: { type: Number, required: true },
  gstType: { type: String, enum: ["IGST", "CGST/SGST"] },
  cgstAmount: { type: Number, default: 0 },
  sgstAmount: { type: Number, default: 0 },
  igstAmount: { type: Number, default: 0 },
  gstAmount: { type: Number, required: true },
  
  roundOff: { type: Number, default: 0 },
  totalInvoiceValue: { type: Number, required: true },
  totalInvoiceValueInWords: String,
  
  descriptionOfGoods: { type: String, default: "Commission" },
  hsnSacCode: { type: String, default: "997159" },
  reverseCharge: { type: String, default: "No" },
  
  issuerName: String,
  issuerDesignation: String,
  signatureUrl: String,
  
  invoicePdfUrl: String,
  
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "Employee" }
}, { timestamps: true });

export default mongoose.models.AccountInvoice || mongoose.model("AccountInvoice", accountInvoiceSchema);
