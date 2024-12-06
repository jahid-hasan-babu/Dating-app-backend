import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import prisma from '../../utils/prisma'; // Adjust this import path to your actual path
import { User } from '@prisma/client';

// Configure Passport strategy for Google login
const google = passport.use(
  new GoogleStrategy(
    {
      clientID:
        '591307876438-4nmmm817vks785u467lo22kss40kqno2.apps.googleusercontent.com',
      clientSecret: 'BagENe4LxG_PZ_qz2oFX7Aok',
      callbackURL: 'http://127.0.0.1:3000/auth/google/callback',
    },
    async (
      accessToken: string,
      refreshToken: string,
      profile: any,
      done: (error: any, user?: User | false) => void,
    ) => {
      try {
        // Check if the user already exists by Google ID
        const existingUser = await prisma.user.findUnique({
          where: {
            googleId: profile.id,
          },
        });

        if (existingUser) {
          return done(null, existingUser);
        }

        const newUser = await prisma.user.create({
          data: {
            googleId: profile.id,
            email: profile.emails?.[0]?.value,
          },
        });

        // Return the newly created user
        return done(null, newUser);
      } catch (error) {
        return done(error);
      }
    },
  ),
);

export default google;
