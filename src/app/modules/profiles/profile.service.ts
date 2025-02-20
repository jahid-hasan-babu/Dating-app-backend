import { Prisma } from '@prisma/client';
import prisma from '../../utils/prisma';
import { Request } from 'express';
import { searchFilter } from '../../utils/searchFilter';
import httpStatus from 'http-status';
import AppError from '../../errors/AppError';
import { fileUploader } from '../../../helpers/fileUploader';
import { deleteFromS3ByUrl } from './../../../helpers/fileDeleteFromS3';
import { IPaginationOptions } from '../../interface/pagination.type';
import { paginationHelper } from '../../../helpers/paginationHelpers';

const getAllProfiles = async (
  userId: string,
  options: IPaginationOptions & { search?: string },
) => {
  const { page, limit, skip } = paginationHelper.calculatePagination(options);
  const { search } = options;

  const searchFilters = search ? searchFilter(search as string) : {};

  // Fetch the favorited user IDs for the given userId
  const favoriteUsers = await prisma.favorite.findMany({
    where: { userID: userId },
    select: { favoritedUserId: true },
  });

  // Extract the favoritedUserId values into a Set for quick lookup
  const favoritedUserIds = new Set(
    favoriteUsers.map(fav => fav.favoritedUserId),
  );

  // Fetch total count for pagination
  const total = await prisma.profile.count({
    where: {
      ...searchFilters,
      userId: { not: userId },
      user: { NOT: [{ accountSetup: false }] },
    },
  });

  // Fetch profiles with pagination
  const result = await prisma.profile.findMany({
    where: {
      ...searchFilters,
      userId: { not: userId },
      user: { NOT: [{ accountSetup: false }] },
    },
    skip, // Pagination should be here
    take: limit, // Pagination should be here
    select: {
      id: true,
      userId: true,
      fullName: true,
      age: true,
      profileImage: true,
      isVerified: true,
      country: true,
      flag: true,
      city: true,
      user: {
        select: { status: true },
      },
    },
  });

  // Map through the results to add the isFavorite field
  return result.map(profile => ({
    ...profile,
    status: profile.user?.status || null,
    isFavorite: favoritedUserIds.has(profile.userId),
  }));
};


const getSingleProfile = async (userId: string) => {
  const result = await prisma.profile.findUnique({
    where: {
      userId: userId,
    },
    select: {
      id: true,
      userId: true,
      fullName: true,
      username: true,
      profileImage: true,
      gallery: true,
      isVerified: true,
      about: true,
      country: true,
      flag: true,
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
      user: {
        select: {
          status: true, // Include the status field from the user model
        },
      },
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
      flag: true,
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
      customerId: true,
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

  // Start a transaction
  const result = await prisma.$transaction(async tx => {
    // Check if profile exists
    const profileInfo = await tx.profile.findUnique({
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

    // // Handle profile image
    // const profileImage = files?.originalname
    //   ? `${process.env.backend_base_url}/uploads/${files.originalname}`
    //   : profileInfo.profileImage;

    // Handle profile image

    let profileImage = profileInfo.profileImage; // Default to current profile image if no new file uploaded
    if (files) {
      const uploadResult = await fileUploader.uploadToDigitalOcean(files);
      profileImage = uploadResult.Location; // Set the URL from S3 response
    }

    // Update profile
    const updatedProfile = await tx.profile.update({
      where: { userId: userId },
      data: {
        ...profileData,
        profileImage,
      },
    });

    // Update the accountSetup field in the user model
    await tx.user.update({
      where: { id: userId },
      data: {
        accountSetup: true,
      },
    });

    return updatedProfile;
  });

  return result;
};

const updateProfileImage = async (userId: string, req: Request) => {
  const files = req.file as any;

  // Step 1: Fetch the user's profile information
  const profileInfo = await prisma.profile.findUnique({
    where: { userId: userId },
  });

  // Step 2: Check if the profile exists
  if (!profileInfo) {
    throw new AppError(httpStatus.NOT_FOUND, 'User profile not found');
  }

  // Step 3: Handle the profile image
  let profileImage = profileInfo.profileImage; // Default to current profile image if no new file uploaded

  // If a file is uploaded, proceed to upload it to DigitalOcean
  if (files) {
    console.log('File received:', files); // Log the received file for debugging

    try {
      const uploadResult = await fileUploader.uploadToDigitalOcean(files);
      if (uploadResult && uploadResult.Location) {
        profileImage = uploadResult.Location; // Set the URL from S3 response
        console.log('Uploaded file location:', profileImage); // Log the upload result
      } else {
        throw new Error('Upload to DigitalOcean failed');
      }
    } catch (error) {
      console.error('File upload failed:', error);
      throw new AppError(
        httpStatus.INTERNAL_SERVER_ERROR,
        'File upload failed',
      );
    }
  } else {
    console.log('No file uploaded, retaining existing profile image');
  }

  // Step 4: Update the profile image in the database
  try {
    const updatedProfileImage = await prisma.profile.update({
      where: {
        userId: userId,
      },
      data: {
        profileImage, // Updated profile image URL (either new or existing)
      },
      select: {
        profileImage: true, // Only return the updated profile image
      },
    });

    // Step 5: Return the updated profile image URL
    if (!updatedProfileImage) {
      console.error('Profile image update failed');
      throw new AppError(httpStatus.BAD_REQUEST, 'Profile image update failed');
    }

    console.log('Updated profile image:', updatedProfileImage.profileImage);
    return updatedProfileImage;
  } catch (error) {
    console.error('Error updating profile image:', error);
    throw new AppError(
      httpStatus.INTERNAL_SERVER_ERROR,
      'Profile update failed',
    );
  }
};

export const uploadGalleryImage = async (
  userId: string,
  files: Express.Multer.File[],
) => {
  // Step 1: Find the user profile
  const profileInfo = await prisma.profile.findUnique({
    where: { userId },
    select: {
      gallery: true,
    },
  });

  if (!profileInfo) {
    throw new AppError(httpStatus.NOT_FOUND, 'User not found');
  }

  // Step 2: Initialize an array to hold the uploaded image URLs
  const imageUrls = [];

  // Step 3: Upload each file to DigitalOcean Spaces
  for (const file of files) {
    try {
      const uploadResult = await fileUploader.uploadToDigitalOcean(file);
      imageUrls.push(uploadResult.Location); // Add the file URL to the array
    } catch (error) {
      console.error('File upload failed:', error);
      throw new AppError(
        httpStatus.INTERNAL_SERVER_ERROR,
        'Gallery update failed',
      );
    }
  }
  const allImageUrls = [...imageUrls, ...profileInfo.gallery];
  const imageToUpdate = allImageUrls.slice(0, 5); // First 5 elements
  const imageToDelete = allImageUrls.slice(5); // Rest of the elements

  // // Step 4: Delete the old images from DigitalOcean Spaces
  for (const imageUrl of imageToDelete) {
    try {
      await deleteFromS3ByUrl(imageUrl as string);
      console.log('File deleted successfully:', imageUrl);
    } catch (error) {
      console.error('File delete failed:', error);
      throw new AppError(
        httpStatus.INTERNAL_SERVER_ERROR,
        'Gallery update failed',
      );
    }
  }

  // Step 4: Update the gallery field by appending new image URLs
  const updatedProfile = await prisma.profile.update({
    where: { userId },
    data: {
      gallery: imageToUpdate as [], // Push the new image URLs to the gallery field
    },
    select: { gallery: true },
  });

  // Step 5: Return the updated gallery
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
