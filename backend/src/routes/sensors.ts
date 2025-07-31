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

// Aplica protección a todas las rutas. CUALQUIER usuario debe estar logueado.
router.use(protect);

// Rutas principales
router.route('/')
    .get(asyncHandler(getSensors))
    .post(sensorValidation.create, asyncHandler(createSensor));

// Rutas por ID
router.route('/:id')
    .get(asyncHandler(getSensorById))
    .put(sensorValidation.update, asyncHandler(updateSensor))
    .delete(asyncHandler(deleteSensor));

// Rutas específicas
router.get('/tank/:tankId', asyncHandler(getSensorsByTank));
router.get('/hardware/:hardwareId', admin, asyncHandler(getSensorByHardwareId)); // Solo admin puede buscar por hardware

export default router;