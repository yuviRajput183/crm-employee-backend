import express from 'express';
import { authenticate, isAdminDepartment } from '../middlewares/verifyayth.middleware.js';
import { addProcessedBy, editProcessedBy, listProcessedBy } from '../controller/processedBy.controller.js';

const router = express.Router();

router.post('/add-processedBy', authenticate, isAdminDepartment, addProcessedBy);
router.get('/list-processedBy', authenticate, isAdminDepartment, listProcessedBy);
router.put('/edit-processedBy', authenticate, isAdminDepartment, editProcessedBy);

export default router;