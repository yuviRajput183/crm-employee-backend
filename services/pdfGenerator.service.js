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
            y -= 35;
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
        drawRow("Gender", cp.aadhaarDetails?.gender || '');
        drawRow("Date of Birth", cp.aadhaarDetails?.dateOfBirth ? moment(cp.aadhaarDetails.dateOfBirth).format('DD/MM/YYYY') : '');
        drawRow("Full Address", cp.aadhaarDetails?.fullAddress || '');
        drawRow("Care of", cp.aadhaarDetails?.careOf || '');
        drawRow("Father Name", cp.aadhaarDetails?.fatherName || '');
        drawRow("Mother Name", cp.aadhaarDetails?.motherName || '');
        
        const maritalStatusStr = cp.aadhaarDetails?.isMarried === true ? 'Married' : (cp.aadhaarDetails?.isMarried === false ? 'Unmarried' : '');
        if (maritalStatusStr) {
            drawRow("Marital Status", maritalStatusStr);
        }
        if (cp.aadhaarDetails?.isMarried && cp.aadhaarDetails?.spouseName) {
            drawRow("Spouse Name", cp.aadhaarDetails.spouseName);
        }

        if (cp.aadhaarDetails?.photo) {
            try {
                const base64Data = cp.aadhaarDetails.photo.split(',')[1] || cp.aadhaarDetails.photo;
                const imageBytes = Buffer.from(base64Data, 'base64');
                let embeddedImage;
                if (cp.aadhaarDetails.photo.includes('png')) {
                    embeddedImage = await doc.embedPng(imageBytes);
                } else {
                    embeddedImage = await doc.embedJpg(imageBytes);
                }
                const targetWidth = 80;
                const targetHeight = (embeddedImage.height / embeddedImage.width) * targetWidth;

                const rowHeight = Math.max(targetHeight + 20, 20);

                if (y - rowHeight < 50) {
                    page = doc.addPage([595, 842]);
                    y = height - margin;
                }

                const rectY = y + 15 - rowHeight;
                page.drawRectangle({
                    x: margin, y: rectY, width: 200, height: rowHeight,
                    borderColor: rgb(0.8, 0.8, 0.8), borderWidth: 1
                });
                page.drawRectangle({
                    x: margin + 200, y: rectY, width: width - 2 * margin - 200, height: rowHeight,
                    borderColor: rgb(0.8, 0.8, 0.8), borderWidth: 1
                });

                drawText("Photo", 10, boldFont, margin + 5, y);
                page.drawImage(embeddedImage, {
                    x: margin + 205,
                    y: rectY + 10,
                    width: targetWidth,
                    height: targetHeight,
                });
                
                y -= rowHeight;
            } catch (err) {
                console.error('Error embedding Aadhaar photo', err);
            }
        }
        y -= 10;

        // Section 4
        if (cp.businessDetails?.udyam?.verificationStatus === "VERIFIED" || cp.businessDetails?.gst?.verificationStatus === "VERIFIED" || cp.businessDetails?.registrationType) {
            drawSectionHeader("4. BUSINESS VERIFICATION DETAILS");
            
            if (cp.businessDetails?.registrationType) {
                drawRow("Registration Type", cp.businessDetails.registrationType);
            }

            if (cp.businessDetails?.udyam?.verificationStatus === "VERIFIED") {
                if (cp.businessDetails.udyam.udyamNumber) {
                    drawRow("Udyam Number", cp.businessDetails.udyam.udyamNumber);
                }
                drawRow("Type of Enterprise", cp.businessDetails.udyam.enterpriseType || '');
                drawRow("Major Activity", cp.businessDetails.udyam.majorActivity || '');
                drawRow("Type of Organisation", cp.businessDetails.udyam.organisationType || '');
                drawRow("Enterprise Name", cp.businessDetails.udyam.enterpriseName || '');
                drawRow("Owner Name", cp.businessDetails.udyam.ownerName || '');
                drawRow("Date of Incorporation", cp.businessDetails.udyam.dateOfIncorporation || '');
                drawRow("Official Address", cp.businessDetails.udyam.officialAddress || '');
                drawRow("Registration Date", cp.businessDetails.udyam.registrationDate || '');
                drawRow("Last Updated Date", cp.businessDetails.udyam.lastUpdatedDate || '');
                
                if (cp.businessDetails.udyam.selectedUnit) {
                    let unitStr = cp.businessDetails.udyam.selectedUnit;
                    if (typeof unitStr === 'object') {
                        // try to format if it's an object
                        const u = unitStr;
                        unitStr = [u.unit_name || u.unitName, u.flat, u.building, u.village_town || u.villageTown, u.block, u.road, u.city, u.district, u.state, u.pin].filter(Boolean).join(', ');
                    }
                    drawRow("Selected Unit", unitStr);
                }
            }
            if (cp.businessDetails?.gst?.verificationStatus === "VERIFIED") {
                drawRow("GSTIN", cp.businessDetails.gst.selectedGstin || '');
                drawRow("Legal Name", cp.businessDetails.gst.legalName || '');
                drawRow("Business Name", cp.businessDetails.gst.businessName || '');
                drawRow("Constitution of Business", cp.businessDetails.gst.constitutionOfBusiness || '');
                drawRow("Date of Registration", cp.businessDetails.gst.dateOfRegistration || '');
                drawRow("Taxpayer Type", cp.businessDetails.gst.taxpayerType || '');
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
            if (cp.bankDetails.addressSource) {
                drawRow("Address Source", cp.bankDetails.addressSource);
            }
            y -= 10;
        }

        // Section 6: Declarations & Confirmations
        drawSectionHeader("6. DECLARATIONS & CONFIRMATIONS");
        
        const applicantName = cp.aadhaarDetails?.fullName || cp.panDetails?.fullName || '';
        const capacity = cp.businessDetails?.capacity || 'Director/Authorized Signatory';
        const enterpriseName = cp.businessDetails?.udyam?.enterpriseName || cp.businessDetails?.gst?.legalName || '';

        if (cp.aadhaarConfirmed) {
            drawRow("Aadhaar Details", "I confirm that all the details shown above are correct and agree to use the same for the onboarding process.");
        }
        
        if (cp.businessDetails?.udyam && cp.businessDetails.udyam.declarationAccepted) {
            if (cp.businessDetails.udyam.declarationType === 'REGISTERED') {
                const udyamNumber = cp.businessDetails.udyam.udyamNumber || '';
                const text = `I, ${applicantName}, the applicant, in the capacity of ${capacity} of ${enterpriseName} confirms that I/We are registered as Micro or Small or Medium Enterprise under the Micro, Small and Medium Enterprises Development Act, 2006 via registration number ${udyamNumber}. In case of any change in the registration status it will be my/our responsibility to inform you of the same immediately.`;
                drawRow("Udyam Declaration", text);
            } else {
                drawRow("Udyam Declaration", "Not Registered - Declaration Accepted");
            }
        }
        
        if (cp.businessDetails?.gst && cp.businessDetails.gst.declarationAccepted) {
            if (cp.businessDetails.gst.declarationType === 'REGISTERED') {
                const gstin = cp.businessDetails.gst.selectedGstin || '';
                const text = `I, ${applicantName}, the applicant, in the capacity of ${capacity} of ${enterpriseName} confirms that I/We are registered under Good and Services Tax, 2017 via registration number ${gstin}. In case of any change in the registration status it will be my/our responsibility to inform you of the same immediately.`;
                drawRow("GST Declaration", text);
            } else {
                drawRow("GST Declaration", "Not Registered - Declaration Accepted");
            }
        }
        
        if (cp.bankDetails?.detailsConfirmed) {
            drawRow("Bank & Partner Details", "Confirmed and declaration accepted by user");
        }

        const pdfBytes = await doc.save();
        return pdfBytes;
    }

    async generateLoanAgreementPdf(lead) {
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

        drawText("LOAN AGREEMENT", 18, boldFont, width/2 - 70, y, rgb(0.1, 0.2, 0.4));
        y -= 40;

        drawText(`Agreement Date: ${moment().format('DD/MM/YYYY')}`, 12, font, margin, y);
        y -= 20;

        drawText(`Lead No: ${lead.leadNo || ''}`, 12, font, margin, y);
        y -= 20;

        drawText(`Borrower Name: ${lead.clientName || ''}`, 12, font, margin, y);
        y -= 20;

        drawText(`Mobile Number: ${lead.mobileNo || ''}`, 12, font, margin, y);
        y -= 20;

        drawText(`Loan Amount: ${lead.loanRequirementAmount || ''}`, 12, font, margin, y);
        y -= 40;

        drawText("Terms and Conditions", 14, boldFont, margin, y);
        y -= 20;
        
        const terms = [
            "1. The borrower agrees to repay the loan amount with interest.",
            "2. The loan amount shall be disbursed to the verified bank account.",
            "3. This agreement is electronically signed via Aadhaar OTP.",
            "4. The terms are subject to the lender's policies."
        ];

        for (const term of terms) {
            drawText(term, 10, font, margin, y);
            y -= 15;
        }

        // Leave space for eSign signature (Surepass positions)
        // Position: { "1": [{ x: 80, y: 85 }] } -> Bottom of page 1

        const pdfBytes = await doc.save();
        return Buffer.from(pdfBytes);
    }
}

export default new PdfGeneratorService();
