import express from 'express';
import { FavoriteControllers } from './favorite.controller';
import validateRequest from '../../middlewares/validateRequest';
import auth from '../../middlewares/auth';
import { favoriteValidation } from './favorite.validation';
const router = express.Router();

router.post(
  '/',
  auth(),
  validateRequest(favoriteValidation.favoriteValidationSchema),
  FavoriteControllers.addFavorite,
);

router.delete(
  '/',
  auth(),
  validateRequest(favoriteValidation.favoriteValidationSchema),
  FavoriteControllers.removeFavorite,
);

router.get('/favorite-meCount', auth(), FavoriteControllers.favoriteMe);
router.get(
  '/getProfilesWhoFavoritedMe',
  auth(),
  FavoriteControllers.getProfilesWhoFavoritedMe,
);

router.get(
  '/favorite-listCount',
  auth(),
  FavoriteControllers.favoriteListCount,
);

router.get('/getMyFavoriteList', auth(), FavoriteControllers.getMyFavoriteList);

export const FavoriteRouters = router;
