import express from 'express';
import { asyncHandler } from '../middleware/errorHandler';
import { authValidation } from '../middleware/validation';
import { login, refresh, getMe, logout } from '../controllers/authController';

const router = express.Router();

router.post('/login', 
  authValidation.login, 
  asyncHandler(login)
);

router.post('/refresh', 
  asyncHandler(refresh)
);

router.get('/me', 
  asyncHandler(getMe)
);

router.post('/logout', 
  asyncHandler(logout)
);

export default router;