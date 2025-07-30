import express from 'express';
import { asyncHandler } from '../middleware/errorHandler';
import { protect, admin } from '../middleware/authMiddleware';
import { manualDataEntry, startSyntheticEmitter, stopSyntheticEmitter, pauseSyntheticEmitter, resumeSyntheticEmitter, getSyntheticEmitterStatus  } from '../controllers/dataController';

const router = express.Router();
router.use(protect, admin);

router.post('/manual-entry', asyncHandler(manualDataEntry));
router.get('/synthetic/status', asyncHandler(getSyntheticEmitterStatus));
router.post('/synthetic/start', asyncHandler(startSyntheticEmitter));
router.post('/synthetic/stop', asyncHandler(stopSyntheticEmitter));
router.post('/synthetic/pause', asyncHandler(pauseSyntheticEmitter));
router.post('/synthetic/resume', asyncHandler(resumeSyntheticEmitter));

export default router;