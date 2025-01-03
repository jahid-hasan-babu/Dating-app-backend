import httpStatus from 'http-status';
import catchAsync from '../../utils/catchAsync';
import sendResponse from '../../utils/sendResponse';
import { ProfileServices } from './favorite.service';
import { Request, Response } from 'express';

const addFavorite = catchAsync(
  async (req: Request & { user?: any }, res: Response) => {
    const userID = req.user.id;
    const { favoritedUserId } = req.body;
    const result = await ProfileServices.addFavorite(userID, favoritedUserId);
    sendResponse(res, {
      statusCode: httpStatus.CREATED,
      message: 'Favorite created successfully',
      data: result,
    });
  },
);

const removeFavorite = catchAsync(
  async (req: Request & { user?: any }, res: Response) => {
    const userID = req.user.id;
    const { favoritedUserId } = req.body;

    const result = await ProfileServices.removeFavorite(
      userID,
      favoritedUserId,
    );
    sendResponse(res, {
      statusCode: httpStatus.OK,
      message: 'Favorite removed successfully',
      data: result,
    });
  },
);


const getProfilesWhoFavoritedMe = catchAsync(
  async (req: Request & { user?: any }, res: Response) => {
    const userID = req.user.id; // Get the ID of the logged-in user

    // Get the total count of followers for this user
    const result = await ProfileServices.getProfilesWhoFavoritedMe(userID);

    sendResponse(res, {
      statusCode: httpStatus.OK,
      message: 'Favorite me  fetched successfully',
      data: result,
    });
  },
);

const favoriteMe = catchAsync(
  async (req: Request & { user?: any }, res: Response) => {
    const userID = req.user.id; // Get the ID of the logged-in user

    // Get the total count of followers for this user
    const count = await ProfileServices.favoriteMeCount(userID);

    sendResponse(res, {
      statusCode: httpStatus.OK,
      message: 'Favorite me count fetched successfully',
      data: { favoriteMe: count },
    });
  },
);

const favoriteListCount = catchAsync(
  async (req: Request & { user?: any }, res: Response) => {
    const userID = req.user.id;
    const count = await ProfileServices.favoriteListCount(userID);
    sendResponse(res, {
      statusCode: httpStatus.OK,
      message: 'Favorite list fetched successfully',
      data: { favoriteList: count },
    });
  },
);

const getMyFavoriteList = catchAsync(
  async (req: Request & { user?: any }, res: Response) => {
    const userID = req.user.id;
    const result = await ProfileServices.getMyFavoriteList(userID);
    sendResponse(res, {
      statusCode: httpStatus.OK,
      message: 'Favorite list fetched successfully',
      data: result,
    });
  },
);

export const FavoriteControllers = {
  addFavorite,
  removeFavorite,
  getProfilesWhoFavoritedMe,
  favoriteMe,
  favoriteListCount,
  getMyFavoriteList,
};
