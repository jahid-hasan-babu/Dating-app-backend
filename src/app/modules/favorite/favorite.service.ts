import { Prisma } from '@prisma/client';
import prisma from '../../utils/prisma';
import { Request } from 'express';
import { searchFilter } from '../../utils/searchFilter';
import httpStatus from 'http-status';
import AppError from '../../errors/AppError';
import { notificationServices } from '../notifications/notification.service';

const addFavorite = async (userID: string, favoritedUserId: string) => {
  // Prevent a user from favoriting themselves
  if (userID === favoritedUserId) {
    throw new AppError(httpStatus.BAD_REQUEST, 'You cannot favorite yourself');
  }

  // Check if the favorite already exists
  const existingFavorite = await prisma.favorite.findFirst({
    where: {
      userID: userID,
      favoritedUserId: favoritedUserId,
    },
  });

  if (existingFavorite) {
    throw new AppError(httpStatus.BAD_REQUEST, 'Favorite already exists');
  }

  // Create the favorite entry
  const favorite = await prisma.favorite.create({
    data: {
      userID: userID,
      favoritedUserId: favoritedUserId,
    },
  });

  // Fetch the favoriting user's details (e.g., name)
  const favoritingUser = await prisma.profile.findUnique({
    where: { userId: userID }, // Use `userId` since it's the linking field in `Profile`
    select: { fullName: true }, // Fetch the user's full name
  });

  // Prepare notification data
  const notificationData = {
    title: 'You’ve been favorited!',
    body: `${favoritingUser?.fullName || 'Someone'} has added you to their favorites.`,
  };

  // Send a notification to the favorited user
  try {
    await notificationServices.sendSingleNotification({
      params: { userId: favoritedUserId }, // The ID of the user being favorited
      body: notificationData, // Notification content
    });
  } catch (error: any) {
    console.error('Failed to send notification:', error.message);
    // Optionally, handle the notification failure (e.g., log it or notify admins)
  }

  // Return the created favorite
  return favorite;
};

const removeFavorite = async (userID: string, favoritedUserId: string) => {
  // Ensure the user is not trying to unfavorite themselves
  if (userID === favoritedUserId) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'You cannot unfavorite yourself',
    );
  }

  // Remove the favorite relationship from the database
  const result = await prisma.favorite.deleteMany({
    where: {
      userID: userID,
      favoritedUserId: favoritedUserId,
    },
  });

  if (result.count === 0) {
    throw new AppError(httpStatus.NOT_FOUND, 'Favorite not found');
  }

  // Fetch the unfavoriting user's details (e.g., name)
  const unfavoritingUser = await prisma.profile.findUnique({
    where: { userId: userID },
    select: { fullName: true }, // Fetch the full name from Profile
  });

  // Prepare notification data
  const notificationData = {
    title: 'You’ve been unfavorited',
    body: `${unfavoritingUser?.fullName || 'Someone'} has removed you from their favorites.`,
  };

  // Send a notification to the unfavorited user
  try {
    await notificationServices.sendSingleNotification({
      params: { userId: favoritedUserId }, // The user being unfavorited
      body: notificationData, // Notification content
    });
  } catch (error: any) {
    console.error('Failed to send notification:', error.message);
    // Optionally, log or handle the error as needed
  }

  return result;
};



const getProfilesWhoFavoritedMe = async (userID: string) => {
  // Fetch all records from `favorite` where `favoritedUserId` matches the provided userID
  const favoritedByRecords = await prisma.favorite.findMany({
    where: {
      favoritedUserId: userID, // Find users who favorited the current user
    },
    select: {
      userID: true, // Get the list of user IDs who favorited this user
    },
  });

  // Extract user IDs from the records
  const userIDs = favoritedByRecords.map(record => record.userID);

  if (userIDs.length === 0) {
    return []; // If no one favorited, return an empty array
  }

  // Fetch profiles of users who favorited the given userID, including their status
  const profiles = await prisma.profile.findMany({
    where: {
      userId: { in: userIDs }, // Match the `id` field in the `profile` model
    },
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
    },
  });

  // Get a list of user IDs that the current user has favorited (for checking isFavorite)
  const favoritedUsers = await prisma.favorite.findMany({
    where: {
      userID: userID, // The current user is the one who favorited
    },
    select: {
      favoritedUserId: true, // List of users the current user has favorited
    },
  });

  // Extract the user IDs into a set for fast lookup
  const favoritedUserIdsSet = new Set(
    favoritedUsers.map(fav => fav.favoritedUserId),
  );

  // Map through the profiles to add the `status` and `isFavorite` fields
  const profilesWithStatusAndFavorite = profiles.map(profile => ({
    ...profile,

    isFavorite: favoritedUserIdsSet.has(profile.userId), // Check if the current user has favorited this profile
  }));

  return { profiles: profilesWithStatusAndFavorite };
};

const favoriteMeCount = async (userID: string) => {
  return prisma.favorite.count({
    where: {
      favoritedUserId: userID,
    },
  });
};
const favoriteListCount = async (userID: string) => {
  const count = await prisma.favorite.count({
    where: {
      userID,
    },
  });

  return count;
};

const getMyFavoriteList = async (userID: string) => {
  // Step 1: Fetch the list of favorited users for the given userID
  const favoriteRecords = await prisma.favorite.findMany({
    where: {
      userID,
    },
    select: {
      favoritedUserId: true,
    },
  });

  // Step 2: Extract the favorited user IDs
  const favoritedUserIds = favoriteRecords.map(
    record => record.favoritedUserId,
  );

  // If no users are favorited, return an empty array
  if (favoritedUserIds.length === 0) {
    return [];
  }

  // Step 3: Fetch profiles of the favorited users
  const profiles = await prisma.profile.findMany({
    where: {
      userId: { in: favoritedUserIds },
    },
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
    },
  });

  // Step 4: Set `isFavorite: true` for each favorited user profile manually
  const updatedProfiles = profiles.map(profile => ({
    ...profile,
    isFavorite: true, // Adding `isFavorite` manually here
  }));

  return updatedProfiles;
};


export const ProfileServices = {
  addFavorite,
  removeFavorite,
  getProfilesWhoFavoritedMe,
  favoriteMeCount,
  favoriteListCount,
  getMyFavoriteList,
};
