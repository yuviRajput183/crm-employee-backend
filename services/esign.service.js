import fs from 'fs';
import path from 'path';
import ChannelPartner from '../models/ChannelPartner.model.js';
import EsignRequest from '../models/EsignRequest.model.js';
import surepassService from './surepass.service.js';
import axios from 'axios';

const ESIGN_POSITION = {
    "1": [{ x: 80, y: 85 }] // Bottom of the agreement
};

class EsignService {
    async startChannelPartnerAgreementEsign({ channelPartnerId, userId, file }) {
        const cp = await ChannelPartner.findById(channelPartnerId);
        if (!cp) {
            throw new Error("Channel Partner not found");
        }

        // Validate customer data
        const fullName = cp.panDetails?.fullName || cp.aadhaarDetails?.fullName;
        if (!fullName || !cp.mobile) {
            throw new Error("Customer information (Name, Mobile No) required for Aadhaar eSign is missing");
        }

        if (!file) {
            throw new Error("Agreement PDF file is required. Please upload the signed agreement.");
        }

        // Check for active eSign transaction
        const activeEsign = await EsignRequest.findOne({
            channelPartnerId,
            documentType: "CHANNEL_PARTNER_AGREEMENT",
            status: { $in: ["INITIATED", "PDF_UPLOADED", "OTP_SENT", "OTP_VERIFIED", "SIGNING", "SIGNED_PENDING_DOWNLOAD"] }
        });

        if (activeEsign && activeEsign.signingUrl) {
            try {
                // Verify if the token/session is still valid in Surepass
                const statusResponse = await surepassService.getEsignStatus(activeEsign.clientId);
                if (statusResponse.success && statusResponse.data) {
                    const surepassStatus = statusResponse.data.status;
                    // If Surepass reports it as expired or failed, we mark it and move on to create a new one.
                    if (surepassStatus === "session_expired" || surepassStatus === "esign_failed" || surepassStatus === "expired") {
                        activeEsign.status = "EXPIRED";
                        activeEsign.surepassStatus = surepassStatus;
                        await activeEsign.save();
                        // Let the flow continue to create a new session
                    } else {
                        // Session is still active, return it
                        return activeEsign;
                    }
                }
            } catch (err) {
                // If checking status fails (e.g., token invalid or session purged), mark it as expired
                console.warn(`Marking eSign session ${activeEsign.clientId} as EXPIRED due to validation failure:`, err.message);
                activeEsign.status = "EXPIRED";
                await activeEsign.save();
                // Let the flow continue to create a new session
            }
        }

        // Read the uploaded agreement PDF buffer
        const pdfBuffer = file.buffer;
        
        // Surepass limits file_name to 50 characters and ^[\w\-\_\.\' ]{1,50}$
        let baseName = file.originalname || cp.agreement?.fileName || `Agreement-${channelPartnerId}.pdf`;
        baseName = baseName.replace(/[^\w\-\_\.\' ]/g, ''); // Remove invalid characters
        if (baseName.length > 50) {
            // keep the extension, truncate the middle
            const ext = baseName.substring(baseName.lastIndexOf('.'));
            const nameWithoutExt = baseName.substring(0, baseName.lastIndexOf('.'));
            baseName = nameWithoutExt.substring(0, 50 - ext.length) + ext;
        }
        
        const fileName = baseName;

        // Upload to Surepass
        const { fileId, clientId } = await surepassService.uploadEsignPdf(pdfBuffer, fileName);

        // Initialize eSign
        const initData = await surepassService.initializeAadhaarEsign({
            fileId,
            fullName: fullName,
            mobileNumber: cp.mobile,
            email: cp.email,
            positions: ESIGN_POSITION
        });

        // Save EsignRequest
        const esignRequest = new EsignRequest({
            channelPartnerId,
            documentType: "CHANNEL_PARTNER_AGREEMENT",
            fileName,
            fileId,
            clientId: initData.clientId,
            signingUrl: initData.signingUrl,
            status: "PDF_UPLOADED",
            initiatedAt: new Date(),
            createdBy: userId
        });

        await esignRequest.save();

        return esignRequest;
    }

    async getEsignStatus(esignId) {
        const esignRequest = await EsignRequest.findById(esignId);
        if (!esignRequest) {
            throw new Error("Esign request not found");
        }

        if (esignRequest.status === "SIGNED") {
            return esignRequest;
        }

        try {
            const statusResponse = await surepassService.getEsignStatus(esignRequest.clientId);
            
            // Ensure success
            if (statusResponse.success && statusResponse.data) {
                const surepassStatus = statusResponse.data.status;
                
                const statusMap = {
                    client_initiated: "INITIATED",
                    otp_sent: "OTP_SENT",
                    otp_verified: "OTP_VERIFIED",
                    esign_started: "SIGNING",
                    esign_completed: "SIGNED_PENDING_DOWNLOAD",
                    esign_failed: "FAILED",
                    session_expired: "EXPIRED",
                    expired: "EXPIRED"
                };

                const mappedStatus = statusMap[surepassStatus] || esignRequest.status;
                
                esignRequest.surepassStatus = surepassStatus;
                
                if (mappedStatus !== esignRequest.status) {
                    esignRequest.status = mappedStatus;
                    await esignRequest.save();
                }

                if (mappedStatus === "SIGNED_PENDING_DOWNLOAD") {
                    await this.completeEsign(esignRequest);
                }
            }
        } catch (error) {
            console.warn(`Failed to check status for ${esignRequest.clientId}, possibly expired:`, error.message);
            // If the token is invalid or session not found, mark it as expired
            esignRequest.status = "EXPIRED";
            await esignRequest.save();
        }

        return esignRequest;
    }

    async completeEsign(esignRequest) {
        try {
            const documentData = await surepassService.getSignedDocument(esignRequest.clientId);
            
            // Download PDF
            const targetDir = path.join(process.cwd(), 'uploads', 'Agreements');
            if (!fs.existsSync(targetDir)) {
                fs.mkdirSync(targetDir, { recursive: true });
            }

            const fileName = `signed-${esignRequest.fileName}`;
            const targetPath = path.join(targetDir, fileName);

            const response = await axios({
                method: 'GET',
                url: documentData.url,
                responseType: 'stream'
            });

            const writer = fs.createWriteStream(targetPath);
            response.data.pipe(writer);

            await new Promise((resolve, reject) => {
                writer.on('finish', resolve);
                writer.on('error', reject);
            });

            const publicUrl = `/uploads/Agreements/${fileName}`;

            esignRequest.status = "SIGNED";
            esignRequest.signedDocumentUrl = publicUrl;
            esignRequest.signedAt = new Date();
            esignRequest.downloadedAt = new Date();
            await esignRequest.save();

            // Also update ChannelPartner
            const cp = await ChannelPartner.findById(esignRequest.channelPartnerId);
            if (cp) {
                cp.agreementSigningAt = new Date();
                cp.documents.signedAgreementUrl = publicUrl;
                if (cp.currentStage === 9) {
                    cp.currentStage = 10;
                }
                if (!cp.completedStages.includes(9)) {
                    cp.completedStages.push(9);
                }
                cp.markModified('documents');
                await cp.save();
            }

        } catch (error) {
            console.error("Failed to download or store signed document:", error);
            // Will retry on next status check
        }
    }
}

export default new EsignService();
