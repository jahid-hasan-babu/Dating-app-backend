import express from 'express';
import auth from '../../middlewares/auth';
import validateRequest from '../../middlewares/validateRequest';
import { UserControllers } from './user.controller';
import { UserValidations } from './user.validation';

const router = express.Router();

router.post(
  '/',
  validateRequest(UserValidations.registerUser),
  UserControllers.registerUser,
);

router.put('/change-password/:id', UserControllers.changePassword);

export const UserRouters = router;
