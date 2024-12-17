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

const getMyProfile = catchAsync(
  async (req: Request & { user?: any }, res: Response) => {
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
  },
);

const getSingleProfile = catchAsync(async (req: Request, res: Response) => {
  const result = await ProfileServices.getSingleProfile(req.params.userId);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    message: 'Profile Retrieve successfully',
    data: result,
  });
});

const getProfileImage = catchAsync(
  async (req: Request & { user?: any }, res: Response) => {
    const userID = req.user.id;
    const result = await ProfileServices.getProfileImage(userID);
    sendResponse(res, {
      statusCode: httpStatus.OK,
      message: 'Profile Image Retrieve successfully',
      data: result,
    });
  },
);

const updateProfile = catchAsync(
  async (req: Request & { user?: any }, res: Response) => {
    const userId = req.user.id;
    const result = await ProfileServices.updateProfile(userId, req.body, req);
    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: 'Profile updated successfully!',
      data: result,
    });
  },
);

const getGalleryImage = catchAsync(
  async (req: Request & { user?: any }, res: Response) => {
    const userID = req.user.id;
    const result = await ProfileServices.getGalleryImage(userID);
    sendResponse(res, {
      statusCode: httpStatus.OK,
      message: 'Profile Image Retrieve successfully',
      data: result,
    });
  },
);

const updateProfileImage = catchAsync(
  async (req: Request & { user?: any }, res: Response) => {
    const userID = req.user.id;
    const result = await ProfileServices.updateProfileImage(userID, req.body);
    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: 'Profile image updated successfully!',
      data: result,
    });
  },
);

const uploadGalleryImage = catchAsync(
  async (req: Request & { user?: any }, res: Response) => {
    const userID = req.user.id;

    // Ensure files are uploaded
    if (!req.files || !Array.isArray(req.files) || req.files.length === 0) {
      throw new AppError(httpStatus.BAD_REQUEST, 'No gallery files uploaded');
    }

    // Pass the uploaded files to the service
    const result = await ProfileServices.uploadGalleryImage(
      userID,
      req.files as Express.Multer.File[],
      // Pass the array of files
    );

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: 'Gallery updated successfully!',
      data: result,
    });
  },
);
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
  getProfileImage,
  getGalleryImage,
  updateProfileImage,
  uploadGalleryImage,
  updateProfile,
  deleteProfile,
};
