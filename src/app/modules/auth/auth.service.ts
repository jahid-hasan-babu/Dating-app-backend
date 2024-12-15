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
  // Check if the user exists in the database
  let user = await prisma.user.findFirst({
    where: {
      OR: [{ googleId: payload.googleId }, { facebookId: payload.facebookId }],
    },
  });

  if (user) {
    const accessToken = generateToken(
      {
        id: user.id,
        email: user.email as string,
        role: user.role,
      },
      config.jwt.access_secret as Secret,
      config.jwt.access_expires_in as string,
    );

    return accessToken;
  } else {
    try {
      // Use a transaction to create both user and profile
      const result = await prisma.$transaction(
        async (transactionClient: any) => {
          // Create the user
          const newUser = await transactionClient.user.create({
            data: {
              email: payload.email,
              googleId: payload.googleId || null,
              facebookId: payload.facebookId || null,
              role: payload.role, // Default to 'user' if no role is provided
            },
          });

          // Create a Stripe customer
          const stripeCustomer = await stripe.customers.create({
            email: payload.email,
            name: payload.fullName || undefined,
            phone: payload.phoneNumber || undefined,
          });

          // Prepare profile data
          const profileData = {
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

            // Link profile to user using `connect`
            user: {
              connect: {
                id: newUser.id,
              },
            },
          };

          // Create the profile
          const profile = await transactionClient.profile.create({
            data: profileData,
          });

          return { newUser, profile };
        },
      );

      // Generate access token for the newly created user
      const accessToken = generateToken(
        {
          id: result.newUser.id,
          email: result.newUser.email as string,
          role: result.newUser.role,
        },
        config.jwt.access_secret as Secret,
        config.jwt.access_expires_in as string,
      );

      return accessToken;
    } catch (error: any) {
      throw new AppError(
        httpStatus.INTERNAL_SERVER_ERROR,
        'Error creating user and profile during social login',
        error,
      );
    }
  }
};

export const AuthServices = {
  loginUser,
  createOtp,
  verifyOtp,
  resetPassword,
  socialLogin,
};



