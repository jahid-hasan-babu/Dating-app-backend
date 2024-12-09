import { Prisma } from '@prisma/client';
import prisma from '../../utils/prisma';
import { Request } from 'express';
import { searchFilter } from '../../utils/searchFilter';
import httpStatus from 'http-status';
import AppError from '../../errors/AppError';

// const getAllProfiles = async (userId: string, req: Request) => {
//   const { search } = req.query;
//   const searchFilters = search ? searchFilter(search as string) : {};

//   const result = await prisma.profile.findMany({
//     where: searchFilters,
//     select: {
//       fullName: true,
//       age: true,
//       profileImage: true,
//       language: true,
//       isVerified: true,
//       locationLang: true,
//     },
//   });

//   return result;
// };
const getAllProfiles = async (userID: string, req: Request) => {
  const { search } = req.query;
  const searchFilters = search ? searchFilter(search as string) : {};

  // Fetch all favorite records where `userID` matches the given userID
  const favoriteRecords = await prisma.favorite.findMany({
    where: {
      userID: userID, // Find records favorited by this user
    },
    select: {
      favoritedUserId: true, // Get the list of favorited user IDs
    },
  });

  console.log(favoriteRecords);

  // Extract the favorited user IDs
  const favoritedUserIds = favoriteRecords.map(fav => fav.favoritedUserId);

  // Fetch profiles matching the favorited user IDs
  const profiles = await prisma.profile.findMany({
    where: {
      ...searchFilters,
      userId : { in: favoritedUserIds }, // Only fetch profiles that were favorited by the user
    },
    // select: {
    //   id: true,
    //   fullName: true,
    //   age: true,
    //   profileImage: true,
    //   language: true,
    //   isVerified: true,
    //   locationLang: true,
    // },
  });
  console.log(profiles);

  // Create a Set of favorited user IDs for efficient lookup
  const favoritedUserSet = new Set(favoritedUserIds);

  // Map profiles to include `isFavorite`
  const result = profiles.map(profile => {
    const isFavorite = favoritedUserSet.has(profile.id);
    return {
      ...profile,
      isFavorite,
    };
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
      country: true,
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
    : {};

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
