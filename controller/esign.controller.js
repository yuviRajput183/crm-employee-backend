import esignService from '../services/esign.service.js';
import EsignRequest from '../models/EsignRequest.model.js';
import mongoose from 'mongoose';
import axios from 'axios';

export const startEsign = async (req, res) => {
    try {
        const { channelPartnerId } = req.params;
        const userId = req.user?.referenceId || req.user?.id;
        const file = req.file;
        const forceNew = req.body.forceNew === 'true' || req.body.forceNew === true;
        const redirectUrl = req.body.redirectUrl;

        const esignRequest = await esignService.startChannelPartnerAgreementEsign({ channelPartnerId, userId, file, forceNew, redirectUrl });

        res.status(200).json({
            success: true,
            message: "Aadhaar eSign request created successfully",
            data: {
                esignId: esignRequest._id,
                clientId: esignRequest.clientId,
                signingUrl: esignRequest.signingUrl,
                status: esignRequest.status
            }
        });
    } catch (error) {
        console.error("Error in startEsign:", error.message);
        res.status(500).json({
            success: false,
            message: error.message || "Unable to start Aadhaar eSign. Please try again."
        });
    }
};

export const getActiveEsign = async (req, res) => {
    try {
        const { channelPartnerId } = req.params;
        const activeEsign = await EsignRequest.findOne({
            channelPartnerId,
            documentType: "CHANNEL_PARTNER_AGREEMENT",
        }).sort({ createdAt: -1 });

        if (activeEsign) {
            // refresh status if not completed
            if (activeEsign.status !== "SIGNED" && activeEsign.status !== "FAILED" && activeEsign.status !== "CANCELLED") {
                await esignService.getEsignStatus(activeEsign._id);
            }
            const updated = await EsignRequest.findById(activeEsign._id);
            return res.status(200).json({
                success: true,
                data: updated
            });
        }
        
        return res.status(200).json({
            success: true,
            data: null
        });

    } catch (error) {
        console.error("Error in getActiveEsign:", error.message);
        res.status(500).json({
            success: false,
            message: error.message || "Unable to get active eSign."
        });
    }
};

export const getEsignStatus = async (req, res) => {
    try {
        const { esignId } = req.params;

        const esignRequest = await esignService.getEsignStatus(esignId);

        res.status(200).json({
            success: true,
            data: esignRequest
        });
    } catch (error) {
        console.error("Error in getEsignStatus:", error.message);
        res.status(500).json({
            success: false,
            message: error.message || "Unable to get eSign status. Please try again."
        });
    }
};

export const getSignedDocument = async (req, res) => {
    try {
        const { esignId } = req.params;

        const esignRequest = await EsignRequest.findById(esignId);
        if (!esignRequest) {
            return res.status(404).json({
                success: false,
                message: "eSign record not found"
            });
        }

        if (esignRequest.status !== "SIGNED" && esignRequest.status !== "SIGNED_PENDING_DOWNLOAD") {
            return res.status(400).json({
                success: false,
                message: "Signed document is not available yet"
            });
        }

        // Get the URL from Surepass
        const documentData = await esignService.getSignedDocumentUrlFromSurepass(esignRequest);
        
        if (!documentData || !documentData.url) {
            return res.status(404).json({
                success: false,
                message: "Signed document download URL was not returned"
            });
        }

        console.log(`Fetching signed document for eSign ID: ${esignId}`);
        
        // Download the actual PDF on the backend
        const pdfResponse = await axios.get(documentData.url, {
            responseType: "arraybuffer"
        });

        if (pdfResponse.status !== 200) {
            return res.status(500).json({
                success: false,
                message: "Unable to download signed document"
            });
        }

        console.log("Signed PDF downloaded successfully");

        // Send the PDF buffer to frontend
        res.setHeader("Content-Type", "application/pdf");
        res.setHeader(
            "Content-Disposition",
            `attachment; filename="signed-agreement-${esignRequest.channelPartnerId.toString()}-${esignId}.pdf"`
        );

        res.send(pdfResponse.data);

    } catch (error) {
        console.error("Error in getSignedDocument:", error.message);
        res.status(500).json({
            success: false,
            message: "Unable to download signed document"
        });
    }
};

export const getPendingAdminEsigns = async (req, res) => {
    try {
        // Find all partners where user has signed, but admin hasn't
        // To do this, we need to join EsignRequest with ChannelPartner
        // For simplicity, we can fetch all ChannelPartners, then check esign requests
        // But better: fetch all user SIGNED requests, then filter out those that have an admin SIGNED request
        
        const userSignedRequests = await EsignRequest.find({
            documentType: "CHANNEL_PARTNER_AGREEMENT",
            status: { $in: ["SIGNED", "SIGNED_PENDING_DOWNLOAD"] }
        }).sort({ createdAt: -1 });

        // Include partners that have the signed document directly in their docStates
        const ChannelPartner = mongoose.model('ChannelPartner');
        const partnersWithSignedDoc = await ChannelPartner.find({
            "docStates.signedAgreementUrl": { $exists: true, $ne: null, $ne: "" }
        });

        const adminEsignRequests = await EsignRequest.find({
            documentType: "ADMIN_CHANNEL_PARTNER_AGREEMENT"
        });

        const userSignedCpIds = new Set([
            ...userSignedRequests.map(req => req.channelPartnerId.toString()),
            ...partnersWithSignedDoc.map(p => p._id.toString())
        ]);

        // Filter: We want all where user has signed, and we indicate if admin has signed
        const allRelevantPartners = await ChannelPartner.find({
            _id: { $in: Array.from(userSignedCpIds) }
        });

        // Map to return CP data with the user's esign request and admin sign status
        const result = allRelevantPartners.map(cp => {
            const cpId = cp._id.toString();
            const req = userSignedRequests.find(r => r.channelPartnerId.toString() === cpId);
            
            const adminReqs = adminEsignRequests.filter(ar => ar.channelPartnerId.toString() === cpId);
            const hasAdminSigned = adminReqs.some(ar => ar.status === "SIGNED" || ar.status === "SIGNED_PENDING_DOWNLOAD") || (cp.docStates && cp.docStates.adminSignedAgreementUrl);

            return {
                ...cp._doc,
                userEsignRequest: req || { signedAt: cp.docStates?.agreementSigningAt || cp.updatedAt },
                adminEsignStatus: hasAdminSigned ? "APPROVED" : "PENDING"
            };
        });

        res.status(200).json({
            success: true,
            data: result
        });

    } catch (error) {
        console.error("Error in getPendingAdminEsigns:", error.message);
        res.status(500).json({
            success: false,
            message: error.message || "Failed to fetch pending admin e-signs."
        });
    }
};

export const startAdminEsign = async (req, res) => {
    try {
        const { channelPartnerId } = req.params;
        const userId = req.user?.referenceId || req.user?.id;
        const forceNew = req.body.forceNew === 'true' || req.body.forceNew === true;
        const redirectUrl = req.body.redirectUrl;

        const esignRequest = await esignService.startAdminChannelPartnerAgreementEsign({ channelPartnerId, userId, forceNew, redirectUrl });

        res.status(200).json({
            success: true,
            message: "Admin Aadhaar eSign request created successfully",
            data: {
                esignId: esignRequest._id,
                clientId: esignRequest.clientId,
                signingUrl: esignRequest.signingUrl,
                status: esignRequest.status
            }
        });
    } catch (error) {
        console.error("Error in startAdminEsign:", error.message);
        res.status(500).json({
            success: false,
            message: error.message || "Unable to start admin Aadhaar eSign. Please try again."
        });
    }
};

export const getAdminActiveEsign = async (req, res) => {
    try {
        const { channelPartnerId } = req.params;
        const activeEsign = await EsignRequest.findOne({
            channelPartnerId,
            documentType: "ADMIN_CHANNEL_PARTNER_AGREEMENT",
        }).sort({ createdAt: -1 });

        if (activeEsign) {
            if (activeEsign.status !== "SIGNED" && activeEsign.status !== "FAILED" && activeEsign.status !== "CANCELLED") {
                await esignService.getEsignStatus(activeEsign._id);
            }
            const updated = await EsignRequest.findById(activeEsign._id);
            return res.status(200).json({
                success: true,
                data: updated
            });
        }
        
        return res.status(200).json({
            success: true,
            data: null
        });

    } catch (error) {
        console.error("Error in getAdminActiveEsign:", error.message);
        res.status(500).json({
            success: false,
            message: error.message || "Unable to get admin active eSign."
        });
    }
};
