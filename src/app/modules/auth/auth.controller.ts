import httpStatus from 'http-status';
import catchAsync from '../../utils/catchAsync';
import sendResponse from '../../utils/sendResponse';
import { AuthServices } from './auth.service';
import { Request, Response } from 'express';

const loginUser = catchAsync(async (req: Request, res: Response) => {
  const result = await AuthServices.loginUser(req.body);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    message: 'User logged in successfully',
    data: result,
  });
});

const logout = catchAsync(
  async (req: Request & { user?: any }, res: Response) => {
    const userId = req.user.id;
    console.log(userId);
    const result = await AuthServices.logout(userId);
    sendResponse(res, {
      statusCode: httpStatus.OK,
      message: 'User logged out successfully',
      data: result,
    });
  },
);

const createOtp = catchAsync(async (req: Request, res: Response) => {
  const result = await AuthServices.createOtp(req.body);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    message: '6 Digit otp sent to your email',
    data: result,
  });
});

const verifyOtp = catchAsync(async (req: Request, res: Response) => {
  const result = await AuthServices.verifyOtp(req.body);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    message: 'OTP verified successfully',
    data: result,
  });
});

const resetPassword = catchAsync(async (req: Request, res: Response) => {
  const result = await AuthServices.resetPassword(req.body);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    message: 'Password reset successfully',
    data: result,
  });
});

const socialLogin = catchAsync(async (req: Request, res: Response) => {
  const result = await AuthServices.socialLogin(req.body);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    message: 'User logged in successfully',
    data: result,
  });
});

export const AuthControllers = {
  loginUser,
  socialLogin,
  logout,
  createOtp,
  verifyOtp,
  resetPassword,
};
