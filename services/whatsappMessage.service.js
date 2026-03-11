import axios from 'axios';

class WhatsAppMessageService {
    get apiUrl() { return process.env.WHATSAPP_API_URL || 'YOUR_API_URL_HERE'; }
    get apiKey() { return process.env.WHATSAPP_API_KEY || 'YOUR_API_KEY_HERE'; }
    get wabaNumber() { return process.env.WABA_NUMBER || 'YOUR_WABA_NUMBER_HERE'; }

    /**
     * Send a WhatsApp message when a lead or payout state changes
     * @param {string} mobileNumber - The recipient's mobile number
     * @param {string} templateName - The exact registered name of the WhatsApp template
     * @param {Array<string>} templateParams - Ordered array of string parameters to replace {{1}}, {{2}}, etc.
     */
    async sendWhatsAppMessage(mobileNumber, templateName, templateParams = []) {
        try {
            // Build the payload - ADJUST THIS STRUCTURE based on the 3rd party API docs
            // (e.g., WATI, Interakt, Meta Cloud API, Msg91, etc.)
            
            // Example structure using standard Meta Cloud API / Interakt format
            const payload = {
                to: "91" + mobileNumber,
                type: "template",
                template: {
                    name: templateName,
                    language: {
                        code: "en" // Adjust if template language is different (e.g., en_US, hi)
                    },
                    components: [
                        {
                            type: "body",
                            parameters: templateParams.map(param => ({
                                type: "text",
                                text: param ? String(param) : "N/A"
                            }))
                        }
                    ]
                }
            };

            const response = await axios.post(
                this.apiUrl,
                payload,
                {
                    headers: {
                        'Key': this.apiKey, 
                        'Content-Type': 'application/json',
                        'wabaNumber': this.wabaNumber
                    }
                },
            );

            console.log(`WhatsApp message sent successfully to ${mobileNumber} for template ${templateName}`);
            return response.data;
        } catch (error) {
            console.error(`Error sending WhatsApp message [Template: ${templateName}]:`, error?.response?.data || error.message);
            return null; 
        }
    }

    /**
     * Send a standard text message for testing purposes via DoveSoft API
     * @param {string} mobileNumber - The recipient's mobile number
     * @param {string} text - The text content of the message
     */
    async sendTestMessage(mobileNumber, text) {
        try {
            const payload = {
                "messaging_product": "whatsapp",
                "to": "91" + mobileNumber,
                "type": "text",
                "recipient_type": "individual",
                "text": {
                    "body": text
                }
            };

            const response = await axios.post(
                'https://api.dovesoft.io//REST/directApi/message',
                payload,
                {
                    headers: {
                        'Key': this.apiKey,
                        'Content-Type': 'application/json',
                        'wabaNumber': this.wabaNumber
                    }
                }
            );

            console.log(`WhatsApp test message sent successfully to ${mobileNumber}`);
            return response.data;
        } catch (error) {
            console.error(`Error sending WhatsApp test message:`, error?.response?.data || error.message);
            return null;
        }
    }


    /**
     * 1. gst_payment
     * Variables: {{1}} Name, {{2}} Month, {{3}} Amount, {{4}} UTR No, {{5}} Txn Date
     */
    async sendGstPaymentMessage(mobileNumber, data) {
        const { name, month, amount, utrNo, txnDate } = data;
        return await this.sendWhatsAppMessage(mobileNumber, 'gst_payment', [name, month, amount, utrNo, txnDate]);
    }

    /**
     * 2. dsamessage
     * Variables: None
     */
    async sendDsaMessage(mobileNumber) {
        return await this.sendWhatsAppMessage(mobileNumber, 'dsamessage', []);
    }

    /**
     * 3. payout_release_ulspl
     * Variables: {{1}} Name, {{2}} Case Name, {{3}} Disbursal Amt, {{4}} Gross Payout, {{5}} TDS Amt, {{6}} Net Amt, {{7}} UTR No, {{8}} Txn Date
     */
    async sendPayoutReleaseUlsplMessage(mobileNumbers, data) {
        const { name, caseName, disbursalAmount, grossPayout, tdsAmount, netAmount, utrNo, txnDate } = data;
        const numbers = Array.isArray(mobileNumbers) ? mobileNumbers : [mobileNumbers];
        for (const mobileNumber of numbers) {
            if (mobileNumber) {
                await this.sendWhatsAppMessage(mobileNumber, 'payout_release_ulspl', [name, caseName, disbursalAmount, grossPayout, tdsAmount, netAmount, utrNo, txnDate]);
            }
        }
        return true;
    }

    /**
     * 4. partnerpayout
     * Variables: None (Document attached)
     */
    async sendPartnerPayoutMessage(mobileNumber) {
        // Note: For document templates, the payload structure might differ to attach media
        return await this.sendWhatsAppMessage(mobileNumber, 'partnerpayout', []);
    }

    /**
     * 5. payout_released
     * Variables: {{1}} Name, {{2}} Case Name, {{3}} Amount, {{4}} Payout %, {{5}} Txn Date
     */
    async sendPayoutReleasedMessage(mobileNumber, data) {
        const { name, caseName, amount, payoutPercent, txnDate } = data;
        return await this.sendWhatsAppMessage(mobileNumber, 'payout_released', [name, caseName, amount, payoutPercent, txnDate]);
    }

    /**
     * 6. payout_made
     * Variables: {{1}} Name, {{2}} Case Name, {{3}} Product, {{4}} Disbursed Amt, {{5}} Payout %, {{6}} Payout Amt
     */
    async sendPayoutMadeMessage(mobileNumbers, data) {
        const { name, caseName, product, disbursedAmount, payoutPercent, payoutAmount } = data;
        const numbers = Array.isArray(mobileNumbers) ? mobileNumbers : [mobileNumbers];
        for (const mobileNumber of numbers) {
            if (mobileNumber) {
                await this.sendWhatsAppMessage(mobileNumber, 'payout_made', [name, caseName, product, disbursedAmount, payoutPercent, payoutAmount]);
            }
        }
        return true;
    }

    /**
     * 7. loan_reject
     * Variables: {{1}} Name, {{2}} Loan Type, {{3}} Lead No, {{4}} Reason/Status, {{5}} Signature/Sender Name
     */
    async sendLoanRejectMessage(mobileNumber, data) {
        const { name, loanType, leadNo, reason, senderName } = data;
        return await this.sendWhatsAppMessage(mobileNumber, 'loan_reject', [name, loanType, leadNo, reason, senderName]);
    }

    /**
     * 8. banker_disbursa
     * Variables: {{1}} Banker Name, {{2}} Advisor Name, {{3}} Case Name, {{4}} Bank Name, {{5}} LAN No, {{6}} Disbursed Amt, {{7}} Product, {{8}} Location, {{9}} Sender Name
     */
    async sendBankerDisbursalMessage(mobileNumber, data) {
        const { bankerName, advisorName, caseName, bankName, lanNo, disbursedAmount, product, location, senderName } = data;
        return await this.sendWhatsAppMessage(mobileNumber, 'banker_disbursa', [bankerName, advisorName, caseName, bankName, lanNo, disbursedAmount, product, location, senderName]);
    }

    /**
     * 9. loan_disbursal
     * Variables: {{1}} Name, {{2}} Loan Type, {{3}} Bank Name, {{4}} Loan Amt, {{5}} LAN No, {{6}} Sender Name
     */
    async sendLoanDisbursalMessage(mobileNumber, data) {
        const { name, loanType, bankName, loanAmount, lanNo, senderName } = data;
        return await this.sendWhatsAppMessage(mobileNumber, 'loan_disbursal', [name, loanType, bankName, loanAmount, lanNo, senderName]);
    }

    /**
     * 10. advisor_update
     * Variables: {{1}} Advisor Name, {{2}} Lead No, {{3}} Client Name, {{4}} Feedback, {{5}} Remarks, {{6}} Sender Name
     */
    async sendAdvisorUpdateMessage(mobileNumber, data) {
        const { advisorName, leadNo, clientName, feedback, remarks, senderName } = data;
        return await this.sendWhatsAppMessage(mobileNumber, 'advisor_update', [advisorName, leadNo, clientName, feedback, remarks, senderName]);
    }

    /**
     * 11. loan_approval
     * Variables: {{1}} Name, {{2}} Loan Type, {{3}} Lead No, {{4}} Remarks, {{5}} Sender Name
     */
    async sendLoanApprovalMessage(mobileNumber, data) {
        const { name, loanType, leadNo, remarks, senderName } = data;
        return await this.sendWhatsAppMessage(mobileNumber, 'loan_approval', [name, loanType, leadNo, remarks, senderName]);
    }

    /**
     * 12. docs_query
     * Variables: {{1}} Name, {{2}} Loan Type, {{3}} Lead No, {{4}} Remarks, {{5}} Sender Name
     */
    async sendDocsQueryMessage(mobileNumber, data) {
        const { name, loanType, leadNo, remarks, senderName } = data;
        return await this.sendWhatsAppMessage(mobileNumber, 'docs_query', [name, loanType, leadNo, remarks, senderName]);
    }

    /**
     * 13. under_process
     * Variables: {{1}} Name, {{2}} Loan Type, {{3}} Lead No, {{4}} Remarks, {{5}} Sender Name, {{6}} Extra details (if any)
     */
    async sendUnderProcessMessage(mobileNumber, data) {
        const { name, loanType, leadNo, remarks, senderName, extra } = data;
        return await this.sendWhatsAppMessage(mobileNumber, 'under_process', [name, loanType, leadNo, remarks, senderName, extra || ""]);
    }

    /**
     * 14. add_lead
     * Variables: {{1}} Name, {{2}} Service, {{3}} Client Name, {{4}} Lead No, {{5}} Service Req, {{6}} Contact Details, {{7}} Sender Name
     */
    async sendAddLeadMessage(mobileNumber, data) {
        const { name, service, clientName, leadNo, serviceRequired, contactDetails, senderName } = data;
        return await this.sendWhatsAppMessage(mobileNumber, 'add_lead', [name, service, clientName, leadNo, serviceRequired, contactDetails, senderName]);
    }

    /**
     * 15. marketing
     * Variables: None (Image attached)
     */
    async sendMarketingMessage(mobileNumber) {
        return await this.sendWhatsAppMessage(mobileNumber, 'marketing', []);
    }

    /**
     * 16. form16a2
     * Variables: {{1}} Name, {{2}} Quarter
     */
    async sendForm16a2Message(mobileNumber, data) {
        const { name, quarter } = data;
        return await this.sendWhatsAppMessage(mobileNumber, 'form16a2', [name, quarter]);
    }

    /**
     * 17. idbibank
     * Variables: None (Image attached)
     */
    async sendIdbiBankMessage(mobileNumber) {
        return await this.sendWhatsAppMessage(mobileNumber, 'idbibank', []);
    }

    /**
     * 18. newtemplate
     * Variables: {{1}} Name, {{2}} Quarter
     */
    async sendNewTemplateMessage(mobileNumber, data) {
        const { name, quarter } = data;
        return await this.sendWhatsAppMessage(mobileNumber, 'newtemplate', [name, quarter]);
    }

    /**
     * 19. form16a
     * Variables: {{1}} Name, {{2}} Quarter
     */
    async sendForm16aMessage(mobileNumber, data) {
        const { name, quarter } = data;
        return await this.sendWhatsAppMessage(mobileNumber, 'form16a', [name, quarter]);
    }
}

export default new WhatsAppMessageService();
