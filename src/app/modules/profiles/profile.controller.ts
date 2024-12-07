import httpStatus from 'http-status';
import catchAsync from '../../utils/catchAsync';
import sendResponse from '../../utils/sendResponse';
import { ProfileServices } from './profile.service';
import { Request, Response } from 'express';

// const registerProfile = catchAsync(async (req: Request, res: Response) => {
//   const result = await ProfileServices.registerProfile(req.body);
//   sendResponse(res, {
//     statusCode: httpStatus.CREATED,
//     message: 'Profile Register successfully',
//     data: result,
//   });
// });

const getAllProfiles = catchAsync(async (req: Request, res: Response) => {
  const result = await ProfileServices.getAllProfiles(req);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    message: 'Profile Retrieve successfully',
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
    req.params.userId,  // userId from URL params
    req.body,  // Payload from request body
    req  // Request object (for handling files and other details)
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
  updateProfile,
  deleteProfile,
};
