import passport from 'passport';
import { Strategy as FacebookStrategy } from 'passport-facebook';
import { User } from '@prisma/client';
import prisma from '../../utils/prisma';

// Configure Passport strategy
const facebook = passport.use(
  new FacebookStrategy(
    {
      clientID: '159030901322260',
      clientSecret: '0d641e47f5d55af221ec80346f3f2d43',
      callbackURL: 'http://127.0.0.1:3000/auth/facebook/callback',
    },
    async (
      accessToken: string,
      refreshToken: string,
      profile: any,
      done: (error: any, user?: User | false) => void,
    ) => {
      try {
        // Search for an existing user by facebookId
        const existingUser = await prisma.user.findUnique({
          where: {
            facebookId: profile.id, // Check if the user already exists
          },
        });

        // If user exists, return the user
        if (existingUser) {
          return done(null, existingUser);
        }

        // If no user found, create a new one
        const newUser = await prisma.user.create({
          data: {
            facebookId: profile.id,
            email: profile.emails?.[0]?.value, // Get the email if available
            // Optionally add more data like name, profile picture, etc.
          },
        });

        // Return the newly created user
        return done(null, newUser);
      } catch (error) {
        return done(error); // Handle any errors
      }
    },
  ),
);

// You can directly use passport in your routes to authenticate with Facebook
export default facebook;
