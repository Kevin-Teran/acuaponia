import express from 'express';
import { asyncHandler } from '../middleware/errorHandler';
import { getTanks, createTank, updateTank, deleteTank } from '../controllers/tankController';

const router = express.Router();

// Aplicar middleware de protección aquí
// router.use(protect);

router.route('/').get(asyncHandler(getTanks)).post(asyncHandler(createTank));
router.route('/:id').put(asyncHandler(updateTank)).delete(asyncHandler(deleteTank));

export default router;