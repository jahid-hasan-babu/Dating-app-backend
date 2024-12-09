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

router.get('/favorite-me', auth(), FavoriteControllers.favoriteMe);
router.get('/favorite-list', auth(), FavoriteControllers.favoriteListCount);

export const FavoriteRouters = router;
