import httpStatus from 'http-status';
import catchAsync from '../../utils/catchAsync';
import sendResponse from '../../utils/sendResponse';
import { ProfileServices } from './profile.service';
import { Request, Response } from 'express';

import AppError from '../../errors/AppError';

const getAllProfiles = catchAsync(async (req: Request, res: Response) => {
  const result = await ProfileServices.getAllProfiles(req);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    message: 'Profile Retrieve successfully',
    data: result,
  });
});

const getMyProfile = catchAsync(async (req: any, res: Response) => {
  const userId = req.user.id;

  if (!userId) {
    throw new AppError(httpStatus.UNAUTHORIZED, 'User not authenticated');
  }

  const result = await ProfileServices.getMyProfile(userId);
  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'User profile retrieved successfully',
    data: result,
  });
});

const getSingleProfile = catchAsync(async (req: Request, res: Response) => {
  const result = await ProfileServices.getSingleProfile(req.params.userId);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    message: 'Profile Retrieve successfully',
    data: result,
  });
});

const updateProfile = catchAsync(async (req: Request, res: Response) => {
  const result = await ProfileServices.updateProfile(
    req.params.userId, // userId from URL params
    req.body, // Payload from request body
    req, // Request object (for handling files and other details)
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    message: 'Profile updated successfully',
    data: result,
  });
});

const deleteProfile = catchAsync(async (req: Request, res: Response) => {
  const result = await ProfileServices.deleteProfile(req.params.userId);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    message: 'Profile deleted successfully',
    data: result,
  });
});

export const ProfileControllers = {
  getAllProfiles,
  getSingleProfile,
  getMyProfile,
  updateProfile,
  deleteProfile,
};
