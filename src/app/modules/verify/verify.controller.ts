import httpStatus from 'http-status';
import { Request, Response } from 'express';
import catchAsync from '../../utils/catchAsync';
import sendResponse from '../../utils/sendResponse';
import { VerifyServices } from './verify.service';
import AppError from '../../errors/AppError';

const createOtp = catchAsync(async (req: Request, res: Response) => {
  const result = await VerifyServices.createOtp(req.body);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    message: '6 Digit otp sent to your email',
    data: result,
  });
});

const verifyOtp = catchAsync(
  async (req: Request & { user?: any }, res: Response) => {
    const userID = req.user.id;
    const { otp, email } = req.body;
    const result = await VerifyServices.verifyOtp(userID, email, otp);
    sendResponse(res, {
      statusCode: httpStatus.OK,
      message: 'Profile verified successfully',
      data: result,
    });
  },
);


const verifyUser = catchAsync(
  async (req: Request & { user?: any }, res: Response) => {
    const userID = req.user.id;
    const result = await VerifyServices.verifyUser(userID);
    sendResponse(res, {
      statusCode: httpStatus.OK,
      message: 'Profile verified successfully',
      data: result,
    });
  },
);
export const VerifyControllers = {
  createOtp,
  verifyOtp,
  verifyUser,
};
