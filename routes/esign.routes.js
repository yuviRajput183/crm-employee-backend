import express from 'express';
import { startEsign, getEsignStatus, getSignedDocument, getActiveEsign } from '../controller/esign.controller.js';
import { authenticate } from '../middlewares/verifyayth.middleware.js';

import multer from 'multer';

const upload = multer({ storage: multer.memoryStorage() });
const router = express.Router();

router.use(authenticate);

router.post('/channel-partners/:channelPartnerId/start', upload.single('document'), startEsign);
router.get('/channel-partners/:channelPartnerId/active', getActiveEsign);
router.get('/:esignId/status', getEsignStatus);
router.get('/:esignId/document', getSignedDocument);

export default router;
