import axios from "axios";

/**
 * Service to handle Business Verification (Udyam & GST).
 * Provides a normalized response structure for the controllers.
 * 
 * NOTE: Since the exact third-party API contracts were not provided, 
 * these methods contain standard Axios scaffolding but currently return
 * normalized mock responses or handle errors based on expected structures.
 * You should replace the mock payloads with actual provider endpoints.
 */
class BusinessVerificationService {
    
    // --- UDYAM --- //

    /**
     * Checks Udyam registration using Surepass PAN-Udyam API.
     */
    static async checkUdyamByPan(pan, fullName, dob) {
        try {
            const token = process.env.SUREPASS_API_TOKEN;
            const baseUrl = process.env.SUREPASS_API_URL || 'https://sandbox.surepass.app';

            const payload = {
                pan_number: pan,
                full_name: fullName,
                dob: dob // format: YYYY-MM-DD
            };
            
            console.log(`[checkUdyamByPan] Sending request to ${baseUrl}/api/v1/corporate/pan-udyam-check with payload:`, JSON.stringify(payload));

            const response = await axios.post(
                `${baseUrl}/api/v1/corporate/pan-udyam-check`,
                payload,
                {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    }
                }
            );

            console.log(`[checkUdyamByPan] Received response:`, JSON.stringify(response.data));

            if (!response.data.success) {
                throw new Error(response.data.message || "Failed to check Udyam by PAN");
            }

            const responseData = response.data.data;
            
            return {
                found: responseData.udyam_exists,
                migrationStatus: responseData.migration_status
            };

        } catch (error) {
            console.error("[checkUdyamByPan] Error:", error?.response?.data || error.message);
            throw new Error(error?.response?.data?.message || "Failed to check Udyam registration via provider.");
        }
    }

    static async sendUdyamOtp(registrationNumber, mobileNumber) {
        try {
            const token = process.env.SUREPASS_API_TOKEN;
            const baseUrl = process.env.SUREPASS_API_URL || 'https://sandbox.surepass.app';

            const payload = { 
                registration_number: registrationNumber,
                mobile_number: mobileNumber
            };
            console.log(`[sendUdyamOtp] Sending request to ${baseUrl}/api/v1/udyam-otp/send-otp with payload:`, JSON.stringify(payload));

            const response = await axios.post(
                `${baseUrl}/api/v1/udyam-otp/send-otp`,
                payload,
                {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    }
                }
            );

            console.log(`[sendUdyamOtp] Received response:`, JSON.stringify(response.data));

            if (response.data && response.data.success) {
                return { success: true, data: response.data.data };
            }
            throw new Error(response.data?.message || "Failed to send Udyam OTP");
        } catch (error) {
            console.error("[sendUdyamOtp] Error:", error?.response?.data || error.message);
            throw new Error("Failed to send Udyam OTP.");
        }
    }

    static async verifyUdyamNumber(clientId, otp) {
        try {
            const token = process.env.SUREPASS_API_TOKEN;
            const baseUrl = process.env.SUREPASS_API_URL || 'https://sandbox.surepass.app';

            const payload = { client_id: clientId, otp };
            console.log(`[verifyUdyamNumber] Sending request to ${baseUrl}/api/v1/udyam-otp/submit-otp with payload:`, JSON.stringify(payload));

            const response = await axios.post(
                `${baseUrl}/api/v1/udyam-otp/submit-otp`,
                payload,
                {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    }
                }
            );

            console.log(`[verifyUdyamNumber] Received response:`, JSON.stringify(response.data));

            if (response.data && response.data.success) {
                const details = response.data.data;
                
                return {
                    success: true,
                    data: {
                        enterpriseType: details.type_of_enterprise || "",
                        majorActivity: details.major_activity || "",
                        organisationType: details.type_of_organisation || "", 
                        enterpriseName: details.enterprise_name || "",
                        ownerName: details.owner_name || "",
                        dateOfIncorporation: details.date_of_incorporation || "",
                        officialAddress: (() => {
                            if (!details.official_address) return "";
                            if (typeof details.official_address === 'string') return details.official_address;
                            const addr = details.official_address;
                            return [
                                addr.flat_or_door_or_block,
                                addr.name_of_premises_or_building,
                                addr.road_or_street_or_lane,
                                addr.village_or_town,
                                addr.block,
                                addr.city,
                                addr.district,
                                addr.state,
                                addr.pin_code
                            ].filter(Boolean).join(', ');
                        })(),
                        units: details.unit_details || [],
                        registrationDate: details.registration_date || "",
                        lastUpdatedDate: details.last_updated_date || "",
                        certificateUrl: details.certificate_link || ""
                    }
                };
            }
            throw new Error(response.data?.message || "Failed to verify Udyam OTP");
        } catch (error) {
            console.error("[verifyUdyamNumber] Error:", error?.response?.data || error.message);
            throw new Error("Failed to verify Udyam Number.");
        }
    }

    // --- GST --- //

    static async checkGstByPan(pan) {
        try {
            const token = process.env.SUREPASS_API_TOKEN;
            const baseUrl = process.env.SUREPASS_API_URL || 'https://sandbox.surepass.app';

            const response = await axios.post(
                `${baseUrl}/api/v1/corporate/gstin-by-pan`,
                { id_number: pan },
                {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    }
                }
            );

            console.log(`[checkGstByPan] Received response:`, JSON.stringify(response.data));

            if (response.data && response.data.success && response.data.data && response.data.data.gstin_list) {
                const gstins = response.data.data.gstin_list;
                if (gstins.length === 0) {
                    return { found: false, gstins: [] };
                }
                return {
                    found: true,
                    gstins: gstins // Array of objects
                };
            }

            return { found: false, gstins: [] };
        } catch (error) {
            console.error("GST PAN Check failed:", error?.response?.data || error.message);
            throw new Error(error?.response?.data?.message || "Failed to check GST registration via provider.");
        }
    }

    static async verifyGstin(gstin) {
        try {
            const token = process.env.SUREPASS_API_TOKEN;
            const baseUrl = process.env.SUREPASS_API_URL || 'https://sandbox.surepass.app';

            const response = await axios.post(
                `${baseUrl}/api/v1/corporate/gstin`,
                { id_number: gstin },
                {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    }
                }
            );

            console.log(`[verifyGstin] Received response:`, JSON.stringify(response.data));

            if (response.data && response.data.success && response.data.data) {
                const data = response.data.data;
                return {
                    success: true,
                    data: {
                        gstin: data.gstin,
                        legalName: data.legal_name,
                        businessName: data.business_name,
                        constitutionOfBusiness: data.constitution_of_business,
                        dateOfRegistration: data.date_of_registration,
                        taxpayerType: data.taxpayer_type,
                        gstinStatus: data.gstin_status,
                        address: data.address
                    }
                };
            }

            throw new Error(response.data?.message || "Failed to verify GSTIN");
        } catch (error) {
            console.error("GST Verification failed:", error?.response?.data || error.message);
            throw new Error(error?.response?.data?.message || "Failed to verify GSTIN.");
        }
    }
}

export default BusinessVerificationService;
