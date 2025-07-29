import express from 'express';
import { asyncHandler } from '../middleware/errorHandler';
import { getSensors, createSensor, updateSensor, deleteSensor } from '../controllers/sensorController';

const router = express.Router();

// Aplicar middleware de protección aquí
// router.use(protect);

router.route('/').get(asyncHandler(getSensors)).post(asyncHandler(createSensor));
router.route('/:id').put(asyncHandler(updateSensor)).delete(asyncHandler(deleteSensor));

export default router;