import httpStatus from 'http-status';
import catchAsync from '../../utils/catchAsync';
import sendResponse from '../../utils/sendResponse';
import { AuthServices } from './auth.service';
import facebook from './auth.facebook';
import google from './auth.google';


const loginUser = catchAsync(async (req, res) => {
  const result = await AuthServices.loginUser(req.body);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    message: 'User logged in successfully',
    data: result,
  });
});

const createOtp = catchAsync(async (req, res) => {
  const result = await AuthServices.createOtp(req.body);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    message: '6 Digit otp sent to your email',
    data: result,
  });
});

const verifyOtp = catchAsync(async (req, res) => {
  const result = await AuthServices.verifyOtp(req.body);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    message: 'OTP verified successfully',
    data: result,
  });
});

const resetPassword = catchAsync(async (req, res) => {
  const result = await AuthServices.resetPassword(req.body);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    message: 'Password reset successfully',
    data: result,
  });
});

const facebookLogin = catchAsync(async (req, res) => {
  const result = await facebook.authenticate(req.body);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    message: 'User logged in successfully',
    data: result,
  });
});

const googleLogin = catchAsync(async (req, res) => {
  const result = await google.authenticate(req.body);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    message: 'User logged in successfully',
    data: result,
  });
});

export const AuthControllers = {
  loginUser,
  facebookLogin,
  googleLogin,
  createOtp,
  verifyOtp,
  resetPassword,
};
