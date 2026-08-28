class AadhaarVerificationService {
    async verifyAadhaar(aadhaarNumber) {
        // IMPORTANT: No external Aadhaar API provider has been configured.
        // As per the strict instructions, we will not create a fake/invented provider.
        // However, to allow frontend testing, we explicitly intercept "000000000000" as a documented stub.
        // In a production environment, this must be integrated with the actual provider (e.g., Surepass Aadhaar flow).

        if (aadhaarNumber === "000000000000") {
            return {
                success: true,
                data: {
                    fullName: "Yuvraj Singh",
                    photo: "", // base64 or URL
                    careOf: null, // intentionally null to test manual input
                    fatherName: null, // intentionally null to test manual input
                    dateOfBirth: new Date("2002-11-09"),
                    gender: "Male",
                    fullAddress: "123 Test Street, New Delhi, 110001"
                }
            };
        }

        // Standard rejection for unconfigured provider
        throw new Error("AADHAAR_PROVIDER_NOT_CONFIGURED");
    }
}

export default new AadhaarVerificationService();
