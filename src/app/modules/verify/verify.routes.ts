import express from 'express';
import validateRequest from '../../middlewares/validateRequest';
import { VerifyControllers } from './verify.controller';
import { authValidation } from './verify.validation';
import auth from '../../middlewares/auth';
const router = express.Router();

router.post(
  '/get-otp',
  auth(),
  validateRequest(authValidation.emailValidationSchema),
  VerifyControllers.createOtp,
);

router.post(
  '/verify-otp',
  auth(),
  validateRequest(authValidation.otpValidationSchema),
  VerifyControllers.verifyOtp,
);

router.put('/verify-user', auth(), VerifyControllers.verifyUser);

export const VerifyRouters = router;
