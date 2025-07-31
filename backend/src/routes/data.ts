import express from 'express';
import { asyncHandler } from '../middleware/errorHandler';
import { protect, admin } from '../middleware/authMiddleware';
import {
    startEmitterController,
    stopEmitterController,
    getEmittersStatusController,
    manualEntryController
} from '../controllers/dataController';

const router = express.Router();

router.use(protect, admin);

router.post('/synthetic/start', asyncHandler(startEmitterController));
router.post('/synthetic/stop', asyncHandler(stopEmitterController));
router.get('/synthetic/status', asyncHandler(getEmittersStatusController));

// CORRECCIÓN: La ruta correcta es /manual-entry
router.post('/manual-entry', asyncHandler(manualEntryController));

export default router;