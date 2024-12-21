import { Prisma } from '@prisma/client';
import prisma from '../../utils/prisma';
import { Request } from 'express';
import { searchFilter } from '../../utils/searchFilter';
import httpStatus from 'http-status';
import AppError from '../../errors/AppError';


const getAllProfiles = async (req: Request) => {
  const { search } = req.query;
  const searchFilters = search ? searchFilter(search as string) : {};

  const result = await prisma.profile.findMany({
    where: searchFilters,
    select: {
      id: true,
      fullName: true,
      age: true,
      profileImage: true,
      language: true,
      isVerified: true,
      locationLang: true,
    },
  });

  return result;
};

const getSingleProfile = async (userId: string) => {
  const result = await prisma.profile.findUnique({
    where: {
      userId: userId,
    },
  });
  return result;
};

const getMyProfile = async (userId: string) => {
  const userInfo = await prisma.profile.findUnique({
    where: {
      userId: userId,
    },
    select: {
      fullName: true,
      username: true,
      profileImage: true,
      gallery: true,
      isVerified: true,
      about: true,
      country: true,
      city: true,
      interests: true,
      locationLang: true,
      locationLat: true,
      relationship: true,
      language: true,
      gender: true,
      age: true,
      height: true,
      work: true,
    },
  });

  if (!userInfo) {
    throw new AppError(404, 'User info not found');
  }

  return userInfo; // Returns only fullName and userName
};

const getProfileImage = async (userId: string) => {
  const userInfo = await prisma.profile.findUnique({
    where: {
      userId: userId,
    },
    select: {
      profileImage: true,
    },
  });

  if (!userInfo) {
    throw new AppError(404, 'User info not found');
  }

  return userInfo;
};

const getGalleryImage = async (userId: string) => {
  const userInfo = await prisma.profile.findUnique({
    where: {
      userId: userId,
    },
    select: {
      gallery: true,
    },
  });

  if (!userInfo) {
    throw new AppError(404, 'User info not found');
  }

  return userInfo;
};

const updateProfile = async (userId: string, payload: any, req: Request) => {
  const files = req.file as any;

  // console.log('Updating profile for userId:', userId);

  // Check if profile exists
  const profileInfo = await prisma.profile.findUnique({
    where: { userId: userId },
  });

  if (!profileInfo) {
    console.error(`Profile not found for userId: ${userId}`);
    throw new AppError(httpStatus.NOT_FOUND, 'Profile not found');
  }

  // Parse profileData
  const profileData = req.body?.bodyData
    ? (() => {
        try {
          return JSON.parse(req.body.bodyData);
        } catch (error) {
          throw new AppError(
            httpStatus.BAD_REQUEST,
            'Invalid JSON format in profile data',
          );
        }
      })()
    : {};

  // Handle profile image
  const profileImage = files?.originalname
    ? `${process.env.backend_base_url}/uploads/${files.originalname}`
    : profileInfo.profileImage;

  // Update profile
  const updatedProfile = await prisma.profile.update({
    where: { userId: userId },
    data: {
      ...profileData,
      profileImage,
    },
  });



  return updatedProfile;
};


const updateProfileImage = async (userId: string, req: Request) => {
  const files = req.file as any;
  const profileInfo = await prisma.profile.findUnique({
    where: {
      userId: userId,
    },
  });

  if (!profileInfo) {
    throw new AppError(httpStatus.NOT_FOUND, 'User not found');
  }

  const profileImage = files
    ? `${process.env.backend_base_url}/uploads/${files.originalname}`
    : profileInfo.profileImage;

  const updatedProfileImage = await prisma.profile.update({
    where: {
      userId: userId,
    },
    data: {
      profileImage,
    },
    select: {
      profileImage: true,
    },
  });

  if (!updatedProfileImage) {
    throw new AppError(httpStatus.BAD_REQUEST, 'Profile image update failed');
  }

  return updatedProfileImage;
};

export const uploadGalleryImage = async (
  userId: string,
  files: Express.Multer.File[],
) => {
  // Find the user profile
  const profileInfo = await prisma.profile.findUnique({
    where: { userId },
  });

  if (!profileInfo) {
    throw new AppError(httpStatus.NOT_FOUND, 'User not found');
  }

  // Generate the image URLs from uploaded files
  const imageUrls = files.map(
    file => `${process.env.backend_base_url}/uploads/${file.filename}`,
  );

  // Update the gallery field by appending new image URLs
  const updatedProfile = await prisma.profile.update({
    where: { userId },
    data: {
      gallery: {
        push: imageUrls,
      },
    },
    select: { gallery: true },
  });

  if (!updatedProfile) {
    throw new AppError(httpStatus.BAD_REQUEST, 'Gallery update failed');
  }

  return updatedProfile.gallery;
};

const deleteProfile = async (userId: string) => {
  await prisma.profile.delete({
    where: {
      userId: userId,
    },
  });

  // Delete the user associated with the same userId
  await prisma.user.delete({
    where: {
      id: userId,
    },
  });

  return;
};

export const ProfileServices = {
  getAllProfiles,
  getSingleProfile,
  getProfileImage,
  getGalleryImage,
  updateProfile,
  updateProfileImage,
  deleteProfile,
  getMyProfile,
  uploadGalleryImage,
};
