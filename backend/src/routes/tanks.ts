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
    getTanksByUserId
} from '../controllers/tankController';

const router = express.Router();

// Middleware de protección para TODAS las rutas de tanques.
// Todas las operaciones requieren que el usuario esté autenticado.
router.use(protect);

// Rutas principales
router.route('/')
    /**
     * @route   GET /api/tanks
     * @desc    Obtiene tanques. Si es ADMIN, todos. Si es USER, solo los suyos.
     * @access  Private
     */
    .get(asyncHandler(getTanks))
    /**
     * @route   POST /api/tanks
     * @desc    Cualquier usuario autenticado puede crear un nuevo tanque.
     * @access  Private
     */
    .post(tankValidation.create, asyncHandler(createTank));

// Rutas que operan sobre un tanque específico por su ID
router.route('/:id')
    /**
     * @route   GET /api/tanks/:id
     * @desc    Obtiene un tanque por su ID. El permiso se verifica en el controlador.
     * @access  Private
     */
    .get(asyncHandler(getTankById))
    /**
     * @route   PUT /api/tanks/:id
     * @desc    Actualiza un tanque. El permiso se verifica en el controlador.
     * @access  Private
     */
    .put(tankValidation.update, asyncHandler(updateTank))
    /**
     * @route   DELETE /api/tanks/:id
     * @desc    Elimina un tanque. El permiso se verifica en el controlador.
     * @access  Private
     */
    .delete(asyncHandler(deleteTank));

/**
 * @route   GET /api/tanks/user/:userId
 * @desc    Obtiene todos los tanques de un usuario específico.
 * @access  Private (Admin Only)
 */
router.get('/user/:userId', admin, asyncHandler(getTanksByUserId));

export default router;