import httpStatus from 'http-status';
import catchAsync from '../../utils/catchAsync';
import sendResponse from '../../utils/sendResponse';
import { ProfileServices } from './profile.service';

const registerProfile = catchAsync(async (req, res) => {
  const result = await ProfileServices.registerProfile(req.body);
  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    message: 'Profile Register successfully',
    data: result,
  });
});

const getAllProfiles = catchAsync(async (req, res) => {
  const result = await ProfileServices.getAllProfiles();
  sendResponse(res, {
    statusCode: httpStatus.OK,
    message: 'Profile Retrieve successfully',
    data: result,
  });
});

const getSingleProfile = catchAsync(async (req, res) => {
  const result = await ProfileServices.getSingleProfile(req.params.userId);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    message: 'Profile Retrieve successfully',
    data: result,
  });
});

const updateProfile = catchAsync(async (req, res) => {
  const result = await ProfileServices.updateProfile(
    req.params.userId,
    req.body,
  );
  sendResponse(res, {
    statusCode: httpStatus.OK,
    message: 'Profile updated successfully',
    data: result,
  });
});

const deleteProfile = catchAsync(async (req, res) => {
  const result = await ProfileServices.deleteProfile(req.params.userId);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    message: 'Profile deleted successfully',
    data: result,
  });
});

const searchProfile = catchAsync(async (req, res) => {
  const result = await ProfileServices.searchProfile(req.params.searchKey);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    message: 'Profile Retrieve successfully',
    data: result,
  });
});

export const ProfileControllers = {
  registerProfile,
  getAllProfiles,
  getSingleProfile,
  updateProfile,
  deleteProfile,
  searchProfile,
};
