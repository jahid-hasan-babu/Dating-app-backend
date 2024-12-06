import express from 'express';
import validateRequest from '../../middlewares/validateRequest';
import { AuthControllers } from './auth.controller';
import { authValidation } from './auth.validation';
import facebookLogin from './auth.facebook';
const router = express.Router();

router.post(
  '/login',
  validateRequest(authValidation.loginUser),
  AuthControllers.loginUser,
);

router.post(
  '/create-otp',
  validateRequest(authValidation.emailValidationSchema),
  AuthControllers.createOtp,
);

router.post('/facebook', AuthControllers.facebookLogin);
router.post('/google', AuthControllers.googleLogin);


export const AuthRouters = router;
