import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import fs from 'fs';
import path from 'path';
import moment from 'moment';

export class PdfGeneratorService {
    async generateKycForm(cp) {
        const doc = await PDFDocument.create();
        const font = await doc.embedFont(StandardFonts.Helvetica);
        const boldFont = await doc.embedFont(StandardFonts.HelveticaBold);
        
        let page = doc.addPage([595, 842]); // A4
        const { width, height } = page.getSize();
        
        const margin = 50;
        let y = height - margin;

        const drawText = (text, size, f, x, yPos, color = rgb(0,0,0)) => {
            page.drawText(text, { x, y: yPos, size, font: f, color });
        };

        const drawSectionHeader = (title) => {
            if (y < 100) {
                page = doc.addPage([595, 842]);
                y = height - margin;
            }
            page.drawRectangle({
                x: margin,
                y: y - 15,
                width: width - 2 * margin,
                height: 20,
                color: rgb(0.1, 0.2, 0.4),
            });
            drawText(title, 12, boldFont, margin + 5, y - 10, rgb(1,1,1));
            y -= 25;
        };

        const splitText = (text, maxWidth) => {
            if (!text) return [];
            const words = text.split(' ');
            const lines = [];
            let currentLine = words[0] || '';

            for (let i = 1; i < words.length; i++) {
                const word = words[i];
                const width = font.widthOfTextAtSize(currentLine + ' ' + word, 10);
                if (width < maxWidth) {
                    currentLine += ' ' + word;
                } else {
                    lines.push(currentLine);
                    currentLine = word;
                }
            }
            if (currentLine) lines.push(currentLine);
            return lines;
        };

        const drawRow = (label, value) => {
            const valStr = value ? String(value) : '';
            const valWidth = width - 2 * margin - 215; 
            const lines = splitText(valStr, valWidth);
            const numLines = Math.max(1, lines.length);
            const rowHeight = numLines === 1 ? 20 : (numLines * 12 + 8);
            
            if (y - rowHeight < 50) {
                page = doc.addPage([595, 842]);
                y = height - margin;
            }
            
            const rectY = y + 15 - rowHeight;

            // Draw borders
            page.drawRectangle({
                x: margin, y: rectY, width: 200, height: rowHeight,
                borderColor: rgb(0.8, 0.8, 0.8), borderWidth: 1
            });
            page.drawRectangle({
                x: margin + 200, y: rectY, width: width - 2 * margin - 200, height: rowHeight,
                borderColor: rgb(0.8, 0.8, 0.8), borderWidth: 1
            });

            drawText(label, 10, boldFont, margin + 5, y);
            
            let textY = y;
            if (lines.length > 0) {
                for (let line of lines) {
                    drawText(line, 10, font, margin + 205, textY);
                    textY -= 12;
                }
            }
            
            y -= rowHeight;
        };

        // Header
        drawText("LOAN SAHAYAK", 18, boldFont, width/2 - 70, y, rgb(0.1, 0.2, 0.4));
        y -= 20;
        drawText("CONNECTOR ONBOARDING APPLICATION & KYC FORM", 12, boldFont, width/2 - 150, y, rgb(0.2, 0.5, 0.8));
        y -= 30;

        // Basic Info
        drawRow("Application Reference No.", cp.applicationNumber || '');
        drawRow("Application Date", cp.createdAt ? moment(cp.createdAt).format('DD/MM/YYYY') : '');
        drawRow("Connector Type", cp.businessDetails?.registrationType || '');
        drawRow("Application Status", cp.applicationStatus || '');
        y -= 10;

        // Section 1
        drawSectionHeader("1. APPLICANT / CONNECTOR DETAILS");
        drawRow("Legal Name", cp.businessDetails?.udyam?.enterpriseName || cp.businessDetails?.gst?.legalName || cp.panDetails?.fullName || cp.aadhaarDetails?.fullName || '');
        drawRow("Trade Name", cp.businessDetails?.gst?.businessName || '');
        drawRow("Mobile No.", cp.mobile || '');
        drawRow("Email ID", cp.email || '');
        drawRow("Applicant Capacity", cp.authPanDetails?.fullName ? 'Authorised Signatory' : 'Self');
        const addr = cp.businessDetails?.udyam?.officialAddress || cp.businessDetails?.gst?.address || cp.aadhaarDetails?.fullAddress || '';
        drawRow("Address", addr);
        y -= 10;

        // Section 2
        drawSectionHeader("2. PAN VERIFICATION DETAILS");
        drawRow("PAN", cp.pan || '');
        drawRow("First Name", cp.panDetails?.firstName || '');
        drawRow("Middle Name", cp.panDetails?.middleName || '');
        drawRow("Last Name", cp.panDetails?.lastName || '');
        drawRow("Full Name", cp.panDetails?.fullName || '');
        drawRow("Gender", cp.panDetails?.gender || '');
        drawRow("Date of Birth", cp.panDetails?.dateOfBirth ? moment(cp.panDetails.dateOfBirth).format('DD/MM/YYYY') : '');
        drawRow("Category", cp.panDetails?.category || '');
        drawRow("Aadhaar Linked", cp.panDetails?.aadhaarLinked ? 'Yes' : 'No');
        drawRow("Masked Aadhaar", cp.panDetails?.maskedAadhaar || '');
        
        if (cp.authPan) {
            y -= 10;
            drawText("For Non-Individual Entity", 10, boldFont, margin, y);
            y -= 15;
            drawRow("Authorised Signatory PAN", cp.authPan || '');
            drawRow("Authorised Signatory Name", cp.authPanDetails?.fullName || '');
            drawRow("PAN Verification Status", cp.authPanVerified ? 'Verified' : 'Pending');
        }
        y -= 10;

        // Section 3
        drawSectionHeader("3. AADHAAR VERIFICATION DETAILS");
        drawRow("Aadhaar No. (Masked)", cp.aadhaar ? `XXXX XXXX ${cp.aadhaar.slice(-4)}` : '');
        drawRow("Full Name", cp.aadhaarDetails?.fullName || '');
        drawRow("Care of", cp.aadhaarDetails?.careOf || '');
        drawRow("Father Name", cp.aadhaarDetails?.fatherName || '');
        y -= 10;

        // Section 4
        if (cp.businessDetails?.udyam?.verificationStatus === "VERIFIED" || cp.businessDetails?.gst?.verificationStatus === "VERIFIED") {
            drawSectionHeader("4. BUSINESS VERIFICATION DETAILS");
            if (cp.businessDetails.udyam?.verificationStatus === "VERIFIED") {
                drawRow("Enterprise Name", cp.businessDetails.udyam.enterpriseName || '');
                drawRow("Organisation Type", cp.businessDetails.udyam.organisationType || '');
                drawRow("Major Activity", cp.businessDetails.udyam.majorActivity || '');
                drawRow("Udyam Address", cp.businessDetails.udyam.officialAddress || '');
            }
            if (cp.businessDetails.gst?.verificationStatus === "VERIFIED") {
                drawRow("GSTIN", cp.businessDetails.gst.selectedGstin || '');
                drawRow("Legal Name", cp.businessDetails.gst.legalName || '');
                drawRow("Business Name", cp.businessDetails.gst.businessName || '');
                drawRow("GST Status", cp.businessDetails.gst.gstinStatus || '');
                drawRow("GST Address", cp.businessDetails.gst.address || '');
            }
            y -= 10;
        }

        // Section 5
        if (cp.bankDetails) {
            drawSectionHeader("5. BANK DETAILS");
            drawRow("Bank Name", cp.bankDetails.bankName || '');
            drawRow("Account Number", cp.bankDetails.accountNumber || '');
            drawRow("IFSC Code", cp.bankDetails.ifsc || '');
            drawRow("Branch", cp.bankDetails.branch || '');
            drawRow("Verified Name", cp.bankDetails.fullName || '');
        }

        const pdfBytes = await doc.save();
        return pdfBytes;
    }
}

export default new PdfGeneratorService();
