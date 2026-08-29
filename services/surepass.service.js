import axios from 'axios';

class SurepassService {
    constructor() {
        this.apiToken = process.env.SUREPASS_API_TOKEN || "";
    }

    async verifyPanComprehensive(panNumber) {
        if (!this.apiToken) {
            throw new Error('Surepass API token is not configured in environment variables');
        }

        try {
            const response = await axios.post(
                'https://sandbox.surepass.app/api/v1/pan/pan-comprehensive',
                { id_number: panNumber },
                {
                    headers: {
                        'Authorization': `Bearer ${this.apiToken}`,
                        'Content-Type': 'application/json'
                    }
                }
            );

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
                'https://sandbox.surepass.app/api/v1/digilocker/initialize',
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
                `https://sandbox.surepass.app/api/v1/digilocker/download-aadhaar/${clientId}`,
                {
                    headers: {
                        'Authorization': `Bearer ${this.apiToken}`,
                        'Content-Type': 'application/json'
                    }
                }
            );
            return response.data;
        } catch (error) {
            console.error('Surepass Digilocker Download Aadhaar Error:', error.response?.data || error.message);
            throw new Error('Failed to download Aadhaar XML from Surepass');
        }
    }
}

export default new SurepassService();
