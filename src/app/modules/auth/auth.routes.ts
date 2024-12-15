import express from 'express';
import validateRequest from '../../middlewares/validateRequest';
import { AuthControllers } from './auth.controller';
import { authValidation } from './auth.validation';

const router = express.Router();

router.post(
  '/login',
  validateRequest(authValidation.loginUser),
  AuthControllers.loginUser,
);

router.post(
  '/forget-password',
  validateRequest(authValidation.emailValidationSchema),
  AuthControllers.createOtp,
);

router.post(
  '/verify-otp',
  validateRequest(authValidation.otpValidationSchema),
  AuthControllers.verifyOtp,
);

router.post('/reset-password', AuthControllers.resetPassword);

router.post('/socialLogin', AuthControllers.socialLogin);



export const AuthRouters = router;
