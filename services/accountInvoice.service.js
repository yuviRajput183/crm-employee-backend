import fs from 'fs';
import path from 'path';
import puppeteer from 'puppeteer';
import AccountLead from '../models/AccountLead.model.js';
import Tranche from '../models/Tranche.model.js';
import ServiceProvider from '../models/ServiceProvider.model.js';
import AccountInvoice from '../models/AccountInvoice.model.js';
import { amountToWordsIndian } from '../utils/numberToWords.js';
import { generateInvoiceHtml } from '../utils/invoiceTemplate.js';

class AccountInvoiceService {
    async previewInvoice(req) {
        const { selectedLeadIds } = req.body;
        
        const tranches = await Tranche.find({ _id: { $in: selectedLeadIds } }).lean();
        const trancheIds = tranches.map(t => t._id.toString());
        const leadIdsFromTranches = tranches.map(t => t.leadId.toString());

        const leadOnlyIds = selectedLeadIds.filter(id => !trancheIds.includes(id));
        const allRequiredLeadIds = [...new Set([...leadOnlyIds, ...leadIdsFromTranches])];

        const leads = await AccountLead.find({ _id: { $in: allRequiredLeadIds } })
            .populate('serviceProvider');

        if (leads.length !== allRequiredLeadIds.length) {
            throw new Error("Some selected leads or tranches were not found");
        }

        const serviceProviderId = leads[0].serviceProvider._id.toString();
        const allSameSp = leads.every(lead => lead.serviceProvider._id.toString() === serviceProviderId);

        if (!allSameSp) {
            throw new Error("Selected items must belong to the same Service Provider");
        }
        
        let basicAmount = 0;
        for (const id of selectedLeadIds) {
            if (trancheIds.includes(id)) {
                const t = tranches.find(t => t._id.toString() === id);
                const l = leads.find(l => l._id.toString() === t.leadId.toString());
                
                if (!l.reportedLoanAmount || l.reportedLoanAmount <= 0) {
                    throw new Error("Reported Loan Amount is missing on the parent lead. Cannot calculate tranche ratio.");
                }
                
                const ratio = t.amount / l.reportedLoanAmount;
                const trancheCommission = ratio * (l.totalPayoutAmount || 0);
                
                basicAmount += trancheCommission;
            } else {
                const l = leads.find(l => l._id.toString() === id);
                basicAmount += (l.totalPayoutAmount || 0);
            }
        }

        const sp = leads[0].serviceProvider;
        const isHaryana = sp.state && sp.state.trim().toLowerCase() === 'haryana';
        
        let gstType = isHaryana ? "CGST/SGST" : "IGST";
        let cgstAmount = 0;
        let sgstAmount = 0;
        let igstAmount = 0;
        let gstAmount = 0;

        if (isHaryana) {
            cgstAmount = (basicAmount * 9) / 100;
            sgstAmount = (basicAmount * 9) / 100;
            gstAmount = cgstAmount + sgstAmount;
        } else {
            igstAmount = (basicAmount * 18) / 100;
            gstAmount = igstAmount;
        }

        const exactTotal = basicAmount + gstAmount;
        const totalInvoiceValue = Math.round(exactTotal);
        const roundOff = totalInvoiceValue - exactTotal;

        return {
            basicAmount,
            gstType,
            cgstAmount,
            sgstAmount,
            igstAmount,
            gstAmount,
            totalInvoiceValue,
            roundOff: Number(roundOff.toFixed(2)),
            leadsCount: selectedLeadIds.length,
            serviceProvider: sp
        };
    }

    async generateInvoice(req) {
        const { selectedLeadIds } = req.body;

        const tranches = await Tranche.find({ _id: { $in: selectedLeadIds } }).lean();
        const trancheIds = tranches.map(t => t._id.toString());
        const leadIdsFromTranches = tranches.map(t => t.leadId.toString());

        const leadOnlyIds = selectedLeadIds.filter(id => !trancheIds.includes(id));
        const allRequiredLeadIds = [...new Set([...leadOnlyIds, ...leadIdsFromTranches])];

        const leads = await AccountLead.find({ _id: { $in: allRequiredLeadIds } })
            .populate('serviceProvider')
            .populate('location');

        if (leads.length !== allRequiredLeadIds.length) {
            throw new Error("Some selected leads or tranches were not found");
        }

        const sp = leads[0].serviceProvider;
        const locationId = leads[0].location ? leads[0].location._id : null;
        
        const invalidLeads = leads.filter(l => !l.totalPayoutAmount || l.totalPayoutAmount <= 0);
        if (invalidLeads.length > 0) {
            throw new Error("Firstly set the Total Payout Amount (in Case Reporting) before generating the PDF.");
        }

        const invalidTranches = tranches.filter(t => !t.amount || t.amount <= 0);
        if (invalidTranches.length > 0) {
            throw new Error("Please set the amount for the selected row(s) before generating the PDF.");
        }

        let basicAmount = 0;
        for (const id of selectedLeadIds) {
            if (trancheIds.includes(id)) {
                const t = tranches.find(t => t._id.toString() === id);
                const l = leads.find(l => l._id.toString() === t.leadId.toString());
                
                if (!l.reportedLoanAmount || l.reportedLoanAmount <= 0) {
                    throw new Error("Reported Loan Amount is missing on the parent lead. Cannot calculate tranche ratio.");
                }
                
                const ratio = t.amount / l.reportedLoanAmount;
                const trancheCommission = ratio * (l.totalPayoutAmount || 0);
                
                basicAmount += trancheCommission;
            } else {
                const l = leads.find(l => l._id.toString() === id);
                basicAmount += (l.totalPayoutAmount || 0);
            }
        }
        
        const isHaryana = sp.state && sp.state.trim().toLowerCase() === 'haryana';
        
        let gstType = isHaryana ? "CGST/SGST" : "IGST";
        let cgstAmount = 0;
        let sgstAmount = 0;
        let igstAmount = 0;
        let gstAmount = 0;

        if (isHaryana) {
            cgstAmount = (basicAmount * 9) / 100;
            sgstAmount = (basicAmount * 9) / 100;
            gstAmount = cgstAmount + sgstAmount;
        } else {
            igstAmount = (basicAmount * 18) / 100;
            gstAmount = igstAmount;
        }

        const exactTotal = basicAmount + gstAmount;
        const totalInvoiceValue = Math.round(exactTotal);
        const roundOff = totalInvoiceValue - exactTotal;
        const totalInvoiceValueInWords = amountToWordsIndian ? amountToWordsIndian(totalInvoiceValue) : totalInvoiceValue.toString();

        const invoiceNumber = `ULSPL/${sp.stateCode || 'HAR'}/${Math.floor(100 + Math.random() * 900)}`;
        const d = req.body.invoiceDate ? new Date(req.body.invoiceDate) : new Date();
        const invoiceDateFormatted = `${String(d.getDate()).padStart(2, '0')}-${String(d.getMonth() + 1).padStart(2, '0')}-${d.getFullYear()}`;
        const invoiceDate = d;
        
        let productClassification = "Secured";
        const hasUnsecured = leads.some(l => 
            l.product && (l.product.name === 'Personal Loan' || l.product.name === 'Business Loan')
        );
        if (hasUnsecured) productClassification = "Unsecured";

        const invoiceObj = {
            invoiceNumber,
            invoiceDate,
            locationId,
            serviceProviderId: sp._id,
            selectedLeadIds,
            connectorCode: sp.code,
            productClassification,
            basicAmount,
            gstType,
            cgstAmount,
            sgstAmount,
            igstAmount,
            gstAmount,
            roundOff: Number(roundOff.toFixed(2)),
            totalInvoiceValue,
            totalInvoiceValueInWords,
            createdBy: req.user ? (req.user.id || req.user._id) : undefined
        };

        const invoice = await AccountInvoice.create(invoiceObj);

        await AccountLead.updateMany(
            { _id: { $in: selectedLeadIds } },
            { $set: { status: 'Invoice Raised' } }
        );

        const location = leads[0].location || {};
        const templateData = {
            invoiceNumber,
            invoiceDate: invoiceDateFormatted,
            connectorCode: sp.code,
            productClassification,
            supplierAddress: location.address || '',
            supplierGstin: location.gstin || '',
            recipientName: sp.legalName || '',
            recipientAddress: sp.address || '',
            recipientState: `${sp.state || ''} - (${sp.stateCode || ''})`,
            recipientGstin: sp.gstin || '',
            recipientPlaceOfSupply: `${sp.state || ''} - (${sp.stateCode || ''})`,
            basicAmount: basicAmount.toFixed(2),
            isHaryana,
            cgstAmount: cgstAmount.toFixed(2),
            sgstAmount: sgstAmount.toFixed(2),
            igstAmount: igstAmount.toFixed(2),
            roundOff,
            totalInvoiceValue: totalInvoiceValue.toFixed(2),
            totalInvoiceValueInWords,
            bankName: location.bankName, 
            accountNo: location.accountNumber || '',
            ifscCode: location.ifscCode || ''
        };

        const html = generateInvoiceHtml(templateData);

        const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] });
        const page = await browser.newPage();
        await page.setContent(html, { waitUntil: 'networkidle0' });
        
        const pdfBytes = await page.pdf({ 
            format: 'A4', 
            printBackground: true,
            margin: { top: '30px', bottom: '25px', left: '30px', right: '30px' }
        });
        await browser.close();
        
        const invoicesDir = path.join(process.cwd(), 'uploads', 'invoices');
        if (!fs.existsSync(invoicesDir)) {
            fs.mkdirSync(invoicesDir, { recursive: true });
        }
        
        const fileName = `${invoiceNumber.replace(/\//g, '_')}.pdf`;
        const filePath = path.join(invoicesDir, fileName);
        fs.writeFileSync(filePath, pdfBytes);
        
        const fileUrl = `/uploads/invoices/${fileName}`;
        invoice.invoicePdfUrl = fileUrl;
        await invoice.save();

        return {
            invoice,
            invoicePdfUrl: fileUrl
        };
    }
}

export default new AccountInvoiceService();
