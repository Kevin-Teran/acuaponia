import express from 'express';
import { asyncHandler } from '../middleware/errorHandler';
import { getSensors, createSensor, updateSensor, deleteSensor } from '../controllers/sensorController';
import { protect } from '../middleware/authMiddleware';

const router = express.Router();

router.use(protect);

router.route('/').get(asyncHandler(getSensors)).post(asyncHandler(createSensor));
router.route('/:id').put(asyncHandler(updateSensor)).delete(asyncHandler(deleteSensor));

export default router;