import express from 'express';
import passport from '../../utils/passport';
import { SocialLoginController } from './socialLogin.controller';

const router = express.Router();

// Route to initiate Google login
router.get(
  '/api/auth/google',
  passport.authenticate('google', {
    scope: ['profile', 'email'], // Request user's profile and email
  }),
);

// Google OAuth callback route
router.get(
  '/api/auth/google/callback',
  passport.authenticate('google', { failureRedirect: '/' }),
  SocialLoginController.googleCallback, // Handles successful login
);



router.get(
  '/auth/facebook',
  passport.authenticate('facebook', {
    scope: ['email', 'public_profile'],
  }),
);
// router.get(
//   '/api/auth/facebook/callback',
//   passport.authenticate('facebook', { failureRedirect: '/' }),
//   SocialLoginController.facebookCallback,
// );

export const socialLoginRoutes = router;
