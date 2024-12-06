import express from 'express';
import { ProfileControllers } from './profile.controller';
import validateRequest from '../../middlewares/validateRequest';
import { ProfileValidation } from './profile.validation';
const router = express.Router();

router.post(
  '/',
  validateRequest(ProfileValidation.registerProfileSchema),
  ProfileControllers.registerProfile,
);

router.get('/', ProfileControllers.getAllProfiles);
router.get('/:userId', ProfileControllers.getSingleProfile);
router.put('/:userId', ProfileControllers.updateProfile);
router.delete('/:userId', ProfileControllers.deleteProfile);
router.get('/search/:searchKey', ProfileControllers.searchProfile);

export const ProfileRouters = router;
