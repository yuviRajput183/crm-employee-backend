import express from 'express';
import { previewInvoice, generateInvoice } from '../controller/accountInvoice.controller.js';
import { authenticate } from '../middlewares/verifyayth.middleware.js';

const router = express.Router();

router.post('/preview', authenticate, previewInvoice);
router.post('/generate', authenticate, generateInvoice);

export default router;
