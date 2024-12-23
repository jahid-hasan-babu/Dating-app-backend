import express from 'express';
import { ProfileControllers } from './profile.controller';
import validateRequest from '../../middlewares/validateRequest';
import { ProfileValidation } from './profile.validation';
import { fileUploader } from '../../../helpers/fileUploader';
import auth from '../../middlewares/auth';
const router = express.Router();

router.get('/', ProfileControllers.getAllProfiles);
router.get('/getMe', auth(), ProfileControllers.getMyProfile);
router.put(
  '/',
  auth(),
  fileUploader.uploadprofileImage,
  ProfileControllers.updateProfile,
);

router.get('/getProfileImage', auth(), ProfileControllers.getProfileImage);
router.get('/getGalleryImage', auth(), ProfileControllers.getGalleryImage);

router.put(
  '/updateProfileImage',
  auth(),
  fileUploader.uploadprofileImage,
  ProfileControllers.updateProfileImage,
);
router.put(
  '/uploadGalleryImage',
  auth(),
  fileUploader.uploadGalleryImage,
  ProfileControllers.uploadGalleryImage,
);
router.get('/:userId', auth(), ProfileControllers.getSingleProfile);

router.delete('/:userId', ProfileControllers.deleteProfile);

export const ProfileRouters = router;
