import express from 'express';
import { asyncHandler } from '../middleware/errorHandler';
import { protect, admin } from '../middleware/authMiddleware'; 
import { getUsers,  createUser, updateUser, deleteUser, getUserById, getAllUsers } from '../controllers/userController';

const router = express.Router();

router.use(protect, admin);

router.route('/').get(asyncHandler(getUsers)).post(asyncHandler(createUser));
router.get('/all', asyncHandler(getAllUsers)); 
router.route('/:id').get(asyncHandler(getUserById)).put(asyncHandler(updateUser)).delete(asyncHandler(deleteUser));

export default router;