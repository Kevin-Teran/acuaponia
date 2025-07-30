import express from 'express';
import { asyncHandler } from '../middleware/errorHandler';
import { protect, admin } from '../middleware/authMiddleware';
import { getSensors, createSensor, updateSensor, deleteSensor, getSensorsByTankId } from '../controllers/sensorController';

const router = express.Router();

// Protege todas las rutas de este archivo
router.use(protect);

router.route('/').get(asyncHandler(getSensors)).post(asyncHandler(createSensor));
router.route('/:id').put(asyncHandler(updateSensor)).delete(asyncHandler(deleteSensor));
router.get('/tank/:tankId', admin, asyncHandler(getSensorsByTankId));

export default router;