import express from 'express';
import { asyncHandler } from '../middleware/errorHandler';
import { authValidation } from '../middleware/validation';

// Se importan las funciones del controlador que acabamos de crear.
import { login, refresh, getMe, logout } from '../controllers/authController';

const router = express.Router();

// --- Definición de Rutas ---
// Cada ruta define un endpoint de la API y lo asocia con una función del controlador.
// La lógica compleja ya no está aquí, haciendo este archivo mucho más limpio.

// Ruta para el inicio de sesión
router.post('/login', authValidation.login, asyncHandler(login));

// Ruta para refrescar el token de acceso
router.post('/refresh', asyncHandler(refresh));

// Ruta para obtener los datos del usuario autenticado
router.get('/me', asyncHandler(getMe));

// Ruta para cerrar sesión
router.post('/logout', asyncHandler(logout));

export default router;