import axios from 'axios';
import FormData from 'form-data';

class SurepassService {
    constructor() {
        this.apiToken = process.env.SUREPASS_API_TOKEN || "";
        this.baseUrl = process.env.SUREPASS_BASE_URL || "https://sandbox.surepass.app";
    }

    async verifyPanComprehensive(panNumber) {
        if (!this.apiToken) {
            throw new Error('Surepass API token is not configured in environment variables');
        }

        try {
            const response = await axios.post(
                `${this.baseUrl}/api/v1/pan/pan-comprehensive`,
                { id_number: panNumber },
                {
                    headers: {
                        'Authorization': `Bearer ${this.apiToken}`,
                        'Content-Type': 'application/json'
                    }
                }
            );

            console.log("Surepass verifyPanComprehensive response:", JSON.stringify(response.data));
            return response.data;
        } catch (error) {
            console.error('Surepass verify PAN Error:', error.response?.data || error.message);
            throw new Error('Failed to verify PAN with Surepass');
        }
    }

    async initializeDigilocker() {
        if (!this.apiToken) {
            throw new Error('Surepass API token is not configured in environment variables');
        }

        try {
            const response = await axios.post(
                `${this.baseUrl}/api/v1/digilocker/initialize`,
                {
                    data: {
                        signup_flow: true,
                        skip_main_screen: true
                    }
                },
                {
                    headers: {
                        'Authorization': `Bearer ${this.apiToken}`,
                        'Content-Type': 'application/json'
                    }
                }
            );
            console.log("Surepass initializeDigilocker response:", JSON.stringify(response.data));
            return response.data;
        } catch (error) {
            console.error('Surepass Digilocker Initialize Error:', error.response?.data || error.message);
            throw new Error('Failed to initialize Digilocker with Surepass');
        }
    }

    async downloadAadhaarXml(clientId) {
        if (!this.apiToken) {
            throw new Error('Surepass API token is not configured in environment variables');
        }

        try {
            const response = await axios.get(
                `${this.baseUrl}/api/v1/digilocker/download-aadhaar/${clientId}`,
                {
                    headers: {
                        'Authorization': `Bearer ${this.apiToken}`,
                        'Content-Type': 'application/json'
                    }
                }
            );
            console.log("Surepass downloadAadhaarXml response:", JSON.stringify(response.data));
            return response.data;
        } catch (error) {
            console.error('Surepass Digilocker Download Aadhaar Error:', error.response?.data || error.message);
            throw new Error('Failed to download Aadhaar XML from Surepass');
        }
    }
    
    async verifyBankAccount(accountNumber, ifsc) {
        if (!this.apiToken) {
            throw new Error('Surepass API token is not configured in environment variables');
        }

        try {
            const response = await axios.post(
                `${this.baseUrl}/api/v1/bank-verification`,
                {
                    id_number: accountNumber,
                    ifsc: ifsc,
                    ifsc_details: true
                },
                {
                    headers: {
                        'Authorization': `Bearer ${this.apiToken}`,
                        'Content-Type': 'application/json'
                    }
                }
            );
            console.log("Surepass verifyBankAccount response:", JSON.stringify(response.data));
            return response.data;
        } catch (error) {
            console.error('Surepass Bank Verification Error:', error.response?.data || error.message);
            throw new Error('Failed to verify Bank Account with Surepass');
        }
    }

    // --- eSign Methods ---

    async uploadEsignPdf(pdfBuffer, fileName) {
        if (!this.apiToken) {
            throw new Error('Surepass API token is not configured in environment variables');
        }

        try {
            const formData = new FormData();
            formData.append('file', pdfBuffer, fileName);
            formData.append('file_name', fileName);

            const response = await axios.post(
                `${this.baseUrl}/api/v1/files/esign/upload`,
                formData,
                {
                    headers: {
                        'Authorization': `Bearer ${this.apiToken}`,
                        ...formData.getHeaders()
                    },
                    maxContentLength: Infinity,
                    maxBodyLength: Infinity,
                    timeout: 60000
                }
            );

            console.log("Surepass uploadEsignPdf response:", JSON.stringify(response.data));

            const { data, success, status_code } = response.data;
            if (success === true && data && data.uploaded === true && data.file_id) {
                return {
                    fileId: data.file_id,
                    clientId: data.client_id
                };
            }

            throw new Error('Upload was not successful or missing file_id');
        } catch (error) {
            console.error('Surepass eSign Upload Error:', error.response?.data || error.message);
            throw new Error('Failed to upload PDF for eSign');
        }
    }

    async initializeAadhaarEsign({ fileId, fullName, mobileNumber, email, positions, redirectUrl }) {
        if (!this.apiToken) {
            throw new Error('Surepass API token is not configured in environment variables');
        }

        try {
            const payload = {
                file_id: fileId,
                sign_type: "aadhaar",
                config: {
                    reason: "Channel Partner Agreement",
                    positions: positions
                },
                prefill_options: {
                    full_name: fullName,
                    mobile_number: mobileNumber,
                    user_email: email || ""
                }
            };
            
            if (redirectUrl) {
                payload.config.redirect_url = redirectUrl;
            }

            const response = await axios.post(
                `${this.baseUrl}/api/v1/esign/initialize`,
                payload,
                {
                    headers: {
                        'Authorization': `Bearer ${this.apiToken}`,
                        'Content-Type': 'application/json'
                    }
                }
            );

            console.log("Surepass initializeAadhaarEsign response:", JSON.stringify(response.data));

            // Assuming Surepass responds with clientId and URL inside data
            const { data, success } = response.data;
            if (success === true && data) {
                return {
                    clientId: data.client_id,
                    signingUrl: data.url || data.signing_url
                };
            }

            throw new Error('Failed to initialize Aadhaar eSign in Surepass');
        } catch (error) {
            console.error('Surepass Initialize eSign Error:', error.response?.data || error.message);
            throw new Error('Failed to initialize Aadhaar eSign');
        }
    }

    async getEsignStatus(clientId) {
        if (!this.apiToken) {
            throw new Error('Surepass API token is not configured in environment variables');
        }

        try {
            const response = await axios.get(
                `${this.baseUrl}/api/v1/esign/status/${clientId}`,
                {
                    headers: {
                        'Authorization': `Bearer ${this.apiToken}`,
                        'Content-Type': 'application/json'
                    }
                }
            );

            console.log("Surepass getEsignStatus response:", JSON.stringify(response.data));
            return response.data;
        } catch (error) {
            console.error('Surepass getEsignStatus Error:', error.response?.data || error.message);
            throw new Error('Failed to check eSign status');
        }
    }

    async getSignedDocument(clientId) {
        if (!this.apiToken) {
            throw new Error('Surepass API token is not configured in environment variables');
        }

        try {
            const response = await axios.get(
                `${this.baseUrl}/api/v1/esign/get-signed-document/${clientId}`,
                {
                    headers: {
                        'Authorization': `Bearer ${this.apiToken}`,
                        'Content-Type': 'application/json'
                    }
                }
            );

            console.log("Surepass getSignedDocument response:", JSON.stringify(response.data));

            if (response.data && response.data.success) {
                return { url: response.data.data.url };
            }
            throw new Error('Document URL not found in Surepass response');
        } catch (error) {
            console.error('Surepass getSignedDocument Error:', error.response?.data || error.message);
            throw new Error('Failed to retrieve signed document from Surepass');
        }
    }
}

export default new SurepassService();
