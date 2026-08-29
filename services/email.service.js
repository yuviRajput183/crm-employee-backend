import nodemailer from "nodemailer";

class EmailService {
    constructor() {
        this.transporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST || "smtp.gmail.com",
            port: process.env.SMTP_PORT || 587,
            secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
            auth: {
                user: process.env.SMTP_USER || "",
                pass: process.env.SMTP_PASS || "",
            },
        });
    }

    async sendEmailOtp(email, otp, validityMinutes) {
        const mailOptions = {
            from: process.env.SMTP_FROM_EMAIL || "thunderyuvi911@gmail.com",
            to: email,
            subject: "Email Verification OTP – Loan Sahayak Channel Partner Onboarding",
            text: `Dear Partner,

Greetings from Loan Sahayak!

Thank you for initiating your Channel Partner onboarding with us.

To verify your email address and proceed with the onboarding process, please use the One-Time Password (OTP) provided below:

Your Email Verification OTP: ${otp}

Please enter this OTP on the Loan Sahayak onboarding portal to complete your email verification.

This OTP is valid for ${validityMinutes} minutes and should not be shared with anyone.

If you did not initiate this onboarding request, please ignore this email.

Regards,
Team Loan Sahayak`,
        };

        try {
            await this.transporter.sendMail(mailOptions);
            return true;
        } catch (error) {
            console.error("Error sending email:", error);
            // In a real app we might throw error to notify failure
            return false;
        }
    }
}

export default new EmailService();
