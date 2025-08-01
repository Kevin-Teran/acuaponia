import express from 'express';
import { asyncHandler } from '../middleware/errorHandler';
import { protect, admin } from '../middleware/authMiddleware';
import { getSettingsController, updateSettingsController } from '../controllers/settingsController';

const router = express.Router();

// Todas las rutas de configuración requieren autenticación de administrador
router.use(protect, admin);

router.route('/')
    .get(asyncHandler(getSettingsController))
    .put(asyncHandler(updateSettingsController));

export default router;