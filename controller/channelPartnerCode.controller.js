import mongoose from "mongoose";
import ChannelPartner from "../models/ChannelPartner.model.js";
import Counter from "../models/Counter.model.js";
import Employee from "../models/Employee.model.js";
import ErrorResponse from "../lib/error.res.js";

// Helper to check if user is admin
const checkIfAdmin = async (employeeId) => {
    const employee = await Employee.findById(employeeId).populate("department");
    if (employee && employee.department && employee.department.name.toLowerCase().includes("admin")) {
        return true;
    }
    return false;
};

export const getEligibleReferrers = async (req, res, next) => {
    try {
        const referrers = await ChannelPartner.find({
            status: "active"
        }).select("_id code businessDetails panDetails aadhaarDetails");

        const formatted = referrers.map(cp => ({
            _id: cp._id,
            code: cp.code,
            name: cp.businessDetails?.udyam?.enterpriseName 
                  || cp.businessDetails?.gst?.legalName 
                  || cp.panDetails?.fullName 
                  || cp.aadhaarDetails?.fullName 
                  || 'Unknown'
        }));

        res.status(200).json({ success: true, data: formatted });
    } catch (error) {
        next(ErrorResponse.internalServer(error.message));
    }
};

export const getReferralInfo = async (req, res, next) => {
    try {
        const { id } = req.params;
        const cp = await ChannelPartner.findById(id).select("_id code referredByLevel1Id dealPercentage");
        if (!cp) return next(ErrorResponse.notFound("Channel Partner not found"));

        let level1 = null;
        let level2 = null;

        if (cp.referredByLevel1Id) {
            level1 = await ChannelPartner.findById(cp.referredByLevel1Id).select("_id code businessDetails panDetails aadhaarDetails");
            
            // Derive Level 2
            if (level1 && level1.referredByLevel1Id) {
                level2 = await ChannelPartner.findById(level1.referredByLevel1Id).select("_id code businessDetails panDetails aadhaarDetails");
            }
        }

        const getName = (partner) => {
            if (!partner) return null;
            return partner.businessDetails?.udyam?.enterpriseName 
                  || partner.businessDetails?.gst?.legalName 
                  || partner.panDetails?.fullName 
                  || partner.aadhaarDetails?.fullName 
                  || 'Unknown';
        };

        res.status(200).json({
            success: true,
            data: {
                channelPartner: {
                    _id: cp._id,
                    code: cp.code,
                    dealPercentage: cp.dealPercentage
                },
                level1: level1 ? { _id: level1._id, code: level1.code, name: getName(level1) } : null,
                level2: level2 ? { _id: level2._id, code: level2.code, name: getName(level2) } : null,
                referralDealPercentage: cp.dealPercentage
            }
        });
    } catch (error) {
        next(ErrorResponse.internalServer(error.message));
    }
};

export const generateCode = async (req, res, next) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const { channelPartnerId, referredByLevel1Id, dealType, dealPercentage } = req.body;
        const generatedById = req.user.referenceId; // Extracted from token by authenticate middleware

        if (!channelPartnerId || !dealType || dealPercentage === undefined) {
            throw ErrorResponse.badRequest("Missing required fields");
        }

        if (dealType !== "Fixed" && dealType !== "Variable") {
            throw ErrorResponse.badRequest("Invalid deal type");
        }

        if (dealPercentage < 0) {
            throw ErrorResponse.badRequest("Deal percentage must be >= 0");
        }

        const cp = await ChannelPartner.findById(channelPartnerId).session(session);
        if (!cp) throw ErrorResponse.notFound("Channel Partner not found");
        if (cp.code) throw ErrorResponse.badRequest("Code already generated for this Channel Partner");

        let level2Id = null;
        let referralDealPercentage = 0;
        let balanceReferralDealPercentage = 0;

        if (referredByLevel1Id) {
            if (String(referredByLevel1Id) === String(channelPartnerId)) {
                throw ErrorResponse.badRequest("A channel partner cannot refer itself");
            }

            const ref1 = await ChannelPartner.findById(referredByLevel1Id).session(session);
            if (!ref1 || ref1.status !== "active") {
                throw ErrorResponse.badRequest("Selected referral channel partner is not eligible");
            }

            referralDealPercentage = ref1.dealPercentage || 0;

            if (dealType === "Fixed" || dealType === "Variable") {
                if (dealPercentage > referralDealPercentage) {
                    throw ErrorResponse.badRequest("Channel partner deal cannot be greater than the referral deal");
                }
            }
            
            if (dealType === "Fixed") {
                balanceReferralDealPercentage = referralDealPercentage - dealPercentage;
            }

            // Derive Level 2 securely from DB
            level2Id = ref1.referredByLevel1Id || null;
            
            if (String(level2Id) === String(channelPartnerId)) {
                throw ErrorResponse.badRequest("Circular referral relationship detected");
            }
        }

        // Determine Status based on role
        const isAdmin = await checkIfAdmin(generatedById);
        const status = isAdmin ? "active" : "pending_approval";
        const approvedBy = isAdmin ? generatedById : null;
        const approvedAt = isAdmin ? new Date() : null;

        // Atomic Code Generation
        const counter = await Counter.findOneAndUpdate(
            { name: "CP_CODE" },
            { $inc: { seq: 1 } },
            { new: true, upsert: true, session }
        );
        const newCode = `LSP-${String(counter.seq).padStart(6, '0')}`;

        // Update CP
        cp.code = newCode;
        cp.referredByLevel1Id = referredByLevel1Id || null;
        cp.referredByLevel2Id = level2Id;
        cp.dealType = dealType;
        cp.dealPercentage = dealPercentage;
        cp.referralDealPercentage = referralDealPercentage;
        cp.balanceReferralDealPercentage = balanceReferralDealPercentage;
        cp.generatedBy = generatedById;
        cp.generatedAt = new Date();
        cp.status = status;
        cp.applicationStatus = "COMPLETED";

        if (approvedBy) {
            cp.approvedBy = approvedBy;
            cp.approvedAt = approvedAt;
        }

        await cp.save({ session });

        await session.commitTransaction();
        session.endSession();

        const cpName = cp.businessDetails?.udyam?.enterpriseName 
                  || cp.businessDetails?.gst?.legalName 
                  || cp.panDetails?.fullName 
                  || cp.aadhaarDetails?.fullName 
                  || 'Unknown';

        res.status(200).json({
            success: true,
            message: `The channel partner code no. ${newCode} has been generated for ${cpName}`,
            data: {
                code: cp.code,
                status: cp.status,
                channelPartnerName: cpName
            }
        });
    } catch (error) {
        await session.abortTransaction();
        session.endSession();
        next(error.statusCode ? error : ErrorResponse.internalServer(error.message));
    }
};

export const approveCode = async (req, res, next) => {
    try {
        const { id } = req.params;
        const cp = await ChannelPartner.findById(id);

        if (!cp) return next(ErrorResponse.notFound("Channel Partner not found"));
        if (cp.status === "active") return next(ErrorResponse.badRequest("Code is already active"));

        cp.status = "active";
        cp.approvedBy = req.user.referenceId;
        cp.approvedAt = new Date();

        await cp.save();

        res.status(200).json({
            success: true,
            message: "Channel Partner code approved successfully",
            data: cp
        });
    } catch (error) {
        next(ErrorResponse.internalServer(error.message));
    }
};
