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

const updateProfile = async (userId: string, payload: any, req: Request) => {
  const files = req.file as any; // Ensure files are being passed from the request
  const profileInfo = await prisma.profile.findUnique({
    where: {
      userId: userId,
    },
  });

  if (!profileInfo) {
    throw new AppError(httpStatus.NOT_FOUND, 'User not found');
  }

  const profileData = req.body?.bodyData
    ? // Parse the 'user' JSON string if it's present
      (() => {
        try {
          return JSON.parse(req.body.bodyData); // Parse the JSON string inside 'user'
        } catch (error) {
          throw new AppError(
            httpStatus.BAD_REQUEST,
            'Invalid JSON format in user data',
          );
        }
      })()
    : {}; // Default to an empty object if 'user' is not present

  console.log(profileData); // To log the parsed profile data

  const profileImage = files
    ? `${process.env.backend_base_url}/uploads/${files.originalname}`
    : profileInfo.profileImage;

  const updatedProfile = await prisma.profile.update({
    where: {
      userId: userId,
    },
    data: {
      ...profileData,
      profileImage,
    },
  });

  if (!updatedProfile) {
    throw new AppError(httpStatus.BAD_REQUEST, 'User update failed');
  }

  return updatedProfile;
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
  updateProfile,
  deleteProfile,
};
