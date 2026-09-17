import esignService from '../services/esign.service.js';
import EsignRequest from '../models/EsignRequest.model.js';

export const startEsign = async (req, res) => {
    try {
        const { channelPartnerId } = req.params;
        const userId = req.user?.referenceId || req.user?.id;
        const file = req.file;

        const esignRequest = await esignService.startChannelPartnerAgreementEsign({ channelPartnerId, userId, file });

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

        // Optionally, check authorization to access this lead here
        const esignRequest = await esignService.getEsignStatus(esignId); // Refresh status just in case

        if (esignRequest.status !== "SIGNED" || !esignRequest.signedDocumentUrl) {
            return res.status(400).json({
                success: false,
                message: "Signed document is not available yet."
            });
        }

        res.status(200).json({
            success: true,
            data: {
                signedDocumentUrl: esignRequest.signedDocumentUrl
            }
        });
    } catch (error) {
        console.error("Error in getSignedDocument:", error.message);
        res.status(500).json({
            success: false,
            message: error.message || "Unable to retrieve signed document. Please try again."
        });
    }
};
