import axios from 'axios';

class SurepassService {
    constructor() {
        this.apiToken = process.env.SUREPASS_API_TOKEN || '';
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

            console.log(response);
            console.log("-----------------------------------------")
            console.log(response.data);

            return response.data;
        } catch (error) {
            console.error('Surepass verify PAN Error:', error.response?.data || error.message);
            throw new Error('Failed to verify PAN with Surepass');
        }
    }
}

export default new SurepassService();
