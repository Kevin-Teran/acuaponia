import express from 'express';
import { asyncHandler } from '../middleware/errorHandler';
import { getUsers, createUser, updateUser, deleteUser, getUserById } from '../controllers/userController';

const router = express.Router();

router.route('/').get(asyncHandler(getUsers)).post(asyncHandler(createUser));
router.route('/:id').get(asyncHandler(getUserById)).put(asyncHandler(updateUser)).delete(asyncHandler(deleteUser));

export default router;