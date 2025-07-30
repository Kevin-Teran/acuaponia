import express from 'express';
import { asyncHandler } from '../middleware/errorHandler';
import { protect, admin } from '../middleware/authMiddleware';
import { getTanks, createTank, updateTank, deleteTank, getTanksByUserId } from '../controllers/tankController';

const router = express.Router();

router.use(protect);

router.route('/').get(asyncHandler(getTanks)).post(asyncHandler(createTank));
router.route('/:id').put(asyncHandler(updateTank)).delete(asyncHandler(deleteTank));
router.get('/user/:userId', admin, asyncHandler(getTanksByUserId));

export default router;