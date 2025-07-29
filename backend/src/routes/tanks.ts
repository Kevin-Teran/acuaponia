import express from 'express';
import { asyncHandler } from '../middleware/errorHandler';
import { getTanks, createTank, updateTank, deleteTank } from '../controllers/tankController';
import { protect } from '../middleware/authMiddleware';

const router = express.Router();

router.use(protect);

router.route('/').get(asyncHandler(getTanks)).post(asyncHandler(createTank));
router.route('/:id').put(asyncHandler(updateTank)).delete(asyncHandler(deleteTank));

export default router;