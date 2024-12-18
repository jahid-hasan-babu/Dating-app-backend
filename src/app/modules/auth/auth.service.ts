import * as bcrypt from 'bcrypt';
import httpStatus from 'http-status';
import { Secret } from 'jsonwebtoken';
import config from '../../../config';
import AppError from '../../errors/AppError';
import { generateToken } from '../../utils/generateToken';
import prisma from '../../utils/prisma';
import sentEmailUtility from '../../utils/sentEmailUtility';
import Stripe from 'stripe';
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
  apiVersion: '2024-11-20.acacia',
});



const loginUser = async (payload: {
  email: string;
  password: string;
  fcpmToken?: string;
}) => {
  // Find the user by email
  const userData = await prisma.user.findUniqueOrThrow({
    where: {
      email: payload.email,
    },
  });

  // Check if the password is correct
  const isCorrectPassword = await bcrypt.compare(
    payload.password,
    userData.password as string,
  );

  if (!isCorrectPassword) {
    throw new AppError(httpStatus.BAD_REQUEST, 'Password incorrect');
  }

  // Update the FCM token if provided
  if (payload?.fcpmToken) {
    await prisma.user.update({
      where: {
        email: payload.email, // Use email as the unique identifier for updating
      },
      data: {
        fcpmToken: payload.fcpmToken,
      },
    });
  }

  // Generate an access token
  const accessToken = generateToken(
    {
      id: userData.id,
      email: userData.email as string,
      role: userData.role,
    },
    config.jwt.access_secret as Secret,
    config.jwt.access_expires_in as string,
  );

  // Return user details and access token
  return {
    id: userData.id,
    email: userData.email,
    role: userData.role,
    accessToken: accessToken,
  };
};



const logout = async (userId: string) => {
  try {
    // Ensure userId is provided

    if (!userId) {
      throw new AppError(httpStatus.BAD_REQUEST, 'User ID must be provided.');
    }

    // Find the user by ID
    const userData = await prisma.user.findUniqueOrThrow({
      where: {
        id: userId, // Check id
      },
    });

    // Update the FCM token to null
    await prisma.user.update({
      where: {
        id: userData.id, // Use the unique ID to ensure accurate update
      },
      data: {
        fcpmToken: null,
      },
    });

    return { message: 'Logout successful' };
  } catch (error: any) {
    // Handle Prisma errors
    if (error.code === 'P2025') {
      // 'Record not found' error from Prisma
      throw new AppError(httpStatus.NOT_FOUND, 'User not found.');
    }

    // Generic error handling
    throw new AppError(
      httpStatus.INTERNAL_SERVER_ERROR,
      error.message || 'An unexpected error occurred during logout.',
    );
  }
};

const createOtp = async (payload: { email: string }) => {
  // Check if the user exists
  const userData = await prisma.user.findUnique({
    where: { email: payload.email },
  });

  if (!userData) {
    throw new AppError(httpStatus.BAD_REQUEST, 'User not found');
  }

  // Generate OTP
  const otp = Math.floor(100000 + Math.random() * 900000);

  const emailSubject = 'OTP Verification';
  const emailText = `Your OTP is: ${otp}`;

  // Send email
  await sentEmailUtility(payload.email, emailSubject, emailText);

  // Upsert OTP (no expiration logic)
  const otpData = await prisma.otp.upsert({
    where: { email: payload.email },
    update: { otp },
    create: { email: payload.email, otp },
  });

  return { otpData };
};

const verifyOtp = async (payload: { email: string; otp: number }) => {
  // Check if the user exists
  const userData = await prisma.user.findUniqueOrThrow({
    where: {
      email: payload.email,
    },
  });

  if (!userData) {
    throw new AppError(httpStatus.BAD_REQUEST, 'User not found');
  }

  // Check if the OTP is valid
  const otpData = await prisma.otp.findUniqueOrThrow({
    where: {
      email: payload.email,
    },
  });

  if (otpData.otp !== payload.otp) {
    throw new AppError(httpStatus.BAD_REQUEST, 'Invalid OTP');
  }

  // Remove the OTP after successful verification
  await prisma.otp.delete({
    where: {
      email: payload.email,
    },
  });

  return { message: 'OTP verified  successfully' };
};

const resetPassword = async (payload: { email: string; password: string }) => {
  // Check if the user exists
  const userData = await prisma.user.findUniqueOrThrow({
    where: {
      email: payload.email,
    },
  });

  if (!userData) {
    throw new AppError(httpStatus.BAD_REQUEST, 'User not found');
  }

  // Hash the new password
  const hashedPassword = await bcrypt.hash(payload.password, 12);

  // Update the user's password
  const updatedUser = await prisma.user.update({
    where: {
      email: payload.email,
    },
    data: {
      password: hashedPassword,
    },
  });

  return updatedUser;
};

const socialLogin = async (payload: any) => {
  try {
    // Check if the user exists in the database using Google ID, Facebook ID, or email/username
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { googleId: payload.googleId },
          { facebookId: payload.facebookId },
          { email: payload.email },
        ],
      },
    });

    if (user) {
      // Update the user's FCM token
      await prisma.user.update({
        where: { id: user.id },
        data: { fcpmToken: payload.fcpmToken || null },
      });

      // Generate access token for existing user
      const accessToken = generateToken(
        {
          id: user.id,
          email: user.email || '',
          role: user.role,
        },
        config.jwt.access_secret as Secret,
        config.jwt.access_expires_in as string,
      );

      return accessToken;
    } else {
      // If user does not exist, create a new user and associated profile
      const result = await prisma.$transaction(
        async (transactionClient: any) => {
          // Create the user
          const newUser = await transactionClient.user.create({
            data: {
              email: payload.email || null,
              googleId: payload.googleId || null,
              facebookId: payload.facebookId || null,
              role: payload.role || 'user', // Default role is 'user'
              fcpmToken: payload.fcpmToken || null,
            },
          });

          // Create a Stripe customer
          const stripeCustomer = await stripe.customers.create({
            email: payload.email,
            name: payload.fullName || undefined,
            phone: payload.phoneNumber || undefined,
          });

          // Create the profile
          const profile = await transactionClient.profile.create({
            data: {
              fullName: payload.fullName || null,
              username: payload.username || null,
              phoneNumber: payload.phoneNumber || null,
              profileImage: payload.profileImage || null,
              locationLat: payload.locationLat || null,
              locationLang: payload.locationLang || null,
              country: payload.country || null,
              city: payload.city || null,
              gender: payload.gender || null,
              dateOfBirth: payload.dateOfBirth || null,
              height: payload.height || null,
              interests: payload.interests || [],
              about: payload.about || null,
              relationship: payload.relationship || null,
              language: payload.language || null,
              work: payload.work || null,
              gallery: payload.gallery || [],
              customerId: stripeCustomer.id, // Save the Stripe customer ID here
              user: { connect: { id: newUser.id } }, // Link the profile to the user
            },
          });

          return { newUser, profile };
        },
      );

      // Generate access token for the newly created user
      const accessToken = generateToken(
        {
          id: result.newUser.id,
          email: result.newUser.email || '',
          role: result.newUser.role,
        },
        config.jwt.access_secret as Secret,
        config.jwt.access_expires_in as string,
      );

      return accessToken;
    }
  } catch (error: any) {
    throw new AppError(
      httpStatus.INTERNAL_SERVER_ERROR,
      'Error during social login',
      error.message || 'An unexpected error occurred',
    );
  }
};

export const AuthServices = {
  loginUser,
  createOtp,
  logout,
  verifyOtp,
  resetPassword,
  socialLogin,
};



