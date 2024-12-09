import { Prisma } from '@prisma/client';
import prisma from '../../utils/prisma';
import { Request } from 'express';
import { searchFilter } from '../../utils/searchFilter';
import httpStatus from 'http-status';
import AppError from '../../errors/AppError';

const addFavorite = async (userID: string, favoritedUserId: string) => {
  if (userID === favoritedUserId) {
    throw new AppError(httpStatus.BAD_REQUEST, 'You cannot favorite yourself');
  }

  const existingFavorite = await prisma.favorite.findFirst({
    where: {
      userID: userID,
      favoritedUserId: favoritedUserId,
    },
  });

  if (existingFavorite) {
    throw new AppError(httpStatus.BAD_REQUEST, 'Favorite already exists');
  }

  const favorite = await prisma.favorite.create({
    data: {
      userID: userID,
      favoritedUserId: favoritedUserId,
    },
  });

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

  return result;
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

export const ProfileServices = {
  addFavorite,
  removeFavorite,
  favoriteMeCount,
  favoriteListCount,
};
