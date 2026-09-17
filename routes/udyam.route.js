import express from 'express';
import { downloadUdyamCertificate } from '../controller/udyam.controller.js';
import { authenticate } from '../middlewares/verifyayth.middleware.js';

const router = express.Router();

router.post('/certificate/pdf', authenticate, downloadUdyamCertificate);

export default router;
