import express from 'express';
import { asyncHandler } from '../middleware/errorHandler';
import { protect, admin } from '../middleware/authMiddleware';
import { sensorValidation } from '../middleware/validation';
import {
    getSensors,
    getSensorById,
    createSensor,
    updateSensor,
    deleteSensor,
    getSensorsByTank,
    getSensorByHardwareId
} from '../controllers/sensorController';

const router = express.Router();

// Aplicar middleware de protección y admin a todas las rutas
router.use(protect, admin);

// Rutas específicas (deben ir antes de las rutas con parámetros)
router.get('/tank/:tankId', asyncHandler(getSensorsByTank));
router.get('/hardware/:hardwareId', asyncHandler(getSensorByHardwareId));

// Rutas principales
router.route('/')
    .get(asyncHandler(getSensors))
    .post(sensorValidation.create, asyncHandler(createSensor));

router.route('/:id')
    .get(asyncHandler(getSensorById))
    .put(sensorValidation.update, asyncHandler(updateSensor))
    .delete(asyncHandler(deleteSensor));

export default router;