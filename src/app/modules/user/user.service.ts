import { User } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import prisma from '../../utils/prisma';
import AppError from '../../errors/AppError';
import httpStatus from 'http-status';
import Stripe from 'stripe';
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
  apiVersion: '2024-11-20.acacia',
});

interface UserWithOptionalPassword extends Omit<User, 'password'> {
  password?: string;
}
// const registerUser = async (payload: any) => {
//   // Check if user already exists
//   const existingUser = await prisma.user.findUnique({
//     where: { email: payload.email },
//   });

//   if (existingUser) {
//     throw new AppError(httpStatus.BAD_REQUEST, 'User already exists');
//   }

//   // Hash the user's password
//   const hashedPassword: string = await bcrypt.hash(payload.password, 12);

//   const userData = {
//     email: payload.email,
//     password: hashedPassword,
//   };

//   try {
//     // Use a transaction to ensure both user and profile are created together
//     const result = await prisma.$transaction(async (transactionClient: any) => {
//       // Create the user
//       const user = await transactionClient.user.create({
//         data: userData,
//       });

//       // Prepare profile data
//       const profileData = {
//         fullName: payload.fullName || null,
//         username: payload.username || null,
//         phoneNumber: payload.phoneNumber || null,
//         profileImage: payload.profileImage || null,
//         locationLat: payload.locationLat || null,
//         locationLang: payload.locationLang || null,
//         country: payload.country || null,
//         city: payload.city || null,
//         gender: payload.gender || null,
//         dateOfBirth: payload.dateOfBirth || null,
//         height: payload.height || null,
//         interests: payload.interests || [],
//         about: payload.about || null,
//         relationship: payload.relationship || null,
//         language: payload.language || null,
//         work: payload.work || null,
//         gallery: payload.gallery || [],

//         // Link profile to user using `connect`
//         user: {
//           connect: {
//             id: user.id,
//           },
//         },
//       };

//       // Create the profile
//       const profile = await transactionClient.profile.create({
//         data: profileData,
//       });

//       return { user, profile };
//     });

//     // Return the user with profile after successful transaction
//     const userWithProfile = await prisma.user.findUniqueOrThrow({
//       where: {
//         id: result.user.id,
//       },
//       include: { profile: true },
//     });

//     // Remove password before returning the user
//     const userWithOptionalPassword =
//       userWithProfile as UserWithOptionalPassword;
//     delete userWithOptionalPassword.password;

//     return userWithOptionalPassword;
//   } catch (error: any) {
//     throw new AppError(
//       httpStatus.INTERNAL_SERVER_ERROR,
//       'Error creating user and profile',
//       error,
//     );
//   }
// };

const registerUser = async (payload: any) => {
  // Check if user already exists
  const existingUser = await prisma.user.findUnique({
    where: { email: payload.email },
  });

  if (existingUser) {
    throw new AppError(httpStatus.BAD_REQUEST, 'User already exists');
  }

  // Hash the user's password
  const hashedPassword: string = await bcrypt.hash(payload.password, 12);

  const userData = {
    email: payload.email,
    password: hashedPassword,
  };

  try {
    // Use a transaction to ensure both user and profile are created together
    const result = await prisma.$transaction(async (transactionClient: any) => {
      // Create the user
      const user = await transactionClient.user.create({
        data: userData,
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
        customerId: stripeCustomer.id, // Save the Stripe customerId here

        // Link profile to user using `connect`
        user: {
          connect: {
            id: user.id,
          },
        },
      };

      // Create the profile
      const profile = await transactionClient.profile.create({
        data: profileData,
      });

      return { user, profile };
    });

    // Return the user with profile after successful transaction
    const userWithProfile = await prisma.user.findUniqueOrThrow({
      where: {
        id: result.user.id,
      },
      include: { profile: true },
    });

    // Remove password before returning the user
    const userWithOptionalPassword = userWithProfile as any;
    delete userWithOptionalPassword.password;

    return userWithOptionalPassword;
  } catch (error: any) {
    throw new AppError(
      httpStatus.INTERNAL_SERVER_ERROR,
      'Error creating user and profile',
      error,
    );
  }
};


const changePassword = async (
  id: string,
  payload: { oldPassword: string; newPassword: string },
) => {
  // Fetch user data
  const userData = await prisma.user.findUniqueOrThrow({
    where: { id },
  });

  // Verify the old password
  const isCorrectPassword = await bcrypt.compare(
    payload.oldPassword,
    userData.password as string,
  );

  if (!isCorrectPassword) {
    throw new AppError(httpStatus.BAD_REQUEST, 'Password incorrect');
  }

  // Hash the new password
  const hashedPassword = await bcrypt.hash(payload.newPassword, 12);

  await prisma.user.update({
    where: { id },
    data: { password: hashedPassword },
  });

  // Return confirmation or updated user
  return;
};

export const UserServices = {
  registerUser,
  changePassword,
};
