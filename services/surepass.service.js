import axios from 'axios';

class SurepassService {
    constructor() {
        this.apiToken = process.env.SUREPASS_API_TOKEN || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJmcmVzaCI6ZmFsc2UsImlhdCI6MTc4NjM2MDI3NCwianRpIjoiNTIyMTgyOTEtM2U3OS00MDBmLTgyZDktNDFjY2U5ZDQwODc2IiwidHlwZSI6ImFjY2VzcyIsImlkZW50aXR5IjoiZGV2LmxvYW5zYWhheWFrQHN1cmVwYXNzLmlvIiwibmJmIjoxNzg2MzYwMjc0LCJleHAiOjE3ODg5NTIyNzQsImVtYWlsIjoibG9hbnNhaGF5YWtAc3VyZXBhc3MuaW8iLCJ0ZW5hbnRfaWQiOiJtYWluIiwidXNlcl9jbGFpbXMiOnsic2NvcGVzIjpbInVzZXIiXX19.lQiBwlQt0s3sNahs0W0KniPvMN5Bp3zVkSv5r0z5nX0";
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
