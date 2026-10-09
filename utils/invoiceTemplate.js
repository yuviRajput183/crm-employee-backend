export const generateInvoiceHtml = (data) => {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Tax Invoice</title>
    <link href="https://fonts.googleapis.com/css2?family=Roboto:wght@400;700&display=swap" rel="stylesheet">
    <style>
        body { font-family: 'Roboto', Arial, sans-serif; font-size: 13px; margin: 0; padding: 15px; }
        .text-center { text-align: center; }
        .font-bold { font-weight: bold; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 12px; }
        th, td { border: 1px solid black; padding: 5px 8px; }
        .header-bg { background-color: #f3f4f6; }
        .w-50 { width: 50%; }
        .signature-section { display: flex; justify-content: space-between; margin-top: 20px; }
        .signature-block { text-align: center; width: 45%; }
        .signature-block p { margin: 2px 0; }
        .brand-color { color: #000080; }
    </style>
</head>
<body>
    <h3 class="text-center font-bold" style="margin-bottom: 15px;">TAX INVOICE</h3>

    <!-- Metadata Table -->
    <table>
        <tr>
            <td class="w-50">Invoice No.</td>
            <td class="text-center">${data.invoiceNumber || ''}</td>
        </tr>
        <tr>
            <td>Invoice Date</td>
            <td class="text-center">${data.invoiceDate || ''}</td>
        </tr>
        <tr>
            <td>Connector Code</td>
            <td class="text-center">${data.connectorCode || ''}</td>
        </tr>
        <tr>
            <td>Product</td>
            <td class="text-center">${data.productClassification || ''}</td>
        </tr>
    </table>

    <!-- Supplier Table -->
    <table>
        <tr>
            <td colspan="2" class="font-bold text-center header-bg">Details of Supplier (Seller/Service Provider)</td>
        </tr>
        <tr>
            <td class="w-50">Name:</td>
            <td class="text-center">Urbanedge Loan Sahayak Private Limited</td>
        </tr>
        <tr>
            <td>Address</td>
            <td class="text-center">${data.supplierAddress || ''}</td>
        </tr>
        <tr>
            <td>GSTIN</td>
            <td class="text-center">${data.supplierGstin || ''}</td>
        </tr>
    </table>

    <!-- Recipient Table -->
    <table>
        <tr>
            <td colspan="2" class="font-bold text-center header-bg">Details of Recipient (Billed to)</td>
        </tr>
        <tr>
            <td class="w-50">Name</td>
            <td class="text-center">${data.recipientName || ''}</td>
        </tr>
        <tr>
            <td>Address</td>
            <td class="text-center">${data.recipientAddress || ''}</td>
        </tr>
        <tr>
            <td>State /State Code</td>
            <td class="text-center">${data.recipientState || ''}</td>
        </tr>
        <tr>
            <td>GSTIN</td>
            <td class="text-center">${data.recipientGstin || ''}</td>
        </tr>
        <tr>
            <td>Place of supply:</td>
            <td class="text-center">${data.recipientPlaceOfSupply || ''}</td>
        </tr>
    </table>

    <!-- Amounts Table -->
    <table>
        <tr>
            <td class="font-bold w-50">Commission Value /Basic Amount*</td>
            <td class="text-center font-bold">&#8377; ${data.basicAmount || '0.00'}</td>
        </tr>
        ${data.isHaryana ? `
        <tr>
            <td class="font-bold">CGST- 9%</td>
            <td class="text-center">&#8377; ${data.cgstAmount || '0.00'}</td>
        </tr>
        <tr>
            <td class="font-bold">SGST- 9%</td>
            <td class="text-center">&#8377; ${data.sgstAmount || '0.00'}</td>
        </tr>
        ` : `
        <tr>
            <td class="font-bold">IGST- 18%</td>
            <td class="text-center">&#8377; ${data.igstAmount || '0.00'}</td>
        </tr>
        `}
        <tr>
            <td class="font-bold">Round off</td>
            <td class="text-center">${data.roundOff < 0 ? '-' : ''}&#8377; ${Math.abs(data.roundOff || 0).toFixed(2)}</td>
        </tr>
        <tr>
            <td class="font-bold">Total Invoice Value (In figure)</td>
            <td class="text-center font-bold">&#8377; ${data.totalInvoiceValue || '0.00'}</td>
        </tr>
        <tr>
            <td class="font-bold">Total Invoice Value (In Words)</td>
            <td class="text-center">${data.totalInvoiceValueInWords || ''} Rupees</td>
        </tr>
    </table>

    <!-- Description Table -->
    <table>
        <tr>
            <td class="w-50">Description of Goods / Services</td>
            <td class="text-center">Commission</td>
        </tr>
        <tr>
            <td>HSN/SAC Code</td>
            <td class="text-center">997159</td>
        </tr>
        <tr>
            <td>Whether Subject to Reverse Charge--RCM</td>
            <td class="text-center">No</td>
        </tr>
    </table>

    <!-- Payment Details Table -->
    <table>
        <tr>
            <td class="w-50">Payment Details:</td>
            <td class="text-center"></td>
        </tr>
        <tr>
            <td>Bank-</td>
            <td class="text-center">${data.bankName || ''}</td>
        </tr>
        <tr>
            <td>Account No.</td>
            <td class="text-center">${data.accountNo || ''}</td>
        </tr>
        <tr>
            <td>IFSC Code</td>
            <td class="text-center">${data.ifscCode || ''}</td>
        </tr>
    </table>

    <div style="margin-top: 15px;">
        *case(s) details attached in Separate Sheet
    </div>

    <div class="signature-section">
        <div class="signature-block">
            <br/><br/>
            <p>Name of the person Issuing Invoice</p>
            <p>Designation</p>
            <p>Signature with Rubber Stamp / Digital</p>
            <p>Signature</p>
        </div>
        <div class="signature-block">
            <p>${data.authorizedSignatoryName || 'Juhi'}</p>
            <p>${data.authorizedSignatoryDesignation || 'Director'}</p>
            <p class="brand-color" style="font-size: 11px; font-weight: bold; margin-top: 10px;">For Urbanedge Loan Sahayak Private Limited</p>
            ${data.stampAndSignBase64 ? 
                `<img src="${data.stampAndSignBase64}" alt="Signature" style="max-width: 150px; max-height: 80px; margin: 5px 0;" />` : 
                `<p class="brand-color" style="font-family: 'Brush Script MT', cursive; font-size: 28px; margin: 5px 0;">${data.authorizedSignatoryName || 'Juhi'}</p>`
            }
            <p class="brand-color" style="font-weight: bold; font-size: 11px;">Auth. Sign.</p>
        </div>
    </div>
</body>
</html>
    `;
};
