import express from 'express';
import { ProfileControllers } from './profile.controller';
import validateRequest from '../../middlewares/validateRequest';
import { ProfileValidation } from './profile.validation';
import { fileUploader } from '../../../helpers/fileUploader';
const router = express.Router();

router.get('/', ProfileControllers.getAllProfiles);
router.get('/:userId', ProfileControllers.getSingleProfile);
router.put(
  '/:userId',
  fileUploader.uploadprofileImage,
  ProfileControllers.updateProfile,
);
router.delete('/:userId', ProfileControllers.deleteProfile);


export const ProfileRouters = router;
