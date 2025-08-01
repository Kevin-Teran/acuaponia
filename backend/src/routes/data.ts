import express from 'express';
import { asyncHandler } from '../middleware/errorHandler';
import { protect, admin } from '../middleware/authMiddleware';
import {
    startEmitterController,
    stopEmitterController,
    getEmittersStatusController,
    manualEntryController,
    getHistoricalData,
    getLatestData
} from '../controllers/dataController';

const router = express.Router();

// --- Rutas solo para Administradores ---
router.post('/synthetic/start', protect, admin, asyncHandler(startEmitterController));
router.post('/synthetic/stop', protect, admin, asyncHandler(stopEmitterController));
router.get('/synthetic/status', protect, admin, asyncHandler(getEmittersStatusController));
router.post('/manual', protect, admin, asyncHandler(manualEntryController));

// --- Rutas para cualquier usuario autenticado ---

router.get('/historical', protect, asyncHandler(getHistoricalData));
router.get('/latest', protect, asyncHandler(getLatestData));

export default router;