import express from 'express';
import { authenticate, isAdminDepartment } from '../middlewares/verifyayth.middleware.js';
import { 
    getEligibleReferrers, 
    getReferralInfo, 
    generateCode, 
    approveCode 
} from '../controller/channelPartnerCode.controller.js';

const router = express.Router();

// Get eligible Channel Partners
router.get('/eligible-referrers', authenticate, getEligibleReferrers);

// Get Referral Information
router.get('/:id/referral-info', authenticate, getReferralInfo);

// Generate Code
router.post('/', authenticate, generateCode);

// Approve Code
router.patch('/:id/approve', authenticate, isAdminDepartment, approveCode);

export default router;
