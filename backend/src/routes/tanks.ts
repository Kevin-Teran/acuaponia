import express from 'express';
import { asyncHandler } from '../middleware/errorHandler';
import { protect, admin } from '../middleware/authMiddleware';
import { tankValidation } from '../middleware/validation';
import {
    getTanks,
    getTankById,
    createTank,
    updateTank,
    deleteTank,
    getTanksByUser
} from '../controllers/tankController';

const router = express.Router();

// Aplicar middleware de protección y admin a todas las rutas
router.use(protect, admin);

// Rutas específicas (deben ir antes de las rutas con parámetros)
router.get('/user/:userId', asyncHandler(getTanksByUser));

// Rutas principales
router.route('/')
    .get(asyncHandler(getTanks))
    .post(tankValidation.create, asyncHandler(createTank));

router.route('/:id')
    .get(asyncHandler(getTankById))
    .put(tankValidation.update, asyncHandler(updateTank))
    .delete(asyncHandler(deleteTank));

export default router;